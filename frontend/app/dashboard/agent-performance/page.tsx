'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  MessageSquare,
  Clock,
  Target,
  Zap,
  RefreshCcw,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { gsap, ScrollTrigger, CustomWiggle, Observer } from '@/lib/gsap';
import { allAgents } from '@/lib/agentRegistry';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, Observer);

type TrendDirection = 'up' | 'down';

interface AgentPerformanceData {
  agent: {
    name: string;
    type: string;
    avatar: string;
    status: 'active' | 'idle' | 'maintenance';
  };
  metrics: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    satisfactionScore: number;
    activeUsers: number;
    uptime: number;
  };
  trends: {
    conversations: { value: number; change: string; trend: TrendDirection };
    messages: { value: number; change: string; trend: TrendDirection };
    responseTime: { value: number; change: string; trend: TrendDirection };
    satisfaction: { value: number; change: string; trend: TrendDirection };
  };
  recentActivity: Array<{
    timestamp: string;
    type: string;
    description: string;
    user?: string;
  }>;
  timeRange: string;
  dataRefreshed?: string;
}

const agentOptions = [
  { id: 'default', name: 'All Agents (AI Studio)', icon: '🤖' },
  ...allAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
  })),
];

const timeRangeOptions = [
  { id: '1d', name: 'Last 24 Hours' },
  { id: '7d', name: 'Last 7 Days' },
  { id: '30d', name: 'Last 30 Days' },
];

const statusBadgeMap: Record<string, string> = {
  active: 'bg-green-900/20 text-green-400 border border-green-500/30',
  idle: 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30',
  maintenance: 'bg-red-900/20 text-red-600 border border-red-500/30',
};

const getTrendIcon = (trend: TrendDirection) =>
  trend === 'up' ? (
    <TrendingUp className="w-4 h-4 text-green-500" />
  ) : (
    <TrendingDown className="w-4 h-4 text-red-500" />
  );

