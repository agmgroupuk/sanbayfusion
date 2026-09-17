'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface ApiMetrics {
  date: string;
  requests: number;
  latency: number;
  successRate: number;
  failureRate: number;
  tokenUsage: number;
  responseSize: number;
}

interface ModelUsage {
  model: string;
  usage: number;
  percentage: number;
  color: string;
}

interface ErrorType {
  type: string;
  count: number;
  percentage: number;
}

interface GeographicData {
  region: string;
  requests: number;
  percentage: number;
}

interface PeakTraffic {
  hour: number;
  requests: number;
}

interface CostData {
  model: string;
  cost: number;
  percentage: number;
}

interface TokenTrendPoint {
  date: string;
  tokens: number;
}

interface DashboardStats {
  totalRequests: number;
  requestChange: number;
  avgLatency: number;
  latencyChange: number;
  avgSuccessRate: number;
  successChange: number;
  totalCost: number;
}

interface AdvancedAnalyticsPayload {
  stats: DashboardStats;
  apiMetrics: ApiMetrics[];
  modelUsage: ModelUsage[];
  successFailure: { day: string; successful: number; failed: number }[];
  peakTraffic: PeakTraffic[];
  errors: ErrorType[];
  geographic: GeographicData[];
  costData: CostData[];
  tokenTrend: TokenTrendPoint[];
}

