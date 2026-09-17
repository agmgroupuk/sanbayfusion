/**
 * AI Studio Demo — Standalone Express Server
 * Fully independent backend for the AI Studio Demo frontend
 *
 * Port: 3500 (configurable via PORT env)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';

const app = express();
const PORT = process.env.PORT || 3500;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`${req.method} ${req.path}`);
    }
    next();
});

// ============================================
// ROUTES
// ============================================

// Mount all universal chat API routes under /api
app.use('/api', apiRouter);

// Root health check
app.get('/', (_req, res) => {
    res.json({
        name: 'AI Studio Demo Backend',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// START SERVER
// ============================================

async function start() {
    try {
        // Connect to database
        await connectDatabase();
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`\n🚀 AI Studio Demo Backend running on port ${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/api/health`);
            console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});

start();
