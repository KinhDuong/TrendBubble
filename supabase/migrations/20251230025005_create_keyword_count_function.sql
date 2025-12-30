/*
  # Create function to count keywords by brand
  
  1. New Function
    - `get_keyword_counts_by_brand` - Returns accurate keyword counts per brand for a user
    - Takes user_id as parameter
    - Returns brand name and keyword count
  
  2. Purpose
    - Fixes the limitation of client-side counting with query limits
    - Provides accurate counts regardless of data volume
    - Improves performance by doing aggregation at database level
*/

CREATE OR REPLACE FUNCTION get_keyword_counts_by_brand(p_user_id uuid)
RETURNS TABLE (
  brand text,
  keyword_count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    brand,
    COUNT(*)::bigint as keyword_count
  FROM brand_keyword_data
  WHERE user_id = p_user_id
  GROUP BY brand
  ORDER BY keyword_count DESC;
$$;
