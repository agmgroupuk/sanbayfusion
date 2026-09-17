import React, { useState, useEffect, useCallback } from 'react';

interface Draft {
    id: string;
    name: string;
    prompt: string;
    code: string;
    updatedAt: string;
    createdAt: string;
    isFavorite: boolean;
}

interface DraftsPanelProps {
    currentAppId?: string;
    onLoadDraft: (draft: Draft) => void;
    onNewDraft: () => void;
    isDarkMode?: boolean;
}

const API_BASE = '/api/canvas/apps';

export default function DraftsPanel({ currentAppId, onLoadDraft, onNewDraft, isDarkMode = true }: DraftsPanelProps) {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recent' | 'name' | 'favorites'>('recent');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchDrafts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}?limit=100&source=standalone`, { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.apps) {
                setDrafts(data.apps.map((a: any) => ({
                    id: a.id,
                    name: a.name || 'Untitled',
                    prompt: a.prompt || '',
                    code: a.code || '',
                    updatedAt: a.updatedAt,
                    createdAt: a.createdAt,
                    isFavorite: a.isFavorite || false,
                })));
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

    const toggleFavorite = async (id: string) => {
        const draft = drafts.find(d => d.id === id);
        if (!draft) return;
        try {
            await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
                body: JSON.stringify({ isFavorite: !draft.isFavorite }),
            });
            setDrafts(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
        } catch { /* silent */ }
    };

    const deleteDraft = async (id: string) => {
        try {
            await fetch(`${API_BASE}/${id}?source=standalone`, { method: 'DELETE', credentials: 'include' });
            setDrafts(prev => prev.filter(d => d.id !== id));
            setDeleteConfirm(null);
        } catch { /* silent */ }
    };

    const filtered = drafts
        .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'favorites') return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    const bg = isDarkMode ? 'bg-canvas-card' : 'bg-white';
    const text = isDarkMode ? 'text-canvas-text' : 'text-gray-800';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const cardBg = isDarkMode ? 'bg-white/[0.06] hover:bg-white/[0.08]' : 'bg-gray-50 hover:bg-gray-100';

    return (
        <div className={`h-full flex flex-col ${bg} ${text}`}>
            <div className={`p-4 border-b ${border}`}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Drafts</h2>
                    <button onClick={onNewDraft} className="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">
                        + New
                    </button>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search drafts..."
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text placeholder-gray-500' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50`}
                />
                <div className="flex gap-1 mt-2">
                    {(['recent', 'name', 'favorites'] as const).map(s => (
                        <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-1 text-[10px] rounded ${sortBy === s ? 'bg-cyan-500/20 text-cyan-400' : `${subtext} hover:text-cyan-400`} transition-all`}>
                            {s === 'recent' ? '🕐 Recent' : s === 'name' ? '🔤 Name' : '⭐ Favorites'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">📝</p>
                        <p className="text-xs">{searchQuery ? 'No matching drafts' : 'No drafts yet'}</p>
                    </div>
                ) : filtered.map(draft => (
                    <div key={draft.id} className={`group p-3 rounded-lg border ${border} ${cardBg} cursor-pointer transition-all ${currentAppId === draft.id ? 'ring-1 ring-cyan-500/50' : ''}`} onClick={() => onLoadDraft(draft)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-medium truncate">{draft.name}</h3>
                                <p className={`text-[10px] ${subtext} truncate mt-0.5`}>{draft.prompt || 'No description'}</p>
                                <p className={`text-[10px] ${subtext} mt-1`}>{new Date(draft.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={e => { e.stopPropagation(); toggleFavorite(draft.id); }} className="p-1 hover:bg-cyan-500/10 rounded" title={draft.isFavorite ? 'Unfavorite' : 'Favorite'}>
                                    <span className="text-xs">{draft.isFavorite ? '⭐' : '☆'}</span>
                                </button>
                                {deleteConfirm === draft.id ? (
                                    <button onClick={e => { e.stopPropagation(); deleteDraft(draft.id); }} className="p-1 text-[10px] text-primary-400 bg-primary-500/10 rounded hover:bg-primary-500/20">Confirm</button>
                                ) : (
                                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(draft.id); }} className="p-1 hover:bg-primary-500/10 rounded text-xs text-canvas-muted-deep hover:text-primary-400">✕</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className={`p-3 border-t ${border} text-center`}>
                <p className={`text-[10px] ${subtext}`}>{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    );
}
