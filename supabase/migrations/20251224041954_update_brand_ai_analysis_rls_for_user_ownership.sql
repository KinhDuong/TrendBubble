/*
  # Update brand_ai_analysis RLS for user ownership

  1. Changes
    - Update RLS policies to restrict insert/update/delete to owner only
    - Keep public read access

  2. Security Changes
    - Users can only create their own AI analysis
    - Users can only update their own AI analysis
    - Users can only delete their own AI analysis
    - Anyone can read AI analysis (public access)

  3. Notes
    - This ensures users can only manage their own AI analysis
    - Maintains SEO-friendly public read access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert brand AI analysis" ON brand_ai_analysis;
DROP POLICY IF EXISTS "Authenticated users can update brand AI analysis" ON brand_ai_analysis;
DROP POLICY IF EXISTS "Authenticated users can delete brand AI analysis" ON brand_ai_analysis;

-- Users can only insert their own AI analysis
CREATE POLICY "Users can insert own brand AI analysis"
  ON brand_ai_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own AI analysis
CREATE POLICY "Users can update own brand AI analysis"
  ON brand_ai_analysis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own AI analysis
CREATE POLICY "Users can delete own brand AI analysis"
  ON brand_ai_analysis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
