/*
  # Add demand, interest, and sentiment scores to brand_pages

  1. Changes
    - Add demand_score, interest_score, and sentiment to brand_pages
    - These represent the representative keyword's scores
    - Enables Brand Compare to show consistent metrics
    
  2. Columns Added
    - demand_score (numeric): Customer demand score (0-50)
    - interest_score (numeric): Customer interest score (0-50)
    - sentiment (numeric): Sentiment score (-1 to 1)
    
  3. Notes
    - Values come from the representative keyword
    - Used by Brand Compare for consistent metrics across UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'demand_score'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN demand_score numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'interest_score'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN interest_score numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN sentiment numeric;
  END IF;
END $$;
