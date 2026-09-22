/**
 * MAULA AI - PRODUCTION SERVER
 * PostgreSQL/Prisma Backend
 */

import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Prisma database connection
import { prisma, connectDatabase, disconnectDatabase } from './lib/prisma.js';

// Middleware and services
import {
  initializeTracking,
  trackVisitorMiddleware,
  trackPageViewMiddleware,
} from './lib/tracking-middleware.js';
import pushNotificationRouter from './routes/push-notification-routes.js';
import apiRouter from './routes/api-router.js';
import { rateLimiters, cache } from './lib/cache.js';
import { checkLockout, recordFailedAttempt, resetLockoutOnSuccess } from './lib/account-lockout.js';
import { startSubscriptionExpirationCron } from './services/subscription-cron.js';
import { sendWelcomeEmail, sendLoginAlertEmail, notifyAdminNewUser, sendVerificationCodeEmail, sendPasswordChangedAlert, sendLoginOTPEmail, sendNewsletterConfirmationEmail } from './services/email.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://sanbayfusion.com',
      'https://www.sanbayfusion.com',
    ],
    credentials: true,
  },
});
const PORT = process.env.PORT || 3005;

// Trust proxy for proper IP detection behind nginx/load balancer
app.set('trust proxy', 1);

// ── Helper: Extract real client IP and readable device from request ──
function getClientInfo(req) {
  // IP: prefer Cloudflare header, then x-real-ip, then x-forwarded-for first entry
  const rawIp = req.headers['cf-connecting-ip']
    || req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip
    || req.socket?.remoteAddress
    || 'Unknown';
  // Strip ::ffff: prefix from IPv4-mapped IPv6
  const ip = rawIp.replace(/^::ffff:/, '');

  // Parse user-agent into a readable device string
  const ua = req.headers['user-agent'] || '';
  let device = 'Unknown';
  if (ua) {
    // Detect browser
    let browser = '';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    // Detect OS
    let os = '';
    if (/Windows NT 10/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';

    if (browser && os) device = `${browser} on ${os}`;
    else if (browser) device = browser;
    else if (os) device = os;
    else if (/node/i.test(ua)) device = 'Server (API)';
    else device = ua.substring(0, 60);
  }

  return { ip, device, userAgent: ua };
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://sanbayfusion.com',
    'https://www.sanbayfusion.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Tracking middleware - must be after cookieParser
app.use(initializeTracking);
app.use(trackVisitorMiddleware);
app.use(trackPageViewMiddleware);

// ----------------------------
// Lightweight metrics tracker
// ----------------------------
const METRICS_WINDOW_SECONDS = 60;
const perSecondBuckets = new Map();

function recordMetric(statusCode, durationMs) {
  const sec = Math.floor(Date.now() / 1000);
  let bucket = perSecondBuckets.get(sec);
  if (!bucket) {
    bucket = { count: 0, errors: 0, durations: [] };
    perSecondBuckets.set(sec, bucket);
  }
  bucket.count += 1;
  if (statusCode >= 500) bucket.errors += 1;
  bucket.durations.push(durationMs);
  const cutoff = sec - METRICS_WINDOW_SECONDS;
  for (const k of perSecondBuckets.keys()) {
    if (k < cutoff) perSecondBuckets.delete(k);
  }
}

// ----------------------------
// Per-route metrics tracking
// ----------------------------
const routeBuckets = new Map(); // category -> Map<second, {count, errors, durations}>

function resolveRouteCategory(reqPath) {
  if (reqPath === '/health' || reqPath === '/api/health') return 'health';
  if (reqPath.startsWith('/api/status')) return 'status';
  if (reqPath.startsWith('/api/auth')) return 'auth';
  if (reqPath.startsWith('/api/studio/chat') || reqPath.startsWith('/api/chat')) return 'chat';
  if (reqPath.startsWith('/api/canvas')) return 'canvas';
  if (reqPath.startsWith('/api/tools/dns')) return 'tools:dns-lookup';
  if (reqPath.startsWith('/api/tools/ip') || reqPath.startsWith('/api/tools/geo')) return 'tools:ip-geolocation';
  if (reqPath.startsWith('/api/tools/ssl')) return 'tools:ssl-checker';
  if (reqPath.startsWith('/api/tools/whois')) return 'tools:whois-lookup';
  if (reqPath.startsWith('/api/tools/port')) return 'tools:port-scanner';
  if (reqPath.startsWith('/api/tools/speed')) return 'tools:speed-test';
  if (reqPath.startsWith('/api/tools/hash')) return 'tools:hash';
  if (reqPath.startsWith('/api/tts')) return 'tools:tts';
  if (reqPath.startsWith('/api/agents')) return 'agents';
  if (reqPath.startsWith('/api/doctor')) return 'tools:doctor-network';
  return 'other';
}

function recordRouteMetric(category, statusCode, durationMs) {
  if (!routeBuckets.has(category)) routeBuckets.set(category, new Map());
  const buckets = routeBuckets.get(category);
  const sec = Math.floor(Date.now() / 1000);
  let bucket = buckets.get(sec);
  if (!bucket) { bucket = { count: 0, errors: 0, durations: [] }; buckets.set(sec, bucket); }
  bucket.count += 1;
  if (statusCode >= 500) bucket.errors += 1;
  bucket.durations.push(durationMs);
  const cutoff = sec - METRICS_WINDOW_SECONDS;
  for (const k of buckets.keys()) { if (k < cutoff) buckets.delete(k); }
}

function calcRouteMetrics(category) {
  const buckets = routeBuckets.get(category);
  if (!buckets) return { rps: 0, totalLastMinute: 0, avgResponseMs: 0, errorRate: 0, errorCount: 0 };
  const nowSec = Math.floor(Date.now() / 1000);
  let total = 0, errors = 0, durations = [];
  for (const [sec, b] of buckets) {
    if (sec >= nowSec - METRICS_WINDOW_SECONDS) {
      total += b.count; errors += b.errors; durations = durations.concat(b.durations);
    }
  }
  const currentBucket = buckets.get(nowSec) || { count: 0 };
  return {
    rps: currentBucket.count,
    totalLastMinute: total,
    avgResponseMs: durations.length ? Math.round(durations.reduce((a, v) => a + v, 0) / durations.length) : 0,
    errorRate: total ? +((errors * 100) / total).toFixed(2) : 0,
    errorCount: errors,
  };
}

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    recordMetric(res.statusCode, durationMs);
    const category = resolveRouteCategory(req.path);
    recordRouteMetric(category, res.statusCode, durationMs);
  });
  next();
});

