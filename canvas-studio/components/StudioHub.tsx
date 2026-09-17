import React, { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────
type HubTab = 'media' | 'infra' | 'agents' | 'analytics';

interface StudioHubProps {
    isDarkMode: boolean;
    onClose: () => void;
    onSendMessage?: (msg: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────
const fetchJson = async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, { credentials: 'include', ...opts });
    if (!res.ok) return null;
    return res.json();
};

const fmtBytes = (b: number) => {
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusColor = (s: string) => {
    const map: Record<string, string> = {
        live: 'text-emerald-400', success: 'text-emerald-400', active: 'text-emerald-400', running: 'text-emerald-400', healthy: 'text-emerald-400',
        deploying: 'text-cyan-400', creating: 'text-cyan-400', building: 'text-cyan-400', queued: 'text-cyan-400', pending: 'text-cyan-400',
        failed: 'text-primary-400', error: 'text-primary-400', destroyed: 'text-primary-400',
        stopped: 'text-amber-400', cancelled: 'text-amber-400', suspended: 'text-amber-400',
        rolled_back: 'text-orange-400', completed: 'text-emerald-400',
    };
    return map[s] || 'text-canvas-muted';
};

const statusDot = (s: string) => {
    const cls = statusColor(s).replace('text-', 'bg-');
    return <div className={`w-2 h-2 rounded-full ${cls} shrink-0`} />;
};

// ── Tool categories for the agents/tools tab ───────────────────────
const TOOL_CATEGORIES = [
    { id: 'core', name: 'Core', icon: '⚡', tools: ['File operations', 'Web search', 'URL fetch', 'Math & calc', 'Code analysis'] },
    { id: 'ai', name: 'AI / ML', icon: '🤖', tools: ['Image generation', 'Vision analysis', 'Text classification', 'Embeddings', 'Summarization'] },
    { id: 'dev', name: 'Dev Tools', icon: '🛠️', tools: ['Linting', 'Formatting', 'Git operations', 'Package management', 'Testing'] },
    { id: 'data', name: 'Data', icon: '📊', tools: ['CSV/JSON parse', 'Data transform', 'Validation', 'Charts', 'Statistics'] },
    { id: 'security', name: 'Security', icon: '🔐', tools: ['Vulnerability scan', 'Dependency audit', 'OWASP check', 'Secret detection', 'SSL analysis'] },
    { id: 'cloud', name: 'Cloud', icon: '☁️', tools: ['S3 operations', 'Container mgmt', 'DNS management', 'SSL certificates', 'CDN config'] },
    { id: 'docs', name: 'Documents', icon: '📄', tools: ['PDF generation', 'DOCX export', 'Markdown render', 'Template engine', 'Report builder'] },
    { id: 'api', name: 'API', icon: '🔗', tools: ['REST testing', 'GraphQL queries', 'WebSocket test', 'API mocking', 'Schema validation'] },
    { id: 'media', name: 'Media', icon: '🎬', tools: ['Image optimize', 'Video process', 'Audio transcribe', 'Thumbnail gen', 'Format convert'] },
    { id: 'geo', name: 'Geo', icon: '🌐', tools: ['Geocoding', 'Distance calc', 'Map rendering', 'Timezone lookup', 'IP geolocation'] },
];

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════
const StudioHub: React.FC<StudioHubProps> = ({ isDarkMode, onClose, onSendMessage }) => {
    // ── Theme classes ────────────────────────────────────────────────
    const cardCls = `${isDarkMode ? 'bg-black/30 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-400/30'} border rounded-lg transition-all`;
    const labelCls = `text-[9px] ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} font-mono uppercase tracking-widest font-bold`;
    const valCls = isDarkMode ? 'text-white' : 'text-gray-900';
    const subCls = isDarkMode ? 'text-gray-600' : 'text-canvas-muted';
    const inputCls = `w-full p-2 text-xs rounded-lg border ${isDarkMode ? 'bg-black/50 border-gray-700 text-canvas-text placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-700 placeholder:text-canvas-muted'} focus:outline-none focus:border-cyan-500/50`;
    const btnPrimary = `w-full py-2 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all`;

    // ── State ────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<HubTab>('media');
    const [loaded, setLoaded] = useState<Record<string, boolean>>({});

    // Summary
    const [summary, setSummary] = useState<any>(null);

    // Media
    const [assets, setAssets] = useState<any[]>([]);
    const [imgPrompt, setImgPrompt] = useState('');
    const [vidPrompt, setVidPrompt] = useState('');
    const [generating, setGenerating] = useState<string | null>(null);

    // Infra
    const [builds, setBuilds] = useState<any[]>([]);
    const [deployments, setDeployments] = useState<any[]>([]);
    const [databases, setDatabases] = useState<any[]>([]);
    const [sandboxes, setSandboxes] = useState<any[]>([]);
    const [storage, setStorage] = useState<any>(null);
    const [infraSub, setInfraSub] = useState<'builds' | 'deploys' | 'db' | 'sandbox' | 'storage'>('builds');

    // Agents
    const [agentTasks, setAgentTasks] = useState<any[]>([]);
    const [expandedTool, setExpandedTool] = useState<string | null>(null);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [agentSub, setAgentSub] = useState<'config' | 'tools' | 'tasks'>('config');
    const [agentCapabilities, setAgentCapabilities] = useState<any>(null);

    // Analytics / Monitoring
    const [monitoring, setMonitoring] = useState<{ errors: any[]; healthChecks: any[] }>({ errors: [], healthChecks: [] });
    const [analyticsSub, setAnalyticsSub] = useState<'overview' | 'errors' | 'health'>('overview');

    // Media filter
    const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');
    const filteredAssets = mediaFilter === 'all' ? assets : assets.filter(a => (a.type || 'image') === mediaFilter);

    // URL Monitor tool
    const [monitorUrl, setMonitorUrl] = useState('');
    const [urlChecking, setUrlChecking] = useState(false);
    const [urlCheckResult, setUrlCheckResult] = useState<any>(null);

    const checkUrl = useCallback(async () => {
        if (!monitorUrl.trim()) return;
        setUrlChecking(true);
        setUrlCheckResult(null);
        const start = Date.now();
        try {
            const res = await fetch(monitorUrl, { mode: 'no-cors', signal: AbortSignal.timeout(10000) });
            setUrlCheckResult({
                url: monitorUrl,
                ok: true,
                status: res.status || 0,
                latency: Date.now() - start,
                redirected: res.redirected,
            });
        } catch {
            setUrlCheckResult({
                url: monitorUrl,
                ok: false,
                status: 0,
                latency: Date.now() - start,
                redirected: false,
            });
        } finally {
            setUrlChecking(false);
        }
    }, [monitorUrl]);

    // ── Data loaders ─────────────────────────────────────────────────
    const loadTab = useCallback(async (tab: HubTab) => {
        if (loaded[tab]) return;
        try {
            if (tab === 'media') {
                const d = await fetchJson('/api/studio-hub/assets');
                if (d?.assets) setAssets(d.assets);
            } else if (tab === 'infra') {
                const [b, dep, db, sb, st] = await Promise.all([
                    fetchJson('/api/studio-hub/builds'),
                    fetchJson('/api/studio-hub/deployments'),
                    fetchJson('/api/studio-hub/databases'),
                    fetchJson('/api/studio-hub/sandboxes'),
                    fetchJson('/api/studio-hub/storage'),
                ]);
                if (b?.builds) setBuilds(b.builds);
                if (dep?.deployments) setDeployments(dep.deployments);
                if (db?.databases) setDatabases(db.databases);
                if (sb?.sandboxes) setSandboxes(sb.sandboxes);
                if (st) setStorage(st);
            } else if (tab === 'agents') {
                const [t, caps] = await Promise.all([
                    fetchJson('/api/studio-hub/agent-tasks'),
                    fetchJson('/api/canvas/capabilities'),
                ]);
                if (t?.tasks) setAgentTasks(t.tasks);
                if (caps?.capabilities) setAgentCapabilities(caps.capabilities);
            } else if (tab === 'analytics') {
                const m = await fetchJson('/api/studio-hub/monitoring');
                if (m) setMonitoring(m);
            }
            setLoaded(prev => ({ ...prev, [tab]: true }));
        } catch (e) {
            console.error('[StudioHub] Load error:', tab, e);
        }
    }, [loaded]);

    // Load summary + initial tab on mount
    useEffect(() => {
        fetchJson('/api/studio-hub/summary').then(d => { if (d) setSummary(d); });
        loadTab(activeTab);
    }, []);

    // Load on tab switch
    useEffect(() => { loadTab(activeTab); }, [activeTab]);

    // ── Actions ──────────────────────────────────────────────────────
    const deleteAsset = async (id: string) => {
        await fetch(`/api/studio-hub/assets/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
        setAssets(prev => prev.filter(a => a.id !== id));
    };

    const cancelBuild = async (id: string) => {
        await fetch(`/api/studio-hub/builds/${encodeURIComponent(id)}/cancel`, { method: 'POST', credentials: 'include' });
        setBuilds(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    };

    const destroyDeployment = async (id: string) => {
        await fetch(`/api/studio-hub/deployments/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
        setDeployments(prev => prev.map(d => d.id === id ? { ...d, status: 'destroyed' } : d));
    };

    const deleteDatabase = async (id: string) => {
        await fetch(`/api/studio-hub/databases/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
        setDatabases(prev => prev.filter(d => d.id !== id));
    };

    const destroySandbox = async (id: string) => {
        await fetch(`/api/studio-hub/sandboxes/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
        setSandboxes(prev => prev.map(s => s.id === id ? { ...s, status: 'destroyed' } : s));
    };

    const resolveError = async (id: string) => {
        await fetch(`/api/studio-hub/monitoring/${encodeURIComponent(id)}/resolve`, { method: 'POST', credentials: 'include' });
        setMonitoring(prev => ({ ...prev, errors: prev.errors.map(e => e.id === id ? { ...e, resolved: true } : e) }));
    };

    const generateImage = async () => {
        if (!imgPrompt.trim()) return;
        setGenerating('image');
        try {
            await fetchJson('/api/studio-hub/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: imgPrompt }),
            });
            setImgPrompt('');
            // Reload assets
            const d = await fetchJson('/api/studio-hub/assets');
            if (d?.assets) setAssets(d.assets);
        } catch (e) { console.error('Image gen failed', e); }
        setGenerating(null);
    };

    const generateVideo = async () => {
        if (!vidPrompt.trim()) return;
        setGenerating('video');
        try {
            await fetchJson('/api/studio-hub/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: vidPrompt }),
            });
            setVidPrompt('');
            const d = await fetchJson('/api/studio-hub/assets');
            if (d?.assets) setAssets(d.assets);
        } catch (e) { console.error('Video gen failed', e); }
        setGenerating(null);
    };

    // ── Tab definitions ──────────────────────────────────────────────
    const TABS: { id: HubTab; icon: string; label: string }[] = [
        { id: 'media', icon: '🖼️', label: 'Media' },
        { id: 'infra', icon: '🔧', label: 'Infra' },
        { id: 'agents', icon: '🤖', label: 'Agents' },
        { id: 'analytics', icon: '📊', label: 'Monitor' },
    ];

    // ════════════════════════════════════════════════════════════════
    // RENDER — Full-screen layout
    // ════════════════════════════════════════════════════════════════
    return (
        <div className={`h-full min-h-0 flex flex-col ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
            {/* ─── Summary + Tab Bar ─── */}
            <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'} shrink-0`}>
                <div className="flex items-center justify-between">
                    {/* Summary Stats */}
                    {summary && (
                        <div className="flex items-center gap-6">
                            {[
                                { n: summary.apps, l: 'Apps', c: 'text-cyan-400' },
                                { n: summary.assets, l: 'Assets', c: 'text-purple-400' },
                                { n: summary.builds, l: 'Builds', c: 'text-amber-400' },
                                { n: summary.deployments, l: 'Live', c: 'text-emerald-400' },
                                { n: summary.sandboxes, l: 'Sandbox', c: 'text-orange-400' },
                                { n: summary.unresolvedErrors, l: 'Errors', c: summary.unresolvedErrors > 0 ? 'text-primary-400' : 'text-emerald-400' },
                            ].map((s, i) => (
                                <div key={i} className="text-center">
                                    <div className={`text-lg font-bold font-mono ${s.c}`}>{s.n}</div>
                                    <div className={`text-[8px] ${subCls} font-mono uppercase tracking-wider`}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab Bar */}
                    <div className="flex gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
                                    ? isDarkMode
                                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                                        : 'bg-cyan-100 text-cyan-700 border border-cyan-400'
                                    : isDarkMode
                                        ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/5 border border-transparent'
                                        : 'text-canvas-muted-deep hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                                    }`}
                            >
                                <span className="mr-1.5">{tab.icon}</span>{tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Tab Content ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

                {/* ═══════════════════════════════════════════════════════════
                   MEDIA TAB — Full-screen with image/video gen + gallery
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'media' && (
                    <div className="p-6 space-y-6">
                        {/* Generation Section — side-by-side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* AI Image Generation */}
                            <div className={`${cardCls} p-6`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-purple-500/15 border-purple-500/30' : 'bg-purple-100 border-purple-300'} border flex items-center justify-center text-xl`}>🎨</div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${valCls}`}>AI Image Generation</h4>
                                        <p className={`text-[10px] ${subCls} font-mono`}>Generate images from text descriptions</p>
                                    </div>
                                </div>
                                <textarea
                                    value={imgPrompt}
                                    onChange={e => setImgPrompt(e.target.value)}
                                    placeholder="Describe the image you want to generate... (e.g., 'A futuristic city skyline at sunset with neon lights')"
                                    className={`${inputCls} h-24 resize-none text-sm`}
                                />
                                <div className="flex items-center gap-3 mt-3">
                                    <button onClick={generateImage} disabled={!imgPrompt.trim() || generating === 'image'} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all`}>
                                        {generating === 'image' ? '⏳ Generating...' : '✨ Generate Image'}
                                    </button>
                                </div>
                            </div>

                            {/* AI Video Generation */}
                            <div className={`${cardCls} p-6`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-pink-500/15 border-pink-500/30' : 'bg-pink-100 border-pink-300'} border flex items-center justify-center text-xl`}>🎬</div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${valCls}`}>AI Video Generation</h4>
                                        <p className={`text-[10px] ${subCls} font-mono`}>Create videos from text prompts</p>
                                    </div>
                                </div>
                                <textarea
                                    value={vidPrompt}
                                    onChange={e => setVidPrompt(e.target.value)}
                                    placeholder="Describe the video you want to generate... (e.g., 'A drone camera flying over mountains at sunrise')"
                                    className={`${inputCls} h-24 resize-none text-sm`}
                                />
                                <div className="flex items-center gap-3 mt-3">
                                    <button onClick={generateVideo} disabled={!vidPrompt.trim() || generating === 'video'} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider bg-pink-500/15 text-pink-400 border border-pink-500/30 rounded-lg hover:bg-pink-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all`}>
                                        {generating === 'video' ? '⏳ Generating...' : '🎬 Generate Video'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Asset Gallery — full-width grid */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h4 className={`text-xs font-bold ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} uppercase tracking-widest`}>Asset Gallery</h4>
                                    <span className={`text-[10px] ${subCls} font-mono px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>{assets.length} files</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setMediaFilter('all'); }}
                                        className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${mediaFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : `${isDarkMode ? 'text-gray-600 hover:text-canvas-muted' : 'text-canvas-muted hover:text-gray-600'} border border-transparent`}`}
                                    >All</button>
                                    <button
                                        onClick={() => setMediaFilter('image')}
                                        className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${mediaFilter === 'image' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : `${isDarkMode ? 'text-gray-600 hover:text-canvas-muted' : 'text-canvas-muted hover:text-gray-600'} border border-transparent`}`}
                                    >🖼️ Images</button>
                                    <button
                                        onClick={() => setMediaFilter('video')}
                                        className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${mediaFilter === 'video' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : `${isDarkMode ? 'text-gray-600 hover:text-canvas-muted' : 'text-canvas-muted hover:text-gray-600'} border border-transparent`}`}
                                    >🎬 Videos</button>
                                </div>
                            </div>

                            {filteredAssets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="text-4xl mb-4 opacity-30">🖼️</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No assets yet</p>
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>Generate an image or video to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredAssets.map((a: any) => (
                                        <div key={a.id} className={`${cardCls} overflow-hidden group relative`}>
                                            {/* Preview */}
                                            <div className={`aspect-video relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                                                {a.thumbnailUrl || a.cdnUrl ? (
                                                    <img src={a.thumbnailUrl || a.cdnUrl} alt={a.originalName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">
                                                        {a.type === 'video' ? '🎬' : a.type === 'font' ? '🔤' : '📄'}
                                                    </div>
                                                )}
                                                {/* Hover overlay with actions */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                                    {(a.cdnUrl || a.thumbnailUrl) && (
                                                        <a href={a.cdnUrl || a.thumbnailUrl} download={a.originalName} className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-all" title="Download">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </a>
                                                    )}
                                                    {(a.cdnUrl || a.thumbnailUrl) && (
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(a.cdnUrl || a.thumbnailUrl); }}
                                                            className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 hover:bg-purple-500/30 transition-all" title="Copy URL"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteAsset(a.id)}
                                                        className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400 hover:bg-primary-500/30 transition-all" title="Delete"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                                {/* Type badge */}
                                                <div className={`absolute top-2 left-2 text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${a.type === 'video' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                                                    {a.type || 'image'}
                                                </div>
                                            </div>
                                            {/* Info */}
                                            <div className="p-3">
                                                <p className={`text-xs font-medium ${valCls} truncate`}>{a.originalName}</p>
                                                <div className={`flex items-center justify-between mt-1`}>
                                                    <span className={`text-[9px] ${subCls} font-mono`}>{fmtBytes(a.sizeBytes || 0)}</span>
                                                    {a.createdAt && <span className={`text-[9px] ${subCls} font-mono`}>{fmtDate(a.createdAt)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                   INFRASTRUCTURE TAB — Full-screen grid
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'infra' && (
                    <div className="p-6 space-y-6">
                        {/* Sub-tabs */}
                        <div className="flex gap-2">
                            {([
                                { id: 'builds' as const, icon: '🔨', label: 'Builds', count: builds.length },
                                { id: 'deploys' as const, icon: '🚀', label: 'Deployments', count: deployments.length },
                                { id: 'db' as const, icon: '🗄️', label: 'Databases', count: databases.length },
                                { id: 'sandbox' as const, icon: '📦', label: 'Sandboxes', count: sandboxes.length },
                                { id: 'storage' as const, icon: '💾', label: 'Storage' },
                            ]).map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setInfraSub(st.id)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${infraSub === st.id
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                                        : `${isDarkMode ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/5' : 'text-canvas-muted hover:text-gray-600 hover:bg-gray-100'} border border-transparent`
                                    }`}
                                >
                                    {st.icon} {st.label}{st.count !== undefined ? ` (${st.count})` : ''}
                                </button>
                            ))}
                        </div>

                        {/* ── Builds ── */}
                        {infraSub === 'builds' && (
                            builds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4 opacity-30">🔨</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No builds yet</p>
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>Builds will appear here when you deploy your projects</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {builds.map((b: any) => (
                                        <div key={b.id} className={`${cardCls} p-4`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {statusDot(b.status)}
                                                    <span className={`text-sm font-bold ${valCls}`}>{b.project?.name || 'Unknown'}</span>
                                                </div>
                                                <span className={`text-[10px] font-mono font-bold ${statusColor(b.status)} uppercase`}>{b.status}</span>
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono flex items-center gap-3`}>
                                                <span>{fmtDate(b.createdAt)}</span>
                                                {b.duration && <span>⏱ {(b.duration / 1000).toFixed(1)}s</span>}
                                                {b.branch && <span>🌿 {b.branch}</span>}
                                            </div>
                                            {b.errorMessage && <p className="text-xs text-primary-400/80 mt-2 bg-primary-500/5 rounded px-2 py-1 border border-primary-500/10">{b.errorMessage}</p>}
                                            {(b.status === 'queued' || b.status === 'building') && (
                                                <button onClick={() => cancelBuild(b.id)} className="mt-3 text-[10px] font-mono text-primary-400 hover:text-primary-300 uppercase tracking-wider">✕ Cancel Build</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Deployments ── */}
                        {infraSub === 'deploys' && (
                            deployments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4 opacity-30">🚀</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No deployments</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {deployments.map((d: any) => (
                                        <div key={d.id} className={`${cardCls} p-4`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {statusDot(d.status)}
                                                    <span className={`text-sm font-bold ${valCls}`}>{d.project?.name || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-mono font-bold ${statusColor(d.status)} uppercase`}>{d.status}</span>
                                                    {d.status === 'live' && (
                                                        <button onClick={() => destroyDeployment(d.id)} className="text-gray-600 hover:text-primary-400 text-xs transition-all" title="Destroy">✕</button>
                                                    )}
                                                </div>
                                            </div>
                                            {d.url && (
                                                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:text-cyan-400 truncate block mb-2">{d.url}</a>
                                            )}
                                            <div className={`text-xs ${subCls} font-mono flex items-center gap-3`}>
                                                <span>{d.environment}</span>
                                                <span>v{d.version}</span>
                                                <span>{fmtDate(d.createdAt)}</span>
                                                {d.domain && <span>🌐 {d.domain}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Databases ── */}
                        {infraSub === 'db' && (
                            <div className="space-y-4">
                                <div className={`${cardCls} p-4 flex items-center justify-between`}>
                                    <div>
                                        <h4 className={`text-sm font-bold ${valCls}`}>Create Database</h4>
                                        <p className={`text-xs ${subCls}`}>Provision a new project database via the AI agent</p>
                                    </div>
                                    <button
                                        onClick={() => { if (onSendMessage) onSendMessage('Create a new PostgreSQL database for my current project'); }}
                                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/25 transition-all"
                                    >🗄️ Create via Agent</button>
                                </div>
                                {databases.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="text-4xl mb-4 opacity-30">🗄️</div>
                                        <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No databases provisioned</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {databases.map((db: any) => (
                                            <div key={db.id} className={`${cardCls} p-4`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {statusDot(db.status)}
                                                        <span className={`text-sm font-bold ${valCls}`}>{db.name || db.project?.name}</span>
                                                    </div>
                                                    <button onClick={() => deleteDatabase(db.id)} className="text-gray-600 hover:text-primary-400 text-xs transition-all" title="Delete">✕</button>
                                                </div>
                                                <div className={`text-xs ${subCls} font-mono flex flex-wrap items-center gap-3`}>
                                                    <span className="uppercase">{db.engine}</span>
                                                    <span>{db.host}:{db.port}</span>
                                                    <span>{fmtBytes(db.sizeBytes || 0)}</span>
                                                </div>
                                                {db.lastBackup && <div className={`text-[10px] ${subCls} mt-2`}>Last backup: {fmtDate(db.lastBackup)}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Sandboxes ── */}
                        {infraSub === 'sandbox' && (
                            sandboxes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4 opacity-30">📦</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No active sandboxes</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {sandboxes.map((s: any) => (
                                        <div key={s.id} className={`${cardCls} p-4`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {statusDot(s.status)}
                                                    <span className={`text-sm font-bold ${valCls}`}>{s.project?.name || s.template || 'Sandbox'}</span>
                                                </div>
                                                <button onClick={() => destroySandbox(s.id)} className="text-gray-600 hover:text-primary-400 text-xs transition-all" title="Destroy">✕</button>
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono flex items-center gap-3`}>
                                                {s.template && <span>{s.template}</span>}
                                                <span>{s.memory}MB / {s.cpu} CPU</span>
                                                {s.port && <span>:{s.port}</span>}
                                                <span>{fmtBytes(s.storageUsed || 0)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Storage ── */}
                        {infraSub === 'storage' && (
                            <div className="max-w-3xl mx-auto space-y-4">
                                {storage ? (
                                    <>
                                        <div className={`${cardCls} p-6`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className={`text-sm font-bold ${valCls}`}>Total Usage</h4>
                                                <span className={`text-lg font-bold font-mono ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{fmtBytes(storage.totalBytes)}</span>
                                            </div>
                                            <div className={`w-full h-3 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                                                <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, (storage.totalBytes / (1024 * 1024 * 1024)) * 100)}%` }} />
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono mt-2 text-right`}>of 1 GB limit</div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { label: 'Assets', icon: '🖼️', count: storage.assets?.count, bytes: storage.assets?.totalBytes, optimized: storage.assets?.optimizedBytes },
                                                { label: 'Databases', icon: '🗄️', count: storage.databases?.count, bytes: storage.databases?.totalBytes },
                                                { label: 'Sandboxes', icon: '📦', count: storage.sandboxes?.count, bytes: storage.sandboxes?.totalBytes },
                                            ].map((item, i) => (
                                                <div key={i} className={`${cardCls} p-4 text-center`}>
                                                    <span className="text-2xl">{item.icon}</span>
                                                    <div className={`text-lg font-bold font-mono ${valCls} mt-1`}>{fmtBytes(item.bytes || 0)}</div>
                                                    <div className={`text-xs ${subCls} font-mono`}>{item.label} ({item.count})</div>
                                                    {item.optimized != null && <div className={`text-[10px] ${subCls} font-mono`}>optimized: {fmtBytes(item.optimized)}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="text-4xl mb-4 opacity-30">💾</div>
                                        <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>Loading storage info...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                   AGENTS TAB — Full-screen with config, tools, tasks
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'agents' && (
                    <div className="p-6 space-y-6">
                        {/* Sub-tabs */}
                        <div className="flex gap-2">
                            {([
                                { id: 'config' as const, label: '⚙️ Config' },
                                { id: 'tools' as const, label: '🧰 Tools' },
                                { id: 'tasks' as const, label: '📋 Tasks' },
                            ]).map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setAgentSub(st.id)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${agentSub === st.id
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                                        : `${isDarkMode ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/5' : 'text-canvas-muted hover:text-gray-600 hover:bg-gray-100'} border border-transparent`
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Agent Config ── */}
                        {agentSub === 'config' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left — Status + Config */}
                                <div className="space-y-4">
                                    <div className={`${cardCls} p-5`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl">🧠</div>
                                            <div>
                                                <p className={`text-sm font-bold ${valCls}`}>Canvas Studio Agent</p>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] text-emerald-400 font-mono font-bold">ONLINE</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { l: 'Mode', v: (agentCapabilities?.activeProviders?.length || 0) > 1 ? 'Multi-Agent' : 'Single Agent' },
                                                { l: 'Primary', v: agentCapabilities?.primaryProvider || '—' },
                                                { l: 'Providers', v: `${agentCapabilities?.activeProviders?.length || 0} active` },
                                            ].map((s, i) => (
                                                <div key={i} className={`text-center p-2.5 rounded-lg ${isDarkMode ? 'bg-black/30' : 'bg-gray-100'}`}>
                                                    <div className={`text-[9px] ${subCls} font-mono uppercase`}>{s.l}</div>
                                                    <div className={`text-xs font-bold ${valCls} mt-0.5`}>{s.v}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={`${cardCls} p-5`}>
                                        <h4 className={`${labelCls} mb-3`}>System Prompt Override</h4>
                                        <textarea
                                            value={systemPrompt}
                                            onChange={e => setSystemPrompt(e.target.value)}
                                            placeholder="Custom instructions for the AI agent... (leave empty for default)"
                                            className={`${inputCls} h-32 resize-none`}
                                        />
                                        <button
                                            onClick={async () => {
                                                await fetchJson('/api/studio-data/preferences', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ systemPrompt }),
                                                });
                                            }}
                                            className={`${btnPrimary} mt-3`}
                                        >Save System Prompt</button>
                                    </div>
                                </div>

                                {/* Right — Quick Commands */}
                                <div className={`${cardCls} p-5`}>
                                    <h4 className={`${labelCls} mb-4`}>Quick Agent Commands</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: '🚀', label: 'Deploy', desc: 'Deploy to production', cmd: 'Deploy my current project to production' },
                                            { icon: '🔍', label: 'Debug', desc: 'Fix all errors', cmd: 'Debug and fix all errors in my current project' },
                                            { icon: '📊', label: 'Optimize', desc: 'Performance audit', cmd: 'Analyze and optimize the performance of my current code' },
                                            { icon: '🔒', label: 'Security', desc: 'Security audit', cmd: 'Run a security audit on my current project' },
                                            { icon: '🧪', label: 'Test', desc: 'Generate tests', cmd: 'Generate comprehensive tests for my current code' },
                                            { icon: '📝', label: 'Document', desc: 'Generate docs', cmd: 'Generate documentation for my current project' },
                                            { icon: '♻️', label: 'Refactor', desc: 'Clean up code', cmd: 'Refactor my current code for better readability and maintainability' },
                                            { icon: '🎨', label: 'Style', desc: 'Improve UI/UX', cmd: 'Improve the UI/UX design of my current project' },
                                        ].map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onSendMessage?.(action.cmd)}
                                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${isDarkMode ? 'bg-black/30 hover:bg-cyan-500/10 border border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 hover:bg-cyan-50 border border-gray-200 hover:border-cyan-300'}`}
                                            >
                                                <span className="text-xl">{action.icon}</span>
                                                <div>
                                                    <span className={`text-xs font-bold ${valCls} block`}>{action.label}</span>
                                                    <span className={`text-[10px] ${subCls}`}>{action.desc}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tools Browser ── */}
                        {agentSub === 'tools' && (
                            <div>
                                <p className={`${labelCls} mb-4`}>{TOOL_CATEGORIES.length} Categories · {TOOL_CATEGORIES.reduce((a, c) => a + c.tools.length, 0)} Tools Available</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {TOOL_CATEGORIES.map(cat => (
                                        <div key={cat.id} className={`${cardCls} overflow-hidden`}>
                                            <button
                                                onClick={() => setExpandedTool(expandedTool === cat.id ? null : cat.id)}
                                                className={`w-full px-4 py-3 flex items-center justify-between text-left ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{cat.icon}</span>
                                                    <div>
                                                        <span className={`text-sm font-bold ${valCls}`}>{cat.name}</span>
                                                        <span className={`text-[10px] ${subCls} font-mono ml-2`}>{cat.tools.length} tools</span>
                                                    </div>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${subCls} transition-transform ${expandedTool === cat.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {expandedTool === cat.id && (
                                                <div className={`px-4 pb-3 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                                                    {cat.tools.map((tool, i) => (
                                                        <div key={i} className={`flex items-center justify-between py-2 ${i < cat.tools.length - 1 ? `border-b ${isDarkMode ? 'border-gray-800/30' : 'border-gray-100'}` : ''}`}>
                                                            <span className={`text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>{tool}</span>
                                                            <button
                                                                onClick={() => onSendMessage?.(`Use the ${tool.toLowerCase()} tool`)}
                                                                className="text-[10px] text-cyan-500 hover:text-cyan-400 font-mono font-bold transition-colors"
                                                            >RUN →</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Agent Tasks ── */}
                        {agentSub === 'tasks' && (
                            agentTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4 opacity-30">📋</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No agent tasks yet</p>
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>Agent tasks will appear here as you interact with the AI</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {agentTasks.map((task: any) => (
                                        <div key={task.id} className={`${cardCls} p-4`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {statusDot(task.status)}
                                                    <span className={`text-xs font-bold uppercase ${statusColor(task.status)}`}>{task.intent}</span>
                                                </div>
                                                <span className={`text-[10px] ${subCls} font-mono`}>{fmtDate(task.startedAt)}</span>
                                            </div>
                                            <p className={`text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} line-clamp-2`}>{task.input}</p>
                                            {task.summary && <p className="text-xs text-emerald-400/70 mt-2 truncate">{task.summary}</p>}
                                            {task.project?.name && <span className={`text-[10px] ${subCls} font-mono mt-1 block`}>📁 {task.project.name}</span>}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                   MONITORING TAB — Full-screen monitoring tool
                ═══════════════════════════════════════════════════════════ */}
                {activeTab === 'analytics' && (
                    <div className="p-6 space-y-6">
                        {/* Sub-tabs */}
                        <div className="flex gap-2">
                            {([
                                { id: 'overview' as const, label: '📊 Overview' },
                                { id: 'errors' as const, label: `🚨 Errors (${monitoring.errors.filter(e => !e.resolved).length})` },
                                { id: 'health' as const, label: '💚 Health Checks' },
                            ]).map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setAnalyticsSub(st.id)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${analyticsSub === st.id
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                                        : `${isDarkMode ? 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/5' : 'text-canvas-muted hover:text-gray-600 hover:bg-gray-100'} border border-transparent`
                                    }`}
                                >{st.label}</button>
                            ))}
                            {/* URL Monitor input */}
                            <div className="flex-1" />
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={monitorUrl}
                                    onChange={e => setMonitorUrl(e.target.value)}
                                    placeholder="Enter URL to monitor (e.g., https://example.com)"
                                    className={`${inputCls} w-72 text-xs`}
                                    onKeyDown={e => e.key === 'Enter' && checkUrl()}
                                />
                                <button
                                    onClick={checkUrl}
                                    disabled={!monitorUrl.trim() || urlChecking}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                                >{urlChecking ? '⏳ Checking...' : '🔍 Check URL'}</button>
                            </div>
                        </div>

                        {/* URL Check Result */}
                        {urlCheckResult && (
                            <div className={`${cardCls} p-4 ${urlCheckResult.ok ? 'border-emerald-500/30' : 'border-primary-500/30'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{urlCheckResult.ok ? '✅' : '❌'}</span>
                                    <div>
                                        <h4 className={`text-sm font-bold ${valCls}`}>{urlCheckResult.url}</h4>
                                        <div className={`text-xs font-mono flex items-center gap-4 mt-1 ${subCls}`}>
                                            <span className={urlCheckResult.ok ? 'text-emerald-400' : 'text-primary-400'}>Status: {urlCheckResult.status}</span>
                                            <span>Latency: {urlCheckResult.latency}ms</span>
                                            {urlCheckResult.redirected && <span className="text-amber-400">Redirected</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Overview ── */}
                        {analyticsSub === 'overview' && summary && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Projects', value: summary.projects, color: 'text-cyan-400', icon: '📁' },
                                        { label: 'Total Apps', value: summary.apps, color: 'text-purple-400', icon: '📱' },
                                        { label: 'Live Deployments', value: summary.deployments, color: 'text-emerald-400', icon: '🚀' },
                                        { label: 'Unresolved Errors', value: summary.unresolvedErrors, color: summary.unresolvedErrors > 0 ? 'text-primary-400' : 'text-emerald-400', icon: '🚨' },
                                    ].map((stat, i) => (
                                        <div key={i} className={`${cardCls} p-5 text-center`}>
                                            <span className="text-2xl">{stat.icon}</span>
                                            <div className={`text-2xl font-bold font-mono ${stat.color} mt-2`}>{stat.value}</div>
                                            <div className={`text-[10px] ${subCls} font-mono uppercase tracking-wider mt-1`}>{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Build success rate */}
                                {builds.length > 0 && (() => {
                                    const success = builds.filter(b => b.status === 'success').length;
                                    const failed = builds.filter(b => b.status === 'failed').length;
                                    const rate = builds.length > 0 ? Math.round((success / builds.length) * 100) : 0;
                                    return (
                                        <div className={`${cardCls} p-5 max-w-xl`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className={`text-xs font-bold ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} uppercase tracking-widest`}>Build Success Rate</h4>
                                                <span className={`text-lg font-bold font-mono ${rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-primary-400'}`}>{rate}%</span>
                                            </div>
                                            <div className={`w-full h-2.5 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                                                <div className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-primary-500'}`} style={{ width: `${rate}%` }} />
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono mt-2`}>{success} passed · {failed} failed · {builds.length - success - failed} other</div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── Errors ── */}
                        {analyticsSub === 'errors' && (
                            monitoring.errors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4">✅</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No errors detected</p>
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>All systems operating normally</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {monitoring.errors.map((err: any) => (
                                        <div key={err.id} className={`${cardCls} p-4 ${err.resolved ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`text-lg ${err.resolved ? '' : 'animate-pulse'}`}>{err.resolved ? '✅' : '🚨'}</span>
                                                    <span className={`text-sm font-bold ${valCls} truncate`}>{err.message}</span>
                                                </div>
                                                {!err.resolved && (
                                                    <button onClick={() => resolveError(err.id)} className="text-xs text-cyan-500 hover:text-cyan-400 font-mono font-bold whitespace-nowrap ml-2">RESOLVE ✓</button>
                                                )}
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono flex items-center gap-3`}>
                                                {err.source && <span>{err.source}</span>}
                                                <span>×{err.count}</span>
                                                <span>{fmtDate(err.lastSeen)}</span>
                                            </div>
                                            {err.stack && <pre className={`text-[10px] ${isDarkMode ? 'text-primary-400/50' : 'text-primary-300'} mt-2 overflow-hidden max-h-16 font-mono ${isDarkMode ? 'bg-primary-500/5' : 'bg-red-50'} rounded p-2 border ${isDarkMode ? 'border-primary-500/10' : 'border-red-200'}`}>{err.stack.substring(0, 300)}</pre>}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Health Checks ── */}
                        {analyticsSub === 'health' && (
                            monitoring.healthChecks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-4xl mb-4">💚</div>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'}`}>No health checks configured</p>
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>Use the URL checker above to monitor external services</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {monitoring.healthChecks.map((hc: any) => (
                                        <div key={hc.id} className={`${cardCls} p-4`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {hc.healthy ? statusDot('healthy') : statusDot('failed')}
                                                    <span className={`text-sm font-bold ${valCls}`}>{hc.target}</span>
                                                </div>
                                                <span className={`text-xs font-mono font-bold ${hc.healthy ? 'text-emerald-400' : 'text-primary-400'}`}>
                                                    {hc.healthy ? '✓ UP' : '✕ DOWN'}
                                                </span>
                                            </div>
                                            <div className={`text-xs ${subCls} font-mono flex items-center gap-3`}>
                                                <span>{hc.type}</span>
                                                <span>⏱ {hc.latency}ms</span>
                                                <span>{hc.uptime}% uptime</span>
                                                {hc.consecutiveFailures > 0 && <span className="text-primary-400">{hc.consecutiveFailures} failures</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudioHub;
