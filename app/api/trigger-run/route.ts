  import { NextResponse } from 'next/server'

export async function POST() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/main.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' })
    }
  )

  if (response.status === 204) {
    return NextResponse.json({ success: true, message: 'Pipeline triggered!' })
  } else {
    const error = await response.text()
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
