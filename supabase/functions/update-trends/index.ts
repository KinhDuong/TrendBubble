import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TrendingItem {
  title: { query: string };
  formattedTraffic: string;
  ht_news_item_title?: string;
}

interface DailyTrend {
  trendingSearches: TrendingItem[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching Google Trends data...");

    // Fetch from RSS feed (provides 10 items at a time)
    const rssUrl = "https://trends.google.com/trending/rss?geo=US";
    const response = await fetch(rssUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch trends: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log("Received RSS data");

    // Parse XML to extract trending topics
    const titleRegex = /<title>([^<]+)<\/title>/g;
    const trafficRegex = /<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g;
    const pubDateRegex = /<pubDate>([^<]+)<\/pubDate>/g;

    const titles: string[] = [];
    const traffics: string[] = [];
    const pubDates: string[] = [];

    // Decode HTML entities helper
    const decodeHtmlEntities = (text: string): string => {
      const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&#x27;': "'",
        '&#x2F;': '/',
        '&nbsp;': ' ',
      };

      return text.replace(/&[#\w]+;/g, (match) => {
        return entities[match] || match;
      });
    };

    let match;
    while ((match = titleRegex.exec(xmlText)) !== null) {
      const title = decodeHtmlEntities(match[1].trim());
      if (title && title !== "Daily Search Trends") {
        titles.push(title);
      }
    }

    while ((match = trafficRegex.exec(xmlText)) !== null) {
      if (match[1]) {
        traffics.push(match[1]);
      }
    }

    while ((match = pubDateRegex.exec(xmlText)) !== null) {
      if (match[1]) {
        pubDates.push(match[1]);
      }
    }

    console.log(`Parsed ${titles.length} trending topics`);

    if (titles.length === 0) {
      throw new Error("No trending topics found in RSS feed");
    }

    // Convert traffic strings to numbers
    const parseTraffic = (traffic: string): number => {
      const cleaned = traffic.replace(/[+,]/g, "");
      if (cleaned.includes("M")) {
        return parseFloat(cleaned.replace("M", "")) * 1000000;
      } else if (cleaned.includes("K")) {
        return parseFloat(cleaned.replace("K", "")) * 1000;
      }
      return parseInt(cleaned) || 0;
    };

    // Prepare data for insertion/update with smart merge
    const now = new Date().toISOString();
    let newTopicsCount = 0;
    let updatedTopicsCount = 0;
    const historySnapshots = [];

    for (let index = 0; index < titles.length; index++) {
      const title = titles[index];
      const searchVolume = parseTraffic(traffics[index] || "0");
      const searchVolumeRaw = traffics[index] || "Unknown";
      const pubDate = pubDates[index] ? new Date(pubDates[index]).toISOString() : null;

      // Generate Google Trends explore URL
      const cleanTitle = title.replace(/^"|"$/g, '');
      const encodedQuery = encodeURIComponent(cleanTitle);
      const trendsUrl = `https://trends.google.com/trends/explore?q=${encodedQuery}&geo=US`;

      // Check if topic already exists (case-insensitive)
      const { data: existing } = await supabase
        .from("trending_topics")
        .select("id, first_seen, pub_date, url, created_at")
        .ilike("name", title)
        .maybeSingle();

      let topicId;

      if (existing) {
        // Smart merge: keep earliest dates, update latest data
        const earliestPubDate = !pubDate ? existing.pub_date :
          !existing.pub_date ? pubDate :
          new Date(pubDate) < new Date(existing.pub_date) ? pubDate : existing.pub_date;

        await supabase
          .from("trending_topics")
          .update({
            search_volume: searchVolume,
            search_volume_raw: searchVolumeRaw,
            rank: index + 1,
            last_seen: now,
            url: trendsUrl || existing.url,
            pub_date: earliestPubDate,
            source: 'google_trends',
          })
          .eq("id", existing.id);
        updatedTopicsCount++;
        topicId = existing.id;
      } else {
        // Insert new topic
        const insertData: any = {
          name: title,
          search_volume: searchVolume,
          search_volume_raw: searchVolumeRaw,
          rank: index + 1,
          first_seen: now,
          last_seen: now,
          url: trendsUrl,
          pub_date: pubDate,
          source: 'google_trends',
        };

        if (pubDate) {
          insertData.created_at = pubDate;
        }

        const { data: newTopic } = await supabase
          .from("trending_topics")
          .insert(insertData)
          .select("id")
          .single();
        newTopicsCount++;
        topicId = newTopic?.id;
      }

      // Prepare history snapshot
      historySnapshots.push({
        topic_id: topicId,
        name: title,
        search_volume: searchVolume,
        search_volume_raw: searchVolumeRaw,
        rank: index + 1,
        url: trendsUrl,
        snapshot_at: now,
      });
    }

    // Batch insert history snapshots
    if (historySnapshots.length > 0) {
      await supabase
        .from("trending_topics_history")
        .insert(historySnapshots);
      console.log(`Captured ${historySnapshots.length} historical snapshots`);
    }

    console.log(`Successfully updated trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`,
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
    console.error("Error updating trends:", error);
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