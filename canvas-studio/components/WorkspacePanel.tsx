import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface WorkspaceProject {
  id: string;
  name: string;
  code: string;
  prompt: string;
  timestamp: number;
  language?: string;
  provider?: string;
  modelId?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface TemplateItem {
  name: string;
  icon: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
}

interface WorkspacePanelProps {
  isDarkMode?: boolean;
  className?: string;
  prompt: string;
  setPrompt: (v: string) => void;
  isGenerating: boolean;
  activePlan: any;
  currentApp: WorkspaceProject | null;
  history: WorkspaceProject[];
  quickActions: QuickAction[];
  templates: TemplateItem[];
  templateCategories: { id: string; name: string; icon: string }[];
  onStartBuilding: () => void;
  onQuickAction: (actionId: string) => void;
  onSelectTemplate: (prompt: string) => void;
  onViewAllTemplates: () => void;
  onOpenProject: (project: WorkspaceProject) => void;
  onShowPurchaseModal: () => void;
  onNewProject: () => void;
}

type WorkspaceTab = 'overview' | 'projects' | 'templates' | 'quick-actions';

export default function WorkspacePanel({
  isDarkMode = true,
  className = '',
  prompt,
  setPrompt,
  isGenerating,
  activePlan,
  currentApp,
  history,
  quickActions,
  templates,
  templateCategories,
  onStartBuilding,
  onQuickAction,
  onSelectTemplate,
  onViewAllTemplates,
  onOpenProject,
  onShowPurchaseModal,
  onNewProject,
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCat, setTemplateCat] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSort, setProjectSort] = useState<'recent' | 'name' | 'oldest'>('recent');

  // Styling
  const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
  const subtext = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';
  const cardBg = isDarkMode ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-gray-50 hover:bg-gray-100';
  const pillActive = isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-600 border-cyan-200';
  const pillInactive = isDarkMode ? 'bg-white/[0.04] text-canvas-muted-deep border-transparent hover:border-canvas-border hover:text-canvas-text' : 'bg-gray-100 text-canvas-muted-deep border-transparent hover:border-gray-300 hover:text-gray-700';

  // Stats
  const totalProjects = history.length;
  const recentProjects = history.filter(p => Date.now() - p.timestamp < 7 * 24 * 60 * 60 * 1000).length;
  const withCode = history.filter(p => p.code && p.code.length > 0).length;
  const totalTemplates = templates.length;

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCat = templateCat === 'all' || t.category === templateCat;
      const matchSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.description.toLowerCase().includes(templateSearch.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(templateSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [templates, templateCat, templateSearch]);

  // Filtered & sorted projects
  const filteredProjects = useMemo(() => {
    let items = history.filter(p => {
      if (!projectSearch) return true;
      return p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.prompt?.toLowerCase().includes(projectSearch.toLowerCase());
    });
    if (projectSort === 'recent') items.sort((a, b) => b.timestamp - a.timestamp);
    else if (projectSort === 'oldest') items.sort((a, b) => a.timestamp - b.timestamp);
    else if (projectSort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [history, projectSearch, projectSort]);

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const tabs: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'quick-actions', label: 'Quick Actions', icon: '⚡' },
  ];

  // Action prompts map
  const actionPrompts: Record<string, string> = {
    'dark-mode': 'Add a dark mode toggle to this app with smooth transitions',
    'responsive': 'Make this layout fully responsive for mobile, tablet and desktop',
    'animations': 'Add smooth CSS animations and transitions throughout the app',
    'accessibility': 'Improve accessibility with ARIA labels, focus states, and keyboard navigation',
    'loading': 'Add loading states and skeleton screens to improve UX',
    'validation': 'Add form validation with error messages and success states',
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'} ${className}`}>

      {/* Tabs */}
      <div className={`px-6 py-3 border-b ${border} shrink-0 flex items-center gap-1 overflow-x-auto`} style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border whitespace-nowrap transition-all ${activeTab === tab.id ? pillActive : pillInactive}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total Projects', value: totalProjects, icon: '📁', color: 'text-cyan-400' },
                { label: 'This Week', value: recentProjects, icon: '📅', color: 'text-blue-400' },
                { label: 'With Code', value: withCode, icon: '💻', color: 'text-emerald-400' },
                { label: 'Templates', value: totalTemplates, icon: '📋', color: 'text-purple-400' },
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

            {/* Create New — Hero Area */}
            <div className={`rounded-2xl border ${border} ${isDarkMode ? 'bg-gradient-to-br from-cyan-500/[0.05] to-emerald-500/[0.03]' : 'bg-gradient-to-br from-cyan-50 to-emerald-50'} p-6 mb-8`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-100'}`}>🚀</div>
                <div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-1`}>Create New Project</h2>
                  <p className={`text-sm ${subtext}`}>Describe your app concept and let AI build it for you</p>
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your app... e.g., 'Build a task management dashboard with drag-and-drop, dark mode, and analytics charts'"
                className={`w-full p-4 text-sm border ${border} ${isDarkMode ? 'bg-black/30 text-gray-200 placeholder:text-gray-600' : 'bg-white text-gray-800 placeholder:text-canvas-muted'} rounded-xl focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none min-h-[100px] resize-none transition-all mb-4`}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={onStartBuilding}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-cyan-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-canvas-muted-deep flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
                >
                  {isGenerating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Building...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Start Building</>
                  )}
                </button>
                <button
                  onClick={onNewProject}
                  className={`px-4 py-3 text-sm rounded-xl border ${border} ${isDarkMode ? 'text-canvas-muted hover:text-cyan-400 hover:border-cyan-500/30' : 'text-canvas-muted-deep hover:text-cyan-600 hover:border-cyan-300'} transition-colors`}
                >
                  New Blank
                </button>
              </div>
            </div>

            {/* Two Column Layout: Quick Actions + Recent Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Quick Actions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>Quick Actions</h3>
                  <button onClick={() => setActiveTab('quick-actions')} className={`text-[10px] ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} hover:underline`}>View All →</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => onQuickAction(action.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${border} ${cardBg} transition-all group`}
                      title={action.description}
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-canvas-muted group-hover:text-cyan-400' : 'text-canvas-muted-deep group-hover:text-cyan-600'} transition-colors`}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Projects */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>Recent Projects</h3>
                  <button onClick={() => setActiveTab('projects')} className={`text-[10px] ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} hover:underline`}>View All →</button>
                </div>
                {history.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-12 rounded-xl border ${border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                    <span className="text-3xl mb-2">📂</span>
                    <p className={`text-sm ${subtext}`}>No projects yet</p>
                    <p className={`text-xs ${subtext} mt-1`}>Create your first project above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 5).map(project => (
                      <button
                        key={project.id}
                        onClick={() => onOpenProject(project)}
                        className={`w-full text-left p-3 rounded-xl border ${border} ${cardBg} transition-all group flex items-center gap-3`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                          <span className="text-lg">{project.code ? '💻' : '📄'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'} transition-colors`}>{project.name}</h4>
                          <p className={`text-xs ${subtext} truncate`}>{project.prompt || 'No description'}</p>
                        </div>
                        <span className={`text-[10px] ${subtext} shrink-0`}>{formatDate(project.timestamp)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Featured Templates */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'}`}>Featured Templates</h3>
                <button onClick={() => setActiveTab('templates')} className={`text-[10px] ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} hover:underline`}>Browse All {templates.length} →</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {templates.slice(0, 8).map(tpl => (
                  <button
                    key={tpl.name}
                    onClick={() => onSelectTemplate(tpl.prompt)}
                    className={`text-left p-4 rounded-xl border ${border} ${cardBg} transition-all group`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{tpl.icon}</span>
                      <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'} transition-colors truncate`}>{tpl.name}</h4>
                    </div>
                    <p className={`text-xs ${subtext} line-clamp-2`}>{tpl.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/[0.05] text-canvas-muted-deep' : 'bg-gray-100 text-canvas-muted'}`}>{tag}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROJECTS TAB ═══ */}
        {activeTab === 'projects' && (
          <div className="p-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="relative flex-1 w-full sm:max-w-md">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.05] text-canvas-text placeholder-gray-600' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50 transition-colors`}
                />
              </div>
              <select
                value={projectSort}
                onChange={e => setProjectSort(e.target.value as any)}
                className={`px-3 py-2 text-xs rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.05] text-canvas-text' : 'bg-gray-50 text-gray-700'} focus:outline-none cursor-pointer`}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A→Z</option>
              </select>
              <button
                onClick={onNewProject}
                className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg hover:from-cyan-500 hover:to-emerald-500 transition-all ml-auto"
              >
                + New Project
              </button>
            </div>

            {/* Project List */}
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-5xl mb-3">📂</span>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>
                  {projectSearch ? 'No matching projects' : 'No projects yet'}
                </h3>
                <p className={`text-sm ${subtext} mt-1`}>
                  {projectSearch ? 'Try a different search term.' : 'Start building to see your projects here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => onOpenProject(project)}
                    className={`text-left rounded-xl border ${border} ${cardBg} transition-all group overflow-hidden`}
                  >
                    {/* Code preview */}
                    {project.code ? (
                      <div className={`h-24 border-b ${border} overflow-hidden ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-100'}`}>
                        <div className="p-2 h-full overflow-hidden opacity-50">
                          <pre className={`text-[7px] leading-tight font-mono ${isDarkMode ? 'text-gray-600' : 'text-canvas-muted'} whitespace-pre-wrap`}>
                            {project.code.replace(/<[^>]*>/g, '').slice(0, 400)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className={`h-24 border-b ${border} flex items-center justify-center ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                        <span className="text-3xl opacity-20">📄</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h4 className={`text-sm font-medium truncate mb-1 ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'} transition-colors`}>{project.name}</h4>
                      <p className={`text-xs ${subtext} line-clamp-2 mb-2`}>{project.prompt || 'No description'}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${subtext}`}>{formatDate(project.timestamp)}</span>
                        <div className="flex items-center gap-1.5">
                          {project.code && <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>Code</span>}
                          {project.language && <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{project.language}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TEMPLATES TAB ═══ */}
        {activeTab === 'templates' && (
          <div className="p-6">
            {/* Search + Categories */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="relative flex-1 w-full sm:max-w-md">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subtext}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border ${border} ${isDarkMode ? 'bg-white/[0.05] text-canvas-text placeholder-gray-600' : 'bg-gray-50 text-gray-800 placeholder-gray-400'} focus:outline-none focus:border-cyan-500/50 transition-colors`}
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {templateCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setTemplateCat(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${templateCat === cat.id ? pillActive : pillInactive}`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className={`text-xs ${subtext} mb-4`}>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</p>

            {/* Template Grid */}
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-5xl mb-3">📋</span>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>No matching templates</h3>
                <p className={`text-sm ${subtext} mt-1`}>Try adjusting your search or category filter.</p>
                <button onClick={() => { setTemplateSearch(''); setTemplateCat('all'); }} className="mt-3 px-4 py-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.name}
                    onClick={() => onSelectTemplate(tpl.prompt)}
                    className={`text-left p-5 rounded-xl border ${border} ${cardBg} transition-all group`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${isDarkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                        {tpl.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'} transition-colors`}>{tpl.name}</h4>
                        <span className={`text-[10px] ${subtext} capitalize`}>{tpl.category}</span>
                      </div>
                    </div>
                    <p className={`text-xs ${subtext} line-clamp-3 mb-3`}>{tpl.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.tags.slice(0, 4).map(tag => (
                        <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/[0.05] text-canvas-muted-deep' : 'bg-gray-100 text-canvas-muted'}`}>{tag}</span>
                      ))}
                    </div>
                    <div className={`mt-3 pt-3 border-t ${border} flex items-center justify-between`}>
                      <span className={`text-[10px] font-medium ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Use Template →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ QUICK ACTIONS TAB ═══ */}
        {activeTab === 'quick-actions' && (
          <div className="p-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-4xl mb-3 block">⚡</span>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Quick Actions</h2>
                <p className={`text-sm ${subtext}`}>One-click enhancements for your current project. Each action sends a targeted prompt to the AI agent.</p>
              </div>

              {!currentApp?.code ? (
                <div className={`text-center py-12 rounded-xl border ${border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                  <span className="text-3xl mb-3 block">📄</span>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'} mb-1`}>No Active Project</h3>
                  <p className={`text-xs ${subtext}`}>Create or open a project first, then use quick actions to enhance it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => onQuickAction(action.id)}
                      className={`text-left p-6 rounded-xl border ${border} ${cardBg} transition-all group`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isDarkMode ? 'bg-white/[0.05]' : 'bg-gray-100'} group-hover:scale-110 transition-transform`}>
                          {action.icon}
                        </div>
                        <div>
                          <h4 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-200 group-hover:text-cyan-400' : 'text-gray-800 group-hover:text-cyan-600'} transition-colors`}>{action.label}</h4>
                          <p className={`text-xs ${subtext}`}>{action.description}</p>
                        </div>
                      </div>
                      <div className={`mt-4 pt-3 border-t ${border}`}>
                        <span className={`text-[10px] font-medium ${isDarkMode ? 'text-cyan-400/60' : 'text-cyan-600/60'}`}>Click to apply →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Current Project Info */}
              {currentApp && (
                <div className={`mt-8 p-4 rounded-xl border ${border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{currentApp.code ? '💻' : '📄'}</span>
                    <div>
                      <h4 className={`text-sm font-medium ${isDarkMode ? 'text-canvas-text' : 'text-gray-700'}`}>Current Project: {currentApp.name}</h4>
                      <p className={`text-xs ${subtext}`}>Quick actions will modify this project</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
