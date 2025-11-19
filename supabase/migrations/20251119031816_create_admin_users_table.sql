/*
  # Create admin users table

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key) - References auth.users
      - `email` (text) - Admin email address
      - `created_at` (timestamptz) - Timestamp when admin was created

  2. Security
    - Enable RLS on `admin_users` table
    - Add policy for authenticated users to read their own admin status
    - Only admins listed in this table can access admin functions

  3. Important Notes
    - This table acts as a whitelist for admin users
    - Users must first sign up via Supabase Auth, then be added to this table
    - The table references auth.users to ensure user exists
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check their own admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Update RLS policies for trending_topics to require admin access
DROP POLICY IF EXISTS "Anyone can insert trending topics" ON trending_topics;
DROP POLICY IF EXISTS "Anyone can update trending topics" ON trending_topics;
DROP POLICY IF EXISTS "Anyone can delete trending topics" ON trending_topics;

CREATE POLICY "Only admins can insert trending topics"
  ON trending_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update trending topics"
  ON trending_topics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete trending topics"
  ON trending_topics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Update RLS policies for backups to require admin access
DROP POLICY IF EXISTS "Anyone can read backups" ON backups;
DROP POLICY IF EXISTS "Anyone can insert backups" ON backups;
DROP POLICY IF EXISTS "Anyone can delete backups" ON backups;

CREATE POLICY "Only admins can read backups"
  ON backups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert backups"
  ON backups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete backups"
  ON backups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );