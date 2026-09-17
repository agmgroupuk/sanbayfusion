import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/user/settings — retrieve user chat settings via Prisma */
export async function GET(request: NextRequest) {
    try {
        // Authenticate via session cookie
        const sessionId =
            request.cookies.get('session_id')?.value ||
            request.cookies.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'No session ID' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findFirst({
            where: { sessionId, sessionExpiry: { gt: new Date() } },
            select: { id: true, preferences: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        // Get ChatSettings
        const chatSettings = await prisma.chatSettings.findUnique({
            where: { userId: user.id },
        });

        // Merge user preferences with chat settings
        const settings = {
            defaultProvider: chatSettings?.defaultProvider || 'mistral',
            defaultModel: chatSettings?.defaultModel || null,
            temperature: chatSettings?.temperature ?? 0.7,
            maxTokens: chatSettings?.maxTokens ?? 2000,
            defaultMode: chatSettings?.defaultMode || 'balanced',
            activeSessionId: chatSettings?.activeSessionId || null,
            preferences: (user.preferences as Record<string, unknown>) || {},
        };

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('[/user/settings GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load settings' },
            { status: 500 }
        );
    }
}

/** PUT /api/user/settings — update user settings via Prisma */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Authenticate via session cookie
        const sessionId =
            request.cookies.get('session_id')?.value ||
            request.cookies.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'No session ID' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findFirst({
            where: { sessionId, sessionExpiry: { gt: new Date() } },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        // Update ChatSettings
        const chatData: any = {};
        if (body.defaultProvider !== undefined) chatData.defaultProvider = body.defaultProvider;
        if (body.defaultModel !== undefined) chatData.defaultModel = body.defaultModel;
        if (body.temperature !== undefined) chatData.temperature = body.temperature;
        if (body.maxTokens !== undefined) chatData.maxTokens = body.maxTokens;
        if (body.defaultMode !== undefined) chatData.defaultMode = body.defaultMode;
        if (body.activeSessionId !== undefined) chatData.activeSessionId = body.activeSessionId;

        // Upsert chat settings
        if (Object.keys(chatData).length > 0) {
            await prisma.chatSettings.upsert({
                where: { userId: user.id },
                create: { userId: user.id, ...chatData },
                update: chatData,
            });
        }

        // Update user preferences if provided
        if (body.preferences !== undefined) {
            await prisma.user.update({
                where: { id: user.id },
                data: { preferences: body.preferences },
            });
        }

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        console.error('[/user/settings PUT] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
