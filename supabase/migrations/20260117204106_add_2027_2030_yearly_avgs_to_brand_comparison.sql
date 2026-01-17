/*
  # Add 2027-2030 Yearly Averages to Brand Comparison

  ## Overview
  Updates the calculate_brand_comparison_stats function to return yearly average
  columns for 2027-2030 in addition to existing 2020-2026 columns.

  ## Changes
  - Add yearlyAvg2027, yearlyAvg2028, yearlyAvg2029, yearlyAvg2030 to function output
  - Enables dynamic year support for future data
  - Allows Long-Term Trend calculation to use all available years automatically

  ## Usage
  Frontend can now calculate trends using any years from 2020-2030 that have data,
  making the system future-proof and adaptable.
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
        -- Use brand_pages metrics first, fallback to exact keyword
        COALESCE(
          bp.three_month_change,
          (SELECT "Three month change"::numeric
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "threeMonthChange",
        COALESCE(
          bp.yoy_change,
          (SELECT "YoY change"::numeric
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yoyChange",
        COALESCE(
          (SELECT sentiment
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "avgSentiment",
        COALESCE(
          (SELECT demand_score
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "avgDemandScore",
        COALESCE(
          (SELECT interest_score
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
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
        -- Calculate 3-year CAGR from yearly averages
        COALESCE(
          (SELECT
            CASE
              -- Try 2024 to 2022 (3 years)
              WHEN AVG(CASE WHEN "2024 Avg" IS NOT NULL AND "2024 Avg" > 0 THEN "2024 Avg" END) > 0
                AND AVG(CASE WHEN "2022 Avg" IS NOT NULL AND "2022 Avg" > 0 THEN "2022 Avg" END) > 0
              THEN POWER(
                AVG(CASE WHEN "2024 Avg" IS NOT NULL AND "2024 Avg" > 0 THEN "2024 Avg" END) /
                AVG(CASE WHEN "2022 Avg" IS NOT NULL AND "2022 Avg" > 0 THEN "2022 Avg" END),
                1.0 / 2.0
              ) - 1
              -- Try 2025 to 2023 (3 years)
              WHEN AVG(CASE WHEN "2025 Avg" IS NOT NULL AND "2025 Avg" > 0 THEN "2025 Avg" END) > 0
                AND AVG(CASE WHEN "2023 Avg" IS NOT NULL AND "2023 Avg" > 0 THEN "2023 Avg" END) > 0
              THEN POWER(
                AVG(CASE WHEN "2025 Avg" IS NOT NULL AND "2025 Avg" > 0 THEN "2025 Avg" END) /
                AVG(CASE WHEN "2023 Avg" IS NOT NULL AND "2023 Avg" > 0 THEN "2023 Avg" END),
                1.0 / 2.0
              ) - 1
              -- Try 2023 to 2021 (3 years)
              WHEN AVG(CASE WHEN "2023 Avg" IS NOT NULL AND "2023 Avg" > 0 THEN "2023 Avg" END) > 0
                AND AVG(CASE WHEN "2021 Avg" IS NOT NULL AND "2021 Avg" > 0 THEN "2021 Avg" END) > 0
              THEN POWER(
                AVG(CASE WHEN "2023 Avg" IS NOT NULL AND "2023 Avg" > 0 THEN "2023 Avg" END) /
                AVG(CASE WHEN "2021 Avg" IS NOT NULL AND "2021 Avg" > 0 THEN "2021 Avg" END),
                1.0 / 2.0
              ) - 1
              ELSE 0
            END
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "cagr3Year",
        -- Yearly averages from brand keyword (exact match) - 2020-2030
        COALESCE(
          (SELECT "2020 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2020",
        COALESCE(
          (SELECT "2021 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2021",
        COALESCE(
          (SELECT "2022 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2022",
        COALESCE(
          (SELECT "2023 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2023",
        COALESCE(
          (SELECT "2024 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2024",
        COALESCE(
          (SELECT "2025 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2025",
        COALESCE(
          (SELECT "2026 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2026",
        COALESCE(
          (SELECT "2027 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2027",
        COALESCE(
          (SELECT "2028 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2028",
        COALESCE(
          (SELECT "2029 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2029",
        COALESCE(
          (SELECT "2030 Avg"
           FROM brand_keyword_data
           WHERE brand = bkd.brand
             AND user_id = p_user_id
             AND LOWER(TRIM(keyword)) = LOWER(TRIM(brand))
           LIMIT 1),
          0
        ) as "yearlyAvg2030"
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