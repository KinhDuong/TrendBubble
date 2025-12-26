import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordData {
  id: number;
  keyword: string;
  "Avg. monthly searches": number | null;
  competition: string | null;
}

interface VolumeBrackets {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  min: number;
}

function calculateVolumeBrackets(keywords: KeywordData[]): VolumeBrackets {
  const volumes = keywords
    .map(k => k["Avg. monthly searches"])
    .filter((v): v is number => v !== null && v > 0)
    .sort((a, b) => a - b);

  if (volumes.length === 0) {
    return { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, max: 0, min: 0 };
  }

  const getPercentile = (p: number) => {
    const index = Math.floor(volumes.length * p);
    return volumes[Math.min(index, volumes.length - 1)];
  };

  return {
    min: volumes[0],
    p25: getPercentile(0.25),
    p50: getPercentile(0.50),
    p75: getPercentile(0.75),
    p90: getPercentile(0.90),
    p95: getPercentile(0.95),
    max: volumes[volumes.length - 1],
  };
}

function detectBrandedByCompetition(
  keyword: KeywordData,
  brackets: VolumeBrackets,
  brandName: string
): { is_branded: string; reasoning: string } {
  const volume = keyword["Avg. monthly searches"];
  const competition = keyword.competition;
  const kw = keyword.keyword.toLowerCase();
  const brand = brandName.toLowerCase();

  if (volume === null || volume === 0) {
    return {
      is_branded: "unknown",
      reasoning: "No volume data available"
    };
  }

  if (kw.includes(brand)) {
    return {
      is_branded: "branded",
      reasoning: `Contains brand name "${brandName}"`
    };
  }

  if (!competition) {
    return {
      is_branded: "unknown",
      reasoning: "No competition data available"
    };
  }

  const compLower = competition.toLowerCase();

  if (volume >= brackets.p95) {
    if (compLower === "low") {
      return {
        is_branded: "branded",
        reasoning: `Top 5% volume (${volume.toLocaleString()}) with Low competition - highly suspicious for non-branded`
      };
    }
    if (compLower === "medium" && volume >= brackets.p95 * 1.5) {
      return {
        is_branded: "branded",
        reasoning: `Extremely high volume (${volume.toLocaleString()}, 150%+ of p95) with Medium competition - likely branded`
      };
    }
  }

  if (volume >= brackets.p90) {
    if (compLower === "low") {
      return {
        is_branded: "branded",
        reasoning: `Top 10% volume (${volume.toLocaleString()}) with Low competition - likely branded`
      };
    }
  }

  return {
    is_branded: "non-branded",
    reasoning: `Standard competitive profile: ${volume.toLocaleString()} searches, ${competition} competition`
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { brand } = await req.json();

    if (!brand) {
      throw new Error("Brand name is required");
    }

    console.log(`Analyzing branded keywords using competitive logic for: ${brand}`);

    const { data: allKeywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, "Avg. monthly searches", competition')
      .eq("brand", brand);

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!allKeywords || allKeywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No keywords found for this brand",
          updatedCount: 0,
          totalKeywords: 0,
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

    console.log(`Calculating volume brackets for ${allKeywords.length} keywords...`);
    const brackets = calculateVolumeBrackets(allKeywords);

    console.log("Volume Distribution:", {
      min: brackets.min.toLocaleString(),
      p25: brackets.p25.toLocaleString(),
      median: brackets.p50.toLocaleString(),
      p75: brackets.p75.toLocaleString(),
      p90: brackets.p90.toLocaleString(),
      p95: brackets.p95.toLocaleString(),
      max: brackets.max.toLocaleString(),
    });

    const { data: unanalyzedKeywords, error: unanalyzedError } = await supabaseClient
      .from("brand_keyword_data")
      .select('id, keyword, "Avg. monthly searches", competition')
      .eq("brand", brand)
      .is("is_branded", null);

    if (unanalyzedError) {
      throw new Error(`Failed to fetch unanalyzed keywords: ${unanalyzedError.message}`);
    }

    if (!unanalyzedKeywords || unanalyzedKeywords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All keywords already analyzed",
          updatedCount: 0,
          totalKeywords: allKeywords.length,
          alreadyAnalyzed: allKeywords.length,
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

    console.log(`Analyzing ${unanalyzedKeywords.length} unanalyzed keywords...`);

    let updatedCount = 0;
    const errors = [];

    for (const keyword of unanalyzedKeywords) {
      try {
        const result = detectBrandedByCompetition(keyword, brackets, brand);

        const { error: updateError } = await supabaseClient
          .from("brand_keyword_data")
          .update({
            is_branded: result.is_branded,
          })
          .eq("id", keyword.id);

        if (updateError) {
          console.error(`Failed to update keyword "${keyword.keyword}":`, updateError);
          errors.push({ keyword: keyword.keyword, error: updateError.message });
        } else {
          updatedCount++;
          if (result.is_branded === "branded") {
            console.log(`✓ BRANDED: "${keyword.keyword}" - ${result.reasoning}`);
          }
        }
      } catch (err: any) {
        console.error(`Error processing keyword "${keyword.keyword}":`, err);
        errors.push({ keyword: keyword.keyword, error: err.message });
      }
    }

    console.log(`Analysis complete. Updated ${updatedCount} of ${unanalyzedKeywords.length} keywords`);

    const brandedCount = unanalyzedKeywords.filter(k => {
      const result = detectBrandedByCompetition(k, brackets, brand);
      return result.is_branded === "branded";
    }).length;

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        totalKeywords: allKeywords.length,
        alreadyAnalyzed: allKeywords.length - unanalyzedKeywords.length,
        brandedDetected: brandedCount,
        volumeBrackets: {
          p50: brackets.p50,
          p75: brackets.p75,
          p90: brackets.p90,
          p95: brackets.p95,
          max: brackets.max,
        },
        message: `Successfully analyzed ${updatedCount} keywords using competitive logic. Detected ${brandedCount} branded keywords based on volume/competition analysis.`,
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
  } catch (error: any) {
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