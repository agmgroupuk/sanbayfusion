/**
 * MAULA EDITOR APP ROUTES
 * =======================
 * Handles auth/me, auth/register, billing, chat/send, ai/chat,
 * ai/image, canvas/stream, secrets, v1/projects, v1/files, LSP,
 * media, sandbox, and extensions endpoints needed by the
 * Maula Editor frontend.
 */

import { Router } from 'express';
import * as jose from 'jose';
import OpenAI from 'openai';
import pg from 'pg';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../lib/logger.js';
import { AIService } from '../services/aiService.js';
import { ALL_TOOLS as ALL_TOOL_DEFINITIONS, executeTool } from '../services/toolsHeadquarters.js';
import AgentOrchestrator from '../services/agentOrchestrator.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';

const router = Router();
const log = createLogger('Routes');

const JWT_SECRET = process.env.MAULA_EDITOR_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret';
const APP_ID = 'maula-editor';

// ── Main DB pool for cross-domain session SSO (same pattern as canvas-app/studio) ──
// Strip sslmode from URL — newer pg lib treats sslmode=require as verify-full,
// overriding our explicit ssl config and causing "self-signed certificate" errors
const mainDbUrl = process.env.MAIN_DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '') || '';
const mainDbPool = mainDbUrl
    ? new pg.Pool({ connectionString: mainDbUrl, max: 5, idleTimeoutMillis: 30000, ssl: { rejectUnauthorized: false } })
    : null;

// ============================================================================
// AUTH MIDDLEWARE — matches canvas.sanbayfusion.com / studio.sanbayfusion.com pattern
// Priority: 1) sanbayfusion.com session cookies  2) editor JWT tokens
// ============================================================================

async function requireAuth(req, res, next) {
    try {
        // 1) Try sanbayfusion.com session cookies first (sessionId / session_id)
        //    Set by main site with domain=.sanbayfusion.com, shared across all subdomains
        const mainSessionId = req.cookies?.sessionId || req.cookies?.session_id;
        if (mainSessionId && mainDbPool) {
            try {
                const result = await mainDbPool.query(
                    'SELECT id, email, name, role, "sessionExpiry" FROM "User" WHERE "sessionId" = $1',
                    [mainSessionId]
                );
                const mainUser = result.rows[0];
                if (mainUser && (!mainUser.sessionExpiry || new Date(mainUser.sessionExpiry) > new Date())) {
                    // Found valid session — auto-provision in editor DB if needed
                    let editorUser = await prisma.user.findUnique({ where: { email: mainUser.email }, include: { credits: true } });
                    if (!editorUser) {
                        editorUser = await prisma.user.create({
                            data: {
                                email: mainUser.email,
                                name: mainUser.name || mainUser.email.split('@')[0],
                                passwordHash: 'cross-domain-sso',
                                isVerified: true,
                                credits: { create: { appId: APP_ID, balance: 5, freeCreditsMax: 5 } },
                            },
                            include: { credits: true },
                        });
                        log.info(`[requireAuth] Auto-provisioned user ${mainUser.email} via sanbayfusion.com session SSO`);
                    }
                    req.user = editorUser;
                    return next();
                }
            } catch (dbErr) {
                log.warn('[requireAuth] Main DB session lookup failed:', dbErr.message);
                // Fall through to JWT check
            }
        }

        // 2) Try editor-specific JWT tokens (maula_editor_session / auth_token)
        const jwtToken =
            req.cookies?.maula_editor_session ||
            req.cookies?.auth_token ||
            req.headers.authorization?.replace('Bearer ', '');

        if (jwtToken) {
            const { payload } = await jose.jwtVerify(jwtToken, new TextEncoder().encode(JWT_SECRET));
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
                            credits: { create: { appId: APP_ID, balance: 5, freeCreditsMax: 5 } },
                        },
                        include: { credits: true },
                    });
                    log.info(`[requireAuth] Auto-provisioned user ${payload.email} via JWT SSO`);
                }
            }
            if (user) {
                req.user = user;
                return next();
            }
        }

        return res.status(401).json({ success: false, error: 'Authentication required' });
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
}

// ============================================================================
// AUTH ROUTES — /api/auth/*
// ============================================================================

// GET /api/auth/me — frontend calls this via auth.tsx
router.get('/auth/me', async (req, res) => {
    try {
        const token =
            req.cookies?.maula_editor_session ||
            req.cookies?.auth_token ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });

        const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(JWT_SECRET));

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { credits: true },
        });

        if (!user) return res.status(401).json({ success: false, error: 'User not found' });

        res.json({
            success: true,
            user: { id: user.id, email: user.email, name: user.name, credits: user.credits },
        });
    } catch {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// ============================================================================
// BILLING ROUTES — /api/billing/*
// ============================================================================

router.get('/billing/credits', requireAuth, async (req, res) => {
    try {
        const appId = req.query.app || APP_ID;
        const credits = await prisma.userCredits.findFirst({
            where: { userId: req.user.id, appId },
        });
        res.json({
            success: true,
            credits: credits
                ? { balance: credits.balance, freeCreditsMax: credits.freeCreditsMax }
                : { balance: 0, freeCreditsMax: 5 },
        });
    } catch {
        res.json({ success: true, credits: { balance: 0, freeCreditsMax: 5 } });
    }
});

router.post('/billing/checkout/:appId', requireAuth, async (req, res) => {
    try {
        const Stripe = (await import('stripe')).default;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) return res.status(503).json({ success: false, error: 'Stripe not configured' });

        const stripe = new Stripe(stripeKey);
        const { priceId, packageId, credits: reqCredits, price: reqPrice } = req.body;

        let lineItems;
        let credits = 0;

        if (priceId && typeof priceId === 'string' && priceId.startsWith('price_')) {
            const pkg = await prisma.creditPackage.findFirst({ where: { stripePriceId: priceId } }).catch(() => null);
            if (pkg) credits = Number(pkg.credits);
            lineItems = [{ price: priceId, quantity: 1 }];
        } else {
            const PACKAGES = {
                'starter': { name: '50 Credits', credits: 50, priceCents: 500 },
                'basic': { name: '250 Credits', credits: 250, priceCents: 2500 },
                'pro': { name: '1,000 Credits', credits: 1000, priceCents: 10000 },
                'business': { name: '2,500 Credits', credits: 2500, priceCents: 25000 },
                'enterprise': { name: '5,000 Credits', credits: 5000, priceCents: 50000 },
                'nc-50': { name: '50 Credits', credits: 50, priceCents: 500 },
                'nc-100': { name: '100 Credits', credits: 100, priceCents: 1000 },
                'nc-350': { name: '350 Credits', credits: 350, priceCents: 3500 },
                'nc-600': { name: '600 Credits', credits: 600, priceCents: 6000 },
                'nc-1500': { name: '1,500 Credits', credits: 1500, priceCents: 15000 },
            };
            let pkg = packageId ? PACKAGES[packageId] : null;
            if (!pkg && reqCredits && reqPrice) {
                pkg = { name: `${reqCredits} Credits`, credits: Number(reqCredits), priceCents: Math.round(Number(reqPrice) * 100) };
            }
            if (!pkg) return res.status(400).json({ success: false, error: 'Invalid package — provide priceId, packageId, or credits+price' });
            credits = pkg.credits;
            lineItems = [{ price_data: { currency: 'usd', product_data: { name: `OneLast AI - ${pkg.name}` }, unit_amount: pkg.priceCents }, quantity: 1 }];
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: lineItems,
            success_url: `https://sanbayfusion.com/payment/success?session_id={CHECKOUT_SESSION_ID}&app=maula-editor&credits=${credits}&agent=Maula+Editor&slug=maula-editor`,
            cancel_url: `https://sanbayfusion.com/overview/pricing?purchase=cancelled&app=maula-editor`,
            metadata: { userId: req.user.id, appId: req.params.appId, credits: String(credits), priceId: priceId || '', packageId: packageId || '' },
        });

        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (error) {
        log.error('[Billing] Checkout error:', error.message);
        res.status(500).json({ success: false, error: 'Checkout failed' });
    }
});

