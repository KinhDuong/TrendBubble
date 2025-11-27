/*
  # Add template field to pages table

  1. Changes
    - Add `template` (text) column to `pages` table
      - Stores the template type (e.g., 'google_trends', 'dynamic_page', 'crypto')
      - Defaults to 'dynamic_page'
      - NOT NULL constraint

  2. Notes
    - This field identifies which template/layout the page uses
    - Helps admins understand the page structure at a glance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'template'
  ) THEN
    ALTER TABLE pages ADD COLUMN template text NOT NULL DEFAULT 'dynamic_page';
  END IF;
END $$;