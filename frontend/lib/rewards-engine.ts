/**
 * Rewards Engine — Core gamification logic for Sanbay Fusion
 * Handles points awarding, badge/achievement tracking, referral system, level calculation
 */

import prisma from '@/lib/prisma';

// ═══════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════

export const POINTS_CONFIG = {
    // Signup
    signup_bonus: 100,

    // Agent subscriptions
    subscription_daily: 50,
    subscription_weekly: 200,
    subscription_monthly: 500,
    subscription_yearly: 2000,

    // Multi-agent bonuses (awarded when user has N+ active subs)
    multi_agent_2: 100,
    multi_agent_3: 250,
    multi_agent_5: 500,
    multi_agent_all: 1000,

    // Activity
    chat_interaction: 10,
    tool_usage: 15,
    lab_experiment: 25,
    daily_login: 20,

    // Social
    referral_success: 500,
    referral_signup_bonus: 200, // bonus for the person who signs up with a referral code
    community_post: 10,
    community_comment: 5,
} as const;

export const LEVEL_THRESHOLDS = [
    { level: 1, name: 'Bronze', minPoints: 0, maxPoints: 999 },
    { level: 2, name: 'Silver', minPoints: 1000, maxPoints: 2499 },
    { level: 3, name: 'Gold', minPoints: 2500, maxPoints: 4999 },
    { level: 4, name: 'Platinum', minPoints: 5000, maxPoints: 9999 },
    { level: 5, name: 'Diamond', minPoints: 10000, maxPoints: Infinity },
];

export const BADGE_DEFINITIONS = [
    { id: 'welcome', name: 'Welcome!', description: 'Joined Sanbay Fusion', icon: '👋', rarity: 'common', condition: 'signup' },
    { id: 'first_chat', name: 'First Steps', description: 'Had your first AI conversation', icon: '💬', rarity: 'common', condition: 'chat_1' },
    { id: 'chatter', name: 'Chatter', description: 'Completed 10 conversations', icon: '🗣️', rarity: 'common', condition: 'chat_10' },
    { id: 'conversationalist', name: 'Conversationalist', description: 'Completed 50 conversations', icon: '🎙️', rarity: 'rare', condition: 'chat_50' },
    { id: 'enthusiast', name: 'AI Enthusiast', description: 'Completed 100 conversations', icon: '🧠', rarity: 'rare', condition: 'chat_100' },
    { id: 'power_user', name: 'Power User', description: 'Completed 500 conversations', icon: '⚡', rarity: 'epic', condition: 'chat_500' },
    { id: 'master', name: 'AI Master', description: 'Completed 1000 conversations', icon: '👑', rarity: 'legendary', condition: 'chat_1000' },
    { id: 'subscriber', name: 'Subscriber', description: 'Purchased first agent subscription', icon: '⭐', rarity: 'common', condition: 'subscription_1' },
    { id: 'collector', name: 'Agent Collector', description: 'Subscribed to 3 agents', icon: '📚', rarity: 'rare', condition: 'subscription_3' },
    { id: 'mogul', name: 'Agent Mogul', description: 'Subscribed to 5+ agents', icon: '💎', rarity: 'epic', condition: 'subscription_5' },
    { id: 'referrer', name: 'Connector', description: 'Referred your first friend', icon: '🤝', rarity: 'rare', condition: 'referral_1' },
    { id: 'influencer', name: 'Influencer', description: 'Referred 5 friends', icon: '📣', rarity: 'epic', condition: 'referral_5' },
    { id: 'tool_user', name: 'Tool Master', description: 'Used 10 different tools', icon: '🔧', rarity: 'rare', condition: 'tools_10' },
    { id: 'scientist', name: 'Lab Scientist', description: 'Ran 10 lab experiments', icon: '🔬', rarity: 'rare', condition: 'lab_10' },
    { id: 'explorer', name: 'Explorer', description: 'Tried 5 different agents', icon: '🧭', rarity: 'rare', condition: 'agents_5' },
    { id: 'early_adopter', name: 'Early Adopter', description: 'Joined before 2027', icon: '🚀', rarity: 'epic', condition: 'early_adopter' },
    { id: 'streak_7', name: 'Week Warrior', description: 'Logged in 7 days in a row', icon: '🔥', rarity: 'rare', condition: 'streak_7' },
    { id: 'streak_30', name: 'Monthly Legend', description: 'Logged in 30 days in a row', icon: '🏆', rarity: 'legendary', condition: 'streak_30' },
];