router.post('/billing/fulfill', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.json({ success: false, error: 'sessionId required' });

        const Stripe = (await import('stripe')).default;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) return res.json({ success: false, error: 'Stripe not configured' });

        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.json({ success: false, error: 'Payment not completed', status: session.payment_status });
        }

        const { userId, appId, credits } = session.metadata || {};
        if (!userId) return res.json({ success: false, error: 'No userId in session metadata' });

        if (req.user?.id && req.user.id !== userId) {
            return res.status(403).json({ success: false, error: 'Session does not belong to this user' });
        }

        const stripePaymentId = session.payment_intent || session.id;
        const creditsToAdd = parseFloat(credits) || 0;

        const existing = await prisma.billingHistory.findUnique({ where: { stripePaymentId } });
        if (existing) {
            const creditRecord = await prisma.userCredits.findUnique({ where: { userId_appId: { userId, appId: appId || 'maula-editor' } } });
            return res.json({ success: true, alreadyFulfilled: true, balance: Number(creditRecord?.balance || 0) });
        }

        if (creditsToAdd > 0) {
            // Verify user exists (foreign key safety)
            const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (!userExists) {
                log.warn(`[Fulfill] User ${userId} not found — skipping credit add`);
                return res.json({ success: false, error: 'User not found' });
            }
            await prisma.userCredits.upsert({
                where: { userId_appId: { userId, appId: appId || 'maula-editor' } },
                update: { balance: { increment: creditsToAdd }, lifetimeEarned: { increment: creditsToAdd } },
                create: { userId, appId: appId || 'maula-editor', balance: creditsToAdd, lifetimeEarned: creditsToAdd, freeCreditsMax: 5 },
            });
            await prisma.billingHistory.create({
                data: { userId, stripePaymentId, stripeCustomerId: session.customer, amount: (session.amount_total || 0) / 100, currency: session.currency || 'usd', creditsAdded: creditsToAdd, status: 'SUCCEEDED', description: `${creditsToAdd} credits purchased via Stripe`, metadata: { sessionId: session.id, appId, source: 'fulfill-endpoint' } },
            });
            const creditRecord = await prisma.userCredits.findUnique({ where: { userId_appId: { userId, appId: appId || 'maula-editor' } } });
            log.info(`[Fulfill] Added ${creditsToAdd} credits to user ${userId} (app: ${appId})`);
            return res.json({ success: true, credited: true, balance: Number(creditRecord?.balance || 0) });
        }
        res.json({ success: false, error: 'No credits to add' });
    } catch (err) {
        log.error('[Billing] Fulfill error:', err.message);
        res.json({ success: false, error: 'Failed to fulfill' });
    }
});

router.post('/billing/verify', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.json({ success: false, error: 'sessionId required' });

        const Stripe = (await import('stripe')).default;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) return res.json({ success: false, verified: false });

        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            // Send purchase confirmation email (async)
            if (req.user?.email) {
                const meta = session.metadata || {};
                emailService.sendPurchaseConfirmation(req.user.email, req.user.name || '', {
                    credits: meta.credits || '—',
                    amount: (session.amount_total || 0) / 100,
                    currency: session.currency || 'usd',
                    appName: meta.appId || 'Maula Editor',
                    packageId: meta.packageId || '—',
                    transactionId: session.id,
                }).catch(e => log.error('[Email] Purchase email failed:', e.message));
            }
            res.json({ success: true, verified: true, status: session.payment_status });
        } else {
            res.json({ success: false, verified: false, status: session.payment_status });
        }
    } catch (error) {
        log.error('[Billing] Verify error:', error.message);
        res.json({ success: false, verified: false });
    }
});

router.get('/billing/packages/:appId', async (req, res) => {
    try {
        const packages = await prisma.creditPackage.findMany({
            where: { appId: req.params.appId, isActive: true },
            orderBy: { credits: 'asc' },
        });
        if (packages.length === 0) {
            return res.json({
                success: true,
                packages: [
                    { id: 'starter', name: 'Starter', credits: 50, price: 5, stripePriceId: null },
                    { id: 'basic', name: 'Basic', credits: 250, price: 25, stripePriceId: null },
                    { id: 'pro', name: 'Pro', credits: 1000, price: 100, stripePriceId: null },
                    { id: 'business', name: 'Business', credits: 2500, price: 250, stripePriceId: null },
                    { id: 'enterprise', name: 'Enterprise', credits: 5000, price: 500, stripePriceId: null },
                ],
            });
        }
        res.json({ success: true, packages });
    } catch {
        res.json({ success: true, packages: [] });
    }
});

// ============================================================================
// CHAT ROUTES — /api/chat/*
// Uses server-managed API keys, deducts credits as appId: 'maula-editor'
// ============================================================================

