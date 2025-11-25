import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
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

    console.log("Fetching CoinGecko crypto data...");

    // Fetch top 100 coins by market cap from CoinGecko (free tier, no API key needed)
    const coingeckoUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(coingeckoUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CoinGecko data: ${response.status}`);
    }

    const coins: CoinGeckoCoin[] = await response.json();
    console.log(`Received ${coins.length} coins from CoinGecko`);

    // Filter and sort by 24h % gain, prioritize high volume coins
    const topGainers = coins
      .filter(coin => coin.price_change_percentage_24h > 0) // Only gainers
      .filter(coin => coin.total_volume > 5000000) // Min $5M volume
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 50); // Top 50 gainers

    console.log(`Filtered to ${topGainers.length} top crypto gainers`);

    const now = new Date().toISOString();
    let newTopicsCount = 0;
    let updatedTopicsCount = 0;

    for (let index = 0; index < topGainers.length; index++) {
      const crypto = topGainers[index];
      const name = `${crypto.name} (${crypto.symbol.toUpperCase()})`;
      const changePercent = crypto.price_change_percentage_24h.toFixed(2);
      const volumeFormatted = crypto.total_volume > 1000000000
        ? `$${(crypto.total_volume / 1000000000).toFixed(2)}B`
        : `$${(crypto.total_volume / 1000000).toFixed(2)}M`;

      const priceFormatted = crypto.current_price >= 1
        ? `$${crypto.current_price.toFixed(2)}`
        : `$${crypto.current_price.toFixed(6)}`;

      // Use volume as search volume for ranking
      const searchVolume = Math.floor(crypto.total_volume);
      const searchVolumeRaw = `+${changePercent}% • ${priceFormatted} • ${volumeFormatted}`;

      // Generate CoinGecko URL
      const coinUrl = `https://www.coingecko.com/en/coins/${crypto.id}`;

      // Check if crypto already exists
      const { data: existing } = await supabase
        .from("trending_topics")
        .select("id, first_seen")
        .eq("name", name)
        .eq("source", "coingecko_crypto")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("trending_topics")
          .update({
            search_volume: searchVolume,
            search_volume_raw: searchVolumeRaw,
            rank: index + 1,
            last_seen: now,
            url: coinUrl,
          })
          .eq("id", existing.id);
        updatedTopicsCount++;
      } else {
        await supabase
          .from("trending_topics")
          .insert({
            name: name,
            search_volume: searchVolume,
            search_volume_raw: searchVolumeRaw,
            rank: index + 1,
            first_seen: now,
            last_seen: now,
            url: coinUrl,
            pub_date: now,
            category: 'Cryptocurrency',
            source: 'coingecko_crypto',
          });
        newTopicsCount++;
      }
    }

    console.log(`Successfully updated crypto trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated crypto trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`,
        count: topGainers.length,
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
    console.error("Error updating crypto trends:", error);
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
