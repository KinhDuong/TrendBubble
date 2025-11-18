/*
  # Update Trending Topics Table for Accumulation

  1. Changes
    - Add last_seen timestamp to track when a topic was last trending
    - Add first_seen timestamp to track when a topic first appeared
    - Remove old data cleanup to allow accumulation up to 100 topics
    - Topics will be ranked by most recent appearance and search volume

  2. Notes
    - This allows accumulation of trending topics throughout the day
    - Older topics naturally fall off as new ones are added
*/

-- Add timestamp columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trending_topics' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trending_topics' AND column_name = 'first_seen'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN first_seen timestamptz DEFAULT now();
  END IF;
END $$;