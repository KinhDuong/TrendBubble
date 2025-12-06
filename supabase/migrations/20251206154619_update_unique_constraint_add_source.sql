/*
  # Update unique constraint to include source

  1. Changes
    - Drop the existing unique constraint on name and date
    - Add unique constraint on name, date, and source combination
    - This allows the same topic to exist on the same date from different sources
    - The constraint ensures only one entry per topic per day per source

  2. Important Notes
    - Topics with the same name can exist on the same date if from different sources
    - The constraint ensures only one entry per topic per day per source
*/

-- Drop the existing unique constraint on name and date
DROP INDEX IF EXISTS trending_topics_name_date_unique_idx;

-- Add unique constraint on name, date, and source combination
CREATE UNIQUE INDEX IF NOT EXISTS trending_topics_name_date_source_unique_idx 
ON trending_topics (LOWER(TRIM(name)), timestamptz_to_date(pub_date), source);
