/*
  # Update Tier 4 to Unlimited Keywords

  1. Changes
    - Update `get_keyword_limit()` function to return -1 (unlimited) for Tier 4
    - Tier 4 (Premium) now has unlimited keywords like Tier 5
    - Tier 5 remains admin-only with unlimited keywords

  2. Updated Tier Structure
    - Tier 1 (Free): 200 keywords
    - Tier 2 (Basic): 500 keywords
    - Tier 3 (Pro): 1,000 keywords
    - Tier 4 (Premium): Unlimited (represented as -1)
    - Tier 5 (Enterprise/Admin): Unlimited (represented as -1)

  3. Notes
    - Tier 4 users get unlimited keywords but do NOT get admin privileges
    - Admin privileges are still controlled by the admin_users table
*/

-- Update the get_keyword_limit function to make Tier 4 unlimited
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
    WHEN 4 THEN RETURN -1; -- -1 represents unlimited (was 10000)
    WHEN 5 THEN RETURN -1; -- -1 represents unlimited
    ELSE RETURN 200; -- Default to tier 1 if invalid
  END CASE;
END;
$$;

-- Update the column comment to reflect the new structure
COMMENT ON COLUMN user_profiles.membership_tier IS 'User membership tier (1=Free/200, 2=Basic/500, 3=Pro/1000, 4=Premium/Unlimited, 5=Enterprise/Unlimited+Admin)';
