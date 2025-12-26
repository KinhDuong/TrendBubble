import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordData {
  keyword: string;
  competition?: string;
  'Avg. monthly searches'?: number;
  'Top of page bid (low range)'?: number;
  'Top of page bid (high range)'?: number;
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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      .select('keyword, competition, "Avg. monthly searches", "Top of page bid (low range)", "Top of page bid (high range)"')
      .eq("brand", brandPage.brand)
      .eq("user_id", user.id)
      .not('"Top of page bid (low range)"', "is", null);

    if (keywordsError) {
      throw keywordsError;
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          insights_markdown: "No keyword data available for PPC analysis. Please upload keyword data first."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keywordSummary = keywords.map(kw => {
      const lowBid = kw['Top of page bid (low range)'] || 0;
      const highBid = kw['Top of page bid (high range)'] || 0;
      const avgCpc = lowBid && highBid ? ((lowBid + highBid) / 2).toFixed(2) : (lowBid || highBid || 0).toFixed(2);
      const volume = kw['Avg. monthly searches'] || 0;

      return `- "${kw.keyword}" (~${volume.toLocaleString()} searches, ${kw.competition || 'unknown'} competition, $${lowBid.toFixed(2)}–$${highBid.toFixed(2)} CPC)`;
    }).join('\n');

    const prompt = `You are an expert PPC strategist and Google Ads specialist with deep experience optimizing for ROAS using Keyword Planner data.

I am providing a keyword dataset from Google Keyword Planner for the ${brandPage.brand} brand/niche. Key highlights:

${keywordSummary}

Provide a detailed PPC / Google Ads Campaigns analysis focused on paid traffic and ROAS. Structure your response exactly like this, using markdown:

### PPC / Google Ads Campaigns Insights from the Dataset (Paid Traffic & ROAS)

#### 1. High-ROAS Keywords to Target
[Markdown table with columns: Keyword, Monthly Volume, Avg CPC (est.), Competition, Growth/Trend, Why High-ROAS for Ads]
List 5–8 top keywords. Explain why they deliver strong returns (e.g., high LTV, conversion rates, intent strength).

#### 2. Seasonal & Trend Timing Opportunities
Bullet points on timing opportunities (e.g., spikes, emerging trends). Suggest when to ramp up budgets and related keywords (including alternatives/interception).

#### 3. Keywords to Avoid or Use Cautiously (Low ROAS Traps)
Bullet points explaining low-performing patterns (e.g., broad/local, vague intent, trademark risks). Recommend as negative keywords.

#### 4. Recommended Campaign Types & Budget Tips
[Markdown table with columns: Campaign Focus, Recommended Type, Budget/Timing Tips]
Suggest Search, Shopping, PMax, etc., with allocation ideas.

#### Bottom Line
Short summary of the overall PPC strategy (focus areas, bidding tips, optimization advice).

Use current 2025 trends and realistic CPC/ROAS benchmarks. Be actionable, specific, and professional. Use real markdown tables for clarity.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const insightsMarkdown = openaiData.choices[0].message.content;

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
          insights: { markdown: insightsMarkdown },
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
          insights: { markdown: insightsMarkdown }
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
        insights_markdown: insightsMarkdown,
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