import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO keys or secrets.
// All AI operations delegated to backend.

const BACKEND_URL = process.env.UNIVERSAL_CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get('cookie') || '';
    const canvasSource = request.headers.get('x-canvas-source') || '';

    const response = await fetch(`${BACKEND_URL}/api/studio/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(canvasSource ? { 'x-canvas-source': canvasSource } : {}),
      },
      body: JSON.stringify(body),
    });

    // Handle streaming responses
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',  // Disable nginx buffering
          ...(response.headers.get('X-Provider') ? { 'X-Provider': response.headers.get('X-Provider')! } : {}),
        },
      });
    }

    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[/studio/chat/stream] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
