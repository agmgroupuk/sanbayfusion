/**
 * MAULA EDITOR BACKEND SERVER
 * Standalone Express API for Maula Editor App
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as jose from 'jose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import crypto from 'crypto';
import pg from 'pg';
import os from 'os';
import fsSync from 'fs';
import path from 'path';

import { prisma } from './lib/prisma.js';
import { contentSafetyMiddleware } from './lib/contentSafety.js';
import { emailService } from './services/emailService.js';
import { createLogger } from './lib/logger.js';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import Docker from 'dockerode';

const log = createLogger('Server');

// ── Main DB pool for cross-domain session SSO ──
// When user signs in on maula.ai, sessionId cookie is set with domain .maula.ai
// We look up that session in the main maulaai database to authenticate
// Strip sslmode from URL — newer pg lib treats sslmode=require as verify-full,
// overriding our explicit ssl config and causing "self-signed certificate" errors
const mainDbUrl = process.env.MAIN_DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '') || '';
const mainDbPool = mainDbUrl
    ? new pg.Pool({ connectionString: mainDbUrl, max: 5, idleTimeoutMillis: 30000, ssl: { rejectUnauthorized: false } })
    : null;

// ── Cross-database pools for central dashboard credit aggregation ──
// Each app uses its own separate PostgreSQL DB (public schema, no prefix needed)
const crossDbPools = {};
const crossDbApps = [
    { id: 'neural-chat', envKey: 'NEURAL_CHAT_DATABASE_URL' },
    { id: 'canvas-studio', envKey: 'CANVAS_STUDIO_DATABASE_URL' },
    { id: 'gen-craft-pro', envKey: 'GEN_CRAFT_PRO_DATABASE_URL' },
];
for (const app of crossDbApps) {
    if (process.env[app.envKey]) {
        crossDbPools[app.id] = { pool: new pg.Pool({ connectionString: process.env[app.envKey], max: 3, idleTimeoutMillis: 30000, ssl: { rejectUnauthorized: false } }) };
    }
}

// Initialize Express
const app = express();
const httpServer = createServer(app);

// ── Y.js Collaboration WebSocket Server ──
const collabWss = new WebSocketServer({ noServer: true });
const collabLog = createLogger('Collaboration');
const collabDocs = new Map(); // docName -> { ydoc, awareness, conns }

const messageSync = 0;
const messageAwareness = 1;

function getOrCreateDoc(docName) {
  if (collabDocs.has(docName)) return collabDocs.get(docName);
  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);
  const doc = { ydoc, awareness, conns: new Set() };
  collabDocs.set(docName, doc);
  awareness.on('update', ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
    const msg = encoding.toUint8Array(encoder);
    doc.conns.forEach(conn => { try { conn.send(msg); } catch {} });
  });
  return doc;
}

collabWss.on('connection', (ws, req, docName) => {
  const doc = getOrCreateDoc(docName);
  doc.conns.add(ws);
  collabLog.info(`Client connected to "${docName}" (${doc.conns.size} total)`);

  // Send initial sync step 1
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc.ydoc);
  ws.send(encoding.toUint8Array(syncEncoder));

  // Send current awareness state
  const awarenessStates = awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(doc.awareness.getStates().keys()));
  const awarenessEncoder = encoding.createEncoder();
  encoding.writeVarUint(awarenessEncoder, messageAwareness);
  encoding.writeVarUint8Array(awarenessEncoder, awarenessStates);
  ws.send(encoding.toUint8Array(awarenessEncoder));

  ws.on('message', (data) => {
    try {
      const buf = new Uint8Array(data);
      const decoder = decoding.createDecoder(buf);
      const msgType = decoding.readVarUint(decoder);
      if (msgType === messageSync) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc.ydoc, ws);
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
        // Broadcast to other connections
        const update = encoding.toUint8Array(encoder);
        if (update.length > 1) {
          doc.conns.forEach(conn => { if (conn !== ws && conn.readyState === 1) try { conn.send(data); } catch {} });
        }
      } else if (msgType === messageAwareness) {
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), ws);
      }
    } catch (err) {
      collabLog.error('WS message error:', err.message);
    }
  });

  ws.on('close', () => {
    doc.conns.delete(ws);
    collabLog.info(`Client disconnected from "${docName}" (${doc.conns.size} remaining)`);
    if (doc.conns.size === 0) {
      // Clean up empty documents after a delay
      setTimeout(() => {
        if (doc.conns.size === 0) {
          doc.awareness.destroy();
          doc.ydoc.destroy();
          collabDocs.delete(docName);
          collabLog.info(`Cleaned up empty document: "${docName}"`);
        }
      }, 30000);
    }
  });
});

// ── Docker client (optional — only used if Docker daemon is available) ──
let docker = null;
try {
  docker = new Docker();
} catch (err) {
  createLogger('Docker').warn('Docker not available:', err.message);
}

// Trust first proxy
app.set('trust proxy', 1);

const PORT = process.env.MAULA_EDITOR_PORT || 3204;
const JWT_SECRET = process.env.MAULA_EDITOR_JWT_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) { log.error('FATAL: JWT_SECRET environment variable is not set. Exiting.'); process.exit(1); }

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        process.env.MAULA_EDITOR_FRONTEND_URL || 'http://localhost:3104',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://editor.maula.ai',
        'https://editor.maula.ai',
        'https://maula.ai',
        'https://www.maula.ai',
    ];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, error: 'Too many attempts' },
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, error: 'Rate limit exceeded' },
});

const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
});

app.use(generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/maula-editor', aiLimiter);

// ============================================================================
// STRIPE WEBHOOK — must be BEFORE express.json() to get raw body
// ============================================================================
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        log.error('[Webhook] Missing signature or webhook secret');
        return res.status(400).send('Missing signature');
    }

    let event;
    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        log.error('[Webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    log.info(`[Webhook] Received event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, appId, credits } = session.metadata || {};

        if (!userId) {
            log.error('[Webhook] No userId in session metadata');
            return res.json({ received: true });
        }

        try {
            const creditsToAdd = parseFloat(credits) || 0;

            if (creditsToAdd > 0) {
                await prisma.userCredits.upsert({
                    where: { userId_appId: { userId, appId: appId || 'maula-editor' } },
                    update: {
                        balance: { increment: creditsToAdd },
                        lifetimeEarned: { increment: creditsToAdd },
                    },
                    create: {
                        userId,
                        appId: appId || 'maula-editor',
                        balance: creditsToAdd,
                        lifetimeEarned: creditsToAdd,
                        freeCreditsMax: 5,
                    },
                });

                await prisma.billingHistory.create({
                    data: {
                        userId,
                        stripePaymentId: session.payment_intent || session.id,
                        stripeCustomerId: session.customer,
                        amount: (session.amount_total || 0) / 100,
                        currency: session.currency || 'usd',
                        creditsAdded: creditsToAdd,
                        status: 'SUCCEEDED',
                        description: `${creditsToAdd} credits purchased via Stripe`,
                        metadata: { sessionId: session.id, appId, priceId: session.metadata?.priceId },
                    },
                });

                const creditRecord = await prisma.userCredits.findUnique({
                    where: { userId_appId: { userId, appId: appId || 'maula-editor' } },
                });
                if (creditRecord) {
                    await prisma.creditTransaction.create({
                        data: {
                            userCreditsId: creditRecord.id,
                            type: 'PURCHASE',
                            amount: creditsToAdd,
                            balanceAfter: creditRecord.balance,
                            description: `Stripe purchase: ${creditsToAdd} credits`,
                            referenceId: session.payment_intent || session.id,
                            referenceType: 'stripe',
                        },
                    });
                }

                log.info(`[Webhook] Added ${creditsToAdd} credits to user ${userId} (app: ${appId})`);
            }
        } catch (err) {
            log.error('[Webhook] Error processing checkout.session.completed:', err.message);
        }
    }

    res.json({ received: true });
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const requireAuth = async (req, res, next) => {
    try {
        // 1) Try editor-specific JWT tokens first (maula_editor_session / auth_token)
        const jwtToken =
            req.cookies?.maula_editor_session ||
            req.cookies?.auth_token ||
            req.headers.authorization?.replace('Bearer ', '');

        if (jwtToken) {
            try {
                const secret = new TextEncoder().encode(JWT_SECRET);
                const { payload } = await jose.jwtVerify(jwtToken, secret);

                let user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { credits: true } });
                if (!user && payload.email) {
                    user = await prisma.user.findUnique({ where: { email: payload.email }, include: { credits: true } });
                    if (!user) {
                        user = await prisma.user.create({
                            data: {
                                email: payload.email,
                                name: payload.name || payload.email.split('@')[0],
                                passwordHash: 'cross-domain-sso',
                                isVerified: true,
                                credits: { create: { appId: 'maula-editor', balance: 5, freeCreditsMax: 5 } },
                            },
                            include: { credits: true },
                        });
                        log.info(`[Auth] Auto-provisioned user ${payload.email} from JWT SSO`);
                    }
                }
                if (user) { req.user = user; return next(); }
            } catch (jwtErr) {
                // JWT invalid — fall through to session cookie check
            }
        }

        // 2) Try maula.ai session cookies (sessionId / session_id) — cross-domain SSO
        //    These are set by the main site with domain=.maula.ai, so available here
        const mainSessionId = req.cookies?.sessionId || req.cookies?.session_id;
        if (mainSessionId && mainDbPool) {
            const result = await mainDbPool.query(
                'SELECT id, email, name, role, "sessionExpiry" FROM "User" WHERE "sessionId" = $1',
                [mainSessionId]
            );
            const mainUser = result.rows[0];
            if (mainUser && (!mainUser.sessionExpiry || new Date(mainUser.sessionExpiry) > new Date())) {
                // Found valid session in main DB — auto-provision in editor DB if needed
                let editorUser = await prisma.user.findUnique({ where: { email: mainUser.email }, include: { credits: true } });
                if (!editorUser) {
                    editorUser = await prisma.user.create({
                        data: {
                            email: mainUser.email,
                            name: mainUser.name || mainUser.email.split('@')[0],
                            passwordHash: 'cross-domain-sso',
                            isVerified: true,
                            credits: { create: { appId: 'maula-editor', balance: 5, freeCreditsMax: 5 } },
                        },
                        include: { credits: true },
                    });
                    log.info(`[Auth] Auto-provisioned user ${mainUser.email} from maula.ai session SSO`);
                }
                req.user = editorUser;
                return next();
            }
        }

        return res.status(401).json({ success: false, error: 'Authentication required' });
    } catch (e) {
        log.info('[Auth] Token verification failed:', e.message);
        return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

// ============================================================================
// BILLING ROUTES — Credit Balance & Checkout
// ============================================================================

// GET /api/billing/history — fetch user's billing transaction history
app.get('/api/billing/history', requireAuth, async (req, res) => {
    try {
        const history = await prisma.billingHistory.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                amount: true,
                creditsAdded: true,
                status: true,
                description: true,
                createdAt: true,
            },
        });
        res.json({
            success: true,
            history: history.map(h => ({
                ...h,
                amount: Number(h.amount),
                creditsAdded: Number(h.creditsAdded),
            })),
        });
    } catch (err) {
        log.error('[Billing] History fetch error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch billing history' });
    }
});

// GET /api/billing/credits?app=maula-editor — fetch user's credit balance
app.get('/api/billing/credits', requireAuth, async (req, res) => {
    try {
        const appId = req.query.app || 'maula-editor';
        const credits = await prisma.userCredits.findUnique({
            where: { userId_appId: { userId: req.user.id, appId } },
        });
        res.json({
            success: true,
            credits: credits ? { balance: Number(credits.balance), lifetimeEarned: Number(credits.lifetimeEarned || 0), lifetimeSpent: Number(credits.lifetimeSpent || 0) } : { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
        });
    } catch (err) {
        log.error('[Billing] Credits fetch error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch credits' });
    }
});

// POST /api/billing/checkout/:appId — create Stripe checkout session for credit purchase
app.post('/api/billing/checkout/:appId', requireAuth, async (req, res) => {
    try {
        const Stripe = (await import('stripe')).default;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) return res.status(503).json({ success: false, error: 'Stripe not configured' });
        const stripe = new Stripe(stripeKey);

        const { appId } = req.params;
        const { packageId, credits, price } = req.body;

        if (!packageId || !credits || !price) {
            return res.status(400).json({ success: false, error: 'Missing required fields: packageId, credits, price' });
        }

        // Validate package tiers (prevent price tampering)
        const VALID_TIERS = {
            starter:    { credits: 50,   price: 5 },
            basic:      { credits: 250,  price: 25 },
            pro:        { credits: 1000, price: 100 },
            business:   { credits: 2500, price: 250 },
            enterprise: { credits: 5000, price: 500 },
        };

        const tier = VALID_TIERS[packageId];
        if (!tier || tier.credits !== credits || tier.price !== price) {
            return res.status(400).json({ success: false, error: 'Invalid package' });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: req.user.email,
            allow_promotion_codes: true,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    unit_amount: price * 100,
                    product_data: {
                        name: `Maula Editor — ${packageId.charAt(0).toUpperCase() + packageId.slice(1)} (${credits} credits)`,
                        description: `${credits} AI credits for Maula Editor`,
                    },
                },
                quantity: 1,
            }],
            metadata: {
                userId: req.user.id,
                appId,
                credits: String(credits),
                packageId,
            },
            success_url: `https://maula.ai/payment/success?session_id={CHECKOUT_SESSION_ID}&app=maula-editor&credits=${credits}&agent=Maula+Editor&slug=maula-editor`,
            cancel_url: `https://maula.ai/overview/pricing?purchase=cancelled&app=maula-editor`,
        });

        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (err) {
        log.error('[Billing] Checkout error:', err.message);
        res.status(500).json({ success: false, error: 'Checkout failed' });
    }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Helper: generate 6-digit OTP (cryptographically secure)
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Helper: get client details for security emails
function getClientDetails(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const time = new Date().toUTCString();
    return { ip, userAgent, time };
}

// Helper: create JWT session and set cookies
async function createSession(res, user) {
    const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(JWT_SECRET));

    const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: '.maula.ai',
    };
    res.cookie('maula_editor_session', token, cookieOpts);
    res.cookie('auth_token', token, cookieOpts);
    return token;
}

// ── SIGNUP ──────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.isVerified) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        const hash = await bcrypt.hash(password, 12);
        const code = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let user;
        if (existing && !existing.isVerified) {
            // Re-use unverified account — update password and new code
            user = await prisma.user.update({
                where: { email },
                data: {
                    passwordHash: hash,
                    name: name || existing.name,
                    verificationCode: code,
                    verificationExpires: expires,
                },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: hash,
                    name,
                    verificationCode: code,
                    verificationExpires: expires,
                    isVerified: false,
                    credits: {
                        create: {
                            appId: 'maula-editor',
                            balance: 5,
                            freeCreditsMax: 5,
                        },
                    },
                },
            });
        }

        // Send verification email
        await emailService.sendVerificationCode(email, name || '', code);
        log.info(`[Signup] Verification code sent to ${email}`);

        res.json({
            success: true,
            requiresVerification: true,
            email: user.email,
            message: 'Verification code sent to your email',
        });
    } catch (error) {
        log.error('[Signup] Error:', error);
        res.status(500).json({ success: false, error: 'Signup failed' });
    }
});

// ── VERIFY EMAIL (after signup) ─────────────────────────────────────────────
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Email and verification code required' });
        }

        const user = await prisma.user.findUnique({ where: { email }, include: { credits: true } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, error: 'Email already verified' });
        }

        if (!user.verificationCode || user.verificationCode !== code) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }

        if (user.verificationExpires && new Date() > user.verificationExpires) {
            return res.status(400).json({ success: false, error: 'Verification code expired. Request a new one.' });
        }

        // Mark as verified, clear code
        await prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationExpires: null,
            },
        });

        // Create session
        await createSession(res, user);

        // Send welcome email (async, don't block)
        emailService.sendWelcomeEmail(email, user.name || '').catch(e => log.error('[Email] Welcome failed:', e.message));

        log.info(`[Signup] Email verified for ${email}`);
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        log.error('[Verify Email] Error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// ── RESEND CODE (signup verification or login OTP) ──────────────────────────
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email, type } = req.body; // type: 'verification' or 'login'
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const code = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        if (type === 'login') {
            await prisma.user.update({
                where: { email },
                data: { loginOtpCode: code, loginOtpExpires: expires },
            });
            await emailService.sendLoginOTP(email, user.name || '', code);
        } else {
            await prisma.user.update({
                where: { email },
                data: { verificationCode: code, verificationExpires: expires },
            });
            await emailService.sendVerificationCode(email, user.name || '', code);
        }

        log.info(`[Resend] ${type || 'verification'} code resent to ${email}`);
        res.json({ success: true, message: 'New code sent to your email' });
    } catch (error) {
        log.error('[Resend Code] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to resend code' });
    }
});

// ── LOGIN (step 1 — validate password, send OTP) ───────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const clientDetails = getClientDetails(req);

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { credits: true },
        });

        if (!user || !user.passwordHash) {
            // Log failed attempt
            await prisma.loginAttempt.create({
                data: { email, ipAddress: clientDetails.ip, userAgent: clientDetails.userAgent, success: false, reason: 'user_not_found' },
            }).catch(() => { });
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check lockout
        if (user.lockLevel === 3) {
            return res.status(403).json({ success: false, error: 'Account permanently locked. Contact support.' });
        }
        if (user.lockedUntil && new Date() < user.lockedUntil) {
            const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
            return res.status(403).json({ success: false, error: `Account locked. Try again in ${mins} minutes.` });
        }

        if (!user.isVerified) {
            // Unverified account — resend verification code
            const code = generateOTP();
            const expires = new Date(Date.now() + 10 * 60 * 1000);
            await prisma.user.update({
                where: { email },
                data: { verificationCode: code, verificationExpires: expires },
            });
            await emailService.sendVerificationCode(email, user.name || '', code);
            return res.json({ success: true, requiresVerification: true, email, message: 'Please verify your email first. Code sent.' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            // Increment failed attempts, possibly lock
            const newFailed = user.failedAttempts + 1;
            let lockLevel = user.lockLevel;
            let lockedUntil = null;

            if (newFailed >= 10) { lockLevel = 3; }
            else if (newFailed >= 7) { lockLevel = 2; lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); }
            else if (newFailed >= 5) { lockLevel = 1; lockedUntil = new Date(Date.now() + 15 * 60 * 1000); }

            await prisma.user.update({
                where: { email },
                data: { failedAttempts: newFailed, lastFailedAt: new Date(), lockLevel, lockedUntil },
            });

            await prisma.loginAttempt.create({
                data: { email, userId: user.id, ipAddress: clientDetails.ip, userAgent: clientDetails.userAgent, success: false, reason: 'invalid_password' },
            }).catch(() => { });

            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Password correct — send login OTP
        const code = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { email },
            data: { loginOtpCode: code, loginOtpExpires: expires },
        });

        await emailService.sendLoginOTP(email, user.name || '', code);
        log.info(`[Login] OTP sent to ${email}`);

        res.json({
            success: true,
            requiresOTP: true,
            email: user.email,
            message: 'Login verification code sent to your email',
        });
    } catch (error) {
        log.error('[Login] Error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// ── VERIFY LOGIN OTP (step 2 — complete login) ─────────────────────────────
app.post('/api/auth/verify-login-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        const clientDetails = getClientDetails(req);

        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Email and OTP code required' });
        }

        const user = await prisma.user.findUnique({ where: { email }, include: { credits: true } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!user.loginOtpCode || user.loginOtpCode !== code) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }

        if (user.loginOtpExpires && new Date() > user.loginOtpExpires) {
            return res.status(400).json({ success: false, error: 'Code expired. Please login again.' });
        }

        // OTP valid — clear it, reset failed attempts, update lastLoginAt
        await prisma.user.update({
            where: { email },
            data: {
                loginOtpCode: null,
                loginOtpExpires: null,
                failedAttempts: 0,
                lockLevel: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });

        // Log successful attempt
        await prisma.loginAttempt.create({
            data: { email, userId: user.id, ipAddress: clientDetails.ip, userAgent: clientDetails.userAgent, success: true, reason: 'otp_verified' },
        }).catch(() => { });

        // Create session
        await createSession(res, user);

        // Send login alert notification (async, don't block)
        emailService.sendLoginAlert(email, user.name || '', clientDetails).catch(e => log.error('[Email] Login alert failed:', e.message));

        log.info(`[Login] OTP verified for ${email} from ${clientDetails.ip}`);
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        log.error('[Verify Login OTP] Error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success (don't reveal if email exists)
        if (!user) {
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { email },
            data: { passwordResetToken: resetToken, passwordResetExpires: expires },
        });

        const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const domain = process.env.APP_DOMAIN || 'editor.maula.ai';
        const resetUrl = `${proto}://${domain}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        await emailService.sendPasswordResetEmail(email, user.name || '', resetUrl);
        log.info(`[Password Reset] Reset link sent to ${email}`);

        res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
        log.error('[Forgot Password] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to process request' });
    }
});

// ── VERIFY RESET TOKEN ──────────────────────────────────────────────────────
app.post('/api/auth/verify-reset-token', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({ success: false, error: 'Email and token required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordResetToken || user.passwordResetToken !== token) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
        }

        if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
            return res.status(400).json({ success: false, error: 'Reset link has expired. Request a new one.' });
        }

        res.json({ success: true, message: 'Token is valid' });
    } catch (error) {
        log.error('[Verify Reset Token] Error:', error);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// ── RESET PASSWORD ──────────────────────────────────────────────────────────
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const clientDetails = getClientDetails(req);

        if (!email || !token || !newPassword) {
            return res.status(400).json({ success: false, error: 'Email, token, and new password required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordResetToken || user.passwordResetToken !== token) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
        }

        if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
            return res.status(400).json({ success: false, error: 'Reset link has expired' });
        }

        const hash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { email },
            data: {
                passwordHash: hash,
                passwordResetToken: null,
                passwordResetExpires: null,
                failedAttempts: 0,
                lockLevel: 0,
                lockedUntil: null,
            },
        });

        // Send password changed alert
        emailService.sendPasswordChangedAlert(email, user.name || '', clientDetails).catch(e => log.error('[Email] Password changed alert failed:', e.message));

        log.info(`[Password Reset] Password changed for ${email}`);
        res.json({ success: true, message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        log.error('[Reset Password] Error:', error);
        res.status(500).json({ success: false, error: 'Password reset failed' });
    }
});

// Auth me — check current session
app.get('/api/auth/me', async (req, res) => {
    try {
        // 1) Try JWT tokens first
        const token = req.cookies?.auth_token || req.cookies?.maula_editor_session || req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            try {
                const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
                let user = await prisma.user.findUnique({
                    where: { id: payload.userId },
                    include: { credits: true },
                });

                if (!user && payload.email) {
                    user = await prisma.user.upsert({
                        where: { email: payload.email },
                        update: {},
                        create: {
                            email: payload.email,
                            name: payload.name || payload.email.split('@')[0],
                            passwordHash: 'cross-domain-sso',
                            isVerified: true,
                            credits: { create: { appId: 'maula-editor', balance: 5, freeCreditsMax: 5 } },
                        },
                        include: { credits: true },
                    });
                }

                if (user) {
                    return res.json({
                        success: true,
                        user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
                    });
                }
            } catch { /* JWT invalid — fall through */ }
        }

        // 2) Try maula.ai session cookies (cross-domain SSO)
        const mainSessionId = req.cookies?.sessionId || req.cookies?.session_id;
        if (mainSessionId && mainDbPool) {
            const result = await mainDbPool.query(
                'SELECT id, email, name, role, "sessionExpiry" FROM "User" WHERE "sessionId" = $1',
                [mainSessionId]
            );
            const mainUser = result.rows[0];
            if (mainUser && (!mainUser.sessionExpiry || new Date(mainUser.sessionExpiry) > new Date())) {
                let editorUser = await prisma.user.findUnique({ where: { email: mainUser.email }, include: { credits: true } });
                if (!editorUser) {
                    editorUser = await prisma.user.create({
                        data: {
                            email: mainUser.email,
                            name: mainUser.name || mainUser.email.split('@')[0],
                            passwordHash: 'cross-domain-sso',
                            isVerified: true,
                            credits: { create: { appId: 'maula-editor', balance: 5, freeCreditsMax: 5 } },
                        },
                        include: { credits: true },
                    });
                    log.info(`[Auth/me] Auto-provisioned user ${mainUser.email} from maula.ai session`);
                }
                return res.json({
                    success: true,
                    user: { id: editorUser.id, email: editorUser.email, name: editorUser.name, credits: editorUser.credits },
                });
            }
        }

        return res.status(401).json({ success: false, error: 'Not authenticated' });
    } catch (e) {
        log.error('[Auth/me] Error:', e.message);
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('maula_editor_session');
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// ============================================================================
// 2FA (TOTP) ROUTES
// ============================================================================

// GET /api/auth/2fa/setup  — generate a TOTP secret + QR code for the user
app.get('/api/auth/2fa/setup', requireAuth, async (req, res) => {
    try {
        const { authenticator } = await import('otplib');
        const QRCode = (await import('qrcode')).default;

        // Generate a fresh secret each time setup is opened
        const secret = authenticator.generateSecret();

        // Build the otpauth URI
        const otpauthUrl = authenticator.keyuri(
            req.user.email,
            'OneLastAI',
            secret,
        );

        // Persist the *pending* secret (overwrite any previous pending secret)
        // We store it even if 2FA is not yet verified so the verify step can use it
        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorSecret: secret },
        });

        // Render the QR code as a base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        res.json({ success: true, secret, qrCodeDataUrl });
    } catch (err) {
        log.error('[2FA] Setup error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to generate 2FA setup' });
    }
});

