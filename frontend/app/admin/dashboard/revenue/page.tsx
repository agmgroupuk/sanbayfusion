'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Package,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface RevenueData {
  summary: {
    totalRevenue: number;
    transactionCount: number;
    avgAmount: number;
  };
  byType: Array<{ type: string; total: number; count: number }>;
  recentTransactions: Array<{
    id: string;
    userId: string | null;
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    createdAt: string;
  }>;
  period: string;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/revenue?period=${period}`, { credentials: 'include' });
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

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed':
        return 'bg-green-500/10 text-green-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      case 'refunded':
        return 'bg-orange-500/10 text-orange-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Transactions & earnings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d'].map((p) => (
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
          <span className="ml-3 text-sm text-gray-400">Loading revenue data...</span>
        </div>
      )}

      {error && !data && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-500">Total Revenue</span>
              </div>
              <p className="text-3xl font-bold text-green-400">
                $
                {(data.summary.totalRevenue / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Transactions</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.summary.transactionCount}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-500">Avg Amount</span>
              </div>
              <p className="text-3xl font-bold text-white">
                ${(data.summary.avgAmount / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-violet-400" /> Revenue by Type
              </h3>
            </div>
            {data.byType.map((t) => (
              <div
                key={t.type}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03]"
              >
                <span className="text-xs text-white font-medium capitalize flex-1">
                  {t.type}
                </span>
                <span className="text-xs text-gray-500">{t.count} txns</span>
                <span className="text-sm font-bold text-green-400">
                  $
                  {(t.total / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Transactions */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">
                Recent Transactions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                    <th className="text-left px-4 py-2 font-medium">ID</th>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Amount</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Description
                    </th>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2 text-gray-500 font-mono">
                        {tx.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-gray-400 font-mono">
                        {tx.userId?.slice(0, 8) || '—'}...
                      </td>
                      <td className="px-4 py-2 text-gray-300 capitalize">
                        {tx.type}
                      </td>
                      <td className="px-4 py-2 text-green-400 font-medium">
                        ${(tx.amount / 100).toFixed(2)} {tx.currency}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(tx.status)}`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
