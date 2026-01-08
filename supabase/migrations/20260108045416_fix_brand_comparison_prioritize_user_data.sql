/*
  # Fix Brand Comparison to Prioritize User's Own Data

  ## Changes
  - Updates calculate_brand_comparison_stats to prioritize user's own brand page data over public data
  - Adds ORDER BY clause to ensure user_id = p_user_id rows are selected first
  - Prevents showing 0 when user has their own data with actual values

  ## Impact
  - When comparing brands, users will see their own brand search volume data
  - Falls back to public data only when user doesn't have their own page
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
  ) brand_stats;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;
