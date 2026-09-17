import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__securityPrisma ?? new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__securityPrisma = prisma;
}

export function getPrisma() { return prisma; }
