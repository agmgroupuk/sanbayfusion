import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
}

interface GoogleUser {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
}

export async function GET(request: NextRequest) {
    // Build the real external base URL from proxy headers (not request.url which is localhost:3000)
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'maula.ai';
    const baseUrl = `${proto}://${host}`;

    try {
        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Google denied access
        if (error) {
            console.error('Google OAuth error:', error);
            return NextResponse.redirect(new URL('/auth/login?message=Google login was cancelled', baseUrl));
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

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/auth/login?message=Google OAuth not configured', baseUrl));
        }

        // Determine the redirect URI (must match exactly what was sent to Google)
        const redirectUri = `${baseUrl}/api/auth/google/callback`;

        // Exchange code for access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData: GoogleTokenResponse = await tokenRes.json();
        if (tokenData.error || !tokenData.access_token) {
            console.error('Google token exchange failed:', tokenData.error, tokenData.error_description);
            return NextResponse.redirect(new URL('/auth/login?message=Google authentication failed', baseUrl));
        }

        // Fetch Google user profile
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userRes.ok) {
            console.error('Failed to fetch Google user:', userRes.status);
            return NextResponse.redirect(new URL('/auth/login?message=Failed to fetch Google profile', baseUrl));
        }

        const googleUser: GoogleUser = await userRes.json();

        if (!googleUser.email) {
            return NextResponse.redirect(
                new URL('/auth/login?message=No email found on your Google account', baseUrl)
            );
        }

        const googleId = googleUser.id;

        // Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ googleId }, { email: googleUser.email.toLowerCase() }],
            },
        });

        if (user) {
            // Link Google ID if not already linked
            const updateData: Record<string, unknown> = {
                lastLoginAt: new Date(),
            };
            if (!user.googleId) {
                updateData.googleId = googleId;
            }
            // Update avatar if user doesn't have one
            if (!user.image && !user.avatar && googleUser.picture) {
                updateData.image = googleUser.picture;
            }
            // Update name if user doesn't have one
            if (!user.name && googleUser.name) {
                updateData.name = googleUser.name;
            }
            user = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email: googleUser.email.toLowerCase(),
                    name: googleUser.name || googleUser.given_name || 'User',
                    googleId,
                    authMethod: 'google',
                    image: googleUser.picture || null,
                    emailVerified: googleUser.verified_email ? new Date() : null,
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
            domain: isProduction ? '.maula.ai' : undefined,
        });

        response.cookies.set('sessionId', sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
            domain: isProduction ? '.maula.ai' : undefined,
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
        console.error('Google OAuth callback error:', error);
        return NextResponse.redirect(new URL('/auth/login?message=Authentication failed', baseUrl));
    }
}
