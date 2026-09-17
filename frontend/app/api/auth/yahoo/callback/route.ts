import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface YahooTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
}

interface YahooUser {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    email_verified?: boolean;
    picture?: string;
}

export async function GET(request: NextRequest) {
    // Build the real external base URL from proxy headers (not request.url which is localhost:3000)
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'sanbayfusion.com';
    const baseUrl = `${proto}://${host}`;

    try {
        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Yahoo denied access
        if (error) {
            console.error('Yahoo OAuth error:', error, searchParams.get('error_description'));
            return NextResponse.redirect(new URL('/auth/login?message=Yahoo login was cancelled', baseUrl));
        }

        if (!code || !state) {
            return NextResponse.redirect(new URL('/auth/login?message=Invalid OAuth response', baseUrl));
        }

        // Validate CSRF state
        const oauthCookie = request.cookies.get('oauth_state')?.value;
        let redirectTo = '/dashboard/overview';
        if (oauthCookie) {
            try {
                const parsed = JSON.parse(oauthCookie);
                if (parsed.state !== state) {
                    return NextResponse.redirect(new URL('/auth/login?message=Invalid state parameter', baseUrl));
                }
                redirectTo = parsed.redirectTo || '/dashboard/overview';
            } catch {
                return NextResponse.redirect(new URL('/auth/login?message=Invalid state parameter', baseUrl));
            }
        }

        const clientId = process.env.YAHOO_CLIENT_ID;
        const clientSecret = process.env.YAHOO_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/auth/login?message=Yahoo OAuth not configured', baseUrl));
        }

        // Determine the redirect URI (must match exactly what was sent to Yahoo)
        const redirectUri = `${baseUrl}/api/auth/yahoo/callback`;

        // Exchange code for access token
        // Yahoo requires Basic auth with client_id:client_secret
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData: YahooTokenResponse = await tokenRes.json();
        if (tokenData.error || !tokenData.access_token) {
            console.error('Yahoo token exchange failed:', tokenData.error, tokenData.error_description);
            return NextResponse.redirect(new URL('/auth/login?message=Yahoo authentication failed', baseUrl));
        }

        // Fetch Yahoo user profile via OpenID Connect userinfo endpoint
        const userRes = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userRes.ok) {
            console.error('Failed to fetch Yahoo user:', userRes.status);
            return NextResponse.redirect(new URL('/auth/login?message=Failed to fetch Yahoo profile', baseUrl));
        }

        const yahooUser: YahooUser = await userRes.json();

        if (!yahooUser.email) {
            return NextResponse.redirect(
                new URL('/auth/login?message=No email found on your Yahoo account', baseUrl)
            );
        }

        const yahooId = yahooUser.sub;

        // Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ yahooId }, { email: yahooUser.email.toLowerCase() }],
            },
        });

        if (user) {
            // Link Yahoo ID if not already linked
            const updateData: Record<string, unknown> = {
                lastLoginAt: new Date(),
            };
            if (!user.yahooId) {
                updateData.yahooId = yahooId;
            }
            // Update avatar if user doesn't have one
            if (!user.image && !user.avatar && yahooUser.picture) {
                updateData.image = yahooUser.picture;
            }
            // Update name if user doesn't have one
            if (!user.name && (yahooUser.name || yahooUser.given_name)) {
                updateData.name = yahooUser.name || `${yahooUser.given_name || ''} ${yahooUser.family_name || ''}`.trim();
            }
            user = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email: yahooUser.email.toLowerCase(),
                    name: yahooUser.name || `${yahooUser.given_name || ''} ${yahooUser.family_name || ''}`.trim() || 'User',
                    yahooId,
                    authMethod: 'yahoo',
                    image: yahooUser.picture || null,
                    emailVerified: yahooUser.email_verified ? new Date() : null,
                    isActive: true,
                },
            });
        }

        // Generate session (same pattern as login route)
        const sessionId = crypto.randomBytes(32).toString('hex');
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.user.update({
            where: { id: user.id },
            data: { sessionId, sessionExpiry },
        });

        // Redirect to the app with session cookies
        const response = NextResponse.redirect(new URL(redirectTo, baseUrl));

        const isProduction = proto === 'https';

        // Set session cookies (same pattern as login route)
        response.cookies.set('session_id', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            domain: isProduction ? '.sanbayfusion.com' : undefined,
        });

        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            domain: isProduction ? '.sanbayfusion.com' : undefined,
        });

        // Clear the OAuth state cookie
        response.cookies.set('oauth_state', '', {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Yahoo OAuth callback error:', error);
        return NextResponse.redirect(new URL('/auth/login?message=Authentication failed', baseUrl));
    }
}
