import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface GitHubTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    error?: string;
    error_description?: string;
}

interface GitHubUser {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
}

interface GitHubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
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

        // GitHub denied access
        if (error) {
            console.error('GitHub OAuth error:', error, searchParams.get('error_description'));
            return NextResponse.redirect(new URL('/auth/login?message=GitHub login was cancelled', baseUrl));
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

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/auth/login?message=GitHub OAuth not configured', baseUrl));
        }

        // Exchange code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        const tokenData: GitHubTokenResponse = await tokenRes.json();
        if (tokenData.error || !tokenData.access_token) {
            console.error('GitHub token exchange failed:', tokenData.error, tokenData.error_description);
            return NextResponse.redirect(new URL('/auth/login?message=GitHub authentication failed', baseUrl));
        }

        // Fetch GitHub user profile
        const [userRes, emailsRes] = await Promise.all([
            fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
            }),
            fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
            }),
        ]);

        if (!userRes.ok) {
            console.error('Failed to fetch GitHub user:', userRes.status);
            return NextResponse.redirect(new URL('/auth/login?message=Failed to fetch GitHub profile', baseUrl));
        }

        const githubUser: GitHubUser = await userRes.json();
        const githubEmails: GitHubEmail[] = emailsRes.ok ? await emailsRes.json() : [];

        // Get primary verified email
        const primaryEmail =
            githubEmails.find((e) => e.primary && e.verified)?.email ||
            githubEmails.find((e) => e.verified)?.email ||
            githubUser.email;

        if (!primaryEmail) {
            return NextResponse.redirect(
                new URL('/auth/login?message=No verified email found on your GitHub account', baseUrl)
            );
        }

        const githubId = String(githubUser.id);

        // Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ githubId }, { email: primaryEmail.toLowerCase() }],
            },
        });

        if (user) {
            // Link GitHub ID if not already linked
            const updateData: Record<string, unknown> = {
                lastLoginAt: new Date(),
            };
            if (!user.githubId) {
                updateData.githubId = githubId;
            }
            // Update avatar if user doesn't have one
            if (!user.image && !user.avatar && githubUser.avatar_url) {
                updateData.image = githubUser.avatar_url;
            }
            // Update name if user doesn't have one
            if (!user.name && githubUser.name) {
                updateData.name = githubUser.name;
            }
            user = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email: primaryEmail.toLowerCase(),
                    name: githubUser.name || githubUser.login,
                    githubId,
                    authMethod: 'github',
                    image: githubUser.avatar_url || null,
                    emailVerified: new Date(), // GitHub emails are verified
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
        console.error('GitHub OAuth callback error:', error);
        return NextResponse.redirect(new URL('/auth/login?message=Authentication failed', baseUrl));
    }
}
