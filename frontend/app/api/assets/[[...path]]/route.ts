/**
 * Proxy: /api/assets/* → backend /api/assets/*
 * Handles asset management requests from canvas-app
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

async function proxyRequest(request: NextRequest, params: Promise<{ path?: string[] }>) {
  try {
    const { path } = await params;
    const subPath = path ? `/${path.join('/')}` : '';
    const url = new URL(request.url);
    const qs = url.search || '';
    const target = `${BACKEND_URL}/api/assets${subPath}${qs}`;

    const cookieHeader = request.headers.get('cookie') || '';
    const headers: Record<string, string> = {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      'x-canvas-source': 'embedded',
    };

    const init: RequestInit = {
      method: request.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        headers['content-type'] = contentType;
        init.body = await request.arrayBuffer();
      } else {
        headers['content-type'] = contentType || 'application/json';
        init.body = await request.text();
      }
    }

    const response = await fetch(target, init);
    const data = await response.text();

    try {
      return NextResponse.json(JSON.parse(data), { status: response.status });
    } catch {
      return new NextResponse(data, { status: response.status });
    }
  } catch (error) {
    console.error('[/api/assets] Proxy error:', error);
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 503 });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
