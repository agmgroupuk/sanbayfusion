import { NextRequest, NextResponse } from 'next/server';
import {
    getSessionUser,
    awardPoints,
    awardSubscriptionPoints,
    checkAndAwardBadges,
    checkAndUpdateAchievements,
    POINTS_CONFIG,
} from '@/lib/rewards-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rewards/earn
 * Central endpoint for awarding points from various activities.
 * Called by other parts of the system (subscription hooks, chat, tools, lab, etc.)
 *
 * Body: { action, agentId?, plan?, metadata? }
 * Actions: signup, subscription, chat, tool_usage, lab_experiment, daily_login, community_post, community_comment
 */
export async function POST(request: NextRequest) {
    try {
        const sessionId = request.cookies.get('session_id')?.value ||
            request.cookies.get('sessionId')?.value;

        if (!sessionId) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const sessionUser = await getSessionUser(sessionId);
        if (!sessionUser) {
            return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const { action, agentId, plan, metadata } = body;

        if (!action) {
            return NextResponse.json({ success: false, message: 'Action is required' }, { status: 400 });
        }

        const userId = sessionUser.id;
        let pointsAwarded = 0;
        let description = '';

        switch (action) {
            case 'signup':
                pointsAwarded = POINTS_CONFIG.signup_bonus;
                description = 'Welcome bonus for joining Maula AI';
                await awardPoints(userId, pointsAwarded, 'signup', description);
                break;

            case 'subscription':
                if (!plan || !agentId) {
                    return NextResponse.json({ success: false, message: 'plan and agentId required for subscription' }, { status: 400 });
                }
                await awardSubscriptionPoints(userId, plan, agentId);
                const planKey = `subscription_${plan}` as keyof typeof POINTS_CONFIG;
                pointsAwarded = POINTS_CONFIG[planKey] || POINTS_CONFIG.subscription_daily;
                description = `Agent subscription (${plan})`;
                break;

            case 'chat':
                pointsAwarded = POINTS_CONFIG.chat_interaction;
                description = 'AI conversation completed';
                await awardPoints(userId, pointsAwarded, 'chat', description, metadata?.conversationId);
                break;

            case 'tool_usage':
                pointsAwarded = POINTS_CONFIG.tool_usage;
                description = `Tool used: ${metadata?.toolName || 'tool'}`;
                await awardPoints(userId, pointsAwarded, 'tool_usage', description, metadata?.toolId);
                break;

            case 'lab_experiment':
                pointsAwarded = POINTS_CONFIG.lab_experiment;
                description = `Lab experiment: ${metadata?.experimentType || 'experiment'}`;
                await awardPoints(userId, pointsAwarded, 'lab', description, metadata?.experimentId);
                break;

            case 'daily_login':
                pointsAwarded = POINTS_CONFIG.daily_login;
                description = 'Daily login bonus';
                await awardPoints(userId, pointsAwarded, 'daily_login', description);
                break;

            case 'community_post':
                pointsAwarded = POINTS_CONFIG.community_post;
                description = 'Community post created';
                await awardPoints(userId, pointsAwarded, 'community', description, metadata?.postId);
                break;

            case 'community_comment':
                pointsAwarded = POINTS_CONFIG.community_comment;
                description = 'Community comment posted';
                await awardPoints(userId, pointsAwarded, 'community', description, metadata?.commentId);
                break;

            default:
                return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
        }

        // Check for new badges and achievements after any action
        const [newBadges, newAchievements] = await Promise.all([
            checkAndAwardBadges(userId),
            checkAndUpdateAchievements(userId),
        ]);

        return NextResponse.json({
            success: true,
            pointsAwarded,
            description,
            newBadges: newBadges.map(b => ({ id: b.id, name: b.name, icon: b.icon })),
            newAchievements,
        });
    } catch (error) {
        console.error('Error earning points:', error);
        return NextResponse.json({ success: false, message: 'Failed to earn points' }, { status: 500 });
    }
}
