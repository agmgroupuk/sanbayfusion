import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO API keys or secrets.
// All AI operations delegated to backend.

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[agent/chat] Proxy error:', error);
    return NextResponse.json({ error: 'Chat service unavailable' }, { status: 503 });
  }
}
