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
  if (lower.includes('amazon')) return 'amazon'
  if (lower.includes('pf') || lower.includes('candle co') || lower.includes('pfcandleco')) return 'pfcandleco'
  if (lower.includes('homesick')) return 'homesick'
  if (lower.includes('paddywax')) return 'paddywax'
  if (lower.includes('otherland')) return 'otherland'
  if (lower.includes('boy smells') || lower.includes('boysmells')) return 'boysmells'
  if (lower.includes('keap')) return 'keap'
  if (lower.includes('asda')) return 'asda'
  if (lower.includes('primark')) return 'primark'
  if (lower.includes('rating') || lower.includes('review') || lower.includes('rated')) return 'rating'
  if (lower.includes('brand')) return 'brand'
  if (lower.includes('available') || lower.includes('what data')) return 'overview'
  return 'general'
}

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
const round2 = (n: number | null) => n !== null ? Math.round(n * 100) / 100 : null

const UK_SOURCES = ['asda', 'primark']
const getCurrency = (source: string) => UK_SOURCES.includes(source) ? '£' : '$'

export async function POST(req: Request) {
  try {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({ answer: 'Server config error: GROQ_API_KEY is not set.' })
    }

    const body = await req.json()
    const question: string = body.question || ''
    const sourceFilter: string = body.sourceFilter || 'all'
    const categoryFilter: string = body.categoryFilter || 'all'
    const intent = getQueryIntent(question)

    let query = supabase
      .from('market_insights')
      .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source, wick_quantity, material_type')

    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter)
    } else if (['amazon','pfcandleco','homesick','paddywax','otherland','boysmells','keap','asda','primark'].includes(intent)) {
      query = query.eq('source', intent)
    }

    if (categoryFilter !== 'all') {
      query = query.eq('candle_type', categoryFilter)
    }

    if (intent === 'burn') {
      query = query.not('burn_per_oz', 'is', null).order('burn_per_oz', { ascending: false })
    } else if (intent === 'price') {
      query = query.not('price', 'is', null).order('price', { ascending: true })
    } else if (intent === 'rating') {
      query = query.not('stars', 'is', null).order('stars', { ascending: false })
    } else {
      query = query.order('reviews_count', { ascending: false })
    }

    const { data: products, error } = await query
    if (error) return NextResponse.json({ answer: 'Database error: ' + error.message })

    const all = products || []
    const sources = Array.from(new Set(all.map((p: any) => p.source).filter(Boolean)))

    // ── Dynamically compute available fields per source ──────────────────────
    const sourceStats = sources.map((src: any) => {
      const ps = all.filter((p: any) => p.source === src)
      const currency = getCurrency(src)
      const isUK = UK_SOURCES.includes(src)

      const prices   = ps.filter((p: any) => p.price).map((p: any) => p.price)
      const stars    = ps.filter((p: any) => p.stars).map((p: any) => p.stars)
      const reviews  = ps.filter((p: any) => p.reviews_count).map((p: any) => p.reviews_count)
      const burnHz   = ps.filter((p: any) => p.burn_hours).map((p: any) => p.burn_hours)
      const burnPoz  = ps.filter((p: any) => p.burn_per_oz).map((p: any) => p.burn_per_oz)
      const pricePoz = ps.filter((p: any) => p.price_per_oz).map((p: any) => p.price_per_oz)
      const scents   = ps.filter((p: any) => p.scent_name).map((p: any) => p.scent_name)

      // Dynamically build available fields note
      const availableFields: string[] = ['price']
      if (stars.length > 0) availableFields.push('ratings')
      if (reviews.length > 0) availableFields.push('reviews')
      if (burnHz.length > 0) availableFields.push('burn_hours')
      if (burnPoz.length > 0) availableFields.push('burn_per_oz')
      if (pricePoz.length > 0) availableFields.push('price_per_oz')
      if (scents.length > 0) availableFields.push('scent_name')

      const missingFields: string[] = []
      if (stars.length === 0) missingFields.push('ratings')
      if (reviews.length === 0) missingFields.push('reviews')
      if (burnHz.length === 0) missingFields.push('burn_hours')
      if (burnPoz.length === 0) missingFields.push('burn_per_oz')
      if (pricePoz.length === 0) missingFields.push('price_per_oz')

      return `${src.toUpperCase()} (${ps.length} products) ${isUK ? '[UK £ GBP]' : '[US $ USD]'}:
  AVAILABLE DATA: ${availableFields.join(', ')}
  ${missingFields.length > 0 ? `MISSING DATA (do NOT analyze or infer): ${missingFields.join(', ')}` : 'ALL fields available'}
  Price: min=${currency}${prices.length ? Math.min(...prices) : 'N/A'} max=${currency}${prices.length ? Math.max(...prices) : 'N/A'} avg=${currency}${round2(avg(prices))||'N/A'}
  Stars: ${stars.length > 0 ? `avg=${round2(avg(stars))} (${stars.length} products have ratings)` : 'NO RATING DATA — do not analyze'}
  Reviews: ${reviews.length > 0 ? `total=${reviews.reduce((a: number,b: number)=>a+b,0).toLocaleString()} (${reviews.length} products)` : 'NO REVIEW DATA — do not analyze'}
  Burn/oz: ${burnPoz.length > 0 ? `avg=${round2(avg(burnPoz))} (${burnPoz.length} products)` : 'NO BURN DATA — do not analyze'}
  Price/oz: ${pricePoz.length > 0 ? `avg=${currency}${round2(avg(pricePoz))} (${pricePoz.length} products)` : 'NO PRICE/OZ DATA — do not analyze'}
  Scents: ${scents.length > 0 ? `${scents.length} products have scent data` : 'no scent data'}`
    }).join('\n\n')

    const top10 = [...all]
      .sort((a: any,b: any) => (b.reviews_count||0) - (a.reviews_count||0))
      .slice(0,10)
      .map((p: any) => {
        const currency = getCurrency(p.source)
        const parts = [`"${(p.product_name||'').slice(0,50)}"`]
        if (p.source)        parts.push(`src:${p.source}`)
        if (p.brand)         parts.push(`brand:${p.brand}`)
        if (p.price)         parts.push(`${currency}${p.price}`)
        if (p.stars)         parts.push(`${p.stars}★`)
        if (p.reviews_count) parts.push(`${p.reviews_count}rev`)
        if (p.burn_hours)    parts.push(`${p.burn_hours}h`)
        if (p.burn_per_oz)   parts.push(`${p.burn_per_oz}h/oz`)
        if (p.price_per_oz)  parts.push(`${currency}${p.price_per_oz}/oz`)
        if (p.scent_name)    parts.push(`scent:${p.scent_name}`)
        return parts.join(' | ')
      }).join('\n')

    const getTop5 = (sortFn: (a:any,b:any)=>number, filterFn?:(p:any)=>boolean) =>
      [...all].filter(filterFn||(() => true)).sort(sortFn).slice(0,5)
        .map((p: any) => {
          const currency = getCurrency(p.source)
          return `"${(p.product_name||'').slice(0,45)}" src:${p.source} ${currency}${p.price||'?'} ${p.stars||'?'}★ ${p.reviews_count||0}rev` +
            (p.burn_per_oz  ? ` ${p.burn_per_oz}h/oz` : '') +
            (p.price_per_oz ? ` ${currency}${p.price_per_oz}/oz` : '')
        })
        .join('\n')

    const bestBurn     = getTop5((a: any,b: any)=>(b.burn_per_oz||0)-(a.burn_per_oz||0), (p: any)=>p.burn_per_oz)
    const bestValue    = getTop5((a: any,b: any)=>(a.price_per_oz||999)-(b.price_per_oz||999), (p: any)=>p.price_per_oz)
    const bestRated    = getTop5((a: any,b: any)=>(b.stars||0)-(a.stars||0), (p: any)=>p.stars)
    const mostReviewed = getTop5((a: any,b: any)=>(b.reviews_count||0)-(a.reviews_count||0))

    const scentMap: Record<string,number> = {}
    all.forEach((p: any) => { if (p.scent_name) scentMap[p.scent_name] = (scentMap[p.scent_name]||0)+1 })
    const topScents = Object.entries(scentMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([s,c])=>`${s}(${c})`).join(', ')

    const brandMap: Record<string,number> = {}
    all.forEach((p: any) => { if (p.brand) brandMap[p.brand] = (brandMap[p.brand]||0)+1 })
    const topBrands = Object.entries(brandMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([b,c])=>`${b}(${c})`).join(', ')

    const typeMap: Record<string,number> = {}
    all.forEach((p: any) => { if (p.candle_type) typeMap[p.candle_type] = (typeMap[p.candle_type]||0)+1 })
    const typeBreakdown = Object.entries(typeMap).map(([t,c])=>`${t}:${c}`).join(', ')

    const usBudget  = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price < 15).length
    const usMid     = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price >= 15 && p.price < 35).length
    const usPremium = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price >= 35).length
    const ukBudget  = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price < 10).length
    const ukMid     = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price >= 10 && p.price < 20).length
    const ukPremium = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price >= 20).length

    const filterNote = [
      sourceFilter !== 'all' ? `Source: ${sourceFilter} only` : '',
      categoryFilter !== 'all' ? `Category: ${categoryFilter} only` : ''
    ].filter(Boolean).join(', ')

    const systemMsg = `You are a candle market intelligence analyst. 

CRITICAL RULES:
1. Answer using ONLY the statistics and product data provided. NEVER invent or assume numbers.
2. Each source has different available data fields — ONLY analyze metrics marked as AVAILABLE for each source.
3. If a source shows "MISSING DATA" for a metric, do NOT analyze, infer, or mention that metric for that source.
4. When analyzing multiple sources, clearly state which source each insight applies to.
5. ASDA and Primark are UK retailers — always use £ (GBP). All others use $ (USD).
6. Be concise — max 250 words.
7. If the question asks about a metric not available for a source, explicitly say "data not available for [source]".`

    const userMsg =
      (filterNote ? `ACTIVE FILTERS: ${filterNote}\n\n` : '') +
      `DATASET: ${all.length} total products across ${sources.length} sources\n\n` +
      `PER-SOURCE STATISTICS (with available/missing fields clearly marked):\n${sourceStats}\n\n` +
      `TYPE BREAKDOWN: ${typeBreakdown}\n` +
      `US PRICE BUCKETS (USD): budget(<$15):${usBudget} mid($15-35):${usMid} premium(>$35):${usPremium}\n` +
      `UK PRICE BUCKETS (GBP): budget(<£10):${ukBudget} mid(£10-20):${ukMid} premium(>£20):${ukPremium}\n` +
      `TOP SCENTS: ${topScents}\n` +
      `TOP BRANDS: ${topBrands}\n\n` +
      `TOP 10 BY REVIEWS:\n${top10}\n\n` +
      `BEST BURN EFFICIENCY (Amazon only — other sources lack this data):\n${bestBurn}\n\n` +
      `BEST VALUE price/oz (Amazon only — other sources lack this data):\n${bestValue}\n\n` +
      `BEST RATED (Amazon only — other sources lack rating data):\n${bestRated}\n\n` +
      `MOST REVIEWED (Amazon only — other sources lack review data):\n${mostReviewed}\n\n` +
      `QUESTION: ${question}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok || !groqData.choices?.[0]?.message?.content) {
      const errDetail = groqData.error?.message || JSON.stringify(groqData).slice(0,300)
      return NextResponse.json({ answer: `Groq API error (${groqRes.status}): ${errDetail}` })
    }

    return NextResponse.json({ answer: groqData.choices[0].message.content, sources })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ answer: 'Error: ' + String(error) }, { status: 500 })
  }
}
