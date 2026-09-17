import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/lab/debate-arena/votes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('[/lab/debate-arena/votes] Proxy error:', error);
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
}
