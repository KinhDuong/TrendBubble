import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordForCategorization {
  id: number;
  keyword: string;
  avg_monthly_searches?: number;
  three_month_change?: number;
  year_over_year_change?: number;
  competition?: string;
}

interface CategoryResult {
  keyword: string;
  category: string;
  reasoning: string;
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { brand } = await req.json();

    if (!brand) {
      throw new Error("Brand name is required");
    }

    console.log(`Fetching keywords for brand: ${brand}`);

    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select("id, keyword, avg_monthly_searches, three_month_change, year_over_year_change, competition")
      .eq("brand", brand)
      .order("avg_monthly_searches", { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No keywords found for this brand",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Found ${keywords.length} keywords. Preparing for AI analysis...`);

    const keywordsSummary = keywords.slice(0, 50).map((kw, idx) => {
      const parts = [
        `${idx + 1}. "${kw.keyword}"`,
        `Volume: ${(kw.avg_monthly_searches || 0).toLocaleString()}`
      ];
      
      if (kw.three_month_change !== undefined && kw.three_month_change !== null) {
        const change = (kw.three_month_change * 100).toFixed(1);
        parts.push(`3-mo: ${change}%`);
      }
      
      if (kw.year_over_year_change !== undefined && kw.year_over_year_change !== null) {
        const change = (kw.year_over_year_change * 100).toFixed(1);
        parts.push(`YoY: ${change}%`);
      }
      
      if (kw.competition) {
        parts.push(`Comp: ${kw.competition}`);
      }
      
      return parts.join(' | ');
    }).join('\n');

    const prompt = `You are an expert SEO analyst with access to Google Trends data. Analyze the following keyword data for the brand "${brand}" and categorize EACH keyword into ONE of these growth categories:

**Available Categories:**
- "Explosive Growth" - Keywords with exceptional growth (typically >500% YoY or >200% 3-month)
- "High Potential" - Keywords showing acceleration patterns and breakout signals. Look for: strong 3-month growth outpacing YoY (indicates recent momentum), increasing velocity, patterns similar to past viral trends, or early signals that suggest imminent explosion
- "Rising Star" - Keywords with strong upward momentum (100-500% YoY or 50-200% 3-month)
- "Steady Growth" - Keywords with consistent positive growth (20-100% YoY or 10-50% 3-month)
- "Stable" - Keywords with minimal change (-20% to +20%)
- "Declining" - Keywords losing traction (<-20%)
- "High Volume Stable" - Stable keywords with very high search volume (>10,000 monthly searches)
- "Emerging" - Low volume but showing early growth signals

**Additional Context:**
When categorizing, consider:
1. Use your knowledge of Google Trends to understand if these keywords align with broader trending topics
2. For "High Potential": Look for ACCELERATION not just growth. Compare 3-month vs YoY to spot recent momentum shifts. Use your Google Trends knowledge to identify patterns similar to keywords that became breakout hits
3. Consider seasonality and industry-specific patterns
4. Look at the combination of volume, growth rate, and competition
5. High competition + accelerating growth often indicates a keyword about to explode

**Keywords to Categorize (Top 50 by volume):**
${keywordsSummary}

**IMPORTANT INSTRUCTIONS:**
1. You must categorize ALL ${Math.min(50, keywords.length)} keywords listed above
2. Respond ONLY with a valid JSON array, no additional text
3. Each object must have: keyword (exact match), category (one of the categories above), reasoning (brief 1-sentence explanation)
4. Format: [{"keyword": "exact keyword text", "category": "Category Name", "reasoning": "Brief explanation"}]

Respond with the JSON array now:`;

    console.log("Calling OpenAI API for categorization...");

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
            content: "You are an expert SEO analyst who categorizes keywords based on growth patterns and Google Trends insights. You always respond with valid JSON arrays only, with no additional text or markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      const errorMessage = errorData.error?.message || openaiResponse.statusText;
      console.error("OpenAI API error:", errorMessage);

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          errorCode: "OPENAI_ERROR"
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
    const rawContent = openaiData.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No categorization returned from OpenAI");
    }

    console.log("Parsing AI response...");
    
    let categorizations: CategoryResult[];
    try {
      const parsed = JSON.parse(rawContent);
      categorizations = parsed.categories || parsed.keywords || parsed;
      
      if (!Array.isArray(categorizations)) {
        throw new Error("Response is not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error(`Failed to parse AI categorization: ${parseError.message}`);
    }

    console.log(`Parsed ${categorizations.length} categorizations. Updating database...`);

    let updatedCount = 0;
    const errors = [];

    for (const cat of categorizations) {
      if (!cat.keyword || !cat.category) {
        console.warn("Skipping invalid categorization:", cat);
        continue;
      }

      const matchingKeyword = keywords.find(
        kw => kw.keyword.toLowerCase().trim() === cat.keyword.toLowerCase().trim()
      );

      if (matchingKeyword) {
        const { error: updateError } = await supabaseClient
          .from("brand_keyword_data")
          .update({ ai_category: cat.category })
          .eq("id", matchingKeyword.id);

        if (updateError) {
          console.error(`Failed to update keyword "${cat.keyword}":`, updateError);
          errors.push({ keyword: cat.keyword, error: updateError.message });
        } else {
          updatedCount++;
        }
      } else {
        console.warn(`No match found for keyword: "${cat.keyword}"`);
      }
    }

    console.log(`Successfully updated ${updatedCount} keywords`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        totalKeywords: keywords.length,
        categorizations: categorizations.slice(0, 10),
        errors: errors.length > 0 ? errors : undefined,
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
    console.error("Error categorizing keywords:", error);
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