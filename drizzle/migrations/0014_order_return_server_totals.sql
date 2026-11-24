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

  RETURN jsonb_build_object('id', new_order_id, 'order_code', new_order_code, 'subtotal', v_subtotal, 'discount_amount', v_discount, 'total', v_total, 'items', (SELECT coalesce(jsonb_agg(jsonb_build_object('product_slug', e->>'product_slug', 'quantity', (e->>'quantity')::int, 'unit_price', (e->>'unit_price')::numeric)), '[]'::jsonb) FROM jsonb_array_elements(v_items) e));
END;
$function$;