/*
  # Add AI Category Column to Brand Keyword Data

  1. Changes
    - Add `ai_category` column to `brand_keyword_data` table
    - This column will store AI-generated growth categories separate from human-defined categories
    - Allows comparison between AI analysis and manual categorization
  
  2. Details
    - Column is nullable to allow gradual AI analysis
    - Text type to support flexible category naming by AI
    - Can be regenerated on-demand via admin interface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'ai_category'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN ai_category text;
  END IF;
END $$;