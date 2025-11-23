/*
  # Update Pages RLS for Public Access

  1. Changes
    - Drop the existing SELECT policy that only allows authenticated users
    - Create a new SELECT policy that allows anyone (including unauthenticated users) to read pages
  
  2. Security
    - Maintains restriction that only authenticated users can create, update, and delete pages
    - Opens up read access to all users so the Latest section is visible to everyone
*/

DROP POLICY IF EXISTS "Anyone can read pages" ON pages;

CREATE POLICY "Public can read pages"
  ON pages
  FOR SELECT
  TO anon, authenticated
  USING (true);