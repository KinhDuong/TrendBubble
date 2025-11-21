/*
  # Add source column to trending_topics table

  1. Changes
    - Add `source` column to `trending_topics` table
      - Type: text with check constraint
      - Values: 'google_trends' or 'user_upload'
      - Default: 'google_trends'
      - Not null
    - Add index on source column for better query performance
  
  2. Purpose
    - Distinguish between data from Google Trends API and user CSV uploads
    - Enable filtering by data source in the UI
    - Maintain backwards compatibility by defaulting existing data to 'google_trends'
*/

-- Add source column with default value
ALTER TABLE trending_topics 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'google_trends'
CHECK (source IN ('google_trends', 'user_upload'));

-- Add index for better query performance when filtering by source
CREATE INDEX IF NOT EXISTS idx_trending_topics_source ON trending_topics(source);

-- Add comment to document the column
COMMENT ON COLUMN trending_topics.source IS 'Data source: google_trends (from API) or user_upload (from CSV)';