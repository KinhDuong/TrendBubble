/*
  # Fix Brand Data Privacy - Restrict to Owner Only

  1. Security Changes
    - Remove public read access from brand_keyword_data
    - Remove public read access from brand_pages
    - Add user-specific read policies that check user_id ownership
    - Ensure users can ONLY see their own brand data

  2. Important Notes
    - This fixes a critical security vulnerability where any user could see all brand data
    - Users will now only see data where user_id matches their auth.uid()
*/

-- Fix brand_keyword_data policies
DROP POLICY IF EXISTS "Anyone can read brand keyword data" ON brand_keyword_data;

CREATE POLICY "Users can read own brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix brand_pages policies
DROP POLICY IF EXISTS "Anyone can view brand pages" ON brand_pages;

CREATE POLICY "Users can view own brand pages"
  ON brand_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
