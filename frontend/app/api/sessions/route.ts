import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy /api/sessions root to backend (list + create + sync)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const search = url.search || '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const cookie = request.headers.get('cookie');
        if (cookie) headers['cookie'] = cookie;
        const userId = request.headers.get('x-user-id');
        if (userId) headers['x-user-id'] = userId;

        const response = await fetch(`${BACKEND_URL}/api/sessions${search}`, { method: 'GET', headers });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/api/sessions proxy] GET error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const cookie = request.headers.get('cookie');
        if (cookie) headers['cookie'] = cookie;
        const userId = request.headers.get('x-user-id');
        if (userId) headers['x-user-id'] = userId;

        // Check if this is a sync request (body has 'sessions' array)
        const path = body.sessions ? '/api/sessions/sync' : '/api/sessions';
        const response = await fetch(`${BACKEND_URL}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/api/sessions proxy] POST error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}
