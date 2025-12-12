/*
  # Add Cover Image Column to Pages Table

  1. Changes
    - Add `cover_image` column to `pages` table to store the URL of the page's cover image
    - Column is nullable to allow pages without cover images
    - Column type is TEXT to store image URLs or storage paths

  2. Notes
    - Existing pages will have NULL cover_image by default
    - Cover images will be stored in Supabase Storage
*/

-- Add cover_image column to pages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE pages ADD COLUMN cover_image TEXT;
  END IF;
END $$;