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
      // For cached strategies, recalculate tiered data for display
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

      let tieredData: any[] = [];
      let top50Data: any[] = [];
      let totalKeywords = 0;
      let qualifiedKeywords = 0;

      if (allKeywords && allKeywords.length > 0) {
        totalKeywords = allKeywords.length;

        const filteredKeywords = allKeywords.filter(k => {
          const keyword = (k.keyword || '').toLowerCase();
          if (keyword.includes('near me') || keyword.includes('close to me')) return false;
          const comp = k.competition;
          const volume = k['Avg. monthly searches'] || 0;
          if (comp === 'Low' && volume >= 500) return true;
          if (comp === 'Medium' && volume >= 2000) return true;
          return false;
        });

        qualifiedKeywords = filteredKeywords.length;

        const scoredKeywords = filteredKeywords.map(k => {
          const volume = k['Avg. monthly searches'] || 0;
          const threeMonthChange = parseFloat(k['Three month change']?.replace('%', '') || '0');
          const yoyChange = parseFloat(k['YoY change']?.replace('%', '') || '0');
          const comp = k.competition;
          const avgGrowth = (threeMonthChange + yoyChange) / 2;
          const growthMultiplier = 1.0 + (avgGrowth / 100);
          const compMultiplier = comp === 'Low' ? 2.5 : 1.0;
          const priorityScore = volume * growthMultiplier * compMultiplier;

          return { ...k, priorityScore: Math.round(priorityScore) };
        });

        const allSorted = scoredKeywords.sort((a, b) => b.priorityScore - a.priorityScore);

        const tier1Data = allSorted.slice(0, 15).map((k, i) => ({
          rank: i + 1,
          keyword: k.keyword,
          volume: k['Avg. monthly searches'] || 0,
          competition: k.competition,
          threeMonthChange: k['Three month change'] || 'N/A',
          yoyChange: k['YoY change'] || 'N/A',
          priorityScore: k.priorityScore,
          isBranded: k.is_branded || false,
          tier: 1,
        }));

        const tier2Data = allSorted.slice(15, 75).map((k, i) => ({
          rank: i + 16,
          keyword: k.keyword,
          volume: k['Avg. monthly searches'] || 0,
          competition: k.competition,
          threeMonthChange: k['Three month change'] || 'N/A',
          yoyChange: k['YoY change'] || 'N/A',
          priorityScore: k.priorityScore,
          isBranded: k.is_branded || false,
          tier: 2,
        }));

        const tier3Data = allSorted.slice(75).map((k, i) => ({
          rank: i + 76,
          keyword: k.keyword,
          volume: k['Avg. monthly searches'] || 0,
          competition: k.competition,
          threeMonthChange: k['Three month change'] || 'N/A',
          yoyChange: k['YoY change'] || 'N/A',
          priorityScore: k.priorityScore,
          isBranded: k.is_branded || false,
          tier: 3,
        }));

        tieredData = [...tier1Data, ...tier2Data, ...tier3Data];

        top50Data = allSorted.slice(0, 50).map((k, i) => ({
          rank: i + 1,
          keyword: k.keyword,
          volume: k['Avg. monthly searches'] || 0,
          competition: k.competition,
          threeMonthChange: k['Three month change'] || 'N/A',
          yoyChange: k['YoY change'] || 'N/A',
          priorityScore: k.priorityScore,
          isBranded: k.is_branded || false,
          tier: i < 15 ? 1 : 2,
        }));
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...existingStrategy,
            tieredKeywords: tieredData,
            top50Keywords: top50Data,
            totalKeywords,
            qualifiedKeywords,
            tier1Count: tieredData.filter(k => k.tier === 1).length,
            tier2Count: tieredData.filter(k => k.tier === 2).length,
            tier3Count: tieredData.filter(k => k.tier === 3).length,
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

      const avgGrowth = (threeMonthChange + yoyChange) / 2;
      const growthMultiplier = 1.0 + (avgGrowth / 100);
      const compMultiplier = comp === 'Low' ? 2.5 : 1.0;
      const intentMultiplier = 1.0;
      const priorityScore = volume * growthMultiplier * compMultiplier * intentMultiplier;

      return {
        ...k,
        priorityScore: Math.round(priorityScore)
      };
    });

    // Sort by priority score and get all keywords for tiered analysis
    const allSortedKeywords = scoredKeywords
      .sort((a, b) => b.priorityScore - a.priorityScore);

    console.log(`Selected all ${allSortedKeywords.length} keywords for tiered analysis`);

    // Split into tiers
    const tier1Keywords = allSortedKeywords.slice(0, 15);  // Top 15 for deep analysis
    const tier2Keywords = allSortedKeywords.slice(15, 75); // 16-75 for cluster analysis
    const tier3Keywords = allSortedKeywords.slice(75);     // 76+ for pattern analysis

    // Format Tier 1 with seasonality data for AI analysis
    const tier1WithSeasonality = tier1Keywords.map((k, i) => {
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

      const validData = monthlyData.filter(v => v > 0);
      const avgVolume = validData.length > 0 ? validData.reduce((a, b) => a + b, 0) / validData.length : 0;
      const maxVolume = Math.max(...monthlyData);
      const minVolume = Math.min(...validData);
      const peakMonth = monthlyLabels[monthlyData.indexOf(maxVolume)];

      const variance = validData.reduce((sum, val) => sum + Math.pow(val - avgVolume, 2), 0) / validData.length;
      const stdDev = Math.sqrt(variance);
      const seasonalityIndex = avgVolume > 0 ? (stdDev / avgVolume) : 0;

      const isHighSeasonality = seasonalityIndex > 0.3;

      return `${i + 1}. \"${k.keyword}\"
   - Volume: ${(k['Avg. monthly searches'] || 0).toLocaleString()}/mo
   - Competition: ${k.competition}
   - Growth: 3-Month: ${k['Three month change'] || 'N/A'} | YoY: ${k['YoY change'] || 'N/A'}
   - Priority Score: ${k.priorityScore.toLocaleString()}
   - Type: ${k.is_branded ? 'Branded' : 'Non-Branded'}
   - Seasonality: ${isHighSeasonality ? `HIGH (${(seasonalityIndex * 100).toFixed(0)}% variance), Peak: ${peakMonth}` : `Low (${(seasonalityIndex * 100).toFixed(0)}% variance)`}
   - 48-Month Range: ${minVolume.toLocaleString()} to ${maxVolume.toLocaleString()}`;
    }).join('\n\n');

    // Format Tier 2 - Content Clusters (aggregated, not individual deep dives)
    const tier2Summary = tier2Keywords.length > 0 ? tier2Keywords.map((k, i) => {
      return `${i + 16}. \"${k.keyword}\" | Vol: ${(k['Avg. monthly searches'] || 0).toLocaleString()} | Comp: ${k.competition} | Score: ${k.priorityScore.toLocaleString()} | Type: ${k.is_branded ? 'Branded' : 'Non-Branded'}`;
    }).join('\n') : 'None';

    // Format Tier 3 - Long-tail Strategy (high-level patterns only)
    const tier3Summary = tier3Keywords.length > 0 ? `${tier3Keywords.length} additional keywords ranging from ${Math.min(...tier3Keywords.map(k => k['Avg. monthly searches'] || 0)).toLocaleString()} to ${Math.max(...tier3Keywords.map(k => k['Avg. monthly searches'] || 0)).toLocaleString()} monthly searches. These represent long-tail opportunities for supporting content, FAQs, and niche targeting.` : 'None';

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

