import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Canvas App Backend (port 3100) is the source of truth for canvas deployments
const CANVAS_BACKEND = process.env.CANVAS_APP_BACKEND_URL || 'http://localhost:3100';

export async function GET(request: NextRequest) {
    try {
        const cookieHeader = request.headers.get('cookie') || '';

        const res = await fetch(`${CANVAS_BACKEND}/api/canvas/deployments`, {
            headers: {
                'Cookie': cookieHeader,
                'X-Canvas-Source': 'standalone',
            },
        });

        const data = await res.json();

        return NextResponse.json({
            success: data.success ?? false,
            deployments: data.deployments || [],
        });
    } catch (error) {
        console.error('[/api/canvas/deployments] Proxy error:', error);
        return NextResponse.json(
            { success: false, deployments: [] },
            { status: 500 }
        );
    }
}
