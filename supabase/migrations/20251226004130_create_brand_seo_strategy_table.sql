/*
  # Create Brand SEO Strategy Table

  1. New Tables
    - `brand_seo_strategy`
      - `id` (uuid, primary key)
      - `brand_name` (text, not null) - The brand/niche being analyzed
      - `user_id` (uuid, not null) - Owner of the analysis
      - `prompt` (text, not null) - The complete prompt sent to AI
      - `analysis` (text, not null) - The AI-generated SEO strategy in markdown
      - `created_at` (timestamptz) - When the analysis was generated
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `brand_seo_strategy` table
    - Add policies for users to:
      - Read their own analyses
      - Create new analyses
      - Update their own analyses
      - Delete their own analyses
    - Add policy for public read access if brand page is public
*/

CREATE TABLE IF NOT EXISTS brand_seo_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  analysis text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_seo_strategy_user_brand 
  ON brand_seo_strategy(user_id, brand_name);

-- Enable RLS
ALTER TABLE brand_seo_strategy ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own SEO strategies
CREATE POLICY "Users can read own SEO strategies"
  ON brand_seo_strategy
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own SEO strategies
CREATE POLICY "Users can create own SEO strategies"
  ON brand_seo_strategy
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own SEO strategies
CREATE POLICY "Users can update own SEO strategies"
  ON brand_seo_strategy
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own SEO strategies
CREATE POLICY "Users can delete own SEO strategies"
  ON brand_seo_strategy
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Anonymous users can read SEO strategies for public brand pages
CREATE POLICY "Public access to SEO strategies for public brands"
  ON brand_seo_strategy
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_seo_strategy.brand_name
      AND brand_pages.is_public = true
    )
  );