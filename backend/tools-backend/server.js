/**
 * TOOLS BACKEND — Standalone Express Server
 * Port: 3700
 * Note: Most tools are self-contained Next.js API routes.
 * This backend provides health checks + usage tracking.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';

const app = express();
const PORT = process.env.PORT || 3700;

// ── Middleware ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: [
    'https://sanbayfusion.com',
    'https://www.sanbayfusion.com',
    'http://localhost:3000',
    'http://localhost:3005',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Routes ────────────────────────────────────────────
app.use('/api', apiRouter);

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'tools-backend',
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🔧 Tools Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start tools-backend:', err);
    process.exit(1);
  });

export default app;
