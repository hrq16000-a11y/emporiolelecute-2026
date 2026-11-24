CREATE OR REPLACE FUNCTION public.create_order_with_items(_order jsonb, _items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
  new_order_code text;
  item_count int;
  v_coupon_code text;
  v_subtotal numeric;
  v_discount numeric;
  v_total numeric;
  v_shipping numeric;
  v_email text;
  v_item jsonb;
  v_qty int;
  v_price numeric;
  v_product_id uuid;
  v_name text;
  v_items jsonb := '[]'::jsonb;
  c record;
BEGIN
  IF _order IS NULL OR _items IS NULL THEN
    RAISE EXCEPTION 'Missing order or items';
  END IF;

  item_count := jsonb_array_length(_items);
  IF item_count = 0 OR item_count > 200 THEN
    RAISE EXCEPTION 'Invalid items count';
  END IF;

  IF coalesce(length(_order->>'customer_name'),0) = 0
     OR coalesce(length(_order->>'customer_email'),0) = 0
     OR coalesce(length(_order->>'order_code'),0) = 0 THEN
    RAISE EXCEPTION 'Missing required customer fields';
  END IF;

  IF length(_order->>'customer_name')  > 200
     OR length(_order->>'customer_email') > 320
     OR length(coalesce(_order->>'customer_phone','')) > 40
     OR length(_order->>'order_code') > 32 THEN
    RAISE EXCEPTION 'Field too long';
  END IF;

  v_email := lower(trim(_order->>'customer_email'));
  IF v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  IF (_order->>'order_code') !~ '^[A-Za-z0-9-]{4,32}$' THEN
    RAISE EXCEPTION 'Invalid order_code format';
  END IF;

  v_coupon_code := NULLIF(_order->>'coupon_code','');
  -- Prices are never taken from the caller: shipping is quoted later via
  -- WhatsApp and every item price comes from the catalog.
  v_subtotal := 0;
  v_shipping := 0;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty   := coalesce((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 OR v_qty > 10000 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;
    IF coalesce(length(v_item->>'personalization'),0) > 1000 THEN
      RAISE EXCEPTION 'Personalization too long';
    END IF;
    IF coalesce(length(v_item->>'product_slug'),0) = 0 OR length(v_item->>'product_slug') > 300 THEN
      RAISE EXCEPTION 'Invalid product on item';
    END IF;
    SELECT p.id, p.price, p.name INTO v_product_id, v_price, v_name
      FROM public.products p WHERE p.slug = v_item->>'product_slug' LIMIT 1;
    IF v_product_id IS NULL THEN
      SELECT p.id, p.price, p.name INTO v_product_id, v_price, v_name
        FROM public.product_slugs s JOIN public.products p ON p.id = s.product_id
       WHERE s.slug = lower(v_item->>'product_slug') LIMIT 1;
    END IF;
    IF v_product_id IS NULL OR v_price IS NULL OR v_price < 0 THEN
      RAISE EXCEPTION 'Produto indisponível no catálogo';
    END IF;
    v_subtotal := v_subtotal + v_price * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_name', v_name,
      'product_slug', v_item->>'product_slug',
      'product_image', left(v_item->>'product_image', 1000),
      'quantity', v_qty,
      'unit_price', v_price,
      'personalization', v_item->>'personalization'));
    v_product_id := NULL; v_price := NULL; v_name := NULL;
  END LOOP;

  IF v_subtotal > 1000000 THEN
    RAISE EXCEPTION 'Unrealistic order total';
  END IF;

  v_discount := 0;
  IF v_coupon_code IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons
      WHERE upper(code) = upper(v_coupon_code)
      FOR UPDATE;
    IF NOT FOUND OR NOT c.is_active THEN
      RAISE EXCEPTION 'Cupom inválido ou inativo';
    END IF;
    IF c.valid_from IS NOT NULL AND now() < c.valid_from THEN
      RAISE EXCEPTION 'Cupom ainda não disponível';
    END IF;
    IF c.valid_until IS NOT NULL AND now() > c.valid_until THEN
      RAISE EXCEPTION 'Cupom expirado';
    END IF;
    IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
      RAISE EXCEPTION 'Cupom esgotado';
    END IF;
    IF v_subtotal < c.min_subtotal THEN
      RAISE EXCEPTION 'Valor mínimo não atingido para o cupom';
    END IF;
    IF c.discount_type = 'percent' THEN
      v_discount := round((v_subtotal * c.discount_value / 100)::numeric, 2);
    ELSE
      v_discount := least(c.discount_value, v_subtotal);
    END IF;
    IF v_discount < 0 THEN v_discount := 0; END IF;
    IF v_discount > v_subtotal THEN v_discount := v_subtotal; END IF;
  END IF;

  v_total := v_subtotal - v_discount + v_shipping;
  IF v_total < 0 THEN v_total := 0; END IF;

  INSERT INTO public.orders (
    order_code, customer_name, customer_email, customer_phone,
    address_cep, address_street, address_number, address_complement,
    address_neighborhood, address_city, address_state,
    shipping_method, shipping_company, shipping_days, shipping_price,
    subtotal, total, status, coupon_code, discount_amount
  ) VALUES (
    _order->>'order_code',
    _order->>'customer_name',
    v_email,
    _order->>'customer_phone',
    _order->>'address_cep',
    _order->>'address_street',
    _order->>'address_number',
    _order->>'address_complement',
    _order->>'address_neighborhood',
    _order->>'address_city',
    _order->>'address_state',
    'A calcular via WhatsApp',
    NULL,
    NULL,
    v_shipping,
    v_subtotal,
    v_total,
    'pending',
    v_coupon_code,
    v_discount
  )
  RETURNING id, order_code INTO new_order_id, new_order_code;

  INSERT INTO public.order_items (
    order_id, product_name, product_slug, product_image, quantity, unit_price, personalization
  )
  SELECT
    new_order_id,
    item->>'product_name',
    item->>'product_slug',
    item->>'product_image',
    (item->>'quantity')::int,
    (item->>'unit_price')::numeric,
    item->>'personalization'
  FROM jsonb_array_elements(v_items) AS item;

  IF v_coupon_code IS NOT NULL THEN
    INSERT INTO public.coupon_uses (coupon_id, order_id, subtotal, discount_applied)
    VALUES (c.id, new_order_id, v_subtotal, v_discount);
    UPDATE public.coupons SET used_count = used_count + 1, updated_at = now() WHERE id = c.id;
  END IF;

  RETURN jsonb_build_object('id', new_order_id, 'order_code', new_order_code, 'discount_amount', v_discount, 'total', v_total);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_admin_audit_timeline(_search text DEFAULT NULL::text, _status text DEFAULT NULL::text, _source text DEFAULT NULL::text, _from timestamp with time zone DEFAULT NULL::timestamp with time zone, _to timestamp with time zone DEFAULT NULL::timestamp with time zone, _sort_key text DEFAULT 'created_at'::text, _sort_dir text DEFAULT 'desc'::text, _limit integer DEFAULT 25, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key    text;
  v_asc    boolean;
  v_search text := nullif(trim(coalesce(_search, '')), '');
  v_status text := nullif(_status, 'all');
  v_source text := nullif(_source, 'all');
  v_total  bigint;
  v_rows   jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _limit IS NULL OR _limit <= 0 OR _limit > 200 THEN _limit := 25; END IF;
  IF _offset IS NULL OR _offset < 0 THEN _offset := 0; END IF;

  v_key := lower(coalesce(_sort_key,'created_at'));
  v_asc := lower(coalesce(_sort_dir,'desc')) = 'asc';

  WITH base AS (
    SELECT *
      FROM public.admin_audit_timeline t
     WHERE (v_status IS NULL OR t.status = v_status)
       AND (v_source IS NULL OR t.source = v_source)
       AND (_from   IS NULL OR t.created_at >= _from)
       AND (_to     IS NULL OR t.created_at <= _to)
       AND (
         v_search IS NULL OR
         lower(coalesce(t.target_email,''))  LIKE '%' || lower(v_search) || '%' OR
         lower(coalesce(t.actor_email,''))   LIKE '%' || lower(v_search) || '%' OR
         lower(coalesce(t.details,''))       LIKE '%' || lower(v_search) || '%'
       )
  )
  SELECT count(*) INTO v_total FROM base;

  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT t.*
        FROM public.admin_audit_timeline t
       WHERE (v_status IS NULL OR t.status = v_status)
         AND (v_source IS NULL OR t.source = v_source)
         AND (_from   IS NULL OR t.created_at >= _from)
         AND (_to     IS NULL OR t.created_at <= _to)
         AND (
           v_search IS NULL OR
           lower(coalesce(t.target_email,''))  LIKE '%' || lower(v_search) || '%' OR
           lower(coalesce(t.actor_email,''))   LIKE '%' || lower(v_search) || '%' OR
           lower(coalesce(t.details,''))       LIKE '%' || lower(v_search) || '%'
         )
       ORDER BY
         CASE WHEN v_asc THEN CASE v_key WHEN 'status' THEN t.status::text WHEN 'target_email' THEN lower(coalesce(t.target_email,'')) WHEN 'actor_email' THEN lower(coalesce(t.actor_email,'')) WHEN 'source' THEN t.source::text END END ASC NULLS LAST,
         CASE WHEN NOT v_asc THEN CASE v_key WHEN 'status' THEN t.status::text WHEN 'target_email' THEN lower(coalesce(t.target_email,'')) WHEN 'actor_email' THEN lower(coalesce(t.actor_email,'')) WHEN 'source' THEN t.source::text END END DESC NULLS LAST,
         CASE WHEN v_asc THEN t.created_at END ASC NULLS LAST,
         CASE WHEN NOT v_asc THEN t.created_at END DESC NULLS LAST
       LIMIT _limit OFFSET _offset
    ) x;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $function$;

CREATE OR REPLACE FUNCTION public.list_all_users_paginated(_search text DEFAULT NULL::text, _role text DEFAULT NULL::text, _source text DEFAULT NULL::text, _whatsapp text DEFAULT NULL::text, _ip text DEFAULT NULL::text, _sort_key text DEFAULT 'created_at'::text, _sort_dir text DEFAULT 'desc'::text, _limit integer DEFAULT 25, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_search text := nullif(trim(coalesce(_search,'')), '');
  v_role   text := nullif(_role,'all');
  v_src    text := nullif(_source,'all');
  v_wa     text := nullif(regexp_replace(coalesce(_whatsapp,''),'\D','','g'), '');
  v_key    text;
  v_asc    boolean;
  v_total  bigint;
  v_rows   jsonb;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _limit IS NULL OR _limit <= 0 OR _limit > 500 THEN _limit := 25; END IF;
  IF _offset IS NULL OR _offset < 0 THEN _offset := 0; END IF;

  v_key := lower(coalesce(_sort_key,'created_at'));
  v_asc := lower(coalesce(_sort_dir,'desc')) = 'asc';

  DROP TABLE IF EXISTS tmp_users_pag;
  CREATE TEMP TABLE tmp_users_pag ON COMMIT DROP AS
  WITH auth_src AS (
    SELECT 'auth'::text source, p.id::text user_id,
           p.email, p.full_name,
           NULL::text whatsapp, NULL::inet last_ip,
           p.created_at, u.last_sign_in_at, u.email_confirmed_at,
           coalesce((SELECT array_agg(ur.role::text ORDER BY ur.role::text)
                       FROM public.user_roles ur WHERE ur.user_id = p.id), '{}'::text[]) roles,
           (SELECT c.id FROM public.customers c
             WHERE lower(coalesce(c.email,'')) = lower(coalesce(p.email,''))
             LIMIT 1) linked_customer_id,
           0::bigint linked_visitors
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
  ),
  cust_src AS (
    SELECT 'customer'::text, ('customer:'||c.id::text),
           c.email, c.name,
           c.whatsapp, NULL::inet,
           c.created_at, NULL::timestamptz, NULL::timestamptz,
           '{}'::text[],
           c.id, 0::bigint
      FROM public.customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE lower(coalesce(p.email,'')) = lower(coalesce(c.email,''))
           AND coalesce(c.email,'') <> ''
      )
  ),
  combined AS (
    SELECT * FROM auth_src
    UNION ALL SELECT * FROM cust_src
  )
  SELECT
    t.source, t.user_id, t.email, t.full_name, t.whatsapp,
    host(t.last_ip) AS last_ip,
    t.created_at, t.last_sign_in_at, t.email_confirmed_at, t.roles,
    t.linked_customer_id, t.linked_visitors,
    (CASE WHEN 'admin' = ANY(t.roles) THEN 3
          WHEN 'editor' = ANY(t.roles) THEN 2
          WHEN coalesce(array_length(t.roles,1),0) > 0 THEN 1
          ELSE 0 END) AS role_rank
  FROM combined t
  WHERE
    (v_search IS NULL OR
       lower(coalesce(t.email,''))     LIKE '%'||lower(v_search)||'%' OR
       lower(coalesce(t.full_name,'')) LIKE '%'||lower(v_search)||'%' OR
       lower(coalesce(t.whatsapp,''))  LIKE '%'||lower(v_search)||'%')
    AND (v_src IS NULL OR t.source = v_src)
    AND (v_wa  IS NULL OR regexp_replace(coalesce(t.whatsapp,''),'\D','','g') LIKE '%'||v_wa||'%')
    AND (
      v_role IS NULL OR
      (v_role = 'none'  AND coalesce(array_length(t.roles,1),0) = 0 AND t.source = 'auth') OR
      (v_role <> 'none' AND v_role = ANY(t.roles))
    );

  SELECT count(*) INTO v_total FROM tmp_users_pag;

  SELECT coalesce(jsonb_agg(to_jsonb(x) - 'role_rank'), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT * FROM tmp_users_pag
       ORDER BY
         CASE WHEN v_asc THEN CASE v_key WHEN 'email' THEN lower(coalesce(email,'')) WHEN 'full_name' THEN lower(coalesce(full_name,'')) WHEN 'source' THEN source END END ASC NULLS LAST,
         CASE WHEN NOT v_asc THEN CASE v_key WHEN 'email' THEN lower(coalesce(email,'')) WHEN 'full_name' THEN lower(coalesce(full_name,'')) WHEN 'source' THEN source END END DESC NULLS LAST,
         CASE WHEN v_asc AND v_key = 'role' THEN role_rank END ASC NULLS LAST,
         CASE WHEN NOT v_asc AND v_key = 'role' THEN role_rank END DESC NULLS LAST,
         CASE WHEN v_asc THEN CASE v_key WHEN 'last_sign_in_at' THEN last_sign_in_at WHEN 'email_confirmed_at' THEN email_confirmed_at ELSE created_at END END ASC NULLS LAST,
         CASE WHEN NOT v_asc THEN CASE v_key WHEN 'last_sign_in_at' THEN last_sign_in_at WHEN 'email_confirmed_at' THEN email_confirmed_at ELSE created_at END END DESC NULLS LAST
       LIMIT _limit OFFSET _offset
    ) x;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
  )
  AND (
    _user_id = auth.uid()
    OR coalesce(auth.role(), '') NOT IN ('anon', 'authenticated')
    OR EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = auth.uid() AND a.role = 'admin')
  )
