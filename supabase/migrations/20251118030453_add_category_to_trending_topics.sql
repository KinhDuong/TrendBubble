/*
  # Add Category Field to Trending Topics

  1. Changes
    - Add `category` column to `trending_topics` table
      - Type: text
      - Nullable: true (existing records won't have categories)
      - Default: null
  
  2. Notes
    - This allows categorizing trending topics (e.g., "Politics", "Sports", "Technology", etc.)
    - Existing data will have null category values until populated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'category'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN category text;
  END IF;
END $$;