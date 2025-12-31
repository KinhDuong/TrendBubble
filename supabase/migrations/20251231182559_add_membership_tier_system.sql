/*
  # Add Membership Tier System

  1. Changes to user_profiles table
    - Add `membership_tier` column (integer, 1-5)
    - Default to tier 1 (free tier with 200 keyword limit)
    - Add check constraint to ensure valid tier values

  2. Helper Functions
    - `get_keyword_limit(tier integer)` - Returns keyword limit for a given tier
    - `get_user_tier(user_uuid uuid)` - Returns the tier for a specific user

  3. Data Migration
    - Set all existing admin users to tier 5 (unlimited)
    - All other users default to tier 1

  4. Tier Structure
    - Tier 1 (Free): 200 keywords
    - Tier 2 (Basic): 500 keywords
    - Tier 3 (Pro): 1,000 keywords
    - Tier 4 (Premium): 10,000 keywords
    - Tier 5 (Enterprise/Admin): Unlimited (represented as -1 in function)
*/

-- Add membership_tier column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'membership_tier'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN membership_tier integer DEFAULT 1 NOT NULL;
    
    -- Add check constraint to ensure valid tier values (1-5)
    ALTER TABLE user_profiles
    ADD CONSTRAINT valid_membership_tier CHECK (membership_tier >= 1 AND membership_tier <= 5);
  END IF;
END $$;

-- Create helper function to get keyword limit based on tier
CREATE OR REPLACE FUNCTION get_keyword_limit(tier integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE tier
    WHEN 1 THEN RETURN 200;
    WHEN 2 THEN RETURN 500;
    WHEN 3 THEN RETURN 1000;
    WHEN 4 THEN RETURN 10000;
    WHEN 5 THEN RETURN -1; -- -1 represents unlimited
    ELSE RETURN 200; -- Default to tier 1 if invalid
  END CASE;
END;
$$;

-- Create helper function to get user's tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_tier integer;
BEGIN
  SELECT membership_tier INTO user_tier
  FROM user_profiles
  WHERE id = user_uuid;
  
  -- If user not found, return tier 1 (default)
  IF user_tier IS NULL THEN
    RETURN 1;
  END IF;
  
  RETURN user_tier;
END;
$$;

-- Update existing admin users to tier 5
UPDATE user_profiles
SET membership_tier = 5
WHERE id IN (SELECT id FROM admin_users);

-- Add comment to the column for documentation
COMMENT ON COLUMN user_profiles.membership_tier IS 'User membership tier (1=Free/200, 2=Basic/500, 3=Pro/1000, 4=Premium/10000, 5=Enterprise/Unlimited)';
