/*
  # Fix Column Ambiguity in Brand Trend Metrics Function
  
  ## Changes
  - Add table alias to resolve "brand" column ambiguity
  - Use explicit column references with table prefix
*/

CREATE OR REPLACE FUNCTION calculate_brand_trend_metrics(
  brand_name text,
  user_uuid uuid
)
RETURNS TABLE (
  brand text,
  avg_slope numeric,
  avg_r_squared numeric,
  rising_stars_count integer,
  keywords_analyzed integer,
  avg_three_month_change numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  monthly_columns text[];
  keyword_record record;
  month_values numeric[];
  x_values numeric[];
  n integer;
  sum_x numeric;
  sum_y numeric;
  sum_xy numeric;
  sum_xx numeric;
  sum_yy numeric;
  mean_x numeric;
  mean_y numeric;
  slope numeric;
  r_squared numeric;
  ss_res numeric;
  ss_tot numeric;
  total_slope numeric := 0;
  total_r_squared numeric := 0;
  rising_stars integer := 0;
  keyword_count integer := 0;
  total_three_month numeric := 0;
  three_month_count integer := 0;
  i integer;
BEGIN
  -- Define all possible monthly search columns (48 months from Dec 2021 to Nov 2025)
  monthly_columns := ARRAY[
    'Searches: Dec 2021', 'Searches: Jan 2022', 'Searches: Feb 2022', 'Searches: Mar 2022',
    'Searches: Apr 2022', 'Searches: May 2022', 'Searches: Jun 2022', 'Searches: Jul 2022',
    'Searches: Aug 2022', 'Searches: Sep 2022', 'Searches: Oct 2022', 'Searches: Nov 2022',
    'Searches: Dec 2022', 'Searches: Jan 2023', 'Searches: Feb 2023', 'Searches: Mar 2023',
    'Searches: Apr 2023', 'Searches: May 2023', 'Searches: Jun 2023', 'Searches: Jul 2023',
    'Searches: Aug 2023', 'Searches: Sep 2023', 'Searches: Oct 2023', 'Searches: Nov 2023',
    'Searches: Dec 2023', 'Searches: Jan 2024', 'Searches: Feb 2024', 'Searches: Mar 2024',
    'Searches: Apr 2024', 'Searches: May 2024', 'Searches: Jun 2024', 'Searches: Jul 2024',
    'Searches: Aug 2024', 'Searches: Sep 2024', 'Searches: Oct 2024', 'Searches: Nov 2024',
    'Searches: Dec 2024', 'Searches: Jan 2025', 'Searches: Feb 2025', 'Searches: Mar 2025',
    'Searches: Apr 2025', 'Searches: May 2025', 'Searches: Jun 2025', 'Searches: Jul 2025',
    'Searches: Aug 2025', 'Searches: Sep 2025', 'Searches: Oct 2025', 'Searches: Nov 2025'
  ];

  -- Loop through each keyword for this brand
  FOR keyword_record IN 
    SELECT 
      bkd.id,
      bkd.keyword,
      bkd."Three month change"
    FROM brand_keyword_data bkd
    WHERE bkd.brand = brand_name 
      AND bkd.user_id = user_uuid
  LOOP
    -- Extract monthly values for this keyword (dynamic query)
    EXECUTE format('
      SELECT ARRAY[%s] 
      FROM brand_keyword_data 
      WHERE id = $1',
      (SELECT string_agg(quote_ident(col), ', ') FROM unnest(monthly_columns) col)
    ) INTO month_values USING keyword_record.id;

    -- Filter out NULL values and count valid data points
    month_values := (SELECT ARRAY_AGG(val) FROM unnest(month_values) val WHERE val IS NOT NULL AND val > 0);
    n := COALESCE(array_length(month_values, 1), 0);

    -- Skip if insufficient data (need at least 6 months)
    IF n < 6 THEN
      CONTINUE;
    END IF;

    -- Create x-axis (time indices: 0, 1, 2, ...)
    x_values := ARRAY(SELECT generate_series(0, n - 1));

    -- Calculate sums for linear regression
    sum_x := 0;
    sum_y := 0;
    sum_xy := 0;
    sum_xx := 0;
    sum_yy := 0;

    FOR i IN 1..n LOOP
      sum_x := sum_x + x_values[i];
      sum_y := sum_y + month_values[i];
      sum_xy := sum_xy + (x_values[i] * month_values[i]);
      sum_xx := sum_xx + (x_values[i] * x_values[i]);
      sum_yy := sum_yy + (month_values[i] * month_values[i]);
    END LOOP;

    mean_x := sum_x / n;
    mean_y := sum_y / n;

    -- Calculate slope (change per month)
    slope := (sum_xy - n * mean_x * mean_y) / NULLIF(sum_xx - n * mean_x * mean_x, 0);

    -- Convert slope to percentage growth per month
    IF mean_y > 0 THEN
      slope := (slope / mean_y);  -- As decimal (0.07 = 7%)
    ELSE
      slope := 0;
    END IF;

    -- Calculate R² (coefficient of determination)
    ss_res := sum_yy - 2 * slope * mean_y * n * sum_xy / NULLIF(sum_xx, 0) + (slope * mean_y * n)^2 / NULLIF(sum_xx, 0);
    ss_tot := sum_yy - n * mean_y * mean_y;

    IF ss_tot > 0 THEN
      r_squared := 1 - (ss_res / ss_tot);
      -- Clamp R² between 0 and 1
      r_squared := GREATEST(0, LEAST(1, r_squared));
    ELSE
      r_squared := 0;
    END IF;

    -- Count as Rising Star if slope > 7% monthly AND R² > 0.7
    IF slope > 0.07 AND r_squared > 0.7 THEN
      rising_stars := rising_stars + 1;
    END IF;

    -- Accumulate for averages
    total_slope := total_slope + slope;
    total_r_squared := total_r_squared + r_squared;
    keyword_count := keyword_count + 1;

    -- Track three-month change for comparison
    IF keyword_record."Three month change" IS NOT NULL AND keyword_record."Three month change" != '' THEN
      BEGIN
        total_three_month := total_three_month + keyword_record."Three month change"::numeric;
        three_month_count := three_month_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Skip invalid three month change values
      END;
    END IF;
  END LOOP;

  -- Return aggregated metrics
  IF keyword_count > 0 THEN
    RETURN QUERY SELECT
      brand_name,
      (total_slope / keyword_count)::numeric AS avg_slope,
      (total_r_squared / keyword_count)::numeric AS avg_r_squared,
      rising_stars,
      keyword_count,
      CASE 
        WHEN three_month_count > 0 THEN (total_three_month / three_month_count)::numeric
        ELSE 0::numeric
      END AS avg_three_month_change;
  ELSE
    -- No keywords with sufficient data
    RETURN QUERY SELECT
      brand_name,
      0::numeric,
      0::numeric,
      0::integer,
      0::integer,
      0::numeric;
  END IF;
END;
$$;