// POST /api/auth/2fa/verify  — confirm the TOTP code and enable 2FA
app.post('/api/auth/2fa/verify', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token || !/^\d{6}$/.test(token)) {
            return res.status(400).json({ success: false, error: 'Invalid token format' });
        }

        const { authenticator } = await import('otplib');

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.twoFactorSecret) {
            return res.status(400).json({ success: false, error: '2FA setup not initiated' });
        }

        const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorEnabled: true },
        });

        res.json({ success: true, message: '2FA enabled successfully' });
    } catch (err) {
        log.error('[2FA] Verify error:', err.message);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// POST /api/auth/2fa/disable  — disable 2FA (requires valid TOTP to prevent account takeover)
app.post('/api/auth/2fa/disable', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token || !/^\d{6}$/.test(token)) {
            return res.status(400).json({ success: false, error: 'A valid 6-digit code is required to disable 2FA' });
        }

        const { authenticator } = await import('otplib');

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
            return res.status(400).json({ success: false, error: '2FA is not enabled' });
        }

        const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });

        res.json({ success: true, message: '2FA disabled successfully' });
    } catch (err) {
        log.error('[2FA] Disable error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to disable 2FA' });
    }
});

// GET /api/auth/2fa/status  — return current 2FA state for the authenticated user
app.get('/api/auth/2fa/status', requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { twoFactorEnabled: true },
        });
        res.json({ success: true, twoFactorEnabled: user?.twoFactorEnabled ?? false });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch 2FA status' });
    }
});



