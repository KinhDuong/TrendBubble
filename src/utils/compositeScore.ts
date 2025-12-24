export interface KeywordWithPerformance {
  keyword: string;
  three_month_change: any;
  yoy_change: any;
  searchVolume?: number;
  [key: string]: any;
}

export interface KeywordWithScore extends KeywordWithPerformance {
  compositeScore: number;
}

/**
 * Parses a percentage value that could be a number, string, or null/undefined
 */
function parsePercentage(value: any): number {
  if (typeof value === 'number') return value * 100;
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').replace(',', '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed * 100;
  }
  return 0;
}

/**
 * Calculates z-score to normalize values
 */
function calculateZScore(value: number, values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

/**
 * Calculates composite score combining YoY and 3-month changes
 * Uses weighted z-scores: 60% YoY (long-term) + 40% 3-month (recent momentum)
 */
export function calculateCompositeScores(keywords: KeywordWithPerformance[]): KeywordWithScore[] {
  // Filter keywords with valid performance data
  const validKeywords = keywords.filter(
    k => k.yoy_change !== null &&
         k.yoy_change !== undefined &&
         k.three_month_change !== null &&
         k.three_month_change !== undefined
  );

  if (validKeywords.length === 0) {
    return keywords.map(k => ({ ...k, compositeScore: 0 }));
  }

  // Extract and parse values
  const yoyValues = validKeywords.map(k => parsePercentage(k.yoy_change));
  const threeMonthValues = validKeywords.map(k => parsePercentage(k.three_month_change));

  // Calculate composite scores
  const scoredKeywords = validKeywords.map((keyword, index) => {
    const yoyZScore = calculateZScore(yoyValues[index], yoyValues);
    const threeMonthZScore = calculateZScore(threeMonthValues[index], threeMonthValues);

    // Weighted composite: 60% YoY (long-term) + 40% 3-month (recent momentum)
    const compositeScore = (yoyZScore * 0.6) + (threeMonthZScore * 0.4);

    return { ...keyword, compositeScore };
  });

  // Add 0 scores for keywords without valid data
  const invalidKeywords = keywords.filter(
    k => k.yoy_change === null ||
         k.yoy_change === undefined ||
         k.three_month_change === null ||
         k.three_month_change === undefined
  ).map(k => ({ ...k, compositeScore: -Infinity }));

  return [...scoredKeywords, ...invalidKeywords];
}

/**
 * Gets the top N% of keywords by composite score
 */
export function getTopPercentByCompositeScore(
  keywords: KeywordWithPerformance[],
  percentile: number = 15
): KeywordWithScore[] {
  const scoredKeywords = calculateCompositeScores(keywords);

  // Sort by composite score descending
  const sortedByScore = scoredKeywords
    .filter(k => k.compositeScore !== -Infinity)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  // Calculate how many keywords represent the top N%
  const topCount = Math.ceil(sortedByScore.length * (percentile / 100));

  return sortedByScore.slice(0, topCount);
}

/**
 * Checks if a keyword is in the top N% by composite score
 */
export function isInTopPercentile(
  keyword: string,
  allKeywords: KeywordWithPerformance[],
  percentile: number = 15
): boolean {
  if (allKeywords.length === 0) {
    return false;
  }

  const topKeywords = getTopPercentByCompositeScore(allKeywords, percentile);
  return topKeywords.some(k => k.keyword.toLowerCase().trim() === keyword.toLowerCase().trim());
}
