/*
  # Add display_section to pages table

  1. Changes
    - Add `display_section` column to pages table
      - Possible values: 'hero', 'top', 'featured', 'popular', or NULL
      - Determines where the page appears on the Explore page
      - Hero: Large box in TOP section
      - Top: Two boxes under the hero box
      - Featured/Popular: Sidebar section
      - NULL: Only appears in LATEST section

  2. Notes
    - This allows admins to feature specific pages in different sections
    - Pages can be promoted to featured positions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'display_section'
  ) THEN
    ALTER TABLE pages ADD COLUMN display_section text;
  END IF;
END $$;

-- Add check constraint to ensure valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'pages_display_section_check'
  ) THEN
    ALTER TABLE pages ADD CONSTRAINT pages_display_section_check
      CHECK (display_section IN ('hero', 'top', 'featured', 'popular'));
  END IF;
END $$;

-- Create index for faster filtering by display_section
CREATE INDEX IF NOT EXISTS idx_pages_display_section ON pages(display_section) WHERE display_section IS NOT NULL;