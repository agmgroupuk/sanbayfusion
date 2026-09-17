import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy /api/studio/feedback to backend for message like/dislike
 */

const BACKEND_URL = process.env.UNIVERSAL_CHAT_BACKEND_URL || 'http://127.0.0.1:3400';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/studio/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/studio/feedback proxy] POST error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const search = url.search || '';
        const response = await fetch(`${BACKEND_URL}/api/studio/feedback${search}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/studio/feedback proxy] GET error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/studio/feedback/${body.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[/studio/feedback proxy] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}
