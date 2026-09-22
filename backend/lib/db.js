/**
 * DATABASE SERVICE - PRISMA/POSTGRESQL
 * PostgreSQL database operations via Prisma ORM
 * All database operations go through this service
 */

import { prisma, handlePrismaError, queryOptimizer, withTransaction } from './prisma.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ============================================
// USER OPERATIONS
// ============================================

export const UserService = {
    findById: async (id) => {
        return prisma.user.findUnique({ where: { id } });
    },

    findByEmail: async (email) => {
        return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    },

    findBySessionId: async (sessionId) => {
        return prisma.user.findFirst({ where: { sessionId } });
    },

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

    update: async (id, data) => {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        }
        return prisma.user.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
        });
    },

    updateByEmail: async (email, data) => {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        }
        return prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { ...data, updatedAt: new Date() },
        });
    },

    comparePassword: async (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword);
    },

    delete: async (id) => {
        return prisma.user.delete({ where: { id } });
    },

    findMany: async ({ page = 1, limit = 20, where = {}, orderBy = { createdAt: 'desc' } }) => {
        return queryOptimizer.withPagination('user', { page, limit, where, orderBy });
    },

    count: async (where = {}) => {
        return prisma.user.count({ where });
    },

    updateLastLogin: async (id) => {
        return prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
    },

    generateResetToken: async (email) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { resetPasswordToken: token, resetPasswordExpires: expires },
        });
        return token;
    },

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
    findById: async (id) => prisma.agent.findUnique({ where: { id } }),
    findByAgentId: async (agentId) => prisma.agent.findUnique({ where: { agentId } }),
    findAll: async ({ status = 'active' } = {}) => prisma.agent.findMany({ where: status ? { status } : {}, orderBy: { name: 'asc' } }),
    create: async (data) => prisma.agent.create({ data }),
    update: async (agentId, data) => prisma.agent.update({ where: { agentId }, data: { ...data, updatedAt: new Date() } }),
    delete: async (agentId) => prisma.agent.delete({ where: { agentId } }),
    incrementStats: async (agentId, field) => prisma.agent.update({ where: { agentId }, data: { [field]: { increment: 1 } } }),
};

// ============================================
// AGENT SUBSCRIPTION OPERATIONS
// ============================================

export const AgentSubscriptionService = {
    findById: async (id) => prisma.agentSubscription.findUnique({ where: { id }, include: { user: true, agent: true } }),
    findByUser: async (userId) => prisma.agentSubscription.findMany({ where: { userId }, include: { agent: true }, orderBy: { createdAt: 'desc' } }),
    findActiveByUserAndAgent: async (userId, agentId) => prisma.agentSubscription.findFirst({
        where: { userId, agentId, status: 'active', expiryDate: { gt: new Date() } },
        include: { agent: true },
    }),
    create: async (data) => prisma.agentSubscription.create({ data, include: { user: true, agent: true } }),
    update: async (id, data) => prisma.agentSubscription.update({ where: { id }, data: { ...data, updatedAt: new Date() }, include: { user: true, agent: true } }),
    cancel: async (id) => prisma.agentSubscription.update({ where: { id }, data: { status: 'cancelled', autoRenew: false, updatedAt: new Date() } }),
    expireOld: async () => prisma.agentSubscription.updateMany({ where: { status: 'active', expiryDate: { lt: new Date() } }, data: { status: 'expired' } }),
    findExpiring: async (withinDays = 3) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + withinDays);
        return prisma.agentSubscription.findMany({
            where: { status: 'active', expiryDate: { gt: new Date(), lt: futureDate } },
            include: { user: true, agent: true },
        });
    },
};

// ============================================
// CHAT SESSION OPERATIONS
// ============================================

export const ChatSessionService = {
    findById: async (id) => prisma.chatSession.findUnique({ where: { id }, include: { messages: true, agent: true } }),
    findBySessionId: async (sessionId) => prisma.chatSession.findUnique({ where: { sessionId }, include: { messages: { orderBy: { createdAt: 'asc' } }, agent: true } }),
    findByUser: async (userId, { limit = 20, offset = 0, isActive = true } = {}) => prisma.chatSession.findMany({
        where: { userId, isActive },
        include: { agent: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
    }),
    create: async (data) => {
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        return prisma.chatSession.create({ data: { ...data, sessionId }, include: { agent: true } });
    },
    update: async (sessionId, data) => prisma.chatSession.update({ where: { sessionId }, data: { ...data, updatedAt: new Date() } }),
    addMessage: async (sessionId, message) => {
        const msg = await prisma.chatMessage.create({ data: { sessionId, ...message } });
        await prisma.chatSession.update({ where: { sessionId }, data: { updatedAt: new Date() } });
        return msg;
    },
    getMessages: async (sessionId, { limit = 100 } = {}) => prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, take: limit }),
    archive: async (sessionId) => prisma.chatSession.update({ where: { sessionId }, data: { isArchived: true, archivedAt: new Date(), updatedAt: new Date() } }),
    delete: async (sessionId) => {
        await prisma.chatMessage.deleteMany({ where: { sessionId } });
        return prisma.chatSession.delete({ where: { sessionId } });
    },
};

