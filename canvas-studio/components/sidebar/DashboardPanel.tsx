import React, { useState, useEffect, useCallback } from 'react';

interface DashboardStats {
    totalProjects: number;
    totalApps: number;
    totalAssets: number;
    totalBuilds: number;
    totalDeployments: number;
    totalDatabases: number;
    totalSandboxes: number;
    recentErrors: number;
}

interface AnalyticsSummary {
    totalConversations: number;
    totalTokens: number;
    totalTurns: number;
    avgDurationMs: number;
}

interface DashboardPanelProps {
    isDarkMode?: boolean;
    onNavigate?: (panel: string) => void;
}

export default function DashboardPanel({ isDarkMode = true, onNavigate }: DashboardPanelProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [storage, setStorage] = useState<{ usedBytes: number; maxBytes: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [hubRes, analyticsRes, storageRes] = await Promise.all([
                fetch('/api/studio-hub/summary', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch('/api/studio-data/analytics', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch('/api/studio-hub/storage', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);
            if (hubRes?.summary) setStats(hubRes.summary);
            if (analyticsRes?.analytics?.summary) setAnalytics(analyticsRes.analytics.summary);
            if (storageRes?.storage) setStorage(storageRes.storage);
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-50';

    const statCards = stats ? [
        { label: 'Projects', value: stats.totalProjects, icon: '📁', color: 'cyan', panel: 'projects' },
        { label: 'Apps', value: stats.totalApps, icon: '🚀', color: 'emerald', panel: 'workspace' },
        { label: 'Assets', value: stats.totalAssets, icon: '🖼️', color: 'pink', panel: 'assets' },
        { label: 'Builds', value: stats.totalBuilds, icon: '🔨', color: 'amber', panel: 'build' },
        { label: 'Deployments', value: stats.totalDeployments, icon: '☁️', color: 'violet', panel: 'deploy-dashboard' },
        { label: 'Databases', value: stats.totalDatabases, icon: '🗄️', color: 'blue', panel: 'database' },
        { label: 'Errors', value: stats.recentErrors, icon: '⚠️', color: stats.recentErrors > 0 ? 'red' : 'green', panel: 'monitoring' },
    ] : [];

    const storagePercent = storage ? Math.min(100, (storage.usedBytes / storage.maxBytes) * 100) : 0;
    const formatBytes = (b: number) => b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Dashboard</h2>
                <p className={`text-[10px] ${subtext} mt-0.5`}>Overview of your workspace</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            {statCards.map(card => (
                                <button key={card.label} onClick={() => onNavigate?.(card.panel)} className={`p-3 rounded-lg border ${border} ${cardBg} text-left hover:border-${card.color}-500/30 transition-all group`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base">{card.icon}</span>
                                        <span className={`text-[10px] ${subtext} group-hover:text-${card.color}-400 transition-colors`}>{card.label}</span>
                                    </div>
                                    <p className="text-lg font-bold">{card.value}</p>
                                </button>
                            ))}
                        </div>

                        {storage && (
                            <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] ${subtext}`}>💾 Storage</span>
                                    <span className="text-[10px] text-cyan-400">{formatBytes(storage.usedBytes)} / {formatBytes(storage.maxBytes)}</span>
                                </div>
                                <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                                    <div className={`h-full rounded-full transition-all ${storagePercent > 80 ? 'bg-primary-500' : storagePercent > 50 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${storagePercent}%` }} />
                                </div>
                            </div>
                        )}

                        {analytics && (
                            <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                                <h3 className="text-xs font-medium mb-2 text-cyan-400">AI Usage</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><p className={`text-[10px] ${subtext}`}>Conversations</p><p className="text-sm font-bold">{analytics.totalConversations}</p></div>
                                    <div><p className={`text-[10px] ${subtext}`}>Total Turns</p><p className="text-sm font-bold">{analytics.totalTurns}</p></div>
                                    <div><p className={`text-[10px] ${subtext}`}>Tokens Used</p><p className="text-sm font-bold">{(analytics.totalTokens / 1000).toFixed(1)}K</p></div>
                                    <div><p className={`text-[10px] ${subtext}`}>Avg Duration</p><p className="text-sm font-bold">{(analytics.avgDurationMs / 1000).toFixed(1)}s</p></div>
                                </div>
                            </div>
                        )}

                        <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                            <h3 className="text-xs font-medium mb-2 text-cyan-400">Quick Actions</h3>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'New Project', icon: '➕', panel: 'workspace' },
                                    { label: 'View Templates', icon: '📋', panel: 'templates' },
                                    { label: 'Deploy', icon: '🚀', panel: 'deploy' },
                                    { label: 'Security Scan', icon: '🛡️', panel: 'security' },
                                ].map(a => (
                                    <button key={a.label} onClick={() => onNavigate?.(a.panel)} className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${cardBg} flex items-center gap-2 hover:border-cyan-500/30 transition-all`}>
                                        <span>{a.icon}</span> {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={fetchAll} className={`w-full py-2 text-xs ${subtext} hover:text-cyan-400 transition-colors`}>
                            ↻ Refresh Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
