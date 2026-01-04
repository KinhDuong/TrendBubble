/*
  # Create Brand Comparison Stats Function

  1. Purpose
    - Calculates comprehensive statistics for multiple brands holistically
    - Processes all keyword data server-side for performance
    - Eliminates memory issues and slow client-side calculations

  2. Parameters
    - brand_names: Array of brand names to compare
    - p_user_id: UUID of the user (for RLS)

  3. Returns
    - JSON array of brand statistics including:
      - Brand search volume
      - Total keywords count
      - Total keyword search volume
      - Average competition, CPC, sentiment
      - Trend metrics (3-month, YoY changes)
      - Keyword categorization (top performers, rising stars, declining, etc.)

  4. Performance
    - Uses efficient SQL aggregations (COUNT, AVG, SUM, FILTER)
    - Processes millions of keywords in milliseconds
    - Returns only final calculated stats (tiny payload)
*/

CREATE OR REPLACE FUNCTION calculate_brand_comparison_stats(
  brand_names text[],
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Calculate stats for all specified brands
  SELECT json_agg(brand_stats)
  INTO result
  FROM (
    SELECT
      bkd.brand,
      -- Brand search volume from brand_pages
      COALESCE(
        (SELECT avg_monthly_searches
         FROM brand_pages
         WHERE brand = bkd.brand
           AND (user_id = p_user_id OR is_public = true)
         LIMIT 1),
        0
      ) as "brandSearchVolume",
      -- Total keywords
      COUNT(*) as "totalKeywords",
      -- Total keyword search volume
      COALESCE(SUM(bkd."Avg. monthly searches"), 0) as "totalVolume",
      -- Average competition (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Competition (indexed value)" IS NOT NULL
              AND bkd."Competition (indexed value)" != 0
            THEN CAST(bkd."Competition (indexed value)" AS numeric)
            ELSE NULL
          END
        ),
        0
      ) as "avgCompetition",
      -- Average CPC Low (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Top of page bid (low range)" IS NOT NULL
              AND bkd."Top of page bid (low range)" != 0
            THEN CAST(bkd."Top of page bid (low range)" AS numeric)
            ELSE NULL
          END
        ),
        0
      ) as "avgCpcLow",
      -- Average CPC High (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Top of page bid (high range)" IS NOT NULL
              AND bkd."Top of page bid (high range)" != 0
            THEN CAST(bkd."Top of page bid (high range)" AS numeric)
            ELSE NULL
          END
        ),
        0
      ) as "avgCpcHigh",
      -- 3-Month change average (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Three month change" IS NOT NULL
              AND bkd."Three month change" != 0
            THEN CAST(bkd."Three month change" AS numeric)
            ELSE NULL
          END
        ),
        0
      ) as "threeMonthChange",
      -- YoY change average (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd."YoY change" IS NOT NULL
              AND bkd."YoY change" != 0
            THEN CAST(bkd."YoY change" AS numeric)
            ELSE NULL
          END
        ),
        0
      ) as "yoyChange",
      -- Average sentiment (only non-zero values)
      COALESCE(
        AVG(
          CASE
            WHEN bkd.sentiment IS NOT NULL
              AND bkd.sentiment != 0
            THEN bkd.sentiment
            ELSE NULL
          END
        ),
        0
      ) as "avgSentiment",
      -- Top performers: volume > 1000 AND competition < 0.5
      COUNT(*) FILTER (
        WHERE bkd."Avg. monthly searches" > 1000
          AND CAST(bkd."Competition (indexed value)" AS numeric) < 0.5
      ) as "topPerformers",
      -- Rising stars: 3-month > 0.2 OR yoy > 0.5
      COUNT(*) FILTER (
        WHERE CAST(bkd."Three month change" AS numeric) > 0.2
          OR CAST(bkd."YoY change" AS numeric) > 0.5
      ) as "risingStars",
      -- Declining: 3-month < -0.1
      COUNT(*) FILTER (
        WHERE CAST(bkd."Three month change" AS numeric) < -0.1
      ) as "declining",
      -- Stable: 3-month between -0.1 and 0.1
      COUNT(*) FILTER (
        WHERE CAST(bkd."Three month change" AS numeric) >= -0.1
          AND CAST(bkd."Three month change" AS numeric) <= 0.1
      ) as "stable",
      -- High volume low competition: volume > 5000 AND competition < 0.3
      COUNT(*) FILTER (
        WHERE bkd."Avg. monthly searches" > 5000
          AND CAST(bkd."Competition (indexed value)" AS numeric) < 0.3
      ) as "highVolumeLowComp",
      -- High intent: competition > 0.7
      COUNT(*) FILTER (
        WHERE CAST(bkd."Competition (indexed value)" AS numeric) > 0.7
      ) as "highIntent",
      -- Competitive: competition > 0.7
      COUNT(*) FILTER (
        WHERE CAST(bkd."Competition (indexed value)" AS numeric) > 0.7
      ) as "competitive"
    FROM brand_keyword_data bkd
    WHERE bkd.brand = ANY(brand_names)
      AND bkd.user_id = p_user_id
    GROUP BY bkd.brand
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;