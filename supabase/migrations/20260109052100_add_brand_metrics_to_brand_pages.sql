/*
  # Add brand metrics to brand_pages

  1. Changes
    - Add brand performance metrics directly to `brand_pages` table
    - Includes: competition, CPC range, YoY change, 3-month change
    - This eliminates the need to query brand_keyword_data for display
    
  2. Columns Added
    - `competition` (numeric): Competition index value (0-1 scale)
    - `cpc_low` (numeric): Top of page bid low range
    - `cpc_high` (numeric): Top of page bid high range
    - `yoy_change` (numeric): Year-over-year change percentage
    - `three_month_change` (numeric): Three month change percentage
    
  3. Notes
    - Representative keyword reference kept for data lineage
    - Metrics are snapshot values from upload time
    - Faster page loads by avoiding extra queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'competition'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN competition numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'cpc_low'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN cpc_low numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'cpc_high'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN cpc_high numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'yoy_change'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN yoy_change numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'three_month_change'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN three_month_change numeric;
  END IF;
END $$;
