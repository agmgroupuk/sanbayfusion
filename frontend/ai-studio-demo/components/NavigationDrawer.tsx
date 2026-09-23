
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { X, Cpu, Activity, Zap, TrendingUp, Clock, Server, Gauge, MessageSquare, FileText, Timer, Hash } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { NavItem, SettingsState, Message, ChatSession } from '../types';
import statusService from '../services/statusService';

// Map provider keys to display names
const PROVIDER_DISPLAY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  mistral: 'Mistral',
  xai: 'xAI',
  groq: 'Groq',
  cohere: 'Cohere',
  cerebras: 'Cerebras',
  huggingface: 'HuggingFace',
};

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onModuleSelect: (item: NavItem) => void;
  currentSettings: SettingsState;
  onSettingsChange: (settings: SettingsState) => void;
  // Agent-specific props
  agentId?: string;
  agentName?: string;
  agentIcon?: string;
  agentSpecialty?: string;
  agentColor?: string;
  agentCategory?: string;
  agentProvider?: string;
  agentModel?: string;
  agentFallbacks?: string[];
  // Per-user session data
  messages?: Message[];
  sessions?: ChatSession[];
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onModuleSelect,
  currentSettings,
  onSettingsChange,
  agentId = 'default',
  agentName = 'AI Assistant',
  agentIcon = '🤖',
  agentSpecialty = '',
  agentColor = 'from-emerald-400 to-cyan-500',
  agentCategory = '',
  agentProvider = 'anthropic',
  agentModel = 'claude-sonnet-4-20250514',
  agentFallbacks = [],
  messages = [],
  sessions = [],
}) => {
  // Derive display values from agent config
  const displayId = agentId.toUpperCase().replace(/-/g, '_');
  const providerDisplay = PROVIDER_DISPLAY[agentProvider] || agentProvider;
  const modelDisplay = agentModel.split('/').pop() || agentModel;
  const fallbackCount = agentFallbacks.length;

  // Per-user analytics computed from real message data
  const userStats = useMemo(() => {
    const userMessages = messages.filter(m => m.sender === 'YOU');
    const agentMessages = messages.filter(m => m.sender === 'AGENT');
    const totalMessages = messages.length;

    // Word counts
    const wordsGenerated = agentMessages.reduce((sum, m) => sum + (m.text?.split(/\s+/).filter(Boolean).length || 0), 0);
    const userWords = userMessages.reduce((sum, m) => sum + (m.text?.split(/\s+/).filter(Boolean).length || 0), 0);
    const avgResponseWords = agentMessages.length > 0 ? Math.round(wordsGenerated / agentMessages.length) : 0;

    // Character count as rough token estimate (~4 chars per token)
    const totalChars = messages.reduce((sum, m) => sum + (m.text?.length || 0), 0);
    const estimatedTokens = Math.round(totalChars / 4);

    // Session duration from timestamps
    let sessionDuration = 0;
    if (messages.length >= 2) {
      const today = new Date().toDateString();
      const firstTs = new Date(`${today} ${messages[0].timestamp}`).getTime();
      const lastTs = new Date(`${today} ${messages[messages.length - 1].timestamp}`).getTime();
      if (!isNaN(firstTs) && !isNaN(lastTs)) {
        sessionDuration = Math.max(0, lastTs - firstTs);
      }
    }
    const durationMinutes = Math.floor(sessionDuration / 60000);
    const durationSeconds = Math.floor((sessionDuration % 60000) / 1000);

    // Session count
    const sessionCount = sessions.length || 1;

    // Longest message
    const longestResponse = agentMessages.reduce((max, m) => Math.max(max, m.text?.length || 0), 0);

    return {
      userMessageCount: userMessages.length,
      agentMessageCount: agentMessages.length,
      totalMessages,
      wordsGenerated,
      userWords,
      avgResponseWords,
      estimatedTokens,
      durationMinutes,
      durationSeconds,
      sessionCount,
      longestResponse,
    };
  }, [messages, sessions]);

  // Activity chart — real message frequency across all sessions
  const chartBars = useMemo(() => {
    // Collect all messages from every session + current messages
    const allMessages: Message[] = [
      ...messages,
      ...sessions.filter(s => !s.active).flatMap(s => s.messages),
    ];

    if (allMessages.length === 0) {
      // No data — show flat empty bars
      return [...Array(48)].map(() => ({ height: 4, isFailed: false }));
    }

    // Parse message timestamps into Date objects
    const now = new Date();
    const today = now.toDateString();
    const parsed = allMessages
      .map(m => {
        const d = new Date(`${today} ${m.timestamp}`);
        return isNaN(d.getTime()) ? null : d;
      })
      .filter((d): d is Date => d !== null);

    // Bucket into 48 half-hour slots (24h)
    const buckets = new Array(48).fill(0);
    const nowMs = now.getTime();
    for (const d of parsed) {
      let diffMs = nowMs - d.getTime();
      // If timestamp appears to be in the future (parsed as today but from yesterday), shift back 24h
      if (diffMs < 0) diffMs += 86400000;
      const slot = 47 - Math.min(47, Math.floor(diffMs / (30 * 60 * 1000)));
      buckets[slot]++;
    }

    const maxCount = Math.max(...buckets, 1);
    return buckets.map(count => ({
      height: count === 0 ? 4 : 10 + (count / maxCount) * 90,
      isFailed: false,
    }));
  }, [messages, sessions]);

  // Live stats — fetched from real backend
  const [stats, setStats] = useState({
    successRate: 99.0,
    avgLatency: 0,
    requestsToday: 0,
    uptime: 99.9,
  });

  const [isLive, setIsLive] = useState(false);

  // Fetch real platform metrics on open
  const fetchMetrics = useCallback(async () => {
    try {
      const metrics = await statusService.getMetrics();
      if (metrics) {
        setStats(prev => ({
          ...prev,
          avgLatency: metrics.avgLatency || prev.avgLatency,
          uptime: metrics.uptime || prev.uptime,
          successRate: metrics.successRate || prev.successRate,
          requestsToday: metrics.requestsToday || prev.requestsToday,
        }));
        setIsLive(true);
      }
    } catch {
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [isOpen, fetchMetrics]);

  return (
    <div
      className={`fixed inset-0 bg-[#0d0d0d] z-[200] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-[0_-30px_100px_rgba(0,0,0,0.9)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Decorative Matrix Scan Line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="w-full h-full bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[length:100%_4px] animate-[pulse_3s_infinite]"></div>
      </div>

      {/* Compact Header */}
      <div className="flex items-center justify-between px-6 py-4 relative z-10 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Cpu size={20} className="text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-emerald-400 font-bold text-lg tracking-[0.2em] font-mono leading-none">
              SANBAY_FUSION
            </h3>
            <p className="text-[9px] text-emerald-600/60 uppercase font-mono tracking-[0.3em] mt-1">
              STATUS: <span className="text-emerald-400">ONLINE</span> | LATENCY: <span className="text-emerald-400">{stats.avgLatency || '...'}MS</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-red-500 p-2 hover:bg-red-500/5 rounded-full border border-gray-800 hover:border-red-500/20 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Active Model Info */}
      <div className="px-6 py-4 border-b border-gray-800/50">
        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{agentIcon}</span>
              <div>
                <div className="text-lg font-bold text-white">{agentName}</div>
                {agentSpecialty && (
                  <div className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase tracking-widest">{agentSpecialty}{agentCategory ? ` • ${agentCategory}` : ''}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span className={`text-xs ${isLive ? 'text-emerald-400' : 'text-yellow-400'} font-mono`}>{isLive ? 'LIVE' : 'SIM'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {/* Your Session Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Messages Sent */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Messages Sent</span>
              <MessageSquare size={14} className="text-cyan-500" />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="35" fill="none" stroke="#06b6d4" strokeWidth="6"
                  strokeDasharray={`${Math.min((userStats.userMessageCount / Math.max(userStats.totalMessages, 1)) * 220, 220)} 220`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-lg font-bold text-cyan-400">{userStats.userMessageCount}</div>
                <div className="text-[8px] text-gray-500 uppercase">You</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
              {userStats.agentMessageCount} agent replies
            </div>
          </div>

          {/* Words Generated */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Words Generated</span>
              <FileText size={14} className="text-emerald-500" />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="35" fill="none" stroke="#10b981" strokeWidth="6"
                  strokeDasharray={`${Math.min((userStats.wordsGenerated / Math.max(userStats.wordsGenerated + userStats.userWords, 1)) * 220, 220)} 220`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-lg font-bold text-emerald-400">{userStats.wordsGenerated > 999 ? `${(userStats.wordsGenerated / 1000).toFixed(1)}K` : userStats.wordsGenerated}</div>
                <div className="text-[8px] text-gray-500 uppercase">Words</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
              ~{userStats.avgResponseWords} avg/reply
            </div>
          </div>

          {/* Avg Latency */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 hover:border-yellow-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Avg Latency</span>
              <Clock size={14} className="text-yellow-500" />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="35" fill="none" stroke="#eab308" strokeWidth="6"
                  strokeDasharray={`${Math.min((stats.avgLatency / 500) * 220, 220)} 220`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-lg font-bold text-yellow-400">{stats.avgLatency || '...'}</div>
                <div className="text-[8px] text-gray-500 uppercase">MS</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
              Target: &lt;300ms
            </div>
          </div>

          {/* Session Time */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Session Time</span>
              <Timer size={14} className="text-emerald-500" />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="35" fill="none" stroke="#10b981" strokeWidth="6"
                  strokeDasharray={`${Math.min((userStats.durationMinutes / 60) * 220, 220)} 220`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-lg font-bold text-emerald-400">{userStats.durationMinutes}m</div>
                <div className="text-[8px] text-gray-500 uppercase">{userStats.durationSeconds}s</div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 font-mono mt-2">
              {userStats.sessionCount} session{userStats.sessionCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Live Activity Chart */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Message Activity (24h)</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] text-gray-500">Messages</span>
              </div>
            </div>
          </div>
          <div className="h-32 flex items-end gap-1">
            {chartBars.map((bar, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all ${bar.isFailed ? 'bg-red-500/60' : 'bg-emerald-500/40 hover:bg-emerald-500/60'}`}
                style={{ height: `${bar.height}%` }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[8px] text-gray-600 font-mono">
            <span>24h ago</span>
            <span>12h ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Per-User Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-all">
            <div className="text-2xl font-bold text-cyan-400">~{userStats.estimatedTokens > 999 ? `${(userStats.estimatedTokens / 1000).toFixed(1)}K` : userStats.estimatedTokens}</div>
            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Est. Tokens Used</div>
          </div>
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 text-center hover:border-emerald-500/30 transition-all">
            <div className="text-2xl font-bold text-emerald-400">{userStats.totalMessages}</div>
            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Total Exchanges</div>
          </div>
          <div className="bg-[#111111] border border-gray-800/50 rounded-xl p-4 text-center hover:border-yellow-500/30 transition-all">
            <div className="text-2xl font-bold text-yellow-400">{stats.uptime}%</div>
            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider mt-1">Platform Uptime</div>
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[#080808]/50 flex justify-between items-center border-t border-gray-800/50">
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-emerald-600 animate-pulse" />
          <span className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-widest">
            SANBAY_FUSION: {displayId}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`w-1 h-3 ${i < 6 ? 'bg-emerald-500/30' : 'bg-gray-800'} animate-pulse`} style={{ animationDelay: `${i * 100}ms` }}></div>
            ))}
          </div>
          <Zap size={14} className="text-emerald-900/50" />
        </div>
      </div>
    </div>
  );
};

export default NavigationDrawer;

