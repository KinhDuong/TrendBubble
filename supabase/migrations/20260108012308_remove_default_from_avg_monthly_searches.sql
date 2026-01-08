/*
  # Remove default value from avg_monthly_searches column
  
  1. Changes
    - Remove DEFAULT 0 from brand_pages.avg_monthly_searches column
    - This allows us to detect when no value is being passed (NULL vs 0)
  
  2. Notes
    - Column remains nullable so existing data is preserved
    - This helps debug the upload issue
*/

ALTER TABLE brand_pages 
ALTER COLUMN avg_monthly_searches DROP DEFAULT;
