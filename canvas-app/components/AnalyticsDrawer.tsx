/**
 * AnalyticsDrawer — Slide-out overlay showing real-time session analytics
 * Matches the first screenshot design: gauges, bar chart, summary stats
 * Theme: canvas-app dark crimson/red
 *
 * Data is per-user: fetches /api/canvas/stats on open and merges with session.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  MessageSquare,
  FileText,
  Clock,
  Activity,
  Zap,
  RefreshCw,
  Settings,
  TrendingUp,
  Cpu,
  Loader2,
} from 'lucide-react';

interface BackendStats {
  totalApps: number;
  totalUserMessages: number;
  totalAgentMessages: number;
  totalWords: number;
  estimatedTokens: number;
  totalExchanges: number;
  languageCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  recentTimestamps: number[];
  topLanguage: string;
}

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current chat messages to derive session stats from */
  messages: { role: string; text: string; timestamp: number }[];
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Session start timestamp (ms) */
  sessionStart: number;
  /** Logged-in user */
  user?: { id: string; email: string } | null;
  /** Currently active app */
  currentApp?: { name?: string; language?: string } | null;
}

// Generate activity bars from THIS user's message timestamps only — no fake data
function generateActivityBars(messageTimestamps: number[]): { height: number; failed: boolean }[] {
  const now = Date.now();
  const bars: { height: number; failed: boolean }[] = [];
  const bucketCount = 48;
  const bucketDuration = (24 * 60 * 60 * 1000) / bucketCount; // 30min buckets

  // Find the max count for normalization
  const counts: number[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = now - (bucketCount - i) * bucketDuration;
    const bucketEnd = bucketStart + bucketDuration;
    counts.push(messageTimestamps.filter(t => t >= bucketStart && t < bucketEnd).length);
  }
  const maxCount = Math.max(...counts, 1);

  for (let i = 0; i < bucketCount; i++) {
    const count = counts[i];
    bars.push({
      height: count > 0 ? Math.max((count / maxCount) * 100, 10) : 0,
      failed: false, // No fake failed bars
    });
  }
  return bars;
}

