/*
  # Add Note and Value columns to trending_topics table

  1. Changes
    - Add `note` column (text, nullable) - for additional notes/descriptions about the topic
    - Add `value` column (numeric, nullable) - for custom numeric values associated with the topic

  2. Notes
    - These columns are optional and will be populated from CSV uploads
    - Existing data will have NULL values for these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'note'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN note text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_topics' AND column_name = 'value'
  ) THEN
    ALTER TABLE trending_topics ADD COLUMN value numeric;
  END IF;
END $$;
