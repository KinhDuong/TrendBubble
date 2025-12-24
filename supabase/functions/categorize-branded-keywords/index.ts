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
    console.log(`Fetching unanalyzed keywords for brand: ${brand}`);

    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, brand')
      .eq("brand", brand)
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

    const BATCH_SIZE = 50;
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

      const keywordsList = batch.map((kw, idx) => 
        `${idx + 1}. "${kw.keyword}"`
      ).join('\n');

      const prompt = `You are an expert brand strategist analyzing search keywords. Determine if each keyword is BRANDED or NON-BRANDED for the brand "${brand}".

**BRANDED keywords:**
- Contain the brand name (e.g., "${brand.toLowerCase()} products", "buy ${brand.toLowerCase()}")
- Contain brand-specific product names, slogans, or trademarked terms
- Clearly reference the brand or its unique offerings
- Include brand misspellings or variations

**NON-BRANDED keywords:**
- Generic category terms (e.g., "coffee shops", "running shoes")
- Competitor brand names
- Industry terms without brand reference
- General informational queries

**Keywords to Analyze:**
${keywordsList}

**IMPORTANT INSTRUCTIONS:**
1. You must analyze ALL ${batch.length} keywords listed above
2. Respond with a JSON object containing a "results" array
3. Each object in the array must have:
   - keyword (exact match)
   - is_branded (either "branded" or "non-branded")
   - reasoning (brief 1-sentence explanation)
4. Format: {"results": [{"keyword": "exact keyword text", "is_branded": "branded", "reasoning": "Brief explanation"}]}

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
              content: "You are an expert brand strategist who analyzes keywords to determine if they are branded or non-branded. You always respond with valid JSON objects only, with no additional text or markdown formatting."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
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