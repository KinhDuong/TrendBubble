/*
  # Add Unique Constraint to Brand Monthly Data
  
  ## Changes
  - Add unique constraint on (brand, month, user_id) for brand_keyword_monthly_data table
  - This allows proper upsert operations when uploading CSV data
  - Ensures each user can only have one monthly record per brand/month combination
  
  ## Purpose
  Fixes the CSV upload functionality by enabling proper conflict resolution
  when the same brand/month data is uploaded multiple times.
*/

-- Add unique constraint to brand_keyword_monthly_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'brand_keyword_monthly_data_brand_month_user_unique'
  ) THEN
    ALTER TABLE brand_keyword_monthly_data
    ADD CONSTRAINT brand_keyword_monthly_data_brand_month_user_unique 
    UNIQUE (brand, month, user_id);
  END IF;
END $$;
