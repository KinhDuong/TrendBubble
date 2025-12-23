/*
  # Add Sentiment Column to Brand Keyword Data

  1. Changes
    - Add `sentiment` column to `brand_keyword_data` table
      - Type: numeric (nullable)
      - Range: -1.0 (most negative) to 1.0 (most positive), 0 = neutral
      - Purpose: Store AI-generated sentiment analysis of keywords
      - Display: Will be shown as percentage (0% to 100%)
  
  2. Notes
    - Column is nullable to support existing data
    - Will be populated during AI sentiment analysis process
    - Conversion formula: percentage = (sentiment + 1) / 2 * 100
      - -1.0 → 0% (most negative)
      - 0 → 50% (neutral)
      - 1.0 → 100% (most positive)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN sentiment numeric;
  END IF;
END $$;