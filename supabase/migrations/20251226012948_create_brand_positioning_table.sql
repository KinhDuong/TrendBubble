/*
  # Create brand_positioning table

  1. New Tables
    - `brand_positioning`
      - `id` (uuid, primary key) - Unique identifier
      - `brand` (text) - Brand name (matches brand_pages)
      - `user_id` (uuid) - Owner reference
      - `positioning` (text[]) - Array of positioning attributes (e.g., ['budget-friendly', 'eco-conscious'])
      - `target_audience` (text) - Primary target audience description
      - `competitive_positioning` (text) - How brand positions against competitors
      - `brand_voice` (text) - Brand voice/tone guidelines
      - `unique_value_props` (text[]) - Array of unique value propositions
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `brand_positioning` table
    - Users can read their own brand positioning data
    - Users can insert their own brand positioning data
    - Users can update their own brand positioning data
    - Users can delete their own brand positioning data
    - Anonymous users can read public brand positioning (for brands marked public in brand_pages)

  3. Indexes
    - Index on brand for fast lookups
    - Index on user_id for ownership queries
    - Unique constraint on (brand, user_id) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS brand_positioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  positioning text[] DEFAULT '{}',
  target_audience text DEFAULT '',
  competitive_positioning text DEFAULT '',
  brand_voice text DEFAULT '',
  unique_value_props text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate brand positioning per user
ALTER TABLE brand_positioning 
  ADD CONSTRAINT unique_brand_user UNIQUE (brand, user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_positioning_brand ON brand_positioning(brand);
CREATE INDEX IF NOT EXISTS idx_brand_positioning_user_id ON brand_positioning(user_id);

-- Enable RLS
ALTER TABLE brand_positioning ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own brand positioning
CREATE POLICY "Users can read own brand positioning"
  ON brand_positioning FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Anonymous users can read public brand positioning
CREATE POLICY "Anonymous can read public brand positioning"
  ON brand_positioning FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM brand_pages
      WHERE brand_pages.brand = brand_positioning.brand
        AND brand_pages.user_id = brand_positioning.user_id
        AND brand_pages.is_public = true
    )
  );

-- Policy: Users can insert their own brand positioning
CREATE POLICY "Users can insert own brand positioning"
  ON brand_positioning FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own brand positioning
CREATE POLICY "Users can update own brand positioning"
  ON brand_positioning FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own brand positioning
CREATE POLICY "Users can delete own brand positioning"
  ON brand_positioning FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_positioning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_positioning_timestamp
  BEFORE UPDATE ON brand_positioning
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_positioning_updated_at();