/*
  # Fix Brand Keyword Data Public Access for Authenticated Users

  1. Changes
    - Drop the restrictive "Users can read own brand keyword data" policy
    - Keep only the permissive policy that allows viewing public brand data
    - Apply same fix to brand_keyword_monthly_data table

  2. Security
    - Authenticated users can view keyword data for public brands OR their own brands
    - This aligns with the brand_pages access model
*/

-- Fix brand_keyword_data table
DROP POLICY IF EXISTS "Users can read own brand keyword data" ON brand_keyword_data;

-- Ensure the permissive policy exists
DROP POLICY IF EXISTS "Users can view public or owned brand keyword data" ON brand_keyword_data;

CREATE POLICY "Users can view public or owned brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_data.brand
        AND brand_pages.user_id = brand_keyword_data.user_id
        AND (brand_pages.is_public = true OR brand_pages.user_id = auth.uid())
    )
  );

-- Fix brand_keyword_monthly_data table
DROP POLICY IF EXISTS "Users can read own brand monthly data" ON brand_keyword_monthly_data;

-- Check if policy exists and create it
DROP POLICY IF EXISTS "Users can view public or owned brand monthly data" ON brand_keyword_monthly_data;

CREATE POLICY "Users can view public or owned brand monthly data"
  ON brand_keyword_monthly_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_monthly_data.brand
        AND brand_pages.user_id = brand_keyword_monthly_data.user_id
        AND (brand_pages.is_public = true OR brand_pages.user_id = auth.uid())
    )
  );