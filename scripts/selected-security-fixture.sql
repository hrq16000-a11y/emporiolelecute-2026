-- Disposable test schema only; never apply this file to the shared backend.
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL, PRIMARY KEY(user_id, role));
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_code text UNIQUE NOT NULL,
 customer_email text, customer_name text, customer_phone text, status text DEFAULT 'pending',
 address_cep text, address_street text, address_number text, address_complement text,
 address_neighborhood text, address_city text, address_state text,
 shipping_method text, shipping_company text, shipping_days integer, shipping_price numeric DEFAULT 0,
 subtotal numeric, total numeric, created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.order_items (id uuid DEFAULT gen_random_uuid(), order_id uuid, product_name text, quantity integer, unit_price numeric, personalization text);
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, price numeric, is_active boolean DEFAULT true, weight_kg numeric, length_cm numeric, width_cm numeric, height_cm numeric, requires_shipping boolean DEFAULT true);
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shipping_settings (origin_zip_code text, is_enabled boolean, default_box_weight_kg numeric, default_box_width_cm numeric, default_box_height_cm numeric, default_box_length_cm numeric, shipping_markup_percentage numeric DEFAULT 0, handling_fee numeric DEFAULT 0, pickup_enabled boolean DEFAULT false);
GRANT ALL ON public.shipping_settings TO service_role;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shipping_providers (provider_code text, provider_name text, api_key text, endpoint_url text, is_active boolean);
GRANT ALL ON public.shipping_providers TO service_role;
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shipping_rules (is_active boolean, priority integer, condition_type text, condition_value jsonb, discount_type text, discount_value numeric);
GRANT ALL ON public.shipping_rules TO service_role;
ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shipping_quote_cache (cache_key text PRIMARY KEY, options jsonb, created_at timestamptz DEFAULT now());
GRANT ALL ON public.shipping_quote_cache TO service_role;
ALTER TABLE public.shipping_quote_cache ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.shipping_audit_logs (event_type text, provider_name text, error_message text, total_weight_kg numeric, melhor_envio_has_key boolean, estimated boolean, cart_snapshot jsonb, http_status integer);
GRANT ALL ON public.shipping_audit_logs TO service_role;
ALTER TABLE public.shipping_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.visitors (
 visitor_id text PRIMARY KEY, ip inet, user_agent text, is_bot boolean DEFAULT false, bot_name text,
 lead_status text DEFAULT 'visitor', lead_trigger text, lead_promoted_at timestamptz,
 first_referrer text, first_landing_path text, utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
 total_pageviews integer DEFAULT 0, total_time_seconds integer DEFAULT 0,
 last_seen_at timestamptz DEFAULT now(), consent_status text, consent_at timestamptz, screen_w integer
);
GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.visitor_pageviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visitor_id text, path text, time_on_page_seconds integer DEFAULT 0, scroll_depth_pct integer DEFAULT 0, viewed_at timestamptz DEFAULT now());
GRANT ALL ON public.visitor_pageviews TO service_role;
ALTER TABLE public.visitor_pageviews ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.cookie_consents (visitor_id text, accepted boolean, categories jsonb, ip inet, user_agent text);
GRANT ALL ON public.cookie_consents TO service_role;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Minimal persistence adapters for handler integration, not a full migration replay.
CREATE FUNCTION public.track_pageview(_visitor_id text, _session_id uuid, _path text, _title text, _product_slug text, _referrer text, _from_path text DEFAULT NULL, _cta_id text DEFAULT NULL, _event_type text DEFAULT 'pageview') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 INSERT INTO visitor_pageviews(visitor_id,path) VALUES (_visitor_id,_path) RETURNING id INTO v_id;
 UPDATE visitors SET total_pageviews=total_pageviews+1 WHERE visitor_id=_visitor_id;
 RETURN v_id;
END $$;
CREATE FUNCTION public.track_heartbeat(_visitor_id text, _pageview_id uuid, _delta_seconds integer, _scroll_depth integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 SELECT id INTO v_id FROM visitor_pageviews WHERE visitor_id=_visitor_id AND (_pageview_id IS NULL OR id=_pageview_id) ORDER BY viewed_at DESC LIMIT 1;
 UPDATE visitor_pageviews SET time_on_page_seconds=time_on_page_seconds+_delta_seconds WHERE id=v_id AND visitor_id=_visitor_id;
 UPDATE visitors SET total_time_seconds=total_time_seconds+_delta_seconds WHERE visitor_id=_visitor_id;
END $$;
CREATE FUNCTION public.mark_visitor_as_lead(_visitor_id uuid, _trigger text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE visitors SET lead_status='lead',lead_trigger=_trigger WHERE visitor_id=_visitor_id::text AND is_bot=false;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.track_pageview(text,uuid,text,text,text,text,text,text,text), public.track_heartbeat(text,uuid,integer,integer), public.mark_visitor_as_lead(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_pageview(text,uuid,text,text,text,text,text,text,text), public.track_heartbeat(text,uuid,integer,integer), public.mark_visitor_as_lead(uuid,text) TO service_role;