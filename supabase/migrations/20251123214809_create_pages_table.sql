/*
  # Create pages table

  1. New Tables
    - `pages`
      - `id` (uuid, primary key)
      - `page_url` (text, unique) - URL path for the page (e.g., "/sports-trends")
      - `source` (text) - Data source filter for the page
      - `meta_title` (text) - SEO meta title
      - `meta_description` (text) - SEO meta description
      - `created_at` (timestamptz) - When the page was created
      - `updated_at` (timestamptz) - When the page was last updated
      - `user_id` (uuid) - Reference to the user who created the page

  2. Security
    - Enable RLS on `pages` table
    - Add policy for authenticated users to read all pages
    - Add policy for authenticated users to create pages
    - Add policy for authenticated users to update their own pages
    - Add policy for authenticated users to delete their own pages
*/

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'all',
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pages"
  ON pages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create pages"
  ON pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pages"
  ON pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pages"
  ON pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups by page_url
CREATE INDEX IF NOT EXISTS idx_pages_page_url ON pages(page_url);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);