$function$;

CREATE OR REPLACE FUNCTION public.track_heartbeat(_visitor_id text, _pageview_id uuid, _delta_seconds integer, _scroll_depth integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta  int := greatest(0, least(coalesce(_delta_seconds, 0), 3600));
  v_scroll int := CASE WHEN _scroll_depth IS NULL THEN NULL ELSE greatest(0, least(_scroll_depth, 100)) END;
  v_pv_id  uuid;
BEGIN
  IF _visitor_id IS NULL OR length(_visitor_id) = 0 THEN
    RAISE EXCEPTION 'invalid_visitor_id';
  END IF;
  IF v_delta = 0 THEN RETURN; END IF;

  IF _pageview_id IS NOT NULL THEN
    SELECT id INTO v_pv_id FROM public.visitor_pageviews
     WHERE id = _pageview_id AND visitor_id = _visitor_id;
  ELSE
    SELECT id INTO v_pv_id FROM public.visitor_pageviews
     WHERE visitor_id = _visitor_id ORDER BY viewed_at DESC LIMIT 1;
  END IF;

  IF v_pv_id IS NOT NULL THEN
    UPDATE public.visitor_pageviews
       SET time_on_page_seconds = least(time_on_page_seconds + v_delta, 86400),
           scroll_depth_pct     = greatest(coalesce(scroll_depth_pct, 0), coalesce(v_scroll, 0))
     WHERE id = v_pv_id AND visitor_id = _visitor_id;
  END IF;

  UPDATE public.visitors
     SET total_time_seconds = total_time_seconds + v_delta, last_seen_at = now()
   WHERE visitor_id = _visitor_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_visitor_as_lead(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_visitor_as_lead(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.track_pageview(text,uuid,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_pageview(text,uuid,text,text,text,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.track_heartbeat(text,uuid,int4,int4) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_heartbeat(text,uuid,int4,int4) TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_pdp_badge_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_pdp_badge_events() TO service_role;

DROP POLICY IF EXISTS "home_sections public read visible" ON public.home_sections;
CREATE POLICY "home_sections public read visible" ON public.home_sections
  FOR SELECT USING (is_visible = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE OR REPLACE FUNCTION public.notify_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
BEGIN
  IF NEW.role <> 'admin' THEN
    RETURN NEW;
  END IF;
  BEGIN
    v_url := current_setting('app.supabase_url', true);
    IF v_url IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/notify-role-change',
        headers := public.operational_worker_headers(),
        body := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text, 'event', 'role_granted')
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.alter_job(job_id := jobid,
      command := regexp_replace(command, $r$headers\s*:=\s*'[^']*'::jsonb$r$, 'headers := public.operational_worker_headers()'))
      FROM cron.job WHERE jobname IN ('telemetry-alert-monitor-15m', 'instagram-bulk-refresh-hourly');
  END IF;
END $$;