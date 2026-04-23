import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 0

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
  'Fragrance Analysis': '🌸',
  'Brand Landscape': '🏷️',
  'Pricing Intelligence': '💰',
  'Product Format & Design': '📦',
  'Burn Time Efficiency': '🕯️',
  'Performance Metrics': '📊',
  'Customer Sentiment': '💬',
  'Amazon vs Walmart Comparison': '🛒',
  'Growth Opportunities': '🚀',
}
export default async function Home() {
  const { data: trends } = await supabase
    .from('trend_analysis')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: products } = await supabase
    .from('market_insights')
    .select('*')
    .order('reviews_count', { ascending: false })
    .limit(10)

  const { data: allProducts } = await supabase
    .from('market_insights')
    .select('stars, price, burn_hours, burn_per_oz, reviews_count')

  const trend = trends?.[0]
  const analysis = trend?.analysis || ''
  const sections = parseAnalysisSections(analysis)

  // Calculate summary metrics
  const validStars = allProducts?.filter(p => p.stars).map(p => p.stars) || []
  const avgStars = validStars.length ? (validStars.reduce((a, b) => a + b, 0) / validStars.length).toFixed(1) : 'N/A'
  const validPrices = allProducts?.filter(p => p.price).map(p => p.price) || []
  const avgPrice = validPrices.length ? '$' + (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2) : 'N/A'
  const validBurnHz = allProducts?.filter(p => p.burn_hours).map(p => p.burn_hours) || []
  const avgBurnHours = validBurnHz.length ? Math.round(validBurnHz.reduce((a, b) => a + b, 0) / validBurnHz.length) + ' hrs' : 'N/A'
  const validBurnPerOz = allProducts?.filter(p => p.burn_per_oz).map(p => p.burn_per_oz) || []
  const avgBurnPerOz = validBurnPerOz.length ? (validBurnPerOz.reduce((a, b) => a + b, 0) / validBurnPerOz.length).toFixed(1) + ' hrs/oz' : 'N/A'
  const totalProducts = allProducts?.length || 0
  const totalReviews = allProducts?.reduce((a, b) => a + (b.reviews_count || 0), 0) || 0

  return (
    <main style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1f2e', padding: '24px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', margin: 0 }}>
                🕯️ US Candle Market Intelligence
              </h1>
              <p style={{ color: '#8892a4', fontSize: '13px', margin: '4px 0 0' }}>
                Amazon US Bestsellers · Candles & Home Fragrance
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: '#2ecc71', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                LIVE
              </span>
              {trend?.created_at && (
                <p style={{ color: '#8892a4', fontSize: '11px', margin: '6px 0 0' }}>
                  Updated: {new Date(trend.created_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 40px' }}>

        {/* Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Products Tracked', value: totalProducts.toString(), color: '#3498db' },
            { label: 'Total Reviews', value: totalReviews.toLocaleString(), color: '#9b59b6' },
            { label: 'Avg Rating', value: avgStars + ' ⭐', color: '#f39c12' },
            { label: 'Avg Price', value: avgPrice, color: '#27ae60' },
            { label: 'Avg Burn Time', value: avgBurnHours, color: '#e74c3c' },
            { label: 'Avg Burn/oz', value: avgBurnPerOz, color: '#1abc9c' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e8eaed', borderTop: `3px solid ${m.color}` }}>
              <p style={{ color: '#8892a4', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', margin: '0 0 8px' }}>{m.label}</p>
              <p style={{ color: '#1a1f2e', fontSize: '18px', fontWeight: '700', margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* AI Analysis Sections */}
        {sections.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#1a1f2e', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
              📋 AI Market Analysis
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {sections.map((section, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #e8eaed' }}>
                  <h3 style={{ color: '#1a1f2e', fontSize: '14px', fontWeight: '700', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{sectionIcons[section.title] || '📌'}</span>
                    {section.title}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: '1.7' }}>
                    {section.content.map((line, j) => {
                      if (line.match(/^\d+\.\s/) || line.match(/^#{1,3}\s/)) {
                        return (
                          <p key={j} style={{ fontWeight: '600', color: '#2d3748', margin: '8px 0 4px' }}>
                            {line.replace(/^#{1,3}\s/, '')}
                          </p>
                        )
                      }
                      if (line.startsWith('- ') || line.startsWith('• ')) {
                        return (
                          <div key={j} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '4px' }}>
                            <span style={{ color: '#3498db', flexShrink: 0 }}>•</span>
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

        {/* Product Table */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8eaed', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8eaed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#1a1f2e', fontSize: '14px', fontWeight: '700', margin: 0 }}>
              🏆 Top Products by Reviews
            </h2>
            <span style={{ color: '#8892a4', fontSize: '12px' }}>Showing top 10</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  {['Product', 'Brand', 'Scent', 'Stars', 'Reviews', 'Price', 'Burn Hrs', 'Burn/oz', 'Wicks', 'Color'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#8892a4', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products?.map((p: any, i: number) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '10px 12px', maxWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {p.image_url && (
                          <img src={p.image_url} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
                        )}
                        <span style={{ color: '#2d3748', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }} title={p.product_name}>
                          {p.product_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.brand || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.scent_name || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#f39c12', fontWeight: '600' }}>⭐ {p.stars}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.reviews_count?.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#27ae60', fontWeight: '600', whiteSpace: 'nowrap' }}>${p.price}</td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.burn_hours ? p.burn_hours + ' hrs' : '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {p.burn_per_oz ? (
                        <span style={{ background: '#e8f5e9', color: '#27ae60', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                          {p.burn_per_oz}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.wick_quantity || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.color || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#b0b8c4', fontSize: '11px', marginTop: '24px' }}>
          Powered by AI · Data from Amazon US · Auto-refreshes every 12 hours
        </p>
      </div>
    </main>
  )
}
