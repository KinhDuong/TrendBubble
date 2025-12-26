import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchIntentResult {
  intent: 'transactional' | 'commercial' | 'local_transactional' | 'informational' | 'unknown';
  confidence: number;
  matchedPatterns: string[];
}

function classifySearchIntent(keyword: string): SearchIntentResult {
  const lowerKeyword = keyword.toLowerCase().trim();

  const transactionalPatterns = [
    'buy', 'purchase', 'order', 'shop', 'sale', 'discount', 'coupon',
    'promo code', 'deal', 'cheap', 'cheapest', 'affordable', 'price',
    'pricing', 'cost', 'for sale', 'free shipping', 'delivery',
    'subscribe', 'subscription', 'sign up', 'join', 'get',
    'add to cart', 'checkout'
  ];

  const commercialPatterns = [
    'best', 'top', 'review', 'reviews', 'comparison', 'compare',
    'vs', 'versus', 'alternative', 'alternatives', 'recommended',
    'rating', 'ratings', 'good', 'better', 'worth it', 'pros and cons',
    'guide', 'how to choose'
  ];

  const localTransactionalPatterns = [
    'near me', 'nearby', 'locations', 'store', 'open now', 'delivery near me'
  ];

  const informationalPatterns = [
    'how to', 'what is', 'what are', 'why', 'benefits', 'difference between',
    'tutorial', 'recipe', 'how do i', 'can i', 'does', 'tips', 'ideas',
    'meaning', 'definition', 'ingredients', 'side effects', 'health benefits',
    'calories in', 'nutrition', 'history of', 'is'
  ];

  const checkPatterns = (patterns: string[]) => {
    return patterns.filter(pattern => lowerKeyword.includes(pattern));
  };

  const localMatches = checkPatterns(localTransactionalPatterns);
  if (localMatches.length > 0) {
    return {
      intent: 'local_transactional',
      confidence: 0.95,
      matchedPatterns: localMatches
    };
  }

  const transactionalMatches = checkPatterns(transactionalPatterns);
  if (transactionalMatches.length > 0) {
    return {
      intent: 'transactional',
      confidence: 0.9,
      matchedPatterns: transactionalMatches
    };
  }

  const commercialMatches = checkPatterns(commercialPatterns);
  if (commercialMatches.length > 0) {
    return {
      intent: 'commercial',
      confidence: 0.85,
      matchedPatterns: commercialMatches
    };
  }

  const informationalMatches = checkPatterns(informationalPatterns);
  if (informationalMatches.length > 0) {
    return {
      intent: 'informational',
      confidence: 0.8,
      matchedPatterns: informationalMatches
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.5,
    matchedPatterns: []
  };
}

interface KeywordData {
  keyword: string;
  avg_cpc?: number;
  competition?: string;
  volume?: number;
  intent?: SearchIntentResult;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { brandPageSlug } = await req.json();

    if (!brandPageSlug) {
      return new Response(
        JSON.stringify({ error: "brandPageSlug is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: brandPage, error: pageError } = await supabase
      .from("brand_pages")
      .select("id, brand, user_id")
      .eq("brand", brandPageSlug)
      .maybeSingle();

    if (pageError || !brandPage) {
      return new Response(
        JSON.stringify({ error: "Brand page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (brandPage.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to generate insights for this brand" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: keywords, error: keywordsError } = await supabase
      .from("brand_keyword_data")
      .select("keyword, avg_cpc, competition, volume")
      .eq("brand_page_id", brandPage.id)
      .not("avg_cpc", "is", null);

    if (keywordsError) {
      throw keywordsError;
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          insights: "No keyword data available for PPC analysis. Please upload keyword data first.",
          campaigns: []
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const classifiedKeywords: KeywordData[] = keywords.map(kw => ({
      ...kw,
      intent: classifySearchIntent(kw.keyword)
    }));

    const transactionalKeywords = classifiedKeywords.filter(
      kw => kw.intent?.intent === 'transactional' && kw.avg_cpc && kw.avg_cpc > 0
    );

    const commercialKeywords = classifiedKeywords.filter(
      kw => kw.intent?.intent === 'commercial' && kw.avg_cpc && kw.avg_cpc > 0
    );

    const localKeywords = classifiedKeywords.filter(
      kw => kw.intent?.intent === 'local_transactional' && kw.avg_cpc && kw.avg_cpc > 0
    );

    const topTransactional = transactionalKeywords
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 10);

    const topCommercial = commercialKeywords
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 10);

    const avgCpcTransactional = transactionalKeywords.reduce((sum, kw) => sum + (kw.avg_cpc || 0), 0) /
      (transactionalKeywords.length || 1);

    const avgCpcCommercial = commercialKeywords.reduce((sum, kw) => sum + (kw.avg_cpc || 0), 0) /
      (commercialKeywords.length || 1);

    const totalVolumeTransactional = transactionalKeywords.reduce((sum, kw) => sum + (kw.volume || 0), 0);
    const totalVolumeCommercial = commercialKeywords.reduce((sum, kw) => sum + (kw.volume || 0), 0);

    const insights = {
      summary: {
        totalKeywords: classifiedKeywords.length,
        transactionalCount: transactionalKeywords.length,
        commercialCount: commercialKeywords.length,
        localCount: localKeywords.length,
        avgCpcTransactional: avgCpcTransactional.toFixed(2),
        avgCpcCommercial: avgCpcCommercial.toFixed(2),
        totalVolumeTransactional,
        totalVolumeCommercial
      },
      recommendations: {
        priorityCampaign: transactionalKeywords.length > 0 ? 'transactional' : 'commercial',
        budgetAllocation: {
          transactional: '60-70%',
          commercial: '20-30%',
          local: '10%'
        },
        topTransactionalKeywords: topTransactional.map(kw => ({
          keyword: kw.keyword,
          cpc: kw.avg_cpc,
          volume: kw.volume,
          competition: kw.competition,
          matchedPatterns: kw.intent?.matchedPatterns
        })),
        topCommercialKeywords: topCommercial.map(kw => ({
          keyword: kw.keyword,
          cpc: kw.avg_cpc,
          volume: kw.volume,
          competition: kw.competition,
          matchedPatterns: kw.intent?.matchedPatterns
        })),
        warnings: []
      }
    };

    if (avgCpcTransactional > 5) {
      insights.recommendations.warnings.push(
        `High average CPC ($${avgCpcTransactional.toFixed(2)}) for transactional keywords. Consider long-tail variations to reduce costs.`
      );
    }

    if (transactionalKeywords.length === 0) {
      insights.recommendations.warnings.push(
        "No transactional keywords found. Consider adding 'buy', 'purchase', or 'order' related keywords to your strategy."
      );
    }

    const highCompetitionTransactional = transactionalKeywords.filter(
      kw => kw.competition === 'HIGH'
    ).length;

    if (highCompetitionTransactional > transactionalKeywords.length * 0.7) {
      insights.recommendations.warnings.push(
        "Over 70% of transactional keywords have high competition. Budget may need to be increased for visibility."
      );
    }

    const { data: existingInsights } = await supabase
      .from("brand_ppc_insights")
      .select("id")
      .eq("brand_page_id", brandPage.id)
      .maybeSingle();

    let savedInsights;
    if (existingInsights) {
      const { data, error: updateError } = await supabase
        .from("brand_ppc_insights")
        .update({
          insights,
          updated_at: new Date().toISOString()
        })
        .eq("brand_page_id", brandPage.id)
        .select("id, created_at, updated_at")
        .single();

      if (updateError) {
        throw updateError;
      }
      savedInsights = data;
    } else {
      const { data, error: insertError } = await supabase
        .from("brand_ppc_insights")
        .insert({
          brand_page_id: brandPage.id,
          user_id: user.id,
          insights
        })
        .select("id, created_at, updated_at")
        .single();

      if (insertError) {
        throw insertError;
      }
      savedInsights = data;
    }

    return new Response(
      JSON.stringify({
        ...insights,
        metadata: {
          id: savedInsights.id,
          created_at: savedInsights.created_at,
          updated_at: savedInsights.updated_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating PPC insights:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
