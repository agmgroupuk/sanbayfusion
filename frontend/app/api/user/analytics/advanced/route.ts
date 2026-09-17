import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Model cost per 1K tokens (estimates based on provider pricing)
const MODEL_COSTS: Record<string, number> = {
  'claude-opus-4': 0.015,
  'claude-sonnet-4': 0.003,
  'claude-3-5-sonnet': 0.003,
  'gpt-4.5': 0.01,
  'gpt-4o': 0.005,
  'gpt-4o-mini': 0.0015,
  'mistral-large': 0.002,
  'llama-4': 0.0008,
  'grok-3': 0.002,
  default: 0.002,
};

// Color palette for charts
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionId = request.cookies.get('session_id')?.value ||
                      request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ message: 'No session' }, { status: 401 });
    }

    const sessionUser = await prisma.user.findFirst({
      where: {
        sessionId,
        sessionExpiry: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!sessionUser) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
    }

    const userId = sessionUser.id;

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // ============================================
    // FETCH REAL DATA FROM DATABASE
    // ============================================

    // 1. Get user's chat sessions (last 7 days)
    const recentSessions = await prisma.chatSession.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        messages: true,
        agent: {
          select: { agentId: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Get previous period sessions (for comparison)
    const previousSessions = await prisma.chatSession.findMany({
      where: {
        userId,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
      include: {
        messages: true,
      },
    });

    // 3. Get chat analytics interactions
    const recentInteractions = await prisma.chatAnalyticsInteraction.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ============================================
    // CALCULATE METRICS FROM REAL DATA
    // ============================================

    // Total messages (requests) in current and previous period
    const currentMessages = recentSessions.flatMap(s => s.messages);
    const previousMessages = previousSessions.flatMap(s => s.messages);
    
    const totalRequests = currentMessages.length;
    const previousTotal = previousMessages.length;
    const requestChange = previousTotal > 0 
      ? Math.round(((totalRequests - previousTotal) / previousTotal) * 100) 
      : (totalRequests > 0 ? 100 : 0);

    // Calculate average latency from actual message latency
    const messagesWithLatency = currentMessages.filter(m => m.latencyMs && m.latencyMs > 0);
    const avgLatency = messagesWithLatency.length > 0
      ? Math.round(messagesWithLatency.reduce((sum, m) => sum + (m.latencyMs || 0), 0) / messagesWithLatency.length)
      : 250; // Default estimate

    const previousLatencies = previousMessages.filter(m => m.latencyMs && m.latencyMs > 0);
    const prevAvgLatency = previousLatencies.length > 0
      ? Math.round(previousLatencies.reduce((sum, m) => sum + (m.latencyMs || 0), 0) / previousLatencies.length)
      : avgLatency;
    const latencyChange = prevAvgLatency > 0
      ? Math.round(((avgLatency - prevAvgLatency) / prevAvgLatency) * 100)
      : 0;

    // Calculate success rate (messages without errors)
    const successfulMessages = currentMessages.filter(m => m.role === 'assistant' && m.content && m.content.length > 0);
    const userMessages = currentMessages.filter(m => m.role === 'user');
    const avgSuccessRate = userMessages.length > 0
      ? Math.round((successfulMessages.length / userMessages.length) * 1000) / 10
      : 100;

    const prevSuccessful = previousMessages.filter(m => m.role === 'assistant' && m.content && m.content.length > 0);
    const prevUserMessages = previousMessages.filter(m => m.role === 'user');
    const prevSuccessRate = prevUserMessages.length > 0
      ? Math.round((prevSuccessful.length / prevUserMessages.length) * 1000) / 10
      : 100;
    const successChange = Math.round((avgSuccessRate - prevSuccessRate) * 10) / 10;

    // Calculate total tokens
    const totalTokens = currentMessages.reduce((sum, m) => sum + (m.tokenCount || 0), 0) +
                        recentInteractions.reduce((sum, i) => sum + (i.totalTokens || 0), 0);

    // Estimate cost based on tokens
    const totalCost = (totalTokens / 1000) * MODEL_COSTS.default;

    // ============================================
    // AGENT/MODEL USAGE DISTRIBUTION
    // ============================================
    
    const agentUsage: Record<string, { count: number; tokens: number; name: string }> = {};
    
    recentSessions.forEach(session => {
      const agentId = session.agentId || 'general';
      const agentName = session.agent?.name || 'General Chat';
      if (!agentUsage[agentId]) {
        agentUsage[agentId] = { count: 0, tokens: 0, name: agentName };
      }
      agentUsage[agentId].count += session.messages.length;
      agentUsage[agentId].tokens += session.messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0);
    });

    const totalAgentUsage = Object.values(agentUsage).reduce((sum, a) => sum + a.count, 0);
    const modelUsage = Object.entries(agentUsage)
      .map(([agentId, data], index) => ({
        model: data.name || agentId,
        usage: data.count,
        percentage: totalAgentUsage > 0 ? Math.round((data.count / totalAgentUsage) * 100) : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8);

    // If no usage, add placeholder
    if (modelUsage.length === 0) {
      modelUsage.push({ model: 'No activity yet', usage: 0, percentage: 100, color: COLORS[0] });
    }

    // ============================================
    // API REQUESTS BY DAY (Last 7 Days)
    // ============================================
    
    const apiMetrics = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayMessages = currentMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return msgDate >= dayStart && msgDate <= dayEnd;
      });
      
      const dayLatencies = dayMessages.filter(m => m.latencyMs && m.latencyMs > 0);
      const dayAvgLatency = dayLatencies.length > 0
        ? Math.round(dayLatencies.reduce((sum, m) => sum + (m.latencyMs || 0), 0) / dayLatencies.length)
        : 0;
      
      const dayTokens = dayMessages.reduce((sum, m) => sum + (m.tokenCount || 0), 0);
      
      apiMetrics.push({
        date: dayStart.toISOString().split('T')[0],
        requests: dayMessages.filter(m => m.role === 'user').length,
        latency: dayAvgLatency,
        successRate: 100,
        failureRate: 0,
        tokenUsage: dayTokens,
        responseSize: Math.round(dayMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / 1024), // KB
      });
    }

    // ============================================
    // SUCCESS/FAILURE BY DAY
    // ============================================
    
    const successFailure = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayUserMsgs = currentMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return m.role === 'user' && msgDate >= dayStart && msgDate <= dayEnd;
      });
      
      const dayAssistantMsgs = currentMessages.filter(m => {
        const msgDate = new Date(m.createdAt);
        return m.role === 'assistant' && msgDate >= dayStart && msgDate <= dayEnd;
      });
      
      // Failed = user messages without a response
      const successful = dayAssistantMsgs.length;
      const failed = Math.max(0, dayUserMsgs.length - dayAssistantMsgs.length);
      
      successFailure.push({
        day: dayStart.toISOString().split('T')[0],
        successful,
        failed,
      });
    }

    // ============================================
    // PEAK TRAFFIC HOURS (Last 7 Days)
    // ============================================
    
    const hourlyTraffic: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyTraffic[i] = 0;
    
    currentMessages.forEach(m => {
      const hour = new Date(m.createdAt).getHours();
      hourlyTraffic[hour]++;
    });
    
    const peakTraffic = Object.entries(hourlyTraffic).map(([hour, requests]) => ({
      hour: parseInt(hour),
      requests,
    }));

    // ============================================
    // TOKEN USAGE TREND
    // ============================================
    
    const tokenTrend = apiMetrics.map(day => ({
      date: day.date,
      tokens: day.tokenUsage,
    }));

    // ============================================
    // ERROR BREAKDOWN
    // ============================================
    
    // Count messages that might indicate errors (very short assistant responses)
    const errorMessages = currentMessages.filter(m => 
      m.role === 'assistant' && m.content && m.content.length < 50 && 
      (m.content.includes('error') || m.content.includes('sorry') || m.content.includes('unable'))
    );
    
    const errorTypes: Record<string, number> = {
      'Rate Limit': 0,
      'Timeout': 0,
      'Invalid Request': 0,
      'Server Error': 0,
    };
    
    errorMessages.forEach(m => {
      const content = m.content?.toLowerCase() || '';
      if (content.includes('rate') || content.includes('limit')) errorTypes['Rate Limit']++;
      else if (content.includes('timeout') || content.includes('took too long')) errorTypes['Timeout']++;
      else if (content.includes('invalid') || content.includes('cannot')) errorTypes['Invalid Request']++;
      else errorTypes['Server Error']++;
    });
    
    const totalErrors = Object.values(errorTypes).reduce((sum, c) => sum + c, 0);
    const errors = Object.entries(errorTypes)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
      }));

    // ============================================
    // GEOGRAPHIC DISTRIBUTION (from interactions if available)
    // ============================================
    
    // Since we don't track geo data, we'll show channel distribution instead
    const channelCounts: Record<string, number> = { web: 0, mobile: 0, api: 0 };
    recentInteractions.forEach(i => {
      const channel = i.channel || 'web';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
    
    // If no interactions, count sessions
    if (Object.values(channelCounts).reduce((s, c) => s + c, 0) === 0) {
      channelCounts.web = recentSessions.length;
    }
    
    const totalChannels = Object.values(channelCounts).reduce((s, c) => s + c, 0);
    const geographic = [
      { region: 'Web Platform', requests: channelCounts.web, percentage: totalChannels > 0 ? Math.round((channelCounts.web / totalChannels) * 100) : 100 },
      { region: 'Mobile App', requests: channelCounts.mobile, percentage: totalChannels > 0 ? Math.round((channelCounts.mobile / totalChannels) * 100) : 0 },
      { region: 'API Direct', requests: channelCounts.api, percentage: totalChannels > 0 ? Math.round((channelCounts.api / totalChannels) * 100) : 0 },
    ].filter(g => g.requests > 0);

    if (geographic.length === 0) {
      geographic.push({ region: 'Web Platform', requests: 0, percentage: 100 });
    }

    // ============================================
    // COST BY AGENT/MODEL
    // ============================================
    
    const costData = Object.entries(agentUsage)
      .map(([agentId, data]) => {
        const tokenCost = (data.tokens / 1000) * MODEL_COSTS.default;
        return {
          model: data.name || agentId,
          cost: Math.round(tokenCost * 100) / 100,
          percentage: totalTokens > 0 ? Math.round((data.tokens / totalTokens) * 100) : 0,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6);

    if (costData.length === 0) {
      costData.push({ model: 'No usage', cost: 0, percentage: 100 });
    }

    // ============================================
    // ACTIVE AGENTS (Top performing)
    // ============================================
    
    const activeAgents = Object.entries(agentUsage)
      .map(([agentId, data]) => ({
        agentId,
        name: data.name,
        interactions: data.count,
        tokens: data.tokens,
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);

    // ============================================
    // RETURN COMPREHENSIVE ANALYTICS
    // ============================================

    return NextResponse.json({
      stats: {
        totalRequests,
        requestChange,
        avgLatency,
        latencyChange,
        avgSuccessRate,
        successChange,
        totalCost: Math.round(totalCost * 100) / 100,
        totalTokens,
        activeSessions: recentSessions.filter(s => s.isActive).length,
        totalAgents: Object.keys(agentUsage).length,
      },
      apiMetrics,
      modelUsage,
      successFailure,
      peakTraffic,
      errors,
      geographic,
      costData,
      tokenTrend,
      activeAgents,
      // Additional context
      meta: {
        periodStart: sevenDaysAgo.toISOString(),
        periodEnd: now.toISOString(),
        lastUpdated: now.toISOString(),
        dataSource: 'real-time',
      },
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    // Return empty data structure on error
    return NextResponse.json({
      stats: {
        totalRequests: 0,
        requestChange: 0,
        avgLatency: 0,
        latencyChange: 0,
        avgSuccessRate: 100,
        successChange: 0,
        totalCost: 0,
        totalTokens: 0,
        activeSessions: 0,
        totalAgents: 0,
      },
      apiMetrics: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        return {
          date: date.toISOString().split('T')[0],
          requests: 0,
          latency: 0,
          successRate: 100,
          failureRate: 0,
          tokenUsage: 0,
          responseSize: 0,
        };
      }),
      modelUsage: [{ model: 'No data', usage: 0, percentage: 100, color: '#6366f1' }],
      successFailure: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        return { day: date.toISOString().split('T')[0], successful: 0, failed: 0 };
      }),
      peakTraffic: Array.from({ length: 24 }, (_, hour) => ({ hour, requests: 0 })),
      errors: [],
      geographic: [{ region: 'Web Platform', requests: 0, percentage: 100 }],
      costData: [{ model: 'No usage', cost: 0, percentage: 100 }],
      tokenTrend: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        return { date: date.toISOString().split('T')[0], tokens: 0 };
      }),
      activeAgents: [],
      meta: {
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        dataSource: 'error-fallback',
        error: String(error),
      },
    });
  }
}
