/**
 * DATABASE UTILITIES - PRISMA/POSTGRESQL
 * Connection management, query optimization, and utilities
 */

import { PrismaClient } from '@prisma/client';

// ============================================
// PRISMA CLIENT SINGLETON
// ============================================

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// ============================================
// CONNECTION MANAGEMENT
// ============================================

export const connectDatabase = async (retries = 5, delay = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await prisma.$connect();
            console.log('✅ PostgreSQL connected via Prisma');
            return true;
        } catch (error) {
            console.error(`❌ PostgreSQL connection attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt < retries) {
                const wait = delay * Math.pow(2, attempt - 1); // exponential backoff
                console.log(`⏳ Retrying in ${wait / 1000}s...`);
                await new Promise(r => setTimeout(r, wait));
            } else {
                console.error('❌ All database connection attempts failed');
                throw error;
            }
        }
    }
};

export const disconnectDatabase = async () => {
    try {
        await prisma.$disconnect();
        console.log('✅ PostgreSQL disconnected');
    } catch (error) {
        console.error('❌ Error disconnecting from PostgreSQL:', error);
    }
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthCheck = async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return {
            status: 'healthy',
            database: 'postgresql',
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            database: 'postgresql',
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
};

// ============================================
// QUERY HELPERS
// ============================================

export const queryOptimizer = {
    paginate: (page = 1, limit = 20) => ({
        skip: (page - 1) * limit,
        take: limit,
    }),

    withPagination: async (model, { page = 1, limit = 20, where = {}, orderBy = { createdAt: 'desc' }, include = {} }) => {
        const [items, total] = await Promise.all([
            prisma[model].findMany({
                where,
                orderBy,
                include,
                ...queryOptimizer.paginate(page, limit),
            }),
            prisma[model].count({ where }),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        };
    },

    softDelete: async (model, id) => {
        return prisma[model].update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    },
};

// ============================================
// TRANSACTION HELPERS
// ============================================

export const withTransaction = async (fn) => {
    return prisma.$transaction(fn);
};

// ============================================
// ERROR HANDLING
// ============================================

export const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            return { status: 409, message: 'A record with this value already exists', field: error.meta?.target?.[0] };
        case 'P2025':
            return { status: 404, message: 'Record not found' };
        case 'P2003':
            return { status: 400, message: 'Referenced record does not exist' };
        case 'P2014':
            return { status: 400, message: 'Invalid relation' };
        default:
            return { status: 500, message: 'Database error', error: error.message };
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const generateSessionId = () => {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateTransactionId = () => {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateVisitorId = () => {
    return `vis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// ============================================
// BACKWARDS COMPATIBILITY EXPORTS
// ============================================

export const connectionConfig = {
    options: {},
    monitorConnection: () => {
        console.log('✅ Using Prisma - connection monitoring handled automatically');
    },
};

export const indexManager = {
    ensureIndexes: async () => {
        console.log('✅ Using Prisma - indexes managed via schema.prisma');
    },
    getRecommendedIndexes: () => [],
};

export default {
    prisma,
    connectDatabase,
    disconnectDatabase,
    healthCheck,
    queryOptimizer,
    withTransaction,
    handlePrismaError,
    generateSessionId,
    generateTransactionId,
    generateVisitorId,
    connectionConfig,
    indexManager,
};
