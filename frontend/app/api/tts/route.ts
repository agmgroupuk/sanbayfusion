import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO keys or secrets.
// All AI operations delegated to universal-chat-backend.

const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${CHAT_BACKEND_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'TTS synthesis failed' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle audio responses (MP3, PCM, WAV)
    if (contentType.includes('audio/')) {
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        headers: { 'Content-Type': contentType },
      });
    }

    // Handle streaming responses
    if (contentType.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[/tts] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
