/*
  # Update unique constraint to include name and date

  1. Changes
    - Drop the existing unique constraint on name only
    - Create an immutable function to extract date from timestamptz
    - Add unique constraint using the immutable function
    - This allows the same topic to exist on different dates
    - The constraint ensures only one entry per topic per day

  2. Important Notes
    - Topics with the same name can now exist if they have different dates
    - The constraint ensures only one entry per topic per day
*/

-- Drop the existing unique constraint on name only
DROP INDEX IF EXISTS trending_topics_name_unique_idx;

-- Create an immutable function to cast timestamptz to date
CREATE OR REPLACE FUNCTION timestamptz_to_date(ts timestamptz) 
RETURNS date AS $$
  SELECT ts::date;
$$ LANGUAGE SQL IMMUTABLE;

-- Add unique constraint on name and date combination
CREATE UNIQUE INDEX IF NOT EXISTS trending_topics_name_date_unique_idx 
ON trending_topics (LOWER(TRIM(name)), timestamptz_to_date(pub_date));