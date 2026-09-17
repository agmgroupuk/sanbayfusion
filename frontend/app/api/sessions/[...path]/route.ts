import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy all /api/sessions/* requests to backend
 * Supports: GET, POST, PUT, DELETE
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3005';

async function proxyRequest(request: NextRequest, method: string) {
    try {
        const url = new URL(request.url);
        const path = url.pathname.replace('/api/sessions', '/api/sessions');
        const search = url.search || '';
        const backendUrl = `${BACKEND_URL}${path}${search}`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // Forward cookies for session auth
        const cookie = request.headers.get('cookie');
        if (cookie) headers['cookie'] = cookie;

        // Forward user ID header for auth
        const userId = request.headers.get('x-user-id');
        if (userId) headers['x-user-id'] = userId;

        const fetchOptions: RequestInit = { method, headers };

        if (method !== 'GET' && method !== 'HEAD') {
            try {
                const body = await request.json();
                fetchOptions.body = JSON.stringify(body);
            } catch {
                // No body
            }
        }

        const response = await fetch(backendUrl, fetchOptions);
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error(`[/api/sessions proxy] ${method} error:`, error);
        return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }
}

export async function GET(request: NextRequest) {
    return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
    return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
    return proxyRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
    return proxyRequest(request, 'DELETE');
}
