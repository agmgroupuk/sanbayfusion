import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface MicrosoftTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    id_token?: string;
    error?: string;
    error_description?: string;
}

interface MicrosoftUser {
    id: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    mail?: string;
    userPrincipalName: string;
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

        // Microsoft denied access
        if (error) {
            console.error('Microsoft OAuth error:', error, searchParams.get('error_description'));
            return NextResponse.redirect(new URL('/auth/login?message=Microsoft login was cancelled', baseUrl));
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

        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/auth/login?message=Microsoft OAuth not configured', baseUrl));
        }

        // Determine redirect URI (must match what was sent in the authorize request)
        const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

        // Exchange code for access token
        const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'openid email profile User.Read',
            }).toString(),
        });

        const tokenData: MicrosoftTokenResponse = await tokenRes.json();
        if (tokenData.error || !tokenData.access_token) {
            console.error('Microsoft token exchange failed:', tokenData.error, tokenData.error_description);
            return NextResponse.redirect(new URL('/auth/login?message=Microsoft authentication failed', baseUrl));
        }

        // Fetch Microsoft user profile via Graph API
        const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userRes.ok) {
            console.error('Failed to fetch Microsoft user:', userRes.status, await userRes.text());
            return NextResponse.redirect(new URL('/auth/login?message=Failed to fetch Microsoft profile', baseUrl));
        }

        const msUser: MicrosoftUser = await userRes.json();

        // Get email — mail field or userPrincipalName
        const email = msUser.mail || msUser.userPrincipalName;
        if (!email || !email.includes('@')) {
            return NextResponse.redirect(
                new URL('/auth/login?message=No email found on your Microsoft account', baseUrl)
            );
        }

        const microsoftId = msUser.id;
        const displayName = msUser.displayName || [msUser.givenName, msUser.surname].filter(Boolean).join(' ') || email.split('@')[0];

        // Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ microsoftId }, { email: email.toLowerCase() }],
            },
        });

        if (user) {
            // Link Microsoft ID if not already linked
            const updateData: Record<string, unknown> = {
                lastLoginAt: new Date(),
            };
            if (!user.microsoftId) {
                updateData.microsoftId = microsoftId;
            }
            // Update name if user doesn't have one
            if (!user.name && displayName) {
                updateData.name = displayName;
            }
            user = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    name: displayName,
                    microsoftId,
                    authMethod: 'microsoft',
                    emailVerified: new Date(), // Microsoft emails are verified
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
        console.error('Microsoft OAuth callback error:', error);
        return NextResponse.redirect(new URL('/auth/login?message=Authentication failed', baseUrl));
    }
}