function calcMetricsSnapshot() {
  const nowSec = Math.floor(Date.now() / 1000);
  let total = 0;
  let errors = 0;
  let durations = [];
  for (const [sec, b] of perSecondBuckets) {
    if (sec >= nowSec - METRICS_WINDOW_SECONDS) {
      total += b.count;
      errors += b.errors;
      durations = durations.concat(b.durations);
    }
  }
  const currentBucket = perSecondBuckets.get(nowSec) || { count: 0 };
  const rps = currentBucket.count;
  const avgResponseMs = durations.length
    ? Math.round(durations.reduce((a, v) => a + v, 0) / durations.length)
    : 0;
  const errorRate = total ? +((errors * 100) / total).toFixed(2) : 0;
  return { rps, totalLastMinute: total, avgResponseMs, errorRate };
}

// Check PostgreSQL connection
async function checkPostgresFast() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, message: 'ok', latencyMs: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      message: String(e?.message || e),
      latencyMs: Date.now() - start,
    };
  }
}

// Helper functions

function buildCpuMem() {
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;
  const memPct = +((memUsed / memTotal) * 100).toFixed(1);
  const load = os.loadavg()[0] || 0;
  return { memPct, load1: +load.toFixed(2) };
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

app.get('/health', async (req, res) => {
  const hasAIService = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.COHERE_API_KEY
  );

  // Check Redis status
  let redisStatus = 'not_configured';
  let redisConnected = false;
  try {
    if (cache.client && cache.isConnected) {
      await cache.client.ping();
      redisStatus = 'connected';
      redisConnected = true;
    } else if (cache.memoryCache) {
      redisStatus = 'fallback_memory';
    }
  } catch {
    redisStatus = 'error';
  }

  // Check PostgreSQL status
  const dbCheck = await checkPostgresFast();
  const pgStatus = dbCheck.ok ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '2.0.0',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      cohere: !!process.env.COHERE_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      googleTranslate: !!process.env.GOOGLE_TRANSLATE_API_KEY,
    },
    infrastructure: {
      redis: redisStatus,
      redisConnected,
      postgresql: pgStatus,
      postgresLatencyMs: dbCheck.latencyMs,
    },
    hasAIService,
  });
});

// Compatibility alias
app.get('/api/health', async (req, res) => {
  const dbCheck = await checkPostgresFast();
  res.json({
    status: dbCheck.ok ? 'healthy' : 'degraded',
    database: 'postgresql',
    latencyMs: dbCheck.latencyMs,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// EMAIL TRACKING PIXEL ENDPOINT
// ============================================

// 1x1 transparent PNG pixel (68 bytes)
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

app.get('/api/email/track/:id.png', async (req, res) => {
  // Always serve the pixel immediately so email clients don't time out
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': TRACKING_PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(TRACKING_PIXEL);

  // Update the email log in the background (fire-and-forget)
  const trackingId = req.params.id;
  try {
    const existing = await prisma.emailLog.findUnique({ where: { id: trackingId } });
    if (existing) {
      await prisma.emailLog.update({
        where: { id: trackingId },
        data: {
          status: 'opened',
          openedAt: existing.openedAt || new Date(),
          openCount: { increment: 1 },
          userAgent: (req.headers['user-agent'] || '').slice(0, 500),
          ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim().replace(/^::ffff:/, ''),
        },
      });
    }
  } catch (e) {
    console.error('[EMAIL TRACK] Error updating email log:', e.message);
  }
});

// ============================================
// NEWSLETTER SUBSCRIPTION ENDPOINT
// ============================================

app.post('/api/email/newsletter-confirmation', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing active subscriber
    const existing = await prisma.$queryRaw`
      SELECT id, status FROM newsletter_subscribers WHERE email = ${normalizedEmail} LIMIT 1
    `;
    if (existing && existing.length > 0) {
      if (existing[0].status === 'active') {
        return res.status(409).json({ success: false, error: 'This email is already subscribed to our newsletter.' });
      }
      // Re-subscribing (was unsubscribed) — reactivate
      await prisma.$executeRaw`
        UPDATE newsletter_subscribers SET status = 'active', unsubscribed_at = NULL, subscribed_at = NOW() WHERE email = ${normalizedEmail}
      `;
    } else {
      // New subscriber
      await prisma.$executeRaw`
        INSERT INTO newsletter_subscribers (id, email, name, status) VALUES (gen_random_uuid()::text, ${normalizedEmail}, ${name || null}, 'active')
      `;
    }

    await sendNewsletterConfirmationEmail(normalizedEmail, name || 'there');
    res.json({ success: true, message: 'Newsletter confirmation sent' });
  } catch (error) {
    console.error('[NEWSLETTER] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to send confirmation email' });
  }
});

// ============================================
// SUBSCRIPTION CONFIRMATION EMAIL ENDPOINT
// Called by Stripe webhook after successful checkout
// ============================================


// ============================================
// PAYMENT RECEIPT EMAIL ENDPOINT
// Called by Stripe webhook after invoice.paid
// ============================================


// ============================================
// STATUS ENDPOINT - Enhanced with real-time monitoring
// ============================================

// Helper to check AI provider connectivity - uses real server metrics
// ----------------------------
// Real AI provider health checks (cached 60s)
// ----------------------------
const _aiProviderCache = { data: null, lastCheck: 0 };
const AI_HEALTH_CACHE_MS = 60000;

async function pingOpenAICompatible(name, baseURL, apiKey, model) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { name, model, configured: true, status: res.ok ? 'operational' : 'degraded', responseTime: latency, uptime: res.ok ? 100 : 0 };
  } catch {
    return { name, model, configured: true, status: 'down', responseTime: Date.now() - start, uptime: 0 };
  }
}

async function pingGemini(apiKey) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { name: 'Google Gemini', model: 'gemini-2.5-flash', configured: true, status: res.ok ? 'operational' : 'degraded', responseTime: latency, uptime: res.ok ? 100 : 0 };
  } catch {
    return { name: 'Google Gemini', model: 'gemini-2.5-flash', configured: true, status: 'down', responseTime: Date.now() - start, uptime: 0 };
  }
}

async function pingAnthropic(apiKey) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    // 200 = working, 429 = rate limited but alive, anything else = problem
    const alive = res.status === 200 || res.status === 429;
    return { name: 'Anthropic (Claude 3)', model: 'claude-3', configured: true, status: alive ? 'operational' : 'degraded', responseTime: latency, uptime: alive ? 100 : 0 };
  } catch {
    return { name: 'Anthropic (Claude 3)', model: 'claude-3', configured: true, status: 'down', responseTime: Date.now() - start, uptime: 0 };
  }
}

