/*
  # Fix Brand Comparison Stats Function - Regex on Text

  1. Changes
    - Apply regex validation on text BEFORE casting to numeric
    - Properly sequence the type checking and conversion
    - Handle NULL and non-numeric values safely

  2. Details
    - Check text pattern first, then cast to numeric
    - Only perform numeric operations after successful cast
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
              AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Competition (indexed value)"::numeric != 0
            THEN bkd."Competition (indexed value)"::numeric
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
              AND bkd."Top of page bid (low range)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Top of page bid (low range)"::numeric != 0
            THEN bkd."Top of page bid (low range)"::numeric
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
              AND bkd."Top of page bid (high range)"::text ~ '^[0-9]+\.?[0-9]*$'
              AND bkd."Top of page bid (high range)"::numeric != 0
            THEN bkd."Top of page bid (high range)"::numeric
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
              AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
              AND bkd."Three month change"::numeric != 0
            THEN bkd."Three month change"::numeric
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
              AND bkd."YoY change"::text ~ '^-?[0-9]+\.?[0-9]*$'
              AND bkd."YoY change"::numeric != 0
            THEN bkd."YoY change"::numeric
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
          AND bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric < 0.5
      ) as "topPerformers",
      -- Rising stars: 3-month > 0.2 OR yoy > 0.5
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
      -- Declining: 3-month < -0.1
      COUNT(*) FILTER (
        WHERE bkd."Three month change" IS NOT NULL
          AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
          AND bkd."Three month change"::numeric < -0.1
      ) as "declining",
      -- Stable: 3-month between -0.1 and 0.1
      COUNT(*) FILTER (
        WHERE bkd."Three month change" IS NOT NULL
          AND bkd."Three month change"::text ~ '^-?[0-9]+\.?[0-9]*$'
          AND bkd."Three month change"::numeric >= -0.1
          AND bkd."Three month change"::numeric <= 0.1
      ) as "stable",
      -- High volume low competition: volume > 5000 AND competition < 0.3
      COUNT(*) FILTER (
        WHERE bkd."Avg. monthly searches" > 5000
          AND bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric < 0.3
      ) as "highVolumeLowComp",
      -- High intent: competition > 0.7
      COUNT(*) FILTER (
        WHERE bkd."Competition (indexed value)" IS NOT NULL
          AND bkd."Competition (indexed value)"::text ~ '^[0-9]+\.?[0-9]*$'
          AND bkd."Competition (indexed value)"::numeric > 0.7
      ) as "highIntent",
      -- Competitive: competition > 0.7
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_brand_comparison_stats(text[], uuid) TO authenticated;