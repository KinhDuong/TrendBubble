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
  'Avg. monthly searches'?: number;
  'Three month change'?: string;
  'YoY change'?: string;
  competition?: string;
}

interface CategoryResult {
  keyword: string;
  category: string;
  reasoning: string;
  insights: string;
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

    console.log(`Fetching keyword counts for brand: ${brand}`);

    const { count: totalCount } = await supabaseClient
      .from("brand_keyword_data")
      .select("*", { count: "exact", head: true })
      .eq("brand", brand);

    console.log(`Total keywords for ${brand}: ${totalCount}`);
    console.log(`Fetching uncategorized keywords for brand: ${brand}`);

    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, "Avg. monthly searches", "Three month change", "YoY change", competition')
      .eq("brand", brand)
      .is("ai_category", null)
      .order('"Avg. monthly searches"', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All keywords already categorized",
          updatedCount: 0,
          totalKeywords: totalCount || 0,
          alreadyCategorized: totalCount || 0,
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

    console.log(`Found ${keywords.length} keywords. Processing in batches...`);

    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      batches.push(keywords.slice(i, i + BATCH_SIZE));
    }

    console.log(`Created ${batches.length} batches of up to ${BATCH_SIZE} keywords each`);

    const MAX_BATCHES_PER_RUN = 4;
    const batchesToProcess = Math.min(batches.length, MAX_BATCHES_PER_RUN);

    console.log(`Processing ${batchesToProcess} batches this run (max ${BATCH_SIZE * MAX_BATCHES_PER_RUN} keywords)`);

    let totalUpdated = 0;
    const allErrors = [];

    for (let batchIndex = 0; batchIndex < batchesToProcess; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)...`);

      const keywordsSummary = batch.map((kw, idx) => {
        const parts = [
          `${idx + 1}. "${kw.keyword}"`,
          `Volume: ${(kw['Avg. monthly searches'] || 0).toLocaleString()}`
        ];

        if (kw['Three month change'] !== undefined && kw['Three month change'] !== null) {
          parts.push(`3-mo: ${kw['Three month change']}`);
        }

        if (kw['YoY change'] !== undefined && kw['YoY change'] !== null) {
          parts.push(`YoY: ${kw['YoY change']}`);
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

**Keywords to Categorize:**
${keywordsSummary}

**IMPORTANT INSTRUCTIONS:**
1. You must categorize ALL ${batch.length} keywords listed above
2. Respond with a JSON object containing a "categories" array
3. Each object in the array must have:
   - keyword (exact match)
   - category (one of the categories above)
   - reasoning (brief 1-sentence explanation of why this category was chosen)
   - insights (1-2 concise sentences with actionable strategic recommendations: growth opportunities, competitive positioning, or content strategy)
4. Format: {"categories": [{"keyword": "exact keyword text", "category": "Category Name", "reasoning": "Brief explanation", "insights": "Concise strategic recommendations"}]}

Respond with the JSON object now:`;

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
              content: "You are an expert SEO analyst who categorizes keywords based on growth patterns and Google Trends insights, and provides strategic insights for each keyword. You always respond with valid JSON objects only, with no additional text or markdown formatting."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 16000,
          response_format: { type: "json_object" }
        }),
      });

      console.log(`Batch ${batchIndex + 1}: OpenAI request completed`);

      if (!openaiResponse.ok) {
        let errorMessage = openaiResponse.statusText;
        try {
          const errorData = await openaiResponse.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          // If we can't parse error, use status text
        }
        console.error(`OpenAI API error on batch ${batchIndex + 1}:`, errorMessage);
        allErrors.push({ batch: batchIndex + 1, error: errorMessage });
        continue;
      }

      const openaiData = await openaiResponse.json();
      const rawContent = openaiData.choices[0]?.message?.content;

      if (!rawContent) {
        console.error(`No categorization returned for batch ${batchIndex + 1}`);
        allErrors.push({ batch: batchIndex + 1, error: "No categorization returned" });
        continue;
      }

      let categorizations: CategoryResult[];
      try {
        const parsed = JSON.parse(rawContent);

        categorizations = parsed.categories || parsed.keywords || parsed.results || parsed.data;

        if (!Array.isArray(categorizations)) {
          const arrayValues = Object.values(parsed).filter(v => Array.isArray(v));
          if (arrayValues.length > 0) {
            categorizations = arrayValues[0] as CategoryResult[];
          } else {
            console.error(`Parsed object structure for batch ${batchIndex + 1}:`, JSON.stringify(parsed, null, 2));
            throw new Error("No array found in response");
          }
        }

        if (!Array.isArray(categorizations) || categorizations.length === 0) {
          throw new Error("Response does not contain a valid array of categorizations");
        }
      } catch (parseError) {
        console.error(`Failed to parse AI response for batch ${batchIndex + 1}:`, rawContent);
        allErrors.push({ batch: batchIndex + 1, error: `Parse error: ${parseError.message}` });
        continue;
      }

      console.log(`Batch ${batchIndex + 1}: Parsed ${categorizations.length} categorizations. Updating database...`);

      for (const cat of categorizations) {
        if (!cat.keyword || !cat.category) {
          console.warn("Skipping invalid categorization:", cat);
          continue;
        }

        const matchingKeyword = batch.find(
          kw => kw.keyword.toLowerCase().trim() === cat.keyword.toLowerCase().trim()
        );

        if (matchingKeyword) {
          const { error: updateError } = await supabaseClient
            .from("brand_keyword_data")
            .update({
              ai_category: cat.category,
              ai_insights: cat.insights || null
            })
            .eq("id", matchingKeyword.id);

          if (updateError) {
            console.error(`Failed to update keyword "${cat.keyword}":`, updateError);
            allErrors.push({ keyword: cat.keyword, error: updateError.message });
          } else {
            totalUpdated++;
          }
        } else {
          console.warn(`No match found for keyword: "${cat.keyword}"`);
        }
      }

      console.log(`Batch ${batchIndex + 1} complete. ${totalUpdated} keywords updated so far.`);
    }

    console.log(`All batches complete. Successfully updated ${totalUpdated} out of ${keywords.length} keywords`);

    const alreadyCategorized = (totalCount || 0) - keywords.length;
    const remainingUncategorized = keywords.length - totalUpdated;
    const hasMoreToProcess = remainingUncategorized > 0;

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: totalUpdated,
        totalKeywords: totalCount || keywords.length,
        alreadyCategorized,
        remainingUncategorized,
        batchesProcessed: batchesToProcess,
        totalBatches: batches.length,
        hasMoreToProcess,
        message: hasMoreToProcess
          ? `Processed ${totalUpdated} keywords. Run again to process ${remainingUncategorized} remaining keywords.`
          : `All keywords processed successfully!`,
        errors: allErrors.length > 0 ? allErrors : undefined,
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