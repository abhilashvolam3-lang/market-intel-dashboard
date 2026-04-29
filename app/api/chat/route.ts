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
      .limit(200)

    const productContext = (products || []).map(p =>
      "- " + (p.product_name || "") +
      " | Brand: " + (p.brand || "unknown") +
      " | Source: " + (p.source || "") +
      " | Price: $" + (p.price || "unknown") +
      " | Stars: " + (p.stars || "unknown") +
      " | Reviews: " + (p.reviews_count || 0) +
      " | Burn hrs: " + (p.burn_hours || "unknown") +
      " | Burn/oz: " + (p.burn_per_oz || "unknown") +
      " | Price/oz: $" + (p.price_per_oz || "unknown") +
      " | Weight: " + (p.weight_oz || "unknown") + "oz" +
      " | Scent: " + (p.scent_name || "unknown") +
      " | Type: " + (p.candle_type || "unknown") +
      " | Wicks: " + (p.wick_quantity || "unknown") +
      " | Material: " + (p.material_type || "unknown")
    ).join('\n')

    const prompt = `You are a strict candle market data analyst. Your job is to answer questions using ONLY the product data provided below.

STRICT RULES — follow these exactly:
1. ONLY use data that is explicitly present in the product list below
2. If a field shows "unknown" — treat it as unavailable, do NOT guess or estimate it
3. If a comparison cannot be made because data is missing — clearly state which data is missing and why
4. NEVER invent prices, ratings, burn times or any numbers not in the data
5. If the question asks to compare two brands — only compare fields where BOTH brands have real data
6. Always cite the specific product name and its source (Amazon/Walmart/PF Candle) in your answer
7. Keep answers concise — max 150 words
8. If absolutely no relevant data exists for the question — say exactly: "The available data does not contain enough information to answer this question. Available fields are: price, stars, reviews, burn hours, burn/oz, price/oz, weight, scent, candle type, wicks, material."

PRODUCT DATA:
${productContext}

USER QUESTION: ${question}

Answer based strictly on the data above:`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a strict data analyst. You NEVER hallucinate or invent data. You only report what is explicitly present in the data provided. If data is missing or unknown, you say so clearly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    })

    const data = await groqResponse.json()
    const answer = data.choices?.[0]?.message?.content || 'Could not generate an answer.'

    return NextResponse.json({ answer })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ answer: 'Error: ' + String(error) }, { status: 500 })
  }
}
