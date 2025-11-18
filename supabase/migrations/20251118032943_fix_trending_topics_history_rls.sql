/*
  # Fix RLS Policy for Trending Topics History

  1. Changes
    - Add INSERT policy to allow public inserts to trending_topics_history table
    - This allows CSV uploads and other client-side operations to write historical data
  
  2. Security Notes
    - While this allows public inserts, the data is append-only historical records
    - Historical data is useful for tracking topic trends over time
    - Original restrictive design assumed only backend writes, but CSV upload requires client writes
*/

CREATE POLICY "Anyone can insert trending topics history"
  ON trending_topics_history
  FOR INSERT
  TO public
  WITH CHECK (true);