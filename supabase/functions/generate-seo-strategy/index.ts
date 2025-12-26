import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { brand } = await req.json();

    if (!brand) {
      throw new Error("Brand name is required");
    }

    console.log(`Generating SEO strategy for brand: ${brand}`);

    // Check if strategy already exists
    const { data: existingStrategy } = await supabaseClient
      .from("brand_seo_strategy")
      .select("*")
      .eq("brand_name", brand)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingStrategy) {
      return new Response(
        JSON.stringify({
          success: true,
          data: existingStrategy,
          cached: true,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch keyword data for the brand
    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('keyword, "Avg. monthly searches", "Three month change", "YoY change", competition, ai_category, is_branded')
      .eq("brand", brand)
      .order('"Avg. monthly searches"', { ascending: false })
      .limit(200);

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      throw new Error("No keyword data found for this brand");
    }

    console.log(`Found ${keywords.length} keywords for ${brand}`);

    // Prepare dataset summary
    const totalVolume = keywords.reduce((sum, k) => sum + (k['Avg. monthly searches'] || 0), 0);
    const brandedKeywords = keywords.filter(k => k.is_branded);
    const nonBrandedKeywords = keywords.filter(k => !k.is_branded);
    
    // Get top keywords by category
    const topKeywordsByCategory: Record<string, any[]> = {};
    keywords.forEach(k => {
      const cat = k.ai_category || 'Uncategorized';
      if (!topKeywordsByCategory[cat]) {
        topKeywordsByCategory[cat] = [];
      }
      if (topKeywordsByCategory[cat].length < 5) {
        topKeywordsByCategory[cat].push(k);
      }
    });

    // Top 10 keywords
    const top10 = keywords.slice(0, 10);
    
    // Rising keywords (high growth)
    const risingKeywords = keywords.filter(k => {
      const yoy = k['YoY change'];
      const threeMo = k['Three month change'];
      if (typeof yoy === 'string' && yoy.includes('%')) {
        const yoyNum = parseFloat(yoy.replace('%', ''));
        if (yoyNum > 50) return true;
      }
      if (typeof threeMo === 'string' && threeMo.includes('%')) {
        const threeMoNum = parseFloat(threeMo.replace('%', ''));
        if (threeMoNum > 30) return true;
      }
      return false;
    }).slice(0, 10);

    const datasetSummary = `
Brand: ${brand}
Total Keywords Analyzed: ${keywords.length}
Total Monthly Search Volume: ${totalVolume.toLocaleString()}
Branded Keywords: ${brandedKeywords.length} (${((brandedKeywords.length / keywords.length) * 100).toFixed(1)}%)
Non-Branded Keywords: ${nonBrandedKeywords.length} (${((nonBrandedKeywords.length / keywords.length) * 100).toFixed(1)}%)

TOP 10 KEYWORDS BY VOLUME:
${top10.map((k, i) => `${i + 1}. "${k.keyword}" - ${(k['Avg. monthly searches'] || 0).toLocaleString()} searches/mo | 3mo: ${k['Three month change'] || 'N/A'} | YoY: ${k['YoY change'] || 'N/A'} | Competition: ${k.competition || 'N/A'} | ${k.is_branded ? 'BRANDED' : 'Non-branded'}`).join('\n')}

${risingKeywords.length > 0 ? `RISING/HIGH-GROWTH KEYWORDS:
${risingKeywords.map((k, i) => `${i + 1}. "${k.keyword}" - ${(k['Avg. monthly searches'] || 0).toLocaleString()} searches/mo | 3mo: ${k['Three month change'] || 'N/A'} | YoY: ${k['YoY change'] || 'N/A'} | Competition: ${k.competition || 'N/A'}`).join('\n')}` : ''}

${Object.keys(topKeywordsByCategory).length > 0 ? `KEYWORDS BY GROWTH CATEGORY:
${Object.entries(topKeywordsByCategory).map(([cat, kws]) => `\n${cat}:
${kws.map(k => `  - "${k.keyword}" (${(k['Avg. monthly searches'] || 0).toLocaleString()} searches, ${k['Three month change'] || 'N/A'} 3mo, ${k['YoY change'] || 'N/A'} YoY)`).join('\n')}`).join('\n')}` : ''}
`;

    const fullPrompt = `You are an expert SEO and content marketing strategist with deep experience using Google Keyword Planner data.

I am providing a keyword dataset from Google Keyword Planner for the ${brand} niche. Here are the key highlights from the dataset:
${datasetSummary}

Provide a detailed SEO & Content Strategy analysis focused on organic traffic growth. Structure your response exactly like this, using markdown:

### SEO & Content Strategy Insights from the Dataset (Organic Traffic Growth)

#### 1. High-Intent Keywords to Target
[Markdown table with columns: Keyword, Monthly Volume, Growth/Trend, Content Ideas & Why High-Intent]
List 5–8 top keywords with specific, actionable content suggestions (e.g., blog posts, guides, reviews, comparisons, listicles).

#### 2. Spotting Content Gaps
Bullet points highlighting content opportunities and gaps revealed by the data (e.g., seasonal trends, customization, emerging niches). Suggest timely or evergreen content ideas.

#### 3. Competitor Insight & Traffic Interception
Explain how branded dominance or broad term saturation creates opportunities. Suggest specific interception strategies with content examples (e.g., alternatives, dupes, recipes, comparisons).

#### Recommended Content Calendar (Based on Dataset Trends)
[Markdown table with columns: Month/Season, Keyword Focus, Content Type]
Include seasonal timing where relevant, plus evergreen suggestions.

End with a short "Bottom Line" summary of the overall SEO/content strategy.

Use current 2025 trends where applicable. Be actionable, specific, and professional. Use real markdown tables for clarity.`;

    console.log(`Calling OpenAI to generate SEO strategy...`);

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
            content: "You are an expert SEO and content marketing strategist. You analyze keyword data and provide detailed, actionable SEO strategies. Always use proper markdown formatting including tables."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      let errorMessage = openaiResponse.statusText;
      try {
        const errorData = await openaiResponse.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // If we can't parse error, use status text
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis returned from AI");
    }

    console.log(`AI analysis generated successfully. Saving to database...`);

    // Save to database
    const { data: savedStrategy, error: saveError } = await supabaseClient
      .from("brand_seo_strategy")
      .insert({
        brand_name: brand,
        user_id: user.id,
        prompt: fullPrompt,
        analysis: analysis,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save strategy: ${saveError.message}`);
    }

    console.log(`SEO strategy saved successfully for ${brand}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: savedStrategy,
        cached: false,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating SEO strategy:", error);
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