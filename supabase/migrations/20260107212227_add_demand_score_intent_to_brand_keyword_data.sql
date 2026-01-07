/*
  # Add Demand Score and Intent Type to Brand Keyword Data

  ## Overview
  Adds columns to support the Keyword Demand Score algorithm that quantifies 
  action-oriented intent for individual keywords based on search metrics.

  ## New Columns
  - `demand_score` (decimal): Score from 0-50 quantifying keyword demand
    - 40-50: Very High Demand (prioritize for ads/content)
    - 30-39: Strong (good for growth)
    - 20-29: Moderate (nurture campaigns)
    - <20: Low (monitor/avoid)
  - `intent_type` (text): Search intent classification
    - Transactional: Ready to buy/act (10 points)
    - Commercial: Comparison/evaluation (7 points)
    - Informational: Learn/research (3 points)
    - Navigational: Find specific brand/site

  ## Calculation Factors
  The demand_score is calculated from 5 core metrics (0-10 points each):
  1. Monthly Search Volume (interest proxy)
  2. Trend Analysis (long-term demand via linear regression)
  3. Competition (demand accessibility - inverse scoring)
  4. Avg CPC (demand value from bid prices)
  5. Intent Type (demand readiness)

  Plus optional modifiers for recent momentum and seasonality.
*/

-- Add demand_score column with default NULL (will be calculated during upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'demand_score'
  ) THEN
    ALTER TABLE brand_keyword_data 
    ADD COLUMN demand_score DECIMAL(5,2) DEFAULT NULL;
    
    COMMENT ON COLUMN brand_keyword_data.demand_score IS 
    'Keyword demand score (0-50) based on search volume, trend, competition, CPC, and intent';
  END IF;
END $$;

-- Add intent_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = 'intent_type'
  ) THEN
    ALTER TABLE brand_keyword_data 
    ADD COLUMN intent_type TEXT DEFAULT NULL;
    
    COMMENT ON COLUMN brand_keyword_data.intent_type IS 
    'Search intent classification: Transactional, Commercial, Informational, or Navigational';
  END IF;
END $$;

-- Create index on demand_score for efficient sorting/filtering
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_demand_score 
ON brand_keyword_data(demand_score DESC);

-- Create index on intent_type for filtering
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_intent_type 
ON brand_keyword_data(intent_type);