import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Canvas App Backend (port 3100) is the source of truth for deploy history
const CANVAS_BACKEND = process.env.CANVAS_APP_BACKEND_URL || 'http://localhost:3100';

export async function GET(request: NextRequest) {
    try {
        const cookieHeader = request.headers.get('cookie') || '';

        const res = await fetch(`${CANVAS_BACKEND}/api/canvas/deploy/history?source=standalone`, {
            headers: {
                'Cookie': cookieHeader,
                'X-Canvas-Source': 'standalone',
            },
        });

        const data = await res.json();

        return NextResponse.json({
            success: data.success ?? false,
            history: (data.history || []).map((h: any) => ({
                id: h.id,
                platform: h.platform,
                projectName: h.projectName,
                url: h.url,
                status: h.status,
                error: h.error,
                source: h.source,
                createdAt: h.createdAt,
            })),
        });
    } catch (error) {
        console.error('[/api/canvas/deploy/history] Proxy error:', error);
        return NextResponse.json({ success: false, history: [] }, { status: 500 });
    }
}
