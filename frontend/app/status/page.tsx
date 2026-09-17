'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import PageLoader from '@/components/PageLoader';
import {
  Activity, CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp,
  Server, Zap, Database, Users, BarChart3, Sparkles,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ── Types ── */
interface StatusData {
  system?: { cpuPercent: number; memoryPercent: number; totalMem: number; freeMem: number; usedMem: number; load1: number; load5: number; load15: number; cores: number; uptimeFormatted?: string };
  platform: { status: string; uptime: number; lastUpdated: string; version: string; environment?: string };
  api: { status: string; responseTime: number; uptime: number; requestsToday: number; requestsPerMinute: number; errorRate?: number; errorsToday?: number; totalLastMinute?: number };
  database: { status: string; connectionPool: number; responseTime: number; uptime: number; type?: string };
  cache?: { status: string; type: string; responseTime: number; connected: boolean };
  aiServices: Array<{ name: string; status: string; responseTime: number; uptime: number; model?: string }>;
  agents: Array<{ name: string; status: string; responseTime: number; activeUsers: number }>;
  tools: Array<{ name: string; status: string; responseTime: number; activeChats?: number }>;
  historical: Array<{ date: string; uptime: number; requests: number; avgResponseTime: number }>;
  incidents: Array<{ id: number; date: string; title: string; severity: string; duration: string; resolved: boolean }>;
  analytics?: { sessionsToday: number; pageViewsToday: number; activeUsers: number };
  totalActiveUsers?: number;
}

/* ── Status Badge ── */
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { icon: any; color: string; bg: string; text: string }> = {
    operational: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: 'Operational' },
    degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', text: 'Degraded' },
    outage: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', text: 'Outage' },
    maintenance: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', text: 'Maintenance' },
  };
  const { icon: Icon, color, bg, text } = cfg[status] || cfg.operational;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{text}</span>
    </div>
  );
};

