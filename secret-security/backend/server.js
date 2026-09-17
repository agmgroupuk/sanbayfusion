// ============================================================
// Maula Device Security — Secret Security Backend
// Port: 3450
//
// Architecture:
//  - Device installs app → registers (status: 'registered', trackingActive: false)
//  - Device does NOTHING until security team manually activates
//  - User reports lost → provides ID proof → security team reviews
//  - Security team clicks "Activate" → device starts tracking silently
//  - Location + photos collected silently (device shows NO notification)
//  - Security team generates report → user gets payment link
//  - User pays → downloads report (location history + photos)
// ============================================================

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import deviceRouter from './routes/device-routes.js';
import reportRouter from './routes/report-routes.js';
import adminRouter from './routes/admin-routes.js';
import paymentRouter from './routes/payment-routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3450;

// ── CORS ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',');

app.use(cors({
    origin(origin, cb) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        // Allow mobile app (Capacitor) — no origin header
        cb(null, true);
    },
    credentials: true,
}));

// ── Global middleware ──────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate limiting ──────────────────────────────────────────────────────
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many requests' } });
const pingLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // 2/sec per IP

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'maula-security', ts: new Date().toISOString() }));

// ── API routes ────────────────────────────────────────────────────────
app.use('/api/device', strictLimiter, deviceRouter);
app.use('/api/report', strictLimiter, reportRouter);
app.use('/api/payment', strictLimiter, paymentRouter);
app.use('/api/admin', adminRouter);       // admin has own auth middleware

// ── Serve admin SPA ───────────────────────────────────────────────────
const adminDist = join(__dirname, '../admin/dist');
if (existsSync(adminDist)) {
    app.use('/', express.static(adminDist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(join(adminDist, 'index.html')));
}

// ── 404 ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[security-backend] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`[maula-security] Running on port ${PORT}`);
});
