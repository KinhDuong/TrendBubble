/*
  # Add summary field to pages table

  1. Changes
    - Add `summary` (text) column to `pages` table
      - Rich text content that can be displayed on the page
      - Optional field, can be null

  2. Notes
    - This field will be used to add additional descriptive content to pages
    - Can store HTML or markdown formatted text for rich content display
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'summary'
  ) THEN
    ALTER TABLE pages ADD COLUMN summary text;
  END IF;
END $$;