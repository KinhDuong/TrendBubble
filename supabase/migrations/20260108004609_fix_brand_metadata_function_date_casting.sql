/*
  # Fix Brand Metadata Function Date Casting

  1. Changes
    - Drop and recreate function with proper date casting
    - Ensure all date calculations return proper date type
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
  WITH brand_stats AS (
    SELECT 
      bkd.brand,
      COUNT(DISTINCT bkd.keyword) as kw_count,
      ROUND(AVG(COALESCE(bkd."Avg. monthly searches", 0))::numeric, 0) as avg_vol,
      (
        (CASE WHEN bkd."Searches: Dec 2021" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jan 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Feb 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Mar 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Apr 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: May 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jun 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jul 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Aug 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Sep 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Oct 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Nov 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Dec 2022" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jan 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Feb 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Mar 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Apr 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: May 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jun 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jul 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Aug 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Sep 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Oct 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Nov 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Dec 2023" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jan 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Feb 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Mar 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Apr 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: May 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jun 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jul 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Aug 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Sep 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Oct 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Nov 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Dec 2024" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jan 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Feb 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Mar 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Apr 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: May 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jun 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Jul 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Aug 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Sep 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Oct 2025" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN bkd."Searches: Nov 2025" IS NOT NULL THEN 1 ELSE 0 END)
      )::bigint as month_count
    FROM brand_keyword_data bkd
    WHERE bkd.user_id = p_user_id
    GROUP BY 
      bkd.brand,
      bkd."Searches: Dec 2021", bkd."Searches: Jan 2022", bkd."Searches: Feb 2022", bkd."Searches: Mar 2022",
      bkd."Searches: Apr 2022", bkd."Searches: May 2022", bkd."Searches: Jun 2022", bkd."Searches: Jul 2022",
      bkd."Searches: Aug 2022", bkd."Searches: Sep 2022", bkd."Searches: Oct 2022", bkd."Searches: Nov 2022",
      bkd."Searches: Dec 2022", bkd."Searches: Jan 2023", bkd."Searches: Feb 2023", bkd."Searches: Mar 2023",
      bkd."Searches: Apr 2023", bkd."Searches: May 2023", bkd."Searches: Jun 2023", bkd."Searches: Jul 2023",
      bkd."Searches: Aug 2023", bkd."Searches: Sep 2023", bkd."Searches: Oct 2023", bkd."Searches: Nov 2023",
      bkd."Searches: Dec 2023", bkd."Searches: Jan 2024", bkd."Searches: Feb 2024", bkd."Searches: Mar 2024",
      bkd."Searches: Apr 2024", bkd."Searches: May 2024", bkd."Searches: Jun 2024", bkd."Searches: Jul 2024",
      bkd."Searches: Aug 2024", bkd."Searches: Sep 2024", bkd."Searches: Oct 2024", bkd."Searches: Nov 2024",
      bkd."Searches: Dec 2024", bkd."Searches: Jan 2025", bkd."Searches: Feb 2025", bkd."Searches: Mar 2025",
      bkd."Searches: Apr 2025", bkd."Searches: May 2025", bkd."Searches: Jun 2025", bkd."Searches: Jul 2025",
      bkd."Searches: Aug 2025", bkd."Searches: Sep 2025", bkd."Searches: Oct 2025", bkd."Searches: Nov 2025"
  ),
  brand_aggregates AS (
    SELECT 
      bs.brand,
      MAX(bs.kw_count) as keyword_count,
      ROUND(AVG(bs.avg_vol), 0) as total_volume,
      MAX(bs.month_count)::bigint as available_months,
      CASE 
        WHEN MAX(bs.month_count) >= 48 THEN '2025-11-01'::date
        ELSE CURRENT_DATE::date
      END as latest_month,
      CASE 
        WHEN MAX(bs.month_count) >= 48 THEN '2021-12-01'::date
        ELSE (CURRENT_DATE - INTERVAL '1 year' * (MAX(bs.month_count) / 12.0))::date
      END as oldest_month,
      (MAX(bs.month_count) >= 24) as has_yoy_data
    FROM brand_stats bs
    GROUP BY bs.brand
  )
  SELECT 
    ba.brand::text,
    ba.keyword_count,
    ba.total_volume,
    ba.available_months,
    ba.latest_month,
    ba.oldest_month,
    ba.has_yoy_data
  FROM brand_aggregates ba
  ORDER BY ba.keyword_count DESC;
END;
$$;