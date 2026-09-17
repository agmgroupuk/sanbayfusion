/**
 * CANVAS DEPLOY CREDENTIALS & HISTORY ROUTES
 * Handles encrypted credential storage and deployment history for canvas apps.
 * Fully source-scoped: standalone (GenCraft Pro) and embedded (Canvas Studio) credentials are separate.
 *
 * Credentials:
 *   GET    /api/canvas/deploy/credentials              — list user's credentials (tokens masked)
 *   POST   /api/canvas/deploy/credentials              — save / update a credential
 *   DELETE /api/canvas/deploy/credentials/:platform     — remove credential for platform
 *
 * History:
 *   GET    /api/canvas/deploy/history                   — list deployment history
 *   POST   /api/canvas/deploy/history                   — record a deployment
 */

import express from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import db from '../lib/db.js';

const router = express.Router();

// ── Encryption helpers (AES-256-GCM) ───────────────────────────────
const ENCRYPTION_KEY = process.env.DEPLOY_CREDENTIAL_KEY || process.env.SESSION_SECRET;
if (!ENCRYPTION_KEY) {
  console.error('[canvas-deploy] FATAL: DEPLOY_CREDENTIAL_KEY or SESSION_SECRET env var required for credential encryption');
}
const ALGO = 'aes-256-gcm';

function deriveKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext) {
  const key = deriveKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(ciphertext) {
  try {
    const [ivHex, tagHex, encrypted] = ciphertext.split(':');
    const key = deriveKey(ENCRYPTION_KEY);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

// ── Auth helper ────────────────────────────────────────────────────
async function getUserId(req) {
  const userId = req.user?.id || req.session?.userId;
  if (userId) return userId;

  // Fallback: cookie-based session (direct backend path via Nginx)
  const sessionId = req.cookies?.sessionId || req.cookies?.session_id;
  if (sessionId) {
    try {
      const user = await db.User.findBySessionId(sessionId);
      if (user && (!user.sessionExpiry || new Date(user.sessionExpiry) >= new Date())) {
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        return user.id;
      }
    } catch (err) {
      console.error('[canvas-deploy] Session lookup error:', err.message);
    }
  }
  return null;
}

/**
 * Extract source from X-Canvas-Source header or query/body.
 * Defaults to 'standalone' if not provided.
 */
function getSource(req) {
  return req.headers['x-canvas-source'] || req.query.source || req.body?.source || 'standalone';
}

// ── GET /credentials ─────────────────────────────────────────────
router.get('/credentials', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const source = getSource(req);

    const creds = await prisma.canvasDeployCredential.findMany({
      where: { userId, source },
      orderBy: { createdAt: 'desc' },
    });

    // Mask tokens — only send last 4 chars
    const masked = creds.map(c => ({
      id: c.id,
      platform: c.platform,
      label: c.label,
      tokenHint: decrypt(c.token).slice(-4),
      teamId: c.teamId,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, credentials: masked });
  } catch (error) {
    console.error('[CanvasDeploy] Credentials list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch credentials' });
  }
});

// ── POST /credentials ──────────────────────────────────────────────
router.post('/credentials', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { platform, label, token, teamId } = req.body;
    const source = getSource(req);

    if (!platform || !token) {
      return res.status(400).json({ success: false, error: 'Platform and token required' });
    }

    const encryptedToken = encrypt(token);

    const cred = await prisma.canvasDeployCredential.upsert({
      where: {
        userId_platform_label_source: {
          userId,
          platform,
          label: label || 'default',
          source,
        },
      },
      update: {
        token: encryptedToken,
        teamId: teamId || null,
      },
      create: {
        userId,
        platform,
        label: label || 'default',
        token: encryptedToken,
        teamId: teamId || null,
        source,
      },
    });

    res.json({
      success: true,
      credential: {
        id: cred.id,
        platform: cred.platform,
        label: cred.label,
        tokenHint: token.slice(-4),
        teamId: cred.teamId,
      },
    });
  } catch (error) {
    console.error('[CanvasDeploy] Credential save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save credential' });
  }
});

// ── GET /credentials/:platform/token (internal — returns decrypted for deploy) ─
router.get('/credentials/:platform/token', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { platform } = req.params;
    const label = req.query.label || 'default';
    const source = getSource(req);

    const cred = await prisma.canvasDeployCredential.findFirst({
      where: { userId, platform, label: String(label), source },
    });

    if (!cred) {
      return res.status(404).json({ success: false, error: 'No credential found' });
    }

    res.json({
      success: true,
      token: decrypt(cred.token),
      teamId: cred.teamId,
    });
  } catch (error) {
    console.error('[CanvasDeploy] Token fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch token' });
  }
});

// ── DELETE /credentials/:platform ──────────────────────────────────
router.delete('/credentials/:platform', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { platform } = req.params;
    const label = req.query.label;
    const source = getSource(req);

    const where = label
      ? { userId, platform, label: String(label), source }
      : { userId, platform, source };

    await prisma.canvasDeployCredential.deleteMany({ where });

    res.json({ success: true });
  } catch (error) {
    console.error('[CanvasDeploy] Credential delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete credential' });
  }
});

// ── GET /history ───────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const source = getSource(req);

    const where = { userId, source };

    const history = await prisma.canvasDeployHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, history });
  } catch (error) {
    console.error('[CanvasDeploy] History list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// ── POST /history ──────────────────────────────────────────────────
router.post('/history', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { platform, projectName, url, status, error: deployError, source } = req.body;

    if (!platform || !projectName) {
      return res.status(400).json({ success: false, error: 'Platform and projectName required' });
    }

    const entry = await prisma.canvasDeployHistory.create({
      data: {
        userId,
        platform,
        projectName,
        url: url || null,
        status: status || 'success',
        error: deployError || null,
        source: source || 'standalone',
      },
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('[CanvasDeploy] History save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save history' });
  }
});

export default router;
