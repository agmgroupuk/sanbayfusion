import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    const clientId = process.env.YAHOO_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ message: 'Yahoo OAuth not configured' }, { status: 503 });
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Determine the redirect URI from the request origin
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${proto}://${host}/api/auth/yahoo/callback`;

    // Preserve the original redirect destination
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard/overview';

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
    });

    const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;

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