router.post('/chat/send', requireAuth, async (req, res) => {
    try {
        const {
            messages,
            provider = 'mistral',
            model,
            stream = false,
            appId = APP_ID,
        } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'Messages array required' });
        }

        const aiService = new AIService(req.user);

        // Check credits
        const userCredit = Array.isArray(req.user?.credits)
            ? req.user.credits.find(c => c.appId === appId)
            : null;
        if (userCredit && parseFloat(userCredit.balance) <= 0) {
            return res.status(402).json({ success: false, error: 'Insufficient credits' });
        }

        if (stream) {
            // SSE streaming
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });

            const result = await aiService.chat(messages, provider, model, {
                stream: true,
                creditAppId: appId,
                onToken: (token) => {
                    try { res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`); } catch { }
                },
            });

            res.write(`data: ${JSON.stringify({ type: 'done', content: result.content, tokens: (result.inputTokens || 0) + (result.outputTokens || 0) })}\n\n`);
            res.end();
        } else {
            const result = await aiService.chat(messages, provider, model, { creditAppId: appId });

            res.json({
                success: true,
                content: result.content,
                provider,
                model: result.model || model,
                tokens: (result.inputTokens || 0) + (result.outputTokens || 0),
            });
        }
    } catch (error) {
        log.error('[Chat Send] Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Chat failed' });
    }
});

router.get('/chat/dashboard/usage', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const sourceApp = req.query.sourceApp || APP_ID;

        const usage = await prisma.chatMessage.findMany({
            where: { session: { userId: req.user.id, sourceApp: sourceApp } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                provider: true,
                model: true,
                tokensUsed: true,
                creditsCost: true,
                createdAt: true,
            },
        });

        const totalSpent = usage.reduce((sum, m) => sum + parseFloat(m.creditsCost || 0), 0);

        res.json({ success: true, usage, totalSpent, count: usage.length });
    } catch (error) {
        log.error('[Dashboard Usage] Error:', error);
        res.json({ success: true, usage: [], totalSpent: 0, count: 0 });
    }
});

// ============================================================================
// AI ROUTES — /api/ai/*
// Non-streaming AI chat and image generation
// ============================================================================

router.post('/ai/chat', requireAuth, async (req, res) => {
    try {
        const { messages, provider = 'mistral', model, systemPrompt } = req.body;

        if (!messages) return res.status(400).json({ success: false, error: 'messages required' });

        const aiService = new AIService(req.user);
        const opts = { creditAppId: APP_ID };
        if (systemPrompt) opts.systemPrompt = systemPrompt;

        const result = await aiService.chat(messages, provider, model, opts);

        res.json({
            success: true,
            content: result.content,
            provider,
            model: result.model || model,
        });
    } catch (error) {
        log.error('[AI Chat] Error:', error);
        res.status(500).json({ success: false, error: error.message || 'AI chat failed' });
    }
});

router.post('/ai/chat/stream', requireAuth, async (req, res) => {
    try {
        const { messages, provider = 'mistral', model, systemPrompt } = req.body;

        if (!messages) return res.status(400).json({ success: false, error: 'messages required' });

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const aiService = new AIService(req.user);
        const opts = { stream: true, creditAppId: APP_ID };
        if (systemPrompt) opts.systemPrompt = systemPrompt;

        let fullContent = '';
        opts.onToken = (token) => {
            fullContent += token;
            try { res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`); } catch { }
        };

        const result = await aiService.chat(messages, provider, model, opts);

        res.write(`data: ${JSON.stringify({ type: 'done', content: result.content || fullContent })}\n\n`);
        res.end();
    } catch (error) {
        log.error('[AI Stream] Error:', error);
        try {
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        } catch { }
        res.end();
    }
});

// ============================================================================
// AI IMAGE GENERATION — /api/ai/image/*
// DALL-E image generation, editing, and variations
// ============================================================================

router.get('/ai/image/status', (req, res) => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    res.json({ success: true, available: hasKey, provider: 'openai-dalle' });
});

router.post('/ai/image/generate', requireAuth, async (req, res) => {
    try {
        const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;

        if (!prompt) return res.status(400).json({ success: false, error: 'Prompt required' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return res.status(503).json({ success: false, error: 'DALL-E not configured' });

        // Pre-check credits before making the API call
        const aiService = new AIService(req.user);
        const estimatedCost = quality === 'hd' ? 0.08 : 0.04;
        const hasCredits = await aiService.checkCredits(estimatedCost, 'image', APP_ID);
        if (!hasCredits) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const openai = new OpenAI({ apiKey });
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt,
            size,
            quality,
            n: Math.min(n, 4),
        });

        // Deduct credits
        const cost = quality === 'hd' ? 0.08 : 0.04;
        await aiService.deductCredits(cost, 'openai', 'dall-e-3', 0, 0, null, 'image-generate', APP_ID);

        res.json({
            success: true,
            images: response.data.map(img => ({ url: img.url, revised_prompt: img.revised_prompt })),
        });
    } catch (error) {
        log.error('[AI Image Generate] Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Image generation failed' });
    }
});