async function checkAIProviders() {
  const now = Date.now();
  if (_aiProviderCache.data && (now - _aiProviderCache.lastCheck) < AI_HEALTH_CACHE_MS) {
    return _aiProviderCache.data;
  }
  const checks = [];
  if (process.env.CEREBRAS_API_KEY) checks.push(pingOpenAICompatible('Cerebras (Llama 3.3-70B)', 'https://api.cerebras.ai/v1', process.env.CEREBRAS_API_KEY, 'llama-3.3-70b'));
  if (process.env.GROQ_API_KEY) checks.push(pingOpenAICompatible('Groq (Llama 3.3-70B)', 'https://api.groq.com/openai/v1', process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile'));
  if (process.env.OPENAI_API_KEY) checks.push(pingOpenAICompatible('OpenAI (GPT-4)', 'https://api.openai.com/v1', process.env.OPENAI_API_KEY, 'gpt-4'));
  if (process.env.XAI_API_KEY) checks.push(pingOpenAICompatible('xAI (Grok)', 'https://api.x.ai/v1', process.env.XAI_API_KEY, 'grok-3-fast'));
  if (process.env.MISTRAL_API_KEY) checks.push(pingOpenAICompatible('Mistral', 'https://api.mistral.ai/v1', process.env.MISTRAL_API_KEY, 'mistral-small-latest'));
  if (process.env.GEMINI_API_KEY) checks.push(pingGemini(process.env.GEMINI_API_KEY));
  if (process.env.ANTHROPIC_API_KEY) checks.push(pingAnthropic(process.env.ANTHROPIC_API_KEY));
  const results = await Promise.all(checks);
  _aiProviderCache.data = results;
  _aiProviderCache.lastCheck = now;
  return results;
}

// Helper to check Redis
async function checkRedis() {
  try {
    if (cache.client && cache.isConnected) {
      const start = Date.now();
      await cache.client.ping();
      return {
        status: 'operational',
        type: 'redis',
        responseTime: Date.now() - start,
        connected: true
      };
    } else if (cache.memoryCache) {
      return {
        status: 'operational',
        type: 'memory-fallback',
        responseTime: 1,
        connected: true
      };
    }
    return { status: 'degraded', type: 'none', responseTime: 0, connected: false };
  } catch (e) {
    return { status: 'outage', type: 'error', responseTime: 0, connected: false, error: e.message };
  }
}

// ----------------------------
// Historical metrics snapshots in Redis (stored every 5 min, kept 8 days)
// ----------------------------
const HISTORICAL_SNAPSHOT_INTERVAL = 5 * 60 * 1000;
const HISTORICAL_TTL_SECONDS = 8 * 24 * 3600;

async function storeMetricsSnapshot() {
  try {
    if (!cache.client || !cache.isConnected) return;
    const metrics = calcMetricsSnapshot();
    const hour = new Date().toISOString().slice(0, 13); // "2026-04-19T14"
    const key = `metrics:hourly:${hour}`;
    const existing = await cache.client.get(key);
    if (existing) {
      const prev = JSON.parse(existing);
      prev.samples += 1;
      prev.avgResponseMs = Math.round((prev.avgResponseMs * (prev.samples - 1) + metrics.avgResponseMs) / prev.samples);
      prev.errorRate = +((prev.errorRate * (prev.samples - 1) + metrics.errorRate) / prev.samples).toFixed(2);
      prev.totalRequests += metrics.totalLastMinute;
      await cache.client.set(key, JSON.stringify(prev), 'EX', HISTORICAL_TTL_SECONDS);
    } else {
      await cache.client.set(key, JSON.stringify({
        samples: 1, avgResponseMs: metrics.avgResponseMs, errorRate: metrics.errorRate, totalRequests: metrics.totalLastMinute,
      }), 'EX', HISTORICAL_TTL_SECONDS);
    }
  } catch (e) {
    // Non-critical — don't crash
  }
}

async function getHistoricalMetrics(days = 7) {
  const results = [];
  try {
    if (!cache.client || !cache.isConnected) return results;
    const now = new Date();
    for (let d = days - 1; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 24 * 3600 * 1000);
      const dateStr = day.toISOString().slice(0, 10);
      let dayAvgMs = 0, dayErrorRate = 0, dayRequests = 0, hourCount = 0;
      // Fetch all 24 hours for this day
      for (let h = 0; h < 24; h++) {
        const hourKey = `metrics:hourly:${dateStr}T${String(h).padStart(2, '0')}`;
        const val = await cache.client.get(hourKey);
        if (val) {
          const snap = JSON.parse(val);
          dayAvgMs += snap.avgResponseMs; dayErrorRate += snap.errorRate; dayRequests += snap.totalRequests; hourCount++;
        }
      }
      results.push({
        date: dateStr,
        avgResponseTime: hourCount > 0 ? Math.round(dayAvgMs / hourCount) : 0,
        errorRate: hourCount > 0 ? +(dayErrorRate / hourCount).toFixed(2) : 0,
        totalRequests: dayRequests,
        hoursWithData: hourCount,
      });
    }
  } catch (e) {
    // Non-critical
  }
  return results;
}

// Start snapshot interval
setInterval(storeMetricsSnapshot, HISTORICAL_SNAPSHOT_INTERVAL);
// Also store one immediately on startup after a short delay
setTimeout(storeMetricsSnapshot, 30000);

app.get('/api/status', async (req, res) => {
  console.log('STATUS ENDPOINT CALLED - ENHANCED VERSION');
  try {
    const metrics = calcMetricsSnapshot();
    const dbCheck = await checkPostgresFast();
    const redisCheck = await checkRedis();
    const aiProviders = await checkAIProviders();

    const apiStatus = metrics.errorRate < 1 && metrics.avgResponseMs < 800 ? 'operational' : 'degraded';
    const dbStatus = dbCheck.ok ? 'operational' : 'outage';
    const platformStatus = apiStatus === 'operational' && dbCheck.ok ? 'operational' : 'degraded';

    // Get real agent data from PostgreSQL
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });

    // Get subscription counts per agent
    const subscriptionCounts = await prisma.agentSubscription.groupBy({
      by: ['agentId'],
      where: { status: 'active' },
      _count: { id: true },
    });

    const subscriptionMap = new Map(
      subscriptionCounts.map(s => [s.agentId, s._count.id]),
    );

    const agentsData = agents.map(agent => {
      const agentRouteMetrics = calcRouteMetrics('agents');
      return {
        name: agent.name,
        slug: agent.agentId,
        status: agent.status === 'active' ? 'operational' : 'degraded',
        responseTime: agentRouteMetrics.avgResponseMs || metrics.avgResponseMs || 0,
        activeUsers: subscriptionMap.get(agent.agentId) || 0,
        totalUsers: agent.totalUsers || 0,
        totalSessions: agent.totalSessions || 0,
        averageRating: agent.averageRating || 0,
        aiProvider: agent.aiProvider ? agent.aiProvider.model : 'gpt-4' || 'gpt-4',
      };
    });

    // Get analytics summary
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [sessionsToday, pageViewsToday, activeUsers] = await Promise.all([
      prisma.session.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.pageView.count({ where: { timestamp: { gte: startOfDay } } }),
      prisma.session.count({
        where: {
          lastActivity: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          isActive: true,
        },
      }),
    ]);

    // Get system metrics with real data
    const cpuMem = buildCpuMem();
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const numCpus = os.cpus().length;

    // Calculate uptime from actual server uptime and error rate
    const serverUptime = process.uptime();
    const uptimeHours = Math.floor(serverUptime / 3600);
    const uptimeDays = Math.floor(uptimeHours / 24);
    const uptimePercent = metrics.errorRate > 0 ? Math.round((100 - metrics.errorRate) * 100) / 100 : 100;

    res.json({
      success: true,
      data: {
        system: {
          cpuPercent: Math.round(loadAvg[0] / numCpus * 100),
          memoryPercent: cpuMem.memPct,
          totalMem: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100, // GB
          freeMem: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100, // GB
          usedMem: Math.round(usedMem / (1024 * 1024 * 1024) * 100) / 100, // GB
          load1: loadAvg[0]?.toFixed(2) || 0,
          load5: loadAvg[1]?.toFixed(2) || 0,
          load15: loadAvg[2]?.toFixed(2) || 0,
          cores: numCpus,
          uptimeSeconds: serverUptime,
          uptimeFormatted: uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours % 24}h` : `${uptimeHours}h ${Math.floor((serverUptime % 3600) / 60)}m`,
        },
        platform: {
          status: platformStatus,
          uptime: uptimePercent,
          lastUpdated: new Date().toISOString(),
          version: process.env.APP_VERSION || '2.0.0',
          environment: process.env.NODE_ENV || 'production',
        },
        api: {
          status: apiStatus,
          responseTime: metrics.avgResponseMs,
          uptime: uptimePercent,
          requestsToday: sessionsToday + pageViewsToday,
          requestsPerMinute: metrics.rps,
          errorRate: metrics.errorRate,
          errorsToday: Math.round(metrics.errorRate * sessionsToday / 100),
          totalLastMinute: metrics.totalLastMinute,
        },
        database: {
          status: dbStatus,
          type: 'PostgreSQL',
          connectionPool: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
          responseTime: dbCheck.latencyMs,
          uptime: dbCheck.ok ? uptimePercent : 0,
        },
        cache: {
          status: redisCheck.status,
          type: redisCheck.type,
          responseTime: redisCheck.responseTime,
          connected: redisCheck.connected,
        },
        aiServices: aiProviders,
        agents: agentsData,
        tools: (() => {
          const toolMap = {
            'DNS Lookup': 'tools:dns-lookup',
            'IP Geolocation': 'tools:ip-geolocation',
            'SSL Checker': 'tools:ssl-checker',
            'WHOIS Lookup': 'tools:whois-lookup',
            'Port Scanner': 'tools:port-scanner',
            'Speed Test': 'tools:speed-test',
            'Hash Generator': 'tools:hash',
            'Text-to-Speech': 'tools:tts',
          };
          return Object.entries(toolMap).map(([name, cat]) => {
            const rm = calcRouteMetrics(cat);
            const toolStatus = rm.totalLastMinute > 0
              ? (rm.errorRate < 5 ? 'operational' : 'degraded')
              : apiStatus; // If no traffic, fall back to global status
            return { name, status: toolStatus, responseTime: rm.avgResponseMs || 0, requestsPerMinute: rm.rps, errorRate: rm.errorRate };
          });
        })(),
        analytics: {
          sessionsToday,
          pageViewsToday,
          activeUsers,
        },
        // Historical: combine Prisma day counts with Redis-stored per-hour metrics
        historical: await (async () => {
          const redisHistory = await getHistoricalMetrics(7);
          const historicalData = [];
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const dateStr = dayStart.toISOString().split('T')[0];

            const [sessionCount, pageViewCount] = await Promise.all([
              prisma.session.count({
                where: { createdAt: { gte: dayStart, lte: dayEnd } }
              }),
              prisma.pageView.count({
                where: { timestamp: { gte: dayStart, lte: dayEnd } }
              })
            ]);

            // Use Redis-stored metrics for response time, or 0 if no data
            const dayMetrics = redisHistory.find(h => h.date === dateStr);
            const dayUptime = dayMetrics && dayMetrics.hoursWithData > 0
              ? +(100 - dayMetrics.errorRate).toFixed(2)
              : (i === 0 ? uptimePercent : 0); // today = current snapshot, past = from Redis

            historicalData.push({
              date: dateStr,
              uptime: dayUptime,
              requests: sessionCount + pageViewCount,
              avgResponseTime: dayMetrics ? dayMetrics.avgResponseTime : (i === 0 ? metrics.avgResponseMs : 0),
            });
          }
          return historicalData;
        })(),
        incidents: [], // No incidents currently
        totalActiveUsers: activeUsers,
      },
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status',
    });
  }
});

// ============================================
// STATUS STREAM ENDPOINT (SSE)
// ============================================

app.get('/api/status/stream', (req, res) => {
  console.log('STATUS STREAM ENDPOINT CALLED - SSE');

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://sanbayfusion.com',
      'https://www.sanbayfusion.com',
    ],
    'Access-Control-Allow-Credentials': 'true',
  });

  // Send initial status data
  const sendStatusUpdate = async () => {
    try {
      const metrics = calcMetricsSnapshot();
      const dbCheck = await checkPostgresFast();

      const apiStatus = metrics.errorRate < 1 && metrics.avgResponseMs < 800 ? 'operational' : 'degraded';
      const dbStatus = dbCheck.ok ? 'operational' : 'outage';
      const platformStatus = apiStatus === 'operational' && dbCheck.ok ? 'operational' : 'degraded';

      // Get real agent data from PostgreSQL
      const agents = await prisma.agent.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
      });

      // Get subscription counts per agent
      const subscriptionCounts = await prisma.agentSubscription.groupBy({
        by: ['agentId'],
        where: { status: 'active' },
        _count: { id: true },
      });

      const subscriptionMap = new Map(
        subscriptionCounts.map(s => [s.agentId, s._count.id]),
      );

      const agentsData = agents.map(agent => {
        const agentRM = calcRouteMetrics('agents');
        return {
          name: agent.name,
          slug: agent.agentId,
          status: agent.status === 'active' ? 'operational' : 'degraded',
          responseTime: agentRM.avgResponseMs || metrics.avgResponseMs || 0,
          activeUsers: subscriptionMap.get(agent.agentId) || 0,
          totalUsers: agent.totalUsers || 0,
          totalSessions: agent.totalSessions || 0,
          averageRating: agent.averageRating || 0,
          aiProvider: agent.aiProvider ? agent.aiProvider.model : 'gpt-4' || 'gpt-4',
        };
      });

      // Get analytics summary
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [todaySessions, todayPageViews, activeUsers] = await Promise.all([
        prisma.session.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.pageView.count({ where: { timestamp: { gte: startOfDay } } }),
        prisma.session.count({
          where: {
            lastActivity: { gte: new Date(Date.now() - 15 * 60 * 1000) },
            isActive: true,
          },
        }),
      ]);

      const cpuMem = buildCpuMem();
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const numCpus = os.cpus().length;
      const serverUptime = process.uptime();
      const uptimeHours = Math.floor(serverUptime / 3600);
      const uptimeDays = Math.floor(uptimeHours / 24);
      const streamUptimePercent = metrics.errorRate > 0 ? Math.round((100 - metrics.errorRate) * 100) / 100 : 100;

      const statusData = {
        success: true,
        data: {
          system: {
            cpuPercent: Math.round(loadAvg[0] / numCpus * 100),
            memoryPercent: cpuMem.memPct,
            totalMem: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
            freeMem: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
            usedMem: Math.round(usedMem / (1024 * 1024 * 1024) * 100) / 100,
            load1: loadAvg[0]?.toFixed(2) || 0,
            load5: loadAvg[1]?.toFixed(2) || 0,
            load15: loadAvg[2]?.toFixed(2) || 0,
            cores: numCpus,
            uptimeFormatted: uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours % 24}h` : `${uptimeHours}h ${Math.floor((serverUptime % 3600) / 60)}m`,
          },
          platform: {
            status: platformStatus,
            uptime: streamUptimePercent,
            lastUpdated: new Date().toISOString(),
            version: process.env.APP_VERSION || '2.0.0',
            environment: process.env.NODE_ENV || 'production',
          },
          api: {
            status: apiStatus,
            responseTime: metrics.avgResponseMs,
            uptime: streamUptimePercent,
            requestsToday: todaySessions + todayPageViews,
            requestsPerMinute: metrics.rps,
            errorRate: metrics.errorRate,
            errorsToday: Math.round(metrics.errorRate * (todaySessions + todayPageViews) / 100),
            totalLastMinute: metrics.totalLastMinute,
          },
          database: {
            status: dbStatus,
            type: 'PostgreSQL',
            connectionPool: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
            responseTime: dbCheck.latencyMs,
            uptime: dbCheck.ok ? streamUptimePercent : 0,
          },
          aiServices: await checkAIProviders(),
          agents: agentsData,
          tools: (() => {
            const toolMap = {
              'DNS Lookup': 'tools:dns-lookup', 'IP Geolocation': 'tools:ip-geolocation',
              'SSL Checker': 'tools:ssl-checker', 'WHOIS Lookup': 'tools:whois-lookup',
              'Port Scanner': 'tools:port-scanner', 'Speed Test': 'tools:speed-test',
              'Hash Generator': 'tools:hash', 'Text-to-Speech': 'tools:tts',
            };
            return Object.entries(toolMap).map(([name, cat]) => {
              const rm = calcRouteMetrics(cat);
              const toolStatus = rm.totalLastMinute > 0
                ? (rm.errorRate < 5 ? 'operational' : 'degraded')
                : apiStatus;
              return { name, status: toolStatus, responseTime: rm.avgResponseMs || 0, requestsPerMinute: rm.rps, errorRate: rm.errorRate };
            });
          })(),
          historical: [],
          incidents: [],
          totalActiveUsers: activeUsers,
        },
      };

      // Send SSE event
      res.write(`data: ${JSON.stringify(statusData)}\n\n`);

    } catch (error) {
      console.error('Status stream error:', error);
      // Send error event
      res.write(`data: ${JSON.stringify({
        status: 'error',
        error: 'Failed to fetch status stream',
      })}\n\n`);
    }
  };

  // Send initial update
  sendStatusUpdate();

  // Send updates every 5 seconds
  const interval = setInterval(sendStatusUpdate, 5000);

  // Handle client disconnect
  req.on('close', () => {
    console.log('Status stream client disconnected');
    clearInterval(interval);
    res.end();
  });

  // Handle connection errors
  req.on('error', (error) => {
    console.error('Status stream connection error:', error);
    clearInterval(interval);
    res.end();
  });
});

