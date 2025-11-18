/*
  # Create trending topics table

  1. New Tables
    - `trending_topics`
      - `id` (uuid, primary key) - Unique identifier for each topic
      - `name` (text) - Name of the trending topic
      - `search_volume` (bigint) - Numeric search volume
      - `search_volume_raw` (text) - Raw search volume with formatting (e.g., "10M+")
      - `rank` (integer) - Rank position of the topic
      - `created_at` (timestamptz) - Timestamp when the record was created
      - `updated_at` (timestamptz) - Timestamp when the record was last updated

  2. Security
    - Enable RLS on `trending_topics` table
    - Add policy for public read access (anyone can view trending topics)
    - Add policy for authenticated users to insert/update topics
*/

CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  search_volume bigint NOT NULL,
  search_volume_raw text NOT NULL,
  rank integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trending topics"
  ON trending_topics
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert trending topics"
  ON trending_topics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update trending topics"
  ON trending_topics
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete trending topics"
  ON trending_topics
  FOR DELETE
  USING (true);