export const ACHIEVEMENT_DEFINITIONS = [
    { id: 'first_chat', name: 'First Steps', description: 'Complete your first AI conversation', icon: '💬', points: 50, target: 1, source: 'chat' },
    { id: 'chat_10', name: 'Getting Started', description: 'Complete 10 AI conversations', icon: '🗣️', points: 100, target: 10, source: 'chat' },
    { id: 'chat_50', name: 'Conversation Expert', description: 'Complete 50 AI conversations', icon: '🎯', points: 250, target: 50, source: 'chat' },
    { id: 'chat_100', name: 'AI Enthusiast', description: 'Complete 100 AI conversations', icon: '🧠', points: 500, target: 100, source: 'chat' },
    { id: 'chat_500', name: 'Power User', description: 'Complete 500 AI conversations', icon: '⚡', points: 1000, target: 500, source: 'chat' },
    { id: 'chat_1000', name: 'AI Master', description: 'Complete 1000 AI conversations', icon: '👑', points: 2500, target: 1000, source: 'chat' },
    { id: 'first_subscription', name: 'First Subscription', description: 'Subscribe to your first agent', icon: '⭐', points: 200, target: 1, source: 'subscription' },
    { id: 'multi_subscriber', name: 'Multi-Subscriber', description: 'Subscribe to 3 agents', icon: '📚', points: 500, target: 3, source: 'subscription' },
    { id: 'first_referral', name: 'First Referral', description: 'Refer your first friend', icon: '🤝', points: 300, target: 1, source: 'referral' },
    { id: 'referral_5', name: 'Influencer', description: 'Refer 5 friends', icon: '📣', points: 1000, target: 5, source: 'referral' },
    { id: 'tool_master', name: 'Tool Master', description: 'Use 10 different tools', icon: '🔧', points: 200, target: 10, source: 'tool' },
    { id: 'lab_scientist', name: 'Lab Scientist', description: 'Run 10 experiments', icon: '🔬', points: 200, target: 10, source: 'lab' },
    { id: 'explorer', name: 'Explorer', description: 'Try 5 different agents', icon: '🧭', points: 150, target: 5, source: 'agent_diversity' },
    { id: 'early_adopter', name: 'Early Adopter', description: 'Join Sanbay Fusion before 2027', icon: '🚀', points: 200, target: 1, source: 'special' },
];

export const REWARDS_CATALOG = [
    { id: 'discount_10', name: '10% Off Next Month', description: 'Get 10% discount on your next subscription payment', category: 'discount', cost: 500, value: '10%', type: 'percentage', availability: 'unlimited', featured: true, popular: true },
    { id: 'discount_25', name: '25% Off Next Month', description: 'Get 25% discount on your next subscription payment', category: 'discount', cost: 1000, value: '25%', type: 'percentage', availability: 'unlimited', featured: false, popular: true },
    { id: 'extra_tokens_1000', name: '1,000 Bonus Tokens', description: 'Add 1,000 extra tokens to your account', category: 'feature', cost: 300, value: '1000 tokens', type: 'service', availability: 'unlimited', featured: true, popular: true },
    { id: 'extra_tokens_5000', name: '5,000 Bonus Tokens', description: 'Add 5,000 extra tokens to your account', category: 'feature', cost: 1200, value: '5000 tokens', type: 'service', availability: 'unlimited', featured: false, popular: false },
    { id: 'priority_support', name: 'Priority Support (1 Month)', description: 'Get priority response for support tickets for 1 month', category: 'feature', cost: 800, value: '1 month', type: 'service', availability: 'unlimited', featured: false, popular: false },
    { id: 'early_access', name: 'Early Access Pass', description: 'Get early access to new features for 3 months', category: 'exclusive', cost: 1500, value: '3 months', type: 'service', availability: 'limited', featured: true, popular: false, requirements: { minLevel: 3 } },
    { id: 'custom_agent', name: 'Custom Agent Training', description: 'Get a personalized AI agent trained on your preferences', category: 'exclusive', cost: 5000, value: 'Lifetime', type: 'service', availability: 'limited', featured: true, popular: false, requirements: { minLevel: 4 } },
    { id: 'free_month', name: 'Free Month Subscription', description: 'Get one month free on any agent subscription', category: 'discount', cost: 2500, value: '1 month free', type: 'service', availability: 'unlimited', featured: false, popular: true, requirements: { minLevel: 2 } },
];

// ═══════════════════════════════════════════
// HELPER: Session Auth
// ═══════════════════════════════════════════

export async function getSessionUser(sessionId: string) {
    if (!sessionId) return null;
    return prisma.user.findFirst({
        where: {
            sessionId,
            sessionExpiry: { gt: new Date() },
        },
    });
}

