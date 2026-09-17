import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithCredentials } from '../fetchUtil';
import { EDITOR_API_BASE } from '../services/apiConfig';

// ============================================================================
// Types
// ============================================================================

interface GitIntegrationAdvancedProps {
  className?: string;
}

type GitTab = 'changes' | 'commits' | 'branches' | 'stash' | 'remotes';

interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  staged: boolean;
  oldPath?: string;
}

interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  parent: string[];
}

interface GitBranch {
  name: string;
  current: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

interface GitStash {
  ref: string;
  message: string;
  timestamp: number;
}

interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusIcon = (status: GitFile['status']): { icon: string; color: string } => {
  switch (status) {
    case 'modified': return { icon: 'M', color: '#e2c08d' };
    case 'added': return { icon: 'A', color: '#89d185' };
    case 'deleted': return { icon: 'D', color: '#f14c4c' };
    case 'renamed': return { icon: 'R', color: '#75beff' };
    case 'untracked': return { icon: 'U', color: '#89d185' };
    case 'conflicted': return { icon: 'C', color: '#cc6633' };
    default: return { icon: '?', color: '#888' };
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} min ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const shortenOid = (oid: string): string => oid.substring(0, 7);

// ============================================================================
// Main Component
// ============================================================================

export const GitIntegrationAdvanced: React.FC<GitIntegrationAdvancedProps> = ({
  className = '',
}) => {
  const { theme, files, currentProject } = useStore();

  // State
  const [activeTab, setActiveTab] = useState<GitTab>('changes');
  const [changedFiles, setChangedFiles] = useState<GitFile[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [showPullModal, setShowPullModal] = useState(false);
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [diffView, setDiffView] = useState<{ path: string; content: string } | null>(null);
  
  // Form state
  const [pushRemote, setPushRemote] = useState('origin');
  const [newBranchName, setNewBranchName] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');

  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // ============================================================================
  // Backend git API helpers — all operations hit /api/project/:id/git*
  // ============================================================================

  const projectId = currentProject?.id || null;

  const apiBase = projectId ? `${EDITOR_API_BASE}/project/${encodeURIComponent(projectId)}/git` : null;

  const mapStatus = useCallback((rawFiles: any[]): GitFile[] => {
    if (!Array.isArray(rawFiles)) return [];
    return rawFiles.map((f: any) => {
      const path = f.path || f.filepath || f.name || '';
      const head = f.head;        // 0=absent, 1=present
      const work = f.workdir;     // 0=absent, 1=identical, 2=modified
      const stage = f.stage;      // 0=absent, 1=identical, 2=modified, 3=conflict
      let status: GitFile['status'] = 'modified';
      if (head === 0 && work === 2) status = 'untracked';
      else if (head === 0 && stage > 0) status = 'added';
      else if (head === 1 && work === 0) status = 'deleted';
      else if (stage === 3) status = 'conflicted';
      else if (typeof f.status === 'string') status = f.status as GitFile['status'];
      const staged = stage > 0 && stage !== 1;
      return { path, status, staged };
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!apiBase) {
      setChangedFiles([]); setCommits([]); setBranches([]); setRemotes([]); setStashes([]);
      setError(currentProject ? 'No sandbox active for this project. Start the sandbox to enable git.' : 'Open a project to use git.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [statusRes, branchesRes, logRes] = await Promise.all([
        fetchWithCredentials(`${apiBase}`),
        fetchWithCredentials(`${apiBase}/branches`),
        fetchWithCredentials(`${apiBase}/log?limit=100`),
      ]);

      if (statusRes.status === 409) {
        setError('No sandbox active for this project. Start the sandbox to enable git.');
        setChangedFiles([]); setCommits([]); setBranches([]); setRemotes([]); setStashes([]);
        return;
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        const git = data.git || {};
        setChangedFiles(mapStatus(git.files || git.status || []));
        if (git.remotes) setRemotes(git.remotes);
        if (git.branch) setCurrentBranch(git.branch);
      }
      if (branchesRes.ok) {
        const { branches: rawBranches } = await branchesRes.json();
        const list: GitBranch[] = (rawBranches || []).map((b: any) =>
          typeof b === 'string'
            ? { name: b, current: b === (currentBranch || 'main') }
            : { name: b.name, current: !!b.current, upstream: b.upstream, ahead: b.ahead, behind: b.behind }
        );
        setBranches(list);
        const cur = list.find((b) => b.current);
        if (cur) setCurrentBranch(cur.name);
      }
      if (logRes.ok) {
        const { commits: rawCommits } = await logRes.json();
        const list: GitCommit[] = (rawCommits || []).map((c: any) => ({
          oid: c.oid || c.sha || c.commit?.oid || '',
          message: c.message || c.commit?.message || '',
          author: {
            name: c.author?.name || c.commit?.author?.name || 'Unknown',
            email: c.author?.email || c.commit?.author?.email || '',
            timestamp: c.author?.timestamp || c.commit?.author?.timestamp || Math.floor(Date.now() / 1000),
          },
          parent: c.parent || c.commit?.parent || [],
        }));
        setCommits(list);
      }
      // Stashes: not provided by isomorphic-git out of the box; surface empty
      setStashes([]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load git data');
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, mapStatus, currentProject, currentBranch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============================================================================
  // Git Operations
  // ============================================================================

  const stageFile = useCallback(async (path: string) => {
    if (!apiBase) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/stage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [path] }),
      });
      if (!res.ok) throw new Error(`Stage failed (${res.status})`);
      setSelectedFiles(prev => { const n = new Set(prev); n.delete(path); return n; });
      await refresh();
    } catch (err: any) { setError(err?.message || 'Stage failed'); }
  }, [apiBase, refresh]);

  const unstageFile = useCallback(async (path: string) => {
    if (!apiBase) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/unstage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [path] }),
      });
      if (!res.ok) throw new Error(`Unstage failed (${res.status})`);
      await refresh();
    } catch (err: any) { setError(err?.message || 'Unstage failed'); }
  }, [apiBase, refresh]);

  const stageAll = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/stage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: ['.'] }),
      });
      if (!res.ok) throw new Error(`Stage all failed (${res.status})`);
      setSelectedFiles(new Set());
      await refresh();
    } catch (err: any) { setError(err?.message || 'Stage all failed'); }
  }, [apiBase, refresh]);

  const unstageAll = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/unstage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: ['.'] }),
      });
      if (!res.ok) throw new Error(`Unstage all failed (${res.status})`);
      await refresh();
    } catch (err: any) { setError(err?.message || 'Unstage all failed'); }
  }, [apiBase, refresh]);

  const discardChanges = useCallback(async (path: string) => {
    // Discard requires a checkout-file or restore op; backend currently exposes
    // unstage + working-tree restore via re-checkout of the current branch.
    if (!apiBase) return;
    if (!confirm(`Discard changes to ${path}?`)) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: currentBranch, files: [path], force: true }),
      });
      if (!res.ok) throw new Error(`Discard failed (${res.status})`);
      await refresh();
    } catch (err: any) { setError(err?.message || 'Discard failed'); }
  }, [apiBase, currentBranch, refresh]);

  const commit = useCallback(async () => {
    if (!apiBase) return;
    if (!commitMessage.trim()) { setError('Please enter a commit message'); return; }
    const stagedFiles = changedFiles.filter(f => f.staged);
    if (stagedFiles.length === 0) { setError('No files staged for commit'); return; }

    setIsLoading(true);
    try {
      const res = await fetchWithCredentials(`${apiBase}/commit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage, files: stagedFiles.map(f => f.path) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Commit failed (${res.status})`);
      }
      setCommitMessage('');
      setError(null);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Commit failed');
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, commitMessage, changedFiles, refresh]);

  const checkoutBranch = useCallback(async (branchName: string) => {
    if (!apiBase) return;
    setIsLoading(true);
    try {
      const res = await fetchWithCredentials(`${apiBase}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Checkout failed (${res.status})`);
      }
      setCurrentBranch(branchName);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, refresh]);

  const createBranch = useCallback(async () => {
    if (!apiBase) return;
    if (!newBranchName.trim()) { setError('Please enter a branch name'); return; }
    const sanitizedName = newBranchName.replace(/\s+/g, '-').toLowerCase();
    try {
      const res = await fetchWithCredentials(`${apiBase}/branches`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sanitizedName, checkout: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Create branch failed (${res.status})`);
      }
      setNewBranchName('');
      setShowNewBranchModal(false);
      setCurrentBranch(sanitizedName);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Create branch failed');
    }
  }, [apiBase, newBranchName, refresh]);

  const deleteBranch = useCallback(async (branchName: string) => {
    if (!apiBase) return;
    if (branchName === currentBranch) { setError('Cannot delete current branch'); return; }
    if (!confirm(`Delete branch "${branchName}"?`)) return;
    try {
      const res = await fetchWithCredentials(`${apiBase}/branches/${encodeURIComponent(branchName)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete branch failed (${res.status})`);
      }
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Delete branch failed');
    }
  }, [apiBase, currentBranch, refresh]);

  const applyStash = useCallback(async (_stashRef: string) => {
    setError('Stash apply is not yet supported by the backend git provider.');
  }, []);

  const dropStash = useCallback(async (_stashRef: string) => {
    setError('Stash drop is not yet supported by the backend git provider.');
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const stagedFiles = useMemo(() => changedFiles.filter(f => f.staged), [changedFiles]);
  const unstagedFiles = useMemo(() => changedFiles.filter(f => !f.staged), [changedFiles]);
  const activeBranch = useMemo(() => branches.find(b => b.current), [branches]);

  // ============================================================================
  // Theme
  // ============================================================================

  const bgColor = isDark ? 'bg-vscode-sidebar' : 'bg-white';
  const borderColor = isDark ? 'border-vscode-border' : 'border-gray-200';
  const textColor = isDark ? 'text-vscode-text' : 'text-gray-900';
  const textMuted = isDark ? 'text-vscode-textMuted' : 'text-gray-500';
  const inputBg = isDark ? 'bg-vscode-input' : 'bg-white';
  const inputBorder = isDark ? 'border-vscode-inputBorder' : 'border-gray-300';
  const hoverBg = isDark ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100';
  const selectedBg = isDark ? 'bg-vscode-listActive' : 'bg-blue-100';
  const headerBg = isDark ? 'bg-vscode-bg' : 'bg-gray-50';

  // ============================================================================
  // Tab Content Renderers
  // ============================================================================

  const renderChangesTab = () => (
    <div className="flex flex-col h-full">
      {/* Commit Message Input */}
      <div className={`p-3 border-b ${borderColor}`}>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          rows={3}
          className={`w-full px-2 py-1.5 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} resize-none focus:outline-none focus:border-vscode-accent`}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={commit}
            disabled={stagedFiles.length === 0 || !commitMessage.trim()}
            className={`flex-1 py-1.5 text-xs rounded ${
              stagedFiles.length > 0 && commitMessage.trim()
                ? (isDark ? 'bg-vscode-accent hover:bg-vscode-accent/80' : 'bg-blue-500 hover:bg-blue-600') + ' text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Commit ({stagedFiles.length})
          </button>
          <button
            onClick={() => setShowPushModal(true)}
            className={`px-3 py-1.5 text-xs rounded ${isDark ? 'bg-vscode-hover hover:bg-vscode-border' : 'bg-gray-200 hover:bg-gray-300'} ${textColor}`}
            title="Push"
          >
            ⬆️
          </button>
          <button
            onClick={() => setShowPullModal(true)}
            className={`px-3 py-1.5 text-xs rounded ${isDark ? 'bg-vscode-hover hover:bg-vscode-border' : 'bg-gray-200 hover:bg-gray-300'} ${textColor}`}
            title="Pull"
          >
            ⬇️
          </button>
        </div>
      </div>

      {/* File Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="mb-2">
            <div 
              className={`flex items-center justify-between px-3 py-1.5 ${headerBg} cursor-pointer`}
              onClick={unstageAll}
            >
              <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>
                Staged Changes ({stagedFiles.length})
              </span>
              <button className={`text-[10px] ${textMuted} hover:underline`}>Unstage All</button>
            </div>
            {stagedFiles.map((file) => (
              <FileItem
                key={file.path}
                file={file}
                isDark={isDark}
                textColor={textColor}
                textMuted={textMuted}
                hoverBg={hoverBg}
                selectedBg={selectedBg}
                isSelected={selectedFiles.has(file.path)}
                onSelect={(path) => setSelectedFiles(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                })}
                onStage={stageFile}
                onUnstage={unstageFile}
                onDiscard={discardChanges}
                onViewDiff={(path) => setDiffView({ path, content: 'Diff content here...' })}
              />
            ))}
          </div>
        )}

        {/* Unstaged Changes */}
        {unstagedFiles.length > 0 && (
          <div>
            <div 
              className={`flex items-center justify-between px-3 py-1.5 ${headerBg} cursor-pointer`}
              onClick={stageAll}
            >
              <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>
                Changes ({unstagedFiles.length})
              </span>
              <button className={`text-[10px] ${textMuted} hover:underline`}>Stage All</button>
            </div>
            {unstagedFiles.map((file) => (
              <FileItem
                key={file.path}
                file={file}
                isDark={isDark}
                textColor={textColor}
                textMuted={textMuted}
                hoverBg={hoverBg}
                selectedBg={selectedBg}
                isSelected={selectedFiles.has(file.path)}
                onSelect={(path) => setSelectedFiles(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                })}
                onStage={stageFile}
                onUnstage={unstageFile}
                onDiscard={discardChanges}
                onViewDiff={(path) => setDiffView({ path, content: 'Diff content here...' })}
              />
            ))}
          </div>
        )}

        {/* No Changes */}
        {changedFiles.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-12 ${textMuted}`}>
            <span className="text-4xl mb-3">✓</span>
            <span className="text-xs">No changes</span>
            <span className="text-[10px] mt-1">Working tree clean</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommitsTab = () => (
    <div className="flex-1 overflow-y-auto">
      {commits.map((commit, index) => (
        <div key={commit.oid} className={`border-b ${borderColor} last:border-b-0`}>
          <div 
            className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${hoverBg}`}
            onClick={() => setExpandedCommit(expandedCommit === commit.oid ? null : commit.oid)}
          >
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
              {index < commits.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-400 my-1" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${textColor} truncate`}>
                {commit.message.split('\n')[0]}
              </div>
              <div className={`flex items-center gap-2 mt-1 text-[10px] ${textMuted}`}>
                <span className="font-mono">{shortenOid(commit.oid)}</span>
                <span>•</span>
                <span>{commit.author.name}</span>
                <span>•</span>
                <span>{formatTimestamp(commit.author.timestamp)}</span>
              </div>
            </div>
          </div>
          
          {/* Expanded View */}
          <AnimatePresence>
            {expandedCommit === commit.oid && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`px-3 pb-3 ${headerBg} overflow-hidden`}
              >
                <div className={`text-xs ${textMuted} whitespace-pre-wrap mt-2`}>
                  {commit.message.split('\n').slice(1).join('\n') || 'No additional message'}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button className={`px-2 py-1 text-[10px] rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'} ${textMuted}`}>
                    Browse Files
                  </button>
                  <button className={`px-2 py-1 text-[10px] rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'} ${textMuted}`}>
                    Copy SHA
                  </button>
                  <button className={`px-2 py-1 text-[10px] rounded ${isDark ? 'bg-vscode-input' : 'bg-gray-200'} ${textMuted}`}>
                    Checkout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );

  const renderBranchesTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2">
        <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Branches</span>
        <button
          onClick={() => setShowNewBranchModal(true)}
          className={`p-1 rounded ${textMuted} ${hoverBg}`}
          title="New Branch"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      {branches.map((branch) => (
        <div
          key={branch.name}
          className={`flex items-center justify-between px-3 py-2 cursor-pointer group ${
            branch.current ? selectedBg : hoverBg
          }`}
          onClick={() => !branch.current && checkoutBranch(branch.name)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={branch.current ? 'text-green-500' : textMuted}>
              {branch.current ? '●' : '○'}
            </span>
            <span className={`text-xs ${textColor} truncate`}>{branch.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {branch.upstream && (
              <div className={`flex items-center gap-1 text-[10px] ${textMuted}`}>
                {branch.ahead! > 0 && <span className="text-green-500">↑{branch.ahead}</span>}
                {branch.behind! > 0 && <span className="text-yellow-500">↓{branch.behind}</span>}
              </div>
            )}
            {!branch.current && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBranch(branch.name);
                }}
                className={`p-0.5 rounded opacity-0 group-hover:opacity-100 ${textMuted} ${hoverBg}`}
                title="Delete Branch"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStashTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2">
        <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Stashes</span>
        <button
          onClick={() => {
            if (changedFiles.length > 0) {
              setStashes(prev => [{
                ref: `stash@{${prev.length}}`,
                message: 'WIP',
                timestamp: Date.now() / 1000,
              }, ...prev]);
              setChangedFiles([]);
            }
          }}
          disabled={changedFiles.length === 0}
          className={`p-1 rounded ${changedFiles.length > 0 ? textMuted + ' ' + hoverBg : 'text-gray-400 cursor-not-allowed'}`}
          title="Stash Changes"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>
      </div>
      
      {stashes.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-12 ${textMuted}`}>
          <span className="text-3xl mb-2">📦</span>
          <span className="text-xs">No stashes</span>
        </div>
      ) : (
        stashes.map((stash) => (
          <div
            key={stash.ref}
            className={`flex items-center justify-between px-3 py-2 ${hoverBg} group`}
          >
            <div className="min-w-0">
              <div className={`text-xs ${textColor} truncate`}>{stash.message}</div>
              <div className={`text-[10px] ${textMuted}`}>
                {stash.ref} • {formatTimestamp(stash.timestamp)}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => applyStash(stash.ref)}
                className={`px-2 py-0.5 text-[10px] rounded ${isDark ? 'bg-vscode-accent' : 'bg-blue-500'} text-white`}
              >
                Apply
              </button>
              <button
                onClick={() => dropStash(stash.ref)}
                className={`px-2 py-0.5 text-[10px] rounded ${isDark ? 'bg-red-600' : 'bg-red-500'} text-white`}
              >
                Drop
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderRemotesTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2">
        <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Remotes</span>
        <button
          className={`p-1 rounded ${textMuted} ${hoverBg}`}
          title="Add Remote"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      {remotes.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-12 ${textMuted}`}>
          <span className="text-3xl mb-2">🌐</span>
          <span className="text-xs">No remotes configured</span>
        </div>
      ) : (
        <div>
          {Array.from(new Set(remotes.map(r => r.name))).map((name) => {
            const remote = remotes.find(r => r.name === name);
            return (
              <div key={name} className={`px-3 py-2 ${hoverBg}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌐</span>
                  <span className={`text-xs font-medium ${textColor}`}>{name}</span>
                </div>
                <div className={`text-[10px] ${textMuted} truncate mt-1 ml-6`}>
                  {remote?.url}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-full ${bgColor} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg"></span>
          <span className={`text-xs font-semibold ${textColor}`}>Source Control</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCloneModal(true)}
            className={`p-1 rounded ${textMuted} ${hoverBg}`}
            title="Clone Repository"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Branch Indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderColor} ${headerBg}`}>
        <span className="text-sm">🌿</span>
        <span className={`text-xs ${textColor}`}>{currentBranch}</span>
        {activeBranch?.upstream && (
          <span className={`text-[10px] ${textMuted}`}>
            ↔ {activeBranch.upstream}
          </span>
        )}
        {activeBranch?.ahead && activeBranch.ahead > 0 && (
          <span className="text-[10px] text-green-500">↑{activeBranch.ahead}</span>
        )}
        {activeBranch?.behind && activeBranch.behind > 0 && (
          <span className="text-[10px] text-yellow-500">↓{activeBranch.behind}</span>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderColor}`}>
        {(['changes', 'commits', 'branches', 'stash', 'remotes'] as GitTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? `${isDark ? 'bg-vscode-bg text-white' : 'bg-white text-gray-900'} border-b-2 border-vscode-accent`
                : `${textMuted} ${hoverBg}`
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-3 py-2 text-xs text-red-500 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}
          >
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className={`flex items-center justify-center py-4 ${textMuted}`}>
          <div className="animate-spin mr-2">⏳</div>
          <span className="text-xs">Loading...</span>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'changes' && renderChangesTab()}
        {activeTab === 'commits' && renderCommitsTab()}
        {activeTab === 'branches' && renderBranchesTab()}
        {activeTab === 'stash' && renderStashTab()}
        {activeTab === 'remotes' && renderRemotesTab()}
      </div>

      {/* New Branch Modal */}
      <AnimatePresence>
        {showNewBranchModal && (
          <Modal
            title="Create Branch"
            isDark={isDark}
            onClose={() => setShowNewBranchModal(false)}
          >
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name..."
              className={`w-full px-3 py-2 text-sm rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none focus:border-vscode-accent`}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNewBranchModal(false)}
                className={`px-4 py-2 text-sm rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'} ${textColor}`}
              >
                Cancel
              </button>
              <button
                onClick={createBranch}
                className={`px-4 py-2 text-sm rounded ${isDark ? 'bg-vscode-accent' : 'bg-blue-500'} text-white`}
              >
                Create
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Push Modal */}
      <AnimatePresence>
        {showPushModal && (
          <Modal
            title="Push to Remote"
            isDark={isDark}
            onClose={() => setShowPushModal(false)}
          >
            <div className="space-y-3">
              <div>
                <label className={`text-xs ${textMuted}`}>Remote</label>
                <select
                  value={pushRemote}
                  onChange={(e) => setPushRemote(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none`}
                >
                  {Array.from(new Set(remotes.map(r => r.name))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs ${textMuted}`}>GitHub Token (optional)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className={`w-full px-3 py-2 text-sm rounded border ${inputBg} ${inputBorder} ${textColor} focus:outline-none`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPushModal(false)}
                className={`px-4 py-2 text-sm rounded ${isDark ? 'bg-vscode-hover' : 'bg-gray-200'} ${textColor}`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!apiBase) { setError('No project sandbox'); return; }
                  setIsLoading(true);
                  try {
                    const res = await fetchWithCredentials(`${apiBase}/push`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ remote: pushRemote, branch: currentBranch, token: githubToken || undefined }),
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      throw new Error(body.error || `Push failed (${res.status})`);
                    }
                    setShowPushModal(false);
                    setGithubToken('');
                    await refresh();
                  } catch (err: any) {
                    setError(err?.message || 'Push failed');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className={`px-4 py-2 text-sm rounded ${isDark ? 'bg-vscode-accent' : 'bg-blue-500'} text-white`}
              >
                Push
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Sub Components
// ============================================================================

const FileItem: React.FC<{
  file: GitFile;
  isDark: boolean;
  textColor: string;
  textMuted: string;
  hoverBg: string;
  selectedBg: string;
  isSelected: boolean;
  onSelect: (path: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onDiscard: (path: string) => void;
  onViewDiff: (path: string) => void;
}> = ({
  file,
  isDark,
  textColor,
  textMuted,
  hoverBg,
  selectedBg,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  onViewDiff,
}) => {
  const statusInfo = getStatusIcon(file.status);
  
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group ${
        isSelected ? selectedBg : hoverBg
      }`}
      onClick={() => onSelect(file.path)}
    >
      <span 
        className="w-4 text-center text-[10px] font-bold"
        style={{ color: statusInfo.color }}
      >
        {statusInfo.icon}
      </span>
      <span className={`flex-1 text-xs ${textColor} truncate`}>
        {file.path.split('/').pop()}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        {file.staged ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnstage(file.path);
            }}
            className={`p-0.5 rounded ${hoverBg}`}
            title="Unstage"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStage(file.path);
              }}
              className={`p-0.5 rounded ${hoverBg}`}
              title="Stage"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDiscard(file.path);
              }}
              className={`p-0.5 rounded text-red-500 ${hoverBg}`}
              title="Discard Changes"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDiff(file.path);
          }}
          className={`p-0.5 rounded ${hoverBg}`}
          title="View Diff"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const Modal: React.FC<{
  title: string;
  isDark: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, isDark, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center"
    onClick={onClose}
  >
    <div className="absolute inset-0 bg-black/50" />
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`relative w-full max-w-md mx-4 p-4 rounded-lg ${isDark ? 'bg-vscode-sidebar border border-vscode-border' : 'bg-white'} shadow-xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>
      {children}
    </motion.div>
  </motion.div>
);

export default GitIntegrationAdvanced;
