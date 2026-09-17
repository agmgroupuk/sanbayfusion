'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  RefreshCw,
  Database,
  Cpu,
  HardDrive,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface HealthData {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  dbLatency: number;
  nodeVersion: string;
  platform: string;
  pid: number;
  timestamp: string;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || `API error (${res.status})`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const dbLatencyStatus = (ms: number) => {
    if (ms < 50)
      return { icon: CheckCircle, color: 'text-green-400', label: 'Excellent' };
    if (ms < 200)
      return { icon: CheckCircle, color: 'text-yellow-400', label: 'Good' };
    return { icon: AlertTriangle, color: 'text-red-400', label: 'Slow' };
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Server monitoring & diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRefresh ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'}`}
          >
            {autoRefresh ? '● Live' : '○ Paused'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/[0.06]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-400">Loading health data...</span>
        </div>
      )}

      {error && !data && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* Status Banner */}
          <div
            className={`rounded-xl p-5 border ${data.status === 'healthy' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
          >
            <div className="flex items-center gap-3">
              {data.status === 'healthy' ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p
                  className={`text-lg font-bold ${data.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}
                >
                  System is {data.status === 'healthy' ? 'Healthy' : 'Degraded'}
                </p>
                <p className="text-xs text-gray-500">
                  Last checked: {new Date(data.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Uptime</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatUptime(data.uptime)}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const s = dbLatencyStatus(data.dbLatency);
                  return <s.icon className={`w-4 h-4 ${s.color}`} />;
                })()}
                <span className="text-xs text-gray-500">DB Latency</span>
              </div>
              <p
                className={`text-xl font-bold ${data.dbLatency < 50 ? 'text-green-400' : data.dbLatency < 200 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {data.dbLatency}ms
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {dbLatencyStatus(data.dbLatency).label}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-500">Node.js</span>
              </div>
              <p className="text-xl font-bold text-white">{data.nodeVersion}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {data.platform} | PID {data.pid}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-gray-500">Process</span>
              </div>
              <p className="text-xl font-bold text-white">PID {data.pid}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {data.platform}
              </p>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" /> Memory Usage
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-white/[0.06]">
              {[
                {
                  label: 'RSS (Total)',
                  value: data.memory.rss,
                  color: 'from-blue-500 to-blue-600',
                },
                {
                  label: 'Heap Used',
                  value: data.memory.heapUsed,
                  color: 'from-violet-500 to-purple-600',
                },
                {
                  label: 'Heap Total',
                  value: data.memory.heapTotal,
                  color: 'from-cyan-500 to-blue-500',
                },
                {
                  label: 'External',
                  value: data.memory.external,
                  color: 'from-pink-500 to-rose-600',
                },
              ].map((m) => {
                const pct = data.memory.rss
                  ? ((m.value / data.memory.rss) * 100).toFixed(0)
                  : 0;
                return (
                  <div key={m.label} className="p-4">
                    <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                    <p className="text-lg font-bold text-white">
                      {formatBytes(m.value)}
                    </p>
                    <div className="h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${m.color} rounded-full`}
                        style={{ width: `${Math.min(Number(pct), 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {pct}% of RSS
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
