-- Run in Supabase SQL editor to register the cron job.
-- Requires pg_cron and pg_net extensions enabled in Supabase dashboard.

SELECT cron.schedule(
  'send-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/schedule-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <your-service-role-key>'
    ),
    body := '{}'::jsonb
  );
  $$
);
