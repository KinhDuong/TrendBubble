/*
  # Remove source check constraint

  1. Changes
    - Drop the check constraint on trending_topics.source column
    - This allows custom source values beyond just 'google_trends' and 'user_upload'
  
  2. Notes
    - Users can now add custom sources like 'richest_people', 'twitter_trends', etc.
    - The source column remains NOT NULL but accepts any text value
*/

ALTER TABLE trending_topics DROP CONSTRAINT IF EXISTS trending_topics_source_check;
