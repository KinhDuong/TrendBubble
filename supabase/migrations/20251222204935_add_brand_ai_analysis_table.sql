/*
  # Create brand AI analysis table

  1. New Tables
    - `brand_ai_analysis`
      - `id` (uuid, primary key)
      - `brand` (text, brand name)
      - `analysis` (text, AI-generated markdown analysis)
      - `keyword_count` (integer, number of keywords analyzed)
      - `total_months` (integer, data period in months)
      - `avg_volume` (integer, average monthly search volume)
      - `model` (text, AI model used)
      - `created_at` (timestamptz, when analysis was generated)
      - `updated_at` (timestamptz, when analysis was last updated)
      
  2. Security
    - Enable RLS on `brand_ai_analysis` table
    - Add policy for public read access (anyone can view)
    - Add policy for authenticated users to create/update analysis
    
  3. Indexes
    - Index on brand for fast lookups
    - Unique constraint on brand to ensure one analysis per brand
*/

CREATE TABLE IF NOT EXISTS brand_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  analysis text NOT NULL,
  keyword_count integer DEFAULT 0,
  total_months integer DEFAULT 0,
  avg_volume integer DEFAULT 0,
  model text DEFAULT 'gpt-4o',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on brand (one analysis per brand, can be updated)
CREATE UNIQUE INDEX IF NOT EXISTS brand_ai_analysis_brand_idx ON brand_ai_analysis(brand);

-- Enable RLS
ALTER TABLE brand_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Public can read all analysis
CREATE POLICY "Anyone can read brand AI analysis"
  ON brand_ai_analysis
  FOR SELECT
  USING (true);

-- Authenticated users can insert analysis
CREATE POLICY "Authenticated users can insert brand AI analysis"
  ON brand_ai_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update analysis
CREATE POLICY "Authenticated users can update brand AI analysis"
  ON brand_ai_analysis
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete analysis
CREATE POLICY "Authenticated users can delete brand AI analysis"
  ON brand_ai_analysis
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_ai_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_brand_ai_analysis_updated_at ON brand_ai_analysis;
CREATE TRIGGER set_brand_ai_analysis_updated_at
  BEFORE UPDATE ON brand_ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_ai_analysis_updated_at();