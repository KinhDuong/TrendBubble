/*
  # Fix Brand Comparison to Use Representative Keyword

  ## Overview
  Updates the brand comparison function to use the representative_keyword from
  brand_pages table instead of requiring an exact match with the brand name.

  ## Problem
  - Brand name: "Chatime Canada"
  - Selected representative keyword: "Chatime"
  - Previous query: WHERE keyword = "Chatime Canada" (fails)
  - New query: WHERE keyword = "Chatime" (works)

  ## Changes
  - Use bp.representative_keyword when available
  - Fallback to brand name for backwards compatibility
  - Applies to all metric lookups: sentiment, demand_score, interest_score, CAGR

  ## Impact
  - Brands with representative keywords now correctly pull data from selected keyword
  - Existing brands without representative keywords continue to work
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
      brand_agg."threeMonthChange",
      brand_agg."yoyChange",
      brand_agg."avgSentiment",
      brand_agg."avgDemandScore",
      brand_agg."avgInterestScore",
      brand_agg."avgSlope",
      brand_agg."avgRSquared",
      brand_agg."risingStarsHistorical",
      brand_agg."topPerformers",
      brand_agg."risingStars",
      brand_agg."declining",
      brand_agg."stable",
      brand_agg."highIntent",
      brand_agg."cagr3Year"
    FROM (
      SELECT
        bkd.brand,
        bp.avg_monthly_searches as "brandSearchVolume",
        COUNT(*) as "totalKeywords",
        COALESCE(SUM(bkd."Avg. monthly searches"), 0) as "totalVolume",
        -- Use brand_pages metrics first, fallback to representative keyword data
        COALESCE(
          bp.three_month_change,
          (SELECT "Three month change"::numeric
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "threeMonthChange",
        COALESCE(
          bp.yoy_change,
          (SELECT "YoY change"::numeric
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yoyChange",
        COALESCE(
          (SELECT sentiment
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "avgSentiment",
        COALESCE(
          (SELECT demand_score
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "avgDemandScore",
        COALESCE(
          (SELECT interest_score
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "avgInterestScore",
        -- Historical trend metrics from linear regression
        COALESCE(
          (SELECT avg_slope FROM calculate_brand_trend_metrics(bkd.brand, p_user_id)),
          0
        ) as "avgSlope",
        COALESCE(
          (SELECT avg_r_squared FROM calculate_brand_trend_metrics(bkd.brand, p_user_id)),
          0
        ) as "avgRSquared",
        COALESCE(
          (SELECT rising_stars_count FROM calculate_brand_trend_metrics(bkd.brand, p_user_id)),
          0
        ) as "risingStarsHistorical",
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
        ) as "highIntent",
        -- Calculate 3-year CAGR dynamically using representative keyword
        COALESCE(
          (SELECT
            CASE
              WHEN ending_value > 0 AND beginning_value > 0 AND num_years = 2
              THEN POWER(ending_value / beginning_value, 1.0 / 2.0) - 1
              ELSE 0
            END
           FROM (
             SELECT
               CASE
                 WHEN "2030 Avg" > 0 AND "2028 Avg" > 0 THEN "2030 Avg"
                 WHEN "2029 Avg" > 0 AND "2027 Avg" > 0 THEN "2029 Avg"
                 WHEN "2028 Avg" > 0 AND "2026 Avg" > 0 THEN "2028 Avg"
                 WHEN "2027 Avg" > 0 AND "2025 Avg" > 0 THEN "2027 Avg"
                 WHEN "2026 Avg" > 0 AND "2024 Avg" > 0 THEN "2026 Avg"
                 WHEN "2025 Avg" > 0 AND "2023 Avg" > 0 THEN "2025 Avg"
                 WHEN "2024 Avg" > 0 AND "2022 Avg" > 0 THEN "2024 Avg"
                 WHEN "2023 Avg" > 0 AND "2021 Avg" > 0 THEN "2023 Avg"
                 WHEN "2022 Avg" > 0 AND "2020 Avg" > 0 THEN "2022 Avg"
                 ELSE 0
               END as ending_value,
               CASE
                 WHEN "2030 Avg" > 0 AND "2028 Avg" > 0 THEN "2028 Avg"
                 WHEN "2029 Avg" > 0 AND "2027 Avg" > 0 THEN "2027 Avg"
                 WHEN "2028 Avg" > 0 AND "2026 Avg" > 0 THEN "2026 Avg"
                 WHEN "2027 Avg" > 0 AND "2025 Avg" > 0 THEN "2025 Avg"
                 WHEN "2026 Avg" > 0 AND "2024 Avg" > 0 THEN "2024 Avg"
                 WHEN "2025 Avg" > 0 AND "2023 Avg" > 0 THEN "2023 Avg"
                 WHEN "2024 Avg" > 0 AND "2022 Avg" > 0 THEN "2022 Avg"
                 WHEN "2023 Avg" > 0 AND "2021 Avg" > 0 THEN "2021 Avg"
                 WHEN "2022 Avg" > 0 AND "2020 Avg" > 0 THEN "2020 Avg"
                 ELSE 0
               END as beginning_value,
               2 as num_years
             FROM brand_keyword_data
             WHERE brand = bkd.brand
               AND user_id = p_user_id
               AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
             LIMIT 1
           ) year_data
           LIMIT 1),
          0
        ) as "cagr3Year"
      FROM brand_keyword_data bkd
      LEFT JOIN brand_pages bp ON bp.brand = bkd.brand
        AND bp.user_id = p_user_id
      WHERE bkd.brand = ANY(brand_names)
        AND bkd.user_id = p_user_id
      GROUP BY bkd.brand, bp.avg_monthly_searches, bp.three_month_change, bp.yoy_change, bp.representative_keyword
    ) brand_agg
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;