// ============================================
// STATUS ANALYTICS ENDPOINT
// ============================================

app.get('/api/status/analytics', async (req, res) => {
  console.log('STATUS ANALYTICS ENDPOINT CALLED');
  try {
    const metrics = calcMetricsSnapshot();
    const { timeRange = '24h' } = req.query;

    // Calculate date ranges
    const now = new Date();
    let startDate, previousStartDate, previousEndDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get current period data
    const [
      currentSessions,
      currentPageViews,
      currentActiveUsers,
    ] = await Promise.all([
      prisma.session.count({ where: { createdAt: { gte: startDate } } }),
      prisma.pageView.count({ where: { timestamp: { gte: startDate } } }),
      prisma.session.count({
        where: {
          lastActivity: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          isActive: true,
        },
      }),
    ]);

    // Get previous period data for growth calculation
    const [
      previousSessions,
      previousPageViews,
    ] = await Promise.all([
      prisma.session.count({ where: { createdAt: { gte: previousStartDate, lt: previousEndDate } } }),
      prisma.pageView.count({ where: { timestamp: { gte: previousStartDate, lt: previousEndDate } } }),
    ]);

    // Calculate growth percentages (compare sessions, not active users)
    const requestsGrowth = previousSessions > 0 ? ((currentSessions - previousSessions) / previousSessions) * 100 : (currentSessions > 0 ? 100 : 0);
    const usersGrowth = previousPageViews > 0 ? ((currentPageViews - previousPageViews) / previousPageViews) * 100 : (currentPageViews > 0 ? 100 : 0);

    // Get agent performance data with subscriptions
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });

    // Get subscription counts per agent
    const subscriptionCounts = await prisma.agentSubscription.groupBy({
      by: ['agentId'],
      where: { status: 'active' },
      _count: { id: true },
    });

    const subscriptionMap = new Map(
      subscriptionCounts.map(s => [s.agentId, s._count.id]),
    );

    const agentsData = agents.map(agent => {
      const users = subscriptionMap.get(agent.agentId) || 0;
      const agentRM = calcRouteMetrics('agents');

      return {
        name: agent.name,
        requests: agent.totalSessions || 0,
        users,
        avgResponseTime: agentRM.avgResponseMs || 0,
        successRate: agentRM.totalLastMinute > 0 ? +(100 - agentRM.errorRate).toFixed(1) : (agent.totalSessions > 0 ? 100 : 0),
        trend: users > 3 ? 'up' : users > 0 ? 'stable' : 'down',
      };
    });

    // Tools usage data - derive from real page views for tool URLs
    let toolPageViews = {};
    let toolDistinctUsers = {};
    try {
      const toolViews = await prisma.pageView.groupBy({
        by: ['url'],
        where: {
          timestamp: { gte: startDate },
          url: { contains: '/tools/' },
        },
        _count: { id: true },
      });
      toolViews.forEach(tv => {
        // Extract tool name from URL like "/tools/dns-lookup" or "https://sanbayfusion.com/tools/dns-lookup"
        const urlPath = tv.url.includes('://') ? new URL(tv.url).pathname : tv.url;
        const segment = urlPath.split('/tools/')[1]?.split('/')[0]?.split('?')[0];
        if (segment) {
          const toolName = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          toolPageViews[toolName] = (toolPageViews[toolName] || 0) + tv._count.id;
        }
      });

      // Get distinct visitors per tool
      const toolVisitors = await prisma.pageView.groupBy({
        by: ['url'],
        where: {
          timestamp: { gte: startDate },
          url: { contains: '/tools/' },
        },
        _count: { visitorId: true },
      });
      toolVisitors.forEach(tv => {
        const urlPath = tv.url.includes('://') ? new URL(tv.url).pathname : tv.url;
        const segment = urlPath.split('/tools/')[1]?.split('/')[0]?.split('?')[0];
        if (segment) {
          const toolName = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          toolDistinctUsers[toolName] = (toolDistinctUsers[toolName] || 0) + tv._count.visitorId;
        }
      });
    } catch (e) {
      console.log('Tool page views query error:', e.message);
    }

    const toolCategoryMap = {
      'Dns Lookup': 'tools:dns-lookup', 'Ip Geolocation': 'tools:ip-geolocation',
      'Ssl Checker': 'tools:ssl-checker', 'Whois Lookup': 'tools:whois-lookup',
      'Port Scanner': 'tools:port-scanner', 'Speed Test': 'tools:speed-test',
      'Hash Generator': 'tools:hash', 'Text To Speech': 'tools:tts',
    };
    const toolNames = ['Dns Lookup', 'Ip Geolocation', 'Ssl Checker', 'Whois Lookup', 'Port Scanner', 'Speed Test', 'Hash Generator', 'Text To Speech'];
    const toolDisplayNames = { 'Dns Lookup': 'DNS Lookup', 'Ip Geolocation': 'IP Geolocation', 'Ssl Checker': 'SSL Checker', 'Whois Lookup': 'WHOIS Lookup', 'Port Scanner': 'Port Scanner', 'Speed Test': 'Speed Test', 'Hash Generator': 'Hash Generator', 'Text To Speech': 'Text-to-Speech' };
    const toolsData = toolNames.map(name => {
      const display = toolDisplayNames[name] || name;
      const usage = toolPageViews[name] || 0;
      const users = toolDistinctUsers[name] || 0;
      const rm = calcRouteMetrics(toolCategoryMap[name] || 'other');
      return {
        name: display, usage, users,
        avgDuration: rm.avgResponseMs || 0,
        trend: usage > 5 ? 'up' : usage > 0 ? 'stable' : 'down',
      };
    }).sort((a, b) => b.usage - a.usage);

    // Generate hourly data for the last 24 hours
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const [hourSessions, hourPageViews] = await Promise.all([
        prisma.session.count({ where: { createdAt: { gte: hourStart, lt: hourEnd } } }),
        prisma.pageView.count({ where: { timestamp: { gte: hourStart, lt: hourEnd } } }),
      ]);

      hourlyData.push({
        hour: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
        requests: hourSessions + hourPageViews,
        users: hourSessions,
      });
    }

    // Calculate top agents by users (subscribers)
    const topAgents = agentsData
      .sort((a, b) => b.users - a.users)
      .slice(0, 5)
      .map((agent) => {
        const maxUsers = Math.max(...agentsData.map(a => a.users), 1);
        return {
          name: agent.name,
          requests: agent.requests,
          users: agent.users,
          percentage: (agent.users / maxUsers) * 100,
        };
      });

    // Calculate overview metrics from real data
    const totalRequests = currentSessions + currentPageViews;
    const avgResponseTime = metrics.avgResponseMs || 0;
    const successRate = metrics.errorRate > 0 ? Math.round((100 - metrics.errorRate) * 100) / 100 : 100;

    res.json({
      overview: {
        totalRequests,
        activeUsers: currentActiveUsers,
        avgResponseTime,
        successRate,
        requestsGrowth: Math.round(requestsGrowth * 10) / 10,
        usersGrowth: Math.round(usersGrowth * 10) / 10,
      },
      agents: agentsData,
      tools: toolsData,
      hourlyData,
      topAgents,
    });
  } catch (error) {
    console.error('Status analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

// ============================================
// STATUS API-STATUS ENDPOINT
// ============================================

app.get('/api/status/api-status', async (req, res) => {
  console.log('API STATUS ENDPOINT CALLED');
  try {
    const metrics = calcMetricsSnapshot();
    const dbCheck = await checkPostgresFast();
    const now = new Date().toISOString();
    const globalUptimePct = metrics.errorRate > 0 ? Math.round((100 - metrics.errorRate) * 100) / 100 : 100;

    // Helper to derive status from route metrics
    function deriveStatus(rm) {
      if (rm.totalLastMinute === 0) return 'operational'; // No traffic = assume OK
      if (rm.errorRate < 1) return 'operational';
      if (rm.errorRate < 10) return 'degraded';
      return 'outage';
    }

    // Core API endpoints — each uses its own per-route metrics
    const endpointDefs = [
      { name: 'Health Check',      endpoint: '/api/health',          method: 'GET',  category: 'health' },
      { name: 'Status',            endpoint: '/api/status',          method: 'GET',  category: 'status' },
      { name: 'Authentication',    endpoint: '/api/auth/verify',     method: 'GET',  category: 'auth' },
      { name: 'Chat Completions',  endpoint: '/api/studio/chat',     method: 'POST', category: 'chat' },
      { name: 'Canvas Generate',   endpoint: '/api/canvas/generate', method: 'POST', category: 'canvas' },
    ];
    const endpoints = endpointDefs.map(def => {
      const rm = calcRouteMetrics(def.category);
      return {
        name: def.name, endpoint: def.endpoint, method: def.method,
        status: deriveStatus(rm),
        responseTime: rm.avgResponseMs,
        uptime: rm.totalLastMinute > 0 ? +(100 - rm.errorRate).toFixed(2) : globalUptimePct,
        lastChecked: now,
        errorRate: rm.errorRate,
        requestsPerMinute: rm.rps,
      };
    });

    // Real agents from database with per-route metrics
    const dbAgents = await prisma.agent.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } });
    const agentRouteMetrics = calcRouteMetrics('agents');
    const agents = dbAgents.map(agent => ({
      name: agent.name,
      apiEndpoint: `/api/agents/${agent.agentId}`,
      status: agent.status === 'active' ? deriveStatus(agentRouteMetrics) : 'degraded',
      responseTime: agentRouteMetrics.avgResponseMs,
      requestsPerMinute: agentRouteMetrics.rps,
    }));

    // Tools — each uses its own per-route metrics
    const toolDefs = [
      { name: 'DNS Lookup',      apiEndpoint: '/api/tools/dns-lookup',      category: 'tools:dns-lookup' },
      { name: 'IP Geolocation',  apiEndpoint: '/api/tools/ip-geolocation',  category: 'tools:ip-geolocation' },
      { name: 'SSL Checker',     apiEndpoint: '/api/tools/ssl-checker',     category: 'tools:ssl-checker' },
      { name: 'WHOIS Lookup',    apiEndpoint: '/api/tools/whois-lookup',    category: 'tools:whois-lookup' },
      { name: 'Port Scanner',    apiEndpoint: '/api/tools/port-scanner',    category: 'tools:port-scanner' },
      { name: 'Speed Test',      apiEndpoint: '/api/tools/speed-test',      category: 'tools:speed-test' },
      { name: 'Hash Generator',  apiEndpoint: '/api/tools/hash',           category: 'tools:hash' },
      { name: 'Text-to-Speech',  apiEndpoint: '/api/tts',                  category: 'tools:tts' },
    ];
    const tools = toolDefs.map(def => {
      const rm = calcRouteMetrics(def.category);
      return {
        name: def.name, apiEndpoint: def.apiEndpoint,
        status: deriveStatus(rm),
        responseTime: rm.avgResponseMs,
        requestsPerMinute: rm.rps,
        errorRate: rm.errorRate,
      };
    });

    // AI Services — use real cached health checks
    const aiProviders = await checkAIProviders();
    const aiServices = aiProviders.map(p => ({
      name: p.name, provider: p.name.split('(')[0].trim() || p.name,
      status: p.status, responseTime: p.responseTime,
      quota: p.status === 'operational' ? 'Active' : (p.status === 'degraded' ? 'Limited' : 'Unavailable'),
    }));

    res.json({
      success: true,
      endpoints,
      categories: { agents, tools, aiServices },
      summary: {
        api: {
          status: metrics.errorRate < 1 && metrics.avgResponseMs < 800 ? 'operational' : 'degraded',
          responseTime: metrics.avgResponseMs || 0,
          requestsPerMinute: metrics.rps,
          errorRate: metrics.errorRate,
          uptime: globalUptimePct,
        },
        database: {
          status: dbCheck.ok ? 'operational' : 'outage',
          responseTime: dbCheck.latencyMs,
          message: dbCheck.message,
        },
      },
      timestamp: now,
    });
  } catch (error) {
    console.error('API status endpoint error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API status' });
  }
});

