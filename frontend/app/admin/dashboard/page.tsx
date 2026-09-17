'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Eye,
  MousePointerClick,
  Activity,
  MessageSquare,
  Zap,
  CreditCard,
  Server,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  Timer,
  Globe,
  Wrench,
} from 'lucide-react';
import { useAdminSSE } from '@/hooks/useAdminSSE';

const API_BASE = '/api/admin/dashboard';

interface OverviewData {
  realtime: { activeSessions: number; timestamp: string };
  users: { total: number; newToday: number; new7d: number };
  visitors: { total: number; today: number; last7d: number };
  pageViews: { total: number; today: number; last7d: number; last30d: number };
  apiCalls: { today: number; last7d: number };
  chats: { today: number; last7d: number };
  tools: { today: number };
  events: { today: number };
  revenue: { total: number; transactions: number };
}

interface RealtimeData {
  activeSessions: number;
  activeVisitors: number;
  recentPageViews: Array<{
    url: string;
    visitorId: string;
    timestamp: string;
    userId: string | null;
  }>;
  recentApiCalls: Array<{
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress: string;
    timestamp: string;
  }>;
  recentSessions: Array<{
    sessionId: string;
    visitorId: string;
    userId: string | null;
    startTime: string;
    lastActivity: string;
    pageViews: number;
    events: number;
    duration: number;
  }>;
  recentChats: number;
  recentErrors: number;
  timestamp: string;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  const isPositive = change && !change.startsWith('-');
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isPositive ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-gray-500">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

function LiveIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-sm font-medium text-green-400">{count} live</span>
    </div>
  );
}

