import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Canvas App Backend (port 3100) is the source of truth for canvas deployments
const CANVAS_BACKEND = process.env.CANVAS_APP_BACKEND_URL || 'http://localhost:3100';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieHeader = request.headers.get('cookie') || '';

        const res = await fetch(`${CANVAS_BACKEND}/api/canvas/deploy/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            headers: {
                'Cookie': cookieHeader,
                'X-Canvas-Source': 'standalone',
            },
        });

        const data = await res.json();

        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('[/api/canvas/deploy/[slug]] Proxy error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to remove deployment' },
            { status: 500 }
        );
    }
}
