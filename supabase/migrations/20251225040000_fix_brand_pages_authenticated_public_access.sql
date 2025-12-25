/*
  # Fix Brand Pages Public Access for Authenticated Users

  1. Changes
    - Drop the restrictive "Users can view own brand pages" policy
    - Update the public viewing policy to work for both authenticated and anonymous users
    - This allows authenticated users to view public brand pages from other users

  2. Security
    - Authenticated users can view their own brand pages OR any public brand pages
    - Anonymous users can only view public brand pages
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own brand pages" ON brand_pages;

-- Drop the old public policy
DROP POLICY IF EXISTS "Anyone can view public brand pages" ON brand_pages;

-- Create a new comprehensive SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view public or own brand pages"
  ON brand_pages
  FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

-- Create a policy for anonymous users to view public pages
CREATE POLICY "Anonymous users can view public brand pages"
  ON brand_pages
  FOR SELECT
  TO anon
  USING (is_public = true);