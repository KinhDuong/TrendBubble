/*
  # Fix Brand Comparison to Use Exact Brand Keyword Only

  ## Overview
  Changes brand comparison stats from averaging ALL keywords to showing stats
  for the ONE specific keyword that matches the brand name exactly.

  ## Changes
  - Filters to only the keyword row where keyword = brand name (case-insensitive)
  - Returns direct values instead of averages
  - Maintains same return structure for frontend compatibility
  - Still aggregates metadata like totalKeywords, totalVolume across all brand keywords

  ## Impact
  - Brand Compare "3-Month Change" and "YoY Change" will now match the Brand Keyword Performance card
  - Shows the exact brand keyword performance, not portfolio average
  - More consistent and meaningful metrics for brand comparison
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
      -- Get exact brand keyword stats (not averaged)
      COALESCE(
        (SELECT "Three month change"::numeric
         FROM brand_keyword_data
         WHERE brand = brand_agg.brand
           AND user_id = p_user_id
           AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
         LIMIT 1),
        0
      ) as "threeMonthChange",
      COALESCE(
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
        COALESCE(
          (SELECT avg_monthly_searches
           FROM brand_pages
           WHERE brand = bkd.brand
             AND (user_id = p_user_id OR is_public = true)
           ORDER BY (user_id = p_user_id) DESC
           LIMIT 1),
          0
        ) as "brandSearchVolume",
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
      WHERE bkd.brand = ANY(brand_names)
        AND bkd.user_id = p_user_id
      GROUP BY bkd.brand
    ) brand_agg
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;
