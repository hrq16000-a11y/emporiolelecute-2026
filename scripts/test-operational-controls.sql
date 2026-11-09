\set ON_ERROR_STOP on
BEGIN;
-- All fixtures and approvals are rolled back; no catalog data is changed.
DO $$
DECLARE scan_id uuid:=gen_random_uuid(); repeat_id uuid:=gen_random_uuid(); admin_id uuid; denied boolean:=false;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' LIMIT 1;
  IF admin_id IS NULL THEN RAISE EXCEPTION 'An admin fixture is required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  INSERT INTO public.security_scan_runs(id,status,trigger,source,high_regression,findings,created_at)
  VALUES(scan_id,'ok','test','test',true,'[{"id":"qa-high","package":"qa-package","severity":"high"}]',now()+interval '1 day');
  IF public.unresolved_catalog_security_scan() IS DISTINCT FROM scan_id THEN RAISE EXCEPTION 'New high regression must block'; END IF;
  INSERT INTO public.security_scan_runs(id,status,trigger,source,high_regression,findings,created_at)
  VALUES(repeat_id,'ok','test','test',false,'[{"id":"qa-high","package":"qa-package","severity":"high"}]',now()+interval '2 days');
  IF public.unresolved_catalog_security_scan() IS DISTINCT FROM scan_id THEN RAISE EXCEPTION 'Repeating an unchanged scan must not release the block'; END IF;
  BEGIN PERFORM public.approve_catalog_security(scan_id,NULL); EXCEPTION WHEN OTHERS THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Null approval reasons must be denied'; END IF;
  PERFORM public.approve_catalog_security(scan_id,'Approved isolated test fixture');
  IF public.unresolved_catalog_security_scan()=scan_id THEN RAISE EXCEPTION 'Explicit approval must release its own scan'; END IF;
  DELETE FROM public.catalog_security_approvals WHERE scan_id=test_operational_controls.scan_id;
END $$;
ROLLBACK;