TIERED INTELLIGENCE FRAMEWORK:
This analysis uses a 3-tier approach for complete SEO visibility:

**TIER 1 (Top 15)** - Hero Content: Deep individual analysis with full strategy
**TIER 2 (16-75)** - Content Clusters: Thematic grouping for content hubs
**TIER 3 (76+)** - Long-tail Strategy: Pattern analysis for supporting content

YOUR TASK:
Analyze keywords using the Tiered Intelligence Framework. Each tier requires different depth:

**TIER 1 ANALYSIS (TOP 15 KEYWORDS)** - DETAILED, ACTIONABLE analysis for EACH keyword including:

1. **Specific Content Angle** (not generic - give exact approach)
2. **3-5 Ready-to-Use Title Options** (with character count)
3. **Target Audience Profile** (demographics, pain points, search intent)
4. **Content Structure** (H2/H3 outline with key sections)
5. **Competitive Differentiation** (how to stand out)
6. **Seasonality Strategy** (based on 48 months of data provided)
7. **Expected Traffic Potential** (realistic CTR estimates for rank 3-7)
8. **Why This Keyword Matters RIGHT NOW**

**TIER 2 ANALYSIS (KEYWORDS 16-75)** - Cluster and aggregate:
1. **Group into Content Clusters** (5-7 thematic groups)
2. **Aggregate Metrics per Cluster** (total volume, avg difficulty, opportunity score)
3. **Content Hub Strategy** (hub page + supporting articles)
4. **Quick-Win Identification** (easiest to rank within each cluster)
5. **Internal Linking Strategy** (how clusters connect)

