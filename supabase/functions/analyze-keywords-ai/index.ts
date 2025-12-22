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

    // Prepare keywords summary for GPT
    const topKeywords = keywords.slice(0, 20).map((kw, idx) => {
      const parts = [
        `${idx + 1}. ${kw.keyword}`,
        `Volume: ${kw.searchVolume.toLocaleString()}`
      ];
      
      if (kw.threeMonthChange !== undefined && kw.threeMonthChange !== null) {
        const change = (kw.threeMonthChange * 100).toFixed(1);
        parts.push(`3-mo: ${change}%`);
      }
      
      if (kw.yoyChange !== undefined && kw.yoyChange !== null) {
        const change = (kw.yoyChange * 100).toFixed(1);
        parts.push(`YoY: ${change}%`);
      }
      
      if (kw.competition) {
        parts.push(`Comp: ${kw.competition}`);
      }
      
      if (kw.bidHigh && kw.bidHigh > 0) {
        parts.push(`Bid: $${kw.bidHigh.toFixed(2)}`);
      }
      
      return parts.join(' | ');
    }).join('\n');

    const prompt = `You are an expert SEO and keyword research analyst. Analyze the following keyword data for the brand "${brand}" and provide actionable insights.

**Dataset Summary:**
- Total Keywords: ${keywords.length}
- Data Period: ${totalMonths} months
- Average Monthly Volume: ${avgVolume.toLocaleString()}

**Top 20 Keywords:**
${topKeywords}

**Analysis Required:**
1. **Key Opportunities**: Identify 3-5 high-potential keywords to focus on (consider growth, volume, and competition)
2. **Market Trends**: What do the trends reveal about the brand's market position and customer interests?
3. **Strategic Recommendations**: Provide 3-4 specific, actionable recommendations for SEO and content strategy
4. **Risk Areas**: Identify any declining keywords or competitive threats

Provide a clear, well-structured analysis in markdown format with clear headings. Be specific and reference actual keywords from the data. Keep the total response under 1000 words.`;

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
            content: "You are an expert SEO analyst who provides clear, actionable insights based on keyword data. You focus on practical recommendations that businesses can implement."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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