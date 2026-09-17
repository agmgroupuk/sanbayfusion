/**
 * Extension Marketplace Panel - Full-featured extension management UI
 * Theme-aware with proper light/dark/high-contrast support
 */

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useExtensions, ExtensionInfo, MARKETPLACE_EXTENSIONS } from '../services/useExtensions';

type ExtensionCategory = 'all' | 'AI' | 'Formatters' | 'Linters' | 'Languages' | 'Themes' | 'Tools' | 'SCM' | 'API' | 'Visual' | 'Other';

// Format downloads
const formatDownloads = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

// Star rating component
const StarRating: React.FC<{ rating: number; isDark: boolean }> = ({ rating, isDark }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <span key={i} className={`text-[10px] ${i < Math.floor(rating) ? 'text-yellow-400' : isDark ? 'text-gray-600' : 'text-gray-300'}`}>{'\u2605'}</span>
    ))}
    <span className={`text-[10px] ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{rating.toFixed(1)}</span>
  </div>
);

// Main Panel
export const ExtensionMarketplacePanel: React.FC = () => {
  const { theme } = useStore();
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';
  const {
    extensions: hookExtensions,
    notifications,
    installExtension,
    uninstallExtension,
    toggleExtension,
    reloadExtension,
    dismissNotification,
    clearNotifications
  } = useExtensions();

  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'recommendations'>('marketplace');
  const [selectedCategory, setSelectedCategory] = useState<ExtensionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<ExtensionInfo | null>(null);
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'name'>('downloads');
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  // Build lookup sets from the hook state
  const installedIds = new Set(hookExtensions.filter(e => e.installed).map(e => e.id));
  const enabledIds = new Set(hookExtensions.filter(e => e.enabled).map(e => e.id));

  const categories: ExtensionCategory[] = ['all', 'AI', 'Formatters', 'Linters', 'Languages', 'Themes', 'Tools', 'SCM', 'API', 'Visual', 'Other'];

  // Filter and sort
  const filteredExtensions = MARKETPLACE_EXTENSIONS.filter(ext => {
    if (selectedCategory !== 'all' && ext.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ext.name.toLowerCase().includes(q) || ext.description.toLowerCase().includes(q) || ext.author.toLowerCase().includes(q) || ext.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'downloads') return b.downloads - a.downloads;
    if (sortBy === 'rating') return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const displayExtensions = activeTab === 'installed'
    ? filteredExtensions.filter(e => installedIds.has(e.id))
    : activeTab === 'recommendations'
      ? MARKETPLACE_EXTENSIONS.filter(e => ['github-copilot', 'tailwind', 'git-lens', 'docker', 'thunder-client', 'material-icon-theme'].includes(e.id) && !installedIds.has(e.id))
      : filteredExtensions;

  // Install/uninstall/toggle handlers
  const handleInstall = async (id: string) => {
    setInstalling(prev => new Set([...prev, id]));
    await installExtension(id);
    setInstalling(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleUninstall = async (id: string) => {
    await uninstallExtension(id);
  };

  const handleToggle = async (id: string) => {
    await toggleExtension(id);
  };

  // Theme-aware colors
  const bg = isDark ? 'bg-[#1e1e1e]' : 'bg-white';
  const bgCard = isDark ? 'bg-[#252526] hover:bg-[#2a2d2e]' : 'bg-gray-50 hover:bg-gray-100';
  const bgInput = isDark ? 'bg-[#3c3c3c] border-[#3c3c3c] focus:border-[#007acc] text-white placeholder-gray-500' : 'bg-gray-100 border-gray-300 focus:border-blue-500 text-gray-900 placeholder-gray-400';
  const border = isDark ? 'border-[#3c3c3c]' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const bgIcon = isDark ? 'bg-[#1e1e1e]' : 'bg-white border border-gray-200';
  const bgPill = isDark ? 'bg-[#3c3c3c] text-gray-400' : 'bg-gray-200 text-gray-600';
  const bgPillActive = 'bg-[#007acc] text-white';
  const bgTag = isDark ? 'bg-[#252526] text-gray-400' : 'bg-gray-100 text-gray-600';
  const bgSelect = isDark ? 'bg-[#3c3c3c] text-gray-300' : 'bg-gray-100 text-gray-700';
  const accentBtn = isDark ? 'bg-[#007acc] text-white hover:bg-[#0088e0]' : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <div className={`flex flex-col h-full ${bg} ${textPrimary}`}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className={`p-2 border-b ${border} ${isDark ? 'bg-[#252526]' : 'bg-gray-50'} space-y-1`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] ${textMuted}`}>Notifications</span>
            <button onClick={clearNotifications} className={`text-[10px] ${textMuted} hover:${textPrimary}`}>Clear all</button>
          </div>
          {notifications.slice(0, 3).map(notif => (
            <div
              key={notif.id}
              className={`flex items-center gap-2 p-2 rounded text-xs ${
                notif.type === 'error' ? 'bg-red-500/20 text-red-300' :
                notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                notif.type === 'success' ? 'bg-green-500/20 text-green-300' :
                'bg-blue-500/20 text-blue-300'
              }`}
            >
              <span className="flex-1">{notif.extensionId ? `[${notif.extensionId}] ` : ''}{notif.message}</span>
              <button onClick={() => dismissNotification(notif.id)} className="text-white/50 hover:text-white">{'\u00d7'}</button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className={`p-4 border-b ${border}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{'\ud83d\udce6'}</span>
            <h2 className="font-semibold">Extensions</h2>
          </div>
          <span className={`text-xs ${textMuted}`}>{installedIds.size} installed</span>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none ${bgInput}`}
          />
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${border}`}>
        {(['marketplace', 'installed', 'recommendations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? `${textPrimary} border-b-2 border-[#007acc] bg-[#007acc]/10`
                : `${textMuted} hover:${textSecondary}`
            }`}
          >
            {tab === 'marketplace' ? '\ud83c\udfea Marketplace' : tab === 'installed' ? '\u2713 Installed' : '\u2b50 Recommended'}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      {activeTab === 'marketplace' && (
        <div className={`p-2 border-b ${border} overflow-x-auto`}>
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-[10px] rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? bgPillActive : bgPill
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort */}
      {activeTab === 'marketplace' && (
        <div className={`px-4 py-2 flex items-center justify-between text-xs border-b ${border} ${textMuted}`}>
          <span>{displayExtensions.length} extensions</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className={`px-2 py-1 rounded text-[10px] outline-none ${bgSelect}`}
          >
            <option value="downloads">Most Downloads</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name</option>
          </select>
        </div>
      )}

      {/* Extension List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {displayExtensions.length === 0 ? (
          <div className={`text-center py-8 ${textMuted}`}>
            <div className="text-4xl mb-3">{'\ud83d\udce6'}</div>
            <p className="text-sm">
              {activeTab === 'installed' ? 'No extensions installed' : activeTab === 'recommendations' ? 'No recommendations available' : 'No extensions found'}
            </p>
            {activeTab !== 'marketplace' && (
              <p className={`text-xs mt-1 ${textMuted}`}>Browse the Marketplace to discover extensions</p>
            )}
          </div>
        ) : (
          displayExtensions.map(ext => (
            <div
              key={ext.id}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                isDark
                  ? 'bg-[#252526] hover:bg-[#2a2d2e] border-transparent hover:border-[#007acc]/30'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedExtension(ext)}
            >
              <div className="flex gap-3">
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg text-2xl flex-shrink-0 ${bgIcon}`}>
                  {ext.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{ext.name}</h3>
                        {ext.verified && <span className="text-blue-400 text-xs" title="Verified Publisher">{'\u2713'}</span>}
                      </div>
                      <p className={`text-xs ${textSecondary}`}>{ext.author}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {installedIds.has(ext.id) ? (
                        <>
                          <button
                            onClick={() => handleToggle(ext.id)}
                            className={`px-2 py-1 text-[10px] rounded transition-colors ${
                              enabledIds.has(ext.id)
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : isDark ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {enabledIds.has(ext.id) ? 'Enabled' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => reloadExtension(ext.id)}
                            className={`px-2 py-1 text-[10px] rounded transition-colors ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            title="Reload"
                          >
                            {'\u21bb'}
                          </button>
                          <button
                            onClick={() => handleUninstall(ext.id)}
                            className={`px-2 py-1 text-[10px] rounded transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            Uninstall
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleInstall(ext.id)}
                          disabled={installing.has(ext.id)}
                          className={`px-3 py-1 text-[10px] rounded transition-colors disabled:opacity-50 ${accentBtn}`}
                        >
                          {installing.has(ext.id) ? 'Installing...' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1.5 line-clamp-2 ${textMuted}`}>{ext.description}</p>
                  <div className={`flex items-center gap-3 mt-2 text-[10px] ${textMuted}`}>
                    <StarRating rating={ext.rating} isDark={isDark} />
                    <span>{'\u2193'} {formatDownloads(ext.downloads)}</span>
                    <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}>{ext.category}</span>
                    <span>v{ext.version}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedExtension && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedExtension(null)}>
          <div
            className={`rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border ${isDark ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-white border-gray-300'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b ${border}`}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 flex items-center justify-center rounded-xl text-3xl ${isDark ? 'bg-[#252526]' : 'bg-gray-100 border border-gray-200'}`}>
                  {selectedExtension.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{selectedExtension.name}</h2>
                    {selectedExtension.verified && (
                      <span className={`px-2 py-0.5 text-xs rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Verified</span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${textSecondary}`}>{selectedExtension.author} {'\u2022'} v{selectedExtension.version}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <StarRating rating={selectedExtension.rating} isDark={isDark} />
                    <span className={`text-xs ${textMuted}`}>{'\u2193'} {formatDownloads(selectedExtension.downloads)} downloads</span>
                    {selectedExtension.lastUpdated && (
                      <span className={`text-xs ${textMuted}`}>Updated {selectedExtension.lastUpdated}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {installedIds.has(selectedExtension.id) ? (
                    <>
                      <button
                        onClick={() => handleToggle(selectedExtension.id)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          enabledIds.has(selectedExtension.id)
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : isDark ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {enabledIds.has(selectedExtension.id) ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => { handleUninstall(selectedExtension.id); setSelectedExtension(null); }}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        Uninstall
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleInstall(selectedExtension.id)}
                      className={`px-6 py-2 text-sm rounded-lg transition-colors ${accentBtn}`}
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedExtension.description}</p>

              {/* Tags */}
              {selectedExtension.tags.length > 0 && (
                <div className="mt-4">
                  <h4 className={`text-xs font-medium uppercase mb-2 ${textMuted}`}>Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExtension.tags.map(tag => (
                      <span key={tag} className={`px-2 py-1 text-xs rounded ${bgTag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              {selectedExtension.permissions.length > 0 && (
                <div className="mt-4">
                  <h4 className={`text-xs font-medium uppercase mb-2 ${textMuted}`}>Permissions Required</h4>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-[#252526]' : 'bg-gray-50 border border-gray-200'}`}>
                    {selectedExtension.permissions.map(perm => (
                      <div key={perm} className="flex items-center gap-2 py-1">
                        <span className="text-yellow-400 text-xs">{'\u26a0'}</span>
                        <span className={`text-xs ${textSecondary}`}>{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <h4 className={`text-xs font-medium uppercase mb-1 ${textMuted}`}>Category</h4>
                  <span className={`px-3 py-1.5 text-sm rounded inline-block ${isDark ? 'bg-[#252526] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedExtension.category}
                  </span>
                </div>
                {selectedExtension.license && (
                  <div>
                    <h4 className={`text-xs font-medium uppercase mb-1 ${textMuted}`}>License</h4>
                    <span className={`text-sm ${textSecondary}`}>{selectedExtension.license}</span>
                  </div>
                )}
                {selectedExtension.repository && (
                  <div className="col-span-2">
                    <h4 className={`text-xs font-medium uppercase mb-1 ${textMuted}`}>Repository</h4>
                    <span className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} break-all`}>{selectedExtension.repository}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${border} flex justify-end`}>
              <button
                onClick={() => setSelectedExtension(null)}
                className={`px-4 py-2 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionMarketplacePanel;
