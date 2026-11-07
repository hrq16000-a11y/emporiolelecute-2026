DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.search_products(text,integer,uuid,numeric,numeric,integer)'::regprocedure) INTO definition;
 definition := replace(definition, 'FUNCTION public.search_products(', 'FUNCTION public.admin_search_preview_rank(');
 definition := replace(definition, '_offset integer DEFAULT 0)', '_offset integer DEFAULT 0, _draft jsonb DEFAULT NULL)');
 definition := replace(definition, 'BEGIN' || chr(10) || '  v_q :=', 'BEGIN' || chr(10) || '  IF NOT public.has_role(auth.uid(), ''admin'') THEN RAISE EXCEPTION ''Admin access required'' USING ERRCODE = ''42501''; END IF;' || chr(10) || '  v_q :=');
 definition := replace(definition, 'FROM public.search_boosts b', 'FROM (SELECT existing.* FROM public.search_boosts existing WHERE _draft IS NULL OR NOT (existing.term_normalized = public.normalize_search(_draft->>''term'') AND existing.product_id = (_draft->>''product_id'')::uuid) UNION ALL SELECT draft.* FROM jsonb_populate_record(NULL::public.search_boosts, _draft || jsonb_build_object(''term_normalized'',public.normalize_search(_draft->>''term''),''created_at'',coalesce((SELECT created_at FROM public.search_boosts WHERE term_normalized=public.normalize_search(_draft->>''term'') AND product_id=(_draft->>''product_id'')::uuid),now()))) draft WHERE _draft IS NOT NULL) b');
 definition := replace(definition, 'IF _offset = 0 THEN', 'IF false THEN');
 IF definition NOT LIKE '%Admin access required%' OR definition NOT LIKE '%_draft jsonb%' OR definition NOT LIKE '%jsonb_populate_record%' THEN RAISE EXCEPTION 'Unexpected search function definition'; END IF;
 EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.admin_search_preview_rank(text,integer,uuid,numeric,numeric,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_preview_rank(text,integer,uuid,numeric,numeric,integer,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.preview_search_boost(_draft jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog AS $$
DECLARE current_result jsonb; proposed_result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF length(public.normalize_search(_draft->>'term')) < 2 OR (_draft->>'weight')::numeric NOT BETWEEN 1 AND 1000 OR (_draft->>'weight')::numeric <> trunc((_draft->>'weight')::numeric) OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=(_draft->>'product_id')::uuid AND is_active=true) THEN RAISE EXCEPTION 'Invalid boost'; END IF;
 IF (_draft->>'starts_at')::timestamptz >= (_draft->>'ends_at')::timestamptz THEN RAISE EXCEPTION 'Invalid campaign period'; END IF;
 current_result := public.admin_search_preview_rank(_draft->>'term',12,NULL,NULL,NULL,0,NULL);
 proposed_result := public.admin_search_preview_rank(_draft->>'term',12,NULL,NULL,NULL,0,_draft);
 RETURN jsonb_build_object('before',current_result,'after',proposed_result);
END; $$;
REVOKE ALL ON FUNCTION public.preview_search_boost(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.preview_search_boost(jsonb) TO authenticated;