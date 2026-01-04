/*
  # Add page_unique_id to brand_pages

  ## Overview
  Adds a globally unique identifier to brand_pages table while preserving the existing
  user-scoped page_id system. This provides flexibility for future features that require
  direct access without username context.

  ## Changes
  1. Schema Changes
    - Add `page_unique_id` column (uuid, globally unique, auto-generated)
    - Add unique constraint on page_unique_id
    - Backfill existing records with unique IDs

  ## Use Cases for page_unique_id
  - Direct sharing links: /brand/{page_unique_id}
  - API stable references
  - Cross-user comparisons
  - Public discovery without username
  - QR codes and offline sharing
  - Future analytics and tracking

  ## Dual Identifier System
  - page_id: User-friendly slug (can duplicate across users)
  - page_unique_id: System-generated global unique ID (never duplicates)

  ## Important Notes
  - Existing page_id behavior unchanged
  - Existing URLs continue to work
  - RLS policies unchanged
  - Column is NOT NULL after backfill
*/

-- Add page_unique_id column with default UUID generation
ALTER TABLE brand_pages 
ADD COLUMN IF NOT EXISTS page_unique_id uuid UNIQUE DEFAULT gen_random_uuid();

-- Ensure all existing records have a page_unique_id
UPDATE brand_pages 
SET page_unique_id = gen_random_uuid() 
WHERE page_unique_id IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE brand_pages 
ALTER COLUMN page_unique_id SET NOT NULL;

-- Add index for efficient lookups by page_unique_id
CREATE INDEX IF NOT EXISTS idx_brand_pages_page_unique_id 
ON brand_pages(page_unique_id);

-- Add comment for documentation
COMMENT ON COLUMN brand_pages.page_unique_id IS 
'Globally unique identifier for direct access. Used for sharing, APIs, and features that need brand page reference without username context. Immutable after creation.';
