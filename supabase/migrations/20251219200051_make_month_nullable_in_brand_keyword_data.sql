/*
  # Make Month Column Nullable in Brand Keyword Data

  ## Overview
  Removes the NOT NULL constraint from the month column to support CSV uploads
  that don't contain month-specific data.

  ## Changes
  - Alter month column to allow NULL values
  
  ## Notes
  - Google Ads Keyword Planner exports may not always include month data
  - This allows the table to accept both monthly and aggregate keyword data
  - Existing data is preserved
*/

ALTER TABLE brand_keyword_data 
ALTER COLUMN month DROP NOT NULL;
