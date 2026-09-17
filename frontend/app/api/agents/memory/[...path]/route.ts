import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.UNIVERSAL_CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

/**
 * Catch-all proxy for /api/agents/memory/[...path]
 * Forwards GET, POST, PUT, DELETE to the backend agent-memory-routes.
 */
async function proxyToBackend(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const subPath = path.join('/');
    const backendUrl = `${BACKEND_URL}/api/agents/memory/${subPath}`;
    const cookieHeader = request.headers.get('cookie') || '';

    const headers: Record<string, string> = {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
    };

    // Forward x-user-id header for auth fallback
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
        headers['x-user-id'] = userIdHeader;
    }

    const init: RequestInit = {
        method: request.method,
        headers,
    };

    // Forward body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
            const body = await request.json();
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        } catch {
            // No JSON body — that's fine
        }
    }

    try {
        const response = await fetch(backendUrl, init);
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/agents/memory proxy] Error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const DELETE = proxyToBackend;