const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// GET /api/auth/google — redirect to Google consent screen
app.get('/api/auth/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'Google OAuth not configured' });
    }

    // Determine callback URL from the request's host
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback — handle Google redirect
app.get('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.redirect('/?error=google_auth_failed');
        }

        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const redirectUri = `${proto}://${host}/api/auth/google/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            log.error('[Google OAuth] Token exchange failed:', tokenData);
            return res.redirect('/?error=google_token_failed');
        }

        // Get user profile
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        if (!profile.email) {
            return res.redirect('/?error=google_no_email');
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { credits: true },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: profile.email,
                    name: profile.name || profile.email.split('@')[0],
                    passwordHash: null,
                    isVerified: true,
                    credits: {
                        create: {
                            appId: 'maula-editor',
                            balance: 5,
                            freeCreditsMax: 5,
                        },
                    },
                },
                include: { credits: true },
            });
            log.info(`[Google OAuth] New user created: ${profile.email}`);
        }

        // Issue JWT
        const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(JWT_SECRET));

        // Set cookies for both maula-editor and shared auth
        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: '.maula.ai',
        };
        res.cookie('maula_editor_session', token, cookieOpts);
        res.cookie('auth_token', token, cookieOpts);

        // Redirect to dashboard
        res.redirect('/dashboard');
    } catch (error) {
        log.error('[Google OAuth] Callback error:', error);
        res.redirect('/?error=google_auth_error');
    }
});

// ============================================================================
// YAHOO OAUTH ROUTES
// ============================================================================

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;

// GET /api/auth/yahoo — redirect to Yahoo consent screen
app.get('/api/auth/yahoo', (req, res) => {
    if (!YAHOO_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'Yahoo OAuth not configured' });
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/yahoo/callback`;

    const params = new URLSearchParams({
        client_id: YAHOO_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        nonce: crypto.randomUUID(),
    });

    res.redirect(`https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`);
});

