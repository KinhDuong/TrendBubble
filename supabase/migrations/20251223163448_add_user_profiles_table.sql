/*
  # Create user profiles table with username

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - References auth.users(id)
      - `username` (text, unique) - Unique username for URL paths
      - `display_name` (text) - Optional display name
      - `created_at` (timestamptz) - When the profile was created
      - `updated_at` (timestamptz) - When the profile was last updated

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for users to read any profile (for public URLs)
    - Add policy for users to insert their own profile
    - Add policy for users to update their own profile

  3. Notes
    - Username must be unique and will be used in URL paths like /insights/:username/:brand
    - Username should be lowercase, alphanumeric with hyphens allowed
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9-]+$'),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (needed for public brand insight pages)
CREATE POLICY "Anyone can view user profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON user_profiles(username);
