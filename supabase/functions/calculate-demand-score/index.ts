import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordData {
  keyword: string;
  monthlySearches: number[]; // Array of up to 48 monthly volumes
  competition: number; // 0-100
  avgCpc: number; // Average of low/high bid
  intentType: string; // Transactional, Commercial, Informational, Navigational
}

interface DemandScoreResult {
  keyword: string;
  demandScore: number;
  breakdown: {
    volumeScore: number;
    trendScore: number;
    competitionScore: number;
    cpcScore: number;
    intentScore: number;
    recentMomentum: number;
    seasonalityFlag: boolean;
  };
  interpretation: string;
}

// Linear regression calculation
function linearRegression(xValues: number[], yValues: number[]): { slope: number; rSquared: number } {
  const n = xValues.length;
  if (n === 0) return { slope: 0, rSquared: 0 };
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + (sumY - slope * sumX) / n;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
  
  return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
}

// Score monthly search volume (0-10 points)
function scoreVolume(avgVolume: number): number {
  if (avgVolume >= 50000) return 10;
  if (avgVolume >= 10000) return 7;
  if (avgVolume >= 1000) return 4;
  return 1;
}

// Score trend from historical data (0-10 points)
function scoreTrend(monthlySearches: number[]): { score: number; slope: number; rSquared: number; monthlyGrowth: number } {
  if (monthlySearches.length < 3) return { score: 4, slope: 0, rSquared: 0, monthlyGrowth: 0 };
  
  const xValues = monthlySearches.map((_, i) => i);
  const { slope, rSquared } = linearRegression(xValues, monthlySearches);
  
  const avgVolume = monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length;
  const monthlyGrowth = avgVolume > 0 ? (slope / avgVolume) * 100 : 0;
  
  let score = 4; // Default: stable
  
  if (monthlyGrowth >= 7 && rSquared > 0.8) score = 10;
  else if (monthlyGrowth >= 3 && monthlyGrowth < 7 && rSquared > 0.7) score = 8;
  else if (monthlyGrowth >= 1 && monthlyGrowth < 3 && rSquared > 0.6) score = 6;
  else if (monthlyGrowth >= -1 && monthlyGrowth < 1 && rSquared > 0.5) score = 4;
  else if (monthlyGrowth >= -3 && monthlyGrowth < -1) score = 2;
  else if (monthlyGrowth < -3 && rSquared > 0.6) score = 1;
  
  return { score, slope, rSquared, monthlyGrowth };
}

// Score competition (0-10 points, INVERSE scoring)
function scoreCompetition(competition: number): number {
  if (competition >= 70) return 1;
  if (competition >= 50) return 4;
  if (competition >= 30) return 7;
  return 10;
}

// Score average CPC (0-10 points)
function scoreCpc(avgCpc: number): number {
  if (avgCpc >= 7) return 10;
  if (avgCpc >= 3) return 7;
  if (avgCpc >= 1) return 4;
  return 1;
}

// Score intent type (0-10 points)
function scoreIntent(intentType: string): number {
  const intent = intentType.toLowerCase();
  if (intent.includes('transactional')) return 10;
  if (intent.includes('commercial')) return 7;
  if (intent.includes('navigational')) return 5;
  return 3; // Informational
}

// Calculate recent momentum modifier (±1 point)
function calculateMomentum(monthlySearches: number[], overallSlope: number): number {
  if (monthlySearches.length < 6) return 0;
  
  // Get last 3 months
  const lastThree = monthlySearches.slice(-3);
  const xValues = [0, 1, 2];
  const { slope: recentSlope } = linearRegression(xValues, lastThree);
  
  if (overallSlope === 0) return 0;
  
  const percentChange = ((recentSlope - overallSlope) / Math.abs(overallSlope)) * 100;
  
  if (percentChange >= 25) return 1; // Accelerating
  if (percentChange <= -25) return -1; // Decelerating
  return 0;
}

// Detect seasonality
function detectSeasonality(monthlySearches: number[]): boolean {
  if (monthlySearches.length < 12) return false;
  
  const avgVolume = monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length;
  if (avgVolume === 0) return false;
  
  const maxVolume = Math.max(...monthlySearches);
  const minVolume = Math.min(...monthlySearches);
  const amplitude = maxVolume - minVolume;
  
  return (amplitude / avgVolume) > 0.3;
}

// Main scoring function
function calculateDemandScore(data: KeywordData): DemandScoreResult {
  // 1. Calculate average volume (last 12 months)
  const recentMonths = data.monthlySearches.slice(-12);
  const avgVolume = recentMonths.length > 0 
    ? recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length 
    : 0;
  
  // 2. Score each metric
  const volumeScore = scoreVolume(avgVolume);
  const trendResult = scoreTrend(data.monthlySearches);
  const competitionScore = scoreCompetition(data.competition);
  const cpcScore = scoreCpc(data.avgCpc);
  const intentScore = scoreIntent(data.intentType);
  
  // 3. Calculate modifiers
  const recentMomentum = calculateMomentum(data.monthlySearches, trendResult.slope);
  const seasonalityFlag = detectSeasonality(data.monthlySearches);
  
  // 4. Total score
  const baseScore = volumeScore + trendResult.score + competitionScore + cpcScore + intentScore;
  const demandScore = Math.max(0, Math.min(50, baseScore + recentMomentum));
  
  // 5. Interpretation
  let interpretation = 'Low Demand - Monitor/Avoid';
  if (demandScore >= 40) interpretation = 'Very High Demand - Prioritize';
  else if (demandScore >= 30) interpretation = 'Strong - Good for Growth';
  else if (demandScore >= 20) interpretation = 'Moderate - Nurture';
  
  return {
    keyword: data.keyword,
    demandScore: Math.round(demandScore * 100) / 100,
    breakdown: {
      volumeScore,
      trendScore: trendResult.score,
      competitionScore,
      cpcScore,
      intentScore,
      recentMomentum,
      seasonalityFlag
    },
    interpretation
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { keyword, keywords } = await req.json();
    
    // Support both single keyword and batch processing
    if (keyword) {
      const result = calculateDemandScore(keyword);
      return new Response(
        JSON.stringify(result),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (keywords && Array.isArray(keywords)) {
      const results = keywords.map(kw => calculateDemandScore(kw));
      return new Response(
        JSON.stringify({ results }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide either "keyword" or "keywords" array' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});