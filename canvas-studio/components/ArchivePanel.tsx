import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
  className?: string;
}

type SortBy = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
type ViewMode = 'grid' | 'list';
type FilterRange = 'all' | 'today' | 'week' | 'month' | 'older';

export default function ArchivePanel({ onRestore, isDarkMode = true, className = '' }: ArchivePanelProps) {
  const [archived, setArchived] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterRange, setFilterRange] = useState<FilterRange>('all');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/canvas/apps?status=archived&limit=100&source=standalone', { credentials: 'include' });
      if (!res.ok) {
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
      await fetch(`/api/canvas/apps/${encodeURIComponent(project.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
        body: JSON.stringify({ status: 'active' }),
      });
      onRestore(project);
      setArchived(prev => prev.filter(a => a.id !== project.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(project.id); return n; });
    } catch { /* silent */ } finally { setRestoring(null); }
  };

  const permanentDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/canvas/apps/${encodeURIComponent(id)}?source=standalone&permanent=true`, { method: 'DELETE', credentials: 'include' });
      setArchived(prev => prev.filter(a => a.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setConfirmDeleteId(null);
    } catch { /* silent */ } finally { setDeleting(null); }
  };

  const bulkRestore = async () => {
    const items = archived.filter(a => selectedIds.has(a.id));
    for (const item of items) {
      await restoreProject(item);
    }
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    for (const id of ids) {
      await permanentDelete(id);
    }
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  // Date filter helper
  const isInRange = (dateStr: string, range: FilterRange): boolean => {
    if (range === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (range === 'today') return diffDays < 1;
    if (range === 'week') return diffDays < 7;
    if (range === 'month') return diffDays < 30;
    if (range === 'older') return diffDays >= 30;
    return true;
  };

  const filtered = useMemo(() => {
    let items = archived.filter(a => {
      const matchSearch = !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRange = isInRange(a.archivedAt, filterRange);
      return matchSearch && matchRange;
    });

    items.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime();
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

    return items;
  }, [archived, searchQuery, filterRange, sortBy]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ArchivedProject[]> = {};
    for (const item of filtered) {
      const d = new Date(item.archivedAt);
      const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filtered]);

  const previewProject = previewId ? archived.find(a => a.id === previewId) : null;

  // Styling
  const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const cardBg = isDarkMode ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-gray-50 hover:bg-gray-100';
  const pillBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-100';
  const pillActive = isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-600 border-cyan-200';

  // Stats
  const totalArchived = archived.length;
  const thisWeek = archived.filter(a => isInRange(a.archivedAt, 'week')).length;
  const thisMonth = archived.filter(a => isInRange(a.archivedAt, 'month')).length;
  const withCode = archived.filter(a => a.code && a.code.length > 0).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'} ${className}`}>
      {/* Stats Bar */}
      <div className={`px-6 py-4 border-b ${border} shrink-0`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Archived', value: totalArchived, icon: '📦', color: 'text-cyan-400' },
            { label: 'This Week', value: thisWeek, icon: '📅', color: 'text-blue-400' },
            { label: 'This Month', value: thisMonth, icon: '📆', color: 'text-purple-400' },
            { label: 'With Code', value: withCode, icon: '💻', color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className={`px-4 py-3 rounded-xl border ${border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{stat.icon}</span>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${subtext}`}>{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className={`px-6 py-3 border-b ${border} shrink-0`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search archived projects..."
              className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.05] text-canvas-text placeholder-gray-600' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50 transition-colors`}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'today', 'week', 'month', 'older'] as FilterRange[]).map(range => (
              <button
                key={range}
                onClick={() => setFilterRange(range)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${filterRange === range ? pillActive : `${pillBg} border-transparent ${subtext} hover:border-canvas-border`}`}
              >
                {range === 'all' ? 'All' : range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : '30+ Days'}
              </button>
            ))}
          </div>

          {/* Sort & View */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className={`px-3 py-1.5 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.05] text-canvas-text' : 'bg-gray-50 text-gray-700'} focus:outline-none cursor-pointer`}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A→Z</option>
              <option value="name-desc">Name Z→A</option>
            </select>

            <div className={`flex rounded-lg border ${border} overflow-hidden`}>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? (isDarkMode ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600') : subtext}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? (isDarkMode ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600') : subtext}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className={`mt-3 flex items-center gap-3 px-4 py-2.5 rounded-lg border ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
            <span className="text-xs font-medium text-cyan-400">{selectedIds.size} selected</span>
            <button onClick={bulkRestore} className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">
              ↩ Restore All
            </button>
            <button onClick={() => setConfirmBulkDelete(true)} className="px-3 py-1 text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors">
              🗑 Delete All
            </button>
            <button onClick={() => setSelectedIds(new Set())} className={`px-3 py-1 text-xs ${subtext} hover:text-canvas-text transition-colors`}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${subtext}`}>Loading archive...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-5xl">📦</div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>
              {searchQuery || filterRange !== 'all' ? 'No matching items' : 'Archive is empty'}
            </h3>
            <p className={`text-sm ${subtext} max-w-md text-center`}>
              {searchQuery || filterRange !== 'all'
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'When you archive or delete projects, they\'ll appear here for recovery.'}
            </p>
            {(searchQuery || filterRange !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterRange('all'); }}
                className="mt-2 px-4 py-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={selectAll} className={`flex items-center gap-2 text-xs ${subtext} hover:text-cyan-400 transition-colors`}>
                <div className={`w-4 h-4 rounded border ${selectedIds.size === filtered.length ? 'bg-cyan-500 border-cyan-500' : border} flex items-center justify-center transition-colors`}>
                  {selectedIds.size === filtered.length && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                Select All ({filtered.length})
              </button>
              <span className={`text-xs ${subtext}`}>
                {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== totalArchived && ` of ${totalArchived}`}
              </span>
            </div>

            {/* Grouped Items */}
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'}`}>{dateLabel}</h3>
                  <div className={`flex-1 h-px ${isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-200'}`} />
                  <span className={`text-[10px] ${subtext}`}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`relative group rounded-xl border ${border} ${cardBg} transition-all duration-200 ${selectedIds.has(item.id) ? (isDarkMode ? 'ring-1 ring-cyan-500/40 bg-cyan-500/[0.05]' : 'ring-1 ring-cyan-300 bg-cyan-50') : ''}`}
                      >
                        {/* Selection checkbox */}
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className={`absolute top-3 left-3 w-5 h-5 rounded border ${selectedIds.has(item.id) ? 'bg-cyan-500 border-cyan-500' : `${border} ${isDarkMode ? 'bg-white/5' : 'bg-white'}`} flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 ${selectedIds.has(item.id) ? '!opacity-100' : ''} transition-opacity`}
                        >
                          {selectedIds.has(item.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>

                        {/* Code preview thumbnail */}
                        {item.code ? (
                          <div
                            className={`h-28 rounded-t-xl border-b ${border} overflow-hidden cursor-pointer ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-100'}`}
                            onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                          >
                            <div className="p-3 h-full overflow-hidden opacity-60">
                              <pre className={`text-[8px] leading-tight font-mono ${isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted'} whitespace-pre-wrap`}>
                                {item.code.replace(/<[^>]*>/g, '').slice(0, 500)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className={`h-28 rounded-t-xl border-b ${border} flex items-center justify-center ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                            <span className="text-3xl opacity-30">📄</span>
                          </div>
                        )}

                        {/* Card content */}
                        <div className="p-4">
                          <h4 className={`text-sm font-medium mb-1 truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</h4>
                          {item.prompt && (
                            <p className={`text-xs ${subtext} line-clamp-2 mb-2`}>{item.prompt}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] ${subtext}`}>{formatDate(item.archivedAt)}</span>
                            {item.code && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                Has Code
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${border}`}>
                            <button
                              onClick={() => restoreProject(item)}
                              disabled={restoring === item.id}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                            >
                              {restoring === item.id ? (
                                <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              ) : '↩'} Restore
                            </button>
                            {item.code && (
                              <button
                                onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                                className={`px-3 py-1.5 text-xs rounded-lg border ${border} ${isDarkMode ? 'text-canvas-muted hover:text-cyan-400 hover:border-cyan-500/30' : 'text-canvas-muted-deep hover:text-cyan-600 hover:border-cyan-300'} transition-colors`}
                              >
                                👁
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="px-3 py-1.5 text-xs text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-4 p-3 rounded-xl border ${border} ${cardBg} transition-all ${selectedIds.has(item.id) ? (isDarkMode ? 'ring-1 ring-cyan-500/40 bg-cyan-500/[0.05]' : 'ring-1 ring-cyan-300 bg-cyan-50') : ''}`}
                      >
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className={`w-5 h-5 rounded border ${selectedIds.has(item.id) ? 'bg-cyan-500 border-cyan-500' : `${border} ${isDarkMode ? 'bg-white/5' : 'bg-white'}`} flex items-center justify-center shrink-0 transition-colors`}
                        >
                          {selectedIds.has(item.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</h4>
                            {item.code && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                Code
                              </span>
                            )}
                          </div>
                          {item.prompt && <p className={`text-xs ${subtext} truncate mt-0.5`}>{item.prompt}</p>}
                        </div>

                        <span className={`text-xs ${subtext} shrink-0 hidden sm:block`}>{formatDate(item.archivedAt)}</span>

                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => restoreProject(item)} disabled={restoring === item.id}
                            className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                            {restoring === item.id ? '...' : '↩ Restore'}
                          </button>
                          {item.code && (
                            <button onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                              className={`px-2 py-1.5 text-xs rounded-lg border ${border} ${isDarkMode ? 'text-canvas-muted hover:text-cyan-400' : 'text-canvas-muted-deep hover:text-cyan-600'} transition-colors`}>
                              👁
                            </button>
                          )}
                          <button onClick={() => setConfirmDeleteId(item.id)}
                            className="px-2 py-1.5 text-xs text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Code Preview Drawer */}
      {previewProject && (
        <div className={`border-t ${border} shrink-0`} style={{ height: '35%', minHeight: 200 }}>
          <div className={`flex items-center justify-between px-6 py-2 border-b ${border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs">👁</span>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>Preview: {previewProject.name}</span>
            </div>
            <button onClick={() => setPreviewId(null)} className={`${subtext} hover:text-canvas-text transition-colors p-1`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="h-full overflow-auto" style={{ scrollbarWidth: 'thin' }}>
            {previewProject.code ? (
              <div className={`p-4 ${isDarkMode ? 'bg-canvas-card' : 'bg-white'}`}>
                <pre className={`text-xs font-mono leading-relaxed ${isDarkMode ? 'text-canvas-muted' : 'text-gray-600'} whitespace-pre-wrap break-words`}>
                  {previewProject.code}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={`text-sm ${subtext}`}>No code saved for this project</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {(confirmDeleteId || confirmBulkDelete) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setConfirmDeleteId(null); setConfirmBulkDelete(false); }}>
          <div className={`mx-4 p-6 rounded-2xl border ${border} ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} max-w-sm w-full shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Permanent Delete</h3>
              <p className={`text-sm ${subtext} mt-2`}>
                {confirmBulkDelete
                  ? `This will permanently delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.`
                  : 'This will permanently delete this project. This cannot be undone.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDeleteId(null); setConfirmBulkDelete(false); }}
                className={`flex-1 px-4 py-2.5 text-sm rounded-xl border ${border} ${isDarkMode ? 'text-canvas-text hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmBulkDelete ? bulkDelete() : confirmDeleteId && permanentDelete(confirmDeleteId)}
                disabled={deleting !== null}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