// ============================================
// CHAT SETTINGS OPERATIONS
// ============================================

export const ChatSettingsService = {
    findByUser: async (userId) => prisma.chatSettings.findUnique({ where: { userId } }),
    upsert: async (userId, data) => prisma.chatSettings.upsert({ where: { userId }, update: { ...data, updatedAt: new Date() }, create: { userId, ...data } }),
};

// ============================================
// TRANSACTION OPERATIONS
// ============================================

export const TransactionService = {
    findById: async (id) => prisma.transaction.findUnique({ where: { id }, include: { user: true } }),
    findByTransactionId: async (transactionId) => prisma.transaction.findUnique({ where: { transactionId }, include: { user: true } }),
    findByUser: async (userId, { page = 1, limit = 20 } = {}) => queryOptimizer.withPagination('transaction', { page, limit, where: { userId }, orderBy: { createdAt: 'desc' } }),
    create: async (data) => {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        return prisma.transaction.create({ data: { ...data, transactionId } });
    },
    update: async (id, data) => prisma.transaction.update({ where: { id }, data: { ...data, updatedAt: new Date() } }),
};

// ============================================
// ANALYTICS OPERATIONS
// ============================================

export const AnalyticsService = {
    trackVisitor: async (data) => {
        const visitorId = data.visitorId || `vis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        return prisma.visitor.upsert({
            where: { visitorId },
            update: { lastVisit: new Date(), visitCount: { increment: 1 } },
            create: { ...data, visitorId },
        });
    },
    trackPageView: async (data) => prisma.pageView.create({ data }),
    trackEvent: async (data) => prisma.analyticsEvent.create({ data }),
    trackSession: async (data) => {
        const sessionId = data.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        return prisma.session.upsert({
            where: { sessionId },
            update: { lastActivity: new Date(), pageViews: { increment: 1 } },
            create: { ...data, sessionId },
        });
    },
    getSummary: async (days = 30) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const [visitors, pageViews, sessions, events] = await Promise.all([
            prisma.visitor.count({ where: { createdAt: { gte: startDate } } }),
            prisma.pageView.count({ where: { timestamp: { gte: startDate } } }),
            prisma.session.count({ where: { createdAt: { gte: startDate } } }),
            prisma.analyticsEvent.count({ where: { timestamp: { gte: startDate } } }),
        ]);
        return { visitors, pageViews, sessions, events, period: `${days} days` };
    },
};

// ============================================
// COMMUNITY OPERATIONS
// ============================================

export const CommunityService = {
    getPosts: async ({ page = 1, limit = 20, category } = {}) => {
        const where = category ? { category } : {};
        return queryOptimizer.withPagination('communityPost', {
            page, limit, where,
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            include: { author: { select: { id: true, name: true, avatar: true } } },
        });
    },
    getPostById: async (id) => prisma.communityPost.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, name: true, avatar: true } },
            comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
        },
    }),
    createPost: async (data) => prisma.communityPost.create({ data, include: { author: { select: { id: true, name: true, avatar: true } } } }),
    addComment: async (postId, data) => {
        const comment = await prisma.communityComment.create({ data: { ...data, postId } });
        await prisma.communityPost.update({ where: { id: postId }, data: { repliesCount: { increment: 1 } } });
        return comment;
    },
    toggleLike: async (userId, postId = null, commentId = null) => {
        const where = postId
            ? { userId_postId: { userId, postId } }
            : { userId_commentId: { userId, commentId } };
        const existing = await prisma.communityLike.findUnique({ where });
        if (existing) {
            await prisma.communityLike.delete({ where });
            if (postId) await prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
            return { liked: false };
        }
        await prisma.communityLike.create({ data: { userId, postId, commentId } });
        if (postId) await prisma.communityPost.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
        return { liked: true };
    },
};

// ============================================
// SUPPORT TICKET OPERATIONS
// ============================================

export const SupportService = {
    findById: async (id) => prisma.supportTicket.findUnique({ where: { id }, include: { user: true } }),
    findByUser: async (userId) => prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    findAll: async ({ status, priority, page = 1, limit = 20 } = {}) => {
        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        return queryOptimizer.withPagination('supportTicket', {
            page, limit, where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
    },
    create: async (data) => {
        const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        return prisma.supportTicket.create({ data: { ...data, ticketId } });
    },
    update: async (id, data) => prisma.supportTicket.update({ where: { id }, data: { ...data, updatedAt: new Date() } }),
    addResponse: async (id, response) => {
        const ticket = await prisma.supportTicket.findUnique({ where: { id } });
        const responses = ticket.responses || [];
        responses.push({ ...response, timestamp: new Date().toISOString() });
        return prisma.supportTicket.update({
            where: { id },
            data: { responses, status: response.isAdmin ? 'in_progress' : ticket.status, updatedAt: new Date() },
        });
    },
};

// ============================================
// USER FAVORITES OPERATIONS
// ============================================

export const FavoritesService = {
    findByUser: async (userId) => prisma.userFavorites.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    add: async (userId, itemType, itemId, notes = null) => prisma.userFavorites.upsert({
        where: { userId_itemType_itemId: { userId, itemType, itemId } },
        update: { notes },
        create: { userId, itemType, itemId, notes },
    }),
    remove: async (userId, itemType, itemId) => prisma.userFavorites.delete({ where: { userId_itemType_itemId: { userId, itemType, itemId } } }),
    check: async (userId, itemType, itemId) => {
        const fav = await prisma.userFavorites.findUnique({ where: { userId_itemType_itemId: { userId, itemType, itemId } } });
        return !!fav;
    },
};

// ============================================
// AGENT MEMORY OPERATIONS
// ============================================

export const AgentMemoryService = {
    findByAgentAndUser: async (agentId, userId) => prisma.agentMemory.findUnique({ where: { agentId_userId: { agentId, userId } } }),
    upsert: async (agentId, userId, memoryEntry) => {
        const existing = await prisma.agentMemory.findUnique({ where: { agentId_userId: { agentId, userId } } });
        const memories = existing?.memories || [];
        memories.push({ ...memoryEntry, timestamp: new Date().toISOString() });
        return prisma.agentMemory.upsert({
            where: { agentId_userId: { agentId, userId } },
            update: { memories, totalMemories: memories.length, lastAccessed: new Date(), updatedAt: new Date() },
            create: { agentId, userId, memories, totalMemories: 1, lastAccessed: new Date() },
        });
    },
    updateSummary: async (agentId, userId, summary) => prisma.agentMemory.update({ where: { agentId_userId: { agentId, userId } }, data: { summary, updatedAt: new Date() } }),
    clear: async (agentId, userId) => prisma.agentMemory.delete({ where: { agentId_userId: { agentId, userId } } }),
};

// ============================================
// JOB APPLICATION OPERATIONS
// ============================================

export const CareerService = {
    findById: async (id) => prisma.jobApplication.findUnique({ where: { id } }),
    findAll: async ({ status, position, page = 1, limit = 20 } = {}) => {
        const where = {};
        if (status) where.status = status;
        if (position) where.position = position;
        return queryOptimizer.withPagination('jobApplication', { page, limit, where, orderBy: { createdAt: 'desc' } });
    },
    create: async (data) => prisma.jobApplication.create({ data }),
    update: async (id, data) => prisma.jobApplication.update({ where: { id }, data: { ...data, updatedAt: new Date() } }),
};

// ============================================
// WEBINAR OPERATIONS
// ============================================

export const WebinarService = {
    register: async (data) => prisma.webinarRegistration.upsert({
        where: { webinarId_email: { webinarId: data.webinarId, email: data.email } },
        update: data,
        create: data,
    }),
    findByWebinar: async (webinarId) => prisma.webinarRegistration.findMany({ where: { webinarId }, orderBy: { createdAt: 'desc' } }),
    markAttended: async (webinarId, email) => prisma.webinarRegistration.update({
        where: { webinarId_email: { webinarId, email } },
        data: { attended: true, joinedAt: new Date() },
    }),
};

// ============================================
// CANVAS OPERATIONS
// ============================================

export const CanvasService = {
    createFile: async (data) => prisma.chatCanvasFile.create({ data }),
    updateFile: async (id, data) => prisma.chatCanvasFile.update({ where: { id }, data: { ...data, version: { increment: 1 }, updatedAt: new Date() } }),
    getFilesBySession: async (sessionId) => prisma.chatCanvasFile.findMany({ where: { sessionId }, orderBy: { createdAt: 'desc' } }),
    createProject: async (data) => prisma.chatCanvasProject.create({ data }),
    getProjectsBySession: async (sessionId) => prisma.chatCanvasProject.findMany({ where: { sessionId }, orderBy: { createdAt: 'desc' } }),
    addHistory: async (sessionId, action, data) => prisma.chatCanvasHistory.create({ data: { sessionId, action, data } }),
};

// ============================================
// CONTACT MESSAGE OPERATIONS
// ============================================

export const ContactService = {
    create: async (data) => prisma.contactMessage.create({ data }),
    findAll: async ({ status, page = 1, limit = 20 } = {}) => {
        const where = status ? { status } : {};
        return queryOptimizer.withPagination('contactMessage', { page, limit, where, orderBy: { createdAt: 'desc' } });
    },
    update: async (id, data) => prisma.contactMessage.update({ where: { id }, data: { ...data, updatedAt: new Date() } }),
};

// ============================================
// EXPORT ALL SERVICES
// ============================================

export default {
    User: UserService,
    Agent: AgentService,
    AgentSubscription: AgentSubscriptionService,
    ChatSession: ChatSessionService,
    ChatSettings: ChatSettingsService,
    Transaction: TransactionService,
    Analytics: AnalyticsService,
    Community: CommunityService,
    Support: SupportService,
    Favorites: FavoritesService,
    AgentMemory: AgentMemoryService,
    Career: CareerService,
    Webinar: WebinarService,
    Canvas: CanvasService,
    Contact: ContactService,
    prisma,
    withTransaction,
    handlePrismaError,
};
