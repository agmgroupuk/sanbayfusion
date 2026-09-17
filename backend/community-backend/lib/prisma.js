/**
 * DATABASE UTILITIES - PRISMA/POSTGRESQL
 * Community Backend — connection management
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
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

export const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', database: 'postgresql', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', database: 'postgresql', error: error.message, timestamp: new Date().toISOString() };
  }
};

export default { prisma, connectDatabase, disconnectDatabase, healthCheck };
