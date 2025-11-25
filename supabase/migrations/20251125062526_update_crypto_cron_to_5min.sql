/*
  # Update Crypto Trends Cron Job to 5 Minutes

  1. Changes
    - Remove existing hourly cron job for trends
    - Create new cron job for crypto trends that runs every 5 minutes
    - Maintain the Google Trends hourly job separately

  2. Notes
    - Crypto trends will update every 5 minutes to capture volatile price movements
    - Uses CoinGecko API which allows frequent updates on free tier
    - Cron pattern runs every 5 minutes (at 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 minutes past each hour)
*/

-- Remove the old hourly trends job
SELECT cron.unschedule('update-google-trends-hourly');

-- Create new cron job for crypto trends (every 5 minutes)
SELECT cron.schedule(
    'update-crypto-trends-5min',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://dxujygowwzhbrvxmbgqy.supabase.co/functions/v1/update-crypto-trends',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"triggered_by": "cron"}'::jsonb
    );
    $$
);

-- Keep Google Trends updating hourly
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
