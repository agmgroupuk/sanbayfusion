'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface EventItem {
  id: string;
  userId: string | null;
  event: string;
  category: string;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (type) params.set('type', type);
      if (category) params.set('category', category);
      const res = await fetch(`${API_BASE}/events?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setEvents(json.data.events);
        setTotal(json.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, type, category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const categoryColors: Record<string, string> = {
    auth: 'bg-green-500/10 text-green-400',
    navigation: 'bg-blue-500/10 text-blue-400',
    engagement: 'bg-purple-500/10 text-purple-400',
    commerce: 'bg-yellow-500/10 text-yellow-400',
    system: 'bg-gray-500/10 text-gray-400',
    error: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Event Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} events tracked
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Event type..."
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 outline-none focus:border-violet-500/30 w-44"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] border border-white/[0.06] text-gray-400 outline-none"
        >
          <option value="">All categories</option>
          {[
            'auth',
            'navigation',
            'engagement',
            'commerce',
            'system',
            'error',
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Event List */}
      <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No events found
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]"
              >
                <div className="w-1 h-1 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white font-medium">
                      {ev.event}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${categoryColors[ev.category] || 'bg-gray-500/10 text-gray-400'}`}
                    >
                      {ev.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                    <span>{new Date(ev.timestamp).toLocaleString()}</span>
                    {ev.userId && <span>User: {ev.userId.slice(0, 8)}...</span>}
                    {ev.ipAddress && <span>IP: {ev.ipAddress}</span>}
                  </div>
                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <div className="mt-1.5 text-[10px] text-gray-600 font-mono bg-white/[0.02] rounded px-2 py-1 max-w-md truncate">
                      {JSON.stringify(ev.metadata).slice(0, 120)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
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
