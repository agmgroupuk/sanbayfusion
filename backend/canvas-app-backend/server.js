/**
 * Canvas App — Standalone Express Server
 * Fully independent backend for the Canvas App (GenCraft Pro)
 *
 * Port: 3100 (configurable via PORT env)
 */

import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';
import previewRouter from './routes/canvas-preview-routes.js';
import { getSessionWss } from './services/canvas/run-preview-service.js';

const app = express();
const PORT = process.env.PORT || 3100;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Vite frontend handles CSP
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://canvas.sanbayfusion.com'],
    credentials: true,
}));
app.use(cookieParser());
// Stripe webhook needs raw body for signature verification — must come BEFORE express.json()
app.use('/api/canvas/studio-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Public preview routes — no auth required
// Served at /p/app-{language}-{id}, used by preview.sanbayfusion.com via nginx rewrite
app.use('/p', previewRouter);

// Mount all canvas API routes under /api
app.use('/api', apiRouter);

// Serve uploaded chat files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root health check
app.get('/', (_req, res) => {
    res.json({
        name: 'Canvas App Backend',
        status: 'running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// ERROR HANDLERS
// ============================================

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err.stack || err.message || err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
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

        const server = createServer(app);

        // WebSocket upgrade handler — routes /__livereload__ to the per-session WSS
        server.on('upgrade', (req, socket, head) => {
            const match = req.url?.match(/\/api\/canvas\/preview\/([^/]+)\/__livereload__/);
            if (!match) { socket.destroy(); return; }
            const wss = getSessionWss(match[1]);
            if (!wss) { socket.destroy(); return; }
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        });

        server.listen(PORT, () => {
            console.log(`\n🚀 Canvas App Backend running on port ${PORT}`);
            console.log(`   Health: https://canvas.sanbayfusion.com/api/health (port ${PORT})`);
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

// Catch unhandled rejections and exceptions
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    // Give time for logs to flush, then exit
    setTimeout(() => process.exit(1), 1000);
});

start();