export default function StatusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [rpmHistory, setRpmHistory] = useState<number[]>([]);
  const [errRateHistory, setErrRateHistory] = useState<number[]>([]);

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

  /* ── Data fetching ── */
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) { setData(result.data); setLastUpdate(new Date()); setIsLoading(false); }
      else { setError(result.error || 'Unknown error'); setIsLoading(false); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch status'); setIsLoading(false); }
  }, []);

  useEffect(() => {
    let es: EventSource | null = null; let pollTimer: any = null;
    const startSSE = () => {
      try {
        es = new EventSource('/api/status/stream');
        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload?.success && payload?.data) {
              setData(payload.data);
              if (payload.data.system) {
                setCpuHistory(h => [...h, payload.data.system.cpuPercent].slice(-30));
                setMemHistory(h => [...h, payload.data.system.memoryPercent].slice(-30));
              }
              if (payload.data.api) {
                setRpmHistory(h => [...h, payload.data.api.requestsPerMinute].slice(-60));
                if (typeof payload.data.api.errorRate === 'number') setErrRateHistory(h => [...h, payload.data.api.errorRate as number].slice(-60));
              }
              setLastUpdate(new Date()); setIsLoading(false);
            }
          } catch { }
        };
        es.onerror = () => { es?.close(); pollTimer = setInterval(fetchStatus, 5000); };
      } catch { pollTimer = setInterval(fetchStatus, 5000); }
    };
    fetchStatus(); startSSE();
    const refreshInterval = setInterval(fetchStatus, 5000);
    return () => { es?.close(); if (pollTimer) clearInterval(pollTimer); clearInterval(refreshInterval); };
  }, [fetchStatus]);

  /* ── SVG helpers ── */
  const Gauge = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const clamped = Math.max(0, Math.min(100, value));
    const angle = (clamped / 100) * 180; const r = 60; const cx = 80; const cy = 80;
    const rad = (Math.PI * (180 - angle)) / 180;
    const dBg = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
    const dVal = `M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${cx + r * Math.cos(rad)} ${cy - r * Math.sin(rad)}`;
    return (
      <div className="flex flex-col items-center">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path d={dBg} stroke="rgba(255,255,255,0.06)" strokeWidth="14" fill="none" />
          <path d={dVal} stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
          <text x="80" y="70" textAnchor="middle" className="fill-white font-bold text-xl">{clamped}%</text>
        </svg>
        <div className="text-sm text-gray-500 mt-1">{label}</div>
      </div>
    );
  };

  const MiniLine = ({ series, stroke }: { series: number[]; stroke: string }) => {
    const w = 280; const h = 80; const max = Math.max(100, ...series, 1);
    const pts = series.map((v, i) => `${(i / Math.max(1, series.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return (
      <svg width={w} height={h} className="w-full h-20">
        <polyline fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" points={`0,${h} ${w},${h}`} />
        <polyline fill="none" stroke={stroke} strokeWidth="2" points={pts} />
      </svg>
    );
  };

  const Donut = ({ percent, color }: { percent: number; color: string }) => {
    const s = 120; const sw = 14; const r2 = (s - sw) / 2; const c = 2 * Math.PI * r2;
    const cl = Math.max(0, Math.min(100, percent)); const dash = (cl / 100) * c;
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={s / 2} cy={s / 2} r={r2} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <circle cx={s / 2} cy={s / 2} r={r2} stroke={color} strokeWidth={sw} fill="none" strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform={`rotate(-90 ${s / 2} ${s / 2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-white font-bold text-lg">{cl.toFixed(1)}%</text>
      </svg>
    );
  };

  /* ── Computed values (guarded for null data) ── */
  const operationalCount = data?.agents?.filter(a => a.status === 'operational').length ?? 0;
  const overallStatus = (data && operationalCount === data.agents.length) ? 'operational' : 'degraded';

  /* ── Scroll-driven animations ── */
  useEffect(() => {
    if (!data || !contentRef.current) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: '(prefers-reduced-motion: reduce)',
        full: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduced } = context.conditions as Record<string, boolean>;

        const ctx = gsap.context(() => {
          /* ── Each .sb block slides up into view ── */
          const blocks = gsap.utils.toArray<HTMLElement>('.sb');

          blocks.forEach((block, bIdx) => {
            if (reduced) {
              gsap.fromTo(block, { opacity: 0 }, {
                opacity: 1, duration: 0.3,
                scrollTrigger: { trigger: block, start: 'top 90%', toggleActions: 'play none none reverse' },
              });
              return;
            }

            // Block entrance — slide up + de-blur
            gsap.fromTo(block,
              { opacity: 0, y: 80, filter: 'blur(5px)' },
              {
                opacity: 1, y: 0, filter: 'blur(0px)',
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: block,
                  start: 'top 92%',
                  end: 'top 40%',
                  scrub: 0.5,
                },
              },
            );

            // Block exit — fade + push up
            gsap.fromTo(block,
              { opacity: 1, y: 0, filter: 'blur(0px)' },
              {
                opacity: 0, y: -40, filter: 'blur(3px)',
                ease: 'power2.in',
                scrollTrigger: {
                  trigger: block,
                  start: 'bottom 55%',
                  end: 'bottom -15%',
                  scrub: 0.5,
                },
              },
            );

            // Stagger children cards (.sc) inside each block
            const cards = block.querySelectorAll('.sc');
            if (cards.length > 1) {
              gsap.fromTo(cards,
                { opacity: 0, y: 50, scale: 0.94 },
                {
                  opacity: 1, y: 0, scale: 1,
                  stagger: 0.06,
                  ease: 'power2.out',
                  scrollTrigger: {
                    trigger: block,
                    start: 'top 82%',
                    end: 'top 30%',
                    scrub: 0.5,
                  },
                },
              );
            }

            // Subtle parallax on alternating blocks
            if (bIdx % 2 === 0) {
              gsap.to(block, {
                yPercent: -4,
                ease: 'none',
                scrollTrigger: {
                  trigger: block,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.3,
                },
              });
            }
          });
        }, contentRef);

        return () => ctx.revert();
      },
    );

    const t = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => { clearTimeout(t); mm.revert(); };
  }, [data]);

  /* ── Loading / Error states ── */
  if (isLoading) return <PageLoader message="Loading Status..." />;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#030304' }}>
      <div className="max-w-md w-full rounded-2xl p-8 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mx-auto mb-4"><XCircle className="w-8 h-8 text-red-400" /></div>
        <h2 className="text-2xl font-bold text-center text-white mb-2">Unable to Load Status</h2>
        <p className="text-center text-gray-500 mb-6">{error}</p>
        <button onClick={() => { setIsLoading(true); setError(null); fetchStatus(); }} className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all">Retry</button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#030304' }}>
      <div className="flex flex-col items-center gap-4"><AlertTriangle className="w-16 h-16 text-amber-400" /><p className="text-white text-lg font-medium">No data available</p></div>
    </div>
  );

  /* card class shorthand */
  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all';
  const innerCard = 'rounded-lg bg-white/[0.02] border border-white/[0.06] p-4';

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* ── Stars ── */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* ── Nebula orbs ── */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* ── Scan line ── */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.015) 2px, rgba(6,182,212,0.015) 4px)' }} />

      {/* ── Micro grid ── */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 pt-28 pb-12 lg:pt-36 lg:pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-cyan-500/20 mb-6">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-cyan-400">Live System Status</span>
          </div>
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-8">
            <Activity className="w-10 h-10 text-cyan-400" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>System Status</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">Real-time monitoring of all Maula AI services</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <StatusBadge status={overallStatus} />
            <span className="text-gray-500 text-sm">Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
            <Link href="/status/analytics" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all">
              <TrendingUp className="w-4 h-4" /> View Analytics
            </Link>
            <Link href="/status/api-status" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
              <Zap className="w-4 h-4" /> API Status
            </Link>
          </div>
        </div>
      </section>

      {/* ════════ CONTENT ════════ */}
      <div ref={contentRef} className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* System Gauges */}
        {data.system && (
          <div className="sb grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className={`sc ${card} p-6 flex items-center justify-between`}>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">CPU Usage</h3>
                <MiniLine series={cpuHistory} stroke="#f97316" />
                <div className="text-xs text-gray-500 mt-1">{data.system.cores} cores • Load: {data.system.load1}</div>
              </div>
              <Gauge label="CPU" value={data.system.cpuPercent} color="#f97316" />
            </div>
            <div className={`sc ${card} p-6 flex items-center justify-between`}>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Memory Usage</h3>
                <MiniLine series={memHistory} stroke="#22c55e" />
                <div className="text-xs text-gray-500 mt-1">{data.system.usedMem.toFixed(1)} GB / {data.system.totalMem.toFixed(1)} GB</div>
              </div>
              <Gauge label="RAM" value={data.system.memoryPercent} color="#22c55e" />
            </div>
            <div className={`sc ${card} p-6`}>
              <div className="flex items-center gap-3 mb-4"><Clock className="w-8 h-8 text-cyan-400" /><h3 className="text-lg font-semibold text-white">Server Uptime</h3></div>
              <div className="text-3xl font-bold text-cyan-400 mb-2">{data.system.uptimeFormatted || '—'}</div>
              <div className="text-sm text-gray-500">{data.platform.environment || 'production'} • v{data.platform.version}</div>
            </div>
          </div>
        )}

        {/* Realtime KPIs */}
        {data.api && (
          <div className="sb grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Requests / min', value: data.api.requestsPerMinute, color: 'text-cyan-400' },
              { label: 'Error rate', value: `${(data.api.errorRate ?? 0).toFixed(1)}%`, color: 'text-red-400' },
              { label: 'Requests today', value: (data.api.requestsToday ?? 0).toLocaleString(), color: 'text-white' },
              { label: 'Errors today', value: (data.api.errorsToday ?? 0).toLocaleString(), color: 'text-red-400' },
            ].map((kpi, i) => (
              <div key={i} className={`sc ${card} p-5`}>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <div className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live charts */}
        <div className="sb grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className={`sc ${card} p-6`}>
            <h3 className="text-xl font-bold mb-2 text-white">Requests / Minute</h3>
            <p className="text-gray-500 text-sm mb-4">Live last ~10 minutes</p>
            <MiniLine series={rpmHistory} stroke="#3b82f6" />
          </div>
          <div className={`sc ${card} p-6`}>
            <h3 className="text-xl font-bold mb-2 text-white">Error Rate</h3>
            <p className="text-gray-500 text-sm mb-4">Live last ~10 minutes</p>
            <MiniLine series={errRateHistory} stroke="#ef4444" />
          </div>
        </div>

        {/* Main Status Cards */}
        <div className="sb grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Server, label: 'Platform', color: 'text-cyan-400', val: `${data.platform.uptime.toFixed(2)}%`, sub: 'Uptime', status: data.platform.status },
            { icon: Zap, label: 'API', color: 'text-amber-400', val: `${data.api.responseTime || 0}ms`, sub: 'Avg Response Time', status: data.api.status },
            { icon: Database, label: data.database.type || 'Database', color: 'text-emerald-400', val: `${data.database.responseTime || 0}ms`, sub: 'Response Time', status: data.database.status },
            ...(data.cache ? [{ icon: Activity, label: `Cache (${data.cache.type})`, color: 'text-red-400', val: `${data.cache.responseTime || 0}ms`, sub: data.cache.connected ? 'Connected' : 'Disconnected', status: data.cache.status }] : []),
          ].map((c2, i) => {
            const Icon = c2.icon;
            return (
              <div key={i} className={`sc ${card} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`w-7 h-7 ${c2.color}`} />
                  {c2.status ? <StatusBadge status={c2.status} /> : <TrendingUp className="w-5 h-5 text-emerald-400" />}
                </div>
                <h3 className="text-base font-semibold mb-2 text-white">{c2.label}</h3>
                <div className={`text-2xl md:text-3xl font-bold ${c2.color} mb-1`}>{c2.val}</div>
                <p className="text-sm text-gray-500">{c2.sub}</p>
              </div>
            );
          })}
        </div>

        {/* 7-Day Charts */}
        <div className="sb grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className={`sc ${card} p-6`}>
            <h3 className="text-xl font-bold mb-6 text-white">7-Day Uptime</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {data.historical.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${day.uptime ?? 0}%` }} />
                  <span className="text-xs text-gray-500">{day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) : '-'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">Average: {data.historical.length > 0 ? (data.historical.reduce((s, d) => s + (d.uptime ?? 0), 0) / data.historical.length).toFixed(2) : '0.00'}%</div>
          </div>
          <div className={`sc ${card} p-6`}>
            <h3 className="text-xl font-bold mb-6 text-white">API Requests (7 Days)</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {data.historical.map((day, i) => {
                const maxR = Math.max(...data.historical.map(d => d.requests ?? 0), 1);
                const h = ((day.requests ?? 0) / maxR) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full group">
                    <div className="relative h-full w-full">
                      <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg hover:opacity-80" style={{ height: `${h * 2.5}px` }} />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white/[0.06] text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/[0.06]">{(day.requests ?? 0).toLocaleString()}</div>
                    </div>
                    <span className="text-xs text-gray-500">{day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) : '-'}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">Total Today: {(data.api.requestsToday ?? 0).toLocaleString()} requests</div>
          </div>
        </div>

        {/* Agents & Errors */}
        <div className="sb grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className={`sc ${card} p-6`}>
            <h3 className="text-xl font-bold mb-4 text-white">Top Agents by Response Time</h3>
            {(() => {
              const items = data.agents.map(a => ({ name: a.name ?? 'Unknown', responseTime: a.responseTime ?? 0 })).sort((a, b) => a.responseTime - b.responseTime).slice(0, 5);
              const max = Math.max(...items.map(i2 => i2.responseTime), 1);
              return (
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm"><span className="capitalize text-gray-300">{it.name}</span><span className="font-semibold text-cyan-400">{it.responseTime}ms</span></div>
                      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${(it.responseTime / max) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className={`sc ${card} p-6 flex items-center justify-between`}>
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">Requests vs Errors (Today)</h3>
              <p className="text-gray-500 text-sm">{(data.api.errorsToday ?? 0).toLocaleString()} errors of {(data.api.requestsToday ?? 0).toLocaleString()} requests</p>
              <div className="mt-4"><span className="inline-block w-3 h-3 rounded-full bg-cyan-500 mr-2" /><span className="text-sm text-gray-400 mr-4">Requests</span><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" /><span className="text-sm text-gray-400">Errors</span></div>
            </div>
            <Donut percent={Math.min(100, Math.max(0, ((data.api.errorsToday ?? 0) / Math.max(1, data.api.requestsToday)) * 100))} color="#ef4444" />
          </div>
        </div>

        {/* Real-time Analytics */}
        {data.analytics && (
          <div className={`sb ${card} p-6 mb-8`}>
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-cyan-400" /> Real-time Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Activity, label: 'Sessions Today', value: data.analytics.sessionsToday, sub: 'User sessions started today', color: 'blue' },
                { icon: TrendingUp, label: 'Page Views Today', value: data.analytics.pageViewsToday, sub: 'Pages viewed today', color: 'emerald' },
              ].map((a, i) => {
                const AIcon = a.icon;
                return (
                  <div key={i} className={`sc rounded-xl p-5 bg-${a.color}-500/[0.06] border border-${a.color}-500/15`}>
                    <div className="flex items-center gap-3 mb-3"><AIcon className={`w-6 h-6 text-${a.color}-400`} /><h4 className={`font-semibold text-${a.color}-300`}>{a.label}</h4></div>
                    <div className={`text-4xl font-bold text-${a.color}-400`}>{a.value}</div>
                    <p className={`text-sm text-${a.color}-400/60 mt-1`}>{a.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* Agents */}
        <div className={`sb ${card} p-6 mb-8`}>
          <h3 className="text-xl font-bold mb-6 text-white">AI Agents ({operationalCount}/{data.agents.length} Operational)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.agents.map((agent, i) => (
              <div key={i} className={`sc ${innerCard}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm capitalize text-white">{agent.name.replace(/-/g, ' ')}</h4>
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'operational' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>
                <div className="text-xs"><p className="text-gray-500">Response</p><p className="font-bold text-cyan-400">{agent.responseTime}ms</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className={`sb ${card} p-6 mb-8`}>
          <h3 className="text-xl font-bold mb-6 text-white">Tools & Services</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.tools.map((tool, i) => (
              <div key={i} className={`sc ${innerCard}`}>
                <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-white">{tool.name}</h4><StatusBadge status={tool.status} /></div>
                <div className="flex gap-4 text-sm">
                  <div><p className="text-gray-500">Response Time</p><p className="font-bold text-cyan-400">{tool.responseTime}ms</p></div>
                  {tool.activeChats && <div><p className="text-gray-500">Active Chats</p><p className="font-bold text-emerald-400">{tool.activeChats}</p></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents */}
        {data.incidents.length > 0 && (
          <div className={`sb ${card} p-6 mb-8`}>
            <h3 className="text-xl font-bold mb-6 text-white">Recent Incidents</h3>
            <div className="space-y-4">
              {data.incidents.map(inc => (
                <div key={inc.id} className={`sc ${innerCard}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div><h4 className="font-semibold mb-1 text-white">{inc.title}</h4><p className="text-sm text-gray-500">{new Date(inc.date).toLocaleDateString()} • Duration: {inc.duration}</p></div>
                    <StatusBadge status={inc.resolved ? 'operational' : inc.severity} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center"><p className="text-gray-500 text-sm">• Live updating • Last update: {lastUpdate.toLocaleString()}</p></div>
      </div>

      {/* ── Scrollbar ── */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
      `}</style>
    </div>
  );
}
