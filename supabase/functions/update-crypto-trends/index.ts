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
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_1y_in_currency: number;
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

    // Fetch top 250 coins by market cap from CoinGecko (free tier, no API key needed)
    const coingeckoUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d,30d,1y";
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

    // Filter by volume and sort by absolute 1h % change (both gains and losses)
    const topCoins = coins
      .filter(coin => coin.total_volume > 1000000) // Min $1M volume
      .filter(coin => coin.price_change_percentage_1h_in_currency !== null && coin.price_change_percentage_1h_in_currency !== undefined)
      .sort((a, b) => Math.abs(b.price_change_percentage_1h_in_currency) - Math.abs(a.price_change_percentage_1h_in_currency))
      .slice(0, 100); // Top 100 by volatility

    console.log(`Filtered to ${topCoins.length} top volatile cryptos`);

    const now = new Date().toISOString();
    let newTopicsCount = 0;
    let updatedTopicsCount = 0;

    for (let index = 0; index < topCoins.length; index++) {
      const crypto = topCoins[index];
      const name = `${crypto.name} (${crypto.symbol.toUpperCase()})`;

      const change1hValue = crypto.price_change_percentage_1h_in_currency || 0;
      const change24hValue = crypto.price_change_percentage_24h_in_currency || 0;
      const change7dValue = crypto.price_change_percentage_7d_in_currency || 0;
      const change30dValue = crypto.price_change_percentage_30d_in_currency || 0;
      const change1yValue = crypto.price_change_percentage_1y_in_currency || 0;

      const change1h = change1hValue >= 0 ? `+${change1hValue.toFixed(2)}` : change1hValue.toFixed(2);
      const change24h = change24hValue >= 0 ? `+${change24hValue.toFixed(2)}` : change24hValue.toFixed(2);
      const change7d = change7dValue >= 0 ? `+${change7dValue.toFixed(2)}` : change7dValue.toFixed(2);
      const change30d = change30dValue >= 0 ? `+${change30dValue.toFixed(2)}` : change30dValue.toFixed(2);
      const change1y = change1yValue >= 0 ? `+${change1yValue.toFixed(2)}` : change1yValue.toFixed(2);

      const volumeFormatted = crypto.total_volume > 1000000000
        ? `$${(crypto.total_volume / 1000000000).toFixed(2)}B`
        : `$${(crypto.total_volume / 1000000).toFixed(2)}M`;

      const priceFormatted = crypto.current_price >= 1
        ? `$${crypto.current_price.toFixed(2)}`
        : `$${crypto.current_price.toFixed(6)}`;

      // Use absolute 1h price change percentage for bubble size (multiply by 100,000 for appropriate sizing)
      // Example: 5% gain/loss = 500,000, 10% gain/loss = 1,000,000
      const searchVolume = Math.floor(Math.abs(crypto.price_change_percentage_1h_in_currency) * 100000);
      // Store generic format - frontend will compute based on selected timeframe
      const searchVolumeRaw = `${priceFormatted} • ${volumeFormatted}`;

      // Store all timeframe data in crypto_data field
      const cryptoData = {
        change_1h: change1hValue,
        change_24h: change24hValue,
        change_7d: change7dValue,
        change_30d: change30dValue,
        change_1y: change1yValue,
        current_price: crypto.current_price,
        volume_24h: crypto.total_volume,
        formatted: {
          change_1h: change1h,
          change_24h: change24h,
          change_7d: change7d,
          change_30d: change30d,
          change_1y: change1y,
          price: priceFormatted,
          volume: volumeFormatted,
        }
      };

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
            crypto_data: cryptoData,
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
            crypto_data: cryptoData,
          });
        newTopicsCount++;
      }
    }

    console.log(`Successfully updated crypto trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated crypto trends: ${newTopicsCount} new, ${updatedTopicsCount} updated`,
        count: topCoins.length,
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
