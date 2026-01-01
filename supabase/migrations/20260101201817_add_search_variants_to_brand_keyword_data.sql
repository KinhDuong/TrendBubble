/*
  # Add search_variants column to brand_keyword_data

  1. Changes
    - Add `search_variants` column to `brand_keyword_data` table
    - Column stores comma-separated list of duplicate keyword variants
    - Used when merging duplicate keywords with identical data

  2. Details
    - Type: text (nullable)
    - Allows storing variants like "coffee shops, coffee store, coffee place"
    - Displayed in bubble chart tooltips to show merged keyword variations
*/

-- Add search_variants column to brand_keyword_data table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'search_variants'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN search_variants text;
  END IF;
END $$;