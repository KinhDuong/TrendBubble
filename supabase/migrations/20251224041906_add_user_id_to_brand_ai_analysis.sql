/*
  # Add user_id to brand_ai_analysis table

  1. Changes
    - Add `user_id` column to brand_ai_analysis table
    - Update unique constraint to be on (user_id, brand) instead of just brand
    - Update RLS policies to support user-specific AI analysis

  2. Migration Strategy
    - Add user_id column (nullable initially)
    - Drop old unique constraint on brand
    - Add new unique constraint on (user_id, brand)
    - Update indexes

  3. Notes
    - Each user can have their own AI analysis for the same brand
    - AI analysis is now scoped to user ownership
*/

-- Add user_id column
ALTER TABLE brand_ai_analysis ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old unique index on brand
DROP INDEX IF EXISTS brand_ai_analysis_brand_idx;

-- Create unique constraint on user_id + brand combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_ai_analysis_user_brand_key'
  ) THEN
    ALTER TABLE brand_ai_analysis ADD CONSTRAINT brand_ai_analysis_user_brand_key UNIQUE (user_id, brand);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS brand_ai_analysis_user_id_idx ON brand_ai_analysis(user_id);
CREATE INDEX IF NOT EXISTS brand_ai_analysis_brand_idx ON brand_ai_analysis(brand);
CREATE INDEX IF NOT EXISTS brand_ai_analysis_user_brand_idx ON brand_ai_analysis(user_id, brand);