// GET /api/auth/yahoo/callback — handle Yahoo redirect
app.get('/api/auth/yahoo/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.redirect('/?error=yahoo_auth_failed');
        }

        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const redirectUri = `${proto}://${host}/api/auth/yahoo/callback`;

        // Exchange code for tokens (Yahoo requires Basic auth header)
        const basicAuth = Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64');

        const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            log.error('[Yahoo OAuth] Token exchange failed:', tokenData);
            return res.redirect('/?error=yahoo_token_failed');
        }

        // Get user profile from Yahoo OpenID userinfo
        const profileRes = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        if (!profile.email) {
            return res.redirect('/?error=yahoo_no_email');
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { credits: true },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: profile.email,
                    name: profile.name || profile.email.split('@')[0],
                    passwordHash: null,
                    isVerified: true,
                    credits: {
                        create: {
                            appId: 'maula-editor',
                            balance: 5,
                            freeCreditsMax: 5,
                        },
                    },
                },
                include: { credits: true },
            });
            log.info(`[Yahoo OAuth] New user created: ${profile.email}`);
        }

        // Issue JWT
        const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(JWT_SECRET));

        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: '.maula.ai',
        };
        res.cookie('maula_editor_session', token, cookieOpts);
        res.cookie('auth_token', token, cookieOpts);

        res.redirect('/dashboard');
    } catch (error) {
        log.error('[Yahoo OAuth] Callback error:', error);
        res.redirect('/?error=yahoo_auth_error');
    }
});

// ============================================================================
// MICROSOFT OAUTH ROUTES
// ============================================================================

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';

// GET /api/auth/microsoft — redirect to Microsoft consent screen
app.get('/api/auth/microsoft', (req, res) => {
    if (!MICROSOFT_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'Microsoft OAuth not configured' });
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/microsoft/callback`;

    const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        response_mode: 'query',
        state: crypto.randomUUID(),
    });

    res.redirect(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`);
});