router.post('/ai/image/edit', requireAuth, async (req, res) => {
    try {
        const { image, mask, prompt, size = '1024x1024', n = 1 } = req.body;

        if (!image || !prompt) return res.status(400).json({ success: false, error: 'Image and prompt required' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return res.status(503).json({ success: false, error: 'DALL-E not configured' });

        // Pre-check credits before making the API call
        const aiService = new AIService(req.user);
        const hasCredits = await aiService.checkCredits(0.04, 'image', APP_ID);
        if (!hasCredits) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const openai = new OpenAI({ apiKey });

        // Convert base64 to buffer for the API
        const imageBuffer = Buffer.from(image.replace(/^data:.*?;base64,/, ''), 'base64');
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

        const editParams = {
            model: 'dall-e-2',
            image: imageFile,
            prompt,
            size,
            n: Math.min(n, 4),
        };

        if (mask) {
            const maskBuffer = Buffer.from(mask.replace(/^data:.*?;base64,/, ''), 'base64');
            editParams.mask = new File([maskBuffer], 'mask.png', { type: 'image/png' });
        }

        const response = await openai.images.edit(editParams);

        await aiService.deductCredits(0.04, 'openai', 'dall-e-2', 0, 0, null, 'image-edit', APP_ID);

        res.json({
            success: true,
            images: response.data.map(img => ({ url: img.url })),
        });
    } catch (error) {
        log.error('[AI Image Edit] Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Image edit failed' });
    }
});

router.post('/ai/image/variation', requireAuth, async (req, res) => {
    try {
        const { image, size = '1024x1024', n = 1 } = req.body;

        if (!image) return res.status(400).json({ success: false, error: 'Image required' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return res.status(503).json({ success: false, error: 'DALL-E not configured' });

        // Pre-check credits before making the API call
        const aiService = new AIService(req.user);
        const hasCredits = await aiService.checkCredits(0.04, 'image', APP_ID);
        if (!hasCredits) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        const openai = new OpenAI({ apiKey });
        const imageBuffer = Buffer.from(image.replace(/^data:.*?;base64,/, ''), 'base64');
        const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

        const response = await openai.images.createVariation({
            model: 'dall-e-2',
            image: imageFile,
            size,
            n: Math.min(n, 4),
        });

        await aiService.deductCredits(0.04, 'openai', 'dall-e-2', 0, 0, null, 'image-variation', APP_ID);

        res.json({
            success: true,
            images: response.data.map(img => ({ url: img.url })),
        });
    } catch (error) {
        log.error('[AI Image Variation] Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Image variation failed' });
    }
});

// ============================================================================
// CANVAS STREAM — /api/canvas/stream
// SSE streaming agent chat with tool-calling loop (same pattern as gen-craft-pro)
// ============================================================================

const MAULA_EDITOR_SYSTEM = `You are Maula Editor — an elite full-stack AI developer, code editor assistant, and helpful conversational partner.

## GOLDEN RULE: CONVERSATION FIRST
Before doing ANYTHING, ask yourself: "Is the user asking me to build/edit/debug code, or just talking to me?"

- **Greeting or casual chat** (hi, hello, how are you, what can you do, etc.) → Just respond naturally. Do NOT generate code, call tools, or create files. Have a friendly conversation.
- **Code request** (build, create, fix, debug, edit, make, generate, etc.) → Then use tools to create/edit files.

## HOW YOU WORK (when code IS requested)
1. The user describes code they need or a problem to solve
2. You analyze the request and use tools to create/edit files
3. You write clean, modern code using current best practices
4. You create complete, working solutions

## RULES
- For conversation/questions: just respond naturally, no tools needed
- For code requests: create working, self-contained code
- Use modern frameworks and patterns (React, Next.js, Express, etc.)
- Include responsive design when building UI
- Write clean, well-commented code
- Use write_file to create/edit project files
- Be precise about file paths and changes
- Prefer TypeScript when appropriate
- Create complete solutions, not partial snippets

## OUTPUT
- For chat: respond conversationally — friendly, helpful, concise
- For code: explain what you're building, use tools to create files, summarize at the end`;

router.post('/canvas/stream', requireAuth, async (req, res) => {
    try {
        const {
            prompt,
            projectFiles = {},
            history = [],
            appId = APP_ID,
            editorContext = null,
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        // Fast-path: simple greetings/chat — skip tool-calling entirely
        const greetingPattern = /^(hi|hello|hey|sup|yo|howdy|greetings|good\s*(morning|afternoon|evening)|what'?s?\s*up|how\s*are\s*you|thanks|thank\s*you|ok|okay|cool|nice|great|bye|goodbye|see\s*ya|what\s*can\s*you\s*do|who\s*are\s*you|help)\s*[!?.]*$/i;
        if (greetingPattern.test(prompt.trim())) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });
            const sseWrite = (data) => {
                try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { }
            };
            try {
                const aiService = new AIService(req.user);
                const quickReply = await aiService.chat(
                    [{ role: 'user', content: prompt }],
                    'mistral', 'mistral-small-latest', { maxTokens: 150, creditAppId: appId, endpoint: 'canvas', systemPrompt: 'You are Maula Editor, a friendly AI coding assistant. Respond naturally and conversationally. Keep it short — 1-2 sentences.' }
                );
                sseWrite({ type: 'text', content: quickReply.content || quickReply });
                sseWrite({ type: 'done', content: quickReply.content || quickReply, projectFiles: projectFiles, tokens: 0, credits: 0.01, balance: 0 });
            } catch (e) {
                sseWrite({ type: 'text', content: 'Hey! How can I help you today?' });
                sseWrite({ type: 'done', content: 'Hey! How can I help you today?', projectFiles: projectFiles, tokens: 0, credits: 0, balance: 0 });
            }
            return res.end();
        }

        // Check credits
        const userAppBalance = Array.isArray(req.user?.credits)
            ? parseFloat((req.user.credits.find(c => c.appId === appId) || {}).balance || 0)
            : parseFloat(req.user?.credits?.balance || 0);
        if (req.user && userAppBalance <= 0) {
            return res.status(402).json({ success: false, error: `Insufficient credits for ${appId}` });
        }

        // SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const sseWrite = (data) => {
            try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { }
        };

        // Build conversation messages
        const messages = [];
        for (const msg of history) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text || msg.content || '',
            });
        }

        const fileList = Object.keys(projectFiles);
        let userContent = prompt;
        if (fileList.length > 0) {
            userContent = `## Current Project Files: ${fileList.join(', ')}\n\n## User Request:\n${prompt}`;
        }
        messages.push({ role: 'user', content: userContent });

        // Mutable project state — tools can write files into this
        const projectState = { ...projectFiles };

        sseWrite({ type: 'status', message: 'Agent thinking...' });

        const aiService = new AIService(req.user);
        let totalCost = 0;

        for await (const event of aiService.streamChatWithTools(messages, {
            chatMode: 'Canvas',
            systemPrompt: MAULA_EDITOR_SYSTEM,
            endpoint: 'canvas',
            creditAppId: appId,
            sseWrite,
            workspaceRoot: process.cwd(),
            projectFiles: projectState,
            editorContext: editorContext || null,
        })) {
            if (event.type === 'text') {
                sseWrite({ type: 'text', content: event.content });
            } else if (event.type === 'tool_use') {
                sseWrite({ type: 'tool_start', tool: event.tool, input: event.input });
            } else if (event.type === 'tool_result') {
                sseWrite({ type: 'tool_result', tool: event.tool, success: event.success, summary: event.summary });
            } else if (event.type === 'done') {
                totalCost = event.creditsCost || 0;

                // Get updated credits
                let updatedCredits = 0;
                if (req.user?.id) {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: req.user.id },
                        include: { credits: true },
                    });
                    const freshAppCred = Array.isArray(freshUser?.credits)
                        ? freshUser.credits.find(c => c.appId === appId)
                        : null;
                    updatedCredits = parseFloat(freshAppCred?.balance || 0);
                }

                sseWrite({
                    type: 'done',
                    content: event.content,
                    projectFiles: projectState,
                    tokens: event.totalTokens,
                    credits: totalCost,
                    balance: updatedCredits,
                    latencyMs: event.latencyMs,
                });
            }
        }

        res.end();
    } catch (error) {
        log.error('[Canvas Stream] Error:', error);
        try { res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Generation failed' })}\n\n`); } catch { }
        res.end();
    }
});

