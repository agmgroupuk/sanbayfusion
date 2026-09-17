/**
 * POST /api/analytics/track/*
 * Catch-all analytics tracking route.
 * Handles: visitor, pageview, event, chat, tool, lab
 * Writes to the CORRECT domain tables (Visitor, PageView, Session, UserEvent, etc.)
 * so the admin dashboard can query them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Helpers ─────────────────────────────────────────────────────────
function parseUA(ua: string) {
  const lower = ua.toLowerCase();

  // Device
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/mobi|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) device = 'mobile';
  else if (/tablet|ipad|playbook|silk|kindle/i.test(ua)) device = 'tablet';

  // Browser
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'IE';

  // OS
  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua) && !/android/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  return { device, browser, os };
}

function getClientIP(request: NextRequest): string {
  // CF-Connecting-IP is the real client IP when behind Cloudflare
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

// Check if IP is private/local (skip geo lookup for these)
function isPrivateIP(ip: string): boolean {
  return /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1|fd|fe80)/.test(ip);
}

// Geo-IP lookup using ip-api.com (free, no key needed, 45 req/min)
async function lookupGeo(ip: string): Promise<{ country: string; city: string }> {
  if (!ip || isPrivateIP(ip)) return { country: 'Unknown', city: 'Unknown' };
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return { country: 'Unknown', city: 'Unknown' };
    const data = await res.json();
    if (data.status === 'success') {
      return { country: data.country || 'Unknown', city: data.city || 'Unknown' };
    }
  } catch {
    // Silent fail — don't block tracking for geo
  }
  return { country: 'Unknown', city: 'Unknown' };
}

// ── Main handler ────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug: slugArr } = await params;
    const slug = slugArr?.join('/') || 'unknown';
    const body = await request.json().catch(() => ({}));
    const { visitorId, sessionId, userId, ...rest } = body as Record<string, any>;

    if (!visitorId && !sessionId) {
      return NextResponse.json({ success: true });
    }

    const ua = request.headers.get('user-agent') || '';
    const ip = getClientIP(request);
    const { device, browser, os } = parseUA(ua);

    switch (slug) {
      // ── Visitor tracking ──────────────────────────────────────
      case 'visitor': {
        // Geo-IP lookup (non-blocking best-effort)
        const geo = await lookupGeo(ip);

        // Upsert visitor — increment visitCount on return visit
        await prisma.visitor.upsert({
          where: { visitorId: visitorId || 'anon' },
          create: {
            visitorId: visitorId || 'anon',
            sessionId: sessionId || 'anon',
            userId: userId || null,
            ipAddress: ip,
            userAgent: ua,
            device,
            browser,
            os,
            country: geo.country,
            city: geo.city,
            referrer: rest.referrer || null,
            landingPage: rest.landingPage || '/',
            isRegistered: !!userId,
          },
          update: {
            lastVisit: new Date(),
            visitCount: { increment: 1 },
            sessionId: sessionId || undefined,
            userId: userId || undefined,
            ipAddress: ip,
            country: geo.country,
            city: geo.city,
            isRegistered: !!userId || undefined,
            isActive: true,
          },
        });

        // Upsert session
        if (sessionId) {
          await prisma.session.upsert({
            where: { sessionId },
            create: {
              sessionId,
              visitorId: visitorId || 'anon',
              userId: userId || null,
              isActive: true,
            },
            update: {
              lastActivity: new Date(),
              isActive: true,
              userId: userId || undefined,
            },
          });
        }
        break;
      }

      // ── Page view tracking ────────────────────────────────────
      case 'pageview': {
        await prisma.pageView.create({
          data: {
            visitorId: visitorId || 'anon',
            sessionId: sessionId || 'anon',
            userId: userId || null,
            url: rest.url || '/',
            title: rest.title || null,
            referrer: rest.referrer || null,
          },
        });

        // Update session counters
        if (sessionId) {
          await prisma.session.upsert({
            where: { sessionId },
            create: {
              sessionId,
              visitorId: visitorId || 'anon',
              userId: userId || null,
              pageViews: 1,
              isActive: true,
            },
            update: {
              pageViews: { increment: 1 },
              lastActivity: new Date(),
              isActive: true,
            },
          });
        }

        // Keep visitor active
        if (visitorId) {
          await prisma.visitor.updateMany({
            where: { visitorId },
            data: { lastVisit: new Date(), isActive: true },
          });
        }
        break;
      }

      // ── Event tracking ────────────────────────────────────────
      case 'event': {
        await prisma.userEvent.create({
          data: {
            userId: userId || null,
            eventType: rest.eventType || rest.eventName || 'custom',
            category: rest.category || 'general',
            action: rest.action || rest.eventName || 'interaction',
            label: rest.label || null,
            value: rest.value ? parseInt(rest.value) : null,
            properties: rest.eventData || rest.properties || null,
            source: 'web',
          },
        });

        // Update session event count
        if (sessionId) {
          await prisma.session.updateMany({
            where: { sessionId },
            data: {
              events: { increment: 1 },
              lastActivity: new Date(),
            },
          });
        }
        break;
      }

      // ── Chat tracking ─────────────────────────────────────────
      case 'chat': {
        const conversationId = rest.conversationId || `chat_${Date.now()}`;
        // Validate agentId exists in Agent table (foreign key constraint)
        let validAgentId: string | null = null;
        const providedAgentId = rest.agentId || rest.agentName;
        if (providedAgentId) {
          const agentExists = await prisma.agent.findUnique({ where: { id: providedAgentId } });
          if (agentExists) validAgentId = providedAgentId;
        }

        // conversationId is not unique in schema, so find-then-create/update
        const existing = await prisma.chatAnalyticsInteraction.findFirst({
          where: { conversationId },
        });
        if (existing) {
          await prisma.chatAnalyticsInteraction.update({
            where: { id: existing.id },
            data: {
              totalTokens: rest.totalTokens ? rest.totalTokens : { increment: rest.tokens || 0 },
              durationMs: rest.durationMs || undefined,
              turnCount: rest.turnCount ? rest.turnCount : { increment: 1 },
            },
          });
        } else {
          await prisma.chatAnalyticsInteraction.create({
            data: {
              conversationId,
              userId: userId || null,
              agentId: validAgentId,
              channel: 'web',
              totalTokens: rest.totalTokens || rest.tokens || 0,
              durationMs: rest.durationMs || rest.duration || 0,
              turnCount: rest.turnCount || rest.turns || 1,
              status: 'active',
            },
          });
        }
        break;
      }

      // ── Chat feedback ─────────────────────────────────────────
      case 'chat/feedback': {
        if (rest.conversationId) {
          await prisma.chatAnalyticsInteraction.updateMany({
            where: { conversationId: rest.conversationId },
            data: {
              priority: rest.rating === 'positive' ? 'high' : rest.rating === 'negative' ? 'low' : 'medium',
            },
          });
        }
        break;
      }

      // ── Tool tracking ─────────────────────────────────────────
      case 'tool': {
        // Validate agentId exists in Agent table (foreign key constraint)
        let toolAgentId: string | null = null;
        if (rest.agentId) {
          const agentExists = await prisma.agent.findUnique({ where: { id: rest.agentId } });
          if (agentExists) toolAgentId = rest.agentId;
        }

        await prisma.toolUsage.create({
          data: {
            toolName: rest.toolName || rest.tool || 'unknown',
            userId: userId || null,
            agentId: toolAgentId,
            command: rest.command || rest.action || 'execute',
            tokensInput: rest.tokensInput || 0,
            tokensOutput: rest.tokensOutput || 0,
            latencyMs: rest.latencyMs || rest.latency || 0,
            status: rest.status || 'completed',
          },
        });
        break;
      }

      // ── Lab tracking (generic event) ──────────────────────────
      case 'lab': {
        await prisma.userEvent.create({
          data: {
            userId: userId || null,
            eventType: 'lab',
            category: 'lab',
            action: rest.action || 'interaction',
            label: rest.label || rest.experiment || null,
            properties: rest,
            source: 'web',
          },
        });
        break;
      }

      // ── API usage tracking ────────────────────────────────────
      case 'api-usage': {
        await prisma.apiUsage.create({
          data: {
            visitorId: rest.visitorId || visitorId || 'anon',
            sessionId: rest.sessionId || sessionId || 'api',
            userId: userId || null,
            endpoint: rest.endpoint || '/',
            method: rest.method || 'GET',
            statusCode: rest.statusCode || 200,
            responseTime: rest.responseTime || 0,
            userAgent: rest.userAgent || ua,
            ipAddress: rest.ipAddress || ip,
          },
        });
        break;
      }

      // ── Fallback — store in AnalyticsEvent ────────────────────
      default: {
        await prisma.analyticsEvent.create({
          data: {
            visitorId: visitorId || 'anon',
            sessionId: sessionId || 'anon',
            userId: userId || null,
            eventName: slug,
            eventData: rest,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail — never break UX for tracking
    console.error('[analytics/track] error:', error);
    return NextResponse.json({ success: true });
  }
}

// Always return 200 for OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
