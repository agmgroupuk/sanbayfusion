import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';

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

interface CanvasNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (action: string) => void;
  isDarkMode: boolean;
  chatHistory?: { role: string; text: string; timestamp?: number }[];
}

/** Build 48-bar activity chart from chat message timestamps over last 24h */
const buildActivityFromHistory = (history: { role: string; text: string; timestamp?: number }[]): { height: number; failed: boolean }[] => {
  const now = Date.now();
  const bucketMs = (24 * 60 * 60 * 1000) / 48; // 30-min buckets
  const counts = new Array(48).fill(0);
  for (const msg of history) {
    if (!msg.timestamp) continue;
    const age = now - msg.timestamp;
    if (age < 0 || age > 24 * 60 * 60 * 1000) continue;
    const idx = 47 - Math.floor(age / bucketMs);
    if (idx >= 0 && idx < 48) counts[idx]++;
  }
  const max = Math.max(...counts, 1);
  return counts.map(c => ({ height: Math.max(c > 0 ? (c / max) * 90 + 10 : 3, 3), failed: false }));
};

const CanvasNavDrawer: React.FC<CanvasNavDrawerProps> = ({ isOpen, onClose, isDarkMode, chatHistory = [] }) => {
  // Theme helpers
  const cardCls = `${isDarkMode ? 'bg-canvas-card border-gray-800/40 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-200 hover:border-cyan-400/40'} rounded-xl border p-4 sm:p-5 group transition-colors`;
  const cardCenterCls = `${isDarkMode ? 'bg-canvas-card border-gray-800/40' : 'bg-gray-50 border-gray-200'} rounded-xl border p-4 sm:p-5 text-center`;
  const labelCls = `text-[9px] sm:text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`;
  const iconCls = isDarkMode ? 'text-gray-700' : 'text-canvas-muted';
  const valCls = isDarkMode ? 'text-white' : 'text-gray-900';
  const subCls = isDarkMode ? 'text-gray-600' : 'text-canvas-muted';
  const svgTrack = isDarkMode ? '#1a1a2e' : '#e5e7eb';

  const [animate, setAnimate] = useState(false);
  const [latency, setLatency] = useState(42);
  const [sessionStart] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState('0m');
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const latencyRef = useRef<ReturnType<typeof setInterval>>();
  const sessionRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch backend historical stats when drawer opens
  const fetchBackendStats = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setBackendStats(data.stats);
    } catch { /* fail silently — show session-only data */ }
  }, []);

  // Session-only stats
  const sessionUserMessages = useMemo(() => chatHistory.filter(m => m.role === 'user'), [chatHistory]);
  const sessionAgentMessages = useMemo(() => chatHistory.filter(m => m.role === 'model'), [chatHistory]);
  const sessionWords = useMemo(() => sessionAgentMessages.reduce((sum, m) => sum + (m.text?.split(/\s+/).filter(Boolean).length || 0), 0), [sessionAgentMessages]);

  // Merged stats: backend historical + current session
  const messageCount = backendStats ? backendStats.totalUserMessages + sessionUserMessages.length : sessionUserMessages.length;
  const exchangeCount = backendStats ? backendStats.totalExchanges + chatHistory.length : chatHistory.length;
  const wordCount = backendStats ? backendStats.totalWords + sessionWords : sessionWords;
  const tokenCount = backendStats ? backendStats.estimatedTokens + Math.round(sessionWords * 1.3) : Math.round(sessionWords * 1.3);
  const agentReplyCount = backendStats ? backendStats.totalAgentMessages + sessionAgentMessages.length : sessionAgentMessages.length;

  // Merge activity: backend recent timestamps + session timestamps
  const activityData = useMemo(() => {
    const sessionTs = chatHistory.map(m => m.timestamp).filter(Boolean) as number[];
    const backendTs = backendStats?.recentTimestamps || [];
    const allTs = [...backendTs, ...sessionTs];
    // Use same bucket logic but with merged timestamps
    const now = Date.now();
    const bucketMs = (24 * 60 * 60 * 1000) / 48;
    const counts = new Array(48).fill(0);
    for (const ts of allTs) {
      if (!ts) continue;
      const age = now - ts;
      if (age < 0 || age > 24 * 60 * 60 * 1000) continue;
      const idx = 47 - Math.floor(age / bucketMs);
      if (idx >= 0 && idx < 48) counts[idx]++;
    }
    const max = Math.max(...counts, 1);
    return counts.map(c => ({ height: Math.max(c > 0 ? (c / max) * 90 + 10 : 3, 3), failed: false }));
  }, [chatHistory, backendStats]);

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
      else if (tab === 'analytics') { const d = await fetchJson('/api/studio-data/analytics'); if (d) setAnalyticsData(d); }
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

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimate(true), 100);
      fetchBackendStats();
      latencyRef.current = setInterval(async () => {
        try {
          const start = performance.now();
          await fetch('/api/studio-billing/studio-plan', { method: 'HEAD', credentials: 'include' });
          setLatency(Math.round(performance.now() - start));
        } catch { setLatency(0); }
      }, 5000);
      sessionRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        if (elapsed < 60) setSessionTime(elapsed + 's');
        else if (elapsed < 3600) setSessionTime(Math.floor(elapsed / 60) + 'm');
        else setSessionTime(Math.floor(elapsed / 3600) + 'h ' + Math.floor((elapsed % 3600) / 60) + 'm');
      }, 1000);
      return () => { clearTimeout(timer); if (latencyRef.current) clearInterval(latencyRef.current); if (sessionRef.current) clearInterval(sessionRef.current); };
    } else { setAnimate(false); }
  }, [isOpen, sessionStart]);

  // Load initial tab data when drawer opens
  useEffect(() => {
    if (isOpen && !dataLoaded[activeTab]) loadTabData(activeTab);
  }, [isOpen]);

  const avgWordsPerReply = agentReplyCount > 0 ? Math.round(wordCount / agentReplyCount) : 0;

  return (
    <div className={`fixed inset-0 ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} z-[200] transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} style={{ backgroundColor: isDarkMode ? '#000000' : '#ffffff' }}>
      {isDarkMode && <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="w-full h-full bg-[linear-gradient(rgba(34,211,238,0.15)_1px,transparent_1px)] bg-[length:100%_3px]"></div>
      </div>}

      <div className="flex-grow overflow-y-auto custom-scrollbar relative z-10">
        {/* Header */}
        <div className={`p-4 sm:p-6 lg:p-8 flex items-center justify-between border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <span className="text-lg sm:text-xl">⚙️</span>
            </div>
            <div>
              <h3 className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} font-bold text-sm sm:text-lg lg:text-xl tracking-[0.15em] font-mono leading-none`}>MAULA_AI</h3>
              <p className={`text-[8px] sm:text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} uppercase font-mono tracking-[0.2em] mt-1 flex items-center gap-2 sm:gap-3`}>
                STATUS: <span className="text-emerald-400">ONLINE</span>
                <span className="text-gray-800">|</span>
                LATENCY: <span className="text-amber-400">{latency}MS</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`${isDarkMode ? 'text-canvas-muted-deep hover:text-white' : 'text-canvas-muted hover:text-gray-900'} p-2 transition-colors`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Agent Banner */}
        <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 p-3 sm:p-4 ${isDarkMode ? 'bg-gray-900/50 border-gray-800/50' : 'bg-gray-100 border-gray-200'} rounded-xl border flex items-center justify-between`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-lg sm:text-xl">✨</span>
            <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-sm sm:text-base`}>AI Studio Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-400 font-bold text-xs sm:text-sm tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Messages Sent */}
          <div className={cardCls}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <span className={labelCls}>Messages Sent</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke={svgTrack} strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#22d3ee" strokeWidth="6" strokeDasharray={`${Math.min(messageCount * 5, 213)} 213`} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className={`text-xl sm:text-2xl font-bold ${valCls}`}>{messageCount}</span></div>
              </div>
              <span className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-widest mt-2`}>YOU</span>
            </div>
            <p className={`text-[8px] sm:text-[9px] ${subCls} font-mono text-center mt-2`}>{agentReplyCount} agent replies</p>
          </div>

          {/* Words Generated */}
          <div className={cardCls}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <span className={labelCls}>Words Generated</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke={svgTrack} strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#a78bfa" strokeWidth="6" strokeDasharray={`${Math.min(wordCount * 0.5, 213)} 213`} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className={`text-xl sm:text-2xl font-bold ${valCls}`}>{wordCount > 999 ? (wordCount / 1000).toFixed(1) + 'k' : wordCount}</span></div>
              </div>
              <span className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-widest mt-2`}>WORDS</span>
            </div>
            <p className={`text-[8px] sm:text-[9px] ${subCls} font-mono text-center mt-2`}>~{avgWordsPerReply} avg/reply</p>
          </div>

          {/* Avg Latency */}
          <div className={cardCls}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <span className={labelCls}>Avg Latency</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="w-full h-full" viewBox="0 0 80 80">
                  <path d="M 8 44 A 34 34 0 1 1 72 44" fill="none" stroke={svgTrack} strokeWidth="6" strokeLinecap="round" />
                  <path d="M 8 44 A 34 34 0 1 1 72 44" fill="none" stroke="#eab308" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(latency / 300 * 170, 170)} 170`} className="transition-all duration-500" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pt-2"><span className={`text-xl sm:text-2xl font-bold ${valCls}`}>{latency}</span></div>
              </div>
              <span className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-widest mt-1`}>MS</span>
            </div>
            <p className={`text-[8px] sm:text-[9px] ${subCls} font-mono text-center mt-2`}>Target: &lt;300ms</p>
          </div>

          {/* Session Time */}
          <div className={cardCls}>
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <span className={labelCls}>Session Time</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke={svgTrack} strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#6366f1" strokeWidth="6" strokeDasharray="60 213" strokeLinecap="round" className="transition-all duration-1000 animate-spin" style={{ animationDuration: '8s', transformOrigin: 'center', transformBox: 'fill-box' as any }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className={`text-lg sm:text-2xl font-bold ${valCls}`}>{sessionTime}</span></div>
              </div>
              <span className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-widest mt-2`}>OS</span>
            </div>
            <p className={`text-[8px] sm:text-[9px] ${subCls} font-mono text-center mt-2`}>1 session</p>
          </div>
        </div>

        {/* Live Request Activity Chart */}
        <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 ${isDarkMode ? 'bg-canvas-card border-gray-800/40' : 'bg-gray-50 border-gray-200'} rounded-xl border p-4 sm:p-6 transition-all duration-700 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`}>Live Request Activity</h4>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div><span className={`text-[9px] sm:text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>Success</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary-500"></div><span className={`text-[9px] sm:text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>Failed</span></div>
            </div>
          </div>
          <div className="flex items-end gap-[2px] sm:gap-1 h-24 sm:h-32 lg:h-40">
            {activityData.map((bar, i) => (
              <div key={i} className={`flex-1 rounded-t-sm transition-all duration-500 ${bar.failed ? 'bg-primary-500/80' : 'bg-emerald-500/70 hover:bg-emerald-400'}`}
                style={{ height: animate ? `${bar.height}%` : '0%', transitionDelay: `${i * 15}ms` }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-2 sm:mt-3">
            <span className={`text-[8px] sm:text-[9px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} font-mono`}>24h ago</span>
            <span className={`text-[8px] sm:text-[9px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} font-mono`}>12h ago</span>
            <span className={`text-[8px] sm:text-[9px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} font-mono`}>Now</span>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className={`grid grid-cols-3 gap-3 sm:gap-4 mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className={cardCenterCls}>
            <div className="text-xl sm:text-3xl font-bold text-cyan-400 font-mono">~{tokenCount > 999 ? (tokenCount / 1000).toFixed(1) + 'k' : tokenCount}</div>
            <div className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-[0.2em] mt-1`}>Est. Tokens Used</div>
          </div>
          <div className={cardCenterCls}>
            <div className="text-xl sm:text-3xl font-bold text-purple-400 font-mono">{exchangeCount}</div>
            <div className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-[0.2em] mt-1`}>Total Exchanges</div>
          </div>
          <div className={cardCenterCls}>
            <div className="text-xl sm:text-3xl font-bold text-emerald-400 font-mono italic">{latency > 0 ? '✓' : '—'}</div>
            <div className={`text-[8px] sm:text-[9px] ${subCls} font-mono uppercase tracking-[0.2em] mt-1`}>Platform Status</div>
          </div>
        </div>

        {/* ═══════ FEATURE TABS ═══════ */}
        <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 mb-4 sm:mb-6 transition-all duration-700 delay-400 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Tab Bar */}
          <div className={`flex gap-1 p-1 ${isDarkMode ? 'bg-canvas-card border-gray-800/40' : 'bg-gray-100 border-gray-200'} border rounded-xl overflow-x-auto custom-scrollbar`}>
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
                className={`flex-1 min-w-0 px-2 sm:px-3 py-2 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id
                  ? isDarkMode
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                    : 'bg-cyan-100 text-cyan-700 border border-cyan-400'
                  : isDarkMode
                    ? 'text-gray-600 hover:text-canvas-muted hover:bg-white/5 border border-transparent'
                    : 'text-canvas-muted-deep hover:text-gray-700 hover:bg-gray-200 border border-transparent'
                  }`}
              >
                <span className="mr-1">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className={`mt-3 ${isDarkMode ? 'bg-canvas-card border-gray-800/40' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 sm:p-5 min-h-[200px]`}>
            {/* ─── SESSIONS TAB ─── */}
            {activeTab === 'sessions' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`}>Chat Sessions</h4>
                  <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>{sessions.length} sessions</span>
                </div>
                {sessions.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} text-xs font-mono`}>No chat sessions yet</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {sessions.map((s: any) => (
                      <div key={s.id} className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-400/30'} border rounded-lg transition-all group`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'} truncate`}>{s.name || 'Untitled'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.stats?.messageCount && <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>{s.stats.messageCount} msgs</span>}
                            <button
                              onClick={() => archiveSession(s.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-primary-400 transition-all"
                              title="Archive"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono mt-1`}>
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
                  <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`}>Agent Memory</h4>
                  <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>{memories.length} entries</span>
                </div>
                {memories.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} text-xs font-mono`}>No agent memories stored yet</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {memories.map((m: any) => {
                      const memList = Array.isArray(m.memories) ? m.memories : [];
                      const summary = typeof m.summary === 'string' ? (() => { try { return JSON.parse(m.summary); } catch { return null; } })() : m.summary;
                      return (
                        <div key={m.id} className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🧠</span>
                              <span className={`text-[10px] font-bold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'} uppercase tracking-wider`}>{m.totalMemories} memories</span>
                            </div>
                            <button onClick={() => deleteMemory(m.id)} className="text-gray-600 hover:text-primary-400 transition-all" title="Delete">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          {summary?.userProfile && (
                            <p className={`text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} mb-1`}>Profile: {typeof summary.userProfile === 'string' ? summary.userProfile.substring(0, 100) : 'Available'}</p>
                          )}
                          {memList.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {memList.slice(0, 3).map((mem: any, i: number) => (
                                <div key={i} className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono truncate`}>• {typeof mem === 'string' ? mem : mem.content || JSON.stringify(mem).substring(0, 80)}</div>
                              ))}
                              {memList.length > 3 && <div className={`text-[9px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-text'} font-mono`}>+{memList.length - 3} more</div>}
                            </div>
                          )}
                          <div className={`text-[8px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-text'} font-mono mt-2`}>Last accessed: {m.lastAccessed ? new Date(m.lastAccessed).toLocaleDateString() : 'never'}</div>
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
                  <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`}>Favorites</h4>
                  <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>{favorites.length} items</span>
                </div>
                {favorites.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} text-xs font-mono`}>No favorites yet</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {favorites.map((f: any) => (
                      <div key={f.id} className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-400/30'} border rounded-lg transition-all flex items-center justify-between group`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">
                            {f.itemType === 'agent' ? '🤖' : f.itemType === 'session' ? '💬' : f.itemType === 'prompt' ? '✨' : '⭐'}
                          </span>
                          <div className="min-w-0">
                            <span className={`text-xs ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'} truncate block`}>{f.notes || f.itemId}</span>
                            <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono uppercase`}>{f.itemType}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFavorite(f.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-primary-400 transition-all" title="Remove">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                  <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold`}>Feedback</h4>
                </div>
                {/* Submit new feedback */}
                <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg mb-3`}>
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} uppercase tracking-wider mb-2`}>Submit Feedback</p>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setFeedbackRating(star)} className={`text-lg transition-colors ${star <= feedbackRating ? 'text-amber-400' : isDarkMode ? 'text-gray-700' : 'text-canvas-text'}`}>★</button>
                    ))}
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share your thoughts..."
                    className={`w-full p-2 text-xs rounded-lg border resize-none h-16 ${isDarkMode ? 'bg-black/50 border-gray-700 text-canvas-text placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-700 placeholder:text-canvas-muted'} focus:outline-none focus:border-cyan-500/50`}
                  />
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim() && feedbackRating === 0}
                    className="mt-2 w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Submit
                  </button>
                </div>
                {/* Past feedback */}
                {feedbackList.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {feedbackList.map((fb: any) => (
                      <div key={fb.id} className={`p-2 ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-white border-gray-200'} border rounded-lg`}>
                        <div className="flex items-center gap-2">
                          {fb.rating && <span className={`text-[10px] ${isDarkMode ? 'text-amber-400' : 'text-amber-500'} font-mono`}>{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>}
                          <span className={`text-[8px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} font-mono`}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                        {fb.feedback && <p className={`text-[10px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} mt-1`}>{fb.feedback}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── ANALYTICS TAB ─── */}
            {activeTab === 'analytics' && (
              <div>
                <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold mb-3`}>Usage Analytics</h4>
                {analyticsData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg text-center`}>
                        <div className="text-lg font-bold text-cyan-400 font-mono">{analyticsData.summary?.totalConversations || 0}</div>
                        <div className={`text-[8px] ${subCls} font-mono uppercase tracking-widest`}>Conversations</div>
                      </div>
                      <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg text-center`}>
                        <div className="text-lg font-bold text-purple-400 font-mono">{analyticsData.summary?.totalTurns || 0}</div>
                        <div className={`text-[8px] ${subCls} font-mono uppercase tracking-widest`}>Total Turns</div>
                      </div>
                      <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg text-center`}>
                        <div className="text-lg font-bold text-emerald-400 font-mono">{((analyticsData.summary?.totalTokens || 0) / 1000).toFixed(1)}k</div>
                        <div className={`text-[8px] ${subCls} font-mono uppercase tracking-widest`}>Tokens Used</div>
                      </div>
                      <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg text-center`}>
                        <div className="text-lg font-bold text-amber-400 font-mono">{analyticsData.sessions?.active || 0}</div>
                        <div className={`text-[8px] ${subCls} font-mono uppercase tracking-widest`}>Active Sessions</div>
                      </div>
                    </div>
                    {/* Daily activity bar chart */}
                    {analyticsData.daily?.length > 0 && (
                      <div>
                        <p className={`text-[9px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} font-mono uppercase tracking-widest mb-2`}>Last 7 Days</p>
                        <div className="flex items-end gap-1 h-20">
                          {analyticsData.daily.map((d: any, i: number) => {
                            const maxCount = Math.max(...analyticsData.daily.map((x: any) => x.count), 1);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full bg-cyan-500/60 rounded-t-sm transition-all" style={{ height: `${(d.count / maxCount) * 100}%` }}></div>
                                <span className={`text-[7px] ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'} font-mono`}>{new Date(d.day).toLocaleDateString(undefined, { weekday: 'short' }).charAt(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {analyticsData.summary?.avgDurationMs > 0 && (
                      <div className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono text-center`}>
                        Avg conversation: {Math.round(analyticsData.summary.avgDurationMs / 1000)}s · Max tokens: {analyticsData.summary.maxTokens?.toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} text-xs font-mono`}>No analytics data yet</div>
                )}
              </div>
            )}

            {/* ─── PREFERENCES TAB ─── */}
            {activeTab === 'preferences' && (
              <div>
                <h4 className={`text-[10px] sm:text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} font-mono uppercase tracking-[0.2em] font-bold mb-3`}>User Preferences</h4>
                <div className="space-y-3">
                  {/* Theme */}
                  <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>Theme</p>
                        <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>{preferences.theme || (isDarkMode ? 'dark' : 'light')} mode</p>
                      </div>
                      <button
                        onClick={() => updatePreference('theme', isDarkMode ? 'light' : 'dark')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-300 hover:bg-cyan-100'}`}
                      >
                        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                      </button>
                    </div>
                  </div>
                  {/* Language */}
                  <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg`}>
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'} mb-2`}>Language</p>
                    <select
                      value={preferences.language || 'en'}
                      onChange={(e) => updatePreference('language', e.target.value)}
                      className={`w-full p-2 text-xs rounded-lg border ${isDarkMode ? 'bg-black/50 border-gray-700 text-canvas-text' : 'bg-gray-50 border-gray-200 text-gray-700'} focus:outline-none focus:border-cyan-500/50`}
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
                  <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>Notifications</p>
                        <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>Build & deploy alerts</p>
                      </div>
                      <button
                        onClick={() => updatePreference('notifications', !preferences.notifications)}
                        className={`w-10 h-5 rounded-full transition-colors ${preferences.notifications !== false ? 'bg-cyan-600 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${preferences.notifications !== false ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>
                  </div>
                  {/* Sound Effects */}
                  <div className={`p-3 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-200'} border rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>Sound Effects</p>
                        <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} font-mono`}>UI sounds & TTS</p>
                      </div>
                      <button
                        onClick={() => updatePreference('soundEffects', !preferences.soundEffects)}
                        className={`w-10 h-5 rounded-full transition-colors ${preferences.soundEffects ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${preferences.soundEffects ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-3 sm:p-4 lg:p-5 ${isDarkMode ? 'bg-canvas-card/80 border-gray-800/30' : 'bg-gray-100 border-gray-200'} border-t flex justify-between items-center relative z-10 flex-shrink-0`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-amber-400 text-sm">⚡</span>
          <span className="text-[9px] sm:text-[10px] text-cyan-500/60 font-mono uppercase tracking-[0.2em] font-bold">MAULA_AI: AI_STUDIO</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => { onClose(); window.parent.postMessage('close-canvas-drawer', '*'); }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary-600/20 to-orange-600/20 hover:from-primary-600/40 hover:to-orange-600/40 border border-primary-500/50 hover:border-primary-400 rounded-lg flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-all group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Exit</span>
          </button>
          <div className="hidden sm:flex gap-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`w-1 h-3 border border-cyan-900/40 ${i < 5 ? 'bg-cyan-500/20' : 'bg-transparent'} animate-pulse`} style={{ animationDelay: `${i * 100}ms` }}></div>
            ))}
          </div>
          <span className="hidden sm:inline text-cyan-900/50">⚡</span>
        </div>
      </div>
    </div>
  );
};

export default CanvasNavDrawer;
