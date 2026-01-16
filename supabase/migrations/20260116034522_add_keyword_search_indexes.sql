/*
  # Add indexes for keyword search performance

  1. Indexes
    - Add GIN index on keyword column for fast ILIKE searches
    - Add composite index on (user_id, brand, keyword) for filtered searches
    - Add index on avg_monthly_searches for sorting popular keywords
  
  2. Purpose
    - Enable fast autocomplete search across millions of keywords
    - Optimize keyword comparison queries
    - Support efficient sorting by search volume
*/

-- Enable pg_trgm extension for trigram-based text search (supports ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index for keyword text search (enables fast ILIKE '%search%')
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_keyword_trgm 
  ON brand_keyword_data USING gin(keyword gin_trgm_ops);

-- Add index for brand text search
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_brand_trgm 
  ON brand_keyword_data USING gin(brand gin_trgm_ops);

-- Add composite index for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_search 
  ON brand_keyword_data(user_id, brand, "Avg. monthly searches" DESC NULLS LAST);

-- Add index for sorting by search volume
CREATE INDEX IF NOT EXISTS idx_brand_keyword_data_volume 
  ON brand_keyword_data("Avg. monthly searches" DESC NULLS LAST)
  WHERE "Avg. monthly searches" IS NOT NULL;
