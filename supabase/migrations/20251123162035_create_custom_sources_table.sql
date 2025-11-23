/*
  # Create custom sources table

  1. New Tables
    - `custom_sources`
      - `id` (uuid, primary key)
      - `value` (text, unique) - Internal identifier like 'twitter_trends'
      - `label` (text) - Display name like 'Twitter Trends'
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `custom_sources` table
    - Add policy for authenticated users to read all sources
    - Add policy for authenticated users to insert new sources
    
  3. Notes
    - Stores user-defined custom sources for trending topics
    - Sources persist across sessions
*/

CREATE TABLE IF NOT EXISTS custom_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text UNIQUE NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom sources"
  ON custom_sources
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert custom sources"
  ON custom_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
