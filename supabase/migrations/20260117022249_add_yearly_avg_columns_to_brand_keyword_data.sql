/*
  # Add Yearly Average Columns to Brand Keyword Data

  1. Changes
    - Add yearly average columns for years 2020-2026 to support dynamic year calculations
    - Each column stores the average monthly searches for that specific year
    - Uses numeric type to support decimal values from averaging

  2. Columns Added
    - `2020 Avg` (numeric) - Average monthly searches for 2020
    - `2021 Avg` (numeric) - Average monthly searches for 2021
    - `2022 Avg` (numeric) - Average monthly searches for 2022
    - `2023 Avg` (numeric) - Average monthly searches for 2023
    - `2024 Avg` (numeric) - Average monthly searches for 2024
    - `2025 Avg` (numeric) - Average monthly searches for 2025
    - `2026 Avg` (numeric) - Average monthly searches for 2026
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2020 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2020 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2021 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2021 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2022 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2022 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2023 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2023 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2024 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2024 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2025 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2025 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2026 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2026 Avg" numeric;
  END IF;
END $$;
