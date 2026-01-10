import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordData {
  keyword: string;
  monthlySearches: number[];
  competition: number;
  avgCpc: number;
  intentType: string;
}

interface ScoreResult {
  keyword: string;
  demandScore: number;
  interestScore: number;
  demandBreakdown: {
    volumeScore: number;
    trendScore: number;
    competitionScore: number;
    cpcScore: number;
    intentScore: number;
    recentMomentum: number;
    seasonalityFlag: boolean;
  };
  interestBreakdown: {
    volumeScore: number;
    trendScore: number;
    competitionScore: number;
    cpcScore: number;
    intentScore: number;
  };
  demandInterpretation: string;
  interestInterpretation: string;
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
  
  const meanY = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + (sumY - slope * sumX) / n;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
  
  return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
}

// DEMAND SCORING FUNCTIONS

function scoreVolumeDemand(avgVolume: number): number {
  if (avgVolume >= 50000) return 10;
  if (avgVolume >= 10000) return 7;
  if (avgVolume >= 1000) return 4;
  return 1;
}

function scoreTrendDemand(monthlySearches: number[]): { score: number; slope: number; rSquared: number; monthlyGrowth: number } {
  if (monthlySearches.length < 3) return { score: 4, slope: 0, rSquared: 0, monthlyGrowth: 0 };
  
  const xValues = monthlySearches.map((_, i) => i);
  const { slope, rSquared } = linearRegression(xValues, monthlySearches);
  
  const avgVolume = monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length;
  const monthlyGrowth = avgVolume > 0 ? (slope / avgVolume) * 100 : 0;
  
  let score = 4;
  
  if (monthlyGrowth >= 7 && rSquared > 0.8) score = 10;
  else if (monthlyGrowth >= 3 && monthlyGrowth < 7 && rSquared > 0.7) score = 8;
  else if (monthlyGrowth >= 1 && monthlyGrowth < 3 && rSquared > 0.6) score = 6;
  else if (monthlyGrowth >= -1 && monthlyGrowth < 1 && rSquared > 0.5) score = 4;
  else if (monthlyGrowth >= -3 && monthlyGrowth < -1) score = 2;
  else if (monthlyGrowth < -3 && rSquared > 0.6) score = 1;
  
  return { score, slope, rSquared, monthlyGrowth };
}

function scoreCompetitionDemand(competition: number): number {
  if (competition >= 70) return 1;
  if (competition >= 50) return 4;
  if (competition >= 30) return 7;
  return 10;
}

function scoreCpcDemand(avgCpc: number): number {
  if (avgCpc >= 7) return 10;
  if (avgCpc >= 3) return 7;
  if (avgCpc >= 1) return 4;
  return 1;
}

function scoreIntentDemand(intentType: string): number {
  const intent = intentType.toLowerCase();
  if (intent.includes('transactional')) return 10;
  if (intent.includes('commercial')) return 7;
  if (intent.includes('navigational')) return 5;
  return 3;
}

// INTEREST SCORING FUNCTIONS

function scoreVolumeInterest(avgVolume: number): number {
  if (avgVolume >= 50000) return 10;
  if (avgVolume >= 10000) return 8;
  if (avgVolume >= 1000) return 5;
  return 2;
}

function scoreTrendInterest(monthlySearches: number[]): { score: number; slope: number; rSquared: number; monthlyGrowth: number } {
  if (monthlySearches.length < 3) return { score: 5, slope: 0, rSquared: 0, monthlyGrowth: 0 };
  
  const xValues = monthlySearches.map((_, i) => i);
  const { slope, rSquared } = linearRegression(xValues, monthlySearches);
  
  const avgVolume = monthlySearches.reduce((a, b) => a + b, 0) / monthlySearches.length;
  const monthlyGrowth = avgVolume > 0 ? (slope / avgVolume) * 100 : 0;
  
  let score = 5;
  
  if (monthlyGrowth >= 7 && rSquared > 0.8) score = 10;
  else if (monthlyGrowth >= 3 && monthlyGrowth < 7 && rSquared > 0.7) score = 9;
  else if (monthlyGrowth >= 1 && monthlyGrowth < 3 && rSquared > 0.6) score = 7;
  else if (monthlyGrowth >= -1 && monthlyGrowth < 1 && rSquared > 0.5) score = 5;
  else if (monthlyGrowth >= -3 && monthlyGrowth < -1) score = 3;
  else if (monthlyGrowth < -3) score = 1;
  
  return { score, slope, rSquared, monthlyGrowth };
}

function scoreCompetitionInterest(competition: number): number {
  if (competition > 70) return 10; // Lots of people talking
  if (competition >= 40) return 7;
  if (competition >= 20) return 4;
  return 2; // Niche
}

