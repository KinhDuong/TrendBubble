/*
  # Create user_favorites table

  1. New Tables
    - `user_favorites`
      - `id` (uuid, primary key) - Unique identifier for each favorite
      - `user_id` (uuid, foreign key) - References auth.users
      - `topic_name` (text) - Name of the favorited topic
      - `created_at` (timestamptz) - When the favorite was created

  2. Security
    - Enable RLS on `user_favorites` table
    - Add policy for authenticated users to read their own favorites
    - Add policy for authenticated users to insert their own favorites
    - Add policy for authenticated users to delete their own favorites

  3. Indexes
    - Add index on user_id for faster queries
    - Add unique constraint on (user_id, topic_name) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, topic_name)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