// ============================================
// AUTHENTICATION — CONSOLIDATED INTO NEXT.JS
// All auth routes now handled by frontend/app/api/auth/*
// Removed: send-verification-email, signup, verify-email,
// resend-verification, login, admin/unlock-account, logout,
// verify-2fa, verify-login-otp, resend-login-otp, session
// ============================================

// GET /api/auth/session — used by Next.js API routes (verifyRequestAsync) to validate sessions
app.get('/api/auth/session', async (req, res) => {
  const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ success: false, user: null });
  }
  try {
    const user = await prisma.user.findFirst({
      where: { sessionId, sessionExpiry: { gt: new Date() } },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ success: false, user: null });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('[/api/auth/session] error:', err.message);
    res.status(500).json({ success: false, user: null });
  }
});

// ============================================
// AGENTS ENDPOINTS
// ============================================

app.get('/api/agents', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      agents: agents.map(a => ({
        id: a.id,
        agentId: a.agentId,
        name: a.name,
        avatarUrl: a.avatarUrl,
        specialty: a.specialty,
        description: a.description,
        specialties: a.specialties,
        tags: a.tags,
        color: a.color,
        pricing: {
          daily: a.pricingDaily,
          weekly: a.pricingWeekly,
          monthly: a.pricingMonthly,
        },
        stats: {
          totalUsers: a.totalUsers,
          totalSessions: a.totalSessions,
          averageRating: a.averageRating,
        },
      })),
    });
  } catch (error) {
    console.error('Agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents',
    });
  }
});

