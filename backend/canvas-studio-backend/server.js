/**
 * Canvas Studio — Standalone Express Server
 * Fully independent backend for Canvas Studio
 *
 * Port: 3300 (configurable via PORT env)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';
import canvasPreviewRouter from './routes/canvas-preview-routes.js';

const app = express();
const PORT = process.env.PORT || 3300;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://studio.sanbayfusion.com'],
    credentials: true,
}));
app.use(cookieParser());
// Stripe webhook needs raw body for signature verification — must come BEFORE express.json()
app.use('/api/canvas/studio-webhook', express.raw({ type: 'application/json' }));
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

// Public preview routes — no auth required (served via appview.sanbayfusion.com)
app.use('/p', canvasPreviewRouter);

// Mount all canvas API routes under /api
app.use('/api', apiRouter);

// Root health check
app.get('/', (_req, res) => {
    res.json({
        name: 'Canvas Studio Backend',
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
            console.log(`\n🚀 Canvas Studio Backend running on port ${PORT}`);
            console.log(`   Health: https://studio.sanbayfusion.com/api/health (port ${PORT})`);
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
