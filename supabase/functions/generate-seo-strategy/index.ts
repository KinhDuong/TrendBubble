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

    const { brand, forceRegenerate } = await req.json();

    if (!brand) {
      throw new Error("Brand name is required");
    }

    console.log(`Generating SEO strategy for brand: ${brand}${forceRegenerate ? ' (force regenerate)' : ''}`);

    // Check if strategy already exists
    const { data: existingStrategy } = await supabaseClient
      .from("brand_seo_strategy")
      .select("*")
      .eq("brand_name", brand)
      .eq("user_id", user.id)
      .maybeSingle();

    // If forcing regeneration, delete the existing strategy
    if (forceRegenerate && existingStrategy) {
      console.log(`Deleting existing strategy for ${brand} before regeneration`);
      await supabaseClient
        .from("brand_seo_strategy")
        .delete()
        .eq("brand_name", brand)
        .eq("user_id", user.id);
    } else if (existingStrategy && !forceRegenerate) {
      // For cached strategies, recalculate top50 data for display
      // Fetch keyword data with monthly columns
      const monthlyColumns = [
        'Searches: Dec 2021', 'Searches: Jan 2022', 'Searches: Feb 2022', 'Searches: Mar 2022',
        'Searches: Apr 2022', 'Searches: May 2022', 'Searches: Jun 2022', 'Searches: Jul 2022',
        'Searches: Aug 2022', 'Searches: Sep 2022', 'Searches: Oct 2022', 'Searches: Nov 2022',
        'Searches: Dec 2022', 'Searches: Jan 2023', 'Searches: Feb 2023', 'Searches: Mar 2023',
        'Searches: Apr 2023', 'Searches: May 2023', 'Searches: Jun 2023', 'Searches: Jul 2023',
        'Searches: Aug 2023', 'Searches: Sep 2023', 'Searches: Oct 2023', 'Searches: Nov 2023',
        'Searches: Dec 2023', 'Searches: Jan 2024', 'Searches: Feb 2024', 'Searches: Mar 2024',
        'Searches: Apr 2024', 'Searches: May 2024', 'Searches: Jun 2024', 'Searches: Jul 2024',
        'Searches: Aug 2024', 'Searches: Sep 2024', 'Searches: Oct 2024', 'Searches: Nov 2024',
        'Searches: Dec 2024', 'Searches: Jan 2025', 'Searches: Feb 2025', 'Searches: Mar 2025',
        'Searches: Apr 2025', 'Searches: May 2025', 'Searches: Jun 2025', 'Searches: Jul 2025',
        'Searches: Aug 2025', 'Searches: Sep 2025', 'Searches: Oct 2025', 'Searches: Nov 2025'
      ].map(col => `\"${col}\"`).join(', ');

      const { data: allKeywords } = await supabaseClient
        .from("brand_keyword_data")
        .select(`keyword, "Avg. monthly searches", "Three month change", "YoY change", competition, is_branded, ${monthlyColumns}`)
        .eq("brand", brand);

      let top50Data: any[] = [];
      let totalKeywords = 0;
      let qualifiedKeywords = 0;

      if (allKeywords && allKeywords.length > 0) {
        totalKeywords = allKeywords.length;

        // Filter for Low/Medium competition
        const filteredKeywords = allKeywords.filter(k => {
          const keyword = (k.keyword || '').toLowerCase();

          // Exclude \"near me\" and \"close to me\" keywords
          if (keyword.includes('near me') || keyword.includes('close to me')) {
            return false;
          }

          const comp = k.competition;
          const volume = k['Avg. monthly searches'] || 0;
          if (comp === 'Low' && volume >= 500) return true;
          if (comp === 'Medium' && volume >= 2000) return true;
          return false;
        });

        qualifiedKeywords = filteredKeywords.length;

        // Calculate priority scores
        const scoredKeywords = filteredKeywords.map(k => {
          const volume = k['Avg. monthly searches'] || 0;
          const threeMonthChange = parseFloat(k['Three month change']?.replace('%', '') || '0');
          const yoyChange = parseFloat(k['YoY change']?.replace('%', '') || '0');
          const comp = k.competition;
          const avgGrowth = (threeMonthChange + yoyChange) / 2;
          const growthMultiplier = 1.0 + (avgGrowth / 100);
          const compMultiplier = comp === 'Low' ? 2.5 : 1.0;
          const priorityScore = volume * growthMultiplier * compMultiplier;

          return {
            ...k,
            priorityScore: Math.round(priorityScore)
          };
        });

        // Get top 50
        const top50Keywords = scoredKeywords
          .sort((a, b) => b.priorityScore - a.priorityScore)
          .slice(0, 50);

        top50Data = top50Keywords.map((k, i) => ({
          rank: i + 1,
          keyword: k.keyword,
          volume: k['Avg. monthly searches'] || 0,
          competition: k.competition,
          threeMonthChange: k['Three month change'] || 'N/A',
          yoyChange: k['YoY change'] || 'N/A',
          priorityScore: k.priorityScore,
          isBranded: k.is_branded || false,
        }));
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...existingStrategy,
            top50Keywords: top50Data,
            totalKeywords: totalKeywords,
            qualifiedKeywords: qualifiedKeywords,
          },
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

    // Fetch brand positioning if exists
    const { data: brandPositioning } = await supabaseClient
      .from("brand_positioning")
      .select("*")
      .eq("brand", brand)
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch keyword data with all monthly columns for seasonality analysis
    const monthlyColumns = [
      'Searches: Dec 2021', 'Searches: Jan 2022', 'Searches: Feb 2022', 'Searches: Mar 2022',
      'Searches: Apr 2022', 'Searches: May 2022', 'Searches: Jun 2022', 'Searches: Jul 2022',
      'Searches: Aug 2022', 'Searches: Sep 2022', 'Searches: Oct 2022', 'Searches: Nov 2022',
      'Searches: Dec 2022', 'Searches: Jan 2023', 'Searches: Feb 2023', 'Searches: Mar 2023',
      'Searches: Apr 2023', 'Searches: May 2023', 'Searches: Jun 2023', 'Searches: Jul 2023',
      'Searches: Aug 2023', 'Searches: Sep 2023', 'Searches: Oct 2023', 'Searches: Nov 2023',
      'Searches: Dec 2023', 'Searches: Jan 2024', 'Searches: Feb 2024', 'Searches: Mar 2024',
      'Searches: Apr 2024', 'Searches: May 2024', 'Searches: Jun 2024', 'Searches: Jul 2024',
      'Searches: Aug 2024', 'Searches: Sep 2024', 'Searches: Oct 2024', 'Searches: Nov 2024',
      'Searches: Dec 2024', 'Searches: Jan 2025', 'Searches: Feb 2025', 'Searches: Mar 2025',
      'Searches: Apr 2025', 'Searches: May 2025', 'Searches: Jun 2025', 'Searches: Jul 2025',
      'Searches: Aug 2025', 'Searches: Sep 2025', 'Searches: Oct 2025', 'Searches: Nov 2025'
    ].map(col => `\"${col}\"`).join(', ');

    const { data: allKeywords, error: fetchError } = await supabaseClient
      .from("brand_keyword_data")
      .select(`keyword, "Avg. monthly searches", "Three month change", "YoY change", competition, is_branded, ${monthlyColumns}`)
      .eq("brand", brand);

    if (fetchError) {
      throw new Error(`Failed to fetch keywords: ${fetchError.message}`);
    }

    if (!allKeywords || allKeywords.length === 0) {
      throw new Error("No keyword data found for this brand");
    }

    console.log(`Found ${allKeywords.length} total keywords for ${brand}`);

    // Filter for Low/Medium competition only and apply minimum thresholds
    const filteredKeywords = allKeywords.filter(k => {
      const keyword = (k.keyword || '').toLowerCase();

      // Exclude \"near me\" and \"close to me\" keywords
      if (keyword.includes('near me') || keyword.includes('close to me')) {
        return false;
      }

      const comp = k.competition;
      const volume = k['Avg. monthly searches'] || 0;

      if (comp === 'Low' && volume >= 500) return true;
      if (comp === 'Medium' && volume >= 2000) return true;
      return false;
    });

    console.log(`${filteredKeywords.length} keywords passed Low/Medium competition filter`);

    if (filteredKeywords.length === 0) {
      throw new Error("No keywords meet the Low/Medium competition criteria with sufficient traffic");
    }

    // Calculate priority scores with weighted multipliers
    const scoredKeywords = filteredKeywords.map(k => {
      const volume = k['Avg. monthly searches'] || 0;
      const threeMonthChange = parseFloat(k['Three month change']?.replace('%', '') || '0');
      const yoyChange = parseFloat(k['YoY change']?.replace('%', '') || '0');
      const comp = k.competition;

      // Growth multiplier: 1.0 baseline, +0.02 per percentage point of growth
      const avgGrowth = (threeMonthChange + yoyChange) / 2;
      const growthMultiplier = 1.0 + (avgGrowth / 100);

      // Competition multiplier: Low = 2.5x, Medium = 1.0x
      const compMultiplier = comp === 'Low' ? 2.5 : 1.0;

      // Intent multiplier: Could add branded vs non-branded weight here
      const intentMultiplier = 1.0;

      const priorityScore = volume * growthMultiplier * compMultiplier * intentMultiplier;

      return {
        ...k,
        priorityScore: Math.round(priorityScore)
      };
    });

    // Sort by priority score and get top 50
    const top50Keywords = scoredKeywords
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 50);

    console.log(`Selected top 50 keywords for analysis`);

    // Get top 10 for AI deep-dive
    const top10Keywords = top50Keywords.slice(0, 10);

    // Format top 10 with seasonality data for AI analysis
    const top10WithSeasonality = top10Keywords.map((k, i) => {
      // Extract monthly data
      const monthlyData: number[] = [];
      const monthlyLabels: string[] = [];

      ['Dec 2021', 'Jan 2022', 'Feb 2022', 'Mar 2022', 'Apr 2022', 'May 2022', 'Jun 2022', 'Jul 2022',
       'Aug 2022', 'Sep 2022', 'Oct 2022', 'Nov 2022', 'Dec 2022', 'Jan 2023', 'Feb 2023', 'Mar 2023',
       'Apr 2023', 'May 2023', 'Jun 2023', 'Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023',
       'Dec 2023', 'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024',
       'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025',
       'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'].forEach(month => {
        const value = k[`Searches: ${month}`];
        if (value !== null && value !== undefined) {
          monthlyData.push(value);
          monthlyLabels.push(month);
        }
      });

      // Calculate seasonality metrics
      const validData = monthlyData.filter(v => v > 0);
      const avgVolume = validData.length > 0 ? validData.reduce((a, b) => a + b, 0) / validData.length : 0;
      const maxVolume = Math.max(...monthlyData);
      const minVolume = Math.min(...validData);
      const peakMonth = monthlyLabels[monthlyData.indexOf(maxVolume)];

      // Calculate standard deviation for seasonality index
      const variance = validData.reduce((sum, val) => sum + Math.pow(val - avgVolume, 2), 0) / validData.length;
      const stdDev = Math.sqrt(variance);
      const seasonalityIndex = avgVolume > 0 ? (stdDev / avgVolume) : 0;

      const isHighSeasonality = seasonalityIndex > 0.3;

      return `${i + 1}. \"${k.keyword}\"
   - Volume: ${(k['Avg. monthly searches'] || 0).toLocaleString()}/mo
   - Competition: ${k.competition} ${k.competition === 'Low' ? '🟢' : '🟡'}
   - Growth: 3-Month: ${k['Three month change'] || 'N/A'} | YoY: ${k['YoY change'] || 'N/A'}
   - Priority Score: ${k.priorityScore.toLocaleString()}
   - Type: ${k.is_branded ? 'Branded' : 'Non-Branded'}
   - Seasonality: ${isHighSeasonality ? `HIGH (${(seasonalityIndex * 100).toFixed(0)}% variance) - Peak: ${peakMonth}` : `Low (${(seasonalityIndex * 100).toFixed(0)}% variance)`}
   - 48-Month Range: ${minVolume.toLocaleString()} - ${maxVolume.toLocaleString()}`;
    }).join('\n\n');

    // Brand positioning context
    const brandContext = brandPositioning ? `
BRAND POSITIONING CONTEXT:
- Target Audience: ${brandPositioning.target_audience || 'Not specified'}
- Positioning Attributes: ${brandPositioning.positioning?.join(', ') || 'Not specified'}
- Competitive Positioning: ${brandPositioning.competitive_positioning || 'Not specified'}
- Brand Voice: ${brandPositioning.brand_voice || 'Not specified'}
- Unique Value Props: ${brandPositioning.unique_value_props?.join(', ') || 'Not specified'}

Use this brand context to tailor your content recommendations and positioning strategy.
` : '';

    const fullPrompt = `You are an expert SEO and content marketing strategist analyzing keyword data from Google Keyword Planner.

BRAND: ${brand}
${brandContext}

SELECTION CRITERIA USED:
- Competition: LOW or MEDIUM only (High competition excluded)
- Minimum Traffic: Low comp ≥ 500/mo, Medium comp ≥ 2,000/mo
- Excluded: Keywords containing \"near me\" or \"close to me\" (local intent)
- Priority Scoring: Low competition gets 2.5x multiplier (easier to rank)
- Total Keywords Analyzed: ${allKeywords.length}
- Qualified Keywords: ${filteredKeywords.length}
- Top 50 Selected (provided below for reference)
- **YOUR FOCUS: Deep analysis of TOP 10 ONLY**

YOUR TASK:
Provide DETAILED, ACTIONABLE analysis for each of the TOP 10 keywords below. For EACH keyword, create a comprehensive strategy block including:

1. **Specific Content Angle** (not generic - give exact approach)
2. **3-5 Ready-to-Use Title Options** (with character count)
3. **Target Audience Profile** (demographics, pain points, search intent)
4. **Content Structure** (H2/H3 outline with key sections)
5. **Competitive Differentiation** (how to stand out)
6. **Seasonality Strategy** (based on 48 months of data provided)
7. **Expected Traffic Potential** (realistic CTR estimates for rank 3-7)
8. **Why This Keyword Matters RIGHT NOW**

TOP 10 PRIORITY KEYWORDS (REQUIRES DEEP ANALYSIS):
${top10WithSeasonality}

---

ADDITIONAL CONTEXT - FULL TOP 50 KEYWORDS:
(Reference only - do NOT provide detailed analysis for keywords 11-50)

${top50Keywords.slice(10).map((k, i) =>
  `${i + 11}. \"${k.keyword}\" | ${(k['Avg. monthly searches'] || 0).toLocaleString()}/mo | ${k.competition} | Score: ${k.priorityScore.toLocaleString()}`
).join('\n')}

