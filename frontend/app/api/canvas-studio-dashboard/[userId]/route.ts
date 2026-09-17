import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Proxy to canvas-studio-backend (port 3200) for dashboard stats.
 * Forwards browser cookies so backend can authenticate via session.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    // userId param kept for URL compatibility but auth comes from cookies
    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const cookieHeader = request.headers.get('cookie') || '';
        const url = `http://127.0.0.1:3200/api/canvas/studio-dashboard`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { cookie: cookieHeader } });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[canvas-studio-dashboard proxy] error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch Canvas Studio dashboard data' },
            { status: 502 }
        );
    }
}
