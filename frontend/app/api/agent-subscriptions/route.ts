import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorizedResponse } from '../../../lib/validateAuth';

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://maula.ai:3005';

async function proxy(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const backendPath =
      url.pathname.replace(
        '/api/agent-subscriptions',
        '/api/agent/subscriptions'
      ) + url.search;
    const backendUrl = `${BACKEND_BASE}${backendPath}`;

    const init: RequestInit = {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: undefined,
    };

    // Require authentication for subscription endpoints
    const authResult = verifyRequest(request);
    if (!authResult.ok) return unauthorizedResponse(authResult.error);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text();
    }

    const res = await fetch(backendUrl, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: res.headers as any,
    });
  } catch (err: any) {
    console.error('[/api/agent-subscriptions] Proxy error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
