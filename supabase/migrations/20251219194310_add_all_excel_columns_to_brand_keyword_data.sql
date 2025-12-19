/*
  # Add All Excel Columns to Brand Keyword Data

  ## Overview
  This migration adds all columns from the uploaded Excel file to the brand_keyword_data table.
  Column names are preserved as closely as possible to match the Excel format.

  ## New Columns Added
  
  ### Core Metrics
  - `Currency` (text) - Currency code (e.g., CAD)
  - `Avg. monthly searches` (bigint) - Average monthly search volume
  - `Three month change` (text) - Percentage change over 3 months (stored as text to preserve % format)
  - `YoY change` (text) - Year-over-year percentage change (stored as text to preserve % format)
  - `Competition` (text) - Competition level (Low/Medium/High)
  - `Competition (indexed value)` (numeric) - Numerical competition score
  - `Top of page bid (low range)` (numeric) - Minimum bid price
  - `Top of page bid (high range)` (numeric) - Maximum bid price
  - `Ad impression share` (text) - Ad impression share percentage
  - `Organic impression share` (text) - Organic impression share percentage
  - `Organic average position` (text) - Average organic search position
  - `In account?` (text) - Whether keyword is in account
  - `In plan?` (text) - Whether keyword is in plan

  ### Monthly Search Data (48 columns)
  - Monthly columns from Dec 2021 through Nov 2025
  - Format: "Searches: MMM YYYY" (e.g., "Searches: Dec 2021")
  - Type: bigint for all monthly search volumes

  ## Notes
  - All new columns are nullable to support partial data uploads
  - Column names use exact Excel format for easy mapping
  - Existing data is preserved
*/

-- Add core metric columns
DO $$
BEGIN
  -- Currency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Currency'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Currency" text;
  END IF;

  -- Avg. monthly searches
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Avg. monthly searches'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Avg. monthly searches" bigint;
  END IF;

  -- Three month change
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Three month change'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Three month change" text;
  END IF;

  -- YoY change
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'YoY change'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "YoY change" text;
  END IF;

  -- Competition (indexed value)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Competition (indexed value)'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Competition (indexed value)" numeric;
  END IF;

  -- Top of page bid (low range)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Top of page bid (low range)'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Top of page bid (low range)" numeric;
  END IF;

  -- Top of page bid (high range)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Top of page bid (high range)'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Top of page bid (high range)" numeric;
  END IF;

  -- Ad impression share
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Ad impression share'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Ad impression share" text;
  END IF;

  -- Organic impression share
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Organic impression share'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Organic impression share" text;
  END IF;

  -- Organic average position
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'Organic average position'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "Organic average position" text;
  END IF;

  -- In account?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'In account?'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "In account?" text;
  END IF;

  -- In plan?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'In plan?'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "In plan?" text;
  END IF;
END $$;

-- Add all monthly search columns (Dec 2021 - Nov 2025)
DO $$
DECLARE
  month_cols text[] := ARRAY[
    'Searches: Dec 2021', 'Searches: Jan 2022', 'Searches: Feb 2022', 'Searches: Mar 2022',
    'Searches: Apr 2022', 'Searches: May 2022', 'Searches: Jun 2022', 'Searches: Jul 2022',
    'Searches: Aug 2022', 'Searches: Sep 2022', 'Searches: Oct 2022', 'Searches: Nov 2022',
    'Searches: Dec 2022', 'Searches: Jan 2023', 'Searches: Feb 2023', 'Searches: Mar 2023',
    'Searches: Apr 2023', 'Searches: May 2023', 'Searches: Jun 2023', 'Searches: Jul 2023',
    'Searches: Aug 2023', 'Searches: Sep 2023', 'Searches: Oct 2023', 'Searches: Nov 2023',
    'Searches: Dec 2023', 'Searches: Jan 2024', 'Searches: Feb 2024', 'Searches: Mar 2024',
    'Searches: Apr 2024', 'Searches: May 2024', 'Searches: Jun 2024', 'Searches: Jul 2024',
    'Searches: Aug 2024', 'Searches: Sep 2024', 'Searches: Oct 2024', 'Searches: Nov 2024',
    'Searches: Dec 2024', 'Searches: Jan 2025', 'Searches: Feb 2025', 'Searches: Mar 2025',
    'Searches: Apr 2025', 'Searches: May 2025', 'Searches: Jun 2025', 'Searches: Jul 2025',
    'Searches: Aug 2025', 'Searches: Sep 2025', 'Searches: Oct 2025', 'Searches: Nov 2025'
  ];
  col_name text;
BEGIN
  FOREACH col_name IN ARRAY month_cols
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'brand_keyword_data' AND column_name = col_name
    ) THEN
      EXECUTE format('ALTER TABLE brand_keyword_data ADD COLUMN %I bigint', col_name);
    END IF;
  END LOOP;
END $$;