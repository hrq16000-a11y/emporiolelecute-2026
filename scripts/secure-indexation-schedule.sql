-- Run through the privileged database query tool after restoring schedules.
-- Preserve the existing cadence, body and URL, replacing only public headers.
DO $$
BEGIN
  PERFORM cron.alter_job(
    job_id := jobid,
    command := regexp_replace(command, 'headers\s*:?=\s*''[^'']*''::jsonb', 'headers := public.operational_worker_headers()', 'gi')
  )
  FROM cron.job
  WHERE jobname IN ('seo-indexation-monitor-daily', 'seo-semrush-weekly', 'seo-checks-daily', 'seo-sitemap-auto-resubmit-15m', 'gc-orphan-product-images-monthly', 'media-backup-daily-audit', 'seo-daily-guard', 'seo-gsc-snapshot-daily');
  PERFORM cron.alter_job(
    job_id := jobid,
    command := regexp_replace(command, 'headers\s*:?=\s*jsonb_build_object\([\s\S]*?\)(\s*,\s*body)', 'headers := public.operational_worker_headers()\1', 'gi')
  )
  FROM cron.job
  WHERE jobname IN ('seo-gsc-snapshot-daily', 'gc-orphan-product-images-monthly', 'seo-daily-guard');
END;
$$;