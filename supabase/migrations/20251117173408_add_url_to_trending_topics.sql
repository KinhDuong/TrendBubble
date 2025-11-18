/*
  # Add URL Column to Trending Topics

  1. Changes
    - Add url column to trending_topics table to store Google Trends link for each topic
    - This enables clickable bubbles that open the corresponding Google Trends page

  2. Security
    - No RLS changes needed as this is just adding a data column
*/

-- Add url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trending_topics' AND column_name = 'url'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN url text;
  END IF;
END $$;