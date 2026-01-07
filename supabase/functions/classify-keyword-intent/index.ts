import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Intent classification patterns
const INTENT_PATTERNS = {
  transactional: [
    'buy', 'purchase', 'order', 'shop', 'sale', 'discount', 'coupon',
    'promo code', 'deal', 'cheap', 'cheapest', 'affordable', 'price',
    'pricing', 'cost', 'for sale', 'free shipping', 'delivery',
    'subscribe', 'subscription', 'sign up', 'join', 'get',
    'add to cart', 'checkout', 'apply', 'enroll', 'register',
    'book', 'rent', 'hire'
  ],
  commercial: [
    'best', 'top', 'review', 'reviews', 'comparison', 'compare',
    'vs', 'versus', 'alternative', 'alternatives', 'recommended',
    'rating', 'ratings', 'good', 'better', 'worth it',
    'pros and cons', 'guide', 'how to choose'
  ],
  informational: [
    'how to', 'what is', 'what are', 'why', 'benefits', 'guide',
    'tutorial', 'recipe', 'how do i', 'can i', 'does', 'tips',
    'ideas', 'meaning', 'definition', 'ingredients', 'side effects',
    'health benefits', 'calories in', 'nutrition', 'history of',
    'difference between'
  ],
  navigational: [
    'login', 'app', 'menu', 'locations', 'store', 'hours',
    'official', 'website'
  ],
  local: [
    'near me', 'nearby', 'locations', 'open now', 'store near me'
  ]
};

function classifyIntent(keyword: string): string {
  const lowerKeyword = keyword.toLowerCase().trim();
  
  // Priority order: Transactional → Commercial → Informational → Navigational
  
  // Check Transactional
  for (const pattern of INTENT_PATTERNS.transactional) {
    if (lowerKeyword.includes(pattern)) {
      return 'Transactional';
    }
  }
  
  // Check Commercial
  for (const pattern of INTENT_PATTERNS.commercial) {
    if (lowerKeyword.includes(pattern)) {
      return 'Commercial';
    }
  }
  
  // Check Informational
  for (const pattern of INTENT_PATTERNS.informational) {
    if (lowerKeyword.includes(pattern)) {
      return 'Informational';
    }
  }
  
  // Check Navigational
  for (const pattern of INTENT_PATTERNS.navigational) {
    if (lowerKeyword.includes(pattern)) {
      return 'Navigational';
    }
  }
  
  // Default to Informational if no match
  return 'Informational';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { keyword, keywords } = await req.json();
    
    // Support both single keyword and batch processing
    if (keyword) {
      const intent = classifyIntent(keyword);
      return new Response(
        JSON.stringify({ keyword, intent }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (keywords && Array.isArray(keywords)) {
      const results = keywords.map(kw => ({
        keyword: kw,
        intent: classifyIntent(kw)
      }));
      return new Response(
        JSON.stringify({ results }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide either "keyword" or "keywords" array' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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