export default function AdvancedDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [successFailure, setSuccessFailure] = useState<
    AdvancedAnalyticsPayload['successFailure']
  >([]);
  const [peakTraffic, setPeakTraffic] = useState<PeakTraffic[]>([]);
  const [errors, setErrors] = useState<ErrorType[]>([]);
  const [geographic, setGeographic] = useState<GeographicData[]>([]);
  const [costData, setCostData] = useState<CostData[]>([]);
  const [tokenTrend, setTokenTrend] = useState<TokenTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/user/analytics/advanced', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load analytics: ${res.status}`);
        }

        const data: AdvancedAnalyticsPayload = await res.json();

        if (!isMounted) return;

        setStats(data.stats);
        setApiMetrics(data.apiMetrics || []);
        setModelUsage(data.modelUsage || []);
        setSuccessFailure(data.successFailure || []);
        setPeakTraffic(data.peakTraffic || []);
        setErrors(data.errors || []);
        setGeographic(data.geographic || []);
        setCostData(data.costData || []);
        setTokenTrend(data.tokenTrend || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load advanced analytics', err);
        setError('Failed to load analytics data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchAnalytics, 30 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030304]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030304]">
        <div className="rounded-2xl p-8 bg-white/[0.02] border border-red-500/[0.1] shadow-lg text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030304]">
        <div className="rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] shadow-lg text-center">
          <div className="w-16 h-16 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
      {/* Background gradient orbs - Legal page theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
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
            <BarChart3 className="w-14 h-14 text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Advanced Analytics</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed">
            Monitor your AI API usage, performance metrics, and cost analysis
          </p>
          <div className="w-40 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 mx-auto mb-10 rounded-full" />
          <Link
            href="/dashboard"
            className="hero-badge px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium backdrop-blur-sm hover:bg-emerald-500/20 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      {/* Analytics Content */}
      <section className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                icon: '📊',
                label: 'Total Requests (7d)',
                value: stats.totalRequests.toLocaleString(),
                change: `${stats.requestChange > 0 ? '+' : ''}${
                  stats.requestChange
                }%`,
                positive: stats.requestChange >= 0,
                gradient: 'from-cyan-500 to-blue-500',
                iconBg: 'bg-cyan-500/20',
                borderColor: 'border-cyan-500/30',
              },
              {
                icon: '⚡',
                label: 'Avg Latency',
                value: `${stats.avgLatency}ms`,
                change: `${stats.latencyChange > 0 ? '+' : ''}${
                  stats.latencyChange
                }%`,
                positive: stats.latencyChange <= 0,
                gradient: 'from-purple-500 to-pink-500',
                iconBg: 'bg-purple-500/20',
                borderColor: 'border-purple-500/30',
              },
              {
                icon: '✅',
                label: 'Success Rate',
                value: `${stats.avgSuccessRate}%`,
                change: `${stats.successChange > 0 ? '+' : ''}${
                  stats.successChange
                }%`,
                positive: stats.successChange >= 0,
                gradient: 'from-emerald-500 to-teal-500',
                iconBg: 'bg-emerald-500/20',
                borderColor: 'border-emerald-500/30',
              },
              {
                icon: '💰',
                label: 'Est. Weekly Cost',
                value: `$${stats.totalCost.toFixed(2)}`,
                change: 'Last 7 days',
                positive: true,
                gradient: 'from-amber-500 to-orange-500',
                iconBg: 'bg-amber-500/20',
                borderColor: 'border-amber-500/30',
              },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all group overflow-hidden"
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500`} />
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                  <p
                    className={`text-sm mt-2 font-medium ${
                      stat.positive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className={`w-14 h-14 ${stat.iconBg} border ${stat.borderColor} rounded-xl flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="space-y-8">
          {/* Row 1: API Requests & Latency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Requests */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🧭</span>
                </div>
                API Requests (Last 7 Days)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={apiMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: '#22d3ee', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Average Latency */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                Average Latency (ms)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={apiMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar dataKey="latency" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Model Usage & Success vs Failure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Usage Distribution */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🧠</span>
                </div>
                Model Usage Distribution
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={modelUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ model, percentage }) =>
                      `${model} (${percentage}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="usage"
                  >
                    {modelUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Success vs Failure Rate */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">📈</span>
                </div>
                Request Success vs Failure Rate
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={successFailure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="successful"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar dataKey="failed" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Token Usage & Peak Traffic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Usage Trend */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
                Token Usage Trend
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tokenTrend}>
                  <defs>
                    <linearGradient
                      id="colorTokens"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorTokens)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Peak Traffic Hours */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🕓</span>
                </div>
                Peak Traffic Hours
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={peakTraffic}>
                  <defs>
                    <linearGradient
                      id="colorTraffic"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="hour"
                    stroke="#9ca3af"
                    label={{
                      value: 'Hour of Day',
                      position: 'insideBottomRight',
                      offset: -5,
                      fill: '#9ca3af',
                    }}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    formatter={(value) => [`${value} requests`, 'Requests']}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorTraffic)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: Error Types, Geographic & Cost */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Error Type Breakdown */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🧩</span>
                </div>
                Error Type Breakdown
              </h2>
              <div className="space-y-4">
                {errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]"
                  >
                    <div>
                      <p className="font-semibold text-white">{error.type}</p>
                      <p className="text-sm text-gray-400">
                        {error.count} errors
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-red-400">{error.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🌍</span>
                </div>
                Geographic Distribution
              </h2>
              <div className="space-y-4">
                {geographic.map((region, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-white">{region.region}</p>
                      <span className="text-sm text-gray-400">
                        {region.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${region.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Estimation by Model */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">💰</span>
                </div>
                Cost by Model
              </h2>
              <div className="space-y-4">
                {costData.map((cost, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]"
                  >
                    <div>
                      <p className="font-semibold text-white">{cost.model}</p>
                      <p className="text-sm text-gray-400">
                        {cost.percentage}% of total
                      </p>
                    </div>
                    <div className="text-right font-bold text-emerald-400">
                      ${cost.cost.toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-white">Total:</span>
                    <span className="text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      ${costData.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Response Size & Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Average Response Size */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                <div className="w-10 h-10 bg-pink-500/20 border border-pink-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🧾</span>
                </div>
                Average Response Size
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={apiMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis
                    stroke="#9ca3af"
                    label={{ value: 'KB', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    formatter={(value) => [`${value} KB`, 'Size']}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseSize"
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats Table */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
              <h2 className="text-xl font-bold mb-6 text-white">Summary Statistics</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Total API Calls</span>
                  <span className="font-bold text-white">
                    {stats.totalRequests.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Average Latency</span>
                  <span className="font-bold text-white">{stats.avgLatency}ms</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="font-bold text-emerald-400">
                    {stats.avgSuccessRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Weekly Cost</span>
                  <span className="font-bold text-emerald-400">
                    ${stats.totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Agents Used</span>
                  <span className="font-bold text-white">{modelUsage.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <span className="text-gray-400">Error Count</span>
                  <span className="font-bold text-red-400">
                    {errors.reduce((sum, e) => sum + e.count, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-gray-400">
                Live data • Auto-refreshes every 30 seconds
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
