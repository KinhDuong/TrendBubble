/*
  # Create backups table

  1. New Tables
    - `backups`
      - `id` (uuid, primary key)
      - `name` (text) - descriptive name for the backup
      - `file_path` (text) - path of the backed up file
      - `content` (text) - the file content
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `backups` table
    - Add policy for public read access (no auth required for this demo)
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read backups"
  ON backups
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert backups"
  ON backups
  FOR INSERT
  WITH CHECK (true);