'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, Activity, BarChart3 } from 'lucide-react';
import PageLoader from '@/components/PageLoader';

interface APIStatusData {
  endpoints: Array<{
    name: string; endpoint: string; method: string; status: 'operational' | 'degraded' | 'down';
    responseTime: number; uptime: number; lastChecked: string; errorRate: number;
  }>;
  categories: {
    agents: Array<{ name: string; apiEndpoint: string; status: 'operational' | 'degraded' | 'down'; responseTime: number; requestsPerMinute: number }>;
    tools: Array<{ name: string; apiEndpoint: string; status: 'operational' | 'degraded' | 'down'; responseTime: number; requestsPerMinute: number }>;
    aiServices: Array<{ name: string; provider: string; status: 'operational' | 'degraded' | 'down'; responseTime: number; quota: string }>;
  };
}

const StatusBadge = ({ status }: { status: 'operational' | 'degraded' | 'down' }) => {
  const cfg = {
    operational: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', text: 'Operational' },
    degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', text: 'Degraded' },
    down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', text: 'Down' },
  };
  const { icon: Icon, color, bg, text } = cfg[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{text}</span>
    </div>
  );
};

export default function APIStatusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<APIStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

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

  const fetchAPIStatus = async () => {
    try {
      const res = await fetch('/api/status/api-status');
      const result = await res.json();
      setData(result); setIsLoading(false); setLastUpdate(new Date());
    } catch { setIsLoading(false); }
  };

  useEffect(() => {
    fetchAPIStatus();
    const interval = setInterval(fetchAPIStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.1] transition-all';
  const innerCard = 'rounded-lg bg-white/[0.02] border border-white/[0.06] p-4';

  if (isLoading || !data) return <PageLoader message="Loading API Status..." />;

  const totalAPIs = data.endpoints.length + data.categories.agents.length + data.categories.tools.length;
  const operationalAPIs = [
    ...data.endpoints.filter(e => e.status === 'operational'),
    ...data.categories.agents.filter(a => a.status === 'operational'),
    ...data.categories.tools.filter(t => t.status === 'operational'),
  ].length;

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Nebula orbs */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[20%] left-[25%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[15%] right-[20%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[60%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
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
            <span className="text-sm font-medium text-cyan-400">Live API Monitoring</span>
          </div>
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-8">
            <Zap className="w-10 h-10 text-cyan-400" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>API Status</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-6">Real-time monitoring of all API endpoints and services</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link href="/status" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all">
              <Activity className="w-4 h-4" /> Status Dashboard
            </Link>
            <Link href="/status/analytics" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
          </div>
          {/* Overall Health */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl sm:rounded-full px-5 py-3">
            <span className="text-gray-400 font-medium">Overall API Health:</span>
            <StatusBadge status={operationalAPIs === totalAPIs ? 'operational' : 'degraded'} />
            <span className="text-gray-500">{operationalAPIs}/{totalAPIs} APIs Operational</span>
          </div>
        </div>
      </section>

      {/* ════════ CONTENT ════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">

        {/* Core API Endpoints */}
        <div className={`${card} p-6 mb-12`}>
          <h3 className="text-2xl font-bold mb-6 text-white">Core API Endpoints</h3>
          <div className="space-y-4">
            {data.endpoints.map((ep, i) => (
              <div key={i} className={innerCard}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${ep.method === 'GET' ? 'bg-blue-600' : ep.method === 'POST' ? 'bg-emerald-600' : ep.method === 'PUT' ? 'bg-amber-600' : 'bg-red-600'}`}>{ep.method}</span>
                    <div><h4 className="font-semibold text-white">{ep.name}</h4><p className="text-sm text-gray-500 font-mono">{ep.endpoint}</p></div>
                  </div>
                  <StatusBadge status={ep.status} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Response Time</p><p className="font-bold text-cyan-400">{ep.responseTime}ms</p></div>
                  <div><p className="text-gray-500">Uptime</p><p className="font-bold text-emerald-400">{ep.uptime}%</p></div>
                  <div><p className="text-gray-500">Error Rate</p><p className="font-bold text-amber-400">{ep.errorRate}%</p></div>
                  <div><p className="text-gray-500">Last Checked</p><p className="font-bold text-violet-400">{new Date(ep.lastChecked).toLocaleTimeString()}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent APIs */}
        <div className={`${card} p-6 mb-12`}>
          <h3 className="text-2xl font-bold mb-6 text-white">Agent APIs ({data.categories.agents.filter(a => a.status === 'operational').length}/{data.categories.agents.length} Operational)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.categories.agents.map((agent, i) => (
              <div key={i} className={innerCard}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-white">{agent.name}</h4>
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'operational' ? 'bg-emerald-400' : agent.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                </div>
                <p className="text-xs text-gray-500 font-mono mb-3">{agent.apiEndpoint}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-gray-500">Response</p><p className="font-bold text-cyan-400">{agent.responseTime}ms</p></div>
                  <div><p className="text-gray-500">Req/min</p><p className="font-bold text-violet-400">{agent.requestsPerMinute}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools & Services APIs */}
        <div className={`${card} p-6`}>
          <h3 className="text-2xl font-bold mb-6 text-white">Tools & Services APIs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.categories.tools.map((tool, i) => (
              <div key={i} className={innerCard}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">{tool.name}</h4>
                  <StatusBadge status={tool.status} />
                </div>
                <p className="text-xs text-gray-500 font-mono mb-3">{tool.apiEndpoint}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Response Time</p><p className="font-bold text-cyan-400">{tool.responseTime}ms</p></div>
                  <div><p className="text-gray-500">Requests/min</p><p className="font-bold text-violet-400">{tool.requestsPerMinute}</p></div>
                </div>
              </div>
            ))}
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
