import React, { useState, useEffect, useCallback } from 'react';

interface ArchivedProject {
    id: string;
    name: string;
    prompt: string;
    archivedAt: string;
    code: string;
}

interface ArchivePanelProps {
    onRestore: (project: ArchivedProject) => void;
    isDarkMode?: boolean;
}

export default function ArchivePanel({ onRestore, isDarkMode = true }: ArchivePanelProps) {
    const [archived, setArchived] = useState<ArchivedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [restoring, setRestoring] = useState<string | null>(null);

    const fetchArchived = useCallback(async () => {
        try {
            const res = await fetch('/api/canvas/apps?status=archived&limit=100&source=standalone', { credentials: 'include' });
            if (!res.ok) {
                // Fallback: fetch deleted sessions
                const sessRes = await fetch('/api/studio-data/sessions', { credentials: 'include' });
                if (sessRes.ok) {
                    const data = await sessRes.json();
                    if (data.sessions) {
                        setArchived(data.sessions.filter((s: any) => s.isArchived || s.deletedAt).map((s: any) => ({
                            id: s.id,
                            name: s.title || 'Untitled Session',
                            prompt: s.lastMessage || '',
                            archivedAt: s.deletedAt || s.updatedAt,
                            code: '',
                        })));
                    }
                }
                return;
            }
            const data = await res.json();
            if (data.success && data.apps) {
                setArchived(data.apps.map((a: any) => ({
                    id: a.id,
                    name: a.name || 'Untitled',
                    prompt: a.prompt || '',
                    archivedAt: a.deletedAt || a.updatedAt,
                    code: a.code || '',
                })));
            }
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchArchived(); }, [fetchArchived]);

    const restoreProject = async (project: ArchivedProject) => {
        setRestoring(project.id);
        try {
            // Try to unarchive via API
            await fetch(`/api/canvas/apps/${project.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
                body: JSON.stringify({ status: 'active' }),
            });
            onRestore(project);
            setArchived(prev => prev.filter(a => a.id !== project.id));
        } catch { /* silent */ } finally { setRestoring(null); }
    };

    const permanentDelete = async (id: string) => {
        try {
            await fetch(`/api/canvas/apps/${id}?source=standalone&permanent=true`, { method: 'DELETE', credentials: 'include' });
            setArchived(prev => prev.filter(a => a.id !== id));
        } catch { /* silent */ }
    };

    const filtered = archived.filter(a =>
        !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-50';

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">Archive</h2>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search archived items..."
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text placeholder-gray-500' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50`}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">📦</p>
                        <p className="text-xs">{searchQuery ? 'No matching archived items' : 'Archive is empty'}</p>
                        <p className="text-[10px] mt-1">Deleted projects appear here</p>
                    </div>
                ) : filtered.map(item => (
                    <div key={item.id} className={`p-3 rounded-lg border ${border} ${cardBg} group`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-medium truncate">{item.name}</h3>
                                {item.prompt && <p className={`text-[10px] ${subtext} truncate mt-0.5`}>{item.prompt}</p>}
                                <p className={`text-[10px] ${subtext} mt-1`}>Archived {new Date(item.archivedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => restoreProject(item)} disabled={restoring === item.id}
                                    className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 disabled:opacity-50">
                                    {restoring === item.id ? '...' : '↩ Restore'}
                                </button>
                                <button onClick={() => permanentDelete(item.id)}
                                    className="px-2 py-1 text-[10px] text-primary-400 hover:bg-primary-500/10 rounded">
                                    🗑
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={`p-3 border-t ${border} text-center`}>
                <p className={`text-[10px] ${subtext}`}>{archived.length} archived item{archived.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}