// GET /api/auth/microsoft/callback — handle Microsoft redirect
app.get('/api/auth/microsoft/callback', async (req, res) => {
    try {
        const { code, error: msError } = req.query;
        if (msError || !code) {
            log.error('[Microsoft OAuth] Auth failed:', msError || 'no code');
            return res.redirect('/?error=microsoft_auth_failed');
        }

        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const redirectUri = `${proto}://${host}/api/auth/microsoft/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: MICROSOFT_CLIENT_ID,
                client_secret: MICROSOFT_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'openid email profile User.Read',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            log.error('[Microsoft OAuth] Token exchange failed:', tokenData);
            return res.redirect('/?error=microsoft_token_failed');
        }

        // Get user profile from Microsoft Graph
        const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();

        const email = profile.mail || profile.userPrincipalName;
        if (!email) {
            return res.redirect('/?error=microsoft_no_email');
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email },
            include: { credits: true },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: profile.displayName || email.split('@')[0],
                    passwordHash: null,
                    isVerified: true,
                    credits: {
                        create: {
                            appId: 'maula-editor',
                            balance: 5,
                            freeCreditsMax: 5,
                        },
                    },
                },
                include: { credits: true },
            });
            log.info(`[Microsoft OAuth] New user created: ${email}`);
        }

        // Issue JWT
        const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(JWT_SECRET));

        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: '.maula.ai',
        };
        res.cookie('maula_editor_session', token, cookieOpts);
        res.cookie('auth_token', token, cookieOpts);

        res.redirect('/dashboard');
    } catch (error) {
        log.error('[Microsoft OAuth] Callback error:', error);
        res.redirect('/?error=microsoft_auth_error');
    }
});

// ============================================================================
// GITHUB OAUTH ROUTES
// ============================================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// GET /api/auth/github — redirect to GitHub consent screen
app.get('/api/auth/github', (req, res) => {
    if (!GITHUB_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'GitHub OAuth not configured' });
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/github/callback`;

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state: crypto.randomUUID(),
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback — handle GitHub redirect
app.get('/api/auth/github/callback', async (req, res) => {
    try {
        const { code, error: ghError } = req.query;
        if (ghError || !code) {
            log.error('[GitHub OAuth] Auth failed:', ghError || 'no code');
            return res.redirect('/?error=github_auth_failed');
        }

        // Exchange code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            log.error('[GitHub OAuth] Token exchange failed:', tokenData);
            return res.redirect('/?error=github_token_failed');
        }

        // Get user profile from GitHub API
        const profileRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'OnelastAI-Maula',
            },
        });
        const profile = await profileRes.json();

        // GitHub may not return email in profile — fetch from /user/emails
        let email = profile.email;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'OnelastAI-Maula',
                },
            });
            const emails = await emailsRes.json();
            const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
            email = primary?.email;
        }

        if (!email) {
            return res.redirect('/?error=github_no_email');
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email },
            include: { credits: true },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: profile.name || profile.login || email.split('@')[0],
                    passwordHash: null,
                    isVerified: true,
                    credits: {
                        create: {
                            appId: 'maula-editor',
                            balance: 5,
                            freeCreditsMax: 5,
                        },
                    },
                },
                include: { credits: true },
            });
            log.info(`[GitHub OAuth] New user created: ${email}`);
        }

        // Issue JWT
        const token = await new jose.SignJWT({ userId: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(new TextEncoder().encode(JWT_SECRET));

        const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: '.maula.ai',
        };
        res.cookie('maula_editor_session', token, cookieOpts);
        res.cookie('auth_token', token, cookieOpts);

        res.redirect('/dashboard');
    } catch (error) {
        log.error('[GitHub OAuth] Callback error:', error);
        res.redirect('/?error=github_auth_error');
    }
});

// ============================================================================
// MAULA EDITOR ROUTES
// ============================================================================

// Import routes
import fileRoutes from './routes/files.js';
import projectRoutes from './routes/project.js';
import maulaEditorAppRoutes from './routes/maulaEditorApp.js';
import editorRoutes from './routes/editor.js';

app.use('/api/files', contentSafetyMiddleware, fileRoutes);
app.use('/api/project', contentSafetyMiddleware, projectRoutes);
app.use('/api/editor', contentSafetyMiddleware, editorRoutes);
app.use('/api', contentSafetyMiddleware, maulaEditorAppRoutes);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'maula-backend',
        version: '7.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// STATUS ROUTE
// ============================================================================

