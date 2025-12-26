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

    // Fetch keyword data for the brand - only raw metrics
    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('keyword, "Avg. monthly searches", "Three month change", "YoY change", competition')
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

    // Format keywords as CSV-like data for GPT-4
    const keywordDataCSV = keywords.map((k, i) =>
      `${i + 1}. "${k.keyword}" | Volume: ${(k['Avg. monthly searches'] || 0).toLocaleString()}/mo | 3-Month Change: ${k['Three month change'] || 'N/A'} | YoY Change: ${k['YoY change'] || 'N/A'} | Competition: ${k.competition || 'N/A'}`
    ).join('\n');

    const datasetSummary = `
Brand: ${brand}
Total Keywords Analyzed: ${keywords.length}
Total Monthly Search Volume: ${keywords.reduce((sum, k) => sum + (k['Avg. monthly searches'] || 0), 0).toLocaleString()}

RAW KEYWORD DATA (sorted by search volume):
${keywordDataCSV}
`;

    const fullPrompt = `You are an expert SEO and content marketing strategist analyzing keyword data from Google Keyword Planner.

BRAND: ${brand}

YOUR TASK:
1. **Identify Branded vs. Non-Branded Keywords**: Determine which keywords contain the brand name or are direct brand variations (branded), versus generic industry/product terms (non-branded).

2. **Categorize Keywords Strategically**: Group all keywords into meaningful categories such as:
   - High Potential (high volume, strong growth, moderate competition)
   - Rising Stars (strong growth trends, emerging opportunities)
   - Competitive Challenges (high volume but saturated/high competition)
   - Niche Opportunities (lower volume but targeted, low competition)
   - Brand Protection (branded terms to defend/optimize)
   - Other relevant categories you identify

3. **Analyze Growth Patterns**: Identify trending keywords based on 3-month and year-over-year changes.

4. **Prioritize Top 10 Opportunities**: List the most strategic keywords to target and explain why each matters.

5. **Provide Actionable Recommendations**: Create specific SEO and content strategies.

RAW KEYWORD DATA:
${datasetSummary}

STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS (using proper markdown):

### SEO Strategy Analysis for ${brand}

#### Executive Summary
Brief overview of key findings (3-4 sentences).

#### Branded vs. Non-Branded Breakdown
- **Branded Keywords**: Count and % (keywords containing brand name)
- **Non-Branded Keywords**: Count and % (generic industry terms)
- **Strategic Implications**: What this ratio means for the brand's SEO strategy

#### Strategic Keyword Categories
[Markdown table with columns: Category, # Keywords, Total Volume, Key Examples, Strategic Focus]

Organize keywords into your identified categories and explain what each category means for the strategy.

#### Top 10 Priority Keywords
[Markdown table with columns: Rank, Keyword, Type (Branded/Non-Branded), Volume, Growth Trend, Why Priority]

Explain specifically why each keyword is a top opportunity.

#### Growth Opportunities Analysis
- **Rising Trends**: Keywords with strongest growth (3-month and YoY)
- **Quick Wins**: Low competition, decent volume opportunities
- **Long-term Plays**: High volume competitive terms worth pursuing

#### Content & SEO Recommendations
##### Organic Traffic Growth
- Specific content types to create (guides, comparisons, how-tos, etc.)
- Content gaps to fill
- Seasonal opportunities

##### Technical SEO Priorities
- On-page optimization priorities
- Internal linking strategies
- User intent optimization

#### Advertising Recommendations (Optional)
If applicable, suggest paid search opportunities for high-intent keywords where organic ranking may be challenging.

#### Recommended Content Calendar
[Markdown table with columns: Timeframe, Keyword Focus, Content Type, Priority]

#### Bottom Line
2-3 sentence summary of the overall strategy and expected impact.

Use current 2025 trends and best practices. Be specific, actionable, and data-driven. Use proper markdown tables throughout.`;

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
            content: "You are an expert SEO and content marketing strategist with deep expertise in keyword research and competitive analysis. Your role is to analyze raw keyword data from Google Keyword Planner and identify patterns, opportunities, and strategic insights. You excel at identifying branded vs. non-branded keywords, categorizing keywords strategically, spotting growth trends, and creating actionable SEO strategies. Always use proper markdown formatting including tables for clarity and professionalism."
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