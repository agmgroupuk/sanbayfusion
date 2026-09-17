/**
 * DATABASE SERVICE - PRISMA/POSTGRESQL
 * PostgreSQL database operations via Prisma ORM
 * All database operations go through this service
 */

import { prisma, handlePrismaError, queryOptimizer, withTransaction } from './prisma.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ── Auth DB connection ─────────────────────────────────
// Sessions live in the main "maulaai" database, not the canvas_app database.
// We need a separate connection to look up session cookies.
const MAIN_DB_URL = process.env.MAIN_DATABASE_URL
    || process.env.DATABASE_URL?.replace(/\/canvas_app$/, '/maulaai');

const authPrisma = new PrismaClient({
    datasources: { db: { url: MAIN_DB_URL } },
    log: [],
});

// ============================================
// USER OPERATIONS
// ============================================

export const UserService = {
    // Find user by ID
    findById: async (id) => {
        return prisma.user.findUnique({
            where: { id },
        });
    },

    // Find user by email
    findByEmail: async (email) => {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    },

    // Find user by session ID (queries the main maulaai database)
    findBySessionId: async (sessionId) => {
        try {
            const users = await authPrisma.$queryRawUnsafe(
                'SELECT id, email, name, role, "sessionExpiry" FROM "User" WHERE "sessionId" = $1 LIMIT 1',
                sessionId
            );
            return users[0] || null;
        } catch (err) {
            console.error('[Auth DB] Session lookup error:', err.message);
            return null;
        }
    },

    // Create new user
    create: async (data) => {
        const hashedPassword = data.password
            ? await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'))
            : null;

        return prisma.user.create({
            data: {
                ...data,
                email: data.email.toLowerCase(),
                password: hashedPassword,
            },
        });
    },

    // Update user
    update: async (id, data) => {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        }
        return prisma.user.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    },

    // Update by email
    updateByEmail: async (email, data) => {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        }
        return prisma.user.update({
            where: { email: email.toLowerCase() },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    },

    // Compare password
    comparePassword: async (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword);
    },

    // Delete user
    delete: async (id) => {
        return prisma.user.delete({
            where: { id },
        });
    },

    // Find with pagination
    findMany: async ({ page = 1, limit = 20, where = {}, orderBy = { createdAt: 'desc' } }) => {
        return queryOptimizer.withPagination('user', { page, limit, where, orderBy });
    },

    // Count users
    count: async (where = {}) => {
        return prisma.user.count({ where });
    },

    // Update last login
    updateLastLogin: async (id) => {
        return prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    },

    // Generate reset token
    generateResetToken: async (email) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });

        return token;
    },

    // Verify reset token
    findByResetToken: async (token) => {
        return prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });
    },
};

// ============================================
// AGENT OPERATIONS
// ============================================

export const AgentService = {
    findById: async (id) => {
        return prisma.agent.findUnique({
            where: { id },
        });
    },

    findByAgentId: async (agentId) => {
        return prisma.agent.findUnique({
            where: { agentId },
        });
    },

    findAll: async ({ status = 'active' } = {}) => {
        return prisma.agent.findMany({
            where: status ? { status } : {},
            orderBy: { name: 'asc' },
        });
    },

    create: async (data) => {
        return prisma.agent.create({ data });
    },

    update: async (agentId, data) => {
        return prisma.agent.update({
            where: { agentId },
            data: { ...data, updatedAt: new Date() },
        });
    },

    delete: async (agentId) => {
        return prisma.agent.delete({
            where: { agentId },
        });
    },

    incrementStats: async (agentId, field) => {
        return prisma.agent.update({
            where: { agentId },
            data: {
                [field]: { increment: 1 },
            },
        });
    },
};

// ============================================
// AGENT SUBSCRIPTION OPERATIONS
// ============================================

export const AgentSubscriptionService = {
    findById: async (id) => {
        return prisma.agentSubscription.findUnique({
            where: { id },
            include: { user: true, agent: true },
        });
    },

    findByUser: async (userId) => {
        return prisma.agentSubscription.findMany({
            where: { userId },
            include: { agent: true },
            orderBy: { createdAt: 'desc' },
        });
    },

    findActiveByUserAndAgent: async (userId, agentId) => {
        return prisma.agentSubscription.findFirst({
            where: {
                userId,
                agentId,
                status: 'active',
                expiryDate: { gt: new Date() },
            },
            include: { agent: true },
        });
    },

    findByStripeSubscriptionId: async (stripeSubscriptionId) => {
        return prisma.agentSubscription.findFirst({
            where: { stripeSubscriptionId },
            include: { user: true, agent: true },
        });
    },

    create: async (data) => {
        return prisma.agentSubscription.create({
            data,
            include: { user: true, agent: true },
        });
    },

    update: async (id, data) => {
        return prisma.agentSubscription.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
            include: { user: true, agent: true },
        });
    },

    cancel: async (id) => {
        return prisma.agentSubscription.update({
            where: { id },
            data: {
                status: 'cancelled',
                autoRenew: false,
                updatedAt: new Date(),
            },
        });
    },

    expireOld: async () => {
        return prisma.agentSubscription.updateMany({
            where: {
                status: 'active',
                expiryDate: { lt: new Date() },
            },
            data: { status: 'expired' },
        });
    },

    findExpiring: async (withinDays = 3) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + withinDays);

        return prisma.agentSubscription.findMany({
            where: {
                status: 'active',
                expiryDate: {
                    gt: new Date(),
                    lt: futureDate,
                },
            },
            include: { user: true, agent: true },
        });
    },
};

// ============================================
// AGENT MEMORY OPERATIONS
// ============================================

export const AgentMemoryService = {
    findByAgentAndUser: async (agentId, userId) => {
        return prisma.agentMemory.findUnique({
            where: {
                agentId_userId: { agentId, userId },
            },
        });
    },

    upsert: async (agentId, userId, memoryEntry) => {
        const existing = await prisma.agentMemory.findUnique({
            where: { agentId_userId: { agentId, userId } },
        });

        const memories = existing?.memories || [];
        memories.push({
            ...memoryEntry,
            timestamp: new Date().toISOString(),
        });

        return prisma.agentMemory.upsert({
            where: { agentId_userId: { agentId, userId } },
            update: {
                memories,
                totalMemories: memories.length,
                lastAccessed: new Date(),
                updatedAt: new Date(),
            },
            create: {
                agentId,
                userId,
                memories,
                totalMemories: 1,
                lastAccessed: new Date(),
            },
        });
    },

    updateSummary: async (agentId, userId, summary) => {
        return prisma.agentMemory.update({
            where: { agentId_userId: { agentId, userId } },
            data: {
                summary,
                updatedAt: new Date(),
            },
        });
    },

    clear: async (agentId, userId) => {
        return prisma.agentMemory.delete({
            where: { agentId_userId: { agentId, userId } },
        });
    },
};

// ============================================
// EXPORT ALL SERVICES (Canvas App Only)
// ============================================

// Export the main‑DB Prisma client for auth/session lookups only.
// NOT for subscription checks — each app enforces its own subscriptions independently.
export { authPrisma };

export default {
    User: UserService,
    Agent: AgentService,
    AgentSubscription: AgentSubscriptionService,
    AgentMemory: AgentMemoryService,
    // Raw prisma access for complex queries
    prisma,
    withTransaction,
    handlePrismaError,
};