app.get('/api/status', async (req, res) => {
    let dbOk = false;
    let stripeOk = false;
    try { await prisma.$queryRaw`SELECT 1`; dbOk = true; } catch { }
    try { stripeOk = !!process.env.STRIPE_SECRET_KEY; } catch { }
    res.json({
        success: true,
        database: dbOk,
        stripe: stripeOk,
        message: 'Maula Editor API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================================================
// ADMIN STATS (public — page views, user counts)
// ============================================================================

app.get('/api/admin/stats', async (req, res) => {
    try {
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [totalUsers, totalViews, todayViews, recentViews] = await Promise.all([
            prisma.user.count(),
            prisma.pageView.count().catch(() => 0),
            prisma.pageView.count({ where: { createdAt: { gte: dayStart } } }).catch(() => 0),
            prisma.pageView.count({ where: { createdAt: { gte: fiveMinAgo } } }).catch(() => 0),
        ]);

        res.json({
            totalUsers,
            totalViews,
            todayViews,
            uniqueVisitors: totalUsers,
            activeNow: recentViews,
        });
    } catch (err) {
        log.error('[Admin] stats error:', err.message);
        res.json({ totalUsers: 0, totalViews: 0, todayViews: 0, uniqueVisitors: 0, activeNow: 0 });
    }
});

// ============================================================================
// DASHBOARD ROUTE (auth required — for StatusPage + DashboardPage)
// ============================================================================

app.get('/api/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // ── Credit aggregation from all 4 databases ──
        // Local credits (maula-editor DB via Prisma)
        const localCredits = await prisma.userCredits.findMany({ where: { userId } });
        const perApp = {};
        localCredits.forEach(c => { perApp[c.appId] = Number(c.balance || 0); });

        // Cross-database credits (neural-chat, canvas-studio, gen-craft-pro via pg)
        // Note: each app has its own separate DB — tables are in the public schema (no prefix needed)
        await Promise.all(
            Object.entries(crossDbPools).map(async ([appId, { pool }]) => {
                try {
                    const result = await pool.query(
                        `SELECT uc.app_id, uc.balance FROM user_credits uc JOIN users u ON uc.user_id = u.id WHERE u.email = $1`,
                        [userEmail]
                    );
                    for (const row of result.rows) {
                        perApp[row.app_id] = Number(row.balance || 0);
                    }
                } catch (err) {
                    log.warn(`[Dashboard] Cross-DB query failed for ${appId}:`, err.message);
                    if (!perApp[appId]) perApp[appId] = 0;
                }
            })
        );

        const totalBalance = Object.values(perApp).reduce((s, v) => s + v, 0);
        const totalSpent = localCredits.reduce((s, c) => s + Number(c.lifetimeSpent || 0), 0);

        // Usage stats
        const [todayLogs, weekLogs, monthLogs] = await Promise.all([
            prisma.usageLog.findMany({ where: { userId, createdAt: { gte: dayStart } } }).catch(() => []),
            prisma.usageLog.findMany({ where: { userId, createdAt: { gte: weekAgo } } }).catch(() => []),
            prisma.usageLog.findMany({ where: { userId, createdAt: { gte: monthAgo } } }).catch(() => []),
        ]);

        const creditsToday = todayLogs.reduce((s, l) => s + Number(l.creditsCost || 0), 0);
        const creditsWeek = weekLogs.reduce((s, l) => s + Number(l.creditsCost || 0), 0);
        const creditsMonth = monthLogs.reduce((s, l) => s + Number(l.creditsCost || 0), 0);

        // Per-app usage breakdown (local = maula-editor)
        const appIds = ['neural-chat', 'canvas-studio', 'maula-editor', 'gen-craft-pro'];
        const appUsage = {};
        for (const appId of appIds) {
            const appLogs = monthLogs.filter(l => l.sourceApp === appId);
            appUsage[appId] = {
                credits: appLogs.reduce((s, l) => s + Number(l.creditsCost || 0), 0),
                requests: appLogs.length,
                percent: 0, // calculated after cross-DB merge
            };
        }

        // ── Cross-DB usage aggregation (neural-chat, canvas-studio, gen-craft-pro) ──
        let xCreditsToday = 0, xCreditsWeek = 0, xCreditsMonth = 0;
        let xReqToday = 0, xReqWeek = 0, xReqMonth = 0;
        const crossRecentRows = [];
        const appIcons = { 'neural-chat': '🧠', 'canvas-studio': '🎨', 'maula-editor': '💻', 'gen-craft-pro': '⚡' };

        await Promise.all(
            Object.entries(crossDbPools).map(async ([appId, { pool }]) => {
                try {
                    const r = await pool.query(
                        `SELECT ul.credits_cost, ul.created_at, ul.endpoint, ul.model, ul.source_app
                         FROM usage_logs ul
                         JOIN users u ON ul.user_id = u.id
                         WHERE u.email = $1 AND ul.created_at >= $2
                         ORDER BY ul.created_at DESC`,
                        [userEmail, monthAgo]
                    );
                    for (const row of r.rows) {
                        const cost = Number(row.credits_cost || 0);
                        const ts = new Date(row.created_at);
                        const src = row.source_app || appId;
                        xCreditsMonth += cost; xReqMonth += 1;
                        if (ts >= weekAgo) { xCreditsWeek += cost; xReqWeek += 1; }
                        if (ts >= dayStart) { xCreditsToday += cost; xReqToday += 1; }
                        if (appUsage[src]) {
                            appUsage[src].credits += cost;
                            appUsage[src].requests += 1;
                        }
                        crossRecentRows.push({
                            id: `x-${appId}-${row.created_at.getTime?.() || Date.now()}`,
                            app: src, icon: appIcons[src] || '📡',
                            action: `${row.endpoint || 'AI'} request via ${row.model || 'unknown'}`,
                            credits: cost, time: row.created_at,
                        });
                    }
                } catch (err) {
                    log.warn(`[Dashboard] Cross-DB usage failed for ${appId}:`, err.message);
                }
            })
        );

        // Recalculate percents after merge
        const totalReqAll = Object.values(appUsage).reduce((s, a) => s + a.requests, 0) || 1;
        for (const appId of appIds) {
            appUsage[appId].percent = Math.round((appUsage[appId].requests / totalReqAll) * 100);
        }

        const totalCreditsToday = creditsToday + xCreditsToday;
        const totalCreditsWeek = creditsWeek + xCreditsWeek;
        const totalCreditsMonth = creditsMonth + xCreditsMonth;
        const totalReqToday = todayLogs.length + xReqToday;
        const totalReqWeek = weekLogs.length + xReqWeek;
        const totalReqMonth = monthLogs.length + xReqMonth;

        // Recent activity — merge local + cross-DB, sort newest first, take top 15
        const localRecentLogs = await prisma.usageLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15,
        }).catch(() => []);

        const localRecentActivity = localRecentLogs.map(l => ({
            id: l.id, app: l.sourceApp || 'maula-editor',
            icon: appIcons[l.sourceApp] || '📡',
            action: `${l.endpoint || 'AI'} request via ${l.model || 'unknown'}`,
            credits: Number(l.creditsCost || 0), time: l.createdAt,
        }));

        const recentActivity = [...localRecentActivity, ...crossRecentRows]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 15);

        // Transactions — CreditTransaction links via userCreditsId, not userId directly
        const creditIds = localCredits.map(c => c.id);
        const transactions = creditIds.length > 0
            ? await prisma.creditTransaction.findMany({
                where: { userCreditsId: { in: creditIds } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }).catch(() => [])
            : [];

        const weekChange = totalReqWeek > 0 ? Math.round(((totalReqToday * 7) / totalReqWeek - 1) * 100) : 0;

        res.json({
            success: true,
            dashboard: {
                user: { id: req.user.id, email: req.user.email, name: req.user.name || '' },
                credits: { balance: totalBalance, lifetimeSpent: totalSpent, perApp },
                stats: {
                    creditsUsedToday: totalCreditsToday,
                    creditsUsedWeek: totalCreditsWeek,
                    creditsUsedMonth: totalCreditsMonth,
                    requestsToday: totalReqToday,
                    requestsWeek: totalReqWeek,
                    requestsMonth: totalReqMonth,
                    weeklyChange: weekChange,
                },
                apps: { active: Object.values(appUsage).filter(a => a.requests > 0).length || 4, total: 4, usage: appUsage },
                recentActivity,
                transactions: transactions.map(t => ({
                    id: t.id, type: t.type, amount: Number(t.amount || 0),
                    description: t.description || '', createdAt: t.createdAt,
                })),
            },
        });
    } catch (err) {
        log.error('[Dashboard] Error:', err.message);
        res.json({
            success: true,
            dashboard: {
                user: { id: req.user.id, email: req.user.email, name: req.user.name || '' },
                credits: { balance: 0, lifetimeSpent: 0, perApp: {} },
                stats: { creditsUsedToday: 0, creditsUsedWeek: 0, creditsUsedMonth: 0, requestsToday: 0, requestsWeek: 0, requestsMonth: 0, weeklyChange: 0 },
                apps: { active: 0, total: 4, usage: {} },
                recentActivity: [],
                transactions: [],
            },
        });
    }
});

// ============================================================================
// USAGE STATS (auth required)
// ============================================================================

app.get('/api/usage/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const logs = await prisma.usageLog.findMany({
            where: { userId, createdAt: { gte: thirtyDaysAgo } },
            select: { provider: true, totalTokens: true, creditsCost: true, createdAt: true },
        }).catch(() => []);

        const totalTokens = logs.reduce((s, l) => s + (l.totalTokens || 0), 0);
        const totalCredits = logs.reduce((s, l) => s + Number(l.creditsCost || 0), 0);

        // By provider
        const providerMap = {};
        logs.forEach(l => {
            const p = l.provider || 'unknown';
            if (!providerMap[p]) providerMap[p] = { provider: p, tokens: 0, credits: 0, requests: 0 };
            providerMap[p].tokens += l.totalTokens || 0;
            providerMap[p].credits += Number(l.creditsCost || 0);
            providerMap[p].requests += 1;
        });

        // Daily breakdown
        const dailyMap = {};
        logs.forEach(l => {
            const d = new Date(l.createdAt).toISOString().slice(0, 10);
            if (!dailyMap[d]) dailyMap[d] = { date: d, tokens: 0, credits: 0, requests: 0 };
            dailyMap[d].tokens += l.totalTokens || 0;
            dailyMap[d].credits += Number(l.creditsCost || 0);
            dailyMap[d].requests += 1;
        });

        res.json({
            success: true,
            stats: {
                total: { tokens: totalTokens, credits: totalCredits, requests: logs.length },
                byProvider: Object.values(providerMap),
                daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
            },
        });
    } catch (err) {
        log.error('[Usage] Stats error:', err.message);
        res.json({ success: true, stats: { total: { tokens: 0, credits: 0, requests: 0 }, byProvider: [], daily: [] } });
    }
});

// ============================================================================
// CHAT DASHBOARD STATS (auth required — AI performance)
// ============================================================================

