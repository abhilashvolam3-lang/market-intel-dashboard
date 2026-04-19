import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 0

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

  const trend = trends?.[0]
  const analysis = trend?.analysis || 'No analysis yet.'
  const lines = analysis.split('\n').filter((l: string) => l.trim())

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Market Intelligence Report</h1>
        <p className="text-sm text-gray-500 mt-1">Candle & Home Fragrance — Amazon US Bestsellers</p>
        {trend?.created_at && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {new Date(trend.created_at).toLocaleString()}
          </p>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Trend Analysis</h2>
          <div className="space-y-2">
            {lines.map((line: string, i: number) => {
              const clean = line.replace(/\*\*/g, '')
              if (clean.match(/^\d\./)) return <h3 key={i} className="font-semibold text-gray-800 mt-4">{clean}</h3>
              if (clean.startsWith('-')) return <p key={i} className="text-gray-600 ml-4">{clean}</p>
              return <p key={i} className="text-gray-600">{clean}</p>
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Products by Reviews</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Stars</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Reviews</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-800">{p.product_name}</td>
                    <td className="py-2 px-3 text-yellow-500">⭐ {p.stars}</td>
                    <td className="py-2 px-3 text-gray-600">{p.reviews_count?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-600">${p.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
