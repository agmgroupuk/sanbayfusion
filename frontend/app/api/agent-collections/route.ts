import { NextRequest, NextResponse } from 'next/server'
import { verifyRequest, unauthorizedResponse } from '../../../lib/validateAuth'

const BACKEND_BASE = process.env.BACKEND_URL || 'http://localhost:3005'

async function proxy(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const backendPath = url.pathname.replace(/^\/api/, '') || '/'
    const backendUrl = `${BACKEND_BASE}${backendPath}${url.search}`

    const init: RequestInit = {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: undefined,
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const result = verifyRequest(request)
      if (!result.ok) return unauthorizedResponse(result.error)
      init.body = await request.text()
    }

    const res = await fetch(backendUrl, init)
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: res.headers as any })
  } catch (err: any) {
    console.error('[/api/agent-collections] Proxy error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Proxy error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return proxy(request)
}

export async function POST(request: NextRequest) {
  return proxy(request)
}

export async function PUT(request: NextRequest) {
  return proxy(request)
}

export async function DELETE(request: NextRequest) {
  return proxy(request)
}
