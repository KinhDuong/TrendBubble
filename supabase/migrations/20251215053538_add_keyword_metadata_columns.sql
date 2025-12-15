/*
  # Add Keyword Metadata Columns

  ## Overview
  Adds additional metadata columns to brand_keyword_data table for storing
  keyword competition and trend metrics from SEO tools.

  ## Changes
  - Add `three_month_change` (numeric) - Percentage change over 3 months
  - Add `yoy_change` (numeric) - Year-over-year percentage change
  - Add `competition` (text) - Competition level (e.g., "Low", "Medium", "High")
  - Add `competition_indexed` (numeric) - Numerical competition index value

  ## Notes
  - All columns are optional (nullable) as they may not be present in all data sources
  - Numeric columns use DECIMAL type for precise percentage/index values
*/

-- Add metadata columns to brand_keyword_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'three_month_change'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN three_month_change numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'yoy_change'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN yoy_change numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'competition'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN competition text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'competition_indexed'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN competition_indexed numeric;
  END IF;
END $$;