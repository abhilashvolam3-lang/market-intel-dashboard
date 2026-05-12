'use client'
import { useEffect, useState } from 'react'
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
  if (clean.startsWith('+ ') || clean.startsWith('- ') || clean.startsWith('\u2022'))
    return (
      <div key={j} style={{ display: 'flex', gap: 8, margin: '4px 0', paddingLeft: 8 }}>
        <span style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }}>&#9658;</span>
        <span style={{ color: '#a0aec0', fontSize: 13 }}>{clean.replace(/^[+\-\u2022]\s/, '')}</span>
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
  { key: 'price',     label: 'Price Analysis',     desc: 'Price range, price/oz, best value'       },
  { key: 'burn',      label: 'Burn Efficiency',     desc: 'Burn hours, burn/oz, best efficiency'    },
  { key: 'scent',     label: 'Scent Analysis',      desc: 'Top scents, scent families, trends'      },
  { key: 'brand',     label: 'Brand Landscape',     desc: 'Brand landscape, top brands'             },
  { key: 'sentiment', label: 'Customer Sentiment',  desc: 'Reviews, complaints, 5-star drivers'     },
  { key: 'overall',   label: 'Full Analysis',       desc: 'Complete market overview'                },
]

const PRODUCT_TYPES = [
  { key: 'all',           label: 'All Products'    },
  { key: 'jar-container', label: 'Jar / Container' },
  { key: 'multi-pack',    label: 'Multi-Pack'      },
  { key: 'tea-light',     label: 'Tea Light'       },
  { key: 'taper-pillar',  label: 'Taper / Pillar'  },
  { key: 'reed-diffuser', label: 'Reed Diffuser'   },
]

type SourceKey = 'all' | 'amazon' | 'pfcandleco' | 'homesick' | 'paddywax' | 'otherland' | 'boysmells' | 'keap' | 'asda' | 'primark'
type CandleType = 'all' | 'jar-container' | 'multi-pack' | 'tea-light' | 'taper-pillar' | 'reed-diffuser' | 'other'
type ScentFilter = 'all' | 'scented' | 'unscented'
type SortKey = 'reviews_count' | 'stars' | 'price' | 'burn_hours' | 'burn_per_oz' | 'price_per_oz'

