'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, TrendingUp, ExternalLink } from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface PageViewData {
  topPages: Array<{ url: string; views: number }>;
  timeline: Array<{ date: string; count: number }>;
  total: number;
  period: string;
}

export default function PageViewsPage() {
  const [data, setData] = useState<PageViewData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/pageviews?period=${period}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || `API error (${res.status})`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pageviews');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxViews = data ? Math.max(...data.timeline.map((t) => t.count), 1) : 1;

  const renderError = () => error && !data && (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={fetchData} className="mt-3 px-4 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">Retry</button>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Page Views</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Content analytics & top pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:text-white'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 border border-white/[0.06]"
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
          <span className="ml-3 text-sm text-gray-400">Loading pageviews...</span>
        </div>
      )}

      {renderError()}

      {data && (
        <>
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-white">
                Total Page Views
              </h3>
              <span className="text-xs text-gray-500">{period}</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {data.total.toLocaleString()}
            </p>
          </div>

          {/* Chart */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Views Over Time
            </h3>
            <div className="flex items-end gap-1 h-40">
              {data.timeline.map((t) => (
                <div
                  key={t.date}
                  className="flex-1 flex flex-col items-center gap-1 group"
                  title={`${t.date}: ${t.count}`}
                >
                  <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.count}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-violet-500 to-cyan-500 rounded-t-sm transition-all"
                    style={{
                      height: `${(t.count / maxViews) * 100}%`,
                      minHeight: t.count > 0 ? 4 : 0,
                    }}
                  />
                  <span className="text-[8px] text-gray-600 truncate w-full text-center">
                    {t.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Top Pages</h3>
            </div>
            {data.topPages.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No page views in this period
              </div>
            ) : (
              data.topPages.map((page, i) => {
                const pct = (
                  (page.views / (data.topPages[0]?.views || 1)) *
                  100
                ).toFixed(0);
                return (
                  <div
                    key={page.url}
                    className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <span className="text-xs text-gray-600 w-6 text-right font-mono">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-mono truncate">
                        {page.url}
                      </p>
                      <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
