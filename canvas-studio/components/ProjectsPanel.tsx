import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'deployed';
  language: string;
  updatedAt: string;
  createdAt: string;
  code?: string;
  thumbnail?: string;
  tags?: string[];
  appCount: number;
}

interface Draft {
  id: string;
  name: string;
  prompt: string;
  code: string;
  updatedAt: string;
  createdAt: string;
  isFavorite: boolean;
}

type Tab = 'all' | 'projects' | 'drafts' | 'favorites' | 'archived' | 'deployed';
type SortBy = 'recent' | 'name' | 'oldest';
type ViewStyle = 'grid' | 'list';

interface ProjectsPanelProps {
  currentAppId?: string;
  isDarkMode?: boolean;
  className?: string;
  onSelectProject: (projectId: string) => void;
  onLoadDraft: (draft: { id: string; name: string; code: string; prompt: string }) => void;
  onNewDraft: () => void;
  onNewProject: (name: string) => void;
}

/* ─── Helpers ─── */
const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
};

const formatDate = (ts: string) =>
  new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  deployed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  archived: 'bg-gray-500/20 text-canvas-muted border-gray-500/30',
  draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

/* ─── Component ─── */
export default function ProjectsPanel({
  currentAppId, isDarkMode = true, className, onSelectProject, onLoadDraft, onNewDraft, onNewProject,
}: ProjectsPanelProps) {
  const [tab, setTab] = useState<Tab>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewStyle, setViewStyle] = useState<ViewStyle>('grid');

  // Create project
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  /* ── Theme ── */
  const bg = isDarkMode ? 'bg-canvas-card' : 'bg-white';
  const cardBg = isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50';
  const cardBorder = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const text = isDarkMode ? 'text-canvas-text' : 'text-gray-700';
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const inputBg = isDarkMode ? 'bg-white/[0.06] border-canvas-border text-gray-200 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400';

  /* ── Fetch Projects ── */
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas-projects', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects.map((p: any) => ({
          id: p.id,
          name: p.name || 'Untitled Project',
          description: p.description || '',
          status: p.status || 'active',
          language: p.language || 'html',
          updatedAt: p.updatedAt,
          createdAt: p.createdAt,
          code: p.code || '',
          thumbnail: p.thumbnail || '',
          tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || []),
          appCount: p._count?.apps || p.appCount || 0,
        })));
      }
    } catch { /* silent */ } finally { setLoadingProjects(false); }
  }, []);

  /* ── Fetch Drafts ── */
  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas/apps?limit=100&source=standalone', { credentials: 'include' });
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
    } catch { /* silent */ } finally { setLoadingDrafts(false); }
  }, []);

  useEffect(() => { fetchProjects(); fetchDrafts(); }, [fetchProjects, fetchDrafts]);

  /* ── Actions ── */
  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/canvas-projects', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), description: '', language: 'html' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewProjectName('');
        setShowCreateModal(false);
        fetchProjects();
        if (data.project?.id) onSelectProject(data.project.id);
      }
    } catch { /* silent */ } finally { setCreating(false); }
  };

  const deleteProject = async (id: string, name: string) => {
    setConfirmAction({
      title: 'Delete Project',
      message: `Permanently delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await fetch(`/api/canvas-projects/${id}`, { method: 'DELETE', credentials: 'include' });
          setProjects(prev => prev.filter(p => p.id !== id));
        } catch { /* silent */ }
      },
    });
  };

  const deleteDraft = async (id: string, name: string) => {
    setConfirmAction({
      title: 'Delete Draft',
      message: `Permanently delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await fetch(`/api/canvas/apps/${id}?source=standalone`, { method: 'DELETE', credentials: 'include' });
          setDrafts(prev => prev.filter(d => d.id !== id));
        } catch { /* silent */ }
      },
    });
  };

  const toggleFavorite = async (id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    try {
      await fetch(`/api/canvas/apps/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
        body: JSON.stringify({ isFavorite: !draft.isFavorite }),
      });
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
    } catch { /* silent */ }
  };

  /* ── Filtering & Sorting ── */
  type UnifiedItem = { type: 'project'; data: Project } | { type: 'draft'; data: Draft };

  const getItems = (): UnifiedItem[] => {
    let items: UnifiedItem[] = [];

    const shouldIncludeProjects = tab === 'all' || tab === 'projects' || tab === 'deployed' || tab === 'archived';
    const shouldIncludeDrafts = tab === 'all' || tab === 'drafts' || tab === 'favorites';

    if (shouldIncludeProjects) {
      let filtered = projects;
      if (tab === 'deployed') filtered = projects.filter(p => p.status === 'deployed');
      if (tab === 'archived') filtered = projects.filter(p => p.status === 'archived');
      items = items.concat(filtered.map(p => ({ type: 'project' as const, data: p })));
    }

    if (shouldIncludeDrafts) {
      let filtered = drafts;
      if (tab === 'favorites') filtered = drafts.filter(d => d.isFavorite);
      items = items.concat(filtered.map(d => ({ type: 'draft' as const, data: d })));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => {
        if (item.type === 'project') return item.data.name.toLowerCase().includes(q) || item.data.description.toLowerCase().includes(q);
        return item.data.name.toLowerCase().includes(q) || item.data.prompt.toLowerCase().includes(q);
      });
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'name') return a.data.name.localeCompare(b.data.name);
      if (sortBy === 'oldest') return new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime();
      return new Date(b.data.updatedAt).getTime() - new Date(a.data.updatedAt).getTime();
    });

    return items;
  };

  const items = getItems();
  const loading = loadingProjects || loadingDrafts;

  /* ── Stats ── */
  const totalProjects = projects.length;
  const totalDrafts = drafts.length;
  const deployedCount = projects.filter(p => p.status === 'deployed').length;
  const archivedCount = projects.filter(p => p.status === 'archived').length;
  const favCount = drafts.filter(d => d.isFavorite).length;

  /* ── TABS ── */
  const TABS: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'all', label: 'All', icon: '📁', count: totalProjects + totalDrafts },
    { key: 'projects', label: 'Projects', icon: '🏗️', count: totalProjects },
    { key: 'drafts', label: 'Drafts', icon: '📝', count: totalDrafts },
    { key: 'favorites', label: 'Favorites', icon: '⭐', count: favCount },
    { key: 'deployed', label: 'Deployed', icon: '🚀', count: deployedCount },
    { key: 'archived', label: 'Archived', icon: '📦', count: archivedCount },
  ];

  return (
    <div className={`h-full flex flex-col ${bg} ${text} ${className || ''}`}>
      {/* Stats Bar */}
      <div className={`shrink-0 px-6 pt-5 pb-0`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Projects', value: totalProjects, icon: '🏗️', color: 'teal' },
            { label: 'Drafts', value: totalDrafts, icon: '📝', color: 'amber' },
            { label: 'Deployed', value: deployedCount, icon: '🚀', color: 'cyan' },
            { label: 'Archived', value: archivedCount, icon: '📦', color: 'gray' },
            { label: 'Favorites', value: favCount, icon: '⭐', color: 'yellow' },
          ].map((s, i) => (
            <div key={i} className={`p-3 rounded-xl border ${cardBorder} ${cardBg}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className={`text-lg font-bold ${textStrong}`}>{s.value}</p>
                  <p className={`text-[10px] ${subtext}`}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className={`shrink-0 border-b ${cardBorder} px-6 pb-0`}>
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                  tab === t.key
                    ? `${isDarkMode ? 'bg-white/[0.06] text-cyan-400 border-canvas-border' : 'bg-white text-cyan-600 border-gray-200'}`
                    : `${subtext} border-transparent hover:text-cyan-400`
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${
                  tab === t.key ? 'bg-cyan-500/20 text-cyan-400' : `${isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-200'}`
                }`}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onNewDraft} className="px-3.5 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">
              + New Draft
            </button>
            <button onClick={() => setShowCreateModal(true)} className="px-3.5 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all">
              + New Project
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3 pb-3">
          <div className="relative flex-1 max-w-md">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects and drafts..."
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border ${cardBorder} ${inputBg} focus:outline-none focus:border-cyan-500/50`}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className={`text-xs px-3 py-2 rounded-lg border ${cardBorder} ${inputBg} cursor-pointer`}
            title="Sort by"
          >
            <option value="recent">🕐 Recent</option>
            <option value="name">🔤 Name</option>
            <option value="oldest">📅 Oldest</option>
          </select>
          <div className={`flex border ${cardBorder} rounded-lg overflow-hidden`}>
            <button onClick={() => setViewStyle('grid')} className={`p-2 text-xs ${viewStyle === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : `${subtext}`} transition-all`} title="Grid view">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button onClick={() => setViewStyle('list')} className={`p-2 text-xs ${viewStyle === 'list' ? 'bg-cyan-500/20 text-cyan-400' : `${subtext}`} transition-all`} title="List view">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className={`text-xs ${subtext}`}>Loading your workspace...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className={`flex items-center justify-center py-20 ${subtext}`}>
            <div className="text-center">
              <div className="text-5xl mb-4">{searchQuery ? '🔍' : tab === 'favorites' ? '⭐' : tab === 'deployed' ? '🚀' : tab === 'archived' ? '📦' : '📁'}</div>
              <p className={`text-sm ${textStrong} mb-1`}>
                {searchQuery ? 'No results found' : `No ${tab === 'all' ? 'items' : tab} yet`}
              </p>
              <p className={`text-xs ${subtext} mb-4`}>
                {searchQuery ? 'Try a different search term' : 'Create a new project or draft to get started'}
              </p>
              {!searchQuery && (
                <div className="flex gap-2 justify-center">
                  <button onClick={onNewDraft} className="px-4 py-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">
                    + New Draft
                  </button>
                  <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all">
                    + New Project
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : viewStyle === 'grid' ? (
          /* ── Grid View ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {items.map(item => (
              <ItemCard
                key={`${item.type}-${item.data.id}`}
                item={item}
                currentAppId={currentAppId}
                isDarkMode={isDarkMode}
                onSelect={() => {
                  if (item.type === 'project') onSelectProject(item.data.id);
                  else onLoadDraft(item.data as Draft);
                }}
                onDelete={() => {
                  if (item.type === 'project') deleteProject(item.data.id, item.data.name);
                  else deleteDraft(item.data.id, item.data.name);
                }}
                onFavorite={item.type === 'draft' ? () => toggleFavorite(item.data.id) : undefined}
                isFavorite={item.type === 'draft' ? (item.data as Draft).isFavorite : false}
              />
            ))}
          </div>
        ) : (
          /* ── List View ── */
          <div className="space-y-2">
            {items.map(item => (
              <ItemRow
                key={`${item.type}-${item.data.id}`}
                item={item}
                currentAppId={currentAppId}
                isDarkMode={isDarkMode}
                onSelect={() => {
                  if (item.type === 'project') onSelectProject(item.data.id);
                  else onLoadDraft(item.data as Draft);
                }}
                onDelete={() => {
                  if (item.type === 'project') deleteProject(item.data.id, item.data.name);
                  else deleteDraft(item.data.id, item.data.name);
                }}
                onFavorite={item.type === 'draft' ? () => toggleFavorite(item.data.id) : undefined}
                isFavorite={item.type === 'draft' ? (item.data as Draft).isFavorite : false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`shrink-0 px-6 py-2.5 border-t ${cardBorder} flex items-center justify-between`}>
        <p className={`text-[10px] ${subtext}`}>
          {items.length} item{items.length !== 1 ? 's' : ''} · {totalProjects} project{totalProjects !== 1 ? 's' : ''} · {totalDrafts} draft{totalDrafts !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => { fetchProjects(); fetchDrafts(); setLoadingProjects(true); setLoadingDrafts(true); }} className={`text-[10px] ${subtext} hover:text-cyan-400 transition-colors`}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`max-w-md w-full mx-4 p-6 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} shadow-2xl`}>
            <h3 className={`text-sm font-semibold ${textStrong} mb-1`}>Create New Project</h3>
            <p className={`text-xs ${subtext} mb-4`}>Start a new project from scratch</p>
            <div className="space-y-3">
              <div>
                <label className={`text-[10px] uppercase tracking-wider ${subtext} mb-1 block`}>Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className={`w-full px-3 py-2.5 text-xs rounded-lg border ${cardBorder} ${inputBg} focus:outline-none focus:border-cyan-500/50`}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowCreateModal(false); setNewProjectName(''); }} className={`px-4 py-2 text-xs rounded-lg border ${cardBorder} ${text} hover:text-cyan-400 transition-colors`}>Cancel</button>
              <button onClick={createProject} disabled={creating || !newProjectName.trim()} className="px-4 py-2 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`max-w-sm w-full mx-4 p-5 rounded-xl border ${cardBorder} ${isDarkMode ? 'bg-canvas-card' : 'bg-white'} shadow-2xl`}>
            <h3 className={`text-sm font-semibold ${textStrong} mb-2`}>{confirmAction.title}</h3>
            <p className={`text-xs ${subtext} mb-4 leading-relaxed`}>{confirmAction.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className={`px-4 py-1.5 text-xs rounded-lg border ${cardBorder} ${text} hover:text-cyan-400 transition-colors`}>Cancel</button>
              <button onClick={confirmAction.onConfirm} className="px-4 py-1.5 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ Grid Card ═══════ */
type UnifiedItem = { type: 'project'; data: Project } | { type: 'draft'; data: Draft };

function ItemCard({ item, currentAppId, isDarkMode, onSelect, onDelete, onFavorite, isFavorite }: {
  item: UnifiedItem; currentAppId?: string; isDarkMode?: boolean;
  onSelect: () => void; onDelete: () => void; onFavorite?: () => void; isFavorite: boolean;
}) {
  const cardBg = isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50';
  const cardBorder = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const isActive = item.data.id === currentAppId;
  const isProject = item.type === 'project';
  const data = item.data;

  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-xl border ${cardBorder} ${cardBg} cursor-pointer transition-all hover:border-cyan-500/30 hover:shadow-lg ${isActive ? 'ring-2 ring-cyan-500/50' : ''}`}
    >
      {/* Thumbnail / Preview */}
      <div className={`w-full aspect-[16/10] rounded-lg mb-3 overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
        {isProject && (data as Project).thumbnail ? (
          <img src={(data as Project).thumbnail} alt="" className="w-full h-full object-cover" />
        ) : isProject && (data as Project).code ? (
          <div className={`text-4xl ${subtext}`}>🏗️</div>
        ) : !isProject && (data as Draft).code ? (
          <div className={`text-4xl ${subtext}`}>📝</div>
        ) : (
          <div className={`text-4xl ${subtext}`}>{isProject ? '📂' : '📄'}</div>
        )}
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 left-2">
        <span className={`px-2 py-0.5 text-[9px] rounded-full border ${isProject ? STATUS_COLORS[(data as Project).status] || STATUS_COLORS.active : STATUS_COLORS.draft}`}>
          {isProject ? (data as Project).status : 'draft'}
        </span>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onFavorite && (
          <button onClick={e => { e.stopPropagation(); onFavorite(); }} className={`p-1 rounded-lg ${isDarkMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-white/80 hover:bg-white'} transition-all`} title={isFavorite ? 'Unfavorite' : 'Favorite'}>
            <span className="text-xs">{isFavorite ? '⭐' : '☆'}</span>
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className={`p-1 rounded-lg ${isDarkMode ? 'bg-gray-800/80 hover:bg-primary-500/20' : 'bg-white/80 hover:bg-red-50'} text-canvas-muted-deep hover:text-primary-400 transition-all`} title="Delete">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          {isFavorite && <span className="text-xs">⭐</span>}
          <h3 className={`text-xs font-semibold ${textStrong} truncate`}>{data.name}</h3>
        </div>
        <p className={`text-[10px] ${subtext} line-clamp-2 mb-2`}>
          {isProject ? (data as Project).description || 'No description' : (data as Draft).prompt || 'No prompt'}
        </p>
        <div className={`flex items-center justify-between text-[10px] ${subtext}`}>
          <span>{timeAgo(data.updatedAt)}</span>
          {isProject && <span>📄 {(data as Project).appCount} apps</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══════ List Row ═══════ */
function ItemRow({ item, currentAppId, isDarkMode, onSelect, onDelete, onFavorite, isFavorite }: {
  item: UnifiedItem; currentAppId?: string; isDarkMode?: boolean;
  onSelect: () => void; onDelete: () => void; onFavorite?: () => void; isFavorite: boolean;
}) {
  const cardBg = isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50';
  const cardBorder = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const textStrong = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const isActive = item.data.id === currentAppId;
  const isProject = item.type === 'project';
  const data = item.data;

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-4 p-3.5 rounded-xl border ${cardBorder} ${cardBg} cursor-pointer transition-all hover:border-cyan-500/20 ${isActive ? 'ring-2 ring-cyan-500/50' : ''}`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
        {isProject ? '🏗️' : '📝'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isFavorite && <span className="text-xs">⭐</span>}
          <h3 className={`text-xs font-semibold ${textStrong} truncate`}>{data.name}</h3>
          <span className={`px-1.5 py-0.5 text-[9px] rounded-full border shrink-0 ${isProject ? STATUS_COLORS[(data as Project).status] || STATUS_COLORS.active : STATUS_COLORS.draft}`}>
            {isProject ? (data as Project).status : 'draft'}
          </span>
        </div>
        <p className={`text-[10px] ${subtext} truncate mt-0.5`}>
          {isProject ? (data as Project).description || 'No description' : (data as Draft).prompt || 'No prompt'}
        </p>
      </div>

      {/* Meta */}
      <div className={`text-right shrink-0 text-[10px] ${subtext}`}>
        <p>{formatDate(data.updatedAt)}</p>
        {isProject && <p className="mt-0.5">📄 {(data as Project).appCount} apps</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onFavorite && (
          <button onClick={e => { e.stopPropagation(); onFavorite(); }} className="p-1.5 rounded-lg hover:bg-cyan-500/10 transition-all" title={isFavorite ? 'Unfavorite' : 'Favorite'}>
            <span className="text-xs">{isFavorite ? '⭐' : '☆'}</span>
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-canvas-muted-deep hover:text-primary-400 hover:bg-primary-500/10 transition-all" title="Delete">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
}
