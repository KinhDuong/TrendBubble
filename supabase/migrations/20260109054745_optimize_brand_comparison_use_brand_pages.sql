/*
  # Optimize Brand Comparison to Use brand_pages Data

  ## Overview
  Updates brand comparison to prioritize aggregated metrics from brand_pages
  instead of querying individual keywords, improving performance.

  ## Changes
  - Use yoy_change and three_month_change from brand_pages
  - Fallback to exact keyword match if brand_pages data not available
  - Maintains same return structure for frontend compatibility

  ## Impact
  - Faster query performance (one join instead of multiple subqueries)
  - More consistent with Brand Keyword Performance card
  - Uses pre-calculated metrics from upload time
*/

DROP FUNCTION IF EXISTS calculate_brand_comparison_stats(text[], uuid);

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
  SELECT json_agg(brand_stats)
  INTO result
  FROM (
    SELECT
      brand_agg.brand,
      brand_agg."brandSearchVolume",
      brand_agg."totalKeywords",
      brand_agg."totalVolume",
      -- Use brand_pages metrics first, fallback to exact keyword
      COALESCE(
        brand_agg.three_month_change,
        (SELECT "Three month change"::numeric
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "threeMonthChange",
      COALESCE(
        brand_agg.yoy_change,
        (SELECT "YoY change"::numeric
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "yoyChange",
      COALESCE(
        (SELECT sentiment
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "avgSentiment",
      COALESCE(
        (SELECT demand_score
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "avgDemandScore",
      COALESCE(
        (SELECT interest_score
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "avgInterestScore",
      -- Historical trend metrics from linear regression
      COALESCE(
        (SELECT avg_slope FROM calculate_brand_trend_metrics(brand_agg.brand, p_user_id)),
        0
      ) as "avgSlope",
      COALESCE(
        (SELECT avg_r_squared FROM calculate_brand_trend_metrics(brand_agg.brand, p_user_id)),
        0
      ) as "avgRSquared",
      COALESCE(
        (SELECT rising_stars_count FROM calculate_brand_trend_metrics(brand_agg.brand, p_user_id)),
        0
      ) as "risingStarsHistorical",
      brand_agg."topPerformers",
      brand_agg."risingStars",
      brand_agg."declining",
      brand_agg."stable",
      brand_agg."highIntent"
    FROM (
      SELECT
        bkd.brand,
        bp.avg_monthly_searches as "brandSearchVolume",
        bp.three_month_change,
        bp.yoy_change,
        COUNT(*) as "totalKeywords",
        COALESCE(SUM(bkd."Avg. monthly searches"), 0) as "totalVolume",
        COUNT(*) FILTER (
          WHERE bkd."Avg. monthly searches" > 1000
            AND bkd."Competition (indexed value)" IS NOT NULL
            AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
            AND bkd."Competition (indexed value)"::numeric < 0.5
        ) as "topPerformers",
        COUNT(*) FILTER (
          WHERE (
            bkd."Three month change" IS NOT NULL
            AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
            AND bkd."Three month change"::numeric > 0.2
          ) OR (
            bkd."YoY change" IS NOT NULL
            AND bkd."YoY change"::text ~ '^-?[0-9]+\.?[0-9]*$'
            AND bkd."YoY change"::numeric > 0.5
          )
        ) as "risingStars",
        COUNT(*) FILTER (
          WHERE bkd."Three month change" IS NOT NULL
            AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
            AND bkd."Three month change"::numeric < -0.1
        ) as "declining",
        COUNT(*) FILTER (
          WHERE bkd."Three month change" IS NOT NULL
            AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
            AND bkd."Three month change"::numeric >= -0.1
            AND bkd."Three month change"::numeric <= 0.1
        ) as "stable",
        COUNT(*) FILTER (
          WHERE bkd."Competition (indexed value)" IS NOT NULL
            AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
            AND bkd."Competition (indexed value)"::numeric > 0.7
        ) as "highIntent"
      FROM brand_keyword_data bkd
      LEFT JOIN brand_pages bp ON bp.brand = bkd.brand
        AND bp.user_id = p_user_id
      WHERE bkd.brand = ANY(brand_names)
        AND bkd.user_id = p_user_id
      GROUP BY bkd.brand, bp.avg_monthly_searches, bp.three_month_change, bp.yoy_change
    ) brand_agg
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;