// ============================================================================
// MULTI-AGENT STREAM — /api/canvas/agent-stream
// Manager (Claude) coordinates specialist workers
// ============================================================================

router.post('/canvas/agent-stream', requireAuth, async (req, res) => {
    try {
        const {
            prompt,
            projectFiles = {},
            history = [],
            appId = APP_ID,
            editorContext = null,
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const sseWrite = (data) => {
            try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { }
        };

        // Pre-check credits before running multi-agent orchestration
        const aiService = new AIService(req.user);
        const hasCredits = await aiService.checkCredits(0.01, 'canvas', appId);
        if (!hasCredits) {
            sseWrite({ type: 'error', error: 'Insufficient credits' });
            res.end();
            return;
        }

        const orchestrator = new AgentOrchestrator(
            req.user.id,
            sseWrite,
            req.user,
            appId,
        );

        await orchestrator.processUserMessage(prompt, projectFiles, history);

        // Deduct credits if orchestrator tracked them
        if (orchestrator.totalCost && orchestrator.totalCost > 0) {
            await aiService.deductCredits(
                orchestrator.totalCost,
                'multi-agent',
                'orchestrator',
                orchestrator.totalInputTokens || 0,
                orchestrator.totalOutputTokens || 0,
                null,
                'canvas-agent',
                appId,
            );
        }

        sseWrite({ type: 'done', message: 'Agent session complete' });
        res.end();
    } catch (error) {
        log.error('[Agent Stream] Error:', error);
        try { res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`); } catch { }
        res.end();
    }
});

// ============================================================================
// SECRETS — /api/secrets/*
// Encrypted key/value store per user
// ============================================================================

router.get('/secrets/:category/:key', requireAuth, async (req, res) => {
    try {
        const { category, key } = req.params;
        const secret = await prisma.userSecret.findFirst({
            where: { userId: req.user.id, category, key },
        });
        if (!secret) return res.status(404).json({ success: false, error: 'Secret not found' });
        res.json({ success: true, value: secret.value, category, key });
    } catch (error) {
        log.error('[Secrets] Get error:', error);
        res.status(500).json({ success: false, error: 'Failed to get secret' });
    }
});

router.get('/secrets', requireAuth, async (req, res) => {
    try {
        const { category } = req.query;
        const where = { userId: req.user.id };
        if (category) where.category = category;
        const secrets = await prisma.userSecret.findMany({ where });
        res.json({
            success: true,
            secrets: secrets.map(s => ({ category: s.category, key: s.key, updatedAt: s.updatedAt })),
        });
    } catch (error) {
        log.error('[Secrets] List error:', error);
        res.status(500).json({ success: false, error: 'Failed to list secrets' });
    }
});

router.post('/secrets', requireAuth, async (req, res) => {
    try {
        const { category, key, value } = req.body;
        if (!category || !key || value === undefined) {
            return res.status(400).json({ success: false, error: 'category, key, and value required' });
        }

        const secret = await prisma.userSecret.upsert({
            where: {
                userId_category_key: { userId: req.user.id, category, key },
            },
            update: { value },
            create: { userId: req.user.id, category, key, value },
        });

        res.json({ success: true, message: 'Secret saved' });
    } catch (error) {
        log.error('[Secrets] Save error:', error);
        res.status(500).json({ success: false, error: 'Failed to save secret' });
    }
});

router.delete('/secrets/:category/:key', requireAuth, async (req, res) => {
    try {
        const { category, key } = req.params;
        await prisma.userSecret.deleteMany({
            where: { userId: req.user.id, category, key },
        });
        res.json({ success: true, message: 'Secret deleted' });
    } catch (error) {
        log.error('[Secrets] Delete error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete secret' });
    }
});

router.post('/secrets/batch', requireAuth, async (req, res) => {
    try {
        const { keys } = req.body; // Array of { category, key }
        if (!keys || !Array.isArray(keys)) {
            return res.status(400).json({ success: false, error: 'keys array required' });
        }

        const results = {};
        for (const { category, key } of keys) {
            const secret = await prisma.userSecret.findFirst({
                where: { userId: req.user.id, category, key },
            });
            results[`${category}/${key}`] = secret ? secret.value : null;
        }

        res.json({ success: true, secrets: results });
    } catch (error) {
        log.error('[Secrets] Batch error:', error);
        res.status(500).json({ success: false, error: 'Failed to batch load secrets' });
    }
});

// ============================================================================
// V1 FILES & PROJECTS — /api/v1/*
// Alternative paths used by filesApi.ts
// ============================================================================

router.post('/v1/projects', requireAuth, async (req, res) => {
    try {
        const { name, description, framework, templateId } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const project = await prisma.project.create({
            data: {
                id: `proj-${crypto.randomUUID().slice(0, 12)}`,
                userId: req.user.id,
                name,
                description: description || '',
                framework: framework || 'node',
                templateId: templateId || 'blank',
                sourceApp: APP_ID,
                status: 'created',
            },
        });

        res.status(201).json({ success: true, project });
    } catch (error) {
        log.error('[V1 Projects] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/v1/projects', requireAuth, async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ success: true, projects });
    } catch (error) {
        log.error('[V1 Projects] List error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/v1/projects/:projectId', requireAuth, async (req, res) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.projectId },
            include: { files: true },
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        res.json({ success: true, project });
    } catch (error) {
        log.error('[V1 Projects] Get error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/v1/projects/:projectId/sync', requireAuth, async (req, res) => {
    try {
        const { files } = req.body;
        const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        if (files && typeof files === 'object') {
            for (const [filePath, content] of Object.entries(files)) {
                await prisma.file.upsert({
                    where: { projectId_path: { projectId: project.id, path: filePath } },
                    update: { content: typeof content === 'string' ? content : JSON.stringify(content) },
                    create: { projectId: project.id, path: filePath, content: typeof content === 'string' ? content : JSON.stringify(content) },
                });
            }
        }

        await prisma.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } });
        res.json({ success: true, message: 'Project synced' });
    } catch (error) {
        log.error('[V1 Sync] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/v1/files', requireAuth, async (req, res) => {
    try {
        const { projectId, path: filePath, content, language } = req.body;
        if (!projectId || !filePath) return res.status(400).json({ error: 'projectId and path required' });

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const file = await prisma.file.upsert({
            where: { projectId_path: { projectId, path: filePath } },
            update: { content: content || '', language },
            create: { projectId, path: filePath, content: content || '', language },
        });

        res.status(201).json({ success: true, file });
    } catch (error) {
        log.error('[V1 Files] Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/v1/files/:fileId', requireAuth, async (req, res) => {
    try {
        const { content, language } = req.body;
        const file = await prisma.file.findUnique({ where: { id: req.params.fileId }, include: { project: true } });
        if (!file) return res.status(404).json({ error: 'File not found' });
        if (file.project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const updated = await prisma.file.update({
            where: { id: req.params.fileId },
            data: { content: content !== undefined ? content : file.content, language: language || file.language },
        });

        res.json({ success: true, file: updated });
    } catch (error) {
        log.error('[V1 Files] Update error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/v1/files/:fileId', requireAuth, async (req, res) => {
    try {
        const file = await prisma.file.findUnique({ where: { id: req.params.fileId }, include: { project: true } });
        if (!file) return res.status(404).json({ error: 'File not found' });
        if (file.project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        await prisma.file.delete({ where: { id: req.params.fileId } });
        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        log.error('[V1 Files] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/v1/files/project/:projectId', requireAuth, async (req, res) => {
    try {
        const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const files = await prisma.file.findMany({
            where: { projectId: req.params.projectId },
            orderBy: { path: 'asc' },
        });

        res.json({ success: true, files });
    } catch (error) {
        log.error('[V1 Files] List error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// LSP / CODE INTELLIGENCE — /api/lsp/*
// AI-powered code analysis (no real LSP server — uses AI for smart responses)
// ============================================================================

async function lspAiAnalyze(user, code, language, task, extra = '') {
    const aiService = new AIService(user);

    // Pre-check credits
    const hasCredits = await aiService.checkCredits(0.01, 'code', APP_ID);
    if (!hasCredits) return null;

    const systemPrompt = `You are an expert code analysis engine. Analyze the provided code and return structured JSON responses. Language: ${language}.`;
    const prompt = `${task}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n${extra}`;

    try {
        const result = await aiService.chat(
            [{ role: 'user', content: prompt }],
            'mistral',
            'mistral-large-2501',
            { systemPrompt, creditAppId: APP_ID },
        );
        return result.content;
    } catch {
        return null;
    }
}

router.post('/lsp/diagnostics', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', filePath } = req.body;
        if (!code) return res.json({ success: true, diagnostics: [] });

        const analysis = await lspAiAnalyze(req.user, code, language, 'Return a JSON array of diagnostics. Each item: { "line": number, "column": number, "severity": "error"|"warning"|"info", "message": string, "code": string }. Return [] if no issues.');
        if (analysis === null) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        let diagnostics = [];
        try {
            const match = analysis.match(/\[[\s\S]*\]/);
            if (match) diagnostics = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, diagnostics, filePath });
    } catch (error) {
        log.error('[LSP Diagnostics] Error:', error);
        res.json({ success: true, diagnostics: [] });
    }
});

router.post('/lsp/completions', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column, prefix } = req.body;
        if (!code) return res.json({ success: true, completions: [] });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Provide code completions at line ${line}, column ${column} (prefix: "${prefix || ''}"). Return JSON array: [{ "label": string, "kind": "function"|"variable"|"property"|"keyword"|"snippet", "detail": string, "insertText": string }]. Max 10 items.`);
        if (analysis === null) return res.json({ success: true, completions: [] });

        let completions = [];
        try {
            const match = analysis.match(/\[[\s\S]*\]/);
            if (match) completions = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, completions });
    } catch (error) {
        log.error('[LSP Completions] Error:', error);
        res.json({ success: true, completions: [] });
    }
});

