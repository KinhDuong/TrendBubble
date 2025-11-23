/*
  # Create custom categories table

  1. New Tables
    - `custom_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name like 'Politics', 'Sports'
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `custom_categories` table
    - Add policy for anyone to read all categories
    - Add policy for authenticated users to insert new categories
    
  3. Notes
    - Stores user-defined custom categories for trending topics
    - Categories persist across sessions
*/

CREATE TABLE IF NOT EXISTS custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom categories"
  ON custom_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert custom categories"
  ON custom_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