function scoreCpcInterest(avgCpc: number): number {
  if (avgCpc < 1) return 6;
  if (avgCpc >= 1 && avgCpc <= 3) return 10; // Optimal curiosity zone
  if (avgCpc > 3 && avgCpc <= 7) return 7;
  return 4;
}

function scoreIntentInterest(intentType: string): number {
  const intent = intentType.toLowerCase();
  // >60% informational = pure learning/research interest
  if (intent.includes('informational')) return 10;
  // 40-60% = mixed intent (commercial/navigational)
  if (intent.includes('commercial') || intent.includes('navigational')) return 8;
  // <40% informational = transactional (ready to buy, less interest)
  if (intent.includes('transactional')) return 5;
  return 10; // Default to informational
}

// Calculate recent momentum modifier
function calculateMomentum(monthlySearches: number[], overallSlope: number): number {
  if (monthlySearches.length < 6) return 0;
  
  const lastThree = monthlySearches.slice(-3);
  const xValues = [0, 1, 2];
  const { slope: recentSlope } = linearRegression(xValues, lastThree);
  
  if (overallSlope === 0) return 0;
  
  const percentChange = ((recentSlope - overallSlope) / Math.abs(overallSlope)) * 100;
  
  if (percentChange >= 25) return 1;
  if (percentChange <= -25) return -1;
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

// Main scoring function - calculates both Demand and Interest scores
function calculateScores(data: KeywordData): ScoreResult {
  const recentMonths = data.monthlySearches.slice(-12);
  const avgVolume = recentMonths.length > 0 
    ? recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length 
    : 0;
  
  // DEMAND SCORE
  const demandVolumeScore = scoreVolumeDemand(avgVolume);
  const demandTrendResult = scoreTrendDemand(data.monthlySearches);
  const demandCompetitionScore = scoreCompetitionDemand(data.competition);
  const demandCpcScore = scoreCpcDemand(data.avgCpc);
  const demandIntentScore = scoreIntentDemand(data.intentType);
  const recentMomentum = calculateMomentum(data.monthlySearches, demandTrendResult.slope);
  const seasonalityFlag = detectSeasonality(data.monthlySearches);
  
  const demandBaseScore = demandVolumeScore + demandTrendResult.score + demandCompetitionScore + demandCpcScore + demandIntentScore;
  const demandScore = Math.max(0, Math.min(50, demandBaseScore + recentMomentum));
  
  let demandInterpretation = 'Low Demand - Monitor/Avoid';
  if (demandScore >= 40) demandInterpretation = 'Very High Demand - Prioritize';
  else if (demandScore >= 30) demandInterpretation = 'Strong - Good for Growth';
  else if (demandScore >= 20) demandInterpretation = 'Moderate - Nurture';
  
  // INTEREST SCORE
  const interestVolumeScore = scoreVolumeInterest(avgVolume);
  const interestTrendResult = scoreTrendInterest(data.monthlySearches);
  const interestCompetitionScore = scoreCompetitionInterest(data.competition);
  const interestCpcScore = scoreCpcInterest(data.avgCpc);
  const interestIntentScore = scoreIntentInterest(data.intentType);
  
  const interestScore = Math.max(0, Math.min(50, 
    interestVolumeScore + interestTrendResult.score + interestCompetitionScore + interestCpcScore + interestIntentScore
  ));
  
  let interestInterpretation = 'Low Interest - Limited Awareness';
  if (interestScore >= 40) interestInterpretation = 'Very High Interest - Cultural Buzz';
  else if (interestScore >= 30) interestInterpretation = 'Strong Interest - Build Authority';
  else if (interestScore >= 20) interestInterpretation = 'Moderate - Emerging Curiosity';
  
  return {
    keyword: data.keyword,
    demandScore: Math.round(demandScore * 100) / 100,
    interestScore: Math.round(interestScore * 100) / 100,
    demandBreakdown: {
      volumeScore: demandVolumeScore,
      trendScore: demandTrendResult.score,
      competitionScore: demandCompetitionScore,
      cpcScore: demandCpcScore,
      intentScore: demandIntentScore,
      recentMomentum,
      seasonalityFlag
    },
    interestBreakdown: {
      volumeScore: interestVolumeScore,
      trendScore: interestTrendResult.score,
      competitionScore: interestCompetitionScore,
      cpcScore: interestCpcScore,
      intentScore: interestIntentScore
    },
    demandInterpretation,
    interestInterpretation
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
    
    if (keyword) {
      const result = calculateScores(keyword);
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
      const results = keywords.map(kw => calculateScores(kw));
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