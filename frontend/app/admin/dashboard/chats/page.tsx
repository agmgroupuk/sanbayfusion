'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Bot,
  Hash,
  Timer,
  Coins,
} from 'lucide-react';

const API_BASE = '/api/admin/dashboard';

interface ChatData {
  summary: {
    totalChats: number;
    totalTokens: number;
    avgDuration: number;
    avgTurns: number;
  };
  chatsByAgent: Array<{ agentId: string; chats: number; tokens: number }>;
  recentChats: Array<{
    conversationId: string;
    userId: string | null;
    agentId: string | null;
    channel: string;
    totalTokens: number;
    durationMs: number;
    turnCount: number;
    startedAt: string;
    status: string;
  }>;
  period: string;
}

export default function ChatsPage() {
  const [data, setData] = useState<ChatData | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/chats?period=${period}`, { credentials: 'include' });
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
          <h1 className="text-2xl font-bold text-white">Chat Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Conversations, tokens & agent performance
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
          <span className="ml-3 text-sm text-gray-400">Loading chat analytics...</span>
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
                <MessageSquare className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-gray-500">Total Chats</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.totalChats.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-500">Total Tokens</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round(data.summary.avgDuration / 1000)}s
              </p>
            </div>
            <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-500">Avg Turns</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.summary.avgTurns}
              </p>
            </div>
          </div>

          {/* By Agent */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                Chats by Agent
              </h3>
            </div>
            {data.chatsByAgent.map((a) => (
              <div
                key={a.agentId}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02]"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10px] font-bold">
                  {(a.agentId || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white font-medium">
                    {a.agentId || 'Default Agent'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {a.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <span className="text-sm font-bold text-white">{a.chats}</span>
              </div>
            ))}
          </div>

          {/* Recent Chats */}
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">
                Recent Conversations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400">
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-left px-4 py-2 font-medium">Agent</th>
                    <th className="text-left px-4 py-2 font-medium">Channel</th>
                    <th className="text-left px-4 py-2 font-medium">Tokens</th>
                    <th className="text-left px-4 py-2 font-medium">Turns</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Duration
                    </th>
                    <th className="text-left px-4 py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentChats.map((c) => (
                    <tr
                      key={c.conversationId}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-2 text-gray-400 font-mono">
                        {c.userId?.slice(0, 8) || 'anon'}...
                      </td>
                      <td className="px-4 py-2 text-violet-400">
                        {c.agentId || 'default'}
                      </td>
                      <td className="px-4 py-2 text-gray-400 capitalize">
                        {c.channel}
                      </td>
                      <td className="px-4 py-2 text-yellow-400 tabular-nums">
                        {c.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-300">{c.turnCount}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {Math.round(c.durationMs / 1000)}s
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(c.startedAt).toLocaleString()}
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
