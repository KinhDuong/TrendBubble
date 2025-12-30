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

    const topKeywords = keywords.slice(0, 30).map((kw, idx) => {
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

    const highGrowthKeywords = keywords.filter(kw =>
      (kw.threeMonthChange && kw.threeMonthChange > 0.3) || (kw.yoyChange && kw.yoyChange > 0.5)
    ).slice(0, 5);

    const decliningKeywords = keywords.filter(kw =>
      (kw.threeMonthChange && kw.threeMonthChange < -0.2) || (kw.yoyChange && kw.yoyChange < -0.3)
    ).slice(0, 3);

    const highVolumeKeywords = keywords.filter(kw => kw.searchVolume > avgVolume * 2).slice(0, 5);

    const highValueKeywords = keywords.filter(kw => kw.bidHigh && kw.bidHigh > 5).slice(0, 5);

    let datasetHighlights = '';

    if (highVolumeKeywords.length > 0) {
      datasetHighlights += '\n**High-Volume Terms:**\n';
      highVolumeKeywords.forEach(kw => {
        datasetHighlights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches)\n`;
      });
    }

    if (highGrowthKeywords.length > 0) {
      datasetHighlights += '\n**Rising Trends/Niches:**\n';
      highGrowthKeywords.forEach(kw => {
        const growth = kw.yoyChange ? `+${(kw.yoyChange * 100).toFixed(0)}%` : `+${(kw.threeMonthChange! * 100).toFixed(0)}%`;
        datasetHighlights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches, ${growth} growth)\n`;
      });
    }

    if (decliningKeywords.length > 0) {
      datasetHighlights += '\n**Declining Terms:**\n';
      decliningKeywords.forEach(kw => {
        const decline = kw.yoyChange ? `${(kw.yoyChange * 100).toFixed(0)}%` : `${(kw.threeMonthChange! * 100).toFixed(0)}%`;
        datasetHighlights += `- "${kw.keyword}" (~${kw.searchVolume.toLocaleString()} searches, ${decline} decline)\n`;
      });
    }

    if (highValueKeywords.length > 0) {
      datasetHighlights += '\n**High-Value Keywords (CPC):**\n';
      highValueKeywords.forEach(kw => {
        datasetHighlights += `- "${kw.keyword}" ($${kw.bidHigh!.toFixed(2)} CPC, ${kw.competition} competition)\n`;
      });
    }

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `You are an expert market research and digital marketing analyst with deep knowledge of interpreting Google Keyword Planner data as a proxy for consumer behavior.\n\nThe current date is ${today}.\n\nI am providing a keyword dataset from Google Keyword Planner for the ${brand} niche. Key highlights include:\n\n**Dataset Overview:**\n- Total Keywords Analyzed: ${keywords.length}\n- Data Period: ${totalMonths} months\n- Average Monthly Search Volume: ${avgVolume.toLocaleString()}\n${datasetHighlights}\n\n**Top 30 Keywords with Full Details:**\n${topKeywords}\n\nBased on this dataset, generate a list of key questions that can be answered using the data. Treat search volume and trends as proxies for customer demand, interest, and intent.\n\nStructure your response exactly like this, using markdown:\n\n### Key Questions Answerable from the ${brand} Dataset\n[Brief intro paragraph explaining how the dataset reveals consumer behavior]\n\nThen list the questions with this format:\n\n#### 1. What is the Customer Demand?\n**Answer from Dataset:** [concise summary based on search volumes and trends]\n**Why Valuable:** [brief explanation of business value]\n\n#### 2. What is the Customer Interest?\n**Answer from Dataset:** [concise summary based on emerging trends and growth rates]\n**Why Valuable:** [brief explanation of business value]\n\n#### Other Important Questions Answerable from the Dataset\n[8–10 additional questions, grouped into categories like Marketing & Strategy, Product & Trend, Competitive & Market, Forecasting & Business]\n\nFor each additional question:\n- Question title (as #### heading)\n- **Answer from Dataset:** [summary based on actual data]\n- **Why Valuable:** [actionable benefit]\n\nEnd with a short closing paragraph offering to expand on any question.\n\nIMPORTANT:\n- Use actual keywords, search volumes, growth rates, and CPC data from the dataset provided\n- Be professional, actionable, and evidence-based\n- Use markdown headings (###, ####) as shown in the structure\n- Keep answers concise but data-driven\n- Total response should be comprehensive (1200-1500 words)\n- When identifying low-competition keyword opportunities, EXCLUDE any keywords with local search intent modifiers such as: \"near me\", \"nearby\", \"close to me\", \"around me\", \"in [city]\", or similar location-based terms. These require physical presence and local SEO strategies, making them unsuitable for most businesses.`;

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