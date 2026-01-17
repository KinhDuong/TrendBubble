/*
  # Add Yearly Averages Back to Brand Comparison

  ## Overview
  Re-adds yearly average columns (2020-2030) to the calculate_brand_comparison_stats function
  that were accidentally removed in the previous migration. These columns are required by the
  frontend to calculate Long Term Trend analysis.

  ## Problem
  - Previous migration removed yearlyAvg columns from function return
  - Frontend BrandComparisonTable needs these for calculateLongTermTrend()
  - Results in "Insufficient Data" even when data exists

  ## Solution
  - Add back all yearly average columns using representative_keyword
  - Query from the selected representative keyword data
  - Frontend can now properly analyze multi-year trends

  ## Impact
  - Long Term Trend will now display correct trend analysis
  - Uses representative keyword for consistent data source
  - Matches other metrics (CAGR, sentiment, demand/interest scores)
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
      brand_agg."cagr3Year",
      brand_agg."yearlyAvg2020",
      brand_agg."yearlyAvg2021",
      brand_agg."yearlyAvg2022",
      brand_agg."yearlyAvg2023",
      brand_agg."yearlyAvg2024",
      brand_agg."yearlyAvg2025",
      brand_agg."yearlyAvg2026",
      brand_agg."yearlyAvg2027",
      brand_agg."yearlyAvg2028",
      brand_agg."yearlyAvg2029",
      brand_agg."yearlyAvg2030"
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
        ) as "cagr3Year",
        -- Yearly averages from representative keyword
        COALESCE(
          (SELECT "2020 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2020",
        COALESCE(
          (SELECT "2021 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2021",
        COALESCE(
          (SELECT "2022 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2022",
        COALESCE(
          (SELECT "2023 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2023",
        COALESCE(
          (SELECT "2024 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2024",
        COALESCE(
          (SELECT "2025 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2025",
        COALESCE(
          (SELECT "2026 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2026",
        COALESCE(
          (SELECT "2027 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2027",
        COALESCE(
          (SELECT "2028 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2028",
        COALESCE(
          (SELECT "2029 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2029",
        COALESCE(
          (SELECT "2030 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(COALESCE(bp.representative_keyword, bkd.brand)))
           LIMIT 1),
          0
        ) as "yearlyAvg2030"
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