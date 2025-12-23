/*
  # Update brand keyword tables RLS for private access

  1. Changes
    - Update RLS policies for brand_keyword_data to restrict read access to owner only
    - Update RLS policies for brand_keyword_monthly_data to restrict read access to owner only

  2. Security Changes
    - DROP existing public read policies
    - Add policies for users to read ONLY their own brand keyword data
    - Maintain existing insert/update/delete policies (already owner-only)

  3. Rationale
    - Brand insight pages are private to the user who uploaded them
    - The underlying keyword data should also be private to maintain data privacy
    - Each user's brand analysis data is now completely isolated
*/

-- Update RLS policies for brand_keyword_data
DROP POLICY IF EXISTS "Authenticated users can read all brand keyword data" ON brand_keyword_data;

CREATE POLICY "Users can read own brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update RLS policies for brand_keyword_monthly_data
DROP POLICY IF EXISTS "Authenticated users can read all monthly brand data" ON brand_keyword_monthly_data;

CREATE POLICY "Users can read own monthly brand data"
  ON brand_keyword_monthly_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