export default function Home() {
  const [activeTab, setActiveTab]               = useState<'analysis' | 'data'>('analysis')
  const [allProducts, setAllProducts]           = useState<any[]>([])
  const [trend, setTrend]                       = useState<any>(null)
  const [loading, setLoading]                   = useState(true)
  const [running, setRunning]                   = useState(false)
  const [runStatus, setRunStatus]               = useState<string | null>(null)
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

  useEffect(() => {
    async function fetchData() {
      const [{ data: trends }, { data: products }] = await Promise.all([
        supabase.from('trend_analysis').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('market_insights').select('*').order('reviews_count', { ascending: false }),
      ])
      setTrend(trends?.[0] || null)
      setAllProducts((products || []).filter((p: any) => p.source !== 'byredo'))
      setLoading(false)
    }
    fetchData()
  }, [])

  const triggerRun = async () => {
    setRunning(true); setRunStatus(null)
    try {
      const res = await fetch('/api/trigger-run', { method: 'POST' })
      const data = await res.json()
      setRunStatus(data.success ? 'Pipeline started!' : 'Failed: ' + data.error)
    } catch { setRunStatus('Network error') }
    setRunning(false)
  }

  const generateSummary = async () => {
    setSummaryLoading(true); setSummaryGenerated(false); setSummary('')
    try {
      const featureLabel = FEATURES.find(f => f.key === filterFeature)?.label || filterFeature
      const companyLabel = filterCompany === 'all' ? 'all companies' : SOURCE_DISPLAY_NAMES[filterCompany]
      const productLabel = PRODUCT_TYPES.find(p => p.key === filterProduct)?.label || filterProduct
      const question = `Generate a focused ${featureLabel} for ${companyLabel}, product type: ${productLabel}. Be specific with numbers and actionable insights.`
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sourceFilter: filterCompany, categoryFilter: filterProduct })
      })
      const data = await res.json()
      setSummary(data.answer || 'No summary generated.')
      setSummaryGenerated(true)
    } catch { setSummary('Error generating analysis.'); setSummaryGenerated(true) }
    setSummaryLoading(false)
  }

  const askQuestion = async () => {
    if (!chatQuestion.trim()) return
    setChatLoading(true)
    const q = chatQuestion; setChatQuestion('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sourceFilter: filterCompany, categoryFilter: filterProduct })
      })
      const data = await res.json()
      setChatHistory(prev => [...prev, { q, a: data.answer }])
    } catch { setChatHistory(prev => [...prev, { q, a: 'Error.' }]) }
    setChatLoading(false)
  }

  const bySource = (src: string) => allProducts.filter(p => p.source === src)
  const amazonP = bySource('amazon'), pfP = bySource('pfcandleco'), hsP = bySource('homesick')
  const pwP = bySource('paddywax'), olP = bySource('otherland'), bsP = bySource('boysmells')
  const kpP = bySource('keap'), asdaP = bySource('asda'), priP = bySource('primark')
  const jarC = amazonP.filter(p => p.candle_type === 'jar-container')

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const totalReviews    = allProducts.reduce((a, b) => a + (b.reviews_count || 0), 0)
  const validStars      = allProducts.filter(p => p.stars).map(p => p.stars)
  const validPrices     = allProducts.filter(p => p.price).map(p => p.price)
  const validBurnHz     = allProducts.filter(p => p.burn_hours).map(p => p.burn_hours)
  const validBurnPoz    = allProducts.filter(p => p.burn_per_oz).map(p => p.burn_per_oz)
  const validPPoz       = allProducts.filter(p => p.price_per_oz).map(p => p.price_per_oz)

  const filteredCount = filterCompany === 'all'
    ? allProducts.length
    : allProducts.filter(p => p.source === filterCompany && (filterProduct === 'all' || p.candle_type === filterProduct)).length

  const filteredProducts = allProducts
    .filter(p => activeSource === 'all' || p.source === activeSource)
    .filter(p => activeCandleType === 'all' || p.candle_type === activeCandleType)
    .filter(p => activeScentFilter === 'scented' ? p.is_scented === true : activeScentFilter === 'unscented' ? p.is_scented === false : true)
    .filter(p => !searchTerm || p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕯️</div>
        <p style={{ color: '#8892a4', fontSize: 16 }}>Loading...</p>
      </div>
    </div>
  )

  const card = { background: 'linear-gradient(135deg,#1e2433 0%,#1a1f2e 100%)', border: '1px solid #2a2f3e', borderRadius: 12 }
  const pill = (active: boolean, color = '#3b82f6') => ({ padding: '7px 13px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: active ? color : 'transparent', color: active ? '#fff' : '#8892a4' } as React.CSSProperties)

  const srcList = [
    { src: 'amazon',     products: amazonP }, { src: 'pfcandleco', products: pfP  },
    { src: 'homesick',   products: hsP     }, { src: 'paddywax',   products: pwP  },
    { src: 'otherland',  products: olP     }, { src: 'boysmells',  products: bsP  },
    { src: 'keap',       products: kpP     }, { src: 'asda',       products: asdaP },
    { src: 'primark',    products: priP    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#0f1117', fontFamily: "'DM Sans',system-ui,sans-serif", color: '#e8eaed' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%)', borderBottom: '1px solid #2a2f3e', padding: '14px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>🕯️ US Candle Market Intelligence</h1>
            <p style={{ color: '#8892a4', fontSize: 11, margin: '2px 0 0' }}>Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Keap · ASDA · Primark</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {trend?.created_at && <span style={{ color: '#8892a4', fontSize: 11 }}>Updated: {new Date(trend.created_at).toLocaleString()}</span>}
            {runStatus && <span style={{ fontSize: 11, color: '#10b981' }}>{runStatus}</span>}
            <button onClick={triggerRun} disabled={running} style={{ background: running ? '#1e2433' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>{running ? 'Running...' : '▶ Run Now'}</button>
            <span style={{ background: '#2ecc71', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>● LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 40px' }}>

        {/* KPI ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Products Tracked', value: allProducts.length.toString(), sub: `${amazonP.length} AMZ · ${pfP.length} PF · ${hsP.length} HS · ${pwP.length} PW · ${olP.length} OL · ${bsP.length} BS · ${kpP.length} KP · ${asdaP.length} ASDA · ${priP.length} PRI`, color: '#3b82f6' },
            { label: 'Total Reviews',    value: totalReviews.toLocaleString(), sub: 'Across all sources', color: '#8b5cf6' },
            { label: 'Avg Rating',       value: avg(validStars).toFixed(1) + ' ⭐', sub: 'Combined sources', color: '#f59e0b' },
            { label: 'Avg Price/oz',     value: validPPoz.length ? '$' + avg(validPPoz).toFixed(2) + '/oz' : 'N/A', sub: 'Products with weight data', color: '#f97316' },
            { label: 'Avg Burn Time',    value: validBurnHz.length ? Math.round(avg(validBurnHz)) + ' hrs' : 'N/A', sub: 'Products with burn data', color: '#ef4444' },
            { label: 'Avg Burn/oz',      value: validBurnPoz.length ? avg(validBurnPoz).toFixed(1) + ' hrs/oz' : 'N/A', sub: 'Products with burn data', color: '#06b6d4' },
          ].map((m, i) => (
            <div key={i} style={{ ...card, padding: '10px', borderTop: `3px solid ${m.color}`, cursor: 'default', transition: 'transform .2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <p style={{ color: '#8892a4', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 4px' }}>{m.label}</p>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: '0 0 2px' }}>{m.value}</p>
              <p style={{ color: '#8892a4', fontSize: 8, margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* SOURCE CARDS — compact single grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 8, marginBottom: 16 }}>
          {srcList.map(({ src, products }) => {
            const cfg = SOURCE_CONFIG[src]
            return (
              <div key={src} onClick={() => { setActiveTab('data'); setActiveSource(src as SourceKey) }}
                style={{ ...card, padding: '8px 10px', border: `1px solid ${cfg.color}25`, cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cfg.color + '25'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <p style={{ color: '#8892a4', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfg.icon} {SOURCE_DISPLAY_NAMES[src]}</p>
                <p style={{ color: '#6b7280', fontSize: 8, margin: '0 0 3px' }}>{cfg.tier}</p>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>{products.length}</p>
              </div>
            )
          })}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#1e2433', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {([{ key: 'analysis', label: '🧠 AI Analysis' }, { key: 'data', label: '📋 Data Explorer' }] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === t.key ? '#3b82f6' : 'transparent', color: activeTab === t.key ? '#fff' : '#8892a4' }}>{t.label}</button>
          ))}
        </div>

        {/* AI ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div>
            <div style={{ ...card, padding: 24, marginBottom: 16 }}>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>Select filters to generate your analysis</p>

              {/* Step 1: Company */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ color: '#8892a4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 8px' }}>Step 1 — Company</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setFilterCompany('all')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterCompany === 'all' ? '#3b82f6' : '#0f1117', color: filterCompany === 'all' ? '#fff' : '#8892a4', outline: filterCompany === 'all' ? '1px solid #3b82f6' : '1px solid #2a2f3e' }}>All Companies</button>
                  {Object.entries(SOURCE_DISPLAY_NAMES).map(([key, name]) => {
                    const cfg = SOURCE_CONFIG[key]
                    const active = filterCompany === key
                    return <button key={key} onClick={() => setFilterCompany(key as SourceKey)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: active ? cfg.color : '#0f1117', color: active ? '#000' : '#8892a4', outline: active ? `1px solid ${cfg.color}` : '1px solid #2a2f3e' }}>{cfg.icon} {name}</button>
                  })}
                </div>
              </div>

              {/* Step 2: Product Type */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ color: '#8892a4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 8px' }}>Step 2 — Product Type</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRODUCT_TYPES.map(pt => {
                    const active = filterProduct === pt.key
                    return <button key={pt.key} onClick={() => setFilterProduct(pt.key as CandleType)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: active ? '#8b5cf6' : '#0f1117', color: active ? '#fff' : '#8892a4', outline: active ? '1px solid #8b5cf6' : '1px solid #2a2f3e' }}>{pt.label}</button>
                  })}
                </div>
              </div>

              {/* Step 3: Feature */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: '#8892a4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 8px' }}>Step 3 — Feature / Focus Area</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {FEATURES.map(f => {
                    const active = filterFeature === f.key
                    return (
                      <button key={f.key} onClick={() => setFilterFeature(f.key)} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'left', background: active ? 'linear-gradient(135deg,#1e3a5f,#1e2433)' : '#0f1117', outline: active ? '1px solid #3b82f6' : '1px solid #2a2f3e', color: active ? '#fff' : '#8892a4' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontSize: 10, color: active ? '#93c5fd' : '#4a5568' }}>{f.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Active filter summary */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                <span style={{ color: '#4a5568', fontSize: 11 }}>Generating for:</span>
                <span style={{ background: '#3b82f620', color: '#60a5fa', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{filterCompany === 'all' ? 'All Companies' : SOURCE_DISPLAY_NAMES[filterCompany]}</span>
                <span style={{ background: '#8b5cf620', color: '#a78bfa', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{PRODUCT_TYPES.find(p => p.key === filterProduct)?.label}</span>
                <span style={{ background: '#10b98120', color: '#34d399', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{FEATURES.find(f => f.key === filterFeature)?.label}</span>
                <span style={{ color: '#4a5568', fontSize: 10 }}>({filteredCount} products)</span>
              </div>

              <button onClick={generateSummary} disabled={summaryLoading} style={{ background: summaryLoading ? '#1e2433' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 13, fontWeight: 700, cursor: summaryLoading ? 'not-allowed' : 'pointer', opacity: summaryLoading ? 0.6 : 1, width: '100%' }}>
                {summaryLoading ? 'Generating Analysis...' : 'Generate Analysis'}
              </button>
            </div>

            {/* Summary Output */}
            {(summaryLoading || summaryGenerated) && (
              <div style={{ ...card, padding: 24, marginBottom: 16 }}>
                {summaryLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
                    <p style={{ color: '#8892a4', fontSize: 13 }}>
                      Analysing {filteredCount} {filterCompany !== 'all' ? SOURCE_DISPLAY_NAMES[filterCompany] : ''} products
                      {filterProduct !== 'all' ? ` (${filterProduct})` : ''}...
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{FEATURES.find(f => f.key === filterFeature)?.label}</h3>
                        <p style={{ color: '#8892a4', fontSize: 11, margin: '3px 0 0' }}>
                          {filterCompany === 'all' ? 'All Companies' : SOURCE_DISPLAY_NAMES[filterCompany]} · {PRODUCT_TYPES.find(p => p.key === filterProduct)?.label} · {filteredCount} products
                        </p>
                      </div>
                      <button onClick={() => { setSummaryGenerated(false); setSummary('') }} style={{ background: '#0f1117', color: '#8892a4', border: '1px solid #2a2f3e', borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Clear</button>
                    </div>
                    <div style={{ lineHeight: 1.8 }}>{summary.split('\n').map((line, j) => renderLine(line, j))}</div>
                  </>
                )}
              </div>
            )}

            {/* AI Chat */}
            <div style={{ ...card, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ color: '#8892a4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', margin: 0 }}>Ask AI about your data</p>
                <p style={{ color: '#4a5568', fontSize: 10, margin: 0 }}>Using: {filterCompany === 'all' ? 'All' : SOURCE_DISPLAY_NAMES[filterCompany]} · {filterProduct === 'all' ? 'All types' : filterProduct}</p>
              </div>
              {chatHistory.length > 0 && (
                <div style={{ marginBottom: 12, maxHeight: 280, overflowY: 'auto' }}>
                  {chatHistory.map((chat, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700 }}>You:</span><p style={{ color: '#e2e8f0', fontSize: 12, margin: 0 }}>{chat.q}</p></div>
                      <div style={{ display: 'flex', gap: 8 }}><span style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>AI:</span><p style={{ color: '#a0aec0', fontSize: 12, margin: 0, lineHeight: 1.7 }}>{chat.a}</p></div>
                      {i < chatHistory.length - 1 && <div style={{ borderTop: '1px solid #2a2f3e', margin: '8px 0' }} />}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="e.g. Which candle has best burn efficiency?" value={chatQuestion} onChange={e => setChatQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askQuestion()} style={{ flex: 1, background: '#0f1117', border: '1px solid #2a2f3e', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 12, outline: 'none' }} />
                <button onClick={askQuestion} disabled={chatLoading || !chatQuestion.trim()} style={{ background: chatLoading ? '#1e2433' : 'linear-gradient(135deg,#10b981,#3b82f6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading ? 0.6 : 1 }}>{chatLoading ? '...' : 'Ask'}</button>
                {chatHistory.length > 0 && <button onClick={() => setChatHistory([])} style={{ background: '#1e2433', color: '#8892a4', border: '1px solid #2a2f3e', borderRadius: 8, padding: '10px 12px', fontSize: 11, cursor: 'pointer' }}>Clear</button>}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                {['Best burn efficiency?', 'Cheapest price per oz?', 'Top scents?', 'Best rated candle?', 'Compare brand prices'].map(q => (
                  <button key={q} onClick={() => setChatQuestion(q)} style={{ background: '#0f1117', border: '1px solid #2a2f3e', borderRadius: 20, padding: '3px 10px', color: '#8892a4', fontSize: 10, cursor: 'pointer' }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DATA EXPLORER TAB */}
        {activeTab === 'data' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search product, brand, scent..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, width: 200, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3, flexWrap: 'wrap' }}>
                {([{ key: 'all', label: 'All' }, { key: 'amazon', label: 'Amazon' }, { key: 'pfcandleco', label: 'PF' }, { key: 'homesick', label: 'Homesick' }, { key: 'paddywax', label: 'Paddywax' }, { key: 'otherland', label: 'Otherland' }, { key: 'boysmells', label: 'Boy Smells' }, { key: 'keap', label: 'Keap' }, { key: 'asda', label: 'ASDA' }, { key: 'primark', label: 'Primark' }] as const).map(s => (
                  <button key={s.key} onClick={() => setActiveSource(s.key)} style={pill(activeSource === s.key, s.key === 'amazon' ? '#ff9900' : s.key === 'pfcandleco' ? '#8b5cf6' : s.key === 'homesick' ? '#f97316' : s.key === 'paddywax' ? '#10b981' : s.key === 'otherland' ? '#ec4899' : s.key === 'boysmells' ? '#8b5cf6' : s.key === 'keap' ? '#34d399' : s.key === 'asda' ? '#84cc16' : s.key === 'primark' ? '#f9a8d4' : '#3b82f6')}>{s.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3 }}>
                {([{ key: 'all', label: 'All Types' }, { key: 'jar-container', label: 'Jar' }, { key: 'multi-pack', label: 'Pack' }, { key: 'tea-light', label: 'Tea Light' }, { key: 'taper-pillar', label: 'Taper' }, { key: 'reed-diffuser', label: 'Diffuser' }] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveCandleType(t.key)} style={pill(activeCandleType === t.key, '#8b5cf6')}>{t.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, background: '#1e2433', borderRadius: 8, padding: 3 }}>
                {([{ key: 'all', label: 'All' }, { key: 'scented', label: 'Scented' }, { key: 'unscented', label: 'Unscented' }] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveScentFilter(t.key)} style={pill(activeScentFilter === t.key, '#10b981')}>{t.label}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                <option value="reviews_count">Most Reviews</option>
                <option value="stars">Highest Rated</option>
                <option value="price">Highest Price</option>
                <option value="burn_hours">Burn Hours</option>
                <option value="burn_per_oz">Burn/oz</option>
                <option value="price_per_oz">Price/oz</option>
              </select>
              <span style={{ color: '#8892a4', fontSize: 11, marginLeft: 'auto' }}>{filteredProducts.length} products</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {filteredProducts.map(p => {
                const cfg = SOURCE_CONFIG[p.source] || SOURCE_CONFIG.amazon
                const isSel = selectedProduct?.id === p.id
                return (
                  <div key={p.id} onClick={() => setSelectedProduct(isSel ? null : p)}
                    style={{ ...card, padding: 12, border: isSel ? '1px solid #3b82f6' : '1px solid #2a2f3e', background: isSel ? 'linear-gradient(135deg,#1e3a5f 0%,#1e2433 100%)' : card.background, cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = '#3b82f640' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = '#2a2f3e' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: 6, background: '#fff', flexShrink: 0, padding: 2 }} /> : <div style={{ width: 46, height: 46, borderRadius: 6, background: '#2a2f3e', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🕯️</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {p.candle_type && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#8b5cf620', color: '#a78bfa' }}>{p.candle_type === 'jar-container' ? 'Jar' : p.candle_type === 'multi-pack' ? 'Pack' : p.candle_type === 'tea-light' ? 'Tea' : p.candle_type === 'taper-pillar' ? 'Taper' : p.candle_type === 'reed-diffuser' ? 'Diffuser' : p.candle_type}</span>}
                          {p.is_scented === true && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#10b98120', color: '#34d399' }}>Scented</span>}
                          {p.burn_hours && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#ef444420', color: '#f87171' }}>{p.burn_hours}h</span>}
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: '0 0 3px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{p.product_name}</p>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.brand && <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 600 }}>{p.brand}</span>}
                          {p.scent_name && <span style={{ color: '#c084fc', fontSize: 10 }}>{p.scent_name}</span>}
                          {p.stars && <span style={{ color: '#fbbf24', fontSize: 10 }}>⭐ {p.stars}</span>}
                          {p.reviews_count > 0 && <span style={{ color: '#8892a4', fontSize: 10 }}>{p.reviews_count?.toLocaleString()} rev</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {p.price && <p style={{ color: '#10b981', fontSize: 13, fontWeight: 700, margin: 0 }}>${p.price}</p>}
                        {p.price_per_oz && <p style={{ color: '#f97316', fontSize: 10, margin: '1px 0 0' }}>${p.price_per_oz}/oz</p>}
                        {p.burn_per_oz && <p style={{ color: '#06b6d4', fontSize: 10, margin: '1px 0 0' }}>{p.burn_per_oz} h/oz</p>}
                      </div>
                    </div>
                    {isSel && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2f3e' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                          {[
                            { label: 'Source', value: SOURCE_DISPLAY_NAMES[p.source] || p.source },
                            { label: 'Type', value: p.candle_type },
                            { label: 'Scented', value: p.is_scented === true ? 'Yes' : p.is_scented === false ? 'No' : null },
                            { label: 'Scent', value: p.scent_name },
                            { label: 'Wicks', value: p.wick_quantity },
                            { label: 'Material', value: p.material_type },
                            { label: 'Weight', value: p.weight_oz ? p.weight_oz + ' oz' : null },
                            { label: 'Price/oz', value: p.price_per_oz ? '$' + p.price_per_oz : null },
                            { label: 'Burn/oz', value: p.burn_per_oz ? p.burn_per_oz + ' h/oz' : null },
                            { label: 'Availability', value: p.availability },
                            { label: 'Past Sales', value: p.past_sales },
                          ].filter(f => f.value).map((f, j) => (
                            <div key={j} style={{ background: '#0f1117', borderRadius: 5, padding: '5px 8px' }}>
                              <p style={{ color: '#8892a4', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 1px' }}>{f.label}</p>
                              <p style={{ color: '#e2e8f0', margin: 0, fontSize: 10 }}>{f.value}</p>
                            </div>
                          ))}
                        </div>
                        {p.review_summary && <div style={{ marginTop: 6, background: '#0f1117', borderRadius: 5, padding: '7px 9px' }}><p style={{ color: '#8892a4', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 3px' }}>Review Summary</p><p style={{ color: '#a0aec0', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{p.review_summary}</p></div>}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {p.source === 'amazon' && p.asin && !p.asin.startsWith('pf_') && <a href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer" style={{ background: '#ff9900', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Amazon</a>}
                          {p.source === 'pfcandleco' && <a href="https://pfcandleco.com/collections/all" target="_blank" rel="noopener noreferrer" style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>PF Candle</a>}
                          {p.source === 'homesick' && <a href="https://homesick.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Homesick</a>}
                          {p.source === 'paddywax' && <a href="https://paddywax.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Paddywax</a>}
                          {p.source === 'otherland' && <a href="https://otherland.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background: '#ec4899', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Otherland</a>}
                          {p.source === 'boysmells' && <a href="https://boysmells.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background: '#8b5cf6', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Boy Smells</a>}
                          {p.source === 'keap' && <a href="https://keapcandles.com/collections/candles" target="_blank" rel="noopener noreferrer" style={{ background: '#34d399', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Keap</a>}
                          {p.source === 'asda' && <a href={`https://groceries.asda.com/search/${encodeURIComponent(p.product_name || 'candles')}`} target="_blank" rel="noopener noreferrer" style={{ background: '#84cc16', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>ASDA</a>}
                          {p.source === 'primark' && <a href="https://www.primark.com/en-gb/c/home/home-furnishings/storage-and-accessories/home-fragrance" target="_blank" rel="noopener noreferrer" style={{ background: '#f9a8d4', color: '#000', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, textDecoration: 'none' }}>Primark</a>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {filteredProducts.length === 0 && <div style={{ ...card, padding: 40, textAlign: 'center', marginTop: 16 }}><p style={{ color: '#8892a4', fontSize: 13 }}>No products match your filters.</p></div>}
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#4a5568', fontSize: 10, marginTop: 24 }}>
          Powered by AI · Amazon · P.F. Candle Co · Homesick · Paddywax · Otherland · Boy Smells · Keap · ASDA · Primark
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #2a2f3e; border-radius: 2px; }
        input::placeholder { color: #4a5568; }
        select option { background: #1e2433; }
      `}</style>
    </main>
  )
}
