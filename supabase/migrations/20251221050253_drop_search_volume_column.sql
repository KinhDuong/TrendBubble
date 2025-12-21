/*
  # Remove search_volume Column

  ## Overview
  Removes the unused `search_volume` column from brand_keyword_data table to avoid confusion.
  All search volume data is stored in the `"Avg. monthly searches"` column instead.

  ## Changes
  - Drop `search_volume` column from brand_keyword_data table
  - Drop `month` column from brand_keyword_data table (not used, monthly data is in "Searches: MMM YYYY" columns)

  ## Notes
  - This cleanup prevents confusion between duplicate columns
  - All existing data in `"Avg. monthly searches"` is preserved
*/

-- Drop unused columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'search_volume'
  ) THEN
    ALTER TABLE brand_keyword_data DROP COLUMN search_volume;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'month'
  ) THEN
    ALTER TABLE brand_keyword_data DROP COLUMN month;
  END IF;
END $$;