app.get('/api/chat/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const sourceApp = req.query.sourceApp || 'maula-editor';
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [totalLogs, todayLogs, recentLogs] = await Promise.all([
            prisma.usageLog.count({ where: { userId, sourceApp } }).catch(() => 0),
            prisma.usageLog.count({ where: { userId, sourceApp, createdAt: { gte: dayStart } } }).catch(() => 0),
            prisma.usageLog.findMany({
                where: { userId, sourceApp, createdAt: { gte: thirtyDaysAgo } },
                select: { totalTokens: true, creditsCost: true, latencyMs: true, success: true, createdAt: true },
            }).catch(() => []),
        ]);

        const totalTokens = recentLogs.reduce((s, l) => s + (l.totalTokens || 0), 0);
        const successCount = recentLogs.filter(l => l.success).length;
        const successRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 100;
        const avgLatency = recentLogs.length > 0
            ? Math.round(recentLogs.reduce((s, l) => s + (l.latencyMs || 0), 0) / recentLogs.length)
            : 0;
        const costToday = recentLogs.filter(l => l.createdAt >= dayStart).reduce((s, l) => s + Number(l.creditsCost || 0), 0);

        res.json({
            success: true,
            stats: {
                tokensUsed: totalTokens,
                tokensLimit: 500000,
                successRate: Math.round(successRate * 10) / 10,
                avgLatency,
                requestsToday: todayLogs,
                totalRequests: totalLogs,
                costToday: Math.round(costToday * 100) / 100,
                uptime: 99.9,
            },
        });
    } catch (err) {
        log.error('[Chat] Dashboard stats error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// ============================================================================
// HOSTING DASHBOARD (auth required — for DashboardPage hosting tab)
// ============================================================================

app.get('/api/hosting/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const apps = await prisma.hostedApp.findMany({ where: { userId }, include: { versions: { take: 1, orderBy: { createdAt: 'desc' } } } }).catch(() => []);
        res.json({
            success: true,
            apps: apps.map(a => ({
                id: a.id, name: a.name, subdomain: a.subdomain, status: a.status,
                framework: a.framework, lastDeployed: a.versions?.[0]?.createdAt || a.updatedAt,
            })),
            totalApps: apps.length,
        });
    } catch (err) {
        log.error('[Hosting] Dashboard error:', err.message);
        res.json({ success: true, apps: [], totalApps: 0 });
    }
});

// ============================================================================
// DOCKER API (Remote Development - requires Docker daemon)
// ============================================================================

const dockerLog = createLogger('Docker');

