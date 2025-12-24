/*
  # Allow public read access to brand data

  1. Changes
    - Update RLS policies for brand_pages to allow public read access
    - Update RLS policies for brand_keyword_data to allow public read access
    - Update RLS policies for brand_keyword_monthly_data to allow public read access

  2. Security Changes
    - Allow anyone (authenticated or not) to read brand pages
    - Allow anyone (authenticated or not) to read brand keyword data
    - Allow anyone (authenticated or not) to read brand monthly keyword data
    - Maintain existing insert/update/delete policies (owner-only)

  3. Rationale
    - Brand insight pages should be publicly viewable for SEO and sharing
    - Users can still only modify their own data
    - This enables public access to insights while maintaining data integrity
*/

-- Update RLS policies for brand_pages
DROP POLICY IF EXISTS "Users can view own brand pages" ON brand_pages;

CREATE POLICY "Anyone can view brand pages"
  ON brand_pages
  FOR SELECT
  USING (true);

-- Update RLS policies for brand_keyword_data
DROP POLICY IF EXISTS "Users can read own brand keyword data" ON brand_keyword_data;

CREATE POLICY "Anyone can read brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  USING (true);

-- Update RLS policies for brand_keyword_monthly_data
DROP POLICY IF EXISTS "Users can read own monthly brand data" ON brand_keyword_monthly_data;

CREATE POLICY "Anyone can read monthly brand data"
  ON brand_keyword_monthly_data
  FOR SELECT
  USING (true);
