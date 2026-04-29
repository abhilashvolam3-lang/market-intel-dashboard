import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getQueryIntent(q: string) {
  const lower = q.toLowerCase()
  if (lower.includes('burn') || lower.includes('efficient')) return 'burn'
  if (lower.includes('price') || lower.includes('cheap') || lower.includes('value') || lower.includes('cost')) return 'price'
  if (lower.includes('scent') || lower.includes('fragrance') || lower.includes('smell')) return 'scent'
  if (lower.includes('walmart')) return 'walmart'
  if (lower.includes('target')) return 'target'
  if (lower.includes('pf') || lower.includes('candle co')) return 'pfcandleco'
  if (lower.includes('amazon')) return 'amazon'
  if (lower.includes('asda')) return 'asda'
  if (lower.includes('primark')) return 'primark'
  if (lower.includes('rating') || lower.includes('review') || lower.includes('rated')) return 'rating'
  if (lower.includes('brand')) return 'brand'
  if (lower.includes('available') || lower.includes('what data')) return 'overview'
  return 'general'
}

export async function POST(req: Request) {
  try {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({
        answer: 'Server config error: GROQ_API_KEY is not set in Vercel environment variables.'
      })
    }

    const body = await req.json()
    const question: string = body.question || ''
    const sourceFilter: string = body.sourceFilter || 'all'
    const categoryFilter: string = body.categoryFilter || 'all'
    const intent = getQueryIntent(question)

    // Build targeted Supabase query — max 50 products to stay under Groq token limit
    let query = supabase
      .from('market_insights')
      .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source, wick_quantity, material_type')

    // UI filter takes priority, then fall back to intent-based source filter
    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter)
    } else if (['walmart', 'target', 'pfcandleco', 'amazon', 'asda', 'primark'].includes(intent)) {
      query = query.eq('source', intent)
    }

    // Apply category filter from UI
    if (categoryFilter !== 'all') {
      query = query.eq('candle_type', categoryFilter)
    }

    // Sort by most relevant field for the question type
    if (intent === 'burn') {
      query = query.not('burn_per_oz', 'is', null).order('burn_per_oz', { ascending: false })
    } else if (intent === 'price') {
      query = query.not('price', 'is', null).order('price_per_oz', { ascending: true })
    } else if (intent === 'rating') {
      query = query.not('stars', 'is', null).order('stars', { ascending: false })
    } else {
      query = query.order('reviews_count', { ascending: false })
    }

    const { data: products, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ answer: 'Database error: ' + error.message })
    }

    const allProducts = products || []

    // Compact per-source stats
    const sourceStats: Record<string, { count: number; avgPrice: number; avgStars: number; priceCount: number; starsCount: number }> = {}
    for (const p of allProducts) {
      const s = p.source || 'unknown'
      if (!sourceStats[s]) sourceStats[s] = { count: 0, avgPrice: 0, avgStars: 0, priceCount: 0, starsCount: 0 }
      sourceStats[s].count++
      if (p.price) { sourceStats[s].avgPrice += p.price; sourceStats[s].priceCount++ }
      if (p.stars) { sourceStats[s].avgStars += p.stars; sourceStats[s].starsCount++ }
    }

    const summaryLines = Object.entries(sourceStats).map(([src, s]) => {
      const avgP = s.priceCount ? (s.avgPrice / s.priceCount).toFixed(2) : 'N/A'
      const avgS = s.starsCount ? (s.avgStars / s.starsCount).toFixed(1) : 'N/A'
      return `${src.toUpperCase()}: ${s.count} products, avg $${avgP}, avg ${avgS}★`
    }).join('\n')

    // Ultra-compact product lines — omit null/undefined fields entirely to save tokens
    const productLines = allProducts.map(p => {
      const parts: string[] = [`"${(p.product_name || 'Unknown').slice(0, 45)}"`]
      if (p.source)        parts.push(`src:${p.source}`)
      if (p.brand)         parts.push(`brand:${p.brand}`)
      if (p.price)         parts.push(`$${p.price}`)
      if (p.stars)         parts.push(`${p.stars}★`)
      if (p.reviews_count) parts.push(`${p.reviews_count}rev`)
      if (p.burn_hours)    parts.push(`${p.burn_hours}h`)
      if (p.burn_per_oz)   parts.push(`${p.burn_per_oz}h/oz`)
      if (p.price_per_oz)  parts.push(`$${p.price_per_oz}/oz`)
      if (p.weight_oz)     parts.push(`${p.weight_oz}oz`)
      if (p.scent_name)    parts.push(`scent:${p.scent_name}`)
      if (p.candle_type)   parts.push(`type:${p.candle_type}`)
      if (p.wick_quantity) parts.push(`wicks:${p.wick_quantity}`)
      if (p.material_type) parts.push(`mat:${p.material_type}`)
      return parts.join(' | ')
    }).join('\n')

    // Describe active UI filters so AI can acknowledge them in its answer
    const filterNote = [
      sourceFilter !== 'all' ? `Source: ${sourceFilter} only` : '',
      categoryFilter !== 'all' ? `Category: ${categoryFilter} only` : ''
    ].filter(Boolean).join(', ')

    const systemMsg = `You are a candle market analyst. Answer using ONLY the data provided. Never invent or guess any numbers. If a field is missing for a source, say so. Be concise — max 150 words.`

    const userMsg =
      (filterNote ? `ACTIVE FILTERS: ${filterNote}\n\n` : '') +
      `SOURCE SUMMARY:\n${summaryLines}\n\n` +
      `TOP ${allProducts.length} PRODUCTS (sorted for: ${intent}):\n${productLines}\n\n` +
      `QUESTION: ${question}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + groqKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    })

    const groqData = await groqRes.json()

    if (!groqRes.ok || !groqData.choices?.[0]?.message?.content) {
      const errDetail =
        groqData.error?.message ||
        groqData.error?.code ||
        JSON.stringify(groqData).slice(0, 300)
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
