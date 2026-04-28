import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { question } = await req.json()

    const { data: products } = await supabase
      .from('market_insights')
      .select('product_name, brand, price, stars, reviews_count, burn_hours, burn_per_oz, price_per_oz, weight_oz, scent_name, candle_type, is_scented, source, wick_quantity, material_type')
      .order('reviews_count', { ascending: false })
      .limit(100)

    const productContext = (products || []).map(p =>
      "- " + (p.product_name || "") +
      " | Brand: " + (p.brand || "N/A") +
      " | Source: " + (p.source || "") +
      " | Price: $" + (p.price || "N/A") +
      " | Stars: " + (p.stars || "N/A") +
      " | Reviews: " + (p.reviews_count || 0) +
      " | Burn hrs: " + (p.burn_hours || "N/A") +
      " | Burn/oz: " + (p.burn_per_oz || "N/A") +
      " | Price/oz: $" + (p.price_per_oz || "N/A") +
      " | Weight: " + (p.weight_oz || "N/A") + "oz" +
      " | Scent: " + (p.scent_name || "N/A") +
      " | Type: " + (p.candle_type || "N/A") +
      " | Wicks: " + (p.wick_quantity || "N/A") +
      " | Material: " + (p.material_type || "N/A")
    ).join('\n')

    const prompt = "You are a candle market intelligence analyst. Answer the user's question based ONLY on the product data provided below. Be specific, use product names and numbers. Keep answer concise (max 200 words).\n\nPRODUCT DATA:\n" + productContext + "\n\nUSER QUESTION: " + question + "\n\nAnswer:"

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400
      })
    })

    const data = await groqResponse.json()
    const answer = data.choices?.[0]?.message?.content || 'Sorry, could not generate an answer.'

    return NextResponse.json({ answer })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ answer: 'Error: ' + String(error) }, { status: 500 })
  }
}
