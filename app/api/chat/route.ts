import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    // FIX 1: Check env var upfront
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({
        answer: 'Server config error: GROQ_API_KEY is not set in Vercel environment variables.'
      })
    }

    const body = await req.json()
    const question = body.question || ''

    const { data: products, error } = await supabase
      .from('market_insights')
      .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source, wick_quantity, material_type')
      .order('reviews_count', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ answer: 'Database error: ' + error.message })
    }

    const allProducts = products || []
    const sourceStats: Record<string, any> = {}
    for (const p of allProducts) {
      const s = p.source || 'unknown'
      if (!sourceStats[s]) {
        sourceStats[s] = { count: 0, price: 0, stars: 0, brand: 0, burnHours: 0, burnPerOz: 0, pricePerOz: 0, scent: 0, wicks: 0, material: 0, reviews: 0 }
      }
      sourceStats[s].count++
      if (p.price) sourceStats[s].price++
      if (p.stars) sourceStats[s].stars++
      if (p.brand) sourceStats[s].brand++
      if (p.burn_hours) sourceStats[s].burnHours++
      if (p.burn_per_oz) sourceStats[s].burnPerOz++
      if (p.price_per_oz) sourceStats[s].pricePerOz++
      if (p.scent_name) sourceStats[s].scent++
      if (p.wick_quantity) sourceStats[s].wicks++
      if (p.material_type) sourceStats[s].material++
      if (p.reviews_count) sourceStats[s].reviews++
    }

    const pct = (n: number, total: number) => Math.round((n / total) * 100) + '%'
    const dataQuality = Object.entries(sourceStats).map(([src, s]) =>
      src.toUpperCase() + " (" + s.count + " products): " +
      "Price=" + pct(s.price, s.count) +
      " Stars=" + pct(s.stars, s.count) +
      " Reviews=" + pct(s.reviews, s.count) +
      " Brand=" + pct(s.brand, s.count) +
      " BurnHours=" + pct(s.burnHours, s.count) +
      " BurnPerOz=" + pct(s.burnPerOz, s.count) +
      " PricePerOz=" + pct(s.pricePerOz, s.count) +
      " Scent=" + pct(s.scent, s.count) +
      " Wicks=" + pct(s.wicks, s.count) +
      " Material=" + pct(s.material, s.count)
    ).join('\n')

    const productLines = allProducts.map(p =>
      "- " + (p.product_name || "Unknown") +
      " | Source:" + (p.source || "?") +
      " | Brand:" + (p.brand || "unknown") +
      " | Price:$" + (p.price || "unknown") +
      " | Stars:" + (p.stars || "unknown") +
      " | Reviews:" + (p.reviews_count || 0) +
      " | BurnHrs:" + (p.burn_hours || "unknown") +
      " | BurnPerOz:" + (p.burn_per_oz || "unknown") +
      " | PricePerOz:$" + (p.price_per_oz || "unknown") +
      " | WeightOz:" + (p.weight_oz || "unknown") +
      " | Scent:" + (p.scent_name || "unknown") +
      " | Type:" + (p.candle_type || "unknown") +
      " | Wicks:" + (p.wick_quantity || "unknown") +
      " | Material:" + (p.material_type || "unknown")
    ).join('\n')

    const systemMsg = "You are a strict candle market data analyst. You NEVER hallucinate or invent data. You only report what is explicitly in the data. If data is missing for a field, say so clearly."

    const userMsg = "DATA QUALITY REPORT:\n" + dataQuality +
      "\n\nPRODUCT DATA (" + allProducts.length + " products):\n" + productLines +
      "\n\nSTRICT RULES:\n" +
      "1. Only use data explicitly present above\n" +
      "2. Fields showing 'unknown' are unavailable - do NOT guess\n" +
      "3. If comparison cannot be made - state which field is missing and for which source\n" +
      "4. NEVER invent prices, ratings, burn times or any numbers\n" +
      "5. Always cite the specific product name and its source\n" +
      "6. If user asks 'what data is available' - use the DATA QUALITY REPORT to explain\n" +
      "7. Keep answers concise - max 200 words\n" +
      "\nUSER QUESTION: " + question +
      "\n\nAnswer based strictly on the data above:"

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + groqKey,  // use the checked variable
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 350,
        temperature: 0.1
      })
    })

    const groqData = await groqRes.json()

    // FIX 2: Surface real Groq errors instead of hiding them
    if (!groqRes.ok || !groqData.choices?.[0]?.message?.content) {
      const errDetail = groqData.error?.message
        || groqData.error?.code
        || JSON.stringify(groqData).slice(0, 300)
      return NextResponse.json({
        answer: `Groq API error (${groqRes.status}): ${errDetail}`
      })
    }

    const answer = groqData.choices[0].message.content
    return NextResponse.json({ answer, sources: Object.keys(sourceStats) })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ answer: 'Error: ' + String(error) }, { status: 500 })
  }
}
