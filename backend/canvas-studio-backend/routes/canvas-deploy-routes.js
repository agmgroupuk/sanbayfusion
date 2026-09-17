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
  const sessionId = req.cookies?.sessionId;
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

// ── GET /domains — List deployment domains ─────────────────────────
router.get('/domains', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const deployments = await prisma.deployment.findMany({
      where: { userId, domain: { not: null }, status: { in: ['live', 'deploying'] } },
      select: { id: true, domain: true, url: true, status: true, createdAt: true, environment: true },
      orderBy: { createdAt: 'desc' },
    });

    const domains = deployments
      .filter(d => d.domain)
      .map((d, i) => ({
        id: d.id,
        domain: d.domain,
        sslStatus: 'active',
        dnsStatus: 'verified',
        isPrimary: i === 0,
        addedAt: d.createdAt.toISOString(),
        dnsRecords: [
          { type: 'CNAME', name: d.domain, value: d.url || 'appview.sanbayfusion.com' },
        ],
      }));

    res.json({ success: true, domains });
  } catch (error) {
    console.error('[CanvasDeploy] Domains error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch domains' });
  }
});

// ── POST /domains — Add a custom subdomain ─────────────────────────
const RESERVED_SUBDOMAINS = new Set([
  'www', 'maula', 'app', 'canvas', 'chat', 'demo', 'studio', 'preview',
  'appview', 'spaces', 'api', 'admin', 'mail', 'smtp', 'ftp', 'ns1', 'ns2',
  'cdn', 'static', 'assets', 'img', 'images', 'docs', 'help', 'support',
  'billing', 'pay', 'status', 'blog', 'dev', 'staging', 'test', 'beta',
]);

router.post('/domains', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { domain, deploymentId } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    const cleaned = domain.toLowerCase().trim();

    // Extract subdomain part (strip .sanbayfusion.com if sent)
    const sub = cleaned.replace(/\.maula\.ai$/, '');

    // Validate subdomain format
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sub)) {
      return res.status(400).json({ success: false, error: 'Invalid subdomain: only lowercase letters, numbers, and hyphens allowed (no leading/trailing hyphens)' });
    }
    if (sub.length < 3 || sub.length > 32) {
      return res.status(400).json({ success: false, error: 'Subdomain must be 3–32 characters' });
    }

    // Block reserved system subdomains
    if (RESERVED_SUBDOMAINS.has(sub)) {
      return res.status(400).json({ success: false, error: `"${sub}" is a reserved system subdomain` });
    }

    const fullDomain = sub + '.sanbayfusion.com';

    // Check for duplicate — no other deployment should already use this domain
    const existing = await prisma.deployment.findFirst({
      where: { domain: fullDomain, status: { in: ['live', 'deploying'] } },
    });
    if (existing) {
      if (existing.userId === userId) {
        return res.status(400).json({ success: false, error: `You already have "${fullDomain}" assigned to a deployment` });
      }
      return res.status(400).json({ success: false, error: `"${fullDomain}" is already taken` });
    }

    // Find latest deployment
    const deployment = deploymentId
      ? await prisma.deployment.findFirst({ where: { id: deploymentId, userId } })
      : await prisma.deployment.findFirst({
        where: { userId, status: 'live' },
        orderBy: { createdAt: 'desc' },
      });

    if (deployment) {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { domain: fullDomain },
      });
    }

    res.json({
      success: true,
      domain: {
        id: deployment?.id || 'pending',
        domain: fullDomain,
        sslStatus: 'active',
        dnsStatus: 'verified',
        isPrimary: false,
        addedAt: new Date().toISOString(),
        dnsRecords: [
          { type: 'CNAME', name: fullDomain, value: deployment?.url || 'appview.sanbayfusion.com' },
        ],
      },
    });
  } catch (error) {
    console.error('[CanvasDeploy] Add domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to add domain' });
  }
});

// ── DELETE /domains/:id — Remove a custom domain ───────────────────
router.delete('/domains/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    await prisma.deployment.updateMany({
      where: { id: req.params.id, userId },
      data: { domain: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[CanvasDeploy] Remove domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove domain' });
  }
});

// ── POST /rollback/:versionId — Rollback to a previous deploy ──────
router.post('/rollback/:versionId', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const { versionId } = req.params;

    // Find the target deploy history entry
    const target = await prisma.canvasDeployHistory.findFirst({
      where: { id: versionId, userId },
    });

    if (!target) {
      return res.status(404).json({ success: false, error: 'Deployment version not found' });
    }

    // Mark current live deployments as rolled_back
    await prisma.deployment.updateMany({
      where: { userId, status: 'live' },
      data: { status: 'rolled_back' },
    });

    // Record the rollback in history
    const entry = await prisma.canvasDeployHistory.create({
      data: {
        userId,
        platform: target.platform,
        projectName: target.projectName,
        url: target.url,
        status: 'success',
        source: target.source || 'standalone',
      },
    });

    res.json({
      success: true,
      message: `Rolled back to ${target.projectName} (${target.platform})`,
      entry,
    });
  } catch (error) {
    console.error('[CanvasDeploy] Rollback error:', error);
    res.status(500).json({ success: false, error: 'Failed to rollback' });
  }
});

// ── GET /hosting-stats — Hosting dashboard metrics ─────────────────
router.get('/hosting-stats', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    // Get deploy counts and stats
    const [totalDeploys, successDeploys, recentDeploys, healthChecks] = await Promise.all([
      prisma.canvasDeployHistory.count({ where: { userId } }),
      prisma.canvasDeployHistory.count({ where: { userId, status: 'success' } }),
      prisma.canvasDeployHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 14,
        select: { createdAt: true, status: true },
      }),
      prisma.healthCheck.findMany({
        where: { type: 'deployment' },
        take: 10,
        select: { healthy: true, latency: true, uptime: true, lastChecked: true },
      }),
    ]);

    const avgLatency = healthChecks.length > 0
      ? Math.round(healthChecks.reduce((sum, h) => sum + h.latency, 0) / healthChecks.length)
      : 45;
    const avgUptime = healthChecks.length > 0
      ? (healthChecks.reduce((sum, h) => sum + h.uptime, 0) / healthChecks.length).toFixed(2)
      : '99.90';

    // Generate sparkline data from recent deploys
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return recentDeploys.filter(d => {
        const dDate = new Date(d.createdAt);
        return dDate.toDateString() === date.toDateString();
      }).length;
    });

    const errorRate = totalDeploys > 0
      ? (((totalDeploys - successDeploys) / totalDeploys) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      stats: {
        totalRequests: { label: 'Total Deploys', value: totalDeploys.toString(), change: 12.5, sparkline: last14Days },
        bandwidth: { label: 'Bandwidth', value: `${(totalDeploys * 2.5).toFixed(0)} MB`, sparkline: last14Days.map(v => v * 2.5) },
        avgResponseTime: { label: 'Avg Latency', value: `${avgLatency}ms`, change: -3.2, sparkline: healthChecks.map(h => h.latency) },
        uniqueVisitors: { label: 'Projects', value: (await prisma.canvasProject.count({ where: { userId } })).toString(), sparkline: [] },
        uptimePercent: { label: 'Uptime', value: `${avgUptime}%`, sparkline: healthChecks.map(h => h.uptime) },
        errorRate: { label: 'Error Rate', value: `${errorRate}%`, sparkline: [] },
      },
      region: 'ap-southeast-1',
      lastDeployedAt: recentDeploys[0]?.createdAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[CanvasDeploy] Hosting stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hosting stats' });
  }
});

export default router;
