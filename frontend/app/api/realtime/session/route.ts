import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO keys or secrets.
// All AI operations delegated to universal-chat-backend.

const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(`${CHAT_BACKEND_URL}/api/realtime/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Session creation failed' }, { status: response.status });
    }

    const data = await response.json();

    // Backend returns { success, session: { client_secret, ... } }
    // Frontend expects { client_secret } at top level
    if (data.session?.client_secret) {
      return NextResponse.json({
        client_secret: data.session.client_secret,
        voice: data.session.voice,
        model: data.session.model,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[/realtime/session] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
