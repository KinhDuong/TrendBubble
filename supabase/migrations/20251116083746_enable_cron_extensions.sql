/*
  # Enable Cron Extensions for Scheduled Edge Functions

  1. Extensions
    - Enable `pg_cron` extension for scheduling jobs
    - Enable `pg_net` extension for making HTTP requests

  2. Scheduled Job
    - Create hourly cron job to update Google Trends data
    - Runs every hour at minute 0
    - Calls the update-trends Edge Function

  3. Notes
    - Uses service role key for authentication
    - Automatically fetches and updates trending topics from Google Trends RSS
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to use pg_net
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the Edge Function to run every hour
SELECT cron.schedule(
    'update-google-trends-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/update-trends',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'triggered_by', 'cron',
            'timestamp', now()
        )
    );
    $$
);