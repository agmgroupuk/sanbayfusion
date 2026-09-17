import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.UNIVERSAL_CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

/** GET /api/studio/stats/[sessionId] — retrieve session stats (proxied to backend) */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await params;
        const cookieHeader = request.headers.get('cookie') || '';

        const response = await fetch(
            `${BACKEND_URL}/api/studio/stats/${encodeURIComponent(sessionId)}`,
            {
                headers: {
                    ...(cookieHeader ? { cookie: cookieHeader } : {}),
                },
            }
        );

        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('[/studio/stats/:id GET] Proxy error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}
