/*
  # Create brand_pages table

  1. New Tables
    - `brand_pages`
      - `id` (uuid, primary key)
      - `brand` (text, unique) - Brand name, must match brand in brand_keyword_data
      - `meta_title` (text) - SEO title for the brand page
      - `meta_description` (text) - SEO description
      - `intro_text` (text) - Introduction text displayed at the top
      - `summary` (text) - Rich HTML content for detailed summary
      - `faq` (text) - Rich HTML content for FAQ section
      - `cover_image` (text) - URL to cover image
      - `created_at` (timestamptz) - When the page was created
      - `updated_at` (timestamptz) - When the page was last updated

  2. Security
    - Enable RLS on `brand_pages` table
    - Add policy for public read access
    - Add policies for authenticated admin users to insert/update/delete
*/

CREATE TABLE IF NOT EXISTS brand_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text UNIQUE NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  intro_text text DEFAULT '',
  summary text DEFAULT '',
  faq text DEFAULT '',
  cover_image text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brand pages"
  ON brand_pages
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert brand pages"
  ON brand_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update brand pages"
  ON brand_pages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete brand pages"
  ON brand_pages
  FOR DELETE
  TO authenticated
  USING (true);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_pages_updated_at
  BEFORE UPDATE ON brand_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_pages_updated_at();