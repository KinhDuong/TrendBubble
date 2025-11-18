/*
  # Fix Cron Job Configuration

  1. Changes
    - Remove the previous cron job with incorrect settings
    - Create new cron job with direct URL instead of settings reference
    - Use hardcoded Supabase URL for the Edge Function call

  2. Notes
    - The job will run every hour at minute 0
    - Calls the update-trends Edge Function directly
*/

-- Remove the old cron job
SELECT cron.unschedule('update-google-trends-hourly');

-- Create the corrected cron job with direct URL
SELECT cron.schedule(
    'update-google-trends-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://dxujygowwzhbrvxmbgqy.supabase.co/functions/v1/update-trends',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"triggered_by": "cron"}'::jsonb
    );
    $$
);