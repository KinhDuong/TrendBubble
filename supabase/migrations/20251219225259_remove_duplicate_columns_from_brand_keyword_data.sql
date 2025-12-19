/*
  # Remove Duplicate and Unused Columns from brand_keyword_data

  This migration cleans up the brand_keyword_data table by removing duplicate and unused columns:
  
  ## Columns Being Removed
  1. `three_month_change` (numeric) - Replaced by `Three month change` (text) which stores the original Excel value
  2. `yoy_change` (numeric) - Replaced by `YoY change` (text) which stores the original Excel value
  3. `competition_indexed` (numeric) - Duplicate of `Competition (indexed value)` column
  4. `Competition` (text, duplicate entry) - Duplicate of the existing `competition` column
  5. `month` (date) - Not being used in the application

  ## Reason for Cleanup
  - The old snake_case columns (three_month_change, yoy_change) were from the initial schema
  - We now use the exact column names from the Excel export for clarity
  - Having both versions creates confusion and data inconsistency
  - The duplicate Competition column was likely added accidentally
*/

-- Remove old numeric columns that have been replaced by text versions
ALTER TABLE brand_keyword_data 
  DROP COLUMN IF EXISTS three_month_change;

ALTER TABLE brand_keyword_data 
  DROP COLUMN IF EXISTS yoy_change;

-- Remove duplicate columns
ALTER TABLE brand_keyword_data 
  DROP COLUMN IF EXISTS competition_indexed;

-- Remove the duplicate Competition column (keeping the lowercase one)
ALTER TABLE brand_keyword_data 
  DROP COLUMN IF EXISTS "Competition";

-- Remove unused month column
ALTER TABLE brand_keyword_data 
  DROP COLUMN IF EXISTS month;