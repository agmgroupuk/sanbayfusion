import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/lab/battle-arena/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('[/lab/battle-arena/vote] Proxy error:', error);
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
}