---

STRUCTURE YOUR RESPONSE:

# SEO Strategy: ${brand}

## 📊 Executive Summary
[3-4 sentences on overall opportunity, competition landscape, and strategic focus]

---

## 🎯 TOP 10 PRIORITY KEYWORDS - DETAILED ANALYSIS

### 1. [Keyword Name]
**📈 Metrics:**
- Monthly Volume: [volume]
- Competition: [Low/Medium] [🟢/🟡]
- Growth: [3-month] / [YoY]
- Priority Score: [score]

**🎨 Content Strategy:**

**Recommended Titles (Choose One):**
1. \"[Title Option 1]\" (62 chars)
2. \"[Title Option 2]\" (58 chars)
3. \"[Title Option 3]\" (65 chars)

**Content Angle:**
[Specific, detailed approach - NOT generic. Explain exactly what format, perspective, and hook to use]

**Target Audience:**
- [Demographic/psychographic profile]
- [Pain points and motivations]
- [Search intent: informational/commercial/transactional]

**Content Structure:**
1. [H2: Opening hook and value prop]
2. [H2: Main content section 1]
   - H3: [Subsection]
   - H3: [Subsection]
3. [H2: Main content section 2]
4. [H2: Actionable takeaways / CTA]

**Competitive Differentiation:**
[How to make this content stand out from existing results]

