import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Fetch canvas app subscriptions (GenCraft Pro + Canvas Studio) for the billing page.
 * Calls both canvas-app-backend (port 3100) and canvas-studio-backend (port 3200) directly.
 * Forwards browser cookies so backends can authenticate via session.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    // userId param kept for URL compatibility but auth comes from cookies
    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const cookieHeader = request.headers.get('cookie') || '';

    const canvasAppUrl = `http://127.0.0.1:3100/api/canvas/studio-subscriptions`;
    const canvasStudioUrl = `http://127.0.0.1:3200/api/canvas/studio-subscriptions`;

    const results: any[] = [];
    const fetchOpts = { signal: AbortSignal.timeout(5000), headers: { cookie: cookieHeader } };

    // Fetch from both backends in parallel, don't fail if one is down
    const [appResult, studioResult] = await Promise.allSettled([
        fetch(canvasAppUrl, fetchOpts).then(r => r.json()),
        fetch(canvasStudioUrl, fetchOpts).then(r => r.json()),
    ]);

    if (appResult.status === 'fulfilled' && appResult.value?.subscriptions) {
        results.push(...appResult.value.subscriptions);
    }
    if (studioResult.status === 'fulfilled' && studioResult.value?.subscriptions) {
        results.push(...studioResult.value.subscriptions);
    }

    // Deduplicate by subscription ID to prevent the same subscription appearing twice
    const seen = new Set<string>();
    const deduped = results.filter(sub => {
        if (seen.has(sub.id)) return false;
        seen.add(sub.id);
        return true;
    });

    return NextResponse.json({ success: true, subscriptions: deduped });
}