// ═══════════════════════════════════════════
// CORE: Award Points
// ═══════════════════════════════════════════

export async function awardPoints(
    userId: string,
    amount: number,
    source: string,
    description: string,
    sourceId?: string,
    metadata?: Record<string, unknown>
) {
    // Use a transaction to keep balance in sync
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: { id: userId },
            data: {
                pointsBalance: { increment: amount },
                totalPointsEarned: { increment: amount },
            },
        });

        const transaction = await tx.pointsTransaction.create({
            data: {
                userId,
                type: 'earned',
                amount,
                balance: user.pointsBalance,
                source,
                sourceId: sourceId || null,
                description,
                metadata: metadata || {},
            },
        });

        return { user, transaction };
    });

    return result;
}

// ═══════════════════════════════════════════
// CORE: Spend Points
// ═══════════════════════════════════════════

export async function spendPoints(
    userId: string,
    amount: number,
    source: string,
    description: string,
    sourceId?: string
) {
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.pointsBalance < amount) {
            throw new Error('Insufficient points');
        }

        const updated = await tx.user.update({
            where: { id: userId },
            data: { pointsBalance: { decrement: amount } },
        });

        const transaction = await tx.pointsTransaction.create({
            data: {
                userId,
                type: 'spent',
                amount: -amount,
                balance: updated.pointsBalance,
                source,
                sourceId: sourceId || null,
                description,
            },
        });

        return { user: updated, transaction };
    });

    return result;
}

// ═══════════════════════════════════════════
// CORE: Get User Level
// ═══════════════════════════════════════════

export function getUserLevel(totalPoints: number) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_THRESHOLDS[i].minPoints) {
            const current = LEVEL_THRESHOLDS[i];
            const next = LEVEL_THRESHOLDS[i + 1] || null;
            const pointsInLevel = totalPoints - current.minPoints;
            const pointsNeeded = next ? next.minPoints - current.minPoints : 0;
            return {
                level: current.level,
                name: current.name,
                minPoints: current.minPoints,
                maxPoints: current.maxPoints,
                nextLevel: next,
                progress: next ? Math.round((pointsInLevel / pointsNeeded) * 100) : 100,
                pointsToNext: next ? next.minPoints - totalPoints : 0,
            };
        }
    }
    return { level: 1, name: 'Bronze', minPoints: 0, maxPoints: 999, nextLevel: LEVEL_THRESHOLDS[1], progress: 0, pointsToNext: 1000 };
}

// ═══════════════════════════════════════════
// CORE: Check & Award Badges
// ═══════════════════════════════════════════

export async function checkAndAwardBadges(userId: string) {
    const [chatCount, subCount, referralCount, toolCount, labCount, uniqueAgents, user, existingBadges] = await Promise.all([
        prisma.chatAnalyticsInteraction.count({ where: { userId } }),
        prisma.agentSubscription.count({ where: { userId, status: 'active' } }),
        prisma.referral.count({ where: { referrerId: userId, status: 'completed' } }).catch(() => 0),
        prisma.toolUsage.count({ where: { userId } }).catch(() => 0),
        prisma.labExperiment.count({ where: { userId } }).catch(() => 0),
        prisma.chatAnalyticsInteraction.groupBy({ by: ['agentId'], where: { userId, agentId: { not: null } } }).catch(() => []),
        prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
        prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    ]);

    const earned = new Set(existingBadges.map(b => b.badgeId));
    const newBadges: typeof BADGE_DEFINITIONS[number][] = [];

    const checks: Record<string, boolean> = {
        signup: true,
        chat_1: chatCount >= 1,
        chat_10: chatCount >= 10,
        chat_50: chatCount >= 50,
        chat_100: chatCount >= 100,
        chat_500: chatCount >= 500,
        chat_1000: chatCount >= 1000,
        subscription_1: subCount >= 1,
        subscription_3: subCount >= 3,
        subscription_5: subCount >= 5,
        referral_1: referralCount >= 1,
        referral_5: referralCount >= 5,
        tools_10: toolCount >= 10,
        lab_10: labCount >= 10,
        agents_5: uniqueAgents.length >= 5,
        early_adopter: user?.createdAt ? new Date(user.createdAt).getFullYear() < 2027 : false,
        streak_7: false, // Calculated separately if needed
        streak_30: false,
    };

    for (const badge of BADGE_DEFINITIONS) {
        if (!earned.has(badge.id) && checks[badge.condition]) {
            newBadges.push(badge);
        }
    }

    // Batch create new badges
    if (newBadges.length > 0) {
        await prisma.userBadge.createMany({
            data: newBadges.map(b => ({
                userId,
                badgeId: b.id,
                name: b.name,
                description: b.description,
                icon: b.icon,
                rarity: b.rarity,
            })),
            skipDuplicates: true,
        });
    }

    return newBadges;
}