router.post('/lsp/hover', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column, word } = req.body;
        if (!code || !word) return res.json({ success: true, hover: null });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Provide hover information for "${word}" at line ${line}, column ${column}. Return JSON: { "contents": string (markdown), "range": { "startLine": number, "endLine": number } }.`);
        if (analysis === null) return res.json({ success: true, hover: null });

        let hover = null;
        try {
            const match = analysis.match(/\{[\s\S]*\}/);
            if (match) hover = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, hover });
    } catch (error) {
        log.error('[LSP Hover] Error:', error);
        res.json({ success: true, hover: null });
    }
});

router.post('/lsp/definition', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column, word } = req.body;
        if (!code || !word) return res.json({ success: true, definition: null });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Find the definition of "${word}" at line ${line}. Return JSON: { "line": number, "column": number, "filePath": string }.`);
        if (analysis === null) return res.json({ success: true, definition: null });

        let definition = null;
        try {
            const match = analysis.match(/\{[\s\S]*\}/);
            if (match) definition = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, definition });
    } catch (error) {
        log.error('[LSP Definition] Error:', error);
        res.json({ success: true, definition: null });
    }
});

router.post('/lsp/references', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column, word } = req.body;
        if (!code || !word) return res.json({ success: true, references: [] });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Find all references to "${word}" in the code. Return JSON array: [{ "line": number, "column": number, "context": string }].`);
        if (analysis === null) return res.json({ success: true, references: [] });

        let references = [];
        try {
            const match = analysis.match(/\[[\s\S]*\]/);
            if (match) references = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, references });
    } catch (error) {
        log.error('[LSP References] Error:', error);
        res.json({ success: true, references: [] });
    }
});

router.post('/lsp/signature', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column } = req.body;
        if (!code) return res.json({ success: true, signatures: [] });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Provide signature help at line ${line}, column ${column}. Return JSON: { "signatures": [{ "label": string, "documentation": string, "parameters": [{ "label": string, "documentation": string }] }], "activeSignature": 0, "activeParameter": 0 }.`);
        if (analysis === null) return res.json({ success: true, signatures: [] });

        let result = { signatures: [], activeSignature: 0, activeParameter: 0 };
        try {
            const match = analysis.match(/\{[\s\S]*\}/);
            if (match) result = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, ...result });
    } catch (error) {
        log.error('[LSP Signature] Error:', error);
        res.json({ success: true, signatures: [] });
    }
});

router.post('/lsp/symbols', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript' } = req.body;
        if (!code) return res.json({ success: true, symbols: [] });

        const analysis = await lspAiAnalyze(req.user, code, language,
            'List all symbols (functions, classes, variables, interfaces, types) in the code. Return JSON array: [{ "name": string, "kind": "function"|"class"|"variable"|"interface"|"type"|"constant"|"method", "line": number, "endLine": number, "detail": string }].');
        if (analysis === null) return res.json({ success: true, symbols: [] });

        let symbols = [];
        try {
            const match = analysis.match(/\[[\s\S]*\]/);
            if (match) symbols = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, symbols });
    } catch (error) {
        log.error('[LSP Symbols] Error:', error);
        res.json({ success: true, symbols: [] });
    }
});