const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isGenerating,
  sessionStart,
  user,
  currentApp,
}) => {
  const [tickCount, setTickCount] = useState(0);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [uptimePct, setUptimePct] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ═══════ Feature tab state ═══════
  type TabId = 'sessions' | 'memories' | 'favorites' | 'feedback' | 'analytics' | 'preferences';
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [dataLoaded, setDataLoaded] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const fetchJson = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  };

  const loadTabData = async (tab: TabId) => {
    if (dataLoaded[tab]) return;
    try {
      if (tab === 'sessions') { const d = await fetchJson('/api/studio-data/sessions'); if (d?.sessions) setSessions(d.sessions); }
      else if (tab === 'memories') { const d = await fetchJson('/api/studio-data/memories'); if (d?.memories) setMemories(d.memories); }
      else if (tab === 'favorites') { const d = await fetchJson('/api/studio-data/favorites'); if (d?.favorites) setFavorites(d.favorites); }
      else if (tab === 'feedback') { const d = await fetchJson('/api/studio-data/feedback'); if (d?.feedback) setFeedbackList(d.feedback); }
      else if (tab === 'analytics') { const d = await fetchJson('/api/studio-data/analytics'); if (d) setAnalyticsData(d.analytics); }
      else if (tab === 'preferences') { const d = await fetchJson('/api/studio-data/preferences'); if (d?.preferences) setPreferences(d.preferences); }
      setDataLoaded(prev => ({ ...prev, [tab]: true }));
    } catch (e) { console.error('Failed to load tab data:', tab, e); }
  };

  const archiveSession = async (id: string) => {
    await fetch(`/api/studio-data/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const deleteMemory = async (id: string) => {
    await fetch(`/api/studio-data/memories/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const removeFavorite = async (id: string) => {
    await fetch(`/api/studio-data/favorites/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() && feedbackRating === 0) return;
    const res = await fetch('/api/studio-data/feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: feedbackRating || undefined, feedback: feedbackText || undefined, type: 'general' }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d?.feedback) setFeedbackList(prev => [d.feedback, ...prev]);
      setFeedbackRating(0);
      setFeedbackText('');
    }
  };

  const updatePreference = async (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    await fetch('/api/studio-data/preferences', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
  };

  // Derive display name from email (e.g. "john.doe@company.com" → "JOHN.DOE")
  const displayName = useMemo(() => {
    if (!user?.email) return 'USER';
    return user.email.split('@')[0].toUpperCase().slice(0, 20);
  }, [user?.email]);

  // Fetch backend stats when drawer opens
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/canvas/stats');
      const data = await res.json();
      if (data.success) setBackendStats(data.stats);
    } catch {
      // fail silently — show session-only data
    } finally {
      setLoadingStats(false);
    }
    // Fetch real uptime from health endpoint
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        if (hData.uptime) {
          // Server uptime as percentage of 30 days
          const uptimeSec = typeof hData.uptime === 'number' ? hData.uptime : parseFloat(hData.uptime) || 0;
          const thirtyDaysSec = 30 * 24 * 3600;
          const pct = Math.min((uptimeSec / thirtyDaysSec) * 100, 100);
          setUptimePct(pct >= 99 ? '99.9' : pct.toFixed(1));
        } else {
          setUptimePct('100');
        }
      }
    } catch {
      setUptimePct(null);
    }
  }, []);

  // Manage open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
      fetchStats();
      if (!dataLoaded[activeTab]) loadTabData(activeTab);
    }
  }, [isOpen, fetchStats]);

  // Load tab data when activeTab changes
  useEffect(() => {
    if (visible && !dataLoaded[activeTab]) loadTabData(activeTab);
  }, [activeTab]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, 400);
  };

  // Escape key handler
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Tick counter for refreshing activity bars periodically
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setTickCount(c => c + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [visible]);

  // ── Session-only derived stats (current app in memory) ──────────────────
  const sessionAgentMessages = messages.filter(m => m.role === 'model' || m.role === 'assistant');
  const sessionUserMessages = messages.filter(m => m.role === 'user');

  // ── Merged totals: backend historical + current session ─────────────────
  // Backend already includes all saved apps (including current if auto-saved).
  // Session counts are additions on top for the live in-progress session.
  const totalMessages = backendStats
    ? backendStats.totalUserMessages + sessionUserMessages.length
    : sessionUserMessages.length;

  const totalAgentReplies = backendStats
    ? backendStats.totalAgentMessages + sessionAgentMessages.length
    : sessionAgentMessages.length;

  const sessionWords = sessionAgentMessages.reduce(
    (sum, m) => sum + (m.text?.split(/\s+/).filter(Boolean).length || 0), 0
  );
  const totalWords = backendStats
    ? backendStats.totalWords + sessionWords
    : sessionWords;

  const estimatedTokens = backendStats
    ? backendStats.estimatedTokens + Math.round(sessionWords * 1.3)
    : Math.round(totalWords * 1.3);

  const totalExchanges = backendStats
    ? backendStats.totalExchanges + Math.min(sessionUserMessages.length, sessionAgentMessages.length)
    : Math.min(sessionUserMessages.length, sessionAgentMessages.length);

  const totalApps = backendStats?.totalApps ?? 0;

  // ── Latency: real avg from current session message pair gaps ────────────
  const avgLatency = useMemo(() => {
    if (messages.length < 2) return 0;
    const pairs: number[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      if (
        messages[i].role === 'user' &&
        (messages[i + 1].role === 'model' || messages[i + 1].role === 'assistant') &&
        messages[i].timestamp && messages[i + 1].timestamp
      ) {
        pairs.push(messages[i + 1].timestamp - messages[i].timestamp);
      }
    }
    if (pairs.length === 0) return 0;
    return Math.round(pairs.reduce((a, b) => a + b, 0) / pairs.length);
  }, [messages]);

  // ── Session time ─────────────────────────────────────────────────────────
  const sessionMs = Date.now() - sessionStart;
  const sessionMinutes = Math.floor(sessionMs / 60000);
  const sessionSeconds = Math.floor((sessionMs % 60000) / 1000);

  // ── Activity bars: combine backend recent timestamps + session ───────────
  const allTimestamps = useMemo(() => {
    const session = messages.map(m => m.timestamp).filter(Boolean);
    const backend = backendStats?.recentTimestamps || [];
    return [...backend, ...session];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendStats, messages.length]);

  const activityBars = useMemo(
    () => generateActivityBars(allTimestamps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTimestamps.length, tickCount]
  );

  // ── Latency gauge angle ──────────────────────────────────────────────────
  const latencyAngle = Math.min((avgLatency / 3000) * 180, 180);

  // ── Top language & provider ───────────────────────────────────────────────
  const topLanguage = backendStats?.topLanguage || currentApp?.language || 'html';
  const topProvider = backendStats
    ? (Object.entries(backendStats.providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'AI')
    : 'AI';

  if (!visible) return null;

  return (
    <>
      {/* Full-screen drawer — slides top to bottom */}
      <div
        ref={drawerRef}
        className="fixed inset-0 z-[201] bg-canvas-main overflow-y-auto"
        style={{
          animation: closing ? 'slideOutUp 0.4s cubic-bezier(0.4,0,0.6,1) forwards' : 'slideInDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Background effects to match app theme */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0L60 17.3v17.4L30 52 0 34.7V17.3z' fill='none' stroke='%23ff0000' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 52px' }} />
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-800/[0.03] rounded-full blur-[120px]" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-canvas-main/95 backdrop-blur-xl border-b border-primary-500/[0.08] px-6 py-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600/20 to-primary-500/10 border border-primary-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-400 tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  {displayName}
                </h2>
                <p className="text-[10px] text-canvas-muted-deep tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  STATUS: <span className="text-emerald-400">ONLINE</span> | LATENCY: <span className="text-amber-400">{avgLatency}MS</span>
                  {loadingStats && <span className="ml-2 text-gray-600">· syncing…</span>}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 hover:bg-primary-500/30 hover:scale-110 transition-all duration-200"
              title="Close Analytics"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-[1] px-6 py-5 space-y-6 w-full">

          {/* Agent / App Title Banner */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-900/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'monospace' }}>
                  {currentApp?.name || 'Canvas App Builder'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {totalApps > 0 && (
                  <span className="text-[10px] text-canvas-muted-deep font-mono uppercase">{totalApps} app{totalApps !== 1 ? 's' : ''} built</span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wider" style={{ fontFamily: 'monospace' }}>
                    LIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stat Gauges ── */}
          <div className="grid grid-cols-4 gap-3">
            {/* Messages Sent */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  Messages Sent
                </span>
                <MessageSquare className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1a1b25" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(totalMessages * 3, 97)} 97`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    {totalMessages > 999 ? `${(totalMessages / 1000).toFixed(1)}k` : totalMessages}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>YOU</p>
              <p className="text-[8px] text-gray-600 mt-1">{totalAgentReplies} agent replies</p>
            </div>

            {/* Words Generated */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  Words Generated
                </span>
                <FileText className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1a1b25" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(totalWords / 100, 97)} 97`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    {totalWords > 9999 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>WORDS</p>
              <p className="text-[8px] text-gray-600 mt-1">
                ~{Math.round(totalWords / Math.max(totalAgentReplies, 1))} avg/reply
              </p>
            </div>

            {/* Avg Latency */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  Avg Latency
                </span>
                <Clock className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                {/* Semi-circle gauge */}
                <svg viewBox="0 0 36 20" className="w-full">
                  <path d="M 2 18 A 15.5 15.5 0 0 1 34 18" fill="none" stroke="#1a1b25" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M 2 18 A 15.5 15.5 0 0 1 34 18"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${(latencyAngle / 180) * 50} 50`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pt-2">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>{avgLatency}</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>MS</p>
              <p className="text-[8px] text-gray-600 mt-1">Target: &lt;300ms</p>
            </div>

            {/* Session Time */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-4 text-center">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                  Session Time
                </span>
                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1a1b25" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(sessionMinutes * 2, 97)} 97`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>{sessionMinutes}m</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{String(sessionSeconds).padStart(2, '0')}S</p>
              <p className="text-[8px] text-gray-600 mt-1">1 session</p>
            </div>
          </div>

          {/* ── Live Request Activity Chart ── */}
          <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-canvas-muted tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                Live Request Activity
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-canvas-muted-deep">Success</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="text-[9px] text-canvas-muted-deep">Failed</span>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end gap-[2px] h-24">
              {activityBars.map((bar, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(bar.height, 3)}%`,
                    backgroundColor: bar.failed ? '#ef4444' : '#10b981',
                    opacity: bar.height === 0 ? 0 : 0.7 + (bar.height / 100) * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Time labels */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[8px] text-gray-600">24h ago</span>
              <span className="text-[8px] text-gray-600">12h ago</span>
              <span className="text-[8px] text-gray-600">Now</span>
            </div>
          </div>

          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-3 gap-3">
            {/* Est. Tokens */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'monospace' }}>
                ~{estimatedTokens.toLocaleString()}
              </p>
              <p className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase mt-2" style={{ fontFamily: 'monospace' }}>
                Est. Tokens Used
              </p>
            </div>

            {/* Total Exchanges */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
                {totalExchanges}
              </p>
              <p className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase mt-2" style={{ fontFamily: 'monospace' }}>
                Total Exchanges
              </p>
            </div>

            {/* Platform Uptime */}
            <div className="bg-canvas-card border border-primary-500/[0.08] rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>
                {uptimePct ? `${uptimePct}%` : <Loader2 className="w-5 h-5 animate-spin mx-auto text-canvas-muted-deep" />}
              </p>
              <p className="text-[9px] font-bold text-canvas-muted-deep tracking-wider uppercase mt-2" style={{ fontFamily: 'monospace' }}>
                Platform Uptime
              </p>
            </div>
          </div>

          {/* ═══════ FEATURE TABS ═══════ */}
          <div>
            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-canvas-card border border-primary-500/[0.08] rounded-xl overflow-x-auto">
              {([
                { id: 'sessions', icon: '💬', label: 'Sessions' },
                { id: 'memories', icon: '🧠', label: 'Memory' },
                { id: 'favorites', icon: '⭐', label: 'Favorites' },
                { id: 'feedback', icon: '📝', label: 'Feedback' },
                { id: 'analytics', icon: '📊', label: 'Analytics' },
                { id: 'preferences', icon: '⚙️', label: 'Preferences' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (!dataLoaded[tab.id]) loadTabData(tab.id); }}
                  className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                      : 'text-gray-600 hover:text-canvas-muted hover:bg-white/5 border border-transparent'
                  }`}
                  style={{ fontFamily: 'monospace' }}
                >
                  <span className="mr-1">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-3 bg-canvas-card border border-primary-500/[0.08] rounded-xl p-4 min-h-[200px]">

              {/* ─── SESSIONS TAB ─── */}
              {activeTab === 'sessions' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'monospace' }}>Chat Sessions</h4>
                    <span className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{sessions.length} sessions</span>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs" style={{ fontFamily: 'monospace' }}>No chat sessions yet</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {sessions.map((s: any) => (
                        <div key={s.id} className="p-3 bg-black/30 border border-gray-800 hover:border-primary-500/30 rounded-lg transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                              <span className="text-xs font-medium text-canvas-text truncate">{s.name || 'Untitled'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {s.stats?.messageCount && <span className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{s.stats.messageCount} msgs</span>}
                              <button onClick={() => archiveSession(s.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-primary-400 transition-all" title="Archive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-1" style={{ fontFamily: 'monospace' }}>
                            {new Date(s.createdAt).toLocaleDateString()} · {s.tags?.length > 0 ? s.tags.join(', ') : 'no tags'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── MEMORIES TAB ─── */}
              {activeTab === 'memories' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'monospace' }}>Agent Memory</h4>
                    <span className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{memories.length} entries</span>
                  </div>
                  {memories.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs" style={{ fontFamily: 'monospace' }}>No agent memories stored yet</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {memories.map((m: any) => {
                        const memList = Array.isArray(m.memories) ? m.memories : [];
                        const summary = typeof m.summary === 'string' ? (() => { try { return JSON.parse(m.summary); } catch { return null; } })() : m.summary;
                        return (
                          <div key={m.id} className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🧠</span>
                                <span className="text-[10px] font-bold text-canvas-text uppercase tracking-wider">{m.totalMemories} memories</span>
                              </div>
                              <button onClick={() => deleteMemory(m.id)} className="text-gray-600 hover:text-primary-400 transition-all" title="Delete">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {summary?.userProfile && (
                              <p className="text-[10px] text-canvas-muted-deep mb-1">Profile: {typeof summary.userProfile === 'string' ? summary.userProfile.substring(0, 100) : 'Available'}</p>
                            )}
                            {memList.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {memList.slice(0, 3).map((mem: any, i: number) => (
                                  <div key={i} className="text-[9px] text-gray-600 truncate" style={{ fontFamily: 'monospace' }}>• {typeof mem === 'string' ? mem : mem.content || JSON.stringify(mem).substring(0, 80)}</div>
                                ))}
                                {memList.length > 3 && <div className="text-[9px] text-gray-700" style={{ fontFamily: 'monospace' }}>+{memList.length - 3} more</div>}
                              </div>
                            )}
                            <div className="text-[8px] text-gray-700 mt-2" style={{ fontFamily: 'monospace' }}>Last accessed: {m.lastAccessed ? new Date(m.lastAccessed).toLocaleDateString() : 'never'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── FAVORITES TAB ─── */}
              {activeTab === 'favorites' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'monospace' }}>Favorites</h4>
                    <span className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{favorites.length} items</span>
                  </div>
                  {favorites.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs" style={{ fontFamily: 'monospace' }}>No favorites yet</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {favorites.map((f: any) => (
                        <div key={f.id} className="p-3 bg-black/30 border border-gray-800 hover:border-primary-500/30 rounded-lg transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{f.itemType === 'agent' ? '🤖' : f.itemType === 'session' ? '💬' : f.itemType === 'prompt' ? '✨' : '⭐'}</span>
                            <div className="min-w-0">
                              <span className="text-xs text-canvas-text truncate block">{f.notes || f.itemId}</span>
                              <span className="text-[9px] text-gray-600 uppercase" style={{ fontFamily: 'monospace' }}>{f.itemType}</span>
                            </div>
                          </div>
                          <button onClick={() => removeFavorite(f.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-primary-400 transition-all" title="Remove">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── FEEDBACK TAB ─── */}
              {activeTab === 'feedback' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'monospace' }}>Feedback</h4>
                  </div>
                  {/* Submit new feedback */}
                  <div className="p-3 bg-black/30 border border-gray-800 rounded-lg mb-3">
                    <p className="text-[10px] font-bold text-canvas-muted uppercase tracking-wider mb-2">Submit Feedback</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setFeedbackRating(star)} className={`text-lg transition-colors ${star <= feedbackRating ? 'text-amber-400' : 'text-gray-700'}`}>★</button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full p-2 text-xs rounded-lg border resize-none h-16 bg-black/50 border-gray-700 text-canvas-text placeholder:text-gray-700 focus:outline-none focus:border-primary-500/50"
                    />
                    <button
                      onClick={submitFeedback}
                      disabled={!feedbackText.trim() && feedbackRating === 0}
                      className="mt-2 w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary-500/15 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Submit
                    </button>
                  </div>
                  {/* Past feedback */}
                  {feedbackList.length > 0 && (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {feedbackList.map((fb: any) => (
                        <div key={fb.id} className="p-2 bg-black/20 border border-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {fb.rating && <span className="text-[10px] text-amber-400" style={{ fontFamily: 'monospace' }}>{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>}
                            <span className="text-[8px] text-gray-700" style={{ fontFamily: 'monospace' }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                          </div>
                          {fb.feedback && <p className="text-[10px] text-canvas-muted-deep mt-1">{fb.feedback}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ANALYTICS TAB ─── */}
              {activeTab === 'analytics' && (
                <div>
                  <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em] mb-3" style={{ fontFamily: 'monospace' }}>Usage Analytics</h4>
                  {analyticsData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-black/30 border border-gray-800 rounded-lg text-center">
                          <div className="text-lg font-bold text-primary-400" style={{ fontFamily: 'monospace' }}>{analyticsData.summary?.totalConversations || 0}</div>
                          <div className="text-[8px] text-gray-600 uppercase tracking-widest" style={{ fontFamily: 'monospace' }}>Conversations</div>
                        </div>
                        <div className="p-3 bg-black/30 border border-gray-800 rounded-lg text-center">
                          <div className="text-lg font-bold text-amber-400" style={{ fontFamily: 'monospace' }}>{analyticsData.summary?.totalTurns || 0}</div>
                          <div className="text-[8px] text-gray-600 uppercase tracking-widest" style={{ fontFamily: 'monospace' }}>Total Turns</div>
                        </div>
                        <div className="p-3 bg-black/30 border border-gray-800 rounded-lg text-center">
                          <div className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>{((analyticsData.summary?.totalTokens || 0) / 1000).toFixed(1)}k</div>
                          <div className="text-[8px] text-gray-600 uppercase tracking-widest" style={{ fontFamily: 'monospace' }}>Tokens Used</div>
                        </div>
                        <div className="p-3 bg-black/30 border border-gray-800 rounded-lg text-center">
                          <div className="text-lg font-bold text-cyan-400" style={{ fontFamily: 'monospace' }}>{analyticsData.sessions?.active || 0}</div>
                          <div className="text-[8px] text-gray-600 uppercase tracking-widest" style={{ fontFamily: 'monospace' }}>Active Sessions</div>
                        </div>
                      </div>
                      {/* Daily activity bar chart */}
                      {analyticsData.daily?.length > 0 && (
                        <div>
                          <p className="text-[9px] text-canvas-muted-deep uppercase tracking-widest mb-2" style={{ fontFamily: 'monospace' }}>Last 7 Days</p>
                          <div className="flex items-end gap-1 h-20">
                            {analyticsData.daily.map((d: any, i: number) => {
                              const maxCount = Math.max(...analyticsData.daily.map((x: any) => x.count), 1);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <div className="w-full bg-primary-500/60 rounded-t-sm transition-all" style={{ height: `${(d.count / maxCount) * 100}%` }} />
                                  <span className="text-[7px] text-gray-700" style={{ fontFamily: 'monospace' }}>{new Date(d.day).toLocaleDateString(undefined, { weekday: 'short' }).charAt(0)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {analyticsData.summary?.avgDurationMs > 0 && (
                        <div className="text-[9px] text-gray-600 text-center" style={{ fontFamily: 'monospace' }}>
                          Avg conversation: {Math.round(analyticsData.summary.avgDurationMs / 1000)}s · Max tokens: {analyticsData.summary.maxTokens?.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-600 text-xs" style={{ fontFamily: 'monospace' }}>No analytics data yet</div>
                  )}
                </div>
              )}

              {/* ─── PREFERENCES TAB ─── */}
              {activeTab === 'preferences' && (
                <div>
                  <h4 className="text-[10px] text-canvas-muted font-bold uppercase tracking-[0.2em] mb-3" style={{ fontFamily: 'monospace' }}>User Preferences</h4>
                  <div className="space-y-3">
                    {/* Theme */}
                    <div className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-canvas-text">Theme</p>
                          <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>{preferences.theme || 'dark'} mode</p>
                        </div>
                        <button
                          onClick={() => updatePreference('theme', preferences.theme === 'dark' ? 'light' : 'dark')}
                          className="px-3 py-1 text-[10px] font-bold rounded-lg border transition-all bg-primary-500/10 text-primary-400 border-primary-500/30 hover:bg-primary-500/20"
                        >
                          {preferences.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                        </button>
                      </div>
                    </div>
                    {/* Language */}
                    <div className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                      <p className="text-xs font-bold text-canvas-text mb-2">Language</p>
                      <select
                        value={preferences.language || 'en'}
                        onChange={(e) => updatePreference('language', e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border bg-black/50 border-gray-700 text-canvas-text focus:outline-none focus:border-primary-500/50"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="ja">日本語</option>
                        <option value="zh">中文</option>
                        <option value="ar">العربية</option>
                        <option value="hi">हिन्दी</option>
                        <option value="ur">اردو</option>
                      </select>
                    </div>
                    {/* Notifications */}
                    <div className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-canvas-text">Notifications</p>
                          <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>Build & deploy alerts</p>
                        </div>
                        <button
                          onClick={() => updatePreference('notifications', !preferences.notifications)}
                          className={`w-10 h-5 rounded-full transition-colors ${preferences.notifications !== false ? 'bg-primary-600 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${preferences.notifications !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {/* Sound Effects */}
                    <div className="p-3 bg-black/30 border border-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-canvas-text">Sound Effects</p>
                          <p className="text-[9px] text-gray-600" style={{ fontFamily: 'monospace' }}>UI sounds & TTS</p>
                        </div>
                        <button
                          onClick={() => updatePreference('soundEffects', !preferences.soundEffects)}
                          className={`w-10 h-5 rounded-full transition-colors ${preferences.soundEffects ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${preferences.soundEffects ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Footer Status Bar ── */}
          <div className="flex items-center justify-between py-3 px-4 bg-canvas-card border border-primary-500/[0.08] rounded-xl">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase" style={{ fontFamily: 'monospace' }}>
                {displayName}: {(currentApp?.language || topLanguage || 'canvas').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-emerald-400"
                  style={{
                    height: `${6 + Math.random() * 10}px`,
                    opacity: 0.5 + Math.random() * 0.5,
                  }}
                />
              ))}
              <Zap className="w-3 h-3 text-emerald-400 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideInDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideOutUp {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }
      `}</style>
    </>
  );
};

export default AnalyticsDrawer;
