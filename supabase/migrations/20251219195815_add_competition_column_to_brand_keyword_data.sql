/*
  # Add Competition Column to Brand Keyword Data

  ## Overview
  Adds the "Competition" column with capital C to match Excel/CSV format.
  This is separate from the existing "competition" (lowercase) column.

  ## Changes
  - Add "Competition" (text) column to brand_keyword_data table
  
  ## Notes
  - This matches the exact column name from Google Ads Keyword Planner exports
  - The column is nullable to support partial data uploads
  - Existing data is preserved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Competition'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Competition" text;
  END IF;
END $$;