**TIER 3 ANALYSIS (KEYWORDS 76+)** - Pattern analysis:
1. **Long-tail Themes** (what topics dominate the long tail?)
2. **FAQ Opportunities** (question-based keywords)
3. **Knowledge Base Content** (informational clusters)
4. **Voice Search Opportunities** (conversational queries)
5. **Topic Gap Analysis** (missing content areas)

---

TIER 1: TOP 15 PRIORITY KEYWORDS (REQUIRES DEEP ANALYSIS)
${tier1WithSeasonality}

---

TIER 2: CONTENT CLUSTER KEYWORDS (Keywords 16-75)
${tier2Summary}

---

TIER 3: LONG-TAIL KEYWORDS (Keywords 76+)
${tier3Summary}

---

STRUCTURE YOUR RESPONSE:

# SEO Strategy: ${brand}

## Executive Summary
[3-4 sentences on overall opportunity, competition landscape, and tiered strategic approach]

---

## TIER 1: Hero Content Strategy (Top 15 Keywords)

Deep analysis for priority keywords that deserve dedicated, comprehensive content.

### 1. [Keyword Name]

**Recommended Titles (Choose One):**
1. \"[Title Option 1]\" (62 chars)
2. \"[Title Option 2]\" (58 chars)
3. \"[Title Option 3]\" (65 chars)

**Content Angle:**
[Specific, detailed approach, NOT generic. Explain exactly what format, perspective, and hook to use]

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

**Seasonality Strategy:**
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

[Continue for all 15 Tier 1 keywords]

---

## TIER 2: Content Cluster Strategy (Keywords 16-75)

Group related keywords into content clusters for efficient content hub creation.

### Content Cluster 1: [Cluster Name]
**Keywords in Cluster:** [List 5-10 related keywords]
**Total Monthly Volume:** [Sum of all keywords]
**Avg Competition:** [Low/Medium]
**Opportunity Score:** [1-100]

**Hub Page Strategy:**
- Main hub topic: [Topic]
- Target primary keyword: [Keyword]
- Content type: [Pillar page/Category page/Guide]

**Supporting Content:**
1. [Article title] - Target: [keyword]
2. [Article title] - Target: [keyword]
3. [Article title] - Target: [keyword]

