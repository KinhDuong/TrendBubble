/*
  # Create user preferences table

  1. New Tables
    - `user_preferences`
      - `id` (integer, primary key) - Simple single-row table for storing app preferences
      - `theme` (text) - Theme preference ('dark' or 'light')
      - `created_at` (timestamptz) - When the preference was first created
      - `updated_at` (timestamptz) - When the preference was last updated

  2. Security
    - Enable RLS on `user_preferences` table
    - Add policy to allow anyone to read preferences (public app settings)
    - Add policy to allow anyone to insert/update preferences (public app settings)

  3. Notes
    - This is a single-row table (id=1) for storing global app preferences
    - In a production app with user authentication, this would be per-user
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id integer PRIMARY KEY DEFAULT 1,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_single_row ON user_preferences (id);

-- Add constraint to ensure id is always 1
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_id_check CHECK (id = 1);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read preferences (public app)
CREATE POLICY "Anyone can read preferences"
  ON user_preferences
  FOR SELECT
  USING (true);

-- Allow anyone to insert preferences (public app)
CREATE POLICY "Anyone can insert preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (id = 1);

-- Allow anyone to update preferences (public app)
CREATE POLICY "Anyone can update preferences"
  ON user_preferences
  FOR UPDATE
  USING (id = 1)
  WITH CHECK (id = 1);

-- Insert default row
INSERT INTO user_preferences (id, theme)
VALUES (1, 'dark')
ON CONFLICT (id) DO NOTHING;
