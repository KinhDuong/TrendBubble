/*
  # Fix Brand Keyword Data RLS Policy

  1. Changes
    - Update the SELECT policy for authenticated users to allow viewing their own data even without a brand page
    - Users can view their data if:
      - They own the data (user_id matches), OR
      - A public brand page exists for that brand+user combination
    
  2. Security
    - Users can always view their own brand keyword data
    - Public brand data is viewable if a public page exists
    - Data remains private to the owner unless explicitly made public via brand_pages
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view public or owned brand keyword data" ON brand_keyword_data;

-- Create new policy that allows owners to view their data without requiring a page
CREATE POLICY "Users can view their own or public brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_data.brand
      AND brand_pages.user_id = brand_keyword_data.user_id
      AND brand_pages.is_public = true
    )
  );
