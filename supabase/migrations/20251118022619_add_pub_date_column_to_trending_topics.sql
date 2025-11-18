/*
  # Add pub_date column to trending_topics table

  1. Changes
    - Add `pub_date` column to `trending_topics` table
      - `pub_date` (timestamptz, nullable) - Publication date from Google Trends RSS feed or Started column from CSV
  
  2. Notes
    - This represents when Google Trends first detected/published the trending topic
    - Different from `created_at` which is when the record was inserted into our database
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'pub_date'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN pub_date timestamptz;
  END IF;
END $$;