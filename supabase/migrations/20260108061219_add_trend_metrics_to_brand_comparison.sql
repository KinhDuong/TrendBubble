/*
  # Add Historical Trend Metrics to Brand Comparison
  
  ## Overview
  Integrates 48-month trend analysis into brand comparison stats.
  Provides linear regression slope, R², and Rising Stars count based on historical data.
  
  ## New Fields Added
  - avgSlope: Average monthly growth rate from linear regression (as decimal, e.g., 0.07 = 7%)
  - avgRSquared: Average R² (coefficient of determination, 0-1) - trend strength
  - risingStarsHistorical: Count of keywords with slope > 7% monthly AND R² > 0.7
  
  ## Usage
  These metrics complement the existing "risingStars" count (based on 3-month change)
  and provide more robust trend analysis using up to 48 months of data.
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
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Competition (indexed value)" IS NOT NULL
              AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Competition (indexed value)"::numeric != 0
            THEN bkd."Competition (indexed value)"::numeric
            ELSE NULL
          END
        ),
        0
      ) as "avgCompetition",
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Top of page bid (low range)" IS NOT NULL
              AND bkd."Top of page bid (low range)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Top of page bid (low range)"::numeric != 0
            THEN bkd."Top of page bid (low range)"::numeric
            ELSE NULL
          END
        ),
        0
      ) as "avgCpcLow",
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Top of page bid (high range)" IS NOT NULL
              AND bkd."Top of page bid (high range)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Top of page bid (high range)"::numeric != 0
            THEN bkd."Top of page bid (high range)"::numeric
            ELSE NULL
          END
        ),
        0
      ) as "avgCpcHigh",
      COALESCE(
        AVG(
          CASE
            WHEN bkd."Three month change" IS NOT NULL
              AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
              AND bkd."Three month change"::numeric != 0
            THEN bkd."Three month change"::numeric
            ELSE NULL
          END
        ),
        0
      ) as "threeMonthChange",
      COALESCE(
        AVG(
          CASE
            WHEN bkd."YoY change" IS NOT NULL
              AND bkd."YoY change"::text ~ '^-?[0-9]+\.?[0-9]*$'
              AND bkd."YoY change"::numeric != 0
            THEN bkd."YoY change"::numeric
            ELSE NULL
          END
        ),
        0
      ) as "yoyChange",
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
      COALESCE(
        AVG(
          CASE
            WHEN bkd.demand_score IS NOT NULL
            THEN bkd.demand_score
            ELSE NULL
          END
        ),
        0
      ) as "avgDemandScore",
      COALESCE(
        AVG(
          CASE
            WHEN bkd.interest_score IS NOT NULL
            THEN bkd.interest_score
            ELSE NULL
          END
        ),
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
        WHERE bkd."Avg. monthly searches" > 5000
          AND bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric < 0.3
      ) as "highVolumeLowComp",
      COUNT(*) FILTER (
        WHERE bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric > 0.7
      ) as "highIntent",
      COUNT(*) FILTER (
        WHERE bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric > 0.7
      ) as "competitive"
    FROM brand_keyword_data bkd
    WHERE bkd.brand = ANY(brand_names)
      AND bkd.user_id = p_user_id
    GROUP BY bkd.brand
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;
