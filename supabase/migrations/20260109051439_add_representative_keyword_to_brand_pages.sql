/*
  # Add representative keyword to brand pages

  1. Changes
    - Add `representative_keyword` column to `brand_pages` table
      - Stores the specific keyword name that was selected to represent the brand
      - Used to query keyword metrics from `brand_keyword_data` table
    
  2. Notes
    - This column enables the system to display the correct keyword's metrics
    - Links brand pages to their primary keyword data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'representative_keyword'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN representative_keyword text;
  END IF;
END $$;
