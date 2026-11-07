DO $migration$
DECLARE signature text; definition text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.admin_search_preview_rank(text,integer,uuid,numeric,numeric,integer,jsonb)', 'public.preview_search_boost(jsonb)'] LOOP
  SELECT pg_get_functiondef(signature::regprocedure) INTO definition;
  definition := replace(definition, 'public.normalize_search(_draft->>''term'')', 'trim(regexp_replace(lower(public.unaccent(_draft->>''term'')), ''\s+'', '' '', ''g''))');
  EXECUTE definition;
 END LOOP;
END;
$migration$;