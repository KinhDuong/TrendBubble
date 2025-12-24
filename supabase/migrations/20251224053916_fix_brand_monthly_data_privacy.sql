/*
  # Fix Brand Monthly Data Privacy - Restrict to Owner Only

  1. Security Changes
    - Remove public read access from brand_keyword_monthly_data
    - Add user-specific read policy that checks user_id ownership
    - Ensure users can ONLY see their own monthly brand data

  2. Important Notes
    - This fixes a critical security vulnerability where any user could see all monthly brand data
    - Users will now only see data where user_id matches their auth.uid()
*/

-- Fix brand_keyword_monthly_data policies
DROP POLICY IF EXISTS "Anyone can read monthly brand data" ON brand_keyword_monthly_data;

CREATE POLICY "Users can read own monthly brand data"
  ON brand_keyword_monthly_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
