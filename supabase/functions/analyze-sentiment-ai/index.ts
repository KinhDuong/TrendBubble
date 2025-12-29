import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordForSentiment {
  id: number;
  keyword: string;
  'Avg. monthly searches'?: number;
}

interface SentimentResult {
  keyword: string;
  sentiment: number;
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

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
    console.log(`Fetching keywords without sentiment for brand: ${brand}`);

    const { data: keywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, "Avg. monthly searches"')
      .eq("brand", brand)
      .is("sentiment", null)
      .order('"Avg. monthly searches"', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All keywords already have sentiment analysis",
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

    const BATCH_SIZE = 1000;
    const batches = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      batches.push(keywords.slice(i, i + BATCH_SIZE));
    }

    console.log(`Created ${batches.length} batches of up to ${BATCH_SIZE} keywords each`);

    const MAX_BATCHES_PER_RUN = 3;
    const batchesToProcess = Math.min(batches.length, MAX_BATCHES_PER_RUN);

    console.log(`Processing ${batchesToProcess} batches this run (max ${BATCH_SIZE * MAX_BATCHES_PER_RUN} keywords)`);

    let totalUpdated = 0;
    const allErrors = [];

    for (let batchIndex = 0; batchIndex < batchesToProcess; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)...`);

      const keywordsSummary = batch.map((kw, idx) => {
        return `${idx + 1}. "${kw.keyword}" (Volume: ${(kw['Avg. monthly searches'] || 0).toLocaleString()})`;
      }).join('\n');

      const prompt = `You are an expert sentiment analyst. Analyze the sentiment of the following keywords for the brand "${brand}". 

**Keywords to Analyze:**
${keywordsSummary}

**IMPORTANT INSTRUCTIONS:**
1. Analyze the sentiment of each keyword on a scale from -1.0 (most negative) to 1.0 (most positive)
2. Consider:
   - The inherent sentiment of the keyword itself
   - How the keyword relates to the brand (positive association, negative association, or neutral)
   - Intent behind the search (informational, transactional, navigational)
   - Whether the keyword indicates problems, complaints, or positive interest
3. Examples:
   - "best [brand] features" → positive (~0.7 to 0.9)
   - "[brand] review" → neutral (~-0.1 to 0.1)
   - "[brand] problems" → negative (~-0.7 to -0.9)
   - "[brand] alternatives" → slightly negative (~-0.3 to -0.5)
   - "how to use [brand]" → neutral to positive (~0.1 to 0.3)
4. Respond with a JSON object containing a "sentiments" array
5. Each object must have:
   - keyword (exact match)
   - sentiment (number between -1.0 and 1.0, can use decimals)
   - reasoning (brief 1-sentence explanation)
6. Format: {"sentiments": [{"keyword": "exact keyword text", "sentiment": 0.5, "reasoning": "Brief explanation"}]}

Respond with the JSON object now:`;

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert sentiment analyst who analyzes keywords and provides sentiment scores from -1.0 (most negative) to 1.0 (most positive). You always respond with valid JSON objects only, with no additional text or markdown formatting."
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
        console.error(`No sentiment analysis returned for batch ${batchIndex + 1}`);
        allErrors.push({ batch: batchIndex + 1, error: "No sentiment analysis returned" });
        continue;
      }

      let sentiments: SentimentResult[];
      try {
        const parsed = JSON.parse(rawContent);

        sentiments = parsed.sentiments || parsed.keywords || parsed.results || parsed.data;

        if (!Array.isArray(sentiments)) {
          const arrayValues = Object.values(parsed).filter(v => Array.isArray(v));
          if (arrayValues.length > 0) {
            sentiments = arrayValues[0] as SentimentResult[];
          } else {
            console.error(`Parsed object structure for batch ${batchIndex + 1}:`, JSON.stringify(parsed, null, 2));
            throw new Error("No array found in response");
          }
        }

        if (!Array.isArray(sentiments) || sentiments.length === 0) {
          throw new Error("Response does not contain a valid array of sentiments");
        }
      } catch (parseError) {
        console.error(`Failed to parse AI response for batch ${batchIndex + 1}:`, rawContent);
        allErrors.push({ batch: batchIndex + 1, error: `Parse error: ${parseError.message}` });
        continue;
      }

      console.log(`Batch ${batchIndex + 1}: Parsed ${sentiments.length} sentiments. Updating database...`);

      for (const sent of sentiments) {
        if (!sent.keyword || sent.sentiment === undefined || sent.sentiment === null) {
          console.warn("Skipping invalid sentiment:", sent);
          continue;
        }

        const matchingKeyword = batch.find(
          kw => kw.keyword.toLowerCase().trim() === sent.keyword.toLowerCase().trim()
        );

        if (matchingKeyword) {
          const clampedSentiment = Math.max(-1, Math.min(1, sent.sentiment));
          
          const { error: updateError } = await supabaseClient
            .from("brand_keyword_data")
            .update({
              sentiment: clampedSentiment
            })
            .eq("id", matchingKeyword.id);

          if (updateError) {
            console.error(`Failed to update keyword "${sent.keyword}":`, updateError);
            allErrors.push({ keyword: sent.keyword, error: updateError.message });
          } else {
            totalUpdated++;
          }
        } else {
          console.warn(`No match found for keyword: "${sent.keyword}"`);
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
          ? `Analyzed ${totalUpdated} keywords. Run again to process ${remainingUnanalyzed} remaining keywords.`
          : `All keywords analyzed successfully!`,
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
    console.error("Error analyzing sentiment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error) || "Unknown error occurred",
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
