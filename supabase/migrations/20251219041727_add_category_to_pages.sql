/*
  # Add category field to pages table

  1. Changes
    - Add `category` column to `pages` table
      - Type: text
      - Nullable: true (optional field)
      - Valid values: AI, MARKETS, ECONOMY, TECHNOLOGY, MONEY, HEALTHCARE, DEMOGRAPHICS, ENERGY, MAPS, MINING, GREEN, QUIZZES, TV & MOVIES, SHOPPING, VIDEOS, NEWS, TASTY, STREAMING & YOUTUBE
  
  2. Security
    - No RLS changes needed (inherits existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'category'
  ) THEN
    ALTER TABLE pages ADD COLUMN category text;
    
    -- Add check constraint for valid categories
    ALTER TABLE pages ADD CONSTRAINT pages_category_check 
    CHECK (category IS NULL OR category IN (
      'AI', 'MARKETS', 'ECONOMY', 'TECHNOLOGY', 'MONEY', 'HEALTHCARE', 
      'DEMOGRAPHICS', 'ENERGY', 'MAPS', 'MINING', 'GREEN', 'QUIZZES', 
      'TV & MOVIES', 'SHOPPING', 'VIDEOS', 'NEWS', 'TASTY', 'STREAMING & YOUTUBE'
    ));
  END IF;
END $$;