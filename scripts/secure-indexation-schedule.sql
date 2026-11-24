-- Run through the privileged database query tool after restoring schedules.
-- Preserve the existing cadence, body and URL, replacing only public headers.
DO $$
BEGIN
  PERFORM cron.alter_job(
    job_id := jobid,
    command := regexp_replace(command, 'headers\s*:?=\s*''[^'']*''::jsonb', 'headers := public.operational_worker_headers()', 'gi')
  )
  FROM cron.job
  WHERE jobname = 'seo-indexation-monitor-daily';
END;
$$;