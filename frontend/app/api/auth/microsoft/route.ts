import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ message: 'Microsoft OAuth not configured' }, { status: 503 });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Determine the redirect URI from the request origin
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${proto}://${host}/api/auth/microsoft/callback`;

    // Preserve the original redirect destination
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard/overview';

    // Using /common/ endpoint to support all Microsoft account types
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        state,
        response_mode: 'query',
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    const response = NextResponse.redirect(authUrl);

    // Store state + redirect destination in an HttpOnly cookie for CSRF validation
    response.cookies.set('oauth_state', JSON.stringify({ state, redirectTo }), {
        httpOnly: true,
        secure: proto === 'https',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
    });

    return response;
}
