import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.UNIVERSAL_CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

/** POST /api/studio/stats — save/update session stats (proxied to backend) */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const cookieHeader = request.headers.get('cookie') || '';

        const response = await fetch(`${BACKEND_URL}/api/studio/stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: JSON.stringify(body),
        });

        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('[/studio/stats POST] Proxy error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}
