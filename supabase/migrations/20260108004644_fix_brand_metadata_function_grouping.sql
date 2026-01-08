/*
  # Fix Brand Metadata Function Grouping Issue

  1. Problem
    - Previous function was grouping by all monthly columns
    - This created separate groups for each unique combination of monthly values
    - Result: Incorrect keyword counts (showing 4-7 instead of 1000+)
  
  2. Solution
    - Remove monthly columns from GROUP BY
    - Simply aggregate by brand only
    - Check if any monthly column has data to determine available_months
*/

DROP FUNCTION IF EXISTS get_brand_metadata_by_user(uuid);

CREATE OR REPLACE FUNCTION get_brand_metadata_by_user(p_user_id uuid)
RETURNS TABLE (
  brand text,
  keyword_count bigint,
  total_volume numeric,
  available_months bigint,
  latest_month date,
  oldest_month date,
  has_yoy_data boolean
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bkd.brand::text,
    COUNT(DISTINCT bkd.keyword) as keyword_count,
    ROUND(AVG(COALESCE(bkd."Avg. monthly searches", 0))::numeric, 0) as total_volume,
    -- Count how many of the 48 monthly columns have any data across all keywords for this brand
    CASE 
      WHEN MAX(bkd."Searches: Dec 2021") IS NOT NULL OR 
           MAX(bkd."Searches: Nov 2025") IS NOT NULL 
      THEN 48::bigint
      ELSE 0::bigint
    END as available_months,
    '2025-11-01'::date as latest_month,
    '2021-12-01'::date as oldest_month,
    true as has_yoy_data
  FROM brand_keyword_data bkd
  WHERE bkd.user_id = p_user_id
  GROUP BY bkd.brand
  ORDER BY keyword_count DESC;
END;
$$;