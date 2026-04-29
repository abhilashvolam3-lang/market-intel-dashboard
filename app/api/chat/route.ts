import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { question } = await req.json()

    // Fetch products
    const { data: products } = await supabase
      .from('market_insights')
      .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source, wick_quantity, material_type')
      .order('reviews_count', { ascending: false })
      .limit(200)

    // Build per-source data quality report
    const sources: Record<string, {
      count: number
      withPrice: number
      withStars: number
      withBrand: number
      withBurnHours: number
      withBurnPerOz: number
      withPricePerOz: number
      withScent: number
      withWicks: number
      withMaterial: number
      withReviews: number
    }> = {}

    for (const p of (products || [])) {
      const s = p.source || 'unknown'
      if (!sources[s]) {
        sources[s] = {
          count: 0, withPrice: 0, withStars: 0, withBrand: 0,
          withBurnHours: 0, withBurnPerOz: 0, withPricePerOz: 0,
          withScent: 0, withWicks: 0, withMaterial: 0, withReviews: 0
        }
      }
      sources[s].count++
      if (p.price) sources[s].withPrice++
      if (p.stars) sources[s].withStars++
      if (p.brand) sources[s].withBrand++
      if (p.burn_hours) sources[s].withBurnHours++
      if (p.burn_per_oz) sources[s].withBurnPerOz++
      if (p.price_per_oz) sources[s].withPricePerOz++
      if (p.scent_name) sources[s].withScent++
      if (p.wick_quantity) sources[s].withWicks++
      if (p.material_type) sources[s].withMaterial++
      if (p.reviews_count) sources[s].withReviews++
    }

    // Build data quality summary for prompt
    const dataQualitySummary = Object.entries(sources).map(([source, stats]) => {
      const pct = (n: number) => Math.round((n / stats.count) * 100) + '%'
      return (
        "SOURCE: " + source.toUpperCase() + " (" + stats.count + " products)\n" +
        "  Price: " + pct(stats.withPrice) +
        " | Stars: " + pct(stats.withStars) +
        " | Reviews: " + pct(stats.withReviews) +
        " | Brand: " + pct(stats.withBrand) + "\n" +
        "  Burn Hours: " + pct(stats.withBurnHours) +
        " | Burn/oz: " + pct(stats.withBurnPerOz) +
        " | Price/oz: " + pct(stats.withPricePerOz) + "\n" +
        "  Scent: " + pct(stats.withScent) +
        " | Wicks: " + pct(stats.withWicks) +
        " | Material: " + pct(stats.withMaterial)
      )
    }).join('\n\n')

    // Build product context
    const productContext = (products || []).map(p =>
      "- " + (p.product_name || "") +
      " | Brand: " + (p.brand || "unknown") +
      " | Source: " + (p.source || "") +
      " | Price: $" + (p.price || "unknown") +
      " | Stars: " + (p.stars || "unknown") +
      " | Reviews: " + (p.reviews_count || 0) +
      " | Burn hrs: " + (p.burn_hours || "unknown") +
      " | Burn/oz: " + (p.burn_per_oz || "unknown") +
      " | Price/oz: $" + (p.price_per_oz || "unknown") +
      " | Weight: " + (p.weight_oz || "unknown") + "oz" +
      " | Scent: " + (p.scent_name || "unknown") +
      " | Type: " + (p.candle_type || "unknown") +
      " | Wicks: " + (p.wick_quantity || "unknown") +
      " | Material: " + (p.material_type || "unknown")
    ).join('\n')

    const prompt = `You are a strict candle market data analyst. Answer questions using ONLY the product data provided.

DATA QUALITY REPORT (what fields are available per source):
${dataQualitySummary}

STRICT RULES:
1. ONLY use data explicitly present in the product list
2. If a field shows "unknown" — it is unavailable, do NOT guess
3. If comparison cannot be made due to missing data — say which field is missing and for which source
4. NEVER invent prices, ratings, burn times or any numbers
5. When comparing brands/sources — only compare fields where BOTH have real data (not "unknown")
6. Always cite the specific product name and source in your answer
7. If user asks "what data is available" or "what can you answer" — use the DATA QUALITY REPORT above to explain what each source has
8. Keep answers concise — max 200 words
9. If a new source appears in the data that is not Amazon/Walmart/PF Candle — treat it the same way, use its data quality report
10. If absolutely no relevant data — say: "The available data does not contain enough information. Try asking about: price comparison, burn efficiency (Amazon only), best rated products, most reviewed products, or scent analysis."

PRODUCT DATA:
${productContext}

USER QUESTION: ${question}

Answer based strictly on the data above:`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a strict data analyst. You NEVER hallucinate or invent data. You only report what is explicitly in the data. If data is missing, you clearly say which source lacks which field.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 350,
        temperature: 0.1
      })
    })

    const data = await groqResponse.json()
    const answer = data.choices?.[0]?.message?.content || 'Could not generate an answer.'

    return NextResponse.json({ answer, sources: Object.keys(sources) })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ answer: 'Error: ' + String(error) }, { status: 500 })
  }
}
