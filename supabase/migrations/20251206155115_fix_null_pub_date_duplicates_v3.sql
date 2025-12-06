/*
  # Fix NULL pub_date duplicates (v3)

  1. Changes
    - Delete records with NULL pub_date that would create duplicates
    - Set pub_date to created_at for remaining records where pub_date is NULL
    - Make pub_date NOT NULL to prevent future NULL values
    
  2. Important Notes
    - First removes records with NULL pub_date if a record exists with the same name, source, and date
    - Then updates remaining NULL pub_date records to use created_at
    - After this migration, pub_date will be required
*/

-- Step 1: Delete records with NULL pub_date where a duplicate would exist
DELETE FROM trending_topics t1
WHERE t1.pub_date IS NULL
  AND EXISTS (
    SELECT 1 FROM trending_topics t2
    WHERE LOWER(TRIM(t1.name)) = LOWER(TRIM(t2.name))
      AND t1.source = t2.source
      AND timestamptz_to_date(t1.created_at) = timestamptz_to_date(t2.pub_date)
      AND t2.pub_date IS NOT NULL
  );

-- Step 2: Delete remaining duplicates with NULL pub_date, keeping only the most recent
DELETE FROM trending_topics t1
USING trending_topics t2
WHERE t1.id < t2.id
  AND LOWER(TRIM(t1.name)) = LOWER(TRIM(t2.name))
  AND t1.source = t2.source
  AND t1.pub_date IS NULL
  AND t2.pub_date IS NULL;

-- Step 3: Set pub_date to created_at for records where pub_date is NULL
UPDATE trending_topics
SET pub_date = created_at
WHERE pub_date IS NULL;

-- Step 4: Make pub_date NOT NULL to prevent future NULL values
ALTER TABLE trending_topics
ALTER COLUMN pub_date SET NOT NULL;

-- Step 5: Set default value for pub_date
ALTER TABLE trending_topics
ALTER COLUMN pub_date SET DEFAULT now();
