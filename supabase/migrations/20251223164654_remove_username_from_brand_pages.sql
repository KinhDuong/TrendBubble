/*
  # Remove username column from brand_pages table

  1. Changes
    - Remove `username` column from brand_pages (no longer needed for routing)
    - Drop username-related indexes
    - Keep user_id for ownership tracking
    - URLs will use user_id directly instead of username

  2. Notes
    - URL structure changes from /insights/:username/:brand to /insights/:userId/:brand
    - Simpler and more direct - no need to maintain separate usernames
    - All existing RLS policies based on user_id remain unchanged
*/

-- Drop the username-brand index
DROP INDEX IF EXISTS brand_pages_username_brand_idx;

-- Remove username column
ALTER TABLE brand_pages DROP COLUMN IF EXISTS username;

-- Make sure user_id is NOT NULL (it should be required)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_pages' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE brand_pages ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;