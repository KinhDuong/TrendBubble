/*
  # Add avg_monthly_searches to brand_pages

  1. Changes
    - Add `avg_monthly_searches` column to `brand_pages` table
      - Stores the average monthly search volume for the brand itself
      - Nullable integer field with default value of 0
      - This is different from keyword search volumes

  2. Notes
    - This field represents how many people search for the brand name directly
    - Used for brand comparison and brand search volume analysis
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'avg_monthly_searches'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN avg_monthly_searches integer DEFAULT 0;
  END IF;
END $$;