**Seasonality Strategy:** 📅
- [Peak period based on data]
- [Recommended publish timing]
- [Historical pattern insights]

**Expected Impact:**
- Est. Monthly Organic Traffic: [range] visits
- Conversion Potential: [Low/Medium/High]
- Time to Rank: [realistic estimate]

**Why This Matters:**
[Specific reason this keyword is valuable RIGHT NOW]

---

### 2. [Next Keyword]
[Repeat detailed analysis]

[Continue for all 10 keywords]

---

## 📋 Keywords 11-50 Reference

Below are the remaining qualified keywords. These didn't make the top 10 AI analysis but represent solid opportunities for secondary content planning:

| Rank | Keyword | Volume | Competition | Priority Score | Type |
|------|---------|--------|-------------|----------------|------|
[Include simple table for keywords 11-50]

---

## 📅 90-Day Content Calendar

Based on seasonality patterns and priority scores:

| Week | Keyword | Content Type | Why Now |
|------|---------|--------------|---------|
[Create strategic publishing schedule]

---

## 🎯 Strategic Insights

**Quick Wins (Next 30 Days):**
[3-5 low-competition keywords you can rank for FAST with specific reasons]

**Long-Term Plays (3-6 Months):**
[3-5 medium-competition, higher-volume terms worth the investment]

