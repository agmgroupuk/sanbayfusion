'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Zap, Activity, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import PageLoader from '@/components/PageLoader';

interface AnalyticsData {
    overview: { totalRequests: number; activeUsers: number; avgResponseTime: number; successRate: number; requestsGrowth: number; usersGrowth: number };
    agents: Array<{ name: string; requests: number; users: number; avgResponseTime: number; successRate: number; trend: 'up' | 'down' | 'stable' }>;
    tools: Array<{ name: string; usage: number; users: number; avgDuration: number; trend: 'up' | 'down' | 'stable' }>;
    hourlyData: Array<{ hour: string; requests: number; users: number }>;
    topAgents: Array<{ name: string; requests: number; percentage: number }>;
}

export default function AnalyticsPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

    /* ── Twinkling stars ── */
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        let raf: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
        resize(); window.addEventListener('resize', resize);
        const colors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
        const stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
                ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
                ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
            });
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const response = await fetch(`/api/status/analytics?timeRange=${timeRange}`);
            const result = await response.json();
            setData(result); setIsLoading(false); setLastUpdate(new Date());
        } catch { setIsLoading(false); }
    }, [timeRange]);

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, [timeRange, fetchAnalytics]);

    const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all';
    const innerCard = 'rounded-lg bg-white/[0.02] border border-white/[0.06] p-4';

    if (isLoading || !data) return <PageLoader message="Loading Analytics..." />;

    return (
        <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

            {/* Nebula orbs */}
            <div className="fixed inset-0 pointer-events-none z-[1]">
                <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
            </div>

            {/* Scan line */}
            <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.015) 2px, rgba(6,182,212,0.015) 4px)' }} />

            {/* Micro grid */}
            <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* ════════ HERO ════════ */}
            <section className="relative z-10 pt-28 pb-12 lg:pt-36 lg:pb-16 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-cyan-500/20 mb-6">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-cyan-400">Live Analytics</span>
                    </div>
                    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-8">
                        <BarChart3 className="w-10 h-10 text-cyan-400" />
                        <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                        <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Real-Time Analytics</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">Comprehensive insights into platform performance and usage</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                        <Link href="/status" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all">
                            <Activity className="w-4 h-4" /> Status Dashboard
                        </Link>
                        <Link href="/status/api-status" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                            <Zap className="w-4 h-4" /> API Status
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {(['24h', '7d', '30d'] as const).map(range => (
                            <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 rounded-lg font-semibold transition-all ${timeRange === range ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'}`}>
                                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════ CONTENT ════════ */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">

                {/* Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    {[
                        { icon: Zap, label: 'Total Requests', value: data.overview.totalRequests.toLocaleString(), growth: data.overview.requestsGrowth, color: 'text-cyan-400' },
                        { icon: Clock, label: 'Avg Response Time', value: `${data.overview.avgResponseTime}ms`, growth: null, color: 'text-amber-400' },
                        { icon: Activity, label: 'Success Rate', value: `${data.overview.successRate.toFixed(2)}%`, growth: null, color: 'text-emerald-400' },
                    ].map((kpi, i) => {
                        const KIcon = kpi.icon;
                        return (
                            <div key={i} className={`${card} p-6`}>
                                <div className="flex items-center justify-between mb-4">
                                    <KIcon className={`w-8 h-8 ${kpi.color}`} />
                                    {kpi.growth !== null ? (
                                        <div className={`flex items-center gap-1 text-sm ${kpi.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {kpi.growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                            {Math.abs(kpi.growth).toFixed(1)}%
                                        </div>
                                    ) : <TrendingUp className="w-5 h-5 text-emerald-400" />}
                                </div>
                                <div className={`text-3xl font-bold ${kpi.color} mb-2`}>{kpi.value}</div>
                                <p className="text-sm text-gray-500">{kpi.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Hourly Traffic Chart */}
                <div className={`${card} p-6 mb-12`}>
                    <h3 className="text-2xl font-bold mb-6 text-white">24-Hour Traffic Pattern</h3>
                    <div className="h-80 flex items-end justify-between gap-1">
                        {data.hourlyData.map((hour, i) => {
                            const maxR = Math.max(...data.hourlyData.map(h => h.requests));
                            const h2 = maxR > 0 ? (hour.requests / maxR) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full">
                                        <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg hover:opacity-80 cursor-pointer" style={{ height: `${h2 * 3}px` }} />
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/[0.06] text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 border border-white/[0.06]">
                                            <div className="font-bold mb-1">{hour.hour}</div>
                                            <div>{hour.requests.toLocaleString()} requests</div>
                                            <div className="text-cyan-400">{hour.users} users</div>
                                        </div>
                                    </div>
                                    {i % 3 === 0 && <span className="text-xs text-gray-500">{hour.hour}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Agents + Tools */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                    <div className={`${card} p-6`}>
                        <h3 className="text-2xl font-bold mb-6 text-white">Top Performing Agents</h3>
                        <div className="space-y-4">
                            {data.topAgents.map((agent, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm"><span className="font-semibold text-white">{agent.name}</span><span className="text-gray-500">{agent.requests.toLocaleString()} requests</span></div>
                                    <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${agent.percentage * 5}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`${card} p-6`}>
                        <h3 className="text-2xl font-bold mb-6 text-white">Tools Usage</h3>
                        <div className="space-y-4">
                            {data.tools.map((tool, i) => (
                                <div key={i} className={`flex items-center justify-between ${innerCard}`}>
                                    <div><h4 className="font-semibold mb-1 text-white">{tool.name}</h4><p className="text-sm text-gray-500">{tool.avgDuration}ms avg</p></div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-cyan-400">{tool.usage.toLocaleString()}</div>
                                        <div className={`flex items-center gap-1 text-sm ${tool.trend === 'up' ? 'text-emerald-400' : tool.trend === 'down' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {tool.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : tool.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : '−'}
                                            {tool.trend === 'up' ? 'Rising' : tool.trend === 'down' ? 'Falling' : 'Stable'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Agents Performance Table */}
                <div className={`${card} p-6`}>
                    <h3 className="text-2xl font-bold mb-6 text-white">All Agents Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Agent</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-semibold">Requests</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-semibold">Avg Response</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-semibold">Success Rate</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-semibold">Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.agents.map((agent, i) => (
                                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 px-4 font-semibold capitalize text-white">{agent.name.replace(/-/g, ' ')}</td>
                                        <td className="py-3 px-4 text-right text-cyan-400">{agent.requests.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right text-amber-400">{agent.avgResponseTime}ms</td>
                                        <td className="py-3 px-4 text-right text-emerald-400">{agent.successRate.toFixed(1)}%</td>
                                        <td className="py-3 px-4 text-center">
                                            {agent.trend === 'up' ? <ArrowUp className="w-5 h-5 text-emerald-400 inline" /> : agent.trend === 'down' ? <ArrowDown className="w-5 h-5 text-red-400 inline" /> : <span className="text-amber-400">−</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-center"><p className="text-gray-500 text-sm">Auto-refreshing every 30 seconds • Last update: {lastUpdate.toLocaleString()}</p></div>
            </div>

            <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
      `}</style>
        </div>
    );
}