app.get('/api/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await prisma.agent.findUnique({
      where: { agentId },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    res.json({
      success: true,
      agent: {
        id: agent.id,
        agentId: agent.agentId,
        name: agent.name,
        avatarUrl: agent.avatarUrl,
        specialty: agent.specialty,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        welcomeMessage: agent.welcomeMessage,
        specialties: agent.specialties,
        tags: agent.tags,
        color: agent.color,
        aiProvider: agent.aiProvider,
        pricing: {
          daily: agent.pricingDaily,
          weekly: agent.pricingWeekly,
          monthly: agent.pricingMonthly,
        },
        stats: {
          totalUsers: agent.totalUsers,
          totalSessions: agent.totalSessions,
          averageRating: agent.averageRating,
        },
      },
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent',
    });
  }
});

// ============================================
// DOCTOR NETWORK - AI Chat for IP/Network Help
// ============================================
app.post('/api/doctor-network', async (req, res) => {
  try {
    const { message, conversation = [], language = 'en', ipContext } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build system prompt
    const systemPrompt = `You are Doctor Network 👨‍⚕️ - a friendly, expert networking assistant. You help users understand:
- IP addresses (IPv4, IPv6, public vs private)
- Network security (firewalls, VPNs, encryption)
- ISPs and internet connectivity
- DNS, ports, protocols
- Troubleshooting network issues

${ipContext ? `The user's current network context:
- IP: ${ipContext.ip || 'Unknown'}
- Location: ${ipContext.location || 'Unknown'}
- Network: ${ipContext.network || 'Unknown'}
- Security: ${ipContext.security || 'Unknown'}` : ''}

Guidelines:
- Be friendly, approachable, and use simple language
- Use analogies to explain technical concepts
- Give practical, actionable advice
- Keep responses concise but helpful
- Respond in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'de' ? 'German' : 'English'}`;

    // Build messages array
    const messages = [{ role: 'system', content: systemPrompt }];
    
    // Add recent conversation history (last 10 messages)
    if (Array.isArray(conversation)) {
      conversation.slice(-10).forEach(msg => {
        if (msg.type === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.type === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }
    
    messages.push({ role: 'user', content: message });

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

    return res.json({
      success: true,
      response: {
        id: `dr-${Date.now()}`,
        type: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[doctor-network] Error:', error);
    return res.status(503).json({ error: 'Doctor Network is temporarily unavailable' });
  }
});

// Feedback endpoint (optional - for analytics)
app.post('/api/doctor-network/feedback', async (req, res) => {
  // Just acknowledge - can add analytics tracking later
  return res.json({ success: true });
});

// ============================================
// MOUNT ROUTERS
// ============================================

// These must come BEFORE apiRouter — apiRouter has a catch-all 404 handler
app.use('/api/push', pushNotificationRouter);

// Main API router (has 404 catch-all, must be last)
app.use('/api', apiRouter);



// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================
// SOCKET.IO
// ============================================

// Room membership is stored in Redis (cross-process) when REDIS_URL is set,
// or falls back to the CacheManager's in-memory store (single-process only).
// This means room-state (user lists) and disconnect cleanup are consistent
// across all PM2 instances once the Redis adapter is active.
const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24 h — rooms auto-expire if never cleaned
const roomKey = (roomId) => `socket:room:${roomId}`;

async function roomGetUsers(roomId) {
  return (await cache.get(roomKey(roomId))) || [];
}

async function roomAddUser(roomId, user) {
  const users = await roomGetUsers(roomId);
  // Remove stale entry for same socketId (reconnect scenario) then append
  const deduped = users.filter((u) => u.socketId !== user.socketId);
  deduped.push(user);
  await cache.set(roomKey(roomId), deduped, ROOM_TTL_SECONDS);
}

async function roomRemoveUser(roomId, socketId) {
  const users = await roomGetUsers(roomId);
  const removed = users.find((u) => u.socketId === socketId) || null;
  const remaining = users.filter((u) => u.socketId !== socketId);
  if (remaining.length === 0) {
    await cache.del(roomKey(roomId));
  } else {
    await cache.set(roomKey(roomId), remaining, ROOM_TTL_SECONDS);
  }
  return removed;
}

/**
 * Wire the Socket.IO Redis pub/sub adapter.
 * Must be called before server.listen() but after io is created.
 * Falls back gracefully to in-memory if Redis is unavailable.
 */
async function setupSocketIOAdapter() {
  if (!process.env.REDIS_URL) {
    console.log('ℹ️  REDIS_URL not set — Socket.IO using in-memory adapter (single-process only)');
    return;
  }
  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { default: Redis } = await import('ioredis');
    const pubClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });
    const subClient = pubClient.duplicate();
    // Wait for both connections to be ready before attaching
    await Promise.all([
      new Promise((res, rej) => { pubClient.once('ready', res); pubClient.once('error', rej); }),
      new Promise((res, rej) => { subClient.once('ready', res); subClient.once('error', rej); }),
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter enabled — events propagate across all PM2 instances');
  } catch (err) {
    console.warn('⚠️  Socket.IO Redis adapter unavailable, falling back to in-memory:', err.message);
  }
}

// Per-process map: socketId → Set of roomIds joined by that socket.
// Used solely for disconnect cleanup — a socket always lives in one process
// so this local reference is always authoritative for that socket.
const socketRooms = new Map();

io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id);

  socket.on('join-room', async (data) => {
    const { roomId, userId, username } = data;
    socket.join(roomId);

    // Track locally so disconnect can find all rooms this socket was in
    if (!socketRooms.has(socket.id)) socketRooms.set(socket.id, new Set());
    socketRooms.get(socket.id).add(roomId);

    await roomAddUser(roomId, { userId, username, socketId: socket.id });
    socket.to(roomId).emit('user-joined', { userId, username });

    // Build room-state from Redis — includes users on ALL processes
    const roomUsers = (await roomGetUsers(roomId)).map((u) => ({ userId: u.userId, username: u.username }));
    socket.emit('room-state', { users: roomUsers });
  });

  socket.on('cursor-move', (data) => {
    const { roomId, userId, username, position } = data;
    socket.to(roomId).emit('cursor-update', { userId, username, position, timestamp: Date.now() });
  });

  socket.on('content-change', (data) => {
    const { roomId, userId, username, content, position } = data;
    socket.to(roomId).emit('content-update', { userId, username, content, position, timestamp: Date.now() });
  });

  socket.on('typing-start', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', { userId, username });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId } = data;
    socket.to(roomId).emit('user-stopped-typing', { userId });
  });

  socket.on('disconnect', async () => {
    console.log('🔌 User disconnected:', socket.id);
    const rooms = socketRooms.get(socket.id) || new Set();
    socketRooms.delete(socket.id);
    // Remove from Redis room state and notify all room members (cross-process via adapter)
    for (const roomId of rooms) {
      const removed = await roomRemoveUser(roomId, socket.id);
      if (removed) {
        socket.to(roomId).emit('user-left', { userId: removed.userId, username: removed.username });
      }
    }
  });
});

// ============================================
// START SERVER
// ============================================

const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

async function initializeServer() {
  try {
    console.log('🔧 Initializing Maula AI Server...');
    console.log('📦 Database: PostgreSQL via Prisma');

    // Connect to PostgreSQL (with retry/backoff)
    console.log('🔌 Connecting to PostgreSQL...');
    await connectDatabase();

    // Cron jobs and sandbox cleanup only run on instance 0 (safe for PM2 cluster mode)
    const isPrimaryInstance = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
    if (isPrimaryInstance) {
      startSubscriptionExpirationCron();

      try {
      } catch (sandboxErr) {
        console.warn('⚠️  Sandbox init failed (non-fatal):', sandboxErr.message);
      }
    } else {
      console.log(`⏭️  Instance ${process.env.NODE_APP_INSTANCE}: skipping cron jobs & sandbox init (handled by instance 0)`);
    }

    // Wire Socket.IO Redis adapter (must happen before server.listen)
    await setupSocketIOAdapter();

    // Start server
    server.listen(PORT, host, () => {
      console.log(`🚀 Maula AI Backend running on ${host}:${PORT}`);
      console.log(`📊 Health check: http://${host}:${PORT}/health`);
      console.log(`🔗 API: http://${host}:${PORT}/api`);

      const hasAIService = !!(
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.COHERE_API_KEY
      );

      if (hasAIService) {
        console.log('✅ AI services configured');
      } else {
        console.log('⚠️  No AI services configured');
      }

      console.log('✅ Server started successfully');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Global error handlers — prevent unhandled crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught Exception:', error);
  // Only exit for truly fatal errors (e.g., out of memory)
  if (error.code === 'ERR_OUT_OF_RANGE' || error.message?.includes('ENOMEM')) {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

// Start
initializeServer();