app.get('/api/docker/containers', requireAuth, async (req, res) => {
    if (!docker) return res.json({ success: true, containers: [], error: 'Docker not available on this server' });
    try {
        const containers = await docker.listContainers({ all: true });
        res.json({ success: true, containers: containers.map(c => ({
            id: c.Id.slice(0, 12),
            name: (c.Names[0] || '').replace(/^\//, ''),
            image: c.Image,
            status: c.State,
            state: c.Status,
            ports: (c.Ports || []).map(p => ({ host: p.PublicPort, container: p.PrivatePort, protocol: p.Type })),
            created: new Date(c.Created * 1000),
        }))});
    } catch (err) {
        dockerLog.error('List containers error:', err.message);
        res.json({ success: true, containers: [], error: err.message });
    }
});

app.get('/api/docker/images', requireAuth, async (req, res) => {
    if (!docker) return res.json({ success: true, images: [], error: 'Docker not available on this server' });
    try {
        const images = await docker.listImages();
        res.json({ success: true, images: images.map(img => ({
            id: (img.Id || '').replace('sha256:', '').slice(0, 12),
            repository: (img.RepoTags?.[0] || '<none>').split(':')[0],
            tag: (img.RepoTags?.[0] || '<none>:<none>').split(':')[1] || 'latest',
            created: new Date(img.Created * 1000),
            size: img.Size,
        }))});
    } catch (err) {
        dockerLog.error('List images error:', err.message);
        res.json({ success: true, images: [], error: err.message });
    }
});

app.post('/api/docker/containers/:id/start', requireAuth, async (req, res) => {
    if (!docker) return res.status(503).json({ success: false, error: 'Docker not available' });
    try {
        const container = docker.getContainer(req.params.id);
        await container.start();
        res.json({ success: true });
    } catch (err) {
        dockerLog.error('Start container error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/docker/containers/:id/stop', requireAuth, async (req, res) => {
    if (!docker) return res.status(503).json({ success: false, error: 'Docker not available' });
    try {
        const container = docker.getContainer(req.params.id);
        await container.stop();
        res.json({ success: true });
    } catch (err) {
        dockerLog.error('Stop container error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/docker/containers/:id/restart', requireAuth, async (req, res) => {
    if (!docker) return res.status(503).json({ success: false, error: 'Docker not available' });
    try {
        const container = docker.getContainer(req.params.id);
        await container.restart();
        res.json({ success: true });
    } catch (err) {
        dockerLog.error('Restart container error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/docker/containers/:id', requireAuth, async (req, res) => {
    if (!docker) return res.status(503).json({ success: false, error: 'Docker not available' });
    try {
        const container = docker.getContainer(req.params.id);
        await container.remove({ force: req.query.force === 'true' });
        res.json({ success: true });
    } catch (err) {
        dockerLog.error('Remove container error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/docker/containers/:id/logs', requireAuth, async (req, res) => {
    if (!docker) return res.status(503).json({ success: false, error: 'Docker not available' });
    try {
        const container = docker.getContainer(req.params.id);
        const tail = parseInt(req.query.tail) || 100;
        const logs = await container.logs({ stdout: true, stderr: true, tail, timestamps: true });
        const lines = logs.toString('utf8').split('\n').filter(Boolean);
        res.json({ success: true, logs: lines });
    } catch (err) {
        dockerLog.error('Container logs error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/docker/volumes', requireAuth, async (req, res) => {
    if (!docker) return res.json({ success: true, volumes: [], error: 'Docker not available' });
    try {
        const result = await docker.listVolumes();
        res.json({ success: true, volumes: (result.Volumes || []).map(v => ({
            name: v.Name,
            driver: v.Driver,
            mountpoint: v.Mountpoint,
            created: new Date(v.CreatedAt),
        }))});
    } catch (err) {
        dockerLog.error('List volumes error:', err.message);
        res.json({ success: true, volumes: [], error: err.message });
    }
});

app.get('/api/docker/networks', requireAuth, async (req, res) => {
    if (!docker) return res.json({ success: true, networks: [], error: 'Docker not available' });
    try {
        const networks = await docker.listNetworks();
        res.json({ success: true, networks: networks.map(n => ({
            id: n.Id.slice(0, 12),
            name: n.Name,
            driver: n.Driver,
            scope: n.Scope,
        }))});
    } catch (err) {
        dockerLog.error('List networks error:', err.message);
        res.json({ success: true, networks: [], error: err.message });
    }
});

// ============================================================================
// START SERVER
// ============================================================================

// ============================================================================
// SOCKET.IO SERVER
// ============================================================================

const io = new SocketIOServer(httpServer, {
    cors: {
        origin: [
            'https://editor.maula.ai',
            'https://maula.ai',
            'http://localhost:3000',
            'http://localhost:5173',
        ],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// ── Socket.IO authentication middleware ──────────────────────────────────────
// Rejects connections that don't carry a valid JWT.
// The client must pass the token as:
//   socket = io(URL, { auth: { token: '<jwt>' } })
// or as a Bearer header.
io.use(async (socket, next) => {
    try {
        // 1. Try handshake auth object  (preferred — works in all transports)
        let token = socket.handshake.auth?.token;

        // 2. Fall back to Authorization header
        if (!token) {
            const authHeader = socket.handshake.headers?.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            }
        }

        // 3. Fall back to cookie
        if (!token && socket.handshake.headers?.cookie) {
            const cookieStr = socket.handshake.headers.cookie;
            const match = cookieStr.match(/(?:^|;\s*)(?:maula_editor_session|auth_token)=([^;]+)/);
            if (match) token = decodeURIComponent(match[1]);
        }

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);

        // Resolve user from DB (same logic as requireAuth)
        let user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user && payload.email) {
            user = await prisma.user.findUnique({ where: { email: payload.email } });
        }

        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user to socket for downstream handlers
        socket.data.user = { id: user.id, email: user.email, name: user.name };
        next();
    } catch (err) {
        log.info('[Socket.IO] Auth failed:', err.message);
        next(new Error('Authentication failed'));
    }
});

// ── Per-socket PTY session map ────────────────────────────────────────────────
// Scoped inside the connection handler so PTYs are automatically GC'd when the
// socket disconnects and the map goes out of scope.

io.on('connection', async (socket) => {
    const user = socket.data.user;
    log.info(`[Socket.IO] Client connected: ${socket.id} (user: ${user.email})`);

    // terminalId → pty process for this socket's lifetime
    const socketPtys = new Map();

    // Lazy-import node-pty (native module — import once, reuse)
    let pty;
    try {
        pty = (await import('node-pty')).default;
    } catch (e) {
        log.error('[Terminal] node-pty unavailable:', e.message);
    }

    // ------------------------------------------------------------------
    // TERMINAL EVENTS
    // ------------------------------------------------------------------

    socket.on('terminal:create', (options) => {
        const terminalId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const cols = Math.max(10, Math.min(options?.cols || 80, 500));
        const rows = Math.max(2, Math.min(options?.rows || 24, 200));

        if (!pty) {
            socket.emit('terminal:created', { terminalId });
            socket.emit('terminal:output', {
                terminalId,
                data: '\r\n\x1b[31m[Maula Editor]\x1b[0m Terminal backend not available.\r\n',
            });
            return;
        }

        // Sandboxed workspace per user
        const workDir = path.join(os.tmpdir(), 'maula-sessions', user.id);
        try { fsSync.mkdirSync(workDir, { recursive: true }); } catch { }

        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

        try {
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols,
                rows,
                cwd: workDir,
                env: {
                    ...process.env,
                    HOME: workDir,
                    TERM: 'xterm-256color',
                    // Remove credentials from env for security
                    JWT_SECRET: undefined,
                    MAULA_EDITOR_JWT_SECRET: undefined,
                    DATABASE_URL: undefined,
                    CANVAS_STUDIO_DATABASE_URL: undefined,
                    GEN_CRAFT_PRO_DATABASE_URL: undefined,
                    NEURAL_CHAT_DATABASE_URL: undefined,
                    STRIPE_SECRET_KEY: undefined,
                    OPENAI_API_KEY: undefined,
                    ANTHROPIC_API_KEY: undefined,
                    GOOGLE_API_KEY: undefined,
                },
            });

            socketPtys.set(terminalId, ptyProcess);
            ptyProcess._lastActivity = Date.now();

            ptyProcess.onData((data) => {
                socket.emit('terminal:output', { terminalId, data });
            });

            ptyProcess.onExit(({ exitCode }) => {
                socket.emit('terminal:exit', { terminalId, exitCode });
                socketPtys.delete(terminalId);
            });

            socket.emit('terminal:created', { terminalId });
            log.info(`[Terminal] PTY created: ${terminalId} for user ${user.id}`);
        } catch (err) {
            log.error('[Terminal] PTY spawn failed:', err.message);
            socket.emit('terminal:error', { terminalId, error: 'Failed to create terminal session' });
        }
    });

    socket.on('terminal:input', ({ terminalId, input }) => {
        const ptyProcess = socketPtys.get(terminalId);
        if (ptyProcess) {
            ptyProcess._lastActivity = Date.now();
            ptyProcess.write(input);
        }
    });

    socket.on('terminal:resize', ({ terminalId, cols, rows }) => {
        const ptyProcess = socketPtys.get(terminalId);
        if (ptyProcess) {
            ptyProcess.resize(
                Math.max(10, Math.min(cols || 80, 500)),
                Math.max(2, Math.min(rows || 24, 200)),
            );
        }
    });

    socket.on('terminal:kill', ({ terminalId }) => {
        const ptyProcess = socketPtys.get(terminalId);
        if (ptyProcess) {
            try { ptyProcess.kill(); } catch { }
            socketPtys.delete(terminalId);
        }
        socket.emit('terminal:exit', { terminalId, exitCode: 0 });
    });

    // ------------------------------------------------------------------
    // AI EVENTS (delegated to HTTP AI routes via aiService)
    // ------------------------------------------------------------------

    socket.on('ai:chat:stream', async ({ messages, provider, model }) => {
        socket.emit('ai:chat:chunk', { content: 'Use the AI chat panel (right sidebar) for streaming AI chat. Socket-based streaming is handled via the HTTP SSE endpoint at /api/ai/chat/stream.' });
        socket.emit('ai:chat:done');
    });

    socket.on('ai:complete', ({ prefix, suffix, language }) => {
        socket.emit('ai:complete:result', { completion: '' });
    });

    socket.on('ai:agent:message', ({ message, agentType, projectContext }) => {
        socket.emit('ai:agent:status', { status: 'processing', agent: agentType || 'orchestrator' });
        socket.emit('ai:agent:response', { response: 'Agent system available via HTTP API.' });
    });

    // ------------------------------------------------------------------
    // PTY IDLE TIMEOUT — auto-kill terminals idle > 10 minutes
    // ------------------------------------------------------------------

    const idleCheckInterval = setInterval(() => {
        const now = Date.now();
        for (const [terminalId, ptyProcess] of socketPtys) {
            if (now - (ptyProcess._lastActivity || 0) > 600000) {
                log.info(`[Terminal] Auto-killing idle terminal ${terminalId} after 10 min`);
                try { ptyProcess.kill(); } catch { }
                socketPtys.delete(terminalId);
                socket.emit('terminal:exit', { terminalId, exitCode: 0 });
            }
        }
    }, 60000);

    // ------------------------------------------------------------------
    // DISCONNECT — kill all PTYs for this socket
    // ------------------------------------------------------------------

    socket.on('disconnect', (reason) => {
        clearInterval(idleCheckInterval);
        for (const [terminalId, ptyProcess] of socketPtys) {
            try { ptyProcess.kill(); } catch { }
        }
        socketPtys.clear();
        log.info(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
});

// ============================================================================
// WEBSOCKET — Sandbox output (/api/sandbox/:sessionId/output)
// ============================================================================

const sandboxWss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
    // Y.js Collaboration: /collaboration/{docName}
    const collabMatch = req.url?.match(/^\/collaboration\/(.+)$/);
    if (collabMatch) {
        const docName = decodeURIComponent(collabMatch[1]);
        collabWss.handleUpgrade(req, socket, head, (ws) => {
            collabWss.emit('connection', ws, req, docName);
        });
        return;
    }

    // Sandbox output: /api/sandbox/:sessionId/output
    const sandboxMatch = req.url?.match(/^\/api\/sandbox\/([^/]+)\/output$/);
    if (sandboxMatch) {
        sandboxWss.handleUpgrade(req, socket, head, (ws) => sandboxWss.emit('connection', ws, req));
    }
    // Non-matching upgrades are handled by Socket.IO's own listener
});

sandboxWss.on('connection', (ws, req) => {
    const match = req.url?.match(/^\/api\/sandbox\/([^/]+)\/output$/);
    const sessionId = match?.[1] || 'unknown';
    log.info(`[Sandbox WS] Client connected for session: ${sessionId}`);
    ws.send(JSON.stringify({ type: 'system', data: 'Sandbox WebSocket connected. Use the REST API at /api/sandbox/ to start and interact with sandbox sessions.' }));
});

httpServer.listen(PORT, () => {
    log.info(`🚀 Maula Editor Backend running on port ${PORT}`);
    log.info(`🔌 Socket.IO server active`);
});