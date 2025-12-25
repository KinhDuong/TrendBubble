/*
  # Add Public/Private Toggle to Brand Pages

  1. Changes
    - Add `is_public` column to `brand_pages` table (defaults to false for privacy)
    - Update RLS policies to allow public read access when `is_public = true`
    - Maintain private access for brand data (keywords, monthly data, AI analysis)
  
  2. Security
    - Public users can only view brand pages marked as public
    - All brand keyword data, monthly data, and AI analysis remain viewable if page is public
    - Only the page owner can update the `is_public` status
    - Other admin pages remain fully private
*/

-- Add is_public column to brand_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_pages' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE brand_pages ADD COLUMN is_public boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Drop existing policies for brand_pages
DROP POLICY IF EXISTS "Users can view their own brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Users can create their own brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Users can update their own brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Users can delete their own brand pages" ON brand_pages;

-- Create new policies that allow public viewing of public pages
CREATE POLICY "Anyone can view public brand pages"
  ON brand_pages
  FOR SELECT
  USING (is_public = true OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

CREATE POLICY "Users can create their own brand pages"
  ON brand_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand pages"
  ON brand_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand pages"
  ON brand_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update policies for brand_keyword_data to allow public viewing if parent brand page is public
DROP POLICY IF EXISTS "Users can view their own brand keyword data" ON brand_keyword_data;
DROP POLICY IF EXISTS "Users can insert their own brand keyword data" ON brand_keyword_data;
DROP POLICY IF EXISTS "Users can update their own brand keyword data" ON brand_keyword_data;
DROP POLICY IF EXISTS "Users can delete their own brand keyword data" ON brand_keyword_data;

CREATE POLICY "Users can view public or owned brand keyword data"
  ON brand_keyword_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_data.brand
      AND brand_pages.user_id = brand_keyword_data.user_id
      AND (brand_pages.is_public = true OR (auth.uid() IS NOT NULL AND brand_pages.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can insert their own brand keyword data"
  ON brand_keyword_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand keyword data"
  ON brand_keyword_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand keyword data"
  ON brand_keyword_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update policies for brand_keyword_monthly_data
DROP POLICY IF EXISTS "Users can view their own brand monthly data" ON brand_keyword_monthly_data;
DROP POLICY IF EXISTS "Users can insert their own brand monthly data" ON brand_keyword_monthly_data;
DROP POLICY IF EXISTS "Users can update their own brand monthly data" ON brand_keyword_monthly_data;
DROP POLICY IF EXISTS "Users can delete their own brand monthly data" ON brand_keyword_monthly_data;

CREATE POLICY "Users can view public or owned brand monthly data"
  ON brand_keyword_monthly_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_keyword_monthly_data.brand
      AND brand_pages.user_id = brand_keyword_monthly_data.user_id
      AND (brand_pages.is_public = true OR (auth.uid() IS NOT NULL AND brand_pages.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can insert their own brand monthly data"
  ON brand_keyword_monthly_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand monthly data"
  ON brand_keyword_monthly_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand monthly data"
  ON brand_keyword_monthly_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update policies for brand_ai_analysis
DROP POLICY IF EXISTS "Users can view their own AI analysis" ON brand_ai_analysis;
DROP POLICY IF EXISTS "Users can insert their own AI analysis" ON brand_ai_analysis;
DROP POLICY IF EXISTS "Users can update their own AI analysis" ON brand_ai_analysis;
DROP POLICY IF EXISTS "Users can delete their own AI analysis" ON brand_ai_analysis;

CREATE POLICY "Users can view public or owned AI analysis"
  ON brand_ai_analysis
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_ai_analysis.brand
      AND brand_pages.user_id = brand_ai_analysis.user_id
      AND (brand_pages.is_public = true OR (auth.uid() IS NOT NULL AND brand_pages.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can insert their own AI analysis"
  ON brand_ai_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI analysis"
  ON brand_ai_analysis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI analysis"
  ON brand_ai_analysis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);