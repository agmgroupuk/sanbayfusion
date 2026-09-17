'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Globe,
  MessageSquare,
  Wrench,
  Server,
  DollarSign,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface ActivityItem {
  id: string;
  type:
    | 'pageview'
    | 'session'
    | 'event'
    | 'api'
    | 'chat'
    | 'tool'
    | 'transaction';
  summary: string;
  details: string;
  userId?: string;
  visitorId?: string;
  ip?: string;
  timestamp: string;
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 40;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/activity-log?page=${page}&limit=${limit}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    pageview: { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    session: { icon: User, color: 'text-green-400', bg: 'bg-green-500/10' },
    event: {
      icon: ScrollText,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    api: { icon: Server, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    chat: { icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    tool: { icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    transaction: {
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Unified timeline of all system activity
          </p>
        </div>
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

      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No activity recorded yet
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-white/[0.06]" />

            {items.map((item, i) => {
              const cfg = typeConfig[item.type] || typeConfig.event;
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id + i}
                  className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] relative"
                >
                  <div
                    className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 relative z-10`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-medium">
                        {item.summary}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide ${cfg.bg} ${cfg.color}`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {item.details}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                      <span>{timeSince(item.timestamp)}</span>
                      {item.userId && (
                        <span>User: {item.userId.slice(0, 8)}...</span>
                      )}
                      {item.visitorId && (
                        <span>Visitor: {item.visitorId.slice(0, 8)}...</span>
                      )}
                      {item.ip && <span>IP: {item.ip}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0 tabular-nums">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} ({total.toLocaleString()} activities)
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/[0.06] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/[0.06] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
