'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function renderLine(line: string, j: number) {
  const clean = line.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) return null
  if (clean.startsWith('## ') || clean.match(/^#{1,3}\s/))
    return <p key={j} style={{ fontWeight: 700, color: '#e2e8f0', margin: '14px 0 6px', fontSize: 14, borderBottom: '1px solid #2a2f3e', paddingBottom: 4 }}>{clean.replace(/^#{1,3}\s/, '').replace('## ', '')}</p>
  if (clean.match(/^\d+\.\s/))
    return <p key={j} style={{ fontWeight: 700, color: '#e2e8f0', margin: '10px 0 4px', fontSize: 13 }}>{clean}</p>
  if (clean.startsWith('* '))
    return <p key={j} style={{ fontWeight: 600, color: '#93c5fd', margin: '10px 0 5px', fontSize: 13, borderLeft: '2px solid #3b82f6', paddingLeft: 8 }}>{clean.replace(/^\*\s/, '')}</p>
  if (clean.startsWith('+ ') || clean.startsWith('- ') || clean.startsWith('•'))
    return (
      <div key={j} style={{ display: 'flex', gap: 8, margin: '4px 0', paddingLeft: 8 }}>
        <span style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }}>▸</span>
        <span style={{ color: '#a0aec0', fontSize: 13 }}>{clean.replace(/^[+\-•]\s/, '')}</span>
      </div>
    )
  return <p key={j} style={{ margin: '4px 0', color: '#a0aec0', fontSize: 13 }}>{clean}</p>
}

const SOURCE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string; tier: string }> = {
  amazon:    { color: '#fbbf24', bg: '#ff990020', label: 'AMAZON',     icon: '📦', tier: 'Mass Market'   },
  pfcandleco:{ color: '#a78bfa', bg: '#8b5cf620', label: 'PF CANDLE',  icon: '✨', tier: 'Premium Indie' },
  homesick:  { color: '#f97316', bg: '#f9731620', label: 'HOMESICK',   icon: '🏠', tier: 'Mid-Premium'   },
  paddywax:  { color: '#10b981', bg: '#10b98120', label: 'PADDYWAX',   icon: '🕯', tier: 'Artisan'       },
  otherland: { color: '#ec4899', bg: '#ec489920', label: 'OTHERLAND',  icon: '🌿', tier: 'Premium Indie' },
  boysmells: { color: '#8b5cf6', bg: '#8b5cf620', label: 'BOY SMELLS', icon: '🌸', tier: 'Luxury'        },
  keap:      { color: '#34d399', bg: '#34d39920', label: 'KEAP',       icon: '🌱', tier: 'Eco'           },
  asda:      { color: '#84cc16', bg: '#84cc1620', label: 'ASDA',       icon: '🛒', tier: 'UK Grocery'    },
  primark:   { color: '#f9a8d4', bg: '#ec489920', label: 'PRIMARK',    icon: '👜', tier: 'UK Budget'     },
}

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  amazon: 'Amazon', pfcandleco: 'P.F. Candle Co', homesick: 'Homesick',
  paddywax: 'Paddywax', otherland: 'Otherland', boysmells: 'Boy Smells',
  keap: 'Keap', asda: 'ASDA', primark: 'Primark',
}

const FEATURES = [
  { key: 'price',     label: 'Price Analysis',    desc: 'Price range, price/oz, best value'    },
  { key: 'burn',      label: 'Burn Efficiency',   desc: 'Burn hours, burn/oz, best efficiency' },
  { key: 'scent',     label: 'Scent Analysis',    desc: 'Top scents, scent families, trends'   },
  { key: 'brand',     label: 'Brand Landscape',   desc: 'Brand landscape, top brands'          },
  { key: 'sentiment', label: 'Customer Sentiment',desc: 'Reviews, complaints, 5-star drivers'  },
  { key: 'overall',   label: 'Full Analysis',     desc: 'Complete market overview'             },
]

const PRODUCT_TYPES = [
  { key: 'all',           label: 'All Products'    },
  { key: 'jar-container', label: 'Jar / Container' },
  { key: 'multi-pack',    label: 'Multi-Pack'      },
  { key: 'tea-light',     label: 'Tea Light'       },
  { key: 'taper-pillar',  label: 'Taper / Pillar'  },
  { key: 'reed-diffuser', label: 'Reed Diffuser'   },
  { key: 'other',         label: 'Others'          },
]

const SCENT_FAMILIES: Record<string, string[]> = {
  'Floral':    ['rose','jasmine','peony','lily','iris','neroli','lavender','violet','gardenia','magnolia'],
  'Woody':     ['cedar','sandalwood','vetiver','oud','hinoki','pine','santal','patchouli','wood','birch'],
  'Citrus':    ['grapefruit','lemon','orange','bergamot','citrus','lime','yuzu','mandarin','tangerine'],
  'Amber/Warm':['amber','vanilla','tonka','musk','caramel','honey','sugar','praline','benzoin'],
  'Fresh':     ['fresh','clean','cotton','linen','ocean','sea','air','aqua','rain','breeze'],
  'Spice':     ['tobacco','smoke','pepper','clove','cinnamon','cardamom','ginger','nutmeg'],
  'Green':     ['eucalyptus','herb','basil','fig','green','grass','moss','fern','tea','sage'],
  'Fruity':    ['cherry','apple','peach','pear','plum','berry','coconut','mango','fig'],
}

const UK_SOURCES = ['asda', 'primark']

type SourceKey = 'all' | 'amazon' | 'pfcandleco' | 'homesick' | 'paddywax' | 'otherland' | 'boysmells' | 'keap' | 'asda' | 'primark'
type CandleType = 'all' | 'jar-container' | 'multi-pack' | 'tea-light' | 'taper-pillar' | 'reed-diffuser' | 'other'
type ScentFilter = 'all' | 'scented' | 'unscented'
type SortKey = 'reviews_count' | 'stars' | 'price' | 'burn_hours' | 'burn_per_oz' | 'price_per_oz'
type TabKey = 'analysis' | 'charts' | 'scent' | 'brands' | 'data' | 'history' | 'newproducts'

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