// ═══════════════════════════════════════════
// CORE: Check & Update Achievements
// ═══════════════════════════════════════════

export async function checkAndUpdateAchievements(userId: string) {
    const [chatCount, subCount, referralCount, toolCount, labCount, uniqueAgents, user] = await Promise.all([
        prisma.chatAnalyticsInteraction.count({ where: { userId } }),
        prisma.agentSubscription.count({ where: { userId, status: 'active' } }),
        prisma.referral.count({ where: { referrerId: userId, status: 'completed' } }).catch(() => 0),
        prisma.toolUsage.count({ where: { userId } }).catch(() => 0),
        prisma.labExperiment.count({ where: { userId } }).catch(() => 0),
        prisma.chatAnalyticsInteraction.groupBy({ by: ['agentId'], where: { userId, agentId: { not: null } } }).catch(() => []),
        prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);

    const progressMap: Record<string, number> = {
        chat: chatCount,
        subscription: subCount,
        referral: referralCount,
        tool: toolCount,
        lab: labCount,
        agent_diversity: uniqueAgents.length,
        special: user?.createdAt && new Date(user.createdAt).getFullYear() < 2027 ? 1 : 0,
    };

    const newlyCompleted: string[] = [];

    for (const ach of ACHIEVEMENT_DEFINITIONS) {
        const current = progressMap[ach.source] || 0;
        const completed = current >= ach.target;

        await prisma.userAchievement.upsert({
            where: { userId_achievementId: { userId, achievementId: ach.id } },
            create: {
                userId,
                achievementId: ach.id,
                name: ach.name,
                description: ach.description,
                icon: ach.icon,
                points: ach.points,
                progress: Math.min(current, ach.target),
                target: ach.target,
                completed,
                completedAt: completed ? new Date() : null,
            },
            update: {
                progress: Math.min(current, ach.target),
                completed,
                completedAt: completed ? new Date() : undefined,
            },
        });

        if (completed) {
            // Check if we need to award points for newly completed
            const existing = await prisma.userAchievement.findUnique({
                where: { userId_achievementId: { userId, achievementId: ach.id } },
            });
            if (existing && existing.completed) {
                // Check if points were already awarded
                const alreadyAwarded = await prisma.pointsTransaction.findFirst({
                    where: { userId, source: 'achievement', sourceId: ach.id },
                });
                if (!alreadyAwarded) {
                    await awardPoints(userId, ach.points, 'achievement', `Achievement: ${ach.name}`, ach.id);
                    newlyCompleted.push(ach.id);
                }
            }
        }
    }

    return newlyCompleted;
}

// ═══════════════════════════════════════════
// CORE: Generate Referral Code
// ═══════════════════════════════════════════

export async function getOrCreateReferralCode(userId: string) {
    let ref = await prisma.referralCode.findUnique({ where: { userId } });
    if (ref) return ref;

    // Generate unique code: MAULA-XXXX format
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
        code = 'MAULA-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const exists = await prisma.referralCode.findUnique({ where: { code } });
        if (!exists) break;
        attempts++;
    } while (attempts < 10);

    ref = await prisma.referralCode.create({
        data: { userId, code },
    });

    return ref;
}

// ═══════════════════════════════════════════
// CORE: Process Referral Signup
// ═══════════════════════════════════════════

export async function processReferralSignup(newUserId: string, referralCode: string) {
    const ref = await prisma.referralCode.findUnique({ where: { code: referralCode } });
    if (!ref || !ref.isActive) return null;

    // Don't allow self-referral
    if (ref.userId === newUserId) return null;

    // Check if this user was already referred
    const existing = await prisma.referral.findUnique({ where: { referredUserId: newUserId } });
    if (existing) return null;

    const result = await prisma.$transaction(async (tx) => {
        // Create referral record
        const referral = await tx.referral.create({
            data: {
                referralCodeId: ref.id,
                referrerId: ref.userId,
                referredUserId: newUserId,
                pointsAwarded: POINTS_CONFIG.referral_success,
                status: 'completed',
                completedAt: new Date(),
            },
        });

        // Update referral code stats
        await tx.referralCode.update({
            where: { id: ref.id },
            data: {
                totalReferrals: { increment: 1 },
                totalPointsEarned: { increment: POINTS_CONFIG.referral_success },
            },
        });

        // Store which referral code the new user used
        await tx.user.update({
            where: { id: newUserId },
            data: { referralCodeUsed: referralCode },
        });

        return referral;
    });

    // Award points to referrer
    await awardPoints(
        ref.userId,
        POINTS_CONFIG.referral_success,
        'referral',
        `Referral bonus: A friend joined using your code!`,
        result.id
    );

    // Award bonus to new user
    await awardPoints(
        newUserId,
        POINTS_CONFIG.referral_signup_bonus,
        'referral',
        `Welcome bonus: Signed up with referral code!`,
        result.id
    );

    return result;
}

