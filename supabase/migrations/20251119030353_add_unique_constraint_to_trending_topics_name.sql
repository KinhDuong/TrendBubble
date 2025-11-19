/*
  # Add unique constraint to trending_topics name

  1. Changes
    - Add unique constraint on `name` column to prevent duplicate topics
    - This ensures that only one topic with the same name can exist in the database
    - The constraint is case-insensitive to handle variations in capitalization

  2. Important Notes
    - If there are existing duplicates, they need to be cleaned up first
    - The constraint will prevent future duplicates from being inserted
*/

-- First, let's check and remove any existing duplicates, keeping only the most recent one
DO $$
BEGIN
  DELETE FROM trending_topics a
  USING trending_topics b
  WHERE a.id < b.id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));
END $$;

-- Add unique constraint on name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS trending_topics_name_unique_idx 
ON trending_topics (LOWER(TRIM(name)));
