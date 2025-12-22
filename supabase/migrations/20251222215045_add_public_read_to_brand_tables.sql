/*
  # Allow Public Read Access to Brand Data Tables
  
  1. Changes
    - Drop existing authenticated-only SELECT policies on brand_keyword_data and brand_keyword_monthly_data
    - Add new public SELECT policies to allow anyone to view brand insights
    - Keep INSERT, UPDATE, DELETE restricted to authenticated users
  
  2. Security
    - Public users can now view brand keyword data and trends
    - Only authenticated users can modify data
    - This enables public-facing brand insights pages
*/

-- Drop existing authenticated-only SELECT policies
DROP POLICY IF EXISTS "Authenticated users can read all brand keyword data" ON brand_keyword_data;
DROP POLICY IF EXISTS "Authenticated users can read all monthly brand data" ON brand_keyword_monthly_data;

-- Add new public SELECT policies
CREATE POLICY "Anyone can view brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view monthly brand data"
  ON brand_keyword_monthly_data
  FOR SELECT
  TO public
  USING (true);