**Content Gaps Identified:**
[Missing content types based on keyword patterns - what are competitors NOT covering?]

**Competitive Positioning:**
[Overall market positioning recommendations]

---

## 🎯 Competitor Gap Analysis

Analyze the keyword landscape to identify competitor weaknesses:

**Content Gaps in the Market:**
[Identify 5-7 specific content topics/angles that competitors are missing or underserving based on keyword patterns]

**Underserved Search Intent:**
[Which search intents are competitors failing to address? (e.g., beginner-friendly content, comparison guides, technical deep-dives)]

**Keyword Clusters Competitors Ignore:**
[Group related keywords that show opportunity areas competitors haven't covered]

**Format Opportunities:**
[What content formats are missing? (e.g., video content, interactive tools, visual guides, calculators)]

---

## 🚀 Traffic Interception Strategy

Identify specific opportunities to capture traffic from competitors:

**High-Impact Interception Targets:**
Create a ranked list of 8-10 keywords where you can realistically outrank competitors:

| Keyword | Current Gap | Interception Strategy | Est. Monthly Traffic Gain | Difficulty (1-10) | Timeline |
|---------|-------------|----------------------|---------------------------|-------------------|----------|
[For each keyword: explain what competitors are doing wrong and EXACTLY how to do it better]

**Quick-Win Opportunities:**
[5 keywords with Low competition where you can rank within 30-60 days]
- Include specific weaknesses in current top-ranking content
- Explain your differentiation angle
- Provide exact content improvements needed

**Competitive Weaknesses to Exploit:**
1. **Thin Content Opportunities**: [Keywords where top results have <800 words - you can go deeper]
2. **Outdated Content**: [Keywords where top results are 2+ years old - freshness advantage]
3. **Poor User Experience**: [Keywords where top results have slow load times, poor mobile experience]
4. **Missing Visuals**: [Keywords where competitors lack infographics, charts, or helpful images]
5. **Weak CTAs**: [Keywords where competitors have poor conversion optimization]

**Competitive Content Analysis:**
For the top 3 priority keywords, analyze what's currently ranking:
- What are the top 3 ranking pages doing right?
- What are they missing?
- How can you create definitively better content?
- What unique angle can you take?

---

## 📊 Competitive Landscape Map

**Market Positioning:**
[Based on keyword patterns, map out where competitors are focused and where the white space exists]

**Competitor Keyword Ownership Patterns:**
[Identify patterns in which types of keywords competitors dominate vs. where there's opportunity]
- High competition keywords (avoid or long-term target)
- Medium competition with gaps (primary targets)
- Low competition overlooked keywords (quick wins)

**Strategic Recommendations for Market Entry:**
1. **Phase 1 (Months 1-2)**: [Target these specific low-hanging fruits]
2. **Phase 2 (Months 3-4)**: [Build authority with these medium-difficulty targets]
3. **Phase 3 (Months 5-6)**: [Challenge competitors on these high-value terms]

---

Use current 2025 SEO best practices. Be EXTREMELY specific and actionable - avoid generic advice. Each keyword should have a unique, tailored strategy. Focus on finding real competitive gaps and traffic interception opportunities based on the actual keyword data patterns.`;

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
            content: "You are an expert SEO and content marketing strategist with deep expertise in keyword research and competitive analysis. Your role is to analyze raw keyword data from Google Keyword Planner and identify patterns, opportunities, and strategic insights. You excel at creating DETAILED, SPECIFIC content strategies for each keyword - not generic advice. You provide exact title options, content structures, and actionable recommendations. Always use proper markdown formatting including tables for clarity and professionalism."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
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

    // Prepare top 50 keywords data for frontend
    const top50Data = top50Keywords.map((k, i) => ({
      rank: i + 1,
      keyword: k.keyword,
      volume: k['Avg. monthly searches'] || 0,
      competition: k.competition,
      threeMonthChange: k['Three month change'] || 'N/A',
      yoyChange: k['YoY change'] || 'N/A',
      priorityScore: k.priorityScore,
      isBranded: k.is_branded || false,
    }));

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
        data: {
          ...savedStrategy,
          top50Keywords: top50Data,
          totalKeywords: allKeywords.length,
          qualifiedKeywords: filteredKeywords.length,
        },
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