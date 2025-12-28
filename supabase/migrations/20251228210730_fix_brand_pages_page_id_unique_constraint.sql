/*
  # Fix brand_pages page_id unique constraint
  
  1. Changes
    - Drop unique index on `page_id` alone
    - Create unique constraint on `(user_id, page_id)` combination
    
  2. Explanation
    - Currently, `page_id` is globally unique, preventing multiple users from having the same brand name
    - This change allows different users to upload data for the same brand (e.g., "Starbucks")
    - Each user gets their own unique page_id scoped to their account
    
  3. Notes
    - The combination of `(user_id, page_id)` ensures uniqueness per user
    - URL structure remains /insights/:username/:page_id/
*/

-- Drop the existing unique index on page_id
DROP INDEX IF EXISTS brand_pages_page_id_key;

-- Create a unique constraint on (user_id, page_id) combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_pages_user_page_id_key'
  ) THEN
    ALTER TABLE brand_pages ADD CONSTRAINT brand_pages_user_page_id_key UNIQUE (user_id, page_id);
  END IF;
END $$;

-- Create an index to improve query performance when looking up by user_id and page_id
CREATE INDEX IF NOT EXISTS brand_pages_user_page_id_idx ON brand_pages(user_id, page_id);