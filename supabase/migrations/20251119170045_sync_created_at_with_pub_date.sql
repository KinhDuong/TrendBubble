/*
  # Sync created_at with pub_date for Started dates

  1. Updates
    - Set created_at to pub_date for all existing records where pub_date is not null
    - This ensures the "Started" date from the CSV is reflected in created_at
    
  2. Notes
    - This is a one-time sync for existing data
    - New records will have created_at set automatically to pub_date during insert
    - If pub_date is null, created_at will remain as-is (default to now())
*/

-- Update existing records where pub_date is set
UPDATE trending_topics
SET created_at = pub_date
WHERE pub_date IS NOT NULL;