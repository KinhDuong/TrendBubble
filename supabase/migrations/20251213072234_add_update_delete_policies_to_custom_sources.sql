/*
  # Add UPDATE and DELETE policies to custom_sources table

  1. Changes
    - Add policy for authenticated users to update sources
    - Add policy for authenticated users to delete sources
  
  2. Security
    - Only authenticated users can modify or delete sources
    - Maintains data integrity while allowing admin management
*/

CREATE POLICY "Authenticated users can update custom sources"
  ON custom_sources
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete custom sources"
  ON custom_sources
  FOR DELETE
  TO authenticated
  USING (true);
