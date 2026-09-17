'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  MessageSquare,
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  RefreshCcw,
  Download,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalyticsData } from '@/models/analytics';
import AdvancedCharts from '@/components/AdvancedCharts';
import { exportAnalyticsToPDF } from '@/lib/pdfExport';

export const dynamic = 'force-dynamic';

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDateLabel = (value: string) => {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'short',
    });
  } catch {
    return value;
  }
};

const formatTimestamp = (value: string) => {
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const statusColorMap: Record<string, string> = {
  success: 'bg-green-900/20 text-green-400 border-green-500/30',
  completed: 'bg-green-900/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30',
  failed: 'bg-red-900/20 text-red-600 border-red-500/30',
  error: 'bg-red-900/20 text-red-600 border-red-500/30',
};

export default function DashboardAnalyticsPage() {
  const { state } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchAnalytics = useCallback(async () => {
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
      const response = await fetch('/api/user/analytics', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'error' in payload
            ? (payload as { error?: string }).error
            : undefined) ||
          (payload && typeof payload === 'object' && 'message' in payload
            ? (payload as { message?: string }).message
            : undefined) ||
          'Failed to load analytics';
        throw new Error(message);
      }

      setAnalyticsData(payload as AnalyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      console.error('Error fetching analytics:', err);
      setError((err as Error).message || 'Unable to load analytics');
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [state.user]);

  const handleExportPDF = useCallback(async () => {
    if (!analyticsData) return;

    try {
      await exportAnalyticsToPDF(analyticsData, {
        filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        title: 'Analytics Report',
        includeCharts: true,
        includeTables: true,
        includeMetrics: true,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF report');
    }
  }, [analyticsData, setError]);

  useEffect(() => {
    if (!state.user) return;

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);

    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [state.user, fetchAnalytics]);

  const averageResponseTime = analyticsData?.agentPerformance?.length
    ? (
      analyticsData.agentPerformance.reduce(
        (sum, agent) => sum + (agent.avgResponseTime || 0),
        0
      ) / analyticsData.agentPerformance.length
    ).toFixed(0)
    : '0';

  const successRate = analyticsData?.agentPerformance?.length
    ? (
      analyticsData.agentPerformance.reduce(
        (sum, agent) => sum + (agent.successRate || 0),
        0
      ) / analyticsData.agentPerformance.length
    ).toFixed(1)
    : '0.0';

  const totalMessages =
    analyticsData?.dailyUsage?.reduce(
      (sum, day) => sum + (day.messages || 0),
      0
    ) || 0;

  const dailyUsageMax =
    analyticsData?.dailyUsage?.reduce((max, day) => {
      const total = day.conversations + day.messages + day.apiCalls;
      return Math.max(max, total);
    }, 0) || 1;

  const metricCards = analyticsData
    ? [
      {
        label: 'Conversations',
        value: (analyticsData?.usage?.conversations?.current ?? 0).toLocaleString(),
        delta: analyticsData?.weeklyTrend?.conversationsChange ?? '+0%',
        icon: MessageSquare,
      },
      {
        label: 'API Calls',
        value: (analyticsData?.usage?.apiCalls?.current ?? 0).toLocaleString(),
        delta: analyticsData?.weeklyTrend?.apiCallsChange ?? '+0%',
        icon: Zap,
      },
      {
        label: 'Active Agents',
        value: (analyticsData?.usage?.agents?.current ?? 0).toString(),
        delta: `${analyticsData?.usage?.agents?.current ?? 0}/${analyticsData?.usage?.agents?.limit ?? 10} in use`,
        icon: Users,
      },
      {
        label: 'Messages Sent',
        value: (analyticsData?.usage?.messages?.current ?? 0).toLocaleString(),
        delta: analyticsData?.weeklyTrend?.messagesChange ?? '+0%',
        icon: Activity,
      },
    ]
    : [];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#030304] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!analyticsData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#030304] flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <h2 className="text-2xl font-semibold text-white mb-3">
              {error || 'We could not load your analytics.'}
            </h2>
            <p className="text-gray-400 mb-6">
              Please verify your session is active and refresh to try again.
            </p>
            <button
              onClick={() => fetchAnalytics()}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Retry fetch'}
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const recentDailyUsage = analyticsData.dailyUsage.slice(-7);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
        {/* Background gradient orbs - Legal page theme */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="gradient-orb-1 absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
          <div className="gradient-orb-2 absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
          <div className="gradient-orb-3 absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-black" />

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${10 + (i * 7)}%`,
                  top: `${20 + (i % 4) * 18}%`,
                  background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#10b981',
                  opacity: 0.3
                }}
              />
            ))}
          </div>

          <div className="container-custom text-center relative z-10">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-white/[0.04] border border-white/[0.08] shadow-2xl shadow-cyan-500/10 mb-8">
              <Activity className="w-14 h-14 text-cyan-400" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Analytics & Insights</span></h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed">
              Real-time visibility into usage, performance, and costs
            </p>
            <div className="w-40 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 mx-auto mb-10 rounded-full" />

            {lastUpdated && (
              <p className="text-sm text-gray-500 mb-6">
                Last updated{' '}
                {lastUpdated.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleExportPDF}
                className="hero-badge px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium backdrop-blur-sm hover:bg-cyan-500/20 transition-colors"
                disabled={!analyticsData}
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export PDF
              </button>
              <button
                onClick={() => fetchAnalytics()}
                className="hero-badge px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium backdrop-blur-sm hover:bg-purple-500/20 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCcw className={`w-4 h-4 inline mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <Link
                href="/dashboard"
                className="hero-badge px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium backdrop-blur-sm hover:bg-emerald-500/20 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <section className="py-4 px-4 bg-amber-500/10 border-b border-amber-500/30">
            <div className="container-custom text-center">
              <p className="font-medium text-amber-400">⚠️ Live data warning: {error}</p>
            </div>
          </section>
        )}

        <section className="relative py-16 px-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {metricCards.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors overflow-hidden group"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-400">{metric.label}</p>
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                        <metric.icon className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {metric.value}
                    </p>
                    <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {metric.delta}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Usage overview</p>
                    <h3 className="text-xl font-semibold text-white">
                      Last 7 days traffic
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    {analyticsData.weeklyTrend.conversationsChange} vs last week
                  </span>
                </div>
                <div className="mt-8 flex items-end gap-4">
                  {recentDailyUsage.map((day) => {
                    const total =
                      day.conversations + day.messages + day.apiCalls;
                    const height = Math.min(
                      100,
                      Math.max(6, (total / dailyUsageMax) * 100)
                    );
                    return (
                      <div key={day.date} className="flex-1">
                        <div className="w-full h-40 bg-white/[0.03] rounded-2xl relative overflow-hidden border border-white/[0.06]">
                          <div
                            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cyan-500 via-purple-500 to-purple-400"
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                        <p className="mt-3 text-xs font-medium text-gray-400 text-center">
                          {formatDateLabel(day.date)}
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          {total.toLocaleString()} events
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-gray-400">Conversations</p>
                    <p className="text-lg font-semibold text-white">
                      {(analyticsData?.usage?.conversations?.current ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-gray-400">Messages</p>
                    <p className="text-lg font-semibold text-white">
                      {(analyticsData?.usage?.messages?.current ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-gray-400">API Calls</p>
                    <p className="text-lg font-semibold text-white">
                      {(analyticsData?.usage?.apiCalls?.current ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-gray-400">Total messages (30d)</p>
                    <p className="text-lg font-semibold text-white">
                      {(totalMessages ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Cost analysis</p>
                    <h3 className="text-xl font-semibold text-white">
                      Spend overview
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Current month
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(analyticsData.costAnalysis.currentMonth)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Projected spend</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        analyticsData.costAnalysis.projectedMonth
                      )}
                    </span>
                  </div>
                </div>
                <ul className="mt-6 space-y-4">
                  {analyticsData.costAnalysis.breakdown.map((item) => (
                    <li
                      key={item.category}
                      className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {item.category}
                        </p>
                        <p className="text-gray-500">
                          {item.percentage}% of spend
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(item.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Billing data updates hourly
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Team performance</p>
                    <h3 className="text-xl font-semibold text-white">
                      Agent response quality
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
                    {successRate}% avg success
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="py-3 text-left font-medium">Agent</th>
                        <th className="py-3 text-left font-medium">
                          Conversations
                        </th>
                        <th className="py-3 text-left font-medium">
                          Avg response
                        </th>
                        <th className="py-3 text-left font-medium">Success</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.agentPerformance.map((agent) => (
                        <tr
                          key={agent.name}
                          className="border-t border-white/[0.06]"
                        >
                          <td className="py-3">
                            <p className="font-medium text-white">
                              {agent.name || 'Unknown Agent'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(agent.messages ?? 0).toLocaleString()} messages
                            </p>
                          </td>
                          <td className="py-3 text-white">
                            {(agent.conversations ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-white">
                            {((agent.avgResponseTime ?? 0) / 1000).toFixed(1)}s
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      agent.successRate
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-white">
                                {agent.successRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Latest activity</p>
                    <h3 className="text-xl font-semibold text-white">
                      Audit trail
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <ul className="space-y-4">
                  {analyticsData.recentActivity.length > 0 ? (
                    analyticsData.recentActivity.slice(0, 6).map((activity) => {
                      const statusKey = activity.status
                        ? activity.status.toLowerCase()
                        : '';
                      const badgeClass =
                        statusColorMap[statusKey] ||
                        'bg-white/[0.04] text-gray-400 border-white/[0.06]';
                      return (
                        <li
                          key={`${activity.timestamp}-${activity.agent}`}
                          className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4 last:border-b-0 last:pb-0"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {activity.action}
                            </p>
                            <p className="text-sm text-gray-500">
                              {activity.agent}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full border text-xs font-medium ${badgeClass}`}
                            >
                              {activity.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <Activity className="w-12 h-12 mx-auto opacity-50" />
                      </div>
                      <p className="text-gray-400 font-medium">No recent activity</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Start chatting with AI agents to see your activity here
                      </p>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Advanced Charts Section */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
                    Advanced Analytics
                  </h2>
                  <p className="text-gray-400">
                    Interactive charts and detailed insights
                  </p>
                </div>
                <button
                  onClick={() => fetchAnalytics()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCcw
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh Charts
                </button>
              </div>
              <AdvancedCharts analyticsData={analyticsData} />
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