**Quick Wins in This Cluster:**
- [Keyword] - Low comp, [volume] searches, easy rank within 30-60 days
- [Keyword] - [Reason why it's a quick win]

**Internal Linking Strategy:**
[How this cluster connects to other content and Tier 1 keywords]

---

### Content Cluster 2: [Next Cluster]
[Repeat structure]

[Create 5-7 thematic clusters covering keywords 16-75]

---

## TIER 3: Long-Tail Strategy (Keywords 76+)

Pattern analysis and strategic themes for supporting content.

### Long-Tail Theme Analysis

**Dominant Themes Identified:**
1. **[Theme Name]** - [X keywords, total volume]
   - Characteristics: [What makes this theme distinct]
   - Content approach: [How to target these keywords efficiently]
   - Example keywords: [3-5 examples]

2. **[Theme Name]** - [X keywords, total volume]
   [Repeat structure]

**FAQ Opportunities:**
Identify 10-15 question-based keywords perfect for FAQ sections:
- [Question keyword] - [Volume]
- [Question keyword] - [Volume]
[List continues]

**Knowledge Base Content:**
Topics suitable for help center or educational content:
- [Topic] - Addresses [X keywords]
- [Topic] - Addresses [X keywords]

**Voice Search Optimization:**
Conversational queries identified in long-tail:
- [Query example]
- [Query example]

**Topic Gaps:**
Content areas competitors aren't covering:
- [Gap description] - [Keyword examples]
- [Gap description] - [Keyword examples]

**Supporting Content Strategy:**
How to efficiently target 76+ keywords without creating 76+ individual pages:
1. [Strategy 1: e.g., FAQ page covering 20 question keywords]
2. [Strategy 2: e.g., Glossary covering 30 definition keywords]
3. [Strategy 3: e.g., Comparison matrix covering 15 \"vs\" keywords]

---

## 90-Day Content Calendar

Based on seasonality patterns and priority scores:

| Week | Keyword | Content Type | Why Now |
|------|---------|--------------|---------|-------
[Create strategic publishing schedule]

---

## Cross-Tier Strategic Insights

**Quick Wins Across All Tiers:**
Identify the 10 easiest wins regardless of tier:
1. [Keyword] (Tier [X]) - [Reason: low comp + decent volume + specific reason]
2. [Keyword] (Tier [X]) - [Reason]
[Continue through 10]

**Content Production Priority:**
Based on tiered analysis, recommended content order:

**Month 1:**
- [Tier 1 keyword #1] - Hero content
- [Tier 2 cluster #1 hub page] - Content hub
- [Tier 3: FAQ page] - Bulk long-tail coverage

**Month 2:**
[Continue strategic sequencing]

**Resource Allocation:**
- **Tier 1:** 60% of content budget (15 comprehensive articles)
- **Tier 2:** 30% of content budget (5-7 hub pages + supporting content)
- **Tier 3:** 10% of content budget (1-2 aggregate pages covering many keywords)

---

## Competitor Gap Analysis

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

## Traffic Interception Strategy

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
1. **Thin Content Opportunities**: [Keywords where top results have less than 800 words, you can go deeper]
2. **Outdated Content**: [Keywords where top results are 2+ years old, freshness advantage]
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

## Competitive Landscape Map

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

Use current 2025 SEO best practices. Be EXTREMELY specific and actionable, avoid generic advice. Each keyword should have a unique, tailored strategy. Focus on finding real competitive gaps and traffic interception opportunities based on the actual keyword data patterns.`;

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
            content: "You are an expert SEO and content marketing strategist with deep expertise in keyword research and competitive analysis. Your role is to analyze raw keyword data from Google Keyword Planner and identify patterns, opportunities, and strategic insights. You excel at creating DETAILED, SPECIFIC content strategies for each keyword, not generic advice. You provide exact title options, content structures, and actionable recommendations. Always use proper markdown formatting including tables for clarity and professionalism. IMPORTANT: Do not use emojis or icons in your output. Do not use em-dashes, use regular hyphens or commas instead."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 16000,
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

    console.log(`AI analysis generated successfully. Analysis length: ${analysis.length} chars. Saving to database...`);

    // Prepare tiered keywords data for frontend
    const tier1Data = tier1Keywords.map((k, i) => ({
      rank: i + 1,
      keyword: k.keyword,
      volume: k['Avg. monthly searches'] || 0,
      competition: k.competition,
      threeMonthChange: k['Three month change'] || 'N/A',
      yoyChange: k['YoY change'] || 'N/A',
      priorityScore: k.priorityScore,
      isBranded: k.is_branded || false,
      tier: 1,
    }));

    const tier2Data = tier2Keywords.map((k, i) => ({
      rank: i + 16,
      keyword: k.keyword,
      volume: k['Avg. monthly searches'] || 0,
      competition: k.competition,
      threeMonthChange: k['Three month change'] || 'N/A',
      yoyChange: k['YoY change'] || 'N/A',
      priorityScore: k.priorityScore,
      isBranded: k.is_branded || false,
      tier: 2,
    }));

    const tier3Data = tier3Keywords.map((k, i) => ({
      rank: i + 76,
      keyword: k.keyword,
      volume: k['Avg. monthly searches'] || 0,
      competition: k.competition,
      threeMonthChange: k['Three month change'] || 'N/A',
      yoyChange: k['YoY change'] || 'N/A',
      priorityScore: k.priorityScore,
      isBranded: k.is_branded || false,
      tier: 3,
    }));

    const allTieredData = [...tier1Data, ...tier2Data, ...tier3Data];

    // Legacy: Keep top50 for backward compatibility with cached data
    const top50Data = allSortedKeywords.slice(0, 50).map((k, i) => ({
      rank: i + 1,
      keyword: k.keyword,
      volume: k['Avg. monthly searches'] || 0,
      competition: k.competition,
      threeMonthChange: k['Three month change'] || 'N/A',
      yoyChange: k['YoY change'] || 'N/A',
      priorityScore: k.priorityScore,
      isBranded: k.is_branded || false,
      tier: i < 15 ? 1 : 2,
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

    console.log(`SEO strategy saved successfully for ${brand}. Has analysis: ${!!savedStrategy?.analysis}, Analysis length: ${savedStrategy?.analysis?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...savedStrategy,
          tieredKeywords: allTieredData,
          top50Keywords: top50Data, // Legacy support
          totalKeywords: allKeywords.length,
          qualifiedKeywords: filteredKeywords.length,
          tier1Count: tier1Keywords.length,
          tier2Count: tier2Keywords.length,
          tier3Count: tier3Keywords.length,
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
