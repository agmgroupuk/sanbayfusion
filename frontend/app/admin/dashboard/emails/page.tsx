'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  BarChart3,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface EmailItem {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: 'sent' | 'opened' | 'failed';
  openedAt: string | null;
  openCount: number;
  createdAt: string;
}

interface TypeBreakdown {
  type: string;
  total: number;
  opened: number;
}

export default function EmailsPage() {
  const [items, setItems] = useState<EmailItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, opened: 0, failed: 0, openRate: 0 });
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([]);
  const [period, setPeriod] = useState('30d');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const limit = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        period,
      });
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`${API_BASE}/emails?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setPages(json.data.pages);
        setStats(json.data.stats);
        setTypeBreakdown(json.data.typeBreakdown || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, period, filterType, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const statusBadge = (s: string) => {
    if (s === 'opened') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400"><Eye className="w-3 h-3" /> Opened</span>;
    if (s === 'failed') return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400"><Send className="w-3 h-3" /> Sent</span>;
  };

  const uniqueTypes = [...new Set(typeBreakdown.map(t => t.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
            <Mail className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Email Tracking</h1>
            <p className="text-sm text-zinc-400">{total.toLocaleString()} emails in selected period</p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Sent', value: stats.total, icon: Mail, color: 'from-blue-500/20 to-blue-600/20', textColor: 'text-blue-400' },
          { label: 'Delivered', value: stats.sent, icon: CheckCircle, color: 'from-green-500/20 to-green-600/20', textColor: 'text-green-400' },
          { label: 'Opened', value: stats.opened, icon: Eye, color: 'from-cyan-500/20 to-cyan-600/20', textColor: 'text-cyan-400' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'from-red-500/20 to-red-600/20', textColor: 'text-red-400' },
          { label: 'Open Rate', value: `${stats.openRate}%`, icon: BarChart3, color: 'from-amber-500/20 to-amber-600/20', textColor: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-xl bg-gradient-to-br ${s.color} border border-white/5`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.textColor}`} />
              <span className="text-xs text-zinc-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.textColor}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
          </div>
        ))}
      </div>

      {/* Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Open Rate by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {typeBreakdown.map((t) => {
              const rate = t.total > 0 ? Math.round((t.opened / t.total) * 100) : 0;
              return (
                <div key={t.type} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-zinc-400 truncate">{formatType(t.type)}</p>
                  <p className="text-lg font-semibold text-white">{rate}%</p>
                  <p className="text-xs text-zinc-500">{t.opened}/{t.total}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={period} onChange={e => { setPeriod(e.target.value); setPage(1); }} className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-zinc-300 focus:outline-none focus:border-cyan-500/50">
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-zinc-300 focus:outline-none focus:border-cyan-500/50">
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-zinc-300 focus:outline-none focus:border-cyan-500/50">
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Email Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Opens</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Sent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Opened At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No emails found</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">{item.to}</td>
                  <td className="px-4 py-3 text-zinc-300 max-w-[250px] truncate">{item.subject}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-zinc-400">{formatType(item.type)}</span></td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.openCount}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{item.openedAt ? formatDate(item.openedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Page {page} of {pages} ({total} total)</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