function RealtimeFeed({ data }: { data: RealtimeData | null }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Active Sessions */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            Active Sessions
          </h3>
          <LiveIndicator count={data.activeSessions} />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {data.recentSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No active sessions
            </div>
          ) : (
            data.recentSessions.map((sess) => (
              <div
                key={sess.sessionId}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-mono">
                    {sess.userId
                      ? `User: ${sess.userId.slice(0, 8)}...`
                      : `Visitor: ${sess.visitorId.slice(0, 8)}...`}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {sess.pageViews} pages · {Math.floor(sess.duration / 60)}m{' '}
                    {sess.duration % 60}s
                  </p>
                </div>
                <span className="text-[10px] text-gray-600 tabular-nums">
                  {new Date(sess.lastActivity).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Page Views */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            Live Page Views
          </h3>
          <span className="text-xs text-gray-500">Last 5 min</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {data.recentPageViews.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No recent page views
            </div>
          ) : (
            data.recentPageViews.map((pv, i) => (
              <div
                key={`${pv.visitorId}-${i}`}
                className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
                <p className="text-xs text-gray-300 truncate flex-1 font-mono">
                  {pv.url}
                </p>
                <span className="text-[10px] text-gray-600 tabular-nums shrink-0">
                  {new Date(pv.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent API Calls */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            Live API Traffic
          </h3>
          <span className="text-xs text-gray-500">Last 1 min</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {data.recentApiCalls.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No recent API calls
            </div>
          ) : (
            data.recentApiCalls.map((api, i) => (
              <div
                key={`${api.endpoint}-${i}`}
                className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors text-xs"
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                    api.method === 'GET'
                      ? 'bg-green-500/10 text-green-400'
                      : api.method === 'POST'
                        ? 'bg-blue-500/10 text-blue-400'
                        : api.method === 'DELETE'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {api.method}
                </span>
                <span className="text-gray-300 truncate flex-1 font-mono">
                  {api.endpoint}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    api.statusCode < 400 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {api.statusCode}
                </span>
                <span className="text-[10px] text-gray-600 tabular-nums">
                  {api.responseTime}ms
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Real-time Pulse
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/[0.03]">
          <div className="bg-[#111113] p-4 text-center">
            <p className="text-2xl font-bold text-green-400">
              {data.activeSessions}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Active Sessions</p>
          </div>
          <div className="bg-[#111113] p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {data.activeVisitors}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Active Visitors</p>
          </div>
          <div className="bg-[#111113] p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {data.recentChats}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Chats (5m)</p>
          </div>
          <div className="bg-[#111113] p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {data.recentErrors}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Errors (5m)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // SSE real-time stream
  const { data: sseData, isConnected, status: sseStatus, reconnect } = useAdminSSE({
    events: ['realtime', 'overview'],
    enabled: autoRefresh,
  });

  // Update state from SSE events
  useEffect(() => {
    if (sseData.overview) {
      setOverview(sseData.overview);
      setLoading(false);
    }
  }, [sseData.overview]);

  useEffect(() => {
    if (sseData.realtime) {
      setRealtime(sseData.realtime);
      setLastRefresh(new Date());
      setLoading(false);
    }
  }, [sseData.realtime]);

  // Fallback: initial fetch if SSE takes time
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/overview`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setOverview(json.data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
  }, []);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/realtime`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setRealtime(json.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch realtime:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchRealtime()]);
    setLoading(false);
  }, [fetchOverview, fetchRealtime]);

  // Initial fetch as fallback (SSE may need a moment to connect)
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time platform analytics & monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              autoRefresh && isConnected
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : autoRefresh && sseStatus === 'connecting'
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-white/5 text-gray-400 border border-white/[0.06]'
            }`}
          >
            {autoRefresh && isConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : autoRefresh && sseStatus === 'connecting' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {autoRefresh && sseStatus === 'connected' ? 'Live SSE' : autoRefresh && sseStatus === 'polling' ? 'Polling' : autoRefresh ? 'Connecting...' : 'Paused'}
          </button>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:text-white border border-white/[0.06] hover:border-white/[0.1] transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <span className="text-[10px] text-gray-600">
            {isConnected ? '● Streaming every 3s' : `Updated ${lastRefresh.toLocaleTimeString()}`}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && !overview && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <StatCard
            title="Total Users"
            value={overview.users.total}
            change={`+${overview.users.newToday} today`}
            icon={Users}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            title="Active Sessions"
            value={overview.realtime.activeSessions}
            icon={Activity}
            color="bg-green-500/10 text-green-400"
            subtitle="Right now"
          />
          <StatCard
            title="Visitors (7d)"
            value={overview.visitors.last7d}
            change={`${overview.visitors.today} today`}
            icon={Eye}
            color="bg-purple-500/10 text-purple-400"
            subtitle={`${overview.visitors.total} total`}
          />
          <StatCard
            title="Page Views Today"
            value={overview.pageViews.today}
            icon={MousePointerClick}
            color="bg-cyan-500/10 text-cyan-400"
            subtitle={`${overview.pageViews.last7d} this week`}
          />
          <StatCard
            title="API Calls Today"
            value={overview.apiCalls.today}
            icon={Server}
            color="bg-orange-500/10 text-orange-400"
            subtitle={`${overview.apiCalls.last7d} this week`}
          />
          <StatCard
            title="Chats Today"
            value={overview.chats.today}
            icon={MessageSquare}
            color="bg-pink-500/10 text-pink-400"
            subtitle={`${overview.chats.last7d} this week`}
          />
          <StatCard
            title="Tool Uses Today"
            value={overview.tools.today}
            icon={Wrench}
            color="bg-yellow-500/10 text-yellow-400"
          />
          <StatCard
            title="Events Today"
            value={overview.events.today}
            icon={Zap}
            color="bg-indigo-500/10 text-indigo-400"
          />
          <StatCard
            title="Revenue"
            value={`$${(overview.revenue.total / 100).toFixed(2)}`}
            icon={CreditCard}
            color="bg-emerald-500/10 text-emerald-400"
            subtitle={`${overview.revenue.transactions} transactions`}
          />
          <StatCard
            title="New Users (7d)"
            value={overview.users.new7d}
            change={`+${overview.users.newToday} today`}
            icon={TrendingUp}
            color="bg-rose-500/10 text-rose-400"
          />
        </div>
      )}

      {/* Real-time feeds */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Real-time Activity
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </h2>
        <RealtimeFeed data={realtime} />
      </div>
    </div>
  );
}
