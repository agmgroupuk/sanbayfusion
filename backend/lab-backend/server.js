/**
 * LAB BACKEND — Standalone Express Server
 * Port: 3600
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';

const app = express();
const PORT = process.env.PORT || 3600;

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

// ── Middleware ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: [
    'https://maula.ai',
    'https://www.maula.ai',
    'http://localhost:3000',
    'http://localhost:3005',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Routes ────────────────────────────────────────────
app.use('/api', apiRouter);

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'lab-backend',
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🧪 Lab Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start lab-backend:', err);
    process.exit(1);
  });

export default app;
