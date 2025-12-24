/*
  # Add is_branded Column to Brand Keyword Data

  1. Changes
    - Add `is_branded` column to `brand_keyword_data` table
      - Type: text
      - Values: 'branded', 'non-branded', or null (not yet analyzed)
      - Nullable: true (default null for existing records)
    
  2. Purpose
    - Enable AI-powered classification of keywords as branded or non-branded
    - Support brand awareness analysis and advertising strategy insights
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'is_branded'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN is_branded text;
  END IF;
END $$;
