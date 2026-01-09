/*
  # Add monthly searches to brand_pages

  1. Changes
    - Add `monthly_searches` JSONB column to store monthly search volume data
    - Eliminates need to query brand_keyword_data for trend charts
    
  2. Column Added
    - `monthly_searches` (jsonb): Stores monthly search volumes as {"2021-12": 50000, "2022-01": 55000, ...}
    
  3. Notes
    - Data is aggregated from all keywords for the brand
    - Stored as JSONB for efficient querying and indexing
    - Format: ISO month string (YYYY-MM) as key, total volume as value
    - Snapshot from upload time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'monthly_searches'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN monthly_searches jsonb;
  END IF;
END $$;
