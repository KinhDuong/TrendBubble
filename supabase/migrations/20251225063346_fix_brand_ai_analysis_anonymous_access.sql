/*
  # Fix anonymous access to brand AI analysis

  1. Changes
    - Drop the existing public policy that still checks for auth.uid()
    - Add a new policy specifically for anonymous users to view public AI analysis
    
  2. Security
    - Anonymous users can only read AI analysis for brands with is_public = true
    - Authenticated users can still see their own data plus public data
*/

-- Drop the old policy that incorrectly checks auth.uid() for public role
DROP POLICY IF EXISTS "Users can view public or owned AI analysis" ON brand_ai_analysis;

-- Add policy for authenticated users to view public or owned AI analysis
CREATE POLICY "Authenticated users can view public or owned AI analysis"
  ON brand_ai_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM brand_pages
      WHERE brand_pages.brand = brand_ai_analysis.brand
        AND brand_pages.user_id = brand_ai_analysis.user_id
        AND (brand_pages.is_public = true OR brand_pages.user_id = auth.uid())
    )
  );

-- Add policy for anonymous users to view public AI analysis
CREATE POLICY "Anonymous users can view public AI analysis"
  ON brand_ai_analysis
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM brand_pages
      WHERE brand_pages.brand = brand_ai_analysis.brand
        AND brand_pages.user_id = brand_ai_analysis.user_id
        AND brand_pages.is_public = true
    )
  );
