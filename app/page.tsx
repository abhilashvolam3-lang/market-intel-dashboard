'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── helpers ────────────────────────────────────────────────
function parseAnalysisSections(analysis: string) {
  const sections: { title: string; content: string[] }[] = []
  let current: { title: string; content: string[] } | null = null
  for (const line of analysis.split('\n')) {
    const clean = line.replace(/\*\*/g, '').trim()
    if (!clean) continue
    if (clean.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: clean.replace('## ', '').replace(/^\d+\.\s*/, ''), content: [] }
    } else if (current) {
      current.content.push(clean)
    }
  }
  if (current) sections.push(current)
  return sections
}

function renderLine(line: string, j: number) {
  const clean = line.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  if (clean.match(/^\d+\.\s/))
    return <p key={j} style={{ fontWeight: 700, color: '#e2e8f0', margin: '8px 0 4px', fontSize: 13 }}>{clean}</p>
  if (clean.startsWith('* '))
    return <p key={j} style={{ fontWeight: 600, color: '#cbd5e1', margin: '12px 0 6px', fontSize: 12, borderLeft: '2px solid #3b82f6', paddingLeft: 8 }}>{clean.replace(/^\*\s/, '')}</p>
  if (clean.startsWith('+ ') || clean.startsWith('- ') || clean.startsWith('• '))
    return (
      <div key={j} style={{ display: 'flex', gap: 8, margin: '4px 0', paddingLeft: 8 }}>
        <span style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }}>▸</span>
        <span style={{ color: '#a0aec0', fontSize: 13 }}>{clean.replace(/^[+\-•]\s/, '')}</span>
      </div>
    )
  if (clean.match(/^#{1,3}\s/))
    return <p key={j} style={{ fontWeight: 700, color: '#e2e8f0', margin: '10px 0 4px', fontSize: 13 }}>{clean.replace(/^#{1,3}\s/, '')}</p>
  return <p key={j} style={{ margin: '4px 0', color: '#a0aec0', fontSize: 13 }}>{clean}</p>
}

// ─── constants ──────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string; shopUrl: string; tier: string }> = {
  amazon:    { color: '#fbbf24', bg: '#ff990020', label: 'AMAZON',     icon: '📦', shopUrl: 'https://www.amazon.com/dp/',                          tier: 'Mass Market' },
  pfcandleco:{ color: '#a78bfa', bg: '#8b5cf620', label: 'PF CANDLE',  icon: '✨', shopUrl: 'https://pfcandleco.com/collections/all',              tier: 'Premium Indie' },
  homesick:  { color: '#f97316', bg: '#f9731620', label: 'HOMESICK',   icon: '🏠', shopUrl: 'https://homesick.com/collections/candles',            tier: 'Mid-Premium' },
  paddywax:  { color: '#10b981', bg: '#10b98120', label: 'PADDYWAX',   icon: '🕯️', shopUrl: 'https://paddywax.com/collections/candles',           tier: 'Artisan' },
  otherland: { color: '#ec4899', bg: '#ec489920', label: 'OTHERLAND',  icon: '🌿', shopUrl: 'https://otherland.com/collections/candles',           tier: 'Premium Indie' },
  boysmells: { color: '#8b5cf6', bg: '#8b5cf620', label: 'BOY SMELLS', icon: '🌸', shopUrl: 'https://boysmells.com/collections/candles',           tier: 'Luxury' },
  byredo:    { color: '#60a5fa', bg: '#60a5fa20', label: 'BYREDO',     icon: '💎', shopUrl: 'https://www.byredo.com/collections/candles',          tier: 'Ultra-Luxury' },
  keap:      { color: '#34d399', bg: '#34d39920', label: 'KEAP',       icon: '🌱', shopUrl: 'https://keapcandles.com/collections/candles',         tier: 'Eco' },
}

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  amazon:    'Amazon',
  pfcandleco:'P.F. Candle Co',
  homesick:  'Homesick',
  paddywax:  'Paddywax',
  otherland: 'Otherland',
  boysmells: 'Boy Smells',
  byredo:    'Byredo',
  keap:      'Keap',
}

const SECTION_ICONS: Record<string, string> = {
  'Scented Jar Candles Analysis (Amazon)': '🕯️',
  'Multi-Pack & Gift Sets (Amazon)': '🎁',
  'Multi-Pack & Gift Sets Analysis (Amazon)': '🎁',
  'P.F. Candle Co Analysis (Premium Indie)': '✨',
  'Mass-Indie Brand Comparison (Homesick vs Paddywax)': '🏠',
  'Premium Indie Comparison (Otherland vs Boy Smells)': '🌿',
  'Ultra-Luxury Analysis (Byredo)': '💎',
  'Cross-Tier Price Intelligence': '💰',
  'Cross-Platform Price Intelligence': '💰',
  'Brand Landscape (All Sources)': '🏷️',
  'Performance Metrics': '📊',
  'Customer Sentiment (Amazon)': '💬',
  'Customer Sentiment (Amazon scented jar candles)': '💬',
  'Growth Opportunities': '🚀',
  'Unscented Candles Analysis (Amazon)': '🤍',
  'Brand Landscape (Amazon)': '🏷️',
  'Mass Market Retail Comparison (Walmart vs Target)': '🛒',
  'UK Market Analysis (ASDA vs Primark)': '🇬🇧',
  'Fragrance Analysis': '🌸',
  'Brand Landscape': '🏷️',
  'Pricing Intelligence': '💰',
  'Product Format & Design': '📦',
  'Burn Time Efficiency': '🔥',
  'Burn Time Efficiency (Amazon data only)': '🔥',
  'Product Format & Design (Amazon data)': '📦',
  'Growth Opportunities (combined insight)': '🚀',
  'Amazon vs Walmart Comparison': '🛒',
}

type SourceKey = 'all' | 'amazon' | 'pfcandleco' | 'homesick' | 'paddywax' | 'otherland' | 'boysmells' | 'byredo' | 'keap'
type CandleType = 'all' | 'jar-container' | 'multi-pack' | 'tea-light' | 'taper-pillar' | 'other'
type ScentFilter = 'all' | 'scented' | 'unscented'
type SortKey = 'reviews_count' | 'stars' | 'price' | 'burn_hours' | 'burn_per_oz' | 'price_per_oz'

// ─── component ──────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab]             = useState<'analysis' | 'data'>('analysis')
  const [trend, setTrend]                     = useState<any>(null)
  const [allProducts, setAllProducts]         = useState<any[]>([])
  const [loading, setLoading]                 = useState(true)
  const [running, setRunning]                 = useState(false)
  const [runStatus, setRunStatus]             = useState<string | null>(null)

  // AI Analysis filters
  const [analysisSource, setAnalysisSource]   = useState<SourceKey>('all')
  const [analysisCategory, setAnalysisCategory] = useState<CandleType>('all')
  const [analysisSectionFilter, setAnalysisSectionFilter] = useState<string>('all')

  // Data Explorer filters
  const [activeSource, setActiveSource]       = useState<SourceKey>('all')
  const [activeCandleType, setActiveCandleType] = useState<CandleType>('all')
  const [activeScentFilter, setActiveScentFilter] = useState<ScentFilter>('all')
  const [sortBy, setSortBy]                   = useState<SortKey>('reviews_count')
  const [searchTerm, setSearchTerm]           = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Chat
  const [chatQuestion, setChatQuestion]       = useState('')
  const [chatLoading, setChatLoading]         = useState(false)
  const [chatHistory, setChatHistory]         = useState<{ q: string; a: string }[]>([])

  // ── data fetch ───────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      const [{ data: trends }, { data: products }] = await Promise.all([
        supabase.from('trend_analysis').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('market_insights').select('*').order('reviews_count', { ascending: false }),
      ])
      setTrend(trends?.[0] || null)
      setAllProducts(products || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // ── trigger pipeline ─────────────────────────────────────
  const triggerRun = async () => {
    setRunning(true); setRunStatus(null)
    try {
      const res = await fetch('/api/trigger-run', { method: 'POST' })
      const data = await res.json()
      setRunStatus(data.success ? '✅ Pipeline started! Refreshes in ~5 min.' : '❌ Failed: ' + data.error)
    } catch { setRunStatus('❌ Network error') }
    setRunning(false)
  }

  // ── chat ─────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!chatQuestion.trim()) return
    setChatLoading(true)
    const question = chatQuestion
    setChatQuestion('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          sourceFilter: analysisSource,
          categoryFilter: analysisCategory,
        })
      })
      const data = await res.json()
      setChatHistory(prev => [...prev, { q: question, a: data.answer }])
    } catch {
      setChatHistory(prev => [...prev, { q: question, a: 'Error getting answer.' }])
    }
    setChatLoading(false)
  }

  // ── derived data ─────────────────────────────────────────
  const bySource = (src: string) => allProducts.filter(p => p.source === src)
  const amazonProducts    = bySource('amazon')
  const pfProducts        = bySource('pfcandleco')
  const homesickProducts  = bySource('homesick')
  const paddywaxProducts  = bySource('paddywax')
  const otherlandProducts = bySource('otherland')
  const boysmellsProducts = bySource('boysmells')
  const byredoProducts    = bySource('byredo')
  const keapProducts      = bySource('keap')
  const jarCandles        = amazonProducts.filter(p => p.candle_type === 'jar-container')

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const totalReviews    = allProducts.reduce((a, b) => a + (b.reviews_count || 0), 0)
  const validStars      = allProducts.filter(p => p.stars).map(p => p.stars)
  const validPrices     = allProducts.filter(p => p.price).map(p => p.price)
  const validBurnHz     = amazonProducts.filter(p => p.burn_hours).map(p => p.burn_hours)
  const validBurnPerOz  = amazonProducts.filter(p => p.burn_per_oz).map(p => p.burn_per_oz)
  const validPricePerOz = jarCandles.filter(p => p.price_per_oz).map(p => p.price_per_oz)

  // AI analysis sections
  const sections = parseAnalysisSections(trend?.analysis || '')
  const filteredSections = analysisSectionFilter === 'all'
    ? sections
    : sections.filter(s => s.title === analysisSectionFilter)

  // Data Explorer filtered products
  const filteredProducts = allProducts
    .filter(p => activeSource === 'all' || p.source === activeSource)
    .filter(p => activeCandleType === 'all' || p.candle_type === activeCandleType)
    .filter(p => {
      if (activeScentFilter === 'scented')   return p.is_scented === true
      if (activeScentFilter === 'unscented') return p.is_scented === false
      return true
    })
    .filter(p =>
      !searchTerm ||
      p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.scent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  // ── loading ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕯️</div>
        <p style={{ fontSize: 16, color: '#8892a4' }}>Loading market data...</p>
      </div>
    </div>
  )

  // ── shared styles ─────────────────────────────────────────
  const card = {
    background: 'linear-gradient(135deg,#1e2433 0%,#1a1f2e 100%)',
    border: '1px solid #2a2f3e', borderRadius: 12,
  }
  const pill = (active: boolean, activeColor = '#3b82f6') => ({
    padding: '7px 13px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'all .2s',
    background: active ? activeColor : 'transparent',
    color: active ? '#fff' : '#8892a4',
  } as React.CSSProperties)

  // ── render ────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: '#0f1117', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#e8eaed' }}>

      {/* ════════════════════ HEADER ════════════════════ */}
      <div style={{ background: 'linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%)', borderBottom: '1px solid #2a2f3e', padding: '18px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              🕯️ US Candle Market Intelligence
            </h1>
            <p style={{ color: '#8892a4', fontSize: 12, margin: '3px 0 0' }}>
              Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Byredo · Keap · Live Pipeline
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {trend?.created_at && (
              <span style={{ color: '#8892a4', fontSize: 12 }}>
                Updated: {new Date(trend.created_at).toLocaleString()}
              </span>
            )}
            {runStatus && (
              <span style={{ fontSize: 12, color: runStatus.startsWith('✅') ? '#10b981' : '#ef4444' }}>{runStatus}</span>
            )}
            <button onClick={triggerRun} disabled={running} style={{
              background: running ? '#1e2433' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px',
              fontSize: 13, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer',
              opacity: running ? 0.6 : 1,
            }}>
              {running ? '⏳ Running...' : '▶ Run Now'}
            </button>
            <span style={{ background: '#2ecc71', color: '#fff', fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>● LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 40px' }}>

        {/* ════════════════════ KPI ROW ════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Products Tracked', value: allProducts.length.toString(), sub: `${amazonProducts.length} AMZ · ${pfProducts.length} PF · ${homesickProducts.length} HS · ${paddywaxProducts.length} PW · ${otherlandProducts.length} OL · ${boysmellsProducts.length} BS · ${byredoProducts.length} BY · ${keapProducts.length} KP`, color: '#3b82f6' },
            { label: 'Total Reviews',    value: totalReviews.toLocaleString(), sub: 'Across all sources', color: '#8b5cf6' },
            { label: 'Avg Rating',       value: avg(validStars).toFixed(1) + ' ⭐', sub: 'Combined sources', color: '#f59e0b' },
            { label: 'Avg Price',        value: '$' + avg(validPrices).toFixed(2), sub: 'All products', color: '#10b981' },
            { label: 'Avg Price/oz',     value: validPricePerOz.length ? '$' + avg(validPricePerOz).toFixed(2) + '/oz' : 'N/A', sub: 'Amazon jar candles', color: '#f97316' },
            { label: 'Avg Burn Time',    value: validBurnHz.length ? Math.round(avg(validBurnHz)) + ' hrs' : 'N/A', sub: 'Amazon data only', color: '#ef4444' },
            { label: 'Avg Burn/oz',      value: validBurnPerOz.length ? avg(validBurnPerOz).toFixed(1) + ' hrs/oz' : 'N/A', sub: 'Amazon data only', color: '#06b6d4' },
          ].map((m, i) => (
            <div key={i} style={{ ...card, padding: '14px 12px', borderTop: `3px solid ${m.color}`, transition: 'transform .2s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <p style={{ color: '#8892a4', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 6px' }}>{m.label}</p>
              <p style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: '0 0 3px' }}>{m.value}</p>
              <p style={{ color: '#8892a4', fontSize: 9, margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ════════════════════ SOURCE CARDS ════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
          {([
            { src: 'amazon',    products: amazonProducts },
            { src: 'pfcandleco',products: pfProducts },
            { src: 'homesick',  products: homesickProducts },
            { src: 'paddywax',  products: paddywaxProducts },
          ] as const).map(({ src, products }) => {
            const cfg = SOURCE_CONFIG[src]
            const avgP = avg(products.filter(p => p.price).map(p => p.price))
            return (
              <div key={src}
                onClick={() => { setActiveTab('data'); setActiveSource(src) }}
                style={{ ...card, padding: '12px 14px', border: `1px solid ${cfg.color}25`, cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cfg.color + '25'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <p style={{ color: '#8892a4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>
                  {cfg.icon} {SOURCE_DISPLAY_NAMES[src]}
                </p>
                <p style={{ color: '#6b7280', fontSize: 9, margin: '0 0 4px' }}>{cfg.tier}</p>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 2px' }}>{products.length}</p>
                <p style={{ color: cfg.color, fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {avgP > 0 ? '$' + avgP.toFixed(2) : 'N/A'}
                </p>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 22 }}>
          {([
            { src: 'otherland', products: otherlandProducts },
            { src: 'boysmells', products: boysmellsProducts },
            { src: 'byredo',    products: byredoProducts },
            { src: 'keap',      products: keapProducts },
          ] as const).map(({ src, products }) => {
            const cfg = SOURCE_CONFIG[src]
            const avgP = avg(products.filter(p => p.price).map(p => p.price))
            return (
              <div key={src}
                onClick={() => { setActiveTab('data'); setActiveSource(src) }}
                style={{ ...card, padding: '12px 14px', border: `1px solid ${cfg.color}25`, cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cfg.color + '25'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <p style={{ color: '#8892a4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>
                  {cfg.icon} {SOURCE_DISPLAY_NAMES[src]}
                </p>
                <p style={{ color: '#6b7280', fontSize: 9, margin: '0 0 4px' }}>{cfg.tier}</p>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 2px' }}>{products.length}</p>
                <p style={{ color: cfg.color, fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {avgP > 0 ? '$' + avgP.toFixed(2) : 'N/A'}
                </p>
              </div>
            )
          })}
        </div>

        {/* ════════════════════ TABS ════════════════════ */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: '#1e2433', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {([{ key: 'analysis', label: '🧠 AI Analysis' }, { key: 'data', label: '📋 Data Explorer' }] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'all .2s',
              background: activeTab === t.key ? '#3b82f6' : 'transparent',
              color: activeTab === t.key ? '#fff' : '#8892a4',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ════════════════════ CHAT BAR ════════════════════ */}
        <div style={{ ...card, padding: 20, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ color: '#8892a4', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: 0 }}>
              🤖 Ask AI about your data
            </p>
            {/* Chat filters — these also pass into route.ts */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#4a5568', fontSize: 11 }}>Filter chat by:</span>
              <select value={analysisSource} onChange={e => setAnalysisSource(e.target.value as SourceKey)} style={{
                background: '#0f1117', color: '#e2e8f0', border: '1px solid #2a2f3e',
                borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', outline: 'none'
              }}>
                <option value="all">All Sources</option>
                {Object.entries(SOURCE_DISPLAY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={analysisCategory} onChange={e => setAnalysisCategory(e.target.value as CandleType)} style={{
                background: '#0f1117', color: '#e2e8f0', border: '1px solid #2a2f3e',
                borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', outline: 'none'
              }}>
                <option value="all">All Categories</option>
                <option value="jar-container">🫙 Jar / Container</option>
                <option value="multi-pack">🎁 Multi-Pack</option>
                <option value="tea-light">🕯️ Tea Light</option>
                <option value="taper-pillar">🕍 Taper / Pillar</option>
                <option value="other">Other</option>
              </select>
              {(analysisSource !== 'all' || analysisCategory !== 'all') && (
                <button onClick={() => { setAnalysisSource('all'); setAnalysisCategory('all') }}
                  style={{ background: 'transparent', color: '#8892a4', border: '1px solid #2a2f3e', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Active filter badge */}
          {(analysisSource !== 'all' || analysisCategory !== 'all') && (
            <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {analysisSource !== 'all' && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: SOURCE_CONFIG[analysisSource]?.bg, color: SOURCE_CONFIG[analysisSource]?.color, fontWeight: 700 }}>
                  {SOURCE_CONFIG[analysisSource]?.icon} {SOURCE_DISPLAY_NAMES[analysisSource]}
                </span>
              )}
              {analysisCategory !== 'all' && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#8b5cf620', color: '#a78bfa', fontWeight: 700 }}>
                  {analysisCategory}
                </span>
              )}
            </div>
          )}

          {chatHistory.length > 0 && (
            <div style={{ marginBottom: 14, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {chatHistory.map((chat, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>You:</span>
                    <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0 }}>{chat.q}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>AI:</span>
                    <p style={{ color: '#a0aec0', fontSize: 13, margin: 0, lineHeight: 1.7 }}>{chat.a}</p>
                  </div>
                  {i < chatHistory.length - 1 && <div style={{ borderTop: '1px solid #2a2f3e', margin: '10px 0' }} />}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              placeholder="e.g. Which candle has best burn efficiency? Compare Amazon vs Walmart prices..."
              value={chatQuestion}
              onChange={e => setChatQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askQuestion()}
              style={{ flex: 1, background: '#0f1117', border: '1px solid #2a2f3e', borderRadius: 8, padding: '11px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <button onClick={askQuestion} disabled={chatLoading || !chatQuestion.trim()} style={{
              background: chatLoading ? '#1e2433' : 'linear-gradient(135deg,#10b981,#3b82f6)',
              color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px',
              fontSize: 13, fontWeight: 700, cursor: chatLoading ? 'not-allowed' : 'pointer',
              opacity: chatLoading ? 0.6 : 1, whiteSpace: 'nowrap',
            }}>{chatLoading ? '⏳ Thinking...' : '✨ Ask'}</button>
            {chatHistory.length > 0 && (
              <button onClick={() => setChatHistory([])} style={{ background: '#1e2433', color: '#8892a4', border: '1px solid #2a2f3e', borderRadius: 8, padding: '11px 14px', fontSize: 12, cursor: 'pointer' }}>Clear</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {['📊 What data is available?', 'Best burn efficiency candle?', 'Cheapest price per oz?', 'Which scent has most reviews?', 'Highest price on Amazon?', 'Best rated candle overall?', 'Compare Amazon vs Walmart prices', 'Best value PF Candle product?'].map(q => (
              <button key={q} onClick={() => setChatQuestion(q)} style={{
                background: q.startsWith('📊') ? '#3b82f620' : '#0f1117',
                border: q.startsWith('📊') ? '1px solid #3b82f6' : '1px solid #2a2f3e',
                borderRadius: 20, padding: '4px 12px',
                color: q.startsWith('📊') ? '#3b82f6' : '#8892a4',
                fontSize: 11, cursor: 'pointer', fontWeight: q.startsWith('📊') ? 700 : 400,
              }}>{q}</button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TAB — AI ANALYSIS
        ══════════════════════════════════════════ */}
        {activeTab === 'analysis' && (
          <div>
            {/* Section pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              <button onClick={() => setAnalysisSectionFilter('all')} style={pill(analysisSectionFilter === 'all')}>All Sections</button>
              {sections.map(s => (
                <button key={s.title} onClick={() => setAnalysisSectionFilter(s.title)} style={pill(analysisSectionFilter === s.title)}>
                  {SECTION_ICONS[s.title] || '📌'} {s.title}
                </button>
              ))}
            </div>

            {sections.length === 0 ? (
              <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                <p style={{ color: '#8892a4', fontSize: 14 }}>No AI analysis yet. Click "Run Now" to generate insights.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {filteredSections.map((section, i) => (
                  <div key={i} style={{ ...card, padding: 20, animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                    <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{SECTION_ICONS[section.title] || '📌'}</span>
                      {section.title}
                    </h3>
                    <div style={{ lineHeight: 1.8 }}>
                      {section.content.map((line, j) => renderLine(line, j))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB — DATA EXPLORER
        ══════════════════════════════════════════ */}
        {activeTab === 'data' && (
          <div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="🔍 Search product, brand, scent..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, width: 220, outline: 'none' }}
              />

              {/* Source filter */}
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3, flexWrap: 'wrap' }}>
                {([
                  { key: 'all',       label: '🌐 All' },
                  { key: 'amazon',    label: '📦 Amazon' },
                  { key: 'pfcandleco',label: '✨ PF Candle' },
                  { key: 'homesick',  label: '🏠 Homesick' },
                  { key: 'paddywax',  label: '🕯️ Paddywax' },
                  { key: 'otherland', label: '🌿 Otherland' },
                  { key: 'boysmells', label: '🌸 Boy Smells' },
                  { key: 'byredo',    label: '💎 Byredo' },
                  { key: 'keap',      label: '🌱 Keap' },
                ] as const).map(s => (
                  <button key={s.key} onClick={() => setActiveSource(s.key)} style={pill(activeSource === s.key,
                    s.key === 'amazon' ? '#ff9900' : s.key === 'pfcandleco' ? '#8b5cf6' :
                    s.key === 'homesick' ? '#f97316' : s.key === 'paddywax' ? '#10b981' :
                    s.key === 'otherland' ? '#ec4899' : s.key === 'boysmells' ? '#8b5cf6' :
                    s.key === 'byredo' ? '#60a5fa' : s.key === 'keap' ? '#34d399' : '#3b82f6'
                  )}>{s.label}</button>
                ))}
              </div>

              {/* Candle type filter */}
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3 }}>
                {([
                  { key: 'all',          label: 'All Types' },
                  { key: 'jar-container',label: '🫙 Jar' },
                  { key: 'multi-pack',   label: '🎁 Pack' },
                  { key: 'tea-light',    label: '🕯️ Tea Light' },
                  { key: 'taper-pillar', label: '🕍 Taper' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveCandleType(t.key)} style={pill(activeCandleType === t.key, '#8b5cf6')}>{t.label}</button>
                ))}
              </div>

              {/* Scent filter */}
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3 }}>
                {([
                  { key: 'all',       label: '🌸 All' },
                  { key: 'scented',   label: '✨ Scented' },
                  { key: 'unscented', label: '🤍 Unscented' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveScentFilter(t.key)} style={pill(activeScentFilter === t.key, '#10b981')}>{t.label}</button>
                ))}
              </div>

              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{
                background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: 8,
                padding: '9px 12px', color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none'
              }}>
                <option value="reviews_count">Sort: Most Reviews</option>
                <option value="stars">Sort: Highest Rated</option>
                <option value="price">Sort: Highest Price</option>
                <option value="burn_hours">Sort: Burn Hours</option>
                <option value="burn_per_oz">Sort: Burn/oz</option>
                <option value="price_per_oz">Sort: Price/oz</option>
              </select>

              <span style={{ color: '#8892a4', fontSize: 12, marginLeft: 'auto' }}>
                {filteredProducts.length} products
              </span>
            </div>

            {/* Product grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {filteredProducts.map(p => {
                const cfg = SOURCE_CONFIG[p.source] || SOURCE_CONFIG.amazon
                const isSelected = selectedProduct?.id === p.id
                return (
                  <div key={p.id}
                    onClick={() => setSelectedProduct(isSelected ? null : p)}
                    style={{
                      ...card,
                      padding: 14,
                      border: isSelected ? '1px solid #3b82f6' : '1px solid #2a2f3e',
                      background: isSelected ? 'linear-gradient(135deg,#1e3a5f 0%,#1e2433 100%)' : card.background,
                      cursor: 'pointer', transition: 'all .2s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#3b82f640' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#2a2f3e' }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt="" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 8, background: '#fff', flexShrink: 0, padding: 2 }} />
                        : <div style={{ width: 50, height: 50, borderRadius: 8, background: '#2a2f3e', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🕯️</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {p.candle_type && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#8b5cf620', color: '#a78bfa' }}>
                              {p.candle_type === 'jar-container' ? '🫙 Jar' : p.candle_type === 'multi-pack' ? '🎁 Pack' : p.candle_type === 'tea-light' ? '🕯️ Tea Light' : p.candle_type === 'taper-pillar' ? '🕍 Taper' : p.candle_type}
                            </span>
                          )}
                          {p.is_scented === true  && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#10b98120', color: '#34d399' }}>✨</span>}
                          {p.is_scented === false && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#64748b20', color: '#94a3b8' }}>🤍</span>}
                          {p.burn_hours && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#ef444420', color: '#f87171' }}>🔥 {p.burn_hours}h</span>}
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {p.product_name}
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.brand          && <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>{p.brand}</span>}
                          {p.scent_name     && <span style={{ color: '#c084fc', fontSize: 11 }}>🌸 {p.scent_name}</span>}
                          {p.stars          && <span style={{ color: '#fbbf24', fontSize: 11 }}>⭐ {p.stars}</span>}
                          {p.reviews_count > 0 && <span style={{ color: '#8892a4', fontSize: 11 }}>{p.reviews_count?.toLocaleString()} rev</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {p.price       && <p style={{ color: '#10b981', fontSize: 14, fontWeight: 700, margin: 0 }}>${p.price}</p>}
                        {p.price_per_oz && <p style={{ color: '#f97316', fontSize: 11, margin: '2px 0 0' }}>${p.price_per_oz}/oz</p>}
                        {p.burn_per_oz  && <p style={{ color: '#06b6d4', fontSize: 11, margin: '2px 0 0' }}>{p.burn_per_oz} h/oz</p>}
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isSelected && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2f3e' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                          {[
                            { label: 'Source',     value: SOURCE_DISPLAY_NAMES[p.source] || p.source },
                            { label: 'Type',       value: p.candle_type },
                            { label: 'Scented',    value: p.is_scented === true ? 'Yes ✨' : p.is_scented === false ? 'No 🤍' : null },
                            { label: 'Scent',      value: p.scent_name },
                            { label: 'Color',      value: p.color },
                            { label: 'Shape',      value: p.shape },
                            { label: 'Wicks',      value: p.wick_quantity },
                            { label: 'Material',   value: p.material_type },
                            { label: 'Container',  value: p.container_material },
                            { label: 'Weight',     value: p.weight_oz ? p.weight_oz + ' oz' : null },
                            { label: 'Price/oz',   value: p.price_per_oz ? '$' + p.price_per_oz : null },
                            { label: 'Burn Time',  value: p.burn_time },
                            { label: 'Burn/oz',    value: p.burn_per_oz ? p.burn_per_oz + ' h/oz' : null },
                            { label: 'Availability', value: p.availability },
                            { label: 'Sold By',    value: p.sold_by },
                            { label: 'Past Sales', value: p.past_sales },
                            { label: 'BSR',        value: p.best_sellers_rank },
                          ].filter(f => f.value).map((f, j) => (
                            <div key={j} style={{ background: '#0f1117', borderRadius: 6, padding: '7px 9px' }}>
                              <p style={{ color: '#8892a4', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{f.label}</p>
                              <p style={{ color: '#e2e8f0', margin: 0, fontSize: 11 }}>{f.value}</p>
                            </div>
                          ))}
                        </div>
                        {p.review_summary && (
                          <div style={{ marginTop: 7, background: '#0f1117', borderRadius: 6, padding: '9px 11px' }}>
                            <p style={{ color: '#8892a4', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Review Summary</p>
                            <p style={{ color: '#a0aec0', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{p.review_summary}</p>
                          </div>
                        )}
                        {/* Store links */}
                        <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                          {p.source === 'amazon' && p.asin && !p.asin.startsWith('pf_') && (
                            <a href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#ff9900', color: '#000', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Amazon ↗
                            </a>
                          )}
                          {p.source === 'pfcandleco' && (
                            <a href="https://pfcandleco.com/collections/all" target="_blank" rel="noopener noreferrer"
                              style={{ background: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              PF Candle Co ↗
                            </a>
                          )}
                          {p.source === 'homesick' && (
                            <a href={`https://homesick.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Homesick ↗
                            </a>
                          )}
                          {p.source === 'paddywax' && (
                            <a href={`https://paddywax.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Paddywax ↗
                            </a>
                          )}
                          {p.source === 'otherland' && (
                            <a href={`https://otherland.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#ec4899', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Otherland ↗
                            </a>
                          )}
                          {p.source === 'boysmells' && (
                            <a href={`https://boysmells.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#8b5cf6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Boy Smells ↗
                            </a>
                          )}
                          {p.source === 'byredo' && (
                            <a href={`https://www.byredo.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#60a5fa', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Byredo ↗
                            </a>
                          )}
                          {p.source === 'keap' && (
                            <a href={`https://keapcandles.com/collections/candles`} target="_blank" rel="noopener noreferrer"
                              style={{ background: '#34d399', color: '#000', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, textDecoration: 'none' }}>
                              Keap ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div style={{ ...card, padding: 40, textAlign: 'center', marginTop: 20 }}>
                <p style={{ color: '#8892a4', fontSize: 14 }}>No products match your filters.</p>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#4a5568', fontSize: 11, marginTop: 32 }}>
          Powered by AI · Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Byredo · Keap · Auto-refreshes every 12 hours
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:#0f1117; }
        ::-webkit-scrollbar-thumb { background:#2a2f3e; border-radius:3px; }
        input::placeholder { color:#4a5568; }
        select option { background:#1e2433; }
      `}</style>
    </main>
  )
}