router.post('/lsp/format', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', options = {} } = req.body;
        if (!code) return res.json({ success: true, formatted: code });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Format this code according to standard style guidelines. Indentation: ${options.tabSize || 2} spaces. Return ONLY the formatted code with no explanation, no markdown fences.`);
        if (analysis === null) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        res.json({ success: true, formatted: analysis || code });
    } catch (error) {
        log.error('[LSP Format] Error:', error);
        res.json({ success: true, formatted: req.body.code });
    }
});

router.post('/lsp/refactor', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, action } = req.body;
        if (!code) return res.json({ success: true, actions: [] });

        const analysis = await lspAiAnalyze(req.user, code, language,
            `Suggest code refactoring actions${action ? ` (specifically: ${action})` : ''} at line ${line || 'any'}. Return JSON array: [{ "title": string, "kind": "quickfix"|"refactor"|"extract"|"inline", "edit": { "changes": [{ "line": number, "oldText": string, "newText": string }] } }]. Max 5 items.`);
        if (analysis === null) return res.json({ success: true, actions: [] });

        let actions = [];
        try {
            const match = analysis.match(/\[[\s\S]*\]/);
            if (match) actions = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, actions });
    } catch (error) {
        log.error('[LSP Refactor] Error:', error);
        res.json({ success: true, actions: [] });
    }
});

router.post('/lsp/rename', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', line, column, oldName, newName } = req.body;
        if (!code || !oldName || !newName) {
            return res.status(400).json({ success: false, error: 'code, oldName, and newName required' });
        }

        // Simple rename: replace all occurrences intelligently
        const analysis = await lspAiAnalyze(req.user, code, language,
            `Rename all occurrences of "${oldName}" to "${newName}" while respecting scope and semantics. Return ONLY the updated code with no explanation, no markdown fences.`);
        if (analysis === null) return res.status(402).json({ success: false, error: 'Insufficient credits' });

        res.json({ success: true, code: analysis || code.replaceAll(oldName, newName) });
    } catch (error) {
        log.error('[LSP Rename] Error:', error);
        res.json({ success: true, code: req.body.code });
    }
});

router.post('/lsp/analyze', requireAuth, async (req, res) => {
    try {
        const { code, language = 'javascript', filePath } = req.body;
        if (!code) return res.json({ success: true, analysis: {} });

        const analysis = await lspAiAnalyze(req.user, code, language,
            'Perform a full code analysis. Return JSON: { "diagnostics": [], "complexity": { "cyclomatic": number, "linesOfCode": number, "functions": number }, "suggestions": [{ "title": string, "description": string, "severity": "info"|"warning" }], "summary": string }.');
        if (analysis === null) return res.json({ success: true, analysis: {} });

        let result = {};
        try {
            const match = analysis.match(/\{[\s\S]*\}/);
            if (match) result = JSON.parse(match[0]);
        } catch { }

        res.json({ success: true, analysis: result, filePath });
    } catch (error) {
        log.error('[LSP Analyze] Error:', error);
        res.json({ success: true, analysis: {} });
    }
});

// ============================================================================
// MEDIA — /api/media/*
// Image and file uploads
// ============================================================================

router.get('/media/status', (req, res) => {
    res.json({ success: true, available: true, maxSize: '50MB', supportedTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'] });
});

router.post('/media/upload/base64', requireAuth, async (req, res) => {
    try {
        const { data, filename, mimeType } = req.body;
        if (!data) return res.status(400).json({ success: false, error: 'Base64 data required' });

        // Generate unique filename
        const ext = filename?.split('.').pop() || 'png';
        const uniqueName = `${crypto.randomUUID()}.${ext}`;

        // Try S3 upload if configured
        try {
            const { uploadImage, isConfigured } = await import('../services/imageStorage.js');
            if (isConfigured()) {
                const buffer = Buffer.from(data.replace(/^data:.*?;base64,/, ''), 'base64');
                const url = await uploadImage(buffer, uniqueName, mimeType || 'image/png');
                return res.json({ success: true, url, filename: uniqueName });
            }
        } catch { }

        // Fallback: return data URI
        const dataUri = data.startsWith('data:') ? data : `data:${mimeType || 'image/png'};base64,${data}`;
        res.json({ success: true, url: dataUri, filename: uniqueName, storage: 'inline' });
    } catch (error) {
        log.error('[Media Upload] Error:', error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});

router.post('/media/upload', requireAuth, async (req, res) => {
    try {
        // For multipart/form-data, we'd need multer; for JSON body with base64:
        const { file, filename, mimeType } = req.body;
        if (!file) return res.status(400).json({ success: false, error: 'File data required' });

        const ext = filename?.split('.').pop() || 'bin';
        const uniqueName = `${crypto.randomUUID()}.${ext}`;

        try {
            const { uploadImage, isConfigured } = await import('../services/imageStorage.js');
            if (isConfigured()) {
                const buffer = Buffer.from(file.replace(/^data:.*?;base64,/, ''), 'base64');
                const url = await uploadImage(buffer, uniqueName, mimeType || 'application/octet-stream');
                return res.json({ success: true, url, filename: uniqueName });
            }
        } catch { }

        res.json({ success: true, url: `data:${mimeType || 'application/octet-stream'};base64,${file.replace(/^data:.*?;base64,/, '')}`, filename: uniqueName, storage: 'inline' });
    } catch (error) {
        log.error('[Media Upload] Error:', error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});

router.get('/media/recent', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;

        // If we have a media table, query it; otherwise return empty
        try {
            const where = { userId: req.user.id };
            if (type) where.mimeType = { startsWith: type };
            const media = await prisma.media.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            return res.json({ success: true, media });
        } catch {
            // Media table may not exist
            return res.json({ success: true, media: [] });
        }
    } catch (error) {
        log.error('[Media Recent] Error:', error);
        res.json({ success: true, media: [] });
    }
});

// ============================================================================
// SANDBOX — /api/sandbox/*
// Container-based code execution environment
// ============================================================================

const activeSandboxSessions = new Map();

router.post('/sandbox/start', requireAuth, async (req, res) => {
    try {
        const { template, projectId, config = {} } = req.body;
        const sessionId = crypto.randomUUID();

        const session = {
            id: sessionId,
            userId: req.user.id,
            projectId,
            template: template || 'node',
            status: 'running',
            startedAt: new Date().toISOString(),
            config,
            files: {},
            processes: [],
        };

        activeSandboxSessions.set(sessionId, session);

        res.json({ success: true, sessionId, status: 'running', url: `/sandbox/${sessionId}` });
    } catch (error) {
        log.error('[Sandbox Start] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to start sandbox' });
    }
});

router.post('/sandbox/:sessionId/stop', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    session.status = 'stopped';
    activeSandboxSessions.delete(req.params.sessionId);
    res.json({ success: true, message: 'Sandbox stopped' });
});

router.get('/sandbox/:sessionId/status', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, session });
});

router.get('/sandbox/sessions', requireAuth, (req, res) => {
    const userSessions = [];
    for (const [id, session] of activeSandboxSessions) {
        if (session.userId === req.user.id) {
            userSessions.push({ id, ...session });
        }
    }
    res.json({ success: true, sessions: userSessions });
});

router.post('/sandbox/:sessionId/deploy', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({
        success: true,
        deployment: {
            id: `deploy-${crypto.randomUUID().slice(0, 8)}`,
            sessionId: req.params.sessionId,
            status: 'queued',
            url: null,
        },
    });
});

// Sandbox proxy routes
router.post('/sandbox/:sessionId/proxy/init', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { files } = req.body;
    if (files) session.files = { ...session.files, ...files };
    res.json({ success: true, message: 'Project initialized' });
});

router.post('/sandbox/:sessionId/proxy/write', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'path required' });
    session.files[filePath] = content || '';
    res.json({ success: true, message: 'File written' });
});

router.get('/sandbox/:sessionId/proxy/read', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const filePath = req.query.path;
    if (!filePath || !(filePath in session.files)) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.json({ success: true, content: session.files[filePath] });
});

router.get('/sandbox/:sessionId/proxy/list', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const dirPath = req.query.path || '/';
    const files = Object.keys(session.files)
        .filter(f => f.startsWith(dirPath === '/' ? '' : dirPath))
        .map(f => ({ path: f, type: 'file' }));
    res.json({ success: true, files });
});

router.post('/sandbox/:sessionId/proxy/exec', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { command } = req.body;
    // Sandbox execution placeholder — would delegate to container
    res.json({ success: true, output: `[sandbox] Would execute: ${command}`, exitCode: 0 });
});

router.post('/sandbox/:sessionId/proxy/install', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    const { packages } = req.body;
    res.json({ success: true, message: `Installed packages: ${(packages || []).join(', ')}` });
});

router.post('/sandbox/:sessionId/proxy/build', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, message: 'Build started', buildId: crypto.randomUUID().slice(0, 8) });
});

router.post('/sandbox/:sessionId/proxy/dev', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, message: 'Dev server started', url: `http://localhost:3000` });
});