// ═══════════════════════════════════════════
// CORE: Award Subscription Points
// ═══════════════════════════════════════════

export async function awardSubscriptionPoints(userId: string, plan: string, agentId: string) {
    const planKey = `subscription_${plan}` as keyof typeof POINTS_CONFIG;
    const points = POINTS_CONFIG[planKey] || POINTS_CONFIG.subscription_daily;

    await awardPoints(
        userId,
        points,
        'subscription',
        `Agent subscription (${plan} plan)`,
        agentId,
        { plan, agentId }
    );

    // Check multi-agent bonus
    const activeSubCount = await prisma.agentSubscription.count({
        where: { userId, status: 'active' },
    });

    const bonuses = [
        { count: 2, key: 'multi_agent_2' as const, label: '2 active subscriptions' },
        { count: 3, key: 'multi_agent_3' as const, label: '3 active subscriptions' },
        { count: 5, key: 'multi_agent_5' as const, label: '5 active subscriptions' },
    ];

    for (const bonus of bonuses) {
        if (activeSubCount >= bonus.count) {
            const alreadyAwarded = await prisma.pointsTransaction.findFirst({
                where: { userId, source: 'subscription_bonus', description: { contains: bonus.label } },
            });
            if (!alreadyAwarded) {
                await awardPoints(userId, POINTS_CONFIG[bonus.key], 'subscription_bonus', `Multi-agent bonus: ${bonus.label}`);
            }
        }
    }

    // Check & award badges + achievements
    await checkAndAwardBadges(userId);
    await checkAndUpdateAchievements(userId);
}

// ═══════════════════════════════════════════
// FULL STATS: Get complete rewards data for a user
// ═══════════════════════════════════════════

export async function getFullRewardsData(userId: string) {
    const [user, badges, achievements, recentTransactions, referralCode, totalRedeemed] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { pointsBalance: true, totalPointsEarned: true, createdAt: true },
        }),
        prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } }),
        prisma.userAchievement.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
        prisma.pointsTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.referralCode.findUnique({ where: { userId }, include: { referrals: true } }),
        prisma.pointsTransaction.aggregate({ where: { userId, type: 'spent' }, _sum: { amount: true } }),
    ]);

    if (!user) return null;

    const level = getUserLevel(user.totalPointsEarned);

    return {
        totalPoints: user.totalPointsEarned,
        availablePoints: user.pointsBalance,
        currentLevel: level.level,
        levelName: level.name,
        levelProgress: level.progress,
        pointsToNextLevel: level.pointsToNext,
        pointsThisLevel: user.totalPointsEarned - level.minPoints,
        badges: badges.map(b => ({
            id: b.badgeId,
            name: b.name,
            description: b.description,
            icon: b.icon,
            rarity: b.rarity,
            earnedAt: b.earnedAt.toISOString(),
        })),
        achievements: achievements.map(a => ({
            id: a.achievementId,
            name: a.name,
            description: a.description,
            icon: a.icon,
            points: a.points,
            progress: { current: a.progress, target: a.target, percentage: a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0 },
            completed: a.completed,
            completedAt: a.completedAt?.toISOString() || null,
        })),
        rewardHistory: recentTransactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            balance: t.balance,
            description: t.description,
            source: t.source,
            timestamp: t.createdAt.toISOString(),
        })),
        referral: referralCode ? {
            code: referralCode.code,
            totalReferrals: referralCode.totalReferrals,
            totalPointsEarned: referralCode.totalPointsEarned,
            isActive: referralCode.isActive,
        } : null,
        statistics: {
            totalEarned: user.totalPointsEarned,
            totalRedeemed: Math.abs(totalRedeemed._sum.amount || 0),
            totalTransactions: recentTransactions.length,
            joinedDate: user.createdAt.toISOString(),
        },
    };
}