function AgentPerformanceDashboard() {
  const { state } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState('default');
  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<AgentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchPerformance = useCallback(async () => {
    if (!state.user) return;

    setError(null);

    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const controller = new AbortController();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `/api/agent/performance/${selectedAgent}?timeRange=${timeRange}`,
        {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        }
      );

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'message' in payload
            ? (payload as { message?: string }).message
            : undefined) ||
          (payload && typeof payload === 'object' && 'error' in payload
            ? (payload as { error?: string }).error
            : undefined) ||
          'Failed to load agent performance';
        throw new Error(message);
      }

      const typedPayload = payload as { data?: AgentPerformanceData };
      if (!typedPayload.data) {
        throw new Error('Agent performance response was empty');
      }

      setData(typedPayload.data);
      setLastUpdated(
        typedPayload.data.dataRefreshed
          ? new Date(typedPayload.data.dataRefreshed)
          : new Date()
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      console.error('Error fetching agent performance:', err);
      setError((err as Error).message || 'Unable to load agent metrics');
      setData(null);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [state.user, selectedAgent, timeRange]);

  useEffect(() => {
    if (!state.user) return;

    fetchPerformance();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [state.user, fetchPerformance]);

  const statusBadge =
    statusBadgeMap[data?.agent?.status ?? ''] ||
    'bg-white/[0.04] text-gray-400 border border-white/[0.06]';

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#030304] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading agent performance...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!data) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#030304] flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">
              {error || 'Unable to load agent metrics'}
            </h2>
            <p className="text-gray-400 mb-6">
              Confirm your session is active and refresh the metrics.
            </p>
            <button
              onClick={() => fetchPerformance()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Retry fetch'}
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
        {/* Animated Background - Legal Page Theme */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                left: `${5 + i * 6}%`,
                top: `${10 + (i % 5) * 18}%`,
                background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#10b981',
                opacity: 0.4,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
          <div className="container-custom text-center relative z-10">
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium mb-8">
              <Activity className="w-4 h-4" />
              <span>Performance Analytics</span>
            </div>

            {/* Hero Icon */}
            <div className="inline-flex items-center justify-center w-28 h-28 bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm rounded-3xl mb-8">
              <Activity className="w-14 h-14 text-purple-400" />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {data?.agent?.name ?? 'AI Agent'}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-3">
              Monitoring {data?.agent?.type ?? 'Assistant'} ·{' '}
              {timeRangeOptions.find((t) => t.id === timeRange)?.name}
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mb-8">
                Last updated{' '}
                {lastUpdated.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}

            {/* Gradient Line */}
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 rounded-full mx-auto mb-8" />

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        {/* Controls Section */}
        <section className="py-6 px-4 bg-white/[0.02] border-y border-white/[0.06]">
          <div className="container-custom">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select agent
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(event) => setSelectedAgent(event.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {agentOptions.map((agentOption) => (
                      <option key={agentOption.id} value={agentOption.id}>
                        {agentOption.icon} {agentOption.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Time range
                  </label>
                  <select
                    value={timeRange}
                    onChange={(event) => setTimeRange(event.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {timeRangeOptions.map((range) => (
                      <option key={range.id} value={range.id}>
                        {range.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-xs uppercase text-gray-500 mb-1">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge}`}
                  >
                    {(data?.agent?.status ?? 'idle').charAt(0).toUpperCase() +
                      (data?.agent?.status ?? 'idle').slice(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => fetchPerformance()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all inline-flex items-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCcw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                {isRefreshing ? 'Refreshing…' : 'Refresh data'}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <section className="py-4 px-4 bg-yellow-500/10 border-b border-yellow-500/30">
            <div className="container-custom">
              <p className="font-medium text-yellow-400">Real-time fetch warning</p>
              <p className="text-sm mt-1 text-yellow-300/70">{error}</p>
            </div>
          </section>
        )}

        {/* Performance Content */}
        <section className="py-12 px-4 relative z-10">
          <div className="container-custom">
            {/* Agent Info Card */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 mb-8 hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-4">
                <div
                  className="text-5xl"
                  role="img"
                  aria-label={data?.agent?.name ?? 'AI Agent'}
                >
                  {data?.agent?.avatar ?? '🤖'}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {data?.agent?.name ?? 'AI Agent'}
                  </h2>
                  <p className="text-gray-400">
                    {data?.agent?.type ?? 'Assistant'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(data?.metrics?.totalConversations ?? 0).toLocaleString()}{' '}
                    conversations in this window
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
              {[
                {
                  label: 'Total conversations',
                  value: (
                    data?.metrics?.totalConversations ?? 0
                  ).toLocaleString(),
                  change: data?.trends?.conversations?.change ?? '+0%',
                  icon: MessageSquare,
                  trend: data?.trends?.conversations?.trend ?? 'up',
                  color: 'cyan',
                },
                {
                  label: 'Total messages',
                  value: (data?.metrics?.totalMessages ?? 0).toLocaleString(),
                  change: data?.trends?.messages?.change ?? '+0%',
                  icon: Zap,
                  trend: data?.trends?.messages?.trend ?? 'up',
                  color: 'purple',
                },
                {
                  label: 'Avg response time',
                  value: `${(data?.metrics?.averageResponseTime ?? 0).toFixed(
                    1
                  )} s`,
                  change: data?.trends?.responseTime?.change ?? '+0%',
                  icon: Clock,
                  trend: data?.trends?.responseTime?.trend ?? 'up',
                  color: 'emerald',
                },
                {
                  label: 'Satisfaction score',
                  value: `${(data?.metrics?.satisfactionScore ?? 0).toFixed(
                    1
                  )}/5`,
                  change: data?.trends?.satisfaction?.change ?? '+0%',
                  icon: Target,
                  trend: data?.trends?.satisfaction?.trend ?? 'up',
                  color: 'purple',
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-400">{metric.label}</p>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.color === 'cyan' ? 'bg-cyan-500/20 border border-cyan-500/30' :
                      metric.color === 'emerald' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                        'bg-purple-500/20 border border-purple-500/30'
                      }`}>
                      <metric.icon className={`w-5 h-5 ${metric.color === 'cyan' ? 'text-cyan-400' :
                        metric.color === 'emerald' ? 'text-emerald-400' :
                          'text-purple-400'
                        }`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {metric.value}
                  </p>
                  <p
                    className={`text-sm mt-2 flex items-center gap-1 ${metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                  >
                    {getTrendIcon(metric.trend)}
                    {metric.change}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Active users</p>
                    <p className="text-3xl font-bold text-white">
                      {(data?.metrics?.activeUsers ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Unique people who interacted with this agent during the selected
                  window.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Uptime</p>
                    <p className="text-3xl font-bold text-white">
                      {data?.metrics?.uptime ?? 99.9}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Availability is tracked via health pings from the agent runtime.
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Response insights</p>
                    <p className="text-3xl font-bold text-white">
                      {(data?.metrics?.averageResponseTime ?? 0).toFixed(1)}s
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Aim to keep response times under 2s for best satisfaction.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400">Recent activity</p>
                  <h3 className="text-xl font-semibold text-white">
                    Conversation timeline
                  </h3>
                </div>
              </div>
              {(data?.recentActivity?.length ?? 0) === 0 ? (
                <p className="text-gray-500">
                  No conversations during this window.
                </p>
              ) : (
                <ul className="space-y-4">
                  {(data?.recentActivity ?? []).map((activity) => (
                    <li
                      key={`${activity.timestamp}-${activity.user}`}
                      className="flex items-start gap-4 border-b border-white/[0.06] pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center text-sm font-semibold">
                        {activity.user?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {activity.description}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {activity.user || 'Anonymous user'}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {activity.timestamp}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

export default function AgentPerformancePage() {
  return <AgentPerformanceDashboard />;
}
