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
  if (lower.includes('rating') || lower.includes('review') || lower.includes('rated')) return 'rating'
  if (lower.includes('brand')) return 'brand'
  return 'general'
}

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
const round2 = (n: number | null) => n !== null ? Math.round(n * 100) / 100 : null

const UK_SOURCES = ['asda', 'primark']
const getCurrency = (source: string) => UK_SOURCES.includes(source) ? '£' : '$'

const VALID_SOURCES = ['amazon', 'pfcandleco', 'homesick', 'paddywax', 'otherland', 'boysmells', 'keap', 'asda', 'primark']

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
    const dataSource: string = body.dataSource || 'current' // 'current', 'alltime', or a date string
    const intent = getQueryIntent(question)

    // ── Fetch products based on selected data source ──────────────────────────
    let all: any[] = []

    if (dataSource === 'current') {
      // Get latest snapshot date from history
      const { data: latestDateData } = await supabase
        .from('market_insights_history')
        .select('scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(1)

      const latestDate = latestDateData?.[0]?.scraped_at?.slice(0,10)

      if (latestDate) {
        // Use latest snapshot
        let query = supabase
          .from('market_insights_history')
          .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source')
          .gte('scraped_at', `${latestDate}T00:00:00`)
          .lte('scraped_at', `${latestDate}T23:59:59`)
          .limit(5000)

        if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)
        if (categoryFilter !== 'all') query = query.eq('candle_type', categoryFilter)

        const { data, error } = await query
        if (error) return NextResponse.json({ answer: 'Database error: ' + error.message })
        all = data || []
      } else {
        // Fallback to live table if no history
        let query = supabase
          .from('market_insights')
          .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source')
          .limit(5000)

        if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)
        if (categoryFilter !== 'all') query = query.eq('candle_type', categoryFilter)

        const { data, error } = await query
        if (error) return NextResponse.json({ answer: 'Database error: ' + error.message })
        all = data || []
      }
    } else if (dataSource === 'alltime') {
        // Also fetch history and add unique products not in live table
        const { data: histData } = await supabase
          .from('market_insights_history')
          .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source')
          .limit(5000)

        if (histData) {
          const liveKeys = new Set(all.map((p: any) => `${p.product_name}||${p.source}`))
          const extraFromHistory = histData.filter((p: any) => !liveKeys.has(`${p.product_name}||${p.source}`))
          all = [...all, ...extraFromHistory]
        }
      }
    } else {
      // Specific snapshot date — query history table
      let query = supabase
        .from('market_insights_history')
        .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source')
        .gte('scraped_at', `${dataSource}T00:00:00`)
        .lte('scraped_at', `${dataSource}T23:59:59`)
        .limit(5000)

      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)
      if (categoryFilter !== 'all') query = query.eq('candle_type', categoryFilter)

      const { data, error } = await query
      if (error) return NextResponse.json({ answer: 'Database error: ' + error.message })
      all = data || []
    }

    // ── Only keep valid sources — no hallucinated ones ────────────────────────
    all = all.filter((p: any) => VALID_SOURCES.includes(p.source))

    const sources = Array.from(new Set(all.map((p: any) => p.source).filter(Boolean)))

    // ── Dynamically compute available fields per source ───────────────────────
    const sourceStats = sources.map((src: any) => {
      const ps = all.filter((p: any) => p.source === src)
      const currency = getCurrency(src)
      const isUK = UK_SOURCES.includes(src)

      const prices   = ps.filter((p: any) => p.price != null).map((p: any) => p.price)
      const stars    = ps.filter((p: any) => p.stars != null).map((p: any) => p.stars)
      const reviews  = ps.filter((p: any) => p.reviews_count != null && p.reviews_count > 0).map((p: any) => p.reviews_count)
      const burnHz   = ps.filter((p: any) => p.burn_hours != null).map((p: any) => p.burn_hours)
      const burnPoz  = ps.filter((p: any) => p.burn_per_oz != null).map((p: any) => p.burn_per_oz)
      const pricePoz = ps.filter((p: any) => p.price_per_oz != null).map((p: any) => p.price_per_oz)
      const scents   = ps.filter((p: any) => p.scent_name).map((p: any) => p.scent_name)

      const availableFields: string[] = []
      const missingFields: string[] = []

      if (prices.length > 0) availableFields.push('price'); else missingFields.push('price')
      if (stars.length > 0) availableFields.push('ratings'); else missingFields.push('ratings')
      if (reviews.length > 0) availableFields.push('reviews'); else missingFields.push('reviews')
      if (burnHz.length > 0) availableFields.push('burn_hours'); else missingFields.push('burn_hours')
      if (burnPoz.length > 0) availableFields.push('burn_per_oz'); else missingFields.push('burn_per_oz')
      if (pricePoz.length > 0) availableFields.push('price_per_oz'); else missingFields.push('price_per_oz')
      if (scents.length > 0) availableFields.push('scent_name'); else missingFields.push('scent_name')

      return `${src.toUpperCase()} (${ps.length} products) ${isUK ? '[UK — prices in £ GBP, do NOT convert to USD]' : '[US — prices in $ USD]'}:
  AVAILABLE: ${availableFields.join(', ')}
  ${missingFields.length > 0 ? `NOT AVAILABLE (never mention these for this source): ${missingFields.join(', ')}` : 'ALL fields available'}
  Price: ${prices.length > 0 ? `min=${currency}${Math.min(...prices)} max=${currency}${Math.max(...prices)} avg=${currency}${round2(avg(prices))}` : 'NO DATA'}
  Ratings: ${stars.length > 0 ? `avg=${round2(avg(stars))}⭐ from ${stars.length} products` : 'NO DATA — do not mention ratings for this source'}
  Reviews: ${reviews.length > 0 ? `total=${reviews.reduce((a: number,b: number)=>a+b,0).toLocaleString()} from ${reviews.length} products` : 'NO DATA — do not mention reviews for this source'}
  Burn/oz: ${burnPoz.length > 0 ? `avg=${round2(avg(burnPoz))}h/oz from ${burnPoz.length} products` : 'NO DATA'}
  Price/oz: ${pricePoz.length > 0 ? `avg=${currency}${round2(avg(pricePoz))}/oz from ${pricePoz.length} products` : 'NO DATA'}
  Scents: ${scents.length > 0 ? `${scents.length} products have scent data` : 'NO DATA'}`
    }).join('\n\n')

    const getTop5 = (sortFn: (a:any,b:any)=>number, filterFn?:(p:any)=>boolean) =>
      [...all].filter(filterFn||(() => true)).sort(sortFn).slice(0,5)
        .map((p: any) => {
          const currency = getCurrency(p.source)
          return `"${(p.product_name||'').slice(0,45)}" [${p.source}] ${prices(p, currency)}`
        }).join('\n')

    function prices(p: any, currency: string) {
      const parts = []
      if (p.price) parts.push(`${currency}${p.price}`)
      if (p.stars) parts.push(`${p.stars}⭐`)
      if (p.reviews_count) parts.push(`${p.reviews_count}rev`)
      if (p.burn_per_oz) parts.push(`${p.burn_per_oz}h/oz`)
      if (p.price_per_oz) parts.push(`${currency}${p.price_per_oz}/oz`)
      if (p.scent_name) parts.push(`scent:${p.scent_name}`)
      return parts.join(' | ')
    }

    const bestBurn     = getTop5((a: any,b: any)=>(b.burn_per_oz||0)-(a.burn_per_oz||0), (p: any)=>p.burn_per_oz)
    const bestValue    = getTop5((a: any,b: any)=>(a.price_per_oz||999)-(b.price_per_oz||999), (p: any)=>p.price_per_oz)
    const bestRated    = getTop5((a: any,b: any)=>(b.stars||0)-(a.stars||0), (p: any)=>p.stars)
    const mostReviewed = getTop5((a: any,b: any)=>(b.reviews_count||0)-(a.reviews_count||0), (p: any)=>p.reviews_count)

    const scentMap: Record<string,number> = {}
    all.forEach((p: any) => { if (p.scent_name) scentMap[p.scent_name] = (scentMap[p.scent_name]||0)+1 })
    const topScents = Object.entries(scentMap).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([s,c])=>`${s}(${c})`).join(', ')

    const typeMap: Record<string,number> = {}
    all.forEach((p: any) => { if (p.candle_type) typeMap[p.candle_type] = (typeMap[p.candle_type]||0)+1 })
    const typeBreakdown = Object.entries(typeMap).map(([t,c])=>`${t}:${c}`).join(', ')

    const usBudget  = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price < 15).length
    const usMid     = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price >= 15 && p.price < 35).length
    const usPremium = all.filter((p: any) => p.price && !UK_SOURCES.includes(p.source) && p.price >= 35).length
    const ukBudget  = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price < 10).length
    const ukMid     = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price >= 10 && p.price < 20).length
    const ukPremium = all.filter((p: any) => p.price && UK_SOURCES.includes(p.source) && p.price >= 20).length

    const dataSourceLabel = dataSource === 'current' ? 'latest run (live table)' : dataSource === 'alltime' ? 'all-time combined' : `snapshot ${dataSource}`
    const filterNote = [
      `Data source: ${dataSourceLabel}`,
      sourceFilter !== 'all' ? `Source filter: ${sourceFilter} only` : '',
      categoryFilter !== 'all' ? `Category filter: ${categoryFilter} only` : ''
    ].filter(Boolean).join(' | ')

    const systemMsg = `You are a candle market intelligence analyst.

CRITICAL RULES — VIOLATIONS ARE NOT ACCEPTABLE:
1. Use ONLY the data provided below. NEVER invent numbers, products, or sources.
2. THIS DATASET CONTAINS EXACTLY THESE SOURCES: ${sources.join(', ')}. Any source not in this list (Walmart, Target, Costco, etc.) does NOT exist — never mention them.
3. Each source has AVAILABLE and NOT AVAILABLE fields listed. NEVER analyze, mention, or infer a NOT AVAILABLE metric for any source.
4. Keep prices in their original currency. NEVER convert £ to $ or vice versa.
5. Always clarify which source(s) an insight applies to.
6. End every response with: "📊 Coverage note: [which metrics are available for which sources]"
7. Max 250 words. Be specific with numbers.`

    const userMsg =
      `FILTERS: ${filterNote}\n` +
      `TOTAL: ${all.length} products across ${sources.length} sources: ${sources.join(', ')}\n\n` +
      `PER-SOURCE DATA:\n${sourceStats}\n\n` +
      `TYPE BREAKDOWN: ${typeBreakdown}\n` +
      `US PRICE SEGMENTS ($): budget(<$15):${usBudget} | mid($15-35):${usMid} | premium(>$35):${usPremium}\n` +
      `UK PRICE SEGMENTS (£): budget(<£10):${ukBudget} | mid(£10-20):${ukMid} | premium(>£20):${ukPremium}\n` +
      `TOP SCENTS (all sources): ${topScents}\n\n` +
      `BEST BURN EFFICIENCY (Amazon only — burn data not available for other sources):\n${bestBurn}\n\n` +
      `BEST VALUE price/oz (Amazon only — price/oz not available for other sources):\n${bestValue}\n\n` +
      `BEST RATED (Amazon only — ratings not available for other sources):\n${bestRated}\n\n` +
      `MOST REVIEWED (Amazon only — reviews not available for other sources):\n${mostReviewed}\n\n` +
      `QUESTION: ${question}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
        max_tokens: 500,
        temperature: 0.0
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
