/*
  # Add crypto timeframe data columns

  ## Overview
  Adds columns to store cryptocurrency percentage changes across multiple timeframes (1h, 24h, 7d, 30d, 1y) to support timeframe filtering on the crypto page.

  ## Changes
  
  1. New Columns
    - `crypto_data` (jsonb) - Stores all crypto-specific data including:
      - change_1h: 1-hour percentage change
      - change_24h: 24-hour percentage change  
      - change_7d: 7-day percentage change
      - change_30d: 30-day percentage change
      - change_1y: 1-year percentage change
      - current_price: Current price in USD
      - volume_24h: 24-hour trading volume
    
  ## Notes
  - Using JSONB for flexibility and efficient querying
  - Only applies to crypto records (source = 'coingecko_crypto')
  - Allows easy addition of new metrics without schema changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'crypto_data'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN crypto_data jsonb;
  END IF;
END $$;