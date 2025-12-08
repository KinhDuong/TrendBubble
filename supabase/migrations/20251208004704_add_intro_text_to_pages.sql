/*
  # Add intro_text field to pages table

  1. Changes
    - Add `intro_text` column to `pages` table
      - Type: text (nullable)
      - Purpose: Custom introductory text to display above the ranking list
  
  2. Notes
    - This field is optional and can be used to provide custom context for each page
    - Will be displayed in the full ranking section below the title
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'intro_text'
  ) THEN
    ALTER TABLE pages ADD COLUMN intro_text text;
  END IF;
END $$;