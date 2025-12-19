/*
  # Add GAMING category to pages

  1. Changes
    - Drop existing category check constraint
    - Add new constraint with GAMING included
    - Valid categories now include: AI, MARKETS, ECONOMY, TECHNOLOGY, MONEY, HEALTHCARE, 
      DEMOGRAPHICS, ENERGY, MAPS, MINING, GREEN, QUIZZES, TV & MOVIES, SHOPPING, 
      VIDEOS, NEWS, TASTY, STREAMING & YOUTUBE, THE WORLD, GAMING
  
  2. Security
    - No RLS changes needed
*/

-- Drop the existing constraint
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_category_check;

-- Add new constraint with GAMING included
ALTER TABLE pages ADD CONSTRAINT pages_category_check 
CHECK (category IS NULL OR category IN (
  'AI', 'MARKETS', 'ECONOMY', 'TECHNOLOGY', 'MONEY', 'HEALTHCARE', 
  'DEMOGRAPHICS', 'ENERGY', 'MAPS', 'MINING', 'GREEN', 'QUIZZES', 
  'TV & MOVIES', 'SHOPPING', 'VIDEOS', 'NEWS', 'TASTY', 'STREAMING & YOUTUBE',
  'THE WORLD', 'GAMING'
));