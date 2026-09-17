/**
 * MonitoringDashboard — Real-time logs, metrics, errors, health status
 * Tabbed interface showing all monitoring data for a deployed project
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bug,
  CheckCircle2,
  Clock,
  Cpu,
  Heart,
  Loader2,
  MemoryStick,
  RefreshCw,
  Search,
  Server,
  XCircle,
  Bell,
  TrendingUp,
  FileText,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  severity: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  severity: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  sandboxes: { id: string; healthy: boolean }[];
  deployments: { id: string; url?: string; healthy: boolean }[];
  recentEvents: LogEntry[];
}

type MonitoringTab = 'logs' | 'metrics' | 'errors' | 'health';

interface MonitoringDashboardProps {
  projectId: string;
  className?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: 'bg-primary-600/20', text: 'text-primary-300', icon: <XCircle size={12} /> },
  error:    { bg: 'bg-primary-500/15', text: 'text-primary-400', icon: <Bug size={12} /> },
  warning:  { bg: 'bg-yellow-500/15', text: 'text-yellow-400', icon: <AlertTriangle size={12} /> },
  info:     { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <Activity size={12} /> },
  debug:    { bg: 'bg-zinc-500/10', text: 'text-zinc-500', icon: <FileText size={12} /> },
};

// ── Component ──────────────────────────────────────────────────────

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ projectId, className = '' }) => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<ErrorGroup[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    if (!projectId || projectId === 'default') return;
    setIsLoading(true);
    try {
      if (activeTab === 'logs') {
        const params = new URLSearchParams({ limit: '100' });
        if (logLevel !== 'all') params.set('level', logLevel);
        if (searchQuery) params.set('search', searchQuery);
        const res = await fetch(`/api/monitoring/logs/${projectId}?${params}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setLogs(data.logs || []);
      } else if (activeTab === 'errors') {
        const res = await fetch(`/api/monitoring/errors/${projectId}?resolved=false`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setErrors(data.groups || []);
      } else if (activeTab === 'health') {
        const res = await fetch(`/api/monitoring/health/${projectId}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setHealth(data);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, [activeTab, projectId, logLevel, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Resolve error
  const resolveError = async (fingerprint: string) => {
    try {
      await fetch(`/api/monitoring/errors/${projectId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fingerprint }),
      });
      setErrors(prev => prev.filter(e => e.fingerprint !== fingerprint));
    } catch {}
  };

  const tabs: { id: MonitoringTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'logs', label: 'Logs', icon: <FileText size={14} /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart3 size={14} /> },
    { id: 'errors', label: 'Errors', icon: <Bug size={14} />, badge: errors.filter(e => !e.resolved).length || undefined },
    { id: 'health', label: 'Health', icon: <Heart size={14} /> },
  ];

  return (
    <div className={`flex flex-col h-full bg-zinc-900/90 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-canvas-border">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-white">Monitoring</span>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-canvas-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-violet-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="px-1 py-0.5 bg-primary-500 rounded-full text-[9px] text-white min-w-[16px] text-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Logs Tab ── */}
        {activeTab === 'logs' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-canvas-border">
              <div className="flex items-center gap-1 flex-1 bg-white/5 rounded-md px-2">
                <Search size={12} className="text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="bg-transparent text-xs text-white w-full py-1.5 outline-none placeholder:text-zinc-600"
                />
              </div>
              <select
                value={logLevel}
                onChange={e => setLogLevel(e.target.value)}
                className="bg-white/5 text-xs text-zinc-300 rounded-md px-2 py-1.5 outline-none border border-canvas-border"
              >
                <option value="all">All</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            {/* Log entries */}
            <div className="divide-y divide-white/[0.03]">
              {logs.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500">
                  No logs found
                </div>
              ) : (
                logs.map(log => {
                  const style = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.info;
                  return (
                    <div key={log.id} className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02]">
                      <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 break-words">{log.message}</p>
                        <span className="text-[10px] text-zinc-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${style.bg} ${style.text}`}>
                        {log.severity}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Metrics Tab ── */}
        {activeTab === 'metrics' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'CPU Usage', value: '—', icon: <Cpu size={16} />, color: 'text-blue-400' },
                { label: 'Memory', value: '—', icon: <MemoryStick size={16} />, color: 'text-purple-400' },
                { label: 'Requests', value: '—', icon: <TrendingUp size={16} />, color: 'text-emerald-400' },
                { label: 'Uptime', value: '—', icon: <Clock size={16} />, color: 'text-cyan-400' },
              ].map(metric => (
                <div key={metric.label} className="bg-white/[0.03] rounded-xl p-3 border border-canvas-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={metric.color}>{metric.icon}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{metric.label}</span>
                  </div>
                  <span className="text-lg font-bold text-white">{metric.value}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-4">
              Metrics update every 30 seconds when a sandbox is running
            </p>
          </div>
        )}

        {/* ── Errors Tab ── */}
        {activeTab === 'errors' && (
          <div>
            {errors.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No unresolved errors 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {errors.map(err => (
                  <div key={err.fingerprint} className="px-3 py-3 hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-primary-300 font-medium truncate">{err.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500">{err.count} occurrences</span>
                          <span className="text-[10px] text-zinc-600">
                            Last: {new Date(err.lastSeen).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => resolveError(err.fingerprint)}
                        className="shrink-0 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 rounded text-[10px] text-emerald-300 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Health Tab ── */}
        {activeTab === 'health' && (
          <div className="p-4 space-y-4">
            {/* Overall status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              health?.status === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-primary-500/10 border-primary-500/20'
            }`}>
              {health?.status === 'healthy' ? (
                <CheckCircle2 size={24} className="text-emerald-400" />
              ) : (
                <XCircle size={24} className="text-primary-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-white capitalize">
                  {health?.status || 'Unknown'}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {health?.sandboxes?.length || 0} sandbox(es) · {health?.deployments?.length || 0} deployment(s)
                </p>
              </div>
            </div>

            {/* Sandboxes */}
            {health?.sandboxes && health.sandboxes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Sandboxes</p>
                <div className="space-y-1">
                  {health.sandboxes.map(sb => (
                    <div key={sb.id} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg">
                      <Server size={12} className={sb.healthy ? 'text-emerald-400' : 'text-primary-400'} />
                      <span className="text-xs text-zinc-300">{sb.id.slice(0, 12)}</span>
                      <span className={`ml-auto text-[10px] ${sb.healthy ? 'text-emerald-400' : 'text-primary-400'}`}>
                        {sb.healthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployments */}
            {health?.deployments && health.deployments.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Deployments</p>
                <div className="space-y-1">
                  {health.deployments.map(dep => (
                    <div key={dep.id} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg">
                      <Heart size={12} className={dep.healthy ? 'text-emerald-400' : 'text-primary-400'} />
                      <span className="text-xs text-zinc-300 truncate">{dep.url || dep.id.slice(0, 12)}</span>
                      <span className={`ml-auto text-[10px] ${dep.healthy ? 'text-emerald-400' : 'text-primary-400'}`}>
                        {dep.healthy ? 'Live' : 'Down'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
