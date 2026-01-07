/*
  # Add Interest Score to Brand Keyword Data

  ## Overview
  Adds the Interest Score column to track awareness, curiosity, and cultural buzz 
  potential for keywords. This complements the Demand Score by focusing on 
  top/middle-funnel metrics rather than conversion readiness.

  ## New Column
  - `interest_score` (decimal): Score from 0-50 quantifying keyword interest
    - 40-50: Very High Interest (cultural buzz, trending)
    - 30-39: Strong Interest (build authority)
    - 20-29: Moderate (emerging curiosity)
    - <20: Low (limited awareness)

  ## Scoring Factors (vs Demand Score)
  Interest prioritizes:
  - General curiosity and awareness
  - Informational/commercial investigation intent
  - Moderate CPC ($1-$3 optimal)
  - Low competition (easier to capture attention)
  - Rising trends (cultural momentum)
*/

-- Add interest_score column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'interest_score'
  ) THEN
    ALTER TABLE brand_keyword_data 
    ADD COLUMN interest_score DECIMAL(5,2) DEFAULT NULL;
    
    COMMENT ON COLUMN brand_keyword_data.interest_score IS 
    'Keyword interest score (0-50) based on awareness, curiosity, and cultural buzz potential';
  END IF;
END $$;

-- Create index on interest_score for efficient sorting/filtering
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_interest_score 
ON brand_keyword_data(interest_score DESC);