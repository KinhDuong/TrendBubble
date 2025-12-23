/*
  # Update brand_pages for username-based paths and private ownership

  1. Changes
    - Add `user_id` column to track ownership
    - Add `username` column for URL path construction
    - Remove unique constraint on `brand` (multiple users can have same brand)
    - Add unique constraint on (user_id, brand) combination
    - Update RLS policies to make pages private to owner only

  2. Security Changes
    - DROP all existing public policies
    - Add policy for users to read ONLY their own brand pages
    - Add policy for users to insert their own brand pages
    - Add policy for users to update their own brand pages
    - Add policy for users to delete their own brand pages

  3. Notes
    - URL structure changes from /insights/:brand to /insights/:username/:brand
    - Each user can have their own data for the same brand name
    - Brand pages are now completely private - only visible to the owner
*/

-- Add new columns
ALTER TABLE brand_pages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE brand_pages ADD COLUMN IF NOT EXISTS username text NOT NULL DEFAULT '';

-- Drop old unique constraint on brand
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_pages_brand_key'
  ) THEN
    ALTER TABLE brand_pages DROP CONSTRAINT brand_pages_brand_key;
  END IF;
END $$;

-- Add unique constraint on user_id + brand combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_pages_user_brand_key'
  ) THEN
    ALTER TABLE brand_pages ADD CONSTRAINT brand_pages_user_brand_key UNIQUE (user_id, brand);
  END IF;
END $$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Authenticated users can insert brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Authenticated users can update brand pages" ON brand_pages;
DROP POLICY IF EXISTS "Authenticated users can delete brand pages" ON brand_pages;

-- Create new private policies
CREATE POLICY "Users can view own brand pages"
  ON brand_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand pages"
  ON brand_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand pages"
  ON brand_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand pages"
  ON brand_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS brand_pages_user_id_idx ON brand_pages(user_id);
CREATE INDEX IF NOT EXISTS brand_pages_username_brand_idx ON brand_pages(username, brand);
