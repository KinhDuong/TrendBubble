/*
  # Remove Public Access to Brand Data

  ## Changes
  - Removes public read access policies from brand_keyword_data table
  - Removes public read access policies from brand_keyword_monthly_data table
  - Removes public read access policies from brand_ai_analysis table
  
  ## Security
  After this migration, users will only be able to:
  - View their own brand data (where user_id = auth.uid())
  - Insert/Update/Delete their own brand data
  
  This ensures data privacy - users can only see brand data they uploaded.
*/

-- Drop the public read policy from brand_keyword_data
DROP POLICY IF EXISTS "Anyone can view brand keyword data" ON brand_keyword_data;

-- Drop the public read policy from brand_keyword_monthly_data
DROP POLICY IF EXISTS "Anyone can view monthly brand data" ON brand_keyword_monthly_data;

-- Drop the public read policy from brand_ai_analysis
DROP POLICY IF EXISTS "Anyone can read brand AI analysis" ON brand_ai_analysis;

-- Add a private read policy for brand_ai_analysis (if it doesn't exist)
-- The AI analysis should be tied to the brand, which is tied to user_id
-- For now, make it so authenticated users can only see analysis they created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_ai_analysis' 
    AND policyname = 'Users can read own brand AI analysis'
  ) THEN
    CREATE POLICY "Users can read own brand AI analysis"
      ON brand_ai_analysis
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM brand_keyword_data
          WHERE brand_keyword_data.brand = brand_ai_analysis.brand
          AND brand_keyword_data.user_id = auth.uid()
          LIMIT 1
        )
      );
  END IF;
END $$;
