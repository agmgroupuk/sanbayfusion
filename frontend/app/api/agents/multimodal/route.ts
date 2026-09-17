import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO keys or secrets.
// All AI operations delegated to backend.

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/agents/multimodal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    // Handle streaming responses
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
    
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[/agents/multimodal] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
