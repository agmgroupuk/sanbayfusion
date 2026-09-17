'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, RefreshCw, Clock, Zap } from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface ToolData {
  summary: {
    totalUsage: number;
    avgLatency: number;
    totalTokensInput: number;
    totalTokensOutput: number;
  };
  tools: Array<{
    name: string;
    count: number;
    avgLatency: number;
    avgTokensIn: number;
    avgTokensOut: number;
  }>;
  period: string;
}

export default function ToolsPage() {
  const [data, setData] = useState<ToolData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/tools?period=${period}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || `API error (${res.status})`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tool Usage</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI tool analytics & performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['24h', '7d', '30d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-gray-400 bg-white/[0.03] border border-white/[0.06]'}`}
            >
              {p}
            </button>
          ))}
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
          <span className="ml-3 text-sm text-gray-400">Loading tool analytics...</span>
        </div>
      )}

      {error && !data && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition">Retry</button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-500">Total Uses</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.totalUsage.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Avg Latency</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.avgLatency}ms
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-2">Tokens In</p>
              <p className="text-2xl font-bold text-cyan-400">
                {data.summary.totalTokensInput.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-2">Tokens Out</p>
              <p className="text-2xl font-bold text-pink-400">
                {data.summary.totalTokensOutput.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400" /> Tools Breakdown
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                  <th className="text-left px-4 py-2 font-medium">Tool</th>
                  <th className="text-left px-4 py-2 font-medium">Uses</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Avg Latency
                  </th>
                  <th className="text-left px-4 py-2 font-medium">
                    Avg Tokens In
                  </th>
                  <th className="text-left px-4 py-2 font-medium">
                    Avg Tokens Out
                  </th>
                  <th className="text-left px-4 py-2 font-medium">Usage Bar</th>
                </tr>
              </thead>
              <tbody>
                {data.tools.map((t) => (
                  <tr
                    key={t.name}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-blue-400 tabular-nums">
                      {t.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">
                      {t.avgLatency}ms
                    </td>
                    <td className="px-4 py-3 text-cyan-400 tabular-nums">
                      {t.avgTokensIn}
                    </td>
                    <td className="px-4 py-3 text-pink-400 tabular-nums">
                      {t.avgTokensOut}
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-white/5 rounded-full w-20 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                          style={{
                            width: `${Math.min((t.count / (data.tools[0]?.count || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
