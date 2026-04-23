'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parseAnalysisSections(analysis: string) {
  const sections: { title: string; content: string[] }[] = []
  let current: { title: string; content: string[] } | null = null
  const lines = analysis.split('\n')
  for (const line of lines) {
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

const sectionIcons: Record<string, string> = {
  'Scented Jar Candles Analysis (Amazon)': '🕯️',
  'Unscented Candles Analysis (Amazon)': '🤍',
  'Multi-Pack & Gift Sets Analysis (Amazon)': '🎁',
  'Brand Landscape (Amazon)': '🏷️',
  'Walmart Scented Candles Analysis': '🛒',
  'Amazon vs Walmart Comparison (Scented Candles only)': '⚖️',
  'Performance Metrics': '📊',
  'Customer Sentiment (Amazon scented jar candles)': '💬',
  'Growth Opportunities': '🚀',
  // fallbacks for old analysis
  'Fragrance Analysis': '🌸',
  'Brand Landscape': '🏷️',
  'Pricing Intelligence': '💰',
  'Product Format & Design': '📦',
  'Burn Time Efficiency': '🕯️',
  'Customer Sentiment': '💬',
  'Amazon vs Walmart Comparison': '🛒',
  'Burn Time Efficiency (Amazon data only)': '🔥',
  'Product Format & Design (Amazon data)': '📦',
  'Growth Opportunities (combined insight)': '🚀',
  'Amazon vs Walmart Comparison (Scented Candles only)': '⚖️',
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'data'>('analysis')
  const [activeSource, setActiveSource] = useState<'all' | 'amazon' | 'walmart'>('all')
  const [activeCandleType, setActiveCandleType] = useState<'all' | 'jar-container' | 'multi-pack' | 'tea-light' | 'taper-pillar' | 'other'>('all')
  const [activeScentFilter, setActiveScentFilter] = useState<'all' | 'scented' | 'unscented'>('all')
  const [sortBy, setSortBy] = useState<'reviews_count' | 'stars' | 'price' | 'burn_hours' | 'burn_per_oz' | 'price_per_oz'>('reviews_count')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [trend, setTrend] = useState<any>(null)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analysisFilter, setAnalysisFilter] = useState<string>('all')
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)

  const triggerRun = async () => {
    setRunning(true)
    setRunStatus(null)
    try {
      const res = await fetch('/api/trigger-run', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setRunStatus('✅ Pipeline started! Data will refresh in ~3 minutes.')
      } else {
        setRunStatus('❌ Failed: ' + data.error)
      }
    } catch (e) {
      setRunStatus('❌ Network error')
    }
    setRunning(false)
  }

  useEffect(() => {
    async function fetchData() {
      const { data: trends } = await supabase
        .from('trend_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: all } = await supabase
        .from('market_insights')
        .select('*')
        .order('reviews_count', { ascending: false })

      setTrend(trends?.[0] || null)
      setAllProducts(all || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const amazonProducts = allProducts.filter(p => p.source === 'amazon')
  const walmartProducts = allProducts.filter(p => p.source === 'walmart')
  const jarCandles = amazonProducts.filter(p => p.candle_type === 'jar-container')

  const filteredProducts = allProducts
    .filter(p => activeSource === 'all' || p.source === activeSource)
    .filter(p => activeCandleType === 'all' || p.candle_type === activeCandleType)
    .filter(p => {
      if (activeScentFilter === 'all') return true
      if (activeScentFilter === 'scented') return p.is_scented === true
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

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const validStars = allProducts.filter(p => p.stars).map(p => p.stars)
  const validPrices = allProducts.filter(p => p.price).map(p => p.price)
  const validBurnHz = amazonProducts.filter(p => p.burn_hours).map(p => p.burn_hours)
  const validBurnPerOz = amazonProducts.filter(p => p.burn_per_oz).map(p => p.burn_per_oz)
  const validPricePerOz = jarCandles.filter(p => p.price_per_oz).map(p => p.price_per_oz)
  const totalReviews = allProducts.reduce((a, b) => a + (b.reviews_count || 0), 0)

  const analysis = trend?.analysis || ''
  const sections = parseAnalysisSections(analysis)
  const filteredSections = analysisFilter === 'all' ? sections : sections.filter(s => s.title === analysisFilter)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🕯️</div>
        <p style={{ fontSize: 16, color: '#8892a4' }}>Loading market data...</p>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0f1117', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#e8eaed' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', borderBottom: '1px solid #2a2f3e', padding: '20px 40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              🕯️ US Candle Market Intelligence
            </h1>
            <p style={{ color: '#8892a4', fontSize: '13px', margin: '4px 0 0' }}>
              Amazon US & Walmart US · Live Data Pipeline
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {trend?.created_at && (
              <p style={{ color: '#8892a4', fontSize: '12px', margin: 0 }}>
                Updated: {new Date(trend.created_at).toLocaleString()}
              </p>
            )}
            {runStatus && (
              <span style={{ fontSize: '12px', color: runStatus.startsWith('✅') ? '#10b981' : '#ef4444' }}>
                {runStatus}
              </span>
            )}
            <button
              onClick={triggerRun}
              disabled={running}
              style={{
                background: running ? '#1e2433' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '9px 18px', fontSize: '13px', fontWeight: '700',
                cursor: running ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', opacity: running ? 0.6 : 1
              }}
            >
              {running ? '⏳ Running...' : '▶ Run Now'}
            </button>
            <span style={{ background: '#2ecc71', color: '#fff', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>● LIVE</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 40px' }}>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Products Tracked', value: allProducts.length.toString(), sub: `${amazonProducts.length} Amazon · ${walmartProducts.length} Walmart`, color: '#3b82f6' },
            { label: 'Total Reviews', value: totalReviews.toLocaleString(), sub: 'Across all products', color: '#8b5cf6' },
            { label: 'Avg Rating', value: avg(validStars).toFixed(1) + ' ⭐', sub: 'Combined platforms', color: '#f59e0b' },
            { label: 'Avg Price', value: '$' + avg(validPrices).toFixed(2), sub: 'All products', color: '#10b981' },
            { label: 'Avg Price/oz', value: validPricePerOz.length ? '$' + avg(validPricePerOz).toFixed(2) + '/oz' : 'N/A', sub: 'Amazon jar candles', color: '#f97316' },
            { label: 'Avg Burn Time', value: validBurnHz.length ? Math.round(avg(validBurnHz)) + ' hrs' : 'N/A', sub: 'Amazon data only', color: '#ef4444' },
            { label: 'Avg Burn/oz', value: validBurnPerOz.length ? avg(validBurnPerOz).toFixed(1) + ' hrs/oz' : 'N/A', sub: 'Amazon data only', color: '#06b6d4' },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg, #1e2433 0%, #1a1f2e 100%)',
              borderRadius: '12px', padding: '16px 14px',
              border: `1px solid ${m.color}30`,
              borderTop: `3px solid ${m.color}`,
              transition: 'transform 0.2s',
              cursor: 'default'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <p style={{ color: '#8892a4', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px' }}>{m.label}</p>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>{m.value}</p>
              <p style={{ color: '#8892a4', fontSize: '9px', margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '24px', background: '#1e2433', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
          {[
            { key: 'analysis', label: '🧠 AI Analysis' },
            { key: 'data', label: '📋 Data Explorer' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              background: activeTab === tab.key ? '#3b82f6' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#8892a4',
              transition: 'all 0.2s'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 1 — AI ANALYSIS
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'analysis' && (
          <div>
            {/* Section filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '20px' }}>
              <button onClick={() => setAnalysisFilter('all')} style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                background: analysisFilter === 'all' ? '#3b82f6' : '#1e2433',
                color: analysisFilter === 'all' ? '#fff' : '#8892a4'
              }}>All Sections</button>
              {sections.map(s => (
                <button key={s.title} onClick={() => setAnalysisFilter(s.title)} style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  background: analysisFilter === s.title ? '#3b82f6' : '#1e2433',
                  color: analysisFilter === s.title ? '#fff' : '#8892a4'
                }}>{sectionIcons[s.title] || '📌'} {s.title}</button>
              ))}
            </div>

            {/* Analysis grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {filteredSections.map((section, i) => (
                <div key={i} style={{
                  background: 'linear-gradient(135deg, #1e2433 0%, #1a1f2e 100%)',
                  borderRadius: '12px', padding: '22px',
                  border: '1px solid #2a2f3e',
                  animation: `fadeIn 0.3s ease ${i * 0.05}s both`
                }}>
                  <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{sectionIcons[section.title] || '📌'}</span>
                    {section.title}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#a0aec0', lineHeight: '1.8' }}>
                    {section.content.map((line, j) => {
                      if (line.match(/^\d+\.\s/) || line.match(/^#{1,3}\s/)) {
                        return <p key={j} style={{ fontWeight: '700', color: '#e2e8f0', margin: '10px 0 4px' }}>{line.replace(/^#{1,3}\s/, '')}</p>
                      }
                      if (line.startsWith('- ') || line.startsWith('• ')) {
                        return (
                          <div key={j} style={{ display: 'flex', gap: '8px', margin: '6px 0', paddingLeft: '4px' }}>
                            <span style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }}>▸</span>
                            <span>{line.replace(/^[-•]\s/, '')}</span>
                          </div>
                        )
                      }
                      return <p key={j} style={{ margin: '4px 0' }}>{line}</p>
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2 — DATA EXPLORER
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'data' && (
          <div>
            {/* Controls row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Search */}
              <input
                placeholder="🔍 Search product, brand, scent..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: '8px',
                  padding: '10px 16px', color: '#fff', fontSize: '13px', width: '240px', outline: 'none'
                }}
              />

              {/* Source filter */}
              <div style={{ display: 'flex', gap: 4, background: '#1e2433', borderRadius: '8px', padding: '4px' }}>
                {(['all', 'amazon', 'walmart'] as const).map(s => (
                  <button key={s} onClick={() => setActiveSource(s)} style={{
                    padding: '7px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    background: activeSource === s ? (s === 'amazon' ? '#ff9900' : s === 'walmart' ? '#0071ce' : '#3b82f6') : 'transparent',
                    color: activeSource === s ? '#fff' : '#8892a4', transition: 'all 0.2s'
                  }}>{s === 'all' ? '🌐 All' : s === 'amazon' ? '📦 Amazon' : '🛒 Walmart'}</button>
                ))}
              </div>

              {/* Candle type filter */}
              <div style={{ display: 'flex', gap: 4, background: '#1e2433', borderRadius: '8px', padding: '4px' }}>
                {([
                  { key: 'all', label: 'All Types' },
                  { key: 'jar-container', label: '🫙 Jar' },
                  { key: 'multi-pack', label: '🎁 Multi-Pack' },
                  { key: 'tea-light', label: '🕯️ Tea Light' },
                  { key: 'taper-pillar', label: '🕍 Taper' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveCandleType(t.key as any)} style={{
                    padding: '7px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    background: activeCandleType === t.key ? '#8b5cf6' : 'transparent',
                    color: activeCandleType === t.key ? '#fff' : '#8892a4', transition: 'all 0.2s'
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Scent filter */}
              <div style={{ display: 'flex', gap: 4, background: '#1e2433', borderRadius: '8px', padding: '4px' }}>
                {([
                  { key: 'all', label: '🌸 All' },
                  { key: 'scented', label: '✨ Scented' },
                  { key: 'unscented', label: '🤍 Unscented' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveScentFilter(t.key as any)} style={{
                    padding: '7px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    background: activeScentFilter === t.key ? '#10b981' : 'transparent',
                    color: activeScentFilter === t.key ? '#fff' : '#8892a4', transition: 'all 0.2s'
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  background: '#1e2433', border: '1px solid #2a2f3e', borderRadius: '8px',
                  padding: '10px 14px', color: '#fff', fontSize: '13px', cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="reviews_count">Sort: Most Reviews</option>
                <option value="stars">Sort: Highest Rated</option>
                <option value="price">Sort: Highest Price</option>
                <option value="burn_hours">Sort: Burn Hours</option>
                <option value="burn_per_oz">Sort: Burn/oz</option>
                <option value="price_per_oz">Sort: Price/oz</option>
              </select>

              <span style={{ color: '#8892a4', fontSize: '13px', marginLeft: 'auto' }}>
                Showing {filteredProducts.length} products
              </span>
            </div>

            {/* Product grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {filteredProducts.map((p) => (
                <div key={p.id} onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)}
                  style={{
                    background: selectedProduct?.id === p.id ? 'linear-gradient(135deg, #1e3a5f 0%, #1e2433 100%)' : 'linear-gradient(135deg, #1e2433 0%, #1a1f2e 100%)',
                    borderRadius: '12px', padding: '16px',
                    border: selectedProduct?.id === p.id ? '1px solid #3b82f6' : '1px solid #2a2f3e',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (selectedProduct?.id !== p.id) e.currentTarget.style.borderColor = '#3b82f640' }}
                  onMouseLeave={e => { if (selectedProduct?.id !== p.id) e.currentTarget.style.borderColor = '#2a2f3e' }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: '8px', background: '#fff', flexShrink: 0, padding: 2 }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: '8px', background: '#2a2f3e', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🕯️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
                        {/* Source badge */}
                        <span style={{
                          fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px',
                          background: p.source === 'walmart' ? '#0071ce20' : '#ff990020',
                          color: p.source === 'walmart' ? '#60a5fa' : '#fbbf24'
                        }}>{p.source?.toUpperCase()}</span>
                        {/* Candle type badge */}
                        {p.candle_type && (
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#8b5cf620', color: '#a78bfa' }}>
                            {p.candle_type === 'jar-container' ? '🫙 Jar' : p.candle_type === 'multi-pack' ? '🎁 Pack' : p.candle_type === 'tea-light' ? '🕯️ Tea Light' : p.candle_type === 'taper-pillar' ? '🕍 Taper' : p.candle_type}
                          </span>
                        )}
                        {/* Scented badge */}
                        {p.is_scented === true && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#10b98120', color: '#34d399' }}>✨ Scented</span>}
                        {p.is_scented === false && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#64748b20', color: '#94a3b8' }}>🤍 Unscented</span>}
                        {/* Burn hours badge */}
                        {p.burn_hours && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: '#ef444420', color: '#f87171' }}>🔥 {p.burn_hours}hrs</span>}
                      </div>
                      <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600', margin: '0 0 4px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {p.product_name}
                      </p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {p.brand && <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '600' }}>{p.brand}</span>}
                        {p.scent_name && <span style={{ color: '#c084fc', fontSize: '11px' }}>🌸 {p.scent_name}</span>}
                        {p.stars && <span style={{ color: '#fbbf24', fontSize: '11px' }}>⭐ {p.stars}</span>}
                        {p.reviews_count && <span style={{ color: '#8892a4', fontSize: '11px' }}>{p.reviews_count.toLocaleString()} reviews</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {p.price && <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '700', margin: 0 }}>${p.price}</p>}
                      {p.price_per_oz && <p style={{ color: '#f97316', fontSize: '11px', margin: '2px 0 0' }}>${p.price_per_oz}/oz</p>}
                      {p.burn_per_oz && <p style={{ color: '#06b6d4', fontSize: '11px', margin: '2px 0 0' }}>{p.burn_per_oz} hrs/oz</p>}
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {selectedProduct?.id === p.id && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2f3e' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        {[
                          { label: 'Candle Type', value: p.candle_type },
                          { label: 'Scented', value: p.is_scented === true ? 'Yes ✨' : p.is_scented === false ? 'No 🤍' : 'Unknown' },
                          { label: 'Scent', value: p.scent_name },
                          { label: 'Color', value: p.color },
                          { label: 'Shape', value: p.shape },
                          { label: 'Wicks', value: p.wick_quantity },
                          { label: 'Material', value: p.material_type },
                          { label: 'Container', value: p.container_material },
                          { label: 'Weight', value: p.weight_oz ? p.weight_oz + ' oz' : null },
                          { label: 'Price/oz', value: p.price_per_oz ? '$' + p.price_per_oz : null },
                          { label: 'Burn Time', value: p.burn_time },
                          { label: 'Burn/oz', value: p.burn_per_oz ? p.burn_per_oz + ' hrs/oz' : null },
                          { label: 'Availability', value: p.availability },
                          { label: 'Sold By', value: p.sold_by },
                          { label: 'Past Sales', value: p.past_sales },
                          { label: 'Best Seller Rank', value: p.best_sellers_rank },
                        ].filter(f => f.value).map((f, j) => (
                          <div key={j} style={{ background: '#0f1117', borderRadius: '6px', padding: '8px 10px' }}>
                            <p style={{ color: '#8892a4', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 2px' }}>{f.label}</p>
                            <p style={{ color: '#e2e8f0', margin: 0, fontSize: '11px' }}>{f.value}</p>
                          </div>
                        ))}
                      </div>
                      {p.review_summary && (
                        <div style={{ marginTop: 8, background: '#0f1117', borderRadius: '6px', padding: '10px 12px' }}>
                          <p style={{ color: '#8892a4', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>Review Summary</p>
                          <p style={{ color: '#a0aec0', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{p.review_summary}</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {p.asin && p.source === 'amazon' && (
                          <a href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#ff9900', color: '#000', fontSize: '11px', fontWeight: '700', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none' }}>
                            View on Amazon ↗
                          </a>
                        )}
                        {p.source === 'walmart' && (
                          <a href={`https://www.walmart.com/search?q=${encodeURIComponent(p.product_name)}`} target="_blank" rel="noopener noreferrer"
                            style={{ background: '#0071ce', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none' }}>
                            Search on Walmart ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#4a5568', fontSize: '11px', marginTop: '32px' }}>
          Powered by AI · Amazon US & Walmart US · Auto-refreshes every 12 hours
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #2a2f3e; border-radius: 3px; }
        input::placeholder { color: #4a5568; }
        select option { background: #1e2433; }
      `}</style>
    </main>
  )
}
