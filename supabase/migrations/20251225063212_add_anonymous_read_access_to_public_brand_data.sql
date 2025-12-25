/*
  # Allow anonymous users to view public brand data

  1. Changes
    - Add policy for anonymous users to read brand_keyword_data when brand page is public
    - Add policy for anonymous users to read brand_keyword_monthly_data when brand page is public
    - This enables public brand pages to be viewed without authentication

  2. Security
    - Anonymous users can only read data for brands with is_public = true
    - Write operations still require authentication and ownership
*/

-- Allow anonymous users to view brand keyword data for public brand pages
CREATE POLICY "Anonymous users can view public brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_data.brand
        AND brand_pages.user_id = brand_keyword_data.user_id
        AND brand_pages.is_public = true
    )
  );

-- Allow anonymous users to view brand monthly data for public brand pages
CREATE POLICY "Anonymous users can view public brand monthly data"
  ON brand_keyword_monthly_data
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_monthly_data.brand
        AND brand_pages.user_id = brand_keyword_monthly_data.user_id
        AND brand_pages.is_public = true
    )
  );
