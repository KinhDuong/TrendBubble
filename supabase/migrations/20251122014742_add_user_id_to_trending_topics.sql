/*
  # Add user_id column to trending_topics table

  1. Changes
    - Add `user_id` column to `trending_topics` table
      - Type: uuid (references auth.users)
      - Nullable: yes (for shared/public data)
      - Foreign key constraint to auth.users(id)
    - Add index on user_id column for better query performance
    - Update RLS policies to allow users to manage their own data
  
  2. Purpose
    - Enable user-specific topic collections
    - Support filtering by user_id for personalized views
    - Allow users to create custom trending topic lists
  
  3. Security
    - Users can read all public data (user_id IS NULL) and their own data
    - Users can only insert/update/delete their own data
*/

-- Add user_id column (nullable for public/shared data)
ALTER TABLE trending_topics 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for better query performance when filtering by user_id
CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id ON trending_topics(user_id);

-- Add comment to document the column
COMMENT ON COLUMN trending_topics.user_id IS 'User who created this topic. NULL means public/shared data.';

-- Update RLS policies for user-specific data
-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for all users" ON trending_topics;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON trending_topics;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON trending_topics;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON trending_topics;

-- Create new policies
CREATE POLICY "Users can view public and own data"
  ON trending_topics FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own data"
  ON trending_topics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own data"
  ON trending_topics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own data"
  ON trending_topics FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());