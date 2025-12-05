/*
  # Add FAQ column to pages table

  1. Changes
    - Add `faq` column to `pages` table to store rich text FAQ content
    - This replaces the individual FAQ items approach with a simpler single field

  2. Notes
    - The existing `faqs` table remains for now but can be deprecated
    - FAQ content will be stored as HTML text, similar to the summary field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'faq'
  ) THEN
    ALTER TABLE pages ADD COLUMN faq text;
  END IF;
END $$;