// ── Mini bar chart component ──────────────────────────────────────────────────
function MiniBar({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#8892a4', fontSize: 11 }}>{sublabel || value}</span>
      </div>
      <div style={{ background: '#1e2433', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

// ── Donut chart (pure CSS/SVG) ────────────────────────────────────────────────
function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0)
  if (total === 0) return null
  const r = 50, cx = 60, cy = 60, stroke = 18
  const circ = 2 * Math.PI * r
  let offset = 0
  const slices = data.map(d => {
    const pct = d.value / total
    const dash = pct * circ
    const slice = { ...d, dash, offset, pct }
    offset += dash
    return slice
  })
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2433" strokeWidth={stroke} />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset + circ / 4}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#8892a4" fontSize="8">products</text>
    </svg>
  )
}

export default function Home() {
  const [activeTab, setActiveTab]               = useState<TabKey>('analysis')
  const [allProducts, setAllProducts]           = useState<any[]>([])
  const [trend, setTrend]                       = useState<any>(null)
  const [loading, setLoading]                   = useState(true)
  const [filterCompany, setFilterCompany]       = useState<SourceKey>('all')
  const [filterProduct, setFilterProduct]       = useState<CandleType>('all')
  const [filterFeature, setFilterFeature]       = useState('overall')
  const [summary, setSummary]                   = useState('')
  const [summaryLoading, setSummaryLoading]     = useState(false)
  const [summaryGenerated, setSummaryGenerated] = useState(false)
  const [chatQuestion, setChatQuestion]         = useState('')
  const [chatLoading, setChatLoading]           = useState(false)
  const [chatHistory, setChatHistory]           = useState<{q:string;a:string}[]>([])
  const [activeSource, setActiveSource]         = useState<SourceKey>('all')
  const [activeCandleType, setActiveCandleType] = useState<CandleType>('all')
  const [activeScentFilter, setActiveScentFilter] = useState<ScentFilter>('all')
  const [sortBy, setSortBy]                     = useState<SortKey>('reviews_count')
  const [searchTerm, setSearchTerm]             = useState('')
  const [selectedProduct, setSelectedProduct]   = useState<any>(null)
  const [chartMetric, setChartMetric]           = useState<'count'|'avg_price'|'avg_burn'|'avg_rating'>('count')
  const [exportStatus, setExportStatus]         = useState('')
  const [historyData, setHistoryData]           = useState<any[]>([])
  const [historyLoading, setHistoryLoading]     = useState(false)
  const [historyLoaded, setHistoryLoaded]       = useState(false)
  const [historyDateFilter, setHistoryDateFilter] = useState('all')
  const [historySubTab, setHistorySubTab] = useState<'runs'|'trends'>('runs')
  const [dashboardView, setDashboardView] = useState<'latest'|'alltime'>('latest')
  const [priceTrackerSearch, setPriceTrackerSearch] = useState('')
  const [priceTrackerSelected, setPriceTrackerSelected] = useState<any>(null)
  const [analysisDataSource, setAnalysisDataSource] = useState<'current'|'alltime'|string>('current')
  const [analysisProducts, setAnalysisProducts] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const [{ data: trends }, { data: products }] = await Promise.all([
        supabase.from('trend_analysis').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('market_insights').select('*').order('reviews_count', { ascending: false }).limit(5000),
      ])
      setTrend(trends?.[0] || null)
      setAllProducts((products || []).filter((p: any) => p.source !== 'byredo'))
      setLoading(false)
    }
    fetchData()
  }, [])

  const generateSummary = async () => {
    setSummaryLoading(true); setSummaryGenerated(false); setSummary('')
    try {
      const featureLabel = FEATURES.find(f => f.key === filterFeature)?.label || filterFeature
      const companyLabel = filterCompany === 'all' ? 'all companies' : SOURCE_DISPLAY_NAMES[filterCompany]
      const productLabel = PRODUCT_TYPES.find(p => p.key === filterProduct)?.label || filterProduct
      const dsLabel = analysisDataSource === 'current' ? 'current data' : analysisDataSource === 'alltime' ? 'all-time combined data' : `snapshot ${analysisDataSource}`
      const question = `Generate a focused ${featureLabel} for ${companyLabel}, product type: ${productLabel}. Using ${dsLabel}. Be specific with numbers and actionable insights.`
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sourceFilter: filterCompany, categoryFilter: filterProduct, dataSource: analysisDataSource })
      })
      const data = await res.json()
      setSummary(data.answer || 'No summary generated.')
      setSummaryGenerated(true)
    } catch { setSummary('Error.'); setSummaryGenerated(true) }
    setSummaryLoading(false)
  }

  const askQuestion = async () => {
    if (!chatQuestion.trim()) return
    setChatLoading(true)
    const q = chatQuestion; setChatQuestion('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sourceFilter: filterCompany, categoryFilter: filterProduct, dataSource: analysisDataSource })
      })
      const data = await res.json()
      setChatHistory(prev => [...prev, { q, a: data.answer }])
    } catch { setChatHistory(prev => [...prev, { q, a: 'Error.' }]) }
    setChatLoading(false)
  }

  // ── Fetch history when tab is opened ─────────────────────────────────────
  useEffect(() => {
    if (!historyLoaded) {
      setHistoryLoading(true)
      supabase
        .from('market_insights_history')
        .select('id,scraped_at,source,product_name,brand,price,stars,reviews_count,candle_type,scent_name,is_scented,weight_oz,burn_hours,burn_per_oz,price_per_oz,availability,image_url')
        .order('scraped_at', { ascending: false })
        .limit(5000)
        .then(({ data }) => {
          setHistoryData(data || [])
          setHistoryLoaded(true)
          setHistoryLoading(false)
        })
    }
  }, [])
  const exportCSV = (products: any[], filename: string) => {
    const cols = ['product_name','brand','source','price','stars','reviews_count','burn_hours','weight_oz','burn_per_oz','price_per_oz','candle_type','scent_name','is_scented','availability']
    const header = cols.join(',')
    const rows = products.map(p =>
      cols.map(c => {
        const v = p[c]
        if (v === null || v === undefined) return ''
        const s = String(v).replace(/"/g, '""')
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    setExportStatus(`✓ Exported ${products.length} products`)
    setTimeout(() => setExportStatus(''), 3000)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const bySource = (src: string) => allProducts.filter(p => p.source === src)
  const amazonP = bySource('amazon'), pfP = bySource('pfcandleco'), hsP = bySource('homesick')
  const pwP = bySource('paddywax'), olP = bySource('otherland'), bsP = bySource('boysmells')
  const kpP = bySource('keap'), asdaP = bySource('asda'), priP = bySource('primark')

  const totalReviews = allProducts.reduce((a, b) => a + (b.reviews_count || 0), 0)
  const validStars   = allProducts.filter(p => p.stars).map(p => p.stars)
  const validBurnHz  = allProducts.filter(p => p.burn_hours).map(p => p.burn_hours)
  const validBurnPoz = allProducts.filter(p => p.burn_per_oz).map(p => p.burn_per_oz)
  const validPPoz    = allProducts.filter(p => p.price_per_oz).map(p => p.price_per_oz)

  // Chart data by source
  const chartData = useMemo(() => {
    return Object.keys(SOURCE_CONFIG).map(src => {
      const ps = allProducts.filter(p => p.source === src)
      const prices = ps.filter(p => p.price).map(p => p.price)
      const stars  = ps.filter(p => p.stars).map(p => p.stars)
      const burns  = ps.filter(p => p.burn_hours).map(p => p.burn_hours)
      return {
        src,
        count:      ps.length,
        avg_price:  avg(prices),
        avg_rating: avg(stars),
        avg_burn:   avg(burns),
        color:      SOURCE_CONFIG[src].color,
        label:      SOURCE_CONFIG[src].label,
      }
    }).filter(d => d.count > 0)
  }, [allProducts])

  // Candle type breakdown
  const typeData = useMemo(() => {
    const map: Record<string, number> = {}
    allProducts.forEach(p => { const t = p.candle_type || 'other'; map[t] = (map[t] || 0) + 1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1]).map(([type, count], i) => ({
      type, count,
      color: ['#3b82f6','#8b5cf6','#10b981','#f97316','#ec4899','#fbbf24','#06b6d4'][i % 7]
    }))
  }, [allProducts])

  // Scent family data
  const scentFamilyData = useMemo(() => {
    const result: Record<string, { count: number; brands: Record<string, number>; topScents: string[] }> = {}
    Object.keys(SCENT_FAMILIES).forEach(fam => result[fam] = { count: 0, brands: {}, topScents: [] })
    const scentCounts: Record<string, Record<string, number>> = {}
    allProducts.forEach(p => {
      const scent = (p.scent_name || '').toLowerCase()
      if (!scent) return
      for (const [fam, keywords] of Object.entries(SCENT_FAMILIES)) {
        if (keywords.some(kw => scent.includes(kw))) {
          result[fam].count++
          result[fam].brands[p.source] = (result[fam].brands[p.source] || 0) + 1
          if (!scentCounts[fam]) scentCounts[fam] = {}
          scentCounts[fam][p.scent_name] = (scentCounts[fam][p.scent_name] || 0) + 1
          break
        }
      }
    })
    Object.keys(result).forEach(fam => {
      if (scentCounts[fam]) {
        result[fam].topScents = Object.entries(scentCounts[fam]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s])=>s)
      }
    })
    return Object.entries(result).filter(([,v]) => v.count > 0).sort((a,b)=>b[1].count-a[1].count)
  }, [allProducts])

  // Brand comparison data
  const brandComparisonData = useMemo(() => {
    return Object.entries(SOURCE_DISPLAY_NAMES).map(([src, name]) => {
      const ps = allProducts.filter(p => p.source === src)
      const prices    = ps.filter(p => p.price && !UK_SOURCES.includes(p.source)).map(p => p.price)
      const ukPrices  = ps.filter(p => p.price && UK_SOURCES.includes(p.source)).map(p => p.price)
      const allPrices = [...prices, ...ukPrices]
      const stars     = ps.filter(p => p.stars).map(p => p.stars)
      const burns     = ps.filter(p => p.burn_hours).map(p => p.burn_hours)
      const burnPoz   = ps.filter(p => p.burn_per_oz).map(p => p.burn_per_oz)
      const pricePoz  = ps.filter(p => p.price_per_oz).map(p => p.price_per_oz)
      const reviews   = ps.filter(p => p.reviews_count).map(p => p.reviews_count)
      const currency  = UK_SOURCES.includes(src) ? '£' : '$'
      const types: Record<string,number> = {}
      ps.forEach(p => { const t = p.candle_type||'other'; types[t]=(types[t]||0)+1 })
      const topType = Object.entries(types).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'
      return {
        src, name, count: ps.length, currency,
        avgPrice:   allPrices.length ? avg(allPrices) : null,
        minPrice:   allPrices.length ? Math.min(...allPrices) : null,
        maxPrice:   allPrices.length ? Math.max(...allPrices) : null,
        avgStars:   stars.length ? avg(stars) : null,
        avgBurn:    burns.length ? avg(burns) : null,
        avgBurnPoz: burnPoz.length ? avg(burnPoz) : null,
        avgPricePoz:pricePoz.length ? avg(pricePoz) : null,
        totalReviews: reviews.reduce((a,b)=>a+b,0),
        topType,
        cfg: SOURCE_CONFIG[src],
      }
    }).filter(d => d.count > 0)
  }, [allProducts])

  const filteredCount = filterCompany === 'all'
    ? allProducts.filter(p => filterProduct === 'all' || p.candle_type === filterProduct).length
    : allProducts.filter(p => p.source === filterCompany && (filterProduct === 'all' || p.candle_type === filterProduct)).length

  // Compute the dataset used for AI analysis based on selected source
  const snapshotDates = useMemo(() => {
    const dates = [...new Set(historyData.map((p: any) => p.scraped_at?.slice(0,10)))].filter(Boolean).sort().reverse()
    return dates
  }, [historyData])

  const allTimeCount = useMemo(() => {
    console.log('allTimeCount recompute - allProducts:', allProducts.length, 'historyData:', historyData.length)
    if (historyData.length === 0) return allProducts.length
    // All unique products ever: dedupe history by product_name+source, then union with current
    const historyUnique = new Map<string, any>()
    historyData.forEach((p:any) => {
      const key = `${p.product_name}||${p.source}`
      if (!historyUnique.has(key)) historyUnique.set(key, p)
    })
    const currentKeys = new Set(allProducts.map((p:any) => `${p.product_name}||${p.source}`))
    let extra = 0
    historyUnique.forEach((_, key) => { if (!currentKeys.has(key)) extra++ })
    console.log('historyUnique size:', historyUnique.size, 'extra:', extra, 'total:', allProducts.length + extra)
    return allProducts.length + extra
  }, [allProducts, historyData])

  const analysisDataset = useMemo(() => {
    if (analysisDataSource === 'current') return allProducts
    if (analysisDataSource === 'alltime') {
      const seen = new Set(allProducts.map((p:any) => `${p.product_name}||${p.source}`))
      const extra = historyData.filter((p:any) => !seen.has(`${p.product_name}||${p.source}`))
      return [...allProducts, ...extra]
    }
    return historyData.filter((p:any) => p.scraped_at?.slice(0,10) === analysisDataSource)
  }, [analysisDataSource, allProducts, historyData])

  const analysisFilteredCount = filterCompany === 'all'
    ? analysisDataset.filter((p:any) => filterProduct === 'all' || p.candle_type === filterProduct).length
    : analysisDataset.filter((p:any) => p.source === filterCompany && (filterProduct === 'all' || p.candle_type === filterProduct)).length

  const filteredProducts = allProducts
    .filter(p => activeSource === 'all' || p.source === activeSource)
    .filter(p => activeCandleType === 'all' || p.candle_type === activeCandleType)
    .filter(p => activeScentFilter === 'scented' ? p.is_scented === true : activeScentFilter === 'unscented' ? p.is_scented === false : true)
    .filter(p => !searchTerm || p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  // Latest run = most recent snapshot date from history
  const latestRunDate = useMemo(() => {
    const dates = [...new Set(historyData.map((h:any) => h.scraped_at?.slice(0,10)))].filter(Boolean).sort().reverse()
    return dates[0] || null
  }, [historyData])

  const latestRunProducts = useMemo(() => {
    if (!latestRunDate) return allProducts
    return historyData.filter((h:any) => h.scraped_at?.slice(0,10) === latestRunDate)
  }, [latestRunDate, historyData, allProducts])

  const allTimeProducts = useMemo(() => {
    const seen = new Set<string>()
    const result: any[] = []
    // Start with current live products
    allProducts.forEach((p:any) => {
      const key = `${p.product_name}||${p.source}`
      if (!seen.has(key)) { seen.add(key); result.push(p) }
    })
    // Add any from history not in current
    historyData.forEach((p:any) => {
      const key = `${p.product_name}||${p.source}`
      if (!seen.has(key)) { seen.add(key); result.push(p) }
    })
    return result
  }, [allProducts, historyData])

  const displayProducts = dashboardView === 'latest' ? latestRunProducts : allTimeProducts
  const displayBySource = (src: string) => displayProducts.filter((p:any) => p.source === src)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:40, marginBottom:16 }}>🕯️</div><p style={{ color:'#8892a4' }}>Loading...</p></div>
    </div>
  )

  const card = { background:'linear-gradient(135deg,#1e2433 0%,#1a1f2e 100%)', border:'1px solid #2a2f3e', borderRadius:12 }
  const pill = (active: boolean, color='#3b82f6') => ({ padding:'7px 13px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:active?color:'transparent', color:active?'#fff':'#8892a4' } as React.CSSProperties)

  const srcList = [
    {src:'amazon',products:amazonP},{src:'pfcandleco',products:pfP},{src:'homesick',products:hsP},
    {src:'paddywax',products:pwP},{src:'otherland',products:olP},{src:'boysmells',products:bsP},
    {src:'keap',products:kpP},{src:'asda',products:asdaP},{src:'primark',products:priP},
  ]

  const TABS: {key: TabKey; label: string}[] = [
    {key:'analysis',    label:'🧠 AI Analysis'},
    {key:'charts',      label:'📊 Charts'},
    {key:'scent',       label:'🌸 Scent Families'},
    {key:'brands',      label:'🏷️ Brand Compare'},
    {key:'data',        label:'📋 Data Explorer'},
    {key:'history',     label:'🕰️ History'},
    {key:'newproducts', label:'🆕 New Products'},
  ]

  // Chart metric max for bar scaling
  const chartMax = Math.max(...chartData.map(d => d[chartMetric] || 0))

  const fmt = (n: number | null, prefix='', suffix='', dec=0) =>
    n !== null && n !== undefined ? `${prefix}${n.toFixed(dec)}${suffix}` : '—'

  return (
    <main style={{ minHeight:'100vh', background:'#0f1117', fontFamily:"'DM Sans',system-ui,sans-serif", color:'#e8eaed' }}>
      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%)', borderBottom:'1px solid #2a2f3e', padding:'14px 40px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>🕯️ US Candle Market Intelligence</h1>
            <p style={{ color:'#8892a4', fontSize:11, margin:'2px 0 0' }}>Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Keap · ASDA · Primark</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {trend?.created_at && (
              <div style={{ textAlign:'right' }}>
                <p style={{ color:'#8892a4', fontSize:10, margin:0 }}>Last updated: {new Date(trend.created_at).toLocaleString()}</p>
                <p style={{ color:'#4a5568', fontSize:10, margin:'2px 0 0' }}>Next refresh: {(() => { const n=new Date(trend.created_at); n.setDate(n.getDate()+7); return n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) })()}</p>
              </div>
            )}
            <span style={{ background:'#1e2433', border:'1px solid #2a2f3e', color:'#8892a4', fontSize:10, padding:'5px 12px', borderRadius:20, fontWeight:600 }}>🔄 Weekly Auto-Sync</span>
            <span style={{ background:'#2ecc71', color:'#fff', fontSize:10, padding:'3px 10px', borderRadius:20, fontWeight:700 }}>● LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'16px 40px' }}>

        {/* VIEW TOGGLE */}
        <div style={{ display:'flex', gap:4, marginBottom:14, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:4, background:'#1e2433', borderRadius:10, padding:4 }}>
            <button onClick={()=>setDashboardView('latest')} style={{ padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:dashboardView==='latest'?'#3b82f6':'transparent', color:dashboardView==='latest'?'#fff':'#8892a4', transition:'all .2s' }}>
              📅 Latest Run {latestRunDate ? `(${latestRunDate})` : ''}
            </button>
            <button onClick={()=>setDashboardView('alltime')} style={{ padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:dashboardView==='alltime'?'#8b5cf6':'transparent', color:dashboardView==='alltime'?'#fff':'#8892a4', transition:'all .2s' }}>
              🗃️ All Time ({allTimeProducts.length} unique)
            </button>
          </div>
          <p style={{ color:'#4a5568', fontSize:10, margin:0 }}>
            {dashboardView==='latest' ? `Showing ${latestRunProducts.length} products from the most recent scrape run` : `Showing ${allTimeProducts.length} unique products across all scrape runs`}
          </p>
        </div>

        {/* KPI ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:12 }}>
          {[
            { label:'Products Tracked', value:displayProducts.length.toString(), sub: dashboardView==='latest' ? `Latest run · ${latestRunDate||''}` : `All time · ${allTimeProducts.length} unique`, color:'#3b82f6' },
            { label:'Total Reviews',    value:displayProducts.reduce((a:number,b:any)=>a+(b.reviews_count||0),0).toLocaleString(), sub:'Across all sources', color:'#8b5cf6' },
            { label:'Avg Rating',       value:(()=>{ const v=displayProducts.filter((p:any)=>p.stars).map((p:any)=>p.stars); return v.length?avg(v).toFixed(1)+' ⭐':'N/A' })(), sub:'Combined sources', color:'#f59e0b' },
            { label:'Avg Price/oz',     value:(()=>{ const v=displayProducts.filter((p:any)=>p.price_per_oz).map((p:any)=>p.price_per_oz); return v.length?'$'+avg(v).toFixed(2)+'/oz':'N/A' })(), sub:'Products with weight data', color:'#f97316' },
            { label:'Avg Burn Time',    value:(()=>{ const v=displayProducts.filter((p:any)=>p.burn_hours).map((p:any)=>p.burn_hours); return v.length?Math.round(avg(v))+' hrs':'N/A' })(), sub:'Products with burn data', color:'#ef4444' },
            { label:'Avg Burn/oz',      value:(()=>{ const v=displayProducts.filter((p:any)=>p.burn_per_oz).map((p:any)=>p.burn_per_oz); return v.length?avg(v).toFixed(1)+' hrs/oz':'N/A' })(), sub:'Products with burn data', color:'#06b6d4' },
          ].map((m,i) => (
            <div key={i} style={{ ...card, padding:'10px', borderTop:`3px solid ${m.color}`, transition:'transform .2s' }}
              onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
              <p style={{ color:'#8892a4', fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 4px' }}>{m.label}</p>
              <p style={{ color:'#fff', fontSize:15, fontWeight:800, margin:'0 0 2px' }}>{m.value}</p>
              <p style={{ color:'#8892a4', fontSize:8, margin:0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* TYPE COUNT VERIFICATION ROW */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center', background:'#1e2433', borderRadius:10, padding:'8px 14px' }}>
          <span style={{ color:'#4a5568', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', marginRight:4 }}>By Type:</span>
          {PRODUCT_TYPES.filter(pt=>pt.key!=='all').map(pt=>{
            const count = displayProducts.filter((p:any)=>(p.candle_type||'other')===pt.key).length
            const pct   = displayProducts.length > 0 ? ((count/displayProducts.length)*100).toFixed(0) : '0'
            if (count === 0) return null
            return (
              <span key={pt.key} style={{ fontSize:10, padding:'3px 9px', borderRadius:20, background:'#0f1117', border:'1px solid #2a2f3e', color:'#e2e8f0', display:'flex', gap:5, alignItems:'center' }}>
                <span style={{ color:'#8892a4' }}>{pt.label}</span>
                <span style={{ color:'#fff', fontWeight:700 }}>{count}</span>
                <span style={{ color:'#4a5568' }}>{pct}%</span>
              </span>
            )
          })}
          <span style={{ marginLeft:'auto', fontSize:10, color:'#4a5568' }}>
            Total: <span style={{ color:'#10b981', fontWeight:700 }}>{displayProducts.length}</span>
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:8, marginBottom:16 }}>
          {Object.keys(SOURCE_CONFIG).map(src => {
            const cfg = SOURCE_CONFIG[src]
            const count = displayBySource(src).length
            if (count === 0) return null
            return (
              <div key={src} onClick={()=>{setActiveTab('data');setActiveSource(src as SourceKey)}}
                style={{ ...card, padding:'8px 10px', border:`1px solid ${cfg.color}25`, cursor:'pointer', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=cfg.color+'25';e.currentTarget.style.transform='translateY(0)'}}>
                <p style={{ color:'#8892a4', fontSize:8, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cfg.icon} {SOURCE_DISPLAY_NAMES[src]}</p>
                <p style={{ color:'#6b7280', fontSize:8, margin:'0 0 3px' }}>{cfg.tier}</p>
                <p style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>{count}</p>
              </div>
            )
          })}
        </div>

        {/* TABS */}
        <div style={{ display:'flex', gap:4, marginBottom:16, background:'#1e2433', borderRadius:12, padding:4, width:'fit-content', flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{ padding:'9px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeTab===t.key?'#3b82f6':'transparent', color:activeTab===t.key?'#fff':'#8892a4', transition:'all .2s' }}>{t.label}</button>
          ))}
        </div>

        {/* ── AI ANALYSIS TAB ── */}
        {activeTab==='analysis' && (
          <div>
            <div style={{ ...card, padding:24, marginBottom:16 }}>
              <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 20px' }}>Select filters to generate your analysis</p>

              {/* Step 0 — Data Source */}
              <div style={{ marginBottom:18 }}>
                <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 8px' }}>Step 0 — Data Source</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[
                    { key:'current', label:`📊 Current (${allProducts.length})`, desc:'Live deduplicated data' },
                    { key:'alltime', label: historyLoading ? `🗃️ All Time (loading...)` : `🗃️ All Time (${allTimeCount})`, desc:'Current + history combined' },
                    ...snapshotDates.map(d => ({ key: d, label: `📅 ${d} (${historyData.filter((p:any)=>p.scraped_at?.slice(0,10)===d).length})`, desc: 'Specific snapshot' }))
                  ].map(opt => (
                    <button key={opt.key} onClick={()=>{ setAnalysisDataSource(opt.key) }}
                      style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:analysisDataSource===opt.key?'#10b981':'#0f1117', color:analysisDataSource===opt.key?'#fff':'#8892a4', outline:analysisDataSource===opt.key?'1px solid #10b981':'1px solid #2a2f3e' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {historyLoading && <p style={{ color:'#8892a4', fontSize:10, margin:'6px 0 0' }}>Loading history data...</p>}
                <p style={{ color:'#4a5568', fontSize:10, margin:'6px 0 0' }}>
                  {analysisDataSource === 'current' ? '🟢 Using live market_insights table' : analysisDataSource === 'alltime' ? '🟣 Using current + all historical snapshots combined' : `📅 Using snapshot from ${analysisDataSource}`}
                </p>
              </div>
              <div style={{ marginBottom:18 }}>
                <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 8px' }}>Step 1 — Company</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button onClick={()=>setFilterCompany('all')} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:filterCompany==='all'?'#3b82f6':'#0f1117', color:filterCompany==='all'?'#fff':'#8892a4', outline:filterCompany==='all'?'1px solid #3b82f6':'1px solid #2a2f3e' }}>All Companies</button>
                  {Object.entries(SOURCE_DISPLAY_NAMES).map(([key,name])=>{
                    const cfg=SOURCE_CONFIG[key]; const active=filterCompany===key
                    return <button key={key} onClick={()=>setFilterCompany(key as SourceKey)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:active?cfg.color:'#0f1117', color:active?'#000':'#8892a4', outline:active?`1px solid ${cfg.color}`:'1px solid #2a2f3e' }}>{cfg.icon} {name}</button>
                  })}
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 8px' }}>Step 2 — Product Type</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {PRODUCT_TYPES.map(pt=>{
                    const active=filterProduct===pt.key
                    return <button key={pt.key} onClick={()=>setFilterProduct(pt.key as CandleType)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:active?'#8b5cf6':'#0f1117', color:active?'#fff':'#8892a4', outline:active?'1px solid #8b5cf6':'1px solid #2a2f3e' }}>{pt.label}</button>
                  })}
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 8px' }}>Step 3 — Feature / Focus Area</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                  {FEATURES.map(f=>{
                    const active=filterFeature===f.key
                    return (
                      <button key={f.key} onClick={()=>setFilterFeature(f.key)} style={{ padding:'10px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, textAlign:'left', background:active?'linear-gradient(135deg,#1e3a5f,#1e2433)':'#0f1117', outline:active?'1px solid #3b82f6':'1px solid #2a2f3e', color:active?'#fff':'#8892a4' }}>
                        <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>{f.label}</div>
                        <div style={{ fontSize:10, color:active?'#93c5fd':'#4a5568' }}>{f.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
                <span style={{ color:'#4a5568', fontSize:11 }}>Generating for:</span>
                <span style={{ background:'#3b82f620', color:'#60a5fa', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{filterCompany==='all'?'All Companies':SOURCE_DISPLAY_NAMES[filterCompany]}</span>
                <span style={{ background:'#8b5cf620', color:'#a78bfa', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{PRODUCT_TYPES.find(p=>p.key===filterProduct)?.label}</span>
                <span style={{ background:'#10b98120', color:'#34d399', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{FEATURES.find(f=>f.key===filterFeature)?.label}</span>
                <span style={{ color:'#4a5568', fontSize:10 }}>({analysisFilteredCount} products)</span>
              </div>
              <button onClick={generateSummary} disabled={summaryLoading} style={{ background:summaryLoading?'#1e2433':'linear-gradient(135deg,#3b82f6,#8b5cf6)', color:'#fff', border:'none', borderRadius:10, padding:'13px 28px', fontSize:13, fontWeight:700, cursor:summaryLoading?'not-allowed':'pointer', opacity:summaryLoading?0.6:1, width:'100%' }}>
                {summaryLoading?'Generating Analysis...':'Generate Analysis'}
              </button>
            </div>

            {(summaryLoading||summaryGenerated)&&(
              <div style={{ ...card, padding:24, marginBottom:16 }}>
                {summaryLoading?(
                  <div style={{ textAlign:'center', padding:'32px 0' }}>
                    <div style={{ fontSize:28, marginBottom:10 }}>🧠</div>
                    <p style={{ color:'#8892a4', fontSize:13 }}>Analysing {analysisFilteredCount} products from {analysisDataSource === 'current' ? 'current data' : analysisDataSource === 'alltime' ? 'all-time data' : `snapshot ${analysisDataSource}`}...</p>
                  </div>
                ):(
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                      <div>
                        <h3 style={{ color:'#fff', fontSize:15, fontWeight:700, margin:0 }}>{FEATURES.find(f=>f.key===filterFeature)?.label}</h3>
                        <p style={{ color:'#8892a4', fontSize:11, margin:'3px 0 0' }}>{filterCompany==='all'?'All Companies':SOURCE_DISPLAY_NAMES[filterCompany]} · {PRODUCT_TYPES.find(p=>p.key===filterProduct)?.label} · {analysisFilteredCount} products · {analysisDataSource==='current'?'Current data':analysisDataSource==='alltime'?'All-time combined':`Snapshot ${analysisDataSource}`}</p>
                      </div>
                      <button onClick={()=>{setSummaryGenerated(false);setSummary('')}} style={{ background:'#0f1117', color:'#8892a4', border:'1px solid #2a2f3e', borderRadius:8, padding:'5px 12px', fontSize:11, cursor:'pointer' }}>Clear</button>
                    </div>
                    <div style={{ lineHeight:1.8 }}>{summary.split('\n').map((line,j)=>renderLine(line,j))}</div>
                  </>
                )}
              </div>
            )}

            <div style={{ ...card, padding:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <p style={{ color:'#8892a4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:0 }}>Ask AI about your data</p>
                <p style={{ color:'#4a5568', fontSize:10, margin:0 }}>Using: {filterCompany==='all'?'All':SOURCE_DISPLAY_NAMES[filterCompany]} · {filterProduct==='all'?'All types':filterProduct}</p>
              </div>
              {chatHistory.length>0&&(
                <div style={{ marginBottom:12, maxHeight:280, overflowY:'auto' }}>
                  {chatHistory.map((chat,i)=>(
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:4 }}><span style={{ color:'#3b82f6', fontSize:11, fontWeight:700 }}>You:</span><p style={{ color:'#e2e8f0', fontSize:12, margin:0 }}>{chat.q}</p></div>
                      <div style={{ display:'flex', gap:8 }}><span style={{ color:'#10b981', fontSize:11, fontWeight:700 }}>AI:</span><p style={{ color:'#a0aec0', fontSize:12, margin:0, lineHeight:1.7 }}>{chat.a}</p></div>
                      {i<chatHistory.length-1&&<div style={{ borderTop:'1px solid #2a2f3e', margin:'8px 0' }}/>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <input placeholder="e.g. Which candle has best burn efficiency?" value={chatQuestion} onChange={e=>setChatQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askQuestion()} style={{ flex:1, background:'#0f1117', border:'1px solid #2a2f3e', borderRadius:8, padding:'10px 14px', color:'#fff', fontSize:12, outline:'none' }}/>
                <button onClick={askQuestion} disabled={chatLoading||!chatQuestion.trim()} style={{ background:chatLoading?'#1e2433':'linear-gradient(135deg,#10b981,#3b82f6)', color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', fontSize:12, fontWeight:700, cursor:chatLoading?'not-allowed':'pointer', opacity:chatLoading?0.6:1 }}>{chatLoading?'...':'Ask'}</button>
                {chatHistory.length>0&&<button onClick={()=>setChatHistory([])} style={{ background:'#1e2433', color:'#8892a4', border:'1px solid #2a2f3e', borderRadius:8, padding:'10px 12px', fontSize:11, cursor:'pointer' }}>Clear</button>}
              </div>
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {['Best burn efficiency?','Cheapest price per oz?','Top scents?','Best rated candle?','Compare brand prices'].map(q=>(
                  <button key={q} onClick={()=>setChatQuestion(q)} style={{ background:'#0f1117', border:'1px solid #2a2f3e', borderRadius:20, padding:'3px 10px', color:'#8892a4', fontSize:10, cursor:'pointer' }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHARTS TAB ── */}
        {activeTab==='charts' && (
          <div>
            {/* Metric selector */}
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ color:'#8892a4', fontSize:11, fontWeight:700 }}>Metric:</span>
              {([
                {key:'count',      label:'Product Count'},
                {key:'avg_price',  label:'Avg Price'},
                {key:'avg_burn',   label:'Avg Burn Hours'},
                {key:'avg_rating', label:'Avg Rating'},
              ] as const).map(m=>(
                <button key={m.key} onClick={()=>setChartMetric(m.key)} style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:chartMetric===m.key?'#3b82f6':'#1e2433', color:chartMetric===m.key?'#fff':'#8892a4' }}>{m.label}</button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              {/* Bar chart by source */}
              <div style={{ ...card, padding:20 }}>
                <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 16px' }}>
                  {chartMetric==='count'?'Products per Source':chartMetric==='avg_price'?'Avg Price per Source':chartMetric==='avg_burn'?'Avg Burn Hours per Source':'Avg Rating per Source'}
                </p>
                {chartData.map(d => (
                  <MiniBar key={d.src}
                    value={Math.round((d[chartMetric]||0) * 100) / 100}
                    max={chartMax}
                    color={d.color}
                    label={SOURCE_DISPLAY_NAMES[d.src] || d.src}
                    sublabel={
                      chartMetric==='count' ? `${d.count} products` :
                      chartMetric==='avg_price' ? (UK_SOURCES.includes(d.src)?'£':'$') + (d.avg_price||0).toFixed(2) :
                      chartMetric==='avg_burn' ? (d.avg_burn||0).toFixed(0) + ' hrs' :
                      (d.avg_rating||0).toFixed(1) + ' ⭐'
                    }
                  />
                ))}
              </div>

              {/* Candle type donut + breakdown */}
              <div style={{ ...card, padding:20 }}>
                <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 16px' }}>Product Type Breakdown</p>
                <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                  <DonutChart data={typeData.map(d=>({label:d.type,value:d.count,color:d.color}))} size={160} />
                  <div style={{ flex:1 }}>
                    {typeData.map(d=>(
                      <div key={d.type} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }}/>
                          <span style={{ color:'#e2e8f0', fontSize:11 }}>{d.type==='jar-container'?'Jar / Container':d.type==='multi-pack'?'Multi-Pack':d.type==='tea-light'?'Tea Light':d.type==='taper-pillar'?'Taper / Pillar':d.type==='reed-diffuser'?'Reed Diffuser':d.type}</span>
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>{d.count}</span>
                          <span style={{ color:'#8892a4', fontSize:10 }}>{((d.count/allProducts.length)*100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Price distribution by brand (horizontal bars) */}
            <div style={{ ...card, padding:20, marginBottom:16 }}>
              <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 16px' }}>Price Range by Brand</p>
              <div style={{ overflowX:'auto' }}>
                <div style={{ minWidth:600 }}>
                  {brandComparisonData.filter(d=>d.avgPrice).map(d=>{
                    const allPricesFlat = allProducts.filter(p=>p.price).map(p=>p.price)
                    const globalMax = Math.max(...allPricesFlat)
                    const minPct = ((d.minPrice||0)/globalMax)*100
                    const maxPct = ((d.maxPrice||0)/globalMax)*100
                    const avgPct = ((d.avgPrice||0)/globalMax)*100
                    return (
                      <div key={d.src} style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ color:d.cfg.color, fontSize:11, fontWeight:700 }}>{d.cfg.icon} {d.name}</span>
                          <span style={{ color:'#8892a4', fontSize:10 }}>{d.currency}{(d.minPrice||0).toFixed(2)} – {d.currency}{(d.maxPrice||0).toFixed(2)} (avg {d.currency}{(d.avgPrice||0).toFixed(2)})</span>
                        </div>
                        <div style={{ background:'#0f1117', borderRadius:4, height:10, position:'relative' }}>
                          <div style={{ position:'absolute', left:`${minPct}%`, width:`${maxPct-minPct}%`, height:'100%', background:d.cfg.color+'40', borderRadius:4 }}/>
                          <div style={{ position:'absolute', left:`${avgPct}%`, width:2, height:'100%', background:d.cfg.color, borderRadius:1, transform:'translateX(-1px)' }}/>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ color:'#4a5568', fontSize:9 }}>Low</span>
                    <span style={{ color:'#4a5568', fontSize:9 }}>High</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scent coverage per brand */}
            <div style={{ ...card, padding:20 }}>
              <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 16px' }}>Scented vs Unscented by Source</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {srcList.map(({src,products})=>{
                  const scented   = products.filter(p=>p.is_scented===true).length
                  const unscented = products.filter(p=>p.is_scented===false).length
                  const unknown   = products.length - scented - unscented
                  const cfg       = SOURCE_CONFIG[src]
                  return (
                    <div key={src} style={{ background:'#0f1117', borderRadius:8, padding:12 }}>
                      <p style={{ color:cfg.color, fontSize:11, fontWeight:700, margin:'0 0 8px' }}>{cfg.icon} {SOURCE_DISPLAY_NAMES[src]}</p>
                      <MiniBar value={scented} max={products.length} color='#10b981' label='Scented' sublabel={`${scented}`} />
                      <MiniBar value={unscented} max={products.length} color='#ef4444' label='Unscented' sublabel={`${unscented}`} />
                      {unknown > 0 && <MiniBar value={unknown} max={products.length} color='#4a5568' label='Unknown' sublabel={`${unknown}`} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── SCENT FAMILIES TAB ── */}
        {activeTab==='scent' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
              {scentFamilyData.map(([family, data], i)=>{
                const colors = ['#ec4899','#8b5cf6','#f59e0b','#10b981','#06b6d4','#f97316','#3b82f6','#84cc16']
                const color = colors[i % colors.length]
                const total = scentFamilyData.reduce((a,[,v])=>a+v.count,0)
                const pct = total > 0 ? ((data.count/total)*100).toFixed(1) : '0'
                const topBrands = Object.entries(data.brands).sort((a,b)=>b[1]-a[1]).slice(0,3)
                return (
                  <div key={family} style={{ ...card, padding:16, borderLeft:`3px solid ${color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>{family}</p>
                        <p style={{ color:'#8892a4', fontSize:10, margin:'2px 0 0' }}>{data.count} products · {pct}% of scented</p>
                      </div>
                      <div style={{ background:color+'20', color, fontSize:18, fontWeight:800, padding:'6px 12px', borderRadius:8 }}>{data.count}</div>
                    </div>
                    {/* Brand breakdown */}
                    <div style={{ marginBottom:10 }}>
                      <p style={{ color:'#4a5568', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 6px' }}>Top Sources</p>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {topBrands.map(([src, cnt])=>{
                          const cfg = SOURCE_CONFIG[src]
                          return <span key={src} style={{ background:cfg?.bg||'#1e2433', color:cfg?.color||'#8892a4', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{cfg?.icon} {SOURCE_DISPLAY_NAMES[src]||src} ({cnt})</span>
                        })}
                      </div>
                    </div>
                    {/* Top scent names */}
                    {data.topScents.length > 0 && (
                      <div>
                        <p style={{ color:'#4a5568', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 6px' }}>Top Scent Names</p>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {data.topScents.map(s=>(
                            <span key={s} style={{ background:'#1e2433', color:'#a0aec0', fontSize:10, padding:'2px 8px', borderRadius:20, border:'1px solid #2a2f3e' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Mini progress bar */}
                    <div style={{ marginTop:12, background:'#0f1117', borderRadius:4, height:4, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Unscented summary */}
            <div style={{ ...card, padding:16 }}>
              <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 8px' }}>🚫 Unscented / Unknown</p>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <div>
                  <p style={{ color:'#8892a4', fontSize:10, margin:'0 0 2px' }}>Confirmed Unscented</p>
                  <p style={{ color:'#ef4444', fontSize:20, fontWeight:800, margin:0 }}>{allProducts.filter(p=>p.is_scented===false).length}</p>
                </div>
                <div>
                  <p style={{ color:'#8892a4', fontSize:10, margin:'0 0 2px' }}>No Scent Data</p>
                  <p style={{ color:'#4a5568', fontSize:20, fontWeight:800, margin:0 }}>{allProducts.filter(p=>!p.scent_name && p.is_scented!==false).length}</p>
                </div>
                <div>
                  <p style={{ color:'#8892a4', fontSize:10, margin:'0 0 2px' }}>Confirmed Scented</p>
                  <p style={{ color:'#10b981', fontSize:20, fontWeight:800, margin:0 }}>{allProducts.filter(p=>p.is_scented===true).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BRAND COMPARISON TAB ── */}
        {activeTab==='brands' && (
          <div>
            {/* Export button */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12, gap:8, alignItems:'center' }}>
              {exportStatus && <span style={{ color:'#10b981', fontSize:11 }}>{exportStatus}</span>}
              <button onClick={()=>exportCSV(allProducts,'candle-market-all.csv')} style={{ background:'linear-gradient(135deg,#10b981,#3b82f6)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:11, fontWeight:700, cursor:'pointer' }}>⬇ Export All to CSV</button>
            </div>

            {/* Comparison table */}
            <div style={{ ...card, padding:0, overflow:'hidden', marginBottom:16 }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'#0f1117' }}>
                      {['Brand','Tier','Products','Avg Price','Price Range','Avg Rating','Total Reviews','Avg Burn','Burn/oz','Price/oz','Top Type'].map(h=>(
                        <th key={h} style={{ padding:'10px 12px', color:'#8892a4', fontWeight:700, textAlign:'left', whiteSpace:'nowrap', fontSize:10, textTransform:'uppercase', letterSpacing:'.6px', borderBottom:'1px solid #2a2f3e' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {brandComparisonData.map((d, i)=>(
                      <tr key={d.src} style={{ background: i%2===0?'transparent':'#ffffff05', borderBottom:'1px solid #2a2f3e10' }}>
                        <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:14 }}>{d.cfg.icon}</span>
                            <span style={{ color:d.cfg.color, fontWeight:700 }}>{d.name}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}><span style={{ background:d.cfg.bg, color:d.cfg.color, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, whiteSpace:'nowrap' }}>{d.cfg.tier}</span></td>
                        <td style={{ padding:'10px 12px', color:'#fff', fontWeight:700 }}>{d.count}</td>
                        <td style={{ padding:'10px 12px', color:'#10b981', fontWeight:700 }}>{d.avgPrice ? d.currency+d.avgPrice.toFixed(2) : '—'}</td>
                        <td style={{ padding:'10px 12px', color:'#8892a4', whiteSpace:'nowrap' }}>{d.minPrice ? `${d.currency}${d.minPrice.toFixed(2)} – ${d.currency}${(d.maxPrice||0).toFixed(2)}` : '—'}</td>
                        <td style={{ padding:'10px 12px', color:'#fbbf24' }}>{d.avgStars ? d.avgStars.toFixed(1)+' ⭐' : '—'}</td>
                        <td style={{ padding:'10px 12px', color:'#8892a4' }}>{d.totalReviews.toLocaleString()}</td>
                        <td style={{ padding:'10px 12px', color:'#ef4444' }}>{d.avgBurn ? d.avgBurn.toFixed(0)+' hrs' : '—'}</td>
                        <td style={{ padding:'10px 12px', color:'#06b6d4' }}>{d.avgBurnPoz ? d.avgBurnPoz.toFixed(1)+' h/oz' : '—'}</td>
                        <td style={{ padding:'10px 12px', color:'#f97316' }}>{d.avgPricePoz ? d.currency+d.avgPricePoz.toFixed(2)+'/oz' : '—'}</td>
                        <td style={{ padding:'10px 12px' }}><span style={{ background:'#8b5cf620', color:'#a78bfa', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{d.topType}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-brand export buttons */}
            <div style={{ ...card, padding:16 }}>
              <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>Export by Brand</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {brandComparisonData.map(d=>(
                  <button key={d.src} onClick={()=>exportCSV(allProducts.filter(p=>p.source===d.src), `candle-${d.src}.csv`)}
                    style={{ background:d.cfg.bg, border:`1px solid ${d.cfg.color}40`, color:d.cfg.color, borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    ⬇ {d.cfg.icon} {d.name} ({d.count})
                  </button>
                ))}
              </div>
              {exportStatus && <p style={{ color:'#10b981', fontSize:11, margin:'10px 0 0' }}>{exportStatus}</p>}
            </div>
          </div>
        )}

        {/* ── DATA EXPLORER TAB ── */}
        {activeTab==='data' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
              <input placeholder="Search product, brand, scent..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={{ background:'#1e2433', border:'1px solid #2a2f3e', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:12, width:200, outline:'none' }}/>
              <div style={{ display:'flex', gap:3, background:'#1e2433', borderRadius:8, padding:3, flexWrap:'wrap' }}>
                {([{key:'all',label:'All'},{key:'amazon',label:'Amazon'},{key:'pfcandleco',label:'PF'},{key:'homesick',label:'Homesick'},{key:'paddywax',label:'Paddywax'},{key:'otherland',label:'Otherland'},{key:'boysmells',label:'Boy Smells'},{key:'keap',label:'Keap'},{key:'asda',label:'ASDA'},{key:'primark',label:'Primark'}] as const).map(s=>(
                  <button key={s.key} onClick={()=>setActiveSource(s.key)} style={pill(activeSource===s.key, s.key==='amazon'?'#ff9900':s.key==='pfcandleco'?'#8b5cf6':s.key==='homesick'?'#f97316':s.key==='paddywax'?'#10b981':s.key==='otherland'?'#ec4899':s.key==='boysmells'?'#8b5cf6':s.key==='keap'?'#34d399':s.key==='asda'?'#84cc16':s.key==='primark'?'#f9a8d4':'#3b82f6')}>{s.label}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:3, background:'#1e2433', borderRadius:8, padding:3 }}>
                {([{key:'all',label:'All Types'},{key:'jar-container',label:'Jar'},{key:'multi-pack',label:'Pack'},{key:'tea-light',label:'Tea Light'},{key:'taper-pillar',label:'Taper'},{key:'reed-diffuser',label:'Diffuser'},{key:'other',label:'Others'}] as const).map(t=>(
                  <button key={t.key} onClick={()=>setActiveCandleType(t.key)} style={pill(activeCandleType===t.key,'#8b5cf6')}>{t.label}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:3, background:'#1e2433', borderRadius:8, padding:3 }}>
                {([{key:'all',label:'All'},{key:'scented',label:'Scented'},{key:'unscented',label:'Unscented'}] as const).map(t=>(
                  <button key={t.key} onClick={()=>setActiveScentFilter(t.key)} style={pill(activeScentFilter===t.key,'#10b981')}>{t.label}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value as SortKey)} style={{ background:'#1e2433', border:'1px solid #2a2f3e', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:12, cursor:'pointer', outline:'none' }}>
                <option value="reviews_count">Most Reviews</option>
                <option value="stars">Highest Rated</option>
                <option value="price">Highest Price</option>
                <option value="burn_hours">Burn Hours</option>
                <option value="burn_per_oz">Burn/oz</option>
                <option value="price_per_oz">Price/oz</option>
              </select>
              <button onClick={()=>exportCSV(filteredProducts,`candle-filtered-${activeSource}-${activeCandleType}.csv`)} style={{ background:'#1e2433', border:'1px solid #2a2f3e', color:'#8892a4', borderRadius:8, padding:'8px 12px', fontSize:11, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>⬇ Export {filteredProducts.length}</button>
              {exportStatus && <span style={{ color:'#10b981', fontSize:11 }}>{exportStatus}</span>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {filteredProducts.map(p=>{
                const cfg=SOURCE_CONFIG[p.source]||SOURCE_CONFIG.amazon
                const isSel=selectedProduct?.id===p.id
                return (
                  <div key={p.id} onClick={()=>setSelectedProduct(isSel?null:p)}
                    style={{ ...card, padding:12, border:isSel?'1px solid #3b82f6':'1px solid #2a2f3e', background:isSel?'linear-gradient(135deg,#1e3a5f 0%,#1e2433 100%)':card.background, cursor:'pointer', transition:'all .2s' }}
                    onMouseEnter={e=>{if(!isSel)e.currentTarget.style.borderColor='#3b82f640'}}
                    onMouseLeave={e=>{if(!isSel)e.currentTarget.style.borderColor='#2a2f3e'}}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      {p.image_url?<img src={p.image_url} alt="" style={{ width:46,height:46,objectFit:'contain',borderRadius:6,background:'#fff',flexShrink:0,padding:2 }}/>:<div style={{ width:46,height:46,borderRadius:6,background:'#2a2f3e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🕯️</div>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:3, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:cfg.bg,color:cfg.color }}>{cfg.label}</span>
                          {p.candle_type&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#8b5cf620',color:'#a78bfa' }}>{p.candle_type==='jar-container'?'Jar':p.candle_type==='multi-pack'?'Pack':p.candle_type==='tea-light'?'Tea':p.candle_type==='taper-pillar'?'Taper':p.candle_type==='reed-diffuser'?'Diffuser':p.candle_type}</span>}
                          {p.is_scented===true&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#10b98120',color:'#34d399' }}>Scented</span>}
                          {p.burn_hours&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#ef444420',color:'#f87171' }}>{p.burn_hours}h</span>}
                        </div>
                        <p style={{ color:'#e2e8f0',fontSize:12,fontWeight:600,margin:'0 0 3px',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{p.product_name}</p>
                        <div style={{ display:'flex',gap:5,flexWrap:'wrap',alignItems:'center' }}>
                          {p.brand&&<span style={{ color:'#60a5fa',fontSize:10,fontWeight:600 }}>{p.brand}</span>}
                          {p.scent_name&&<span style={{ color:'#c084fc',fontSize:10 }}>{p.scent_name}</span>}
                          {p.stars&&<span style={{ color:'#fbbf24',fontSize:10 }}>⭐ {p.stars}</span>}
                          {p.reviews_count>0&&<span style={{ color:'#8892a4',fontSize:10 }}>{p.reviews_count?.toLocaleString()} rev</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right',flexShrink:0 }}>
                        {p.price&&<p style={{ color:'#10b981',fontSize:13,fontWeight:700,margin:0 }}>{UK_SOURCES.includes(p.source)?'£':'$'}{p.price}</p>}
                        {p.price_per_oz&&<p style={{ color:'#f97316',fontSize:10,margin:'1px 0 0' }}>${p.price_per_oz}/oz</p>}
                        {p.burn_per_oz&&<p style={{ color:'#06b6d4',fontSize:10,margin:'1px 0 0' }}>{p.burn_per_oz} h/oz</p>}
                      </div>
                    </div>
                    {isSel&&(
                      <div style={{ marginTop:10,paddingTop:10,borderTop:'1px solid #2a2f3e' }}>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:5 }}>
                          {[
                            {label:'Source',value:SOURCE_DISPLAY_NAMES[p.source]||p.source},
                            {label:'Type',value:p.candle_type},
                            {label:'Scented',value:p.is_scented===true?'Yes':p.is_scented===false?'No':null},
                            {label:'Scent',value:p.scent_name},{label:'Wicks',value:p.wick_quantity},
                            {label:'Material',value:p.material_type},{label:'Weight',value:p.weight_oz?p.weight_oz+' oz':null},
                            {label:'Price/oz',value:p.price_per_oz?'$'+p.price_per_oz:null},
                            {label:'Burn/oz',value:p.burn_per_oz?p.burn_per_oz+' h/oz':null},
                            {label:'Availability',value:p.availability},{label:'Past Sales',value:p.past_sales},
                          ].filter(f=>f.value).map((f,j)=>(
                            <div key={j} style={{ background:'#0f1117',borderRadius:5,padding:'5px 8px' }}>
                              <p style={{ color:'#8892a4',fontSize:8,fontWeight:700,textTransform:'uppercase',margin:'0 0 1px' }}>{f.label}</p>
                              <p style={{ color:'#e2e8f0',margin:0,fontSize:10 }}>{f.value}</p>
                            </div>
                          ))}
                        </div>
                        {p.review_summary&&<div style={{ marginTop:6,background:'#0f1117',borderRadius:5,padding:'7px 9px' }}><p style={{ color:'#8892a4',fontSize:8,fontWeight:700,textTransform:'uppercase',margin:'0 0 3px' }}>Review Summary</p><p style={{ color:'#a0aec0',fontSize:11,margin:0,lineHeight:1.5 }}>{p.review_summary}</p></div>}
                        <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
                          {p.source==='amazon'&&p.asin&&!p.asin.startsWith('pf_')&&<a href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer" style={{ background:'#ff9900',color:'#000',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Amazon</a>}
                          {p.source==='pfcandleco'&&<a href="https://pfcandleco.com/collections/all" target="_blank" rel="noopener noreferrer" style={{ background:'#8b5cf6',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>PF Candle</a>}
                          {p.source==='homesick'&&<a href="https://homesick.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background:'#f97316',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Homesick</a>}
                          {p.source==='paddywax'&&<a href="https://paddywax.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Paddywax</a>}
                          {p.source==='otherland'&&<a href="https://otherland.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background:'#ec4899',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Otherland</a>}
                          {p.source==='boysmells'&&<a href="https://boysmells.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background:'#8b5cf6',color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Boy Smells</a>}
                          {p.source==='keap'&&<a href="https://keapcandles.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background:'#34d399',color:'#000',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Keap</a>}
                          {p.source==='asda'&&<a href={`https://groceries.asda.com/search/${encodeURIComponent(p.product_name||'candles')}`} target="_blank" rel="noopener noreferrer" style={{ background:'#84cc16',color:'#000',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>ASDA</a>}
                          {p.source==='primark'&&<a href="https://www.primark.com/en-gb/c/home/home-furnishings/storage-and-accessories/home-fragrance" target="_blank" rel="noopener noreferrer" style={{ background:'#f9a8d4',color:'#000',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:5,textDecoration:'none' }}>Primark</a>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {filteredProducts.length===0&&<div style={{ ...card,padding:40,textAlign:'center',marginTop:16 }}><p style={{ color:'#8892a4',fontSize:13 }}>No products match your filters.</p></div>}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab==='history' && (
          <div>
            {historyLoading && (
              <div style={{ ...card, padding:40, textAlign:'center' }}>
                <p style={{ color:'#8892a4', fontSize:13 }}>Loading history...</p>
              </div>
            )}
            {!historyLoading && historyData.length === 0 && (
              <div style={{ ...card, padding:40, textAlign:'center' }}>
                <p style={{ fontSize:32, margin:'0 0 12px' }}>🕰️</p>
                <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 8px' }}>No history snapshots yet</p>
                <p style={{ color:'#8892a4', fontSize:12 }}>History is captured automatically every weekly scrape run.</p>
              </div>
            )}
            {!historyLoading && historyData.length > 0 && (() => {
              const dates = Array.from(new Set(historyData.map((h:any) => h.scraped_at?.slice(0,10)))).filter(Boolean).sort().reverse() as string[]

              return (
                <div>
                  {/* Sub-tab switcher */}
                  <div style={{ display:'flex', gap:4, marginBottom:16, background:'#1e2433', borderRadius:10, padding:4, width:'fit-content' }}>
                    <button onClick={()=>setHistorySubTab('runs')} style={{ padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:historySubTab==='runs'?'#3b82f6':'transparent', color:historySubTab==='runs'?'#fff':'#8892a4', transition:'all .2s' }}>📅 Runs ({dates.length})</button>
                    <button onClick={()=>setHistorySubTab('trends')} style={{ padding:'8px 20px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:historySubTab==='trends'?'#3b82f6':'transparent', color:historySubTab==='trends'?'#fff':'#8892a4', transition:'all .2s' }}>📈 Trend Analysis</button>
                  </div>

                  {/* ── RUNS SUB-TAB ── */}
                  {historySubTab === 'runs' && (() => {
                    const filtered = historyDateFilter === 'all' ? historyData : historyData.filter((h:any) => h.scraped_at?.slice(0,10) === historyDateFilter)
                    const byDateSource = dates.map(date => {
                      const rows = historyData.filter((h:any) => h.scraped_at?.slice(0,10) === date)
                      const bySource = Object.keys(SOURCE_CONFIG).map(src => ({ src, count: rows.filter((r:any) => r.source === src).length })).filter(d => d.count > 0)
                      return { date, total: rows.length, bySource }
                    })
                    return (
                      <div>
                        {/* Run selector cards */}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                          <div onClick={() => setHistoryDateFilter('all')}
                            style={{ background: historyDateFilter==='all'?'#3b82f620':'#0f1117', border:`1px solid ${historyDateFilter==='all'?'#3b82f6':'#2a2f3e'}`, borderRadius:10, padding:'10px 16px', cursor:'pointer', transition:'all .2s' }}>
                            <p style={{ color: historyDateFilter==='all'?'#93c5fd':'#8892a4', fontSize:10, fontWeight:700, margin:'0 0 2px' }}>All Runs</p>
                            <p style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>{historyData.length}</p>
                            <p style={{ color:'#4a5568', fontSize:9, margin:'2px 0 0' }}>total records</p>
                          </div>
                          {byDateSource.map(({ date, total, bySource }) => (
                            <div key={date} onClick={() => setHistoryDateFilter(historyDateFilter===date?'all':date)}
                              style={{ background: historyDateFilter===date?'#3b82f620':'#0f1117', border:`1px solid ${historyDateFilter===date?'#3b82f6':'#2a2f3e'}`, borderRadius:10, padding:'10px 14px', cursor:'pointer', minWidth:160, transition:'all .2s' }}>
                              <p style={{ color: historyDateFilter===date?'#93c5fd':'#8892a4', fontSize:10, fontWeight:700, margin:'0 0 2px' }}>{new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</p>
                              <p style={{ color:'#fff', fontSize:20, fontWeight:800, margin:'0 0 4px' }}>{total} <span style={{ color:'#4a5568', fontSize:10, fontWeight:400 }}>products</span></p>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                                {bySource.map(({ src, count }) => (
                                  <span key={src} style={{ fontSize:9, background: SOURCE_CONFIG[src]?.color+'25', color: SOURCE_CONFIG[src]?.color, padding:'1px 5px', borderRadius:4, fontWeight:700 }}>
                                    {SOURCE_DISPLAY_NAMES[src]?.split(' ')[0]} {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Product cards grid */}
                        <div style={{ ...card, padding:16 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                            <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:0 }}>
                              {historyDateFilter==='all' ? `All runs (${filtered.length} records)` : `Run: ${new Date(historyDateFilter+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})} — ${filtered.length} products`}
                            </p>
                            <button onClick={() => exportCSV(filtered, `history-${historyDateFilter}.csv`)} style={{ background:'#1e2433', border:'1px solid #2a2f3e', color:'#8892a4', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:11 }}>⬇ Export CSV</button>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                            {filtered.slice(0, 300).map((h: any, i: number) => {
                              const cfg = SOURCE_CONFIG[h.source] || SOURCE_CONFIG.amazon
                              return (
                                <div key={h.id||i} style={{ ...card, padding:12, border:'1px solid #2a2f3e', transition:'all .2s' }}
                                  onMouseEnter={e => e.currentTarget.style.borderColor='#3b82f640'}
                                  onMouseLeave={e => e.currentTarget.style.borderColor='#2a2f3e'}>
                                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                                    {h.image_url
                                      ? <img src={h.image_url} alt="" style={{ width:46,height:46,objectFit:'contain',borderRadius:6,background:'#fff',flexShrink:0,padding:2 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                      : <div style={{ width:46,height:46,borderRadius:6,background:'#2a2f3e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🕯️</div>}
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ display:'flex', gap:3, marginBottom:3, flexWrap:'wrap' }}>
                                        <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:cfg.bg,color:cfg.color }}>{cfg.label}</span>
                                        {h.candle_type&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#8b5cf620',color:'#a78bfa' }}>{h.candle_type==='jar-container'?'Jar':h.candle_type==='multi-pack'?'Pack':h.candle_type==='tea-light'?'Tea':h.candle_type==='taper-pillar'?'Taper':h.candle_type==='reed-diffuser'?'Diffuser':h.candle_type}</span>}
                                        {h.is_scented===true&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#10b98120',color:'#34d399' }}>Scented</span>}
                                        <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:'#1e2433',color:'#4a5568' }}>📅 {h.scraped_at?.slice(0,10)}</span>
                                      </div>
                                      <p style={{ color:'#e2e8f0',fontSize:12,fontWeight:600,margin:'0 0 3px',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{h.product_name}</p>
                                      <div style={{ display:'flex',gap:5,flexWrap:'wrap',alignItems:'center' }}>
                                        {h.brand&&<span style={{ color:'#60a5fa',fontSize:10,fontWeight:600 }}>{h.brand}</span>}
                                        {h.scent_name&&<span style={{ color:'#c084fc',fontSize:10 }}>{h.scent_name}</span>}
                                        {h.stars&&<span style={{ color:'#fbbf24',fontSize:10 }}>⭐ {h.stars}</span>}
                                        {h.reviews_count>0&&<span style={{ color:'#8892a4',fontSize:10 }}>{h.reviews_count?.toLocaleString()} rev</span>}
                                      </div>
                                    </div>
                                    <div style={{ textAlign:'right',flexShrink:0 }}>
                                      {h.price&&<p style={{ color:'#10b981',fontSize:13,fontWeight:700,margin:0 }}>{UK_SOURCES.includes(h.source)?'£':'$'}{h.price}</p>}
                                      {h.price_per_oz&&<p style={{ color:'#f97316',fontSize:10,margin:'1px 0 0' }}>${h.price_per_oz}/oz</p>}
                                      {h.burn_hours&&<p style={{ color:'#06b6d4',fontSize:10,margin:'1px 0 0' }}>{h.burn_hours}h burn</p>}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {filtered.length > 300 && <p style={{ color:'#4a5568', fontSize:11, textAlign:'center', padding:12 }}>Showing 300 of {filtered.length} — export CSV for full data</p>}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── TRENDS SUB-TAB ── */}
                  {historySubTab === 'trends' && (() => {
                    const uniqueProducts = Array.from(
                      new Map(historyData.map((h:any) => [`${h.product_name}||${h.source}`, h])).values()
                    ).filter((h:any) => h.price)

                    const searchResults = priceTrackerSearch.length > 1
                      ? uniqueProducts.filter((h:any) =>
                          h.product_name?.toLowerCase().includes(priceTrackerSearch.toLowerCase()) ||
                          h.brand?.toLowerCase().includes(priceTrackerSearch.toLowerCase())
                        ).slice(0, 8)
                      : []

                    const priceHistory = priceTrackerSelected
                      ? historyData
                          .filter((h:any) => h.product_name === priceTrackerSelected.product_name && h.source === priceTrackerSelected.source)
                          .sort((a:any, b:any) => a.scraped_at?.localeCompare(b.scraped_at))
                      : []

                    const renderChart = (metric: 'price'|'stars'|'reviews_count', color: string, label: string, prefix='', suffix='') => {
                      const data = priceHistory.filter((h:any) => h[metric] != null)
                      if (data.length < 1) return null
                      const values = data.map((h:any) => Number(h[metric]))
                      const minV = Math.min(...values), maxV = Math.max(...values)
                      const range = maxV - minV || 1
                      const W = 560, H = 140, PAD = 44
                      const points = data.map((h:any, i:number) => ({
                        x: PAD + (i / Math.max(data.length-1,1)) * (W-PAD*2),
                        y: PAD + ((maxV - Number(h[metric])) / range) * (H-PAD*2),
                        val: Number(h[metric]),
                        date: h.scraped_at?.slice(0,10)
                      }))
                      const pathD = points.map((p,i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
                      const areaD = `${pathD} L ${points[points.length-1].x} ${H-PAD} L ${points[0].x} ${H-PAD} Z`
                      return (
                        <div style={{ ...card, padding:16, marginBottom:12 }}>
                          <p style={{ color:'#8892a4', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 10px' }}>{label}</p>
                          <div style={{ overflowX:'auto' }}>
                            <svg width={W} height={H}>
                              {[0,0.5,1].map((t,i) => {
                                const y = PAD + t*(H-PAD*2)
                                const val = maxV - t*range
                                return <g key={i}>
                                  <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#2a2f3e" strokeWidth={1} strokeDasharray="4,4"/>
                                  <text x={PAD-4} y={y+4} fill="#4a5568" fontSize={9} textAnchor="end">{prefix}{val.toFixed(1)}{suffix}</text>
                                </g>
                              })}
                              <path d={areaD} fill={color+'15'}/>
                              <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
                              {points.map((p,i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#0f1117" strokeWidth={2}/>
                                  <text x={p.x} y={p.y-10} fill="#fff" fontSize={9} textAnchor="middle" fontWeight="bold">{prefix}{p.val}{suffix}</text>
                                  <text x={p.x} y={H-PAD+14} fill="#8892a4" fontSize={9} textAnchor="middle">{p.date}</text>
                                </g>
                              ))}
                            </svg>
                          </div>
                        </div>
                      )
                    }

                    const currency = priceTrackerSelected && UK_SOURCES.includes(priceTrackerSelected.source) ? '£' : '$'
                    const priceChange = priceHistory.length > 1 ? priceHistory[priceHistory.length-1].price - priceHistory[0].price : 0

                    return (
                      <div>
                        {/* Search */}
                        <div style={{ ...card, padding:20, marginBottom:16 }}>
                          <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>📈 Trend Analysis — Track a product across all runs</p>
                          <div style={{ position:'relative' }}>
                            <input
                              placeholder="Search product by name or brand..."
                              value={priceTrackerSearch}
                              onChange={e => { setPriceTrackerSearch(e.target.value); setPriceTrackerSelected(null) }}
                              style={{ width:'100%', background:'#0f1117', border:'1px solid #2a2f3e', borderRadius:8, padding:'10px 14px', color:'#fff', fontSize:12, outline:'none', boxSizing:'border-box' as any }}
                            />
                            {searchResults.length > 0 && (
                              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1e2433', border:'1px solid #2a2f3e', borderRadius:8, zIndex:10, marginTop:4, maxHeight:240, overflowY:'auto' }}>
                                {searchResults.map((h:any, i:number) => {
                                  const cfg = SOURCE_CONFIG[h.source] || SOURCE_CONFIG.amazon
                                  return (
                                    <div key={i} onClick={() => { setPriceTrackerSelected(h); setPriceTrackerSearch(h.product_name) }}
                                      style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #2a2f3e', display:'flex', gap:10, alignItems:'center' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#2a2f3e'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                                      <span style={{ background:cfg.bg, color:cfg.color, fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, flexShrink:0 }}>{cfg.label}</span>
                                      <span style={{ color:'#e2e8f0', fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.product_name}</span>
                                      {h.price && <span style={{ color:'#10b981', fontSize:11, fontWeight:700, flexShrink:0 }}>{UK_SOURCES.includes(h.source)?'£':'$'}{h.price}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          <p style={{ color:'#4a5568', fontSize:10, margin:'8px 0 0' }}>{uniqueProducts.length} products available · {dates.length} runs to compare</p>
                        </div>

                        {/* Charts */}
                        {priceTrackerSelected ? (
                          <div>
                            {/* Product header */}
                            <div style={{ ...card, padding:16, marginBottom:12, display:'flex', gap:12, alignItems:'center' }}>
                              {priceTrackerSelected.image_url && <img src={priceTrackerSelected.image_url} alt="" style={{ width:52, height:52, objectFit:'contain', borderRadius:8, background:'#fff', padding:2 }}/>}
                              <div style={{ flex:1 }}>
                                <p style={{ color:'#fff', fontSize:13, fontWeight:700, margin:'0 0 4px' }}>{priceTrackerSelected.product_name}</p>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  <span style={{ background:SOURCE_CONFIG[priceTrackerSelected.source]?.bg, color:SOURCE_CONFIG[priceTrackerSelected.source]?.color, fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:3 }}>{SOURCE_CONFIG[priceTrackerSelected.source]?.label}</span>
                                  {priceTrackerSelected.brand && <span style={{ color:'#60a5fa', fontSize:11 }}>{priceTrackerSelected.brand}</span>}
                                  <span style={{ color:'#4a5568', fontSize:10 }}>{priceHistory.length} data points across {dates.length} runs</span>
                                </div>
                              </div>
                              {priceHistory.length > 1 && (
                                <div style={{ textAlign:'right' }}>
                                  <p style={{ color: priceChange > 0 ? '#ef4444' : priceChange < 0 ? '#10b981' : '#8892a4', fontSize:16, fontWeight:800, margin:0 }}>
                                    {priceChange > 0 ? '↑' : priceChange < 0 ? '↓' : '→'} {currency}{Math.abs(priceChange).toFixed(2)}
                                  </p>
                                  <p style={{ color:'#4a5568', fontSize:10, margin:'2px 0 0' }}>price change</p>
                                </div>
                              )}
                            </div>

                            {renderChart('price', '#3b82f6', 'Price History', currency)}
                            {renderChart('stars', '#fbbf24', 'Rating History', '', ' ⭐')}
                            {renderChart('reviews_count', '#10b981', 'Review Count History')}
                          </div>
                        ) : (
                          <div style={{ ...card, padding:40, textAlign:'center' }}>
                            <p style={{ fontSize:28, margin:'0 0 8px' }}>🔍</p>
                            <p style={{ color:'#8892a4', fontSize:12 }}>Search and select a product above to see price, rating and review trends across all scrape runs</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── NEW PRODUCTS TAB ── */}
        {activeTab==='newproducts' && (
          <div>
            {historyLoading && (
              <div style={{ ...card, padding:40, textAlign:'center' }}>
                <p style={{ color:'#8892a4', fontSize:13 }}>Loading...</p>
              </div>
            )}
            {!historyLoading && historyData.length === 0 && (
              <div style={{ ...card, padding:40, textAlign:'center' }}>
                <p style={{ fontSize:32, margin:'0 0 12px' }}>🆕</p>
                <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 8px' }}>No history data yet</p>
                <p style={{ color:'#8892a4', fontSize:12 }}>New products are detected by comparing the latest scrape run against the previous one. Check back after at least 2 scrape runs.</p>
              </div>
            )}
            {!historyLoading && historyData.length > 0 && (() => {
              // Get all unique scraped_at dates, sorted desc
              const dates = Array.from(new Set(historyData.map(h => h.scraped_at?.slice(0,10)))).sort().reverse()
              if (dates.length < 2) return (
                <div style={{ ...card, padding:40, textAlign:'center' }}>
                  <p style={{ fontSize:32, margin:'0 0 12px' }}>🆕</p>
                  <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:'0 0 8px' }}>Need at least 2 scrape runs</p>
                  <p style={{ color:'#8892a4', fontSize:12 }}>Only 1 snapshot exists so far. New product detection requires a previous run to compare against.</p>
                </div>
              )
              const latestDate   = dates[0]
              const previousDate = dates[1]
              const latestRun    = historyData.filter(h => h.scraped_at?.slice(0,10) === latestDate)
              const previousRun  = historyData.filter(h => h.scraped_at?.slice(0,10) === previousDate)
              // New = in latest but name+source combo not in previous
              const previousKeys = new Set(previousRun.map(h => `${h.source}::${h.product_name}`))
              const newProducts  = latestRun.filter(h => !previousKeys.has(`${h.source}::${h.product_name}`))
              // Removed = in previous but not in latest
              const latestKeys   = new Set(latestRun.map(h => `${h.source}::${h.product_name}`))
              const removedProducts = previousRun.filter(h => !latestKeys.has(`${h.source}::${h.product_name}`))

              const newBySource = Object.keys(SOURCE_CONFIG).map(src => ({
                src, count: newProducts.filter(p => p.source === src).length
              })).filter(d => d.count > 0)

              return (
                <div>
                  {/* Summary header */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                    <div style={{ ...card, padding:20, borderTop:'3px solid #10b981' }}>
                      <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', margin:'0 0 6px' }}>🆕 New Products Added</p>
                      <p style={{ color:'#10b981', fontSize:32, fontWeight:800, margin:'0 0 4px' }}>{newProducts.length}</p>
                      <p style={{ color:'#8892a4', fontSize:11, margin:'0 0 10px' }}>Comparing <span style={{ color:'#93c5fd' }}>{latestDate}</span> vs <span style={{ color:'#8892a4' }}>{previousDate}</span></p>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {newBySource.map(({ src, count }) => (
                          <span key={src} style={{ background: SOURCE_CONFIG[src]?.color+'20', color: SOURCE_CONFIG[src]?.color, padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700 }}>
                            {SOURCE_CONFIG[src]?.icon} {SOURCE_DISPLAY_NAMES[src]?.split(' ')[0]} +{count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ ...card, padding:20, borderTop:'3px solid #ef4444' }}>
                      <p style={{ color:'#8892a4', fontSize:10, fontWeight:700, textTransform:'uppercase', margin:'0 0 6px' }}>🗑️ Products Removed / Delisted</p>
                      <p style={{ color:'#ef4444', fontSize:32, fontWeight:800, margin:'0 0 4px' }}>{removedProducts.length}</p>
                      <p style={{ color:'#8892a4', fontSize:11, margin:'0 0 10px' }}>No longer in the latest scrape run</p>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {Object.keys(SOURCE_CONFIG).map(src => {
                          const count = removedProducts.filter(p => p.source === src).length
                          if (!count) return null
                          return <span key={src} style={{ background:'#ef444420', color:'#ef4444', padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700 }}>
                            {SOURCE_CONFIG[src]?.icon} {SOURCE_DISPLAY_NAMES[src]?.split(' ')[0]} -{count}
                          </span>
                        })}
                      </div>
                    </div>
                  </div>

                  {/* New products list */}
                  {newProducts.length > 0 && (
                    <div style={{ ...card, padding:16, marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <p style={{ color:'#10b981', fontSize:13, fontWeight:700, margin:0 }}>✅ {newProducts.length} New Products (since {previousDate})</p>
                        <button onClick={() => exportCSV(newProducts, `new-products-${latestDate}.csv`)} style={{ background:'#1e2433', border:'1px solid #2a2f3e', color:'#8892a4', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:11 }}>⬇ Export CSV</button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        {newProducts.map((p, i) => {
                          const cfg = SOURCE_CONFIG[p.source]
                          return (
                            <div key={i} style={{ background:'#0f1117', border:`1px solid ${cfg?.color}30`, borderRadius:8, padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
                              {p.image_url && <img src={p.image_url} alt="" style={{ width:40, height:40, objectFit:'cover', borderRadius:5, flexShrink:0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ color:'#e2e8f0', fontSize:11, fontWeight:600, margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.product_name}</p>
                                <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                                  <span style={{ background: cfg?.color+'20', color: cfg?.color, padding:'1px 5px', borderRadius:4, fontSize:9, fontWeight:700 }}>{cfg?.icon} {SOURCE_DISPLAY_NAMES[p.source]?.split(' ')[0]}</span>
                                  {p.price && <span style={{ color:'#10b981', fontSize:10, fontWeight:700 }}>${p.price}</span>}
                                  {p.stars && <span style={{ color:'#fbbf24', fontSize:10 }}>⭐ {p.stars}</span>}
                                  {p.candle_type && <span style={{ color:'#6b7280', fontSize:9 }}>{p.candle_type}</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Removed products list */}
                  {removedProducts.length > 0 && (
                    <div style={{ ...card, padding:16 }}>
                      <p style={{ color:'#ef4444', fontSize:13, fontWeight:700, margin:'0 0 12px' }}>🗑️ {removedProducts.length} Removed / Delisted (since {previousDate})</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        {removedProducts.map((p, i) => {
                          const cfg = SOURCE_CONFIG[p.source]
                          return (
                            <div key={i} style={{ background:'#0f1117', border:'1px solid #ef444425', borderRadius:8, padding:'10px 12px', opacity:0.7 }}>
                              <p style={{ color:'#9ca3af', fontSize:11, fontWeight:600, margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.product_name}</p>
                              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                                <span style={{ background: cfg?.color+'15', color: cfg?.color, padding:'1px 5px', borderRadius:4, fontSize:9, fontWeight:700 }}>{cfg?.icon} {SOURCE_DISPLAY_NAMES[p.source]?.split(' ')[0]}</span>
                                {p.price && <span style={{ color:'#6b7280', fontSize:10 }}>${p.price}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {newProducts.length === 0 && removedProducts.length === 0 && (
                    <div style={{ ...card, padding:40, textAlign:'center' }}>
                      <p style={{ fontSize:32, margin:'0 0 12px' }}>✅</p>
                      <p style={{ color:'#fff', fontSize:14, fontWeight:700 }}>No changes between the last two runs</p>
                      <p style={{ color:'#8892a4', fontSize:12 }}>Product catalog was identical on {previousDate} and {latestDate}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        <p style={{ textAlign:'center',color:'#4a5568',fontSize:10,marginTop:24 }}>
          Powered by AI · Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Keap · ASDA · Primark
        </p>
      </div>
      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0f1117;}::-webkit-scrollbar-thumb{background:#2a2f3e;border-radius:2px;}input::placeholder{color:#4a5568;}select option{background:#1e2433;}`}</style>
    </main>
  )
}