router.post('/sandbox/:sessionId/proxy/stop', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, message: 'Process stopped' });
});

router.get('/sandbox/:sessionId/proxy/output', requireAuth, (req, res) => {
    const session = activeSandboxSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, output: '', lines: [] });
});

// ============================================================================
// EXTENSIONS — /api/extensions/*
// Extension marketplace
// ============================================================================

router.get('/extensions', requireAuth, async (req, res) => {
    try {
        const { category, search, sort = 'popular' } = req.query;

        // Built-in extensions catalog
        const extensions = [
            { id: 'prettier', name: 'Prettier', description: 'Code formatter', category: 'formatter', installs: 50000, rating: 4.8 },
            { id: 'eslint', name: 'ESLint', description: 'JavaScript/TypeScript linter', category: 'linter', installs: 80000, rating: 4.7 },
            { id: 'tailwindcss', name: 'Tailwind CSS IntelliSense', description: 'Tailwind CSS autocomplete', category: 'css', installs: 40000, rating: 4.9 },
            { id: 'gitlens', name: 'GitLens', description: 'Git supercharged', category: 'git', installs: 30000, rating: 4.6 },
            { id: 'docker', name: 'Docker', description: 'Docker integration', category: 'devops', installs: 25000, rating: 4.5 },
            { id: 'prisma', name: 'Prisma', description: 'Prisma schema support', category: 'database', installs: 20000, rating: 4.7 },
            { id: 'copilot', name: 'AI Copilot', description: 'AI-powered code suggestions', category: 'ai', installs: 60000, rating: 4.8 },
            { id: 'live-share', name: 'Live Share', description: 'Real-time collaboration', category: 'collaboration', installs: 35000, rating: 4.4 },
            { id: 'python', name: 'Python', description: 'Python language support', category: 'language', installs: 45000, rating: 4.6 },
            { id: 'rust-analyzer', name: 'rust-analyzer', description: 'Rust language support', category: 'language', installs: 15000, rating: 4.8 },
        ];

        let filtered = extensions;
        if (category && category !== 'all') {
            filtered = filtered.filter(e => e.category === category);
        }
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
        }
        if (sort === 'popular') {
            filtered.sort((a, b) => b.installs - a.installs);
        } else if (sort === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        }

        res.json({ success: true, extensions: filtered, total: filtered.length });
    } catch (error) {
        log.error('[Extensions] List error:', error);
        res.json({ success: true, extensions: [], total: 0 });
    }
});

router.get('/extensions/:extensionId', requireAuth, async (req, res) => {
    try {
        const { extensionId } = req.params;

        // Lookup from catalog
        const catalog = {
            'prettier': { id: 'prettier', name: 'Prettier', version: '3.2.0', description: 'Opinionated code formatter', publisher: 'Prettier', category: 'formatter', installs: 50000, rating: 4.8, readme: '# Prettier\nAn opinionated code formatter that supports many languages.' },
            'eslint': { id: 'eslint', name: 'ESLint', version: '2.4.0', description: 'JavaScript and TypeScript linter', publisher: 'ESLint', category: 'linter', installs: 80000, rating: 4.7, readme: '# ESLint\nFind and fix problems in your JavaScript code.' },
            'tailwindcss': { id: 'tailwindcss', name: 'Tailwind CSS IntelliSense', version: '0.10.0', description: 'Intelligent Tailwind CSS tooling', publisher: 'Tailwind Labs', category: 'css', installs: 40000, rating: 4.9, readme: '# Tailwind CSS IntelliSense\nAutocomplete, syntax highlighting, and linting for Tailwind CSS.' },
        };

        const ext = catalog[extensionId];
        if (!ext) {
            return res.json({
                success: true,
                extension: { id: extensionId, name: extensionId, version: '1.0.0', description: 'Extension', installs: 0, rating: 0 },
            });
        }

        res.json({ success: true, extension: ext });
    } catch (error) {
        log.error('[Extensions] Get error:', error);
        res.status(500).json({ success: false, error: 'Failed to get extension' });
    }
});

export default router;
