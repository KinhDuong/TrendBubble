/*
  # Add Future Yearly Average Columns

  1. Changes
    - Add yearly average columns for years 2027-2030 for future data
    - Each column stores the average monthly searches for that specific year
    - Uses numeric type to support decimal values from averaging

  2. Columns Added
    - `2027 Avg` (numeric) - Average monthly searches for 2027
    - `2028 Avg` (numeric) - Average monthly searches for 2028
    - `2029 Avg` (numeric) - Average monthly searches for 2029
    - `2030 Avg` (numeric) - Average monthly searches for 2030
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2027 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2027 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2028 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2028 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2029 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2029 Avg" numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_keyword_data' AND column_name = '2030 Avg'
  ) THEN
    ALTER TABLE brand_keyword_data ADD COLUMN "2030 Avg" numeric;
  END IF;
END $$;
