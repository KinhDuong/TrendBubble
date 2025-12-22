/*
  # Add AI Insights Column to Brand Keyword Data

  1. Changes
    - Add `ai_insights` column to `brand_keyword_data` table
      - Type: text (nullable)
      - Purpose: Store AI-generated insights about the keyword when categorizing
      - Example content: Analysis of growth patterns, competitive insights, recommendations
  
  2. Notes
    - Column is nullable to support existing data
    - Will be populated during AI categorization process
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'ai_insights'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN ai_insights text;
  END IF;
END $$;