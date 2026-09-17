'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  AlertTriangle,
  Clock,
  Zap,
  XCircle,
  CheckCircle,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface ApiData {
  summary: {
    totalCalls: number;
    errorCount: number;
    errorRate: string;
    avgResponseTime: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    calls: number;
    avgResponseTime: number;
  }>;
  errorEndpoints: Array<{ endpoint: string; errors: number }>;
  statusCodes: Array<{ code: number; count: number }>;
  slowEndpoints: Array<{
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: string;
  }>;
  period: string;
}

export default function ApiMonitorPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api-usage?period=${period}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || `API error (${res.status})`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch API data');
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
          <h1 className="text-2xl font-bold text-white">API Monitoring</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Endpoint usage, response times & errors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['1h', '24h', '7d'].map((p) => (
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
          <span className="ml-3 text-sm text-gray-400">Loading API data...</span>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Total Calls</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.totalCalls.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-gray-500">Errors</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {data.summary.errorCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {data.summary.errorRate}% error rate
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-500">Avg Response</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.avgResponseTime}ms
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-500">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {(100 - parseFloat(data.summary.errorRate)).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top Endpoints */}
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-medium text-white">
                  Top Endpoints
                </h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {data.topEndpoints.map((ep, i) => (
                  <div
                    key={ep.endpoint}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <span className="text-xs text-gray-600 w-5 text-right">
                      {i + 1}
                    </span>
                    <span className="text-xs text-white font-mono truncate flex-1">
                      {ep.endpoint}
                    </span>
                    <span className="text-xs text-blue-400 tabular-nums">
                      {ep.calls.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${ep.avgResponseTime > 500 ? 'text-yellow-400' : 'text-gray-500'}`}
                    >
                      {ep.avgResponseTime}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Codes */}
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-medium text-white">Status Codes</h3>
              </div>
              <div className="p-4 space-y-2">
                {data.statusCodes.map((sc) => {
                  const total = data.summary.totalCalls || 1;
                  const pct = ((sc.count / total) * 100).toFixed(1);
                  const color =
                    sc.code < 300
                      ? 'bg-green-500'
                      : sc.code < 400
                        ? 'bg-blue-500'
                        : sc.code < 500
                          ? 'bg-yellow-500'
                          : 'bg-red-500';
                  const textColor =
                    sc.code < 300
                      ? 'text-green-400'
                      : sc.code < 400
                        ? 'text-blue-400'
                        : sc.code < 500
                          ? 'text-yellow-400'
                          : 'text-red-400';
                  return (
                    <div key={sc.code}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-mono font-medium ${textColor}`}>
                          {sc.code}
                        </span>
                        <span className="text-gray-500">
                          {sc.count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Error Endpoints */}
              {data.errorEndpoints.length > 0 && (
                <div className="border-t border-white/[0.06]">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <h3 className="text-sm font-medium text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Error Hotspots
                    </h3>
                  </div>
                  {data.errorEndpoints.map((ep) => (
                    <div
                      key={ep.endpoint}
                      className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] text-xs"
                    >
                      <span className="text-gray-300 font-mono truncate flex-1">
                        {ep.endpoint}
                      </span>
                      <span className="text-red-400 font-medium">
                        {ep.errors} errors
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Slow Endpoints */}
          {data.slowEndpoints.length > 0 && (
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-medium text-yellow-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Slow Endpoints (&gt;1s)
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                    <th className="text-left px-4 py-2 font-medium">Method</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Endpoint
                    </th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Response Time
                    </th>
                    <th className="text-left px-4 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slowEndpoints.map((ep, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${ep.method === 'GET' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-300 font-mono">
                        {ep.endpoint}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            ep.statusCode < 400
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {ep.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-yellow-400 font-mono">
                        {ep.responseTime}ms
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(ep.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
