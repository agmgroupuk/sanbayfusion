import { NextRequest, NextResponse } from 'next/server';

// ⚠️ SECURITY FIX: Proxy-only route. NO keys or secrets.
// All AI operations delegated to backend.

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/lab/story-generation`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[lab/story-generation] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/lab/story-generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('[lab/story-generation] Proxy error:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
