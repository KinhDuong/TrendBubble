/*
  # Create Brand PPC Insights Table

  1. New Tables
    - `brand_ppc_insights`
      - `id` (uuid, primary key)
      - `brand_page_id` (uuid, foreign key to brand_pages)
      - `user_id` (uuid, foreign key to auth.users)
      - `insights` (jsonb) - Stores the complete PPC insights analysis including:
        - Campaign groups by intent
        - Budget recommendations
        - Ad copy suggestions
        - Targeting recommendations
      - `created_at` (timestamptz) - When insights were first generated
      - `updated_at` (timestamptz) - When insights were last regenerated

  2. Security
    - Enable RLS on `brand_ppc_insights` table
    - Users can read their own insights
    - Users can read insights for public brand pages
    - Anonymous users can read insights for public brand pages
    - Users can insert/update/delete their own insights

  3. Important Notes
    - One insights record per brand page (enforced by unique constraint)
    - Insights are regenerated on demand, not on every page load
    - JSONB format allows flexible storage of complex analysis data
*/

CREATE TABLE IF NOT EXISTS brand_ppc_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_page_id uuid NOT NULL REFERENCES brand_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_page_id)
);

ALTER TABLE brand_ppc_insights ENABLE ROW LEVEL SECURITY;

-- Users can read their own PPC insights
CREATE POLICY "Users can read own PPC insights"
  ON brand_ppc_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can read PPC insights for public brand pages
CREATE POLICY "Users can read public brand PPC insights"
  ON brand_ppc_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.id = brand_ppc_insights.brand_page_id
      AND brand_pages.is_public = true
    )
  );

-- Anonymous users can read PPC insights for public brand pages
CREATE POLICY "Anonymous users can read public brand PPC insights"
  ON brand_ppc_insights
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.id = brand_ppc_insights.brand_page_id
      AND brand_pages.is_public = true
    )
  );

-- Users can insert their own PPC insights
CREATE POLICY "Users can insert own PPC insights"
  ON brand_ppc_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own PPC insights
CREATE POLICY "Users can update own PPC insights"
  ON brand_ppc_insights
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own PPC insights
CREATE POLICY "Users can delete own PPC insights"
  ON brand_ppc_insights
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);