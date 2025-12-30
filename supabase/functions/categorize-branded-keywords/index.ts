import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordForBrandAnalysis {
  id: number;
  keyword: string;
  brand: string;
}

interface BrandResult {
  keyword: string;
  is_branded: string;
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized: Invalid user token");
    }

    const { brand } = await req.json();

    if (!brand) {
      throw new Error("Brand name is required");
    }

    console.log(`Fetching keyword counts for brand: ${brand}, user: ${user.id}`);

    const { count: totalCount } = await supabaseClient
      .from("brand_keyword_data")
      .select("*", { count: "exact", head: true })
      .eq("brand", brand)
      .eq("user_id", user.id);

    console.log(`Total keywords for ${brand}: ${totalCount}`);
    console.log(`Fetching unanalyzed keywords for brand: ${brand}`);

    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, brand')
      .eq("brand", brand)
      .eq("user_id", user.id)
      .is("is_branded", null)
      .order('"Avg. monthly searches"', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All keywords already analyzed",
          updatedCount: 0,
          totalKeywords: totalCount || 0,
          alreadyAnalyzed: totalCount || 0,
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

    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      batches.push(keywords.slice(i, i + BATCH_SIZE));
    }

    console.log(`Created ${batches.length} batches of up to ${BATCH_SIZE} keywords each`);

    const MAX_BATCHES_PER_RUN = 1;
    const batchesToProcess = Math.min(batches.length, MAX_BATCHES_PER_RUN);

    console.log(`Processing ${batchesToProcess} batches this run (max ${BATCH_SIZE * MAX_BATCHES_PER_RUN} keywords)`);

    let totalUpdated = 0;
    const allErrors = [];

    for (let batchIndex = 0; batchIndex < batchesToProcess; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)...`);

      const keywordsList = batch.map((kw, idx) => 
        `${idx + 1}. "${kw.keyword}"`
      ).join('\n');

      const prompt = `You are analyzing search keywords to determine if they are BRANDED or NON-BRANDED for the brand: "${brand}"

**CRITICAL RULE:**
A keyword is BRANDED if and ONLY if it contains the EXACT brand name "${brand}" or close variations/misspellings of it.
A keyword is NON-BRANDED if it does NOT contain the brand name, regardless of topic relevance.

**BRANDED Examples (must contain "${brand}" or variations):**
- "${brand}" (exact brand name)
- "${brand.toLowerCase()}" (lowercase variation)
- "${brand} menu" (brand + product info)
- "${brand} near me" (brand + location)
- "${brand} prices" (brand + pricing)
- "buy ${brand.toLowerCase()}" (brand in search)
- Misspellings of "${brand}" (e.g., if brand is "7 Brew" then "7brew", "seven brew" would be branded)

**NON-BRANDED Examples (do NOT contain brand name):**
- "coffee near me" (generic category search)
- "best coffee shops" (generic category)
- "coffee place near me" (generic category)
- "starbucks" (competitor brand)
- "dunkin donuts" (competitor brand)
- "coffee menu" (generic product info)
- Any search that's related to the industry but doesn't mention "${brand}"

**Simple Test:**
Does the keyword contain "${brand}" or a clear variation of it?
- YES → It's BRANDED
- NO → It's NON-BRANDED

**Keywords to Analyze:**
${keywordsList}

**INSTRUCTIONS:**
1. Analyze ALL ${batch.length} keywords listed above
2. Apply the simple test: Does it contain the brand name "${brand}"?
3. Respond with a JSON object containing a "results" array
4. Each object must have:
   - keyword (exact match to the keyword)
   - is_branded (either "branded" or "non-branded")
   - reasoning (brief explanation)
5. Format: {"results": [{"keyword": "exact keyword text", "is_branded": "branded", "reasoning": "Contains brand name ${brand}"}]}

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
              content: "You are a keyword analyst. Your task is simple: determine if a keyword contains a specific brand name or not. A keyword is 'branded' ONLY if it contains the brand name or a clear variation of it. If it doesn't contain the brand name, it's 'non-branded' - even if it's related to the same industry or category. You always respond with valid JSON objects only, with no additional text or markdown formatting."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 8000,
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
        console.error(`No analysis returned for batch ${batchIndex + 1}`);
        allErrors.push({ batch: batchIndex + 1, error: "No analysis returned" });
        continue;
      }

      let results: BrandResult[];
      try {
        const parsed = JSON.parse(rawContent);

        results = parsed.results || parsed.keywords || parsed.data || parsed.categories;

        if (!Array.isArray(results)) {
          const arrayValues = Object.values(parsed).filter(v => Array.isArray(v));
          if (arrayValues.length > 0) {
            results = arrayValues[0] as BrandResult[];
          } else {
            console.error(`Parsed object structure for batch ${batchIndex + 1}:`, JSON.stringify(parsed, null, 2));
            throw new Error("No array found in response");
          }
        }

        if (!Array.isArray(results) || results.length === 0) {
          throw new Error("Response does not contain a valid array of results");
        }
      } catch (parseError) {
        console.error(`Failed to parse AI response for batch ${batchIndex + 1}:`, rawContent);
        allErrors.push({ batch: batchIndex + 1, error: `Parse error: ${parseError.message}` });
        continue;
      }

      console.log(`Batch ${batchIndex + 1}: Parsed ${results.length} results. Updating database...`);

      for (const result of results) {
        if (!result.keyword || !result.is_branded) {
          console.warn("Skipping invalid result:", result);
          continue;
        }

        const matchingKeyword = batch.find(
          kw => kw.keyword.toLowerCase().trim() === result.keyword.toLowerCase().trim()
        );

        if (matchingKeyword) {
          const { error: updateError } = await supabaseClient
            .from("brand_keyword_data")
            .update({
              is_branded: result.is_branded
            })
            .eq("id", matchingKeyword.id);

          if (updateError) {
            console.error(`Failed to update keyword "${result.keyword}":`, updateError);
            allErrors.push({ keyword: result.keyword, error: updateError.message });
          } else {
            totalUpdated++;
          }
        } else {
          console.warn(`No match found for keyword: "${result.keyword}"`);
        }
      }

      console.log(`Batch ${batchIndex + 1} complete. ${totalUpdated} keywords updated so far.`);
    }

    console.log(`All batches complete. Successfully updated ${totalUpdated} out of ${keywords.length} keywords`);

    const alreadyAnalyzed = (totalCount || 0) - keywords.length;
    const remainingUnanalyzed = keywords.length - totalUpdated;
    const hasMoreToProcess = remainingUnanalyzed > 0;

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount: totalUpdated,
        totalKeywords: totalCount || keywords.length,
        alreadyAnalyzed,
        remainingUnanalyzed,
        batchesProcessed: batchesToProcess,
        totalBatches: batches.length,
        hasMoreToProcess,
        message: hasMoreToProcess
          ? `Processed ${totalUpdated} keywords. Run again to process ${remainingUnanalyzed} remaining keywords.`
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
    console.error("Error analyzing branded keywords:", error);
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