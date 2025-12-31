import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordData {
  keyword: string;
  searchVolume: number;
  threeMonthChange?: number;
  yoyChange?: number;
  competition?: string | number;
  bidHigh?: number;
}

interface AnalysisRequest {
  brand: string;
  keywords: KeywordData[];
  totalMonths: number;
  avgVolume: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key not configured. Please add OPENAI_API_KEY to your Supabase Edge Function environment variables.",
          errorCode: "MISSING_API_KEY"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const requestData: AnalysisRequest = await req.json();
    const { brand, keywords, totalMonths, avgVolume } = requestData;

    if (!brand || !keywords || keywords.length === 0) {
      throw new Error("Brand and keywords are required");
    }

    // TIER 1: Top 25 keywords with full details
    const tier1Keywords = keywords.slice(0, 25).map((kw, idx) => {
      const parts = [
        `"${kw.keyword}"`,
        `~${kw.searchVolume.toLocaleString()} searches`
      ];

      if (kw.threeMonthChange !== undefined && kw.threeMonthChange !== null && Math.abs(kw.threeMonthChange) > 0.01) {
        const change = (kw.threeMonthChange * 100).toFixed(0);
        parts.push(`${kw.threeMonthChange > 0 ? '+' : ''}${change}% (3-mo)`);
      }

      if (kw.yoyChange !== undefined && kw.yoyChange !== null && Math.abs(kw.yoyChange) > 0.01) {
        const change = (kw.yoyChange * 100).toFixed(0);
        parts.push(`${kw.yoyChange > 0 ? '+' : ''}${change}% YoY`);
      }

      if (kw.competition) {
        parts.push(`${kw.competition} competition`);
      }

      if (kw.bidHigh && kw.bidHigh > 0) {
        parts.push(`$${kw.bidHigh.toFixed(2)} CPC`);
      }

      return `${idx + 1}. ${parts.join(', ')}`;
    }).join('\n');

    // TIER 2: Keywords 26-100 with core metrics only
    let tier2Summary = '';
    if (keywords.length > 25) {
      const tier2Keywords = keywords.slice(25, 100);
      const tier2AvgVolume = tier2Keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / tier2Keywords.length;
      const tier2HighGrowth = tier2Keywords.filter(kw =>
        (kw.threeMonthChange && kw.threeMonthChange > 0.3) || (kw.yoyChange && kw.yoyChange > 0.5)
      );
      const tier2HighValue = tier2Keywords.filter(kw => kw.bidHigh && kw.bidHigh > 5);

      tier2Summary = `\n**TIER 2 (Keywords 26-${Math.min(100, keywords.length)}):**\n`;
      tier2Summary += `- Total Keywords: ${tier2Keywords.length}\n`;
      tier2Summary += `- Avg Search Volume: ${Math.round(tier2AvgVolume).toLocaleString()}\n`;
      tier2Summary += `- High-Growth Keywords: ${tier2HighGrowth.length}\n`;
      tier2Summary += `- High-Value Keywords (CPC > $5): ${tier2HighValue.length}\n`;

      // Show top 5 from Tier 2
      if (tier2Keywords.length > 0) {
        tier2Summary += `\nTop 5 from Tier 2:\n`;
        tier2Keywords.slice(0, 5).forEach((kw, idx) => {
          tier2Summary += `${26 + idx}. "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches`;
          if (kw.bidHigh && kw.bidHigh > 0) tier2Summary += `, $${kw.bidHigh.toFixed(2)} CPC`;
          tier2Summary += `)\n`;
        });
      }
    }

    // TIER 3: Keywords 101-1000 as aggregated patterns
    let tier3Patterns = '';
    if (keywords.length > 100) {
      const tier3Keywords = keywords.slice(100);
      const tier3AvgVolume = tier3Keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / tier3Keywords.length;

      // Analyze patterns in Tier 3
      const patterns: { [key: string]: { count: number; totalVolume: number; keywords: string[] } } = {};

      tier3Keywords.forEach(kw => {
        const words = kw.keyword.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3) { // Filter out very short words
            if (!patterns[word]) {
              patterns[word] = { count: 0, totalVolume: 0, keywords: [] };
            }
            patterns[word].count++;
            patterns[word].totalVolume += kw.searchVolume;
            if (patterns[word].keywords.length < 3) {
              patterns[word].keywords.push(kw.keyword);
            }
          }
        });
      });

      // Get top patterns
      const topPatterns = Object.entries(patterns)
        .filter(([_, data]) => data.count >= 3) // At least 3 occurrences
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15);

      tier3Patterns = `\n**TIER 3 (Keywords 101-${keywords.length}):**\n`;
      tier3Patterns += `- Total Keywords: ${tier3Keywords.length}\n`;
      tier3Patterns += `- Avg Search Volume: ${Math.round(tier3AvgVolume).toLocaleString()}\n`;
      tier3Patterns += `- Total Search Volume: ${tier3Keywords.reduce((sum, kw) => sum + kw.searchVolume, 0).toLocaleString()}\n`;

      if (topPatterns.length > 0) {
        tier3Patterns += `\nTop Recurring Themes/Terms:\n`;
        topPatterns.forEach(([term, data]) => {
          tier3Patterns += `- "${term}": ${data.count} keywords, ~${Math.round(data.totalVolume).toLocaleString()} total volume\n`;
          tier3Patterns += `  Examples: ${data.keywords.slice(0, 2).map(k => `"${k}"`).join(', ')}\n`;
        });
      }
    }

    // Strategic insights from full dataset
    const highGrowthKeywords = keywords.filter(kw =>
      (kw.threeMonthChange && kw.threeMonthChange > 0.3) || (kw.yoyChange && kw.yoyChange > 0.5)
    ).slice(0, 10);

    const decliningKeywords = keywords.filter(kw =>
      (kw.threeMonthChange && kw.threeMonthChange < -0.2) || (kw.yoyChange && kw.yoyChange < -0.3)
    ).slice(0, 5);

    const highVolumeKeywords = keywords.filter(kw => kw.searchVolume > avgVolume * 2).slice(0, 10);

    const highValueKeywords = keywords.filter(kw => kw.bidHigh && kw.bidHigh > 5)
      .sort((a, b) => (b.bidHigh || 0) - (a.bidHigh || 0))
      .slice(0, 10);

    const lowCompetitionOpportunities = keywords.filter(kw =>
      kw.competition &&
      (kw.competition === 'Low' || kw.competition === 'low' ||
       (typeof kw.competition === 'number' && kw.competition < 0.3)) &&
      kw.searchVolume > avgVolume * 0.5
    ).slice(0, 10);

    let strategicInsights = '';

    if (highVolumeKeywords.length > 0) {
      strategicInsights += '\n**High-Volume Opportunities:**\n';
      highVolumeKeywords.forEach(kw => {
        strategicInsights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches`;
        if (kw.competition) strategicInsights += `, ${kw.competition} competition`;
        strategicInsights += `)\n`;
      });
    }

    if (highGrowthKeywords.length > 0) {
      strategicInsights += '\n**Rising Trends:**\n';
      highGrowthKeywords.forEach(kw => {
        const growth = kw.yoyChange ? `+${(kw.yoyChange * 100).toFixed(0)}%` : `+${(kw.threeMonthChange! * 100).toFixed(0)}%`;
        strategicInsights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches, ${growth} growth)\n`;
      });
    }

    if (decliningKeywords.length > 0) {
      strategicInsights += '\n**Declining Terms:**\n';
      decliningKeywords.forEach(kw => {
        const decline = kw.yoyChange ? `${(kw.yoyChange * 100).toFixed(0)}%` : `${(kw.threeMonthChange! * 100).toFixed(0)}%`;
        strategicInsights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches, ${decline} decline)\n`;
      });
    }

    if (highValueKeywords.length > 0) {
      strategicInsights += '\n**High-Value Keywords (Premium CPC):**\n';
      highValueKeywords.forEach(kw => {
        strategicInsights += `- "${kw.keyword}" ($${kw.bidHigh!.toFixed(2)} CPC, ~${kw.searchVolume.toLocaleString()} searches, ${kw.competition} competition)\n`;
      });
    }

    if (lowCompetitionOpportunities.length > 0) {
      strategicInsights += '\n**Low-Competition Opportunities:**\n';
      lowCompetitionOpportunities.forEach(kw => {
        strategicInsights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches`;
        if (kw.bidHigh && kw.bidHigh > 0) strategicInsights += `, $${kw.bidHigh.toFixed(2)} CPC`;
        strategicInsights += `)\n`;
      });
    }

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `You are an expert market research and digital marketing analyst with deep knowledge of interpreting Google Keyword Planner data as a proxy for consumer behavior.\n\nThe current date is ${today}.\n\nI am providing a comprehensive keyword dataset from Google Keyword Planner for the ${brand} niche. This dataset uses a hybrid analysis approach to give you both granular detail and broad pattern recognition:\n\n**DATASET OVERVIEW:**\n- Total Keywords Analyzed: ${keywords.length.toLocaleString()}\n- Data Period: ${totalMonths} months\n- Average Monthly Search Volume: ${avgVolume.toLocaleString()}\n- Total Search Volume Across All Keywords: ${keywords.reduce((sum, kw) => sum + kw.searchVolume, 0).toLocaleString()}\n\n**TIER 1 - Top 25 Keywords (Full Details):**\n${tier1Keywords}\n${tier2Summary}\n${tier3Patterns}\n\n**STRATEGIC INSIGHTS FROM FULL DATASET:**\n${strategicInsights}\n\nBased on this comprehensive dataset, generate an in-depth analysis that answers key questions about market opportunities, customer behavior, and strategic positioning. Leverage insights from all three tiers:\n- **Tier 1** reveals top performers and immediate opportunities\n- **Tier 2** shows secondary markets and emerging niches\n- **Tier 3** uncovers long-tail themes and content gaps\n\nStructure your response exactly like this, using markdown:\n\n## Key Questions Answerable from the ${brand} Dataset\n[Brief intro paragraph explaining how this comprehensive dataset reveals consumer behavior across ${keywords.length.toLocaleString()} keywords]\n\nThen list the questions with this format:\n\n### 1. What is the Customer Demand?\n- **[Segment name]**: "[specific keyword]" at ~[X]M/K searches/month, but [trend observation]\n- **[Growth segment name]**: "[keyword]" at [X]K searches (+[X]% growth), "[keyword]" at [X]K searches (+[X]% growth)\n- **[Seasonal/pattern observation]**: "[keyword]" with [observation about spikes/patterns]\n- **Bottom line**: [One-sentence summary of where the market is large, where growth is happening, and what patterns matter]\n\n### 2. What is the Customer Interest?\n- **[Interest theme 1]**: "[keyword]" ([X]K searches, [growth]), showing [what this reveals about preferences]\n- **[Interest theme 2]**: "[keyword examples]" with [volume/growth], indicating [customer preference shift]\n- **[Brand/social observation]**: "[branded examples]" dominate curiosity, showing [viral/social appeal pattern]\n- **[Evergreen observation]**: "[keyword]" maintains [X]K searches, demonstrating [sustained baseline interest]\n- **Bottom line**: [One-sentence summary of how preferences are evolving and what's capturing attention]\n\n### 3. What are the Highest-Value Opportunities?\n[Analyze high-CPC keywords, high-volume terms, and low-competition opportunities]\n\n### 4. What Emerging Trends Should We Prioritize?\n[Focus on rising trends, high-growth keywords across all tiers]\n\n### 5. What Content Gaps and Long-Tail Opportunities Exist?\n[Use Tier 3 patterns to identify recurring themes and content needs]\n\n### 6. What is the Competitive Landscape?\n[Analyze competition levels, CPC data, and market saturation]\n\n### Additional Strategic Questions\n[2-3 more questions covering topics like: seasonal trends, customer intent patterns, geographic opportunities, product/service gaps, pricing signals, market maturity, risk factors]\n\nFor each question:\n- Question title (as ### heading)\n- Detailed answer using actual data from all tiers\n\nEnd with:\n\n## Recommended Next Steps\n[3-5 concrete action items based on the analysis]\n\n## Summary\n[Brief closing paragraph highlighting the most important insights]\n\nIMPORTANT GUIDELINES:\n- For Questions 1 & 2: Use bullet points with **bold segment names**, cite specific keywords with exact search volumes and growth rates, include a \"Bottom line\" summary\n- Reference actual keywords, search volumes, growth rates, CPC data, and patterns from all three tiers\n- Be professional, actionable, and evidence-based\n- Use markdown headings (##, ###) consistently\n- Make answers comprehensive and data-driven\n- Total response should be thorough (1800-2200 words)\n- When identifying opportunities, EXCLUDE keywords with local intent modifiers (\"near me\", \"in [city]\", etc.)\n- Connect insights across tiers to tell a complete market story\n- Quantify opportunities wherever possible (e.g., \"347 keywords represent X total monthly searches\")\n- Write in a natural, human tone - avoid robotic phrasing`;

    console.log("Calling OpenAI API...");

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert market research and digital marketing analyst with deep expertise in interpreting Google Keyword Planner data as a proxy for consumer behavior. You provide data-driven insights that reveal customer demand, market trends, and strategic opportunities. Your analysis is professional, evidence-based, and actionable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      const errorMessage = errorData.error?.message || openaiResponse.statusText;

      let userMessage = errorMessage;
      let errorCode = "OPENAI_ERROR";

      if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
        userMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at platform.openai.com/account/billing";
        errorCode = "QUOTA_EXCEEDED";
      } else if (errorMessage.includes("invalid") && errorMessage.includes("key")) {
        userMessage = "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.";
        errorCode = "INVALID_API_KEY";
      } else if (openaiResponse.status === 429) {
        userMessage = "Rate limit exceeded. Please wait a moment and try again.";
        errorCode = "RATE_LIMIT";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage,
          errorCode,
          originalError: errorMessage
        }),
        {
          status: openaiResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis returned from OpenAI");
    }

    console.log("Analysis generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        usage: openaiData.usage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error analyzing keywords:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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