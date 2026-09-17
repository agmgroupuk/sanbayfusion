'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic';

interface AgentPerf {
  agentId: string;
  name: string;
  conversations: number;
  messages: number;
  avgResponseTime: number;
  successRate: number;
}

export default function PerformanceMetricsPage() {
  const { state } = useAuth();
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/user/analytics', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setAgents(data.agentPerformance || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (state.isAuthenticated) {
      fetchMetrics();
    }
  }, [state.isAuthenticated, fetchMetrics]);

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Please log in to view metrics</span>
          </h1>
          <Link href="/auth/login" className="btn-primary inline-block">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Compute summary metrics from real agent data
  const totalConversations = agents.reduce((s, a) => s + a.conversations, 0);
  const totalMessages = agents.reduce((s, a) => s + a.messages, 0);
  const avgResponseTime = agents.length > 0
    ? (agents.reduce((s, a) => s + a.avgResponseTime, 0) / agents.length).toFixed(1)
    : '0';
  const avgSuccessRate = agents.length > 0
    ? (agents.reduce((s, a) => s + a.successRate, 0) / agents.length).toFixed(1)
    : '0';
  const errorRate = agents.length > 0
    ? (100 - parseFloat(avgSuccessRate)).toFixed(2)
    : '0';

  const summaryMetrics = [
    { label: 'Total Conversations', value: totalConversations.toLocaleString(), status: totalConversations > 0 ? 'Active' : 'No Data' },
    { label: 'Avg Response Time', value: `${avgResponseTime}s`, status: parseFloat(avgResponseTime) < 3 ? 'Fast' : 'Normal' },
    { label: 'Avg Success Rate', value: `${avgSuccessRate}%`, status: parseFloat(avgSuccessRate) >= 80 ? 'Great' : parseFloat(avgSuccessRate) > 0 ? 'Improving' : 'No Data' },
    { label: 'Error Rate', value: `${errorRate}%`, status: parseFloat(errorRate) < 5 ? 'Low' : 'Needs Attention' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Animated Background - Agents Page Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/15 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(15)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 bg-cyan-400/40 rounded-full" style={{ left: `${5 + i * 6}%`, top: `${10 + (i % 5) * 18}%` }} />
        ))}
      </div>

      {/* Header */}
      <section className="py-12 px-4 border-b border-white/10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Agent Performance Metrics
          </h1>
          <p className="text-gray-400">
            Monitor your AI agents performance and health
          </p>
        </div>
      </section>

      {/* Performance Overview */}
      <section className="py-16 px-4">
        <div className="container-custom">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
              <p className="text-gray-400 ml-4">Loading metrics...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={fetchMetrics} className="btn-secondary">Retry</button>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {summaryMetrics.map((metric, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-white/5 rounded-lg border border-white/10"
                  >
                    <p className="text-gray-400 text-sm mb-2">{metric.label}</p>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {metric.value}
                    </h3>
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded ${metric.status === 'No Data' ? 'bg-gray-500/20 text-gray-400' :
                        metric.status === 'Needs Attention' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-green-500/20 text-green-400'
                      }`}>
                      {metric.status}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Agent Performance Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0a0a0f] border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Agent
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Conversations
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Messages
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Avg Response
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            No agent performance data yet. Start chatting with agents to see metrics here.
                          </td>
                        </tr>
                      ) : (
                        agents.map((agent, i) => (
                          <tr
                            key={agent.agentId || i}
                            className="border-b border-white/10 hover:bg-[#0a0a0f] transition-colors"
                          >
                            <td className="px-6 py-4 font-medium text-white">
                              {agent.name}
                            </td>
                            <td className="px-6 py-4 text-gray-400">
                              {agent.conversations}
                            </td>
                            <td className="px-6 py-4 text-gray-400">
                              {agent.messages}
                            </td>
                            <td className="px-6 py-4 text-gray-400">
                              {agent.avgResponseTime > 0 ? `${agent.avgResponseTime}s` : '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-400">
                              <span className={`inline-block px-2 py-1 text-xs rounded ${agent.successRate >= 80 ? 'bg-green-500/20 text-green-400' :
                                  agent.successRate > 0 ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                {agent.successRate > 0 ? `${agent.successRate}%` : 'No feedback'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}

          <div className="mt-8">
            <Link
              href="/dashboard/overview"
              className="btn-secondary inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
