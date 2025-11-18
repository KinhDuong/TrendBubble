/*
  # Remove pub_date column from trending_topics table

  1. Changes
    - Remove `pub_date` column from `trending_topics` table
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'pub_date'
  ) THEN
    ALTER TABLE trending_topics DROP COLUMN pub_date;
  END IF;
END $$;