/**
 * GitPanel — Full-screen Git version control with real backend integration
 * Bidirectional: editor changes → git tracks; git checkout → restores editor
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  GitCommit,
  Plus,
  Minus,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Clock,
  RefreshCw,
  FolderGit2,
  Loader2,
  AlertTriangle,
  Eye,
  GitFork,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { editorBridge } from '../../services/editorBridge';

// ── Types ──────────────────────────────────────────────────────────

type FileStatus = 'modified' | 'added' | 'deleted';

interface ChangedFile {
  path: string;
  status: FileStatus;
  staged: boolean;
}

interface CommitEntry {
  id: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  filesChanged: number;
}

interface DiffEntry {
  path: string;
  status: FileStatus;
  oldContent: string | null;
  newContent: string | null;
  additions: number;
  deletions: number;
}

interface GitPanelProps {
  projectId: string;
  isDarkMode: boolean;
  onFilesRestored?: (files: Record<string, string>) => void;
  className?: string;
}

const API_BASE = '/api/git';

const statusColors: Record<FileStatus, { text: string; bg: string; label: string }> = {
  modified: { text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'M' },
  added: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'A' },
  deleted: { text: 'text-primary-400', bg: 'bg-primary-500/10', label: 'D' },
};

// ── API helpers ────────────────────────────────────────────────────

async function gitFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
    ...options,
  });
  return res.json();
}

// ── Component ──────────────────────────────────────────────────────

const GitPanel: React.FC<GitPanelProps> = ({ projectId, isDarkMode, onFilesRestored, className = '' }) => {
  // State
  const [branch, setBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>(['main']);
  const [changes, setChanges] = useState<ChangedFile[]>([]);
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'changes' | 'history' | 'diff'>('changes');
  const [showStaged, setShowStaged] = useState(true);
  const [showUnstaged, setShowUnstaged] = useState(true);
  const [selectedDiffFile, setSelectedDiffFile] = useState<DiffEntry | null>(null);
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [committing, setCommitting] = useState(false);
  const commitInputRef = useRef<HTMLTextAreaElement>(null);

  const staged = useMemo(() => changes.filter(f => f.staged), [changes]);
  const unstaged = useMemo(() => changes.filter(f => !f.staged), [changes]);

  const hasProject = projectId && !/^\d+$/.test(projectId);

  // ── Sync editor files to DB then fetch git status ───────────────
  const syncAndRefresh = useCallback(async () => {
    if (!hasProject) return;
    setSyncing(true);
    setError(null);
    try {
      // 1. Sync editor files to DB
      const editorFiles: Record<string, string> = {};
      editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
        editorFiles[f.path] = f.content;
      });
      await gitFetch(`/${projectId}/sync`, {
        method: 'POST',
        body: JSON.stringify({ files: editorFiles }),
      });

      // 2. Get git status
      const statusRes = await gitFetch(`/${projectId}/status`);
      if (statusRes.success) {
        setBranch(statusRes.branch);
        setBranches(statusRes.branches || ['main']);
        setTotalFiles(statusRes.totalFiles || 0);
        const changedFiles: ChangedFile[] = (statusRes.changes || []).map((c: any) => ({
          ...c,
          staged: false,
        }));
        setChanges(changedFiles);
        setInitialized(statusRes.headCommitId != null);
      }

      // 3. Get commit log
      const logRes = await gitFetch(`/${projectId}/log`);
      if (logRes.success) {
        setCommits(logRes.commits || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }, [projectId, hasProject]);

  // Auto-refresh on mount and projectId change
  useEffect(() => {
    syncAndRefresh();
  }, [syncAndRefresh]);

  // ── Init repo ────────────────────────────────────────────────────
  const initRepo = async () => {
    setLoading(true);
    try {
      // Sync files first
      const editorFiles: Record<string, string> = {};
      editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
        editorFiles[f.path] = f.content;
      });
      await gitFetch(`/${projectId}/sync`, { method: 'POST', body: JSON.stringify({ files: editorFiles }) });
      const res = await gitFetch(`/${projectId}/init`, { method: 'POST' });
      if (res.success) {
        setInitialized(true);
        await syncAndRefresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Commit ───────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!commitMessage.trim() || staged.length === 0) return;
    setCommitting(true);
    try {
      const res = await gitFetch(`/${projectId}/commit`, {
        method: 'POST',
        body: JSON.stringify({
          message: commitMessage.trim(),
          stagedPaths: staged.map(f => f.path),
        }),
      });
      if (res.success) {
        setCommitMessage('');
        await syncAndRefresh();
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCommitting(false);
    }
  };

  // ── Checkout ─────────────────────────────────────────────────────
  const handleCheckout = async (commitId: string) => {
    setLoading(true);
    try {
      const res = await gitFetch(`/${projectId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ commitId }),
      });
      if (res.success && res.files) {
        // Restore files in editorBridge
        const currentPaths = editorBridge.getAllFilePaths();
        // Delete files that don't exist in snapshot
        for (const p of currentPaths) {
          if (!(p in res.files)) editorBridge.deleteFile(p);
        }
        // Create/update files from snapshot
        for (const [path, content] of Object.entries(res.files)) {
          if (editorBridge.getFile(path)) {
            editorBridge.updateFile(path, content as string);
          } else {
            editorBridge.createFile(path, content as string);
          }
        }
        onFilesRestored?.(res.files);
        await syncAndRefresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Discard ──────────────────────────────────────────────────────
  const handleDiscard = async (path: string) => {
    try {
      const res = await gitFetch(`/${projectId}/discard`, {
        method: 'POST',
        body: JSON.stringify({ paths: [path] }),
      });
      if (res.success) {
        // Restore in editor
        for (const [p, content] of Object.entries(res.restoredFiles)) {
          if (content === null) {
            editorBridge.deleteFile(p);
          } else if (editorBridge.getFile(p)) {
            editorBridge.updateFile(p, content as string);
          } else {
            editorBridge.createFile(p, content as string);
          }
        }
        await syncAndRefresh();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Branch ───────────────────────────────────────────────────────
  const createBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      const res = await gitFetch(`/${projectId}/branch`, {
        method: 'POST',
        body: JSON.stringify({ name: newBranchName.trim() }),
      });
      if (res.success) {
        setBranches(res.branches);
        setBranch(newBranchName.trim());
        setNewBranchName('');
        setShowBranchInput(false);
        await syncAndRefresh();
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const switchBranch = async (name: string) => {
    if (name === branch) return;
    setLoading(true);
    try {
      const res = await gitFetch(`/${projectId}/branch/switch`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (res.success && res.files) {
        // Restore files in editor
        const currentPaths = editorBridge.getAllFilePaths();
        for (const p of currentPaths) {
          if (!(p in res.files)) editorBridge.deleteFile(p);
        }
        for (const [path, content] of Object.entries(res.files)) {
          if (editorBridge.getFile(path)) {
            editorBridge.updateFile(path, content as string);
          } else {
            editorBridge.createFile(path, content as string);
          }
        }
        setBranch(name);
        onFilesRestored?.(res.files);
        await syncAndRefresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (name: string) => {
    try {
      const res = await gitFetch(`/${projectId}/branch/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.success) setBranches(res.branches);
      else setError(res.message);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── View diff for a commit ───────────────────────────────────────
  const viewDiff = async (commitId: string) => {
    try {
      // Sync first
      const editorFiles: Record<string, string> = {};
      editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
        editorFiles[f.path] = f.content;
      });
      await gitFetch(`/${projectId}/sync`, { method: 'POST', body: JSON.stringify({ files: editorFiles }) });
      const res = await gitFetch(`/${projectId}/diff/${commitId}`);
      if (res.success) {
        setDiffs(res.diffs || []);
        setSelectedDiffFile(res.diffs?.[0] || null);
        setView('diff');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Stage / unstage helpers
  const toggleStage = (path: string) => setChanges(prev => prev.map(f => f.path === path ? { ...f, staged: !f.staged } : f));
  const stageAll = () => setChanges(prev => prev.map(f => ({ ...f, staged: true })));
  const unstageAllFn = () => setChanges(prev => prev.map(f => ({ ...f, staged: false })));

  // ── No project open ──────────────────────────────────────────────
  if (!hasProject) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 max-w-sm">
          <FolderGit2 className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-medium text-canvas-muted">No Project Open</h3>
          <p className="text-xs text-gray-600">Open or create a project to use Git version control. Your changes will be tracked automatically.</p>
        </div>
      </div>
    );
  }

  // ── Not initialized ──────────────────────────────────────────────
  if (!initialized && !syncing && commits.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4 max-w-sm">
          <FolderGit2 className="w-14 h-14 text-violet-500/60 mx-auto" />
          <h3 className="text-sm font-medium text-canvas-text">Initialize Repository</h3>
          <p className="text-xs text-canvas-muted-deep">Create an initial commit with all {totalFiles} project files to start tracking changes.</p>
          <button
            onClick={initRepo}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:opacity-90 transition disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : <GitCommit className="w-3.5 h-3.5 inline mr-1" />}
            Initialize & Commit
          </button>
          {error && <p className="text-xs text-primary-400">{error}</p>}
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <div className={`h-full flex ${className}`}>
      {/* ══ LEFT: Changes / History / Branch ══ */}
      <div className="w-72 shrink-0 border-r border-canvas-border flex flex-col h-full">
        {/* Branch bar */}
        <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <select
            value={branch}
            onChange={(e) => switchBranch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-canvas-text font-medium outline-none cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b} className="bg-canvas-card">{b}</option>)}
          </select>
          <button onClick={() => setShowBranchInput(!showBranchInput)} className="p-1 text-canvas-muted-deep hover:text-violet-400 transition" title="New branch">
            <GitFork className="w-3.5 h-3.5" />
          </button>
          <button onClick={syncAndRefresh} disabled={syncing} className="p-1 text-canvas-muted-deep hover:text-cyan-400 transition" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* New branch input */}
        <AnimatePresence>
          {showBranchInput && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-canvas-border">
              <div className="px-3 py-2 flex gap-1.5">
                <input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="branch-name"
                  className="flex-1 bg-white/[0.04] border border-canvas-border rounded px-2 py-1 text-xs text-canvas-text outline-none focus:border-violet-500/40"
                  onKeyDown={(e) => e.key === 'Enter' && createBranch()}
                />
                <button onClick={createBranch} className="px-2 py-1 rounded bg-violet-600/80 text-white text-[10px] hover:bg-violet-500">Create</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View tabs */}
        <div className="px-2 py-1.5 border-b border-canvas-border flex gap-1">
          {(['changes', 'history'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium capitalize transition ${
                view === v || (view === 'diff' && v === 'history')
                  ? 'bg-white/[0.06] text-white'
                  : 'text-canvas-muted-deep hover:text-canvas-text'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {error && (
          <div className="px-3 py-1.5 bg-primary-500/10 border-b border-primary-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-primary-400 shrink-0" />
            <span className="text-[10px] text-primary-400 truncate">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-primary-400/60 hover:text-primary-400 text-xs">&times;</button>
          </div>
        )}

        {/* ── Changes view ── */}
        {view === 'changes' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Commit box */}
            <div className="px-3 py-2 border-b border-canvas-border">
              <textarea
                ref={commitInputRef}
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                rows={2}
                className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-2 text-xs text-canvas-text placeholder-gray-600 outline-none resize-none focus:border-violet-500/30 transition"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommit(); }}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || staged.length === 0 || committing}
                className="mt-1.5 w-full py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-1.5"
              >
                {committing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Commit ({staged.length} file{staged.length !== 1 ? 's' : ''})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {/* Staged */}
              <div>
                <button
                  onClick={() => setShowStaged(!showStaged)}
                  className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200 transition"
                >
                  {showStaged ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                  Staged Changes
                  <span className="ml-1.5 px-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">{staged.length}</span>
                  <div className="flex-1" />
                  {staged.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); unstageAllFn(); }} className="p-0.5 hover:text-gray-200" title="Unstage all">
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                </button>
                <AnimatePresence>
                  {showStaged && staged.map(f => (
                    <FileRow key={f.path} file={f} onAction={() => toggleStage(f.path)} actionIcon={<Minus className="w-3 h-3" />} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Unstaged */}
              <div>
                <button
                  onClick={() => setShowUnstaged(!showUnstaged)}
                  className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200 transition"
                >
                  {showUnstaged ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                  Changes
                  <span className="ml-1.5 px-1.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px]">{unstaged.length}</span>
                  <div className="flex-1" />
                  {unstaged.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); stageAll(); }} className="p-0.5 hover:text-gray-200" title="Stage all">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </button>
                <AnimatePresence>
                  {showUnstaged && unstaged.map(f => (
                    <FileRow
                      key={f.path}
                      file={f}
                      onAction={() => toggleStage(f.path)}
                      onSecondaryAction={() => handleDiscard(f.path)}
                      actionIcon={<Plus className="w-3 h-3" />}
                      secondaryIcon={<RotateCcw className="w-3 h-3" />}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {changes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-600 gap-2">
                  <Check className="w-5 h-5 opacity-40" />
                  <span className="text-[11px]">Working tree clean</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── History view ── */}
        {(view === 'history' || view === 'diff') && (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {commits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2 py-10">
                <GitCommit className="w-6 h-6 opacity-40" />
                <span className="text-xs">No commits yet</span>
              </div>
            ) : (
              commits.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-start px-3 py-2.5 border-b border-canvas-border hover:bg-white/[0.02] cursor-pointer group"
                  onClick={() => viewDiff(c.id)}
                >
                  <div className="flex flex-col items-center mr-2.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-violet-500 ring-2 ring-violet-500/20" />
                    {i < commits.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-canvas-text truncate">{c.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-600">{c.author}</span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(c.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCheckout(c.id); }}
                      className="p-1 text-canvas-muted-deep hover:text-cyan-400 transition"
                      title="Checkout this commit"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-gray-600 font-mono">{c.hash.slice(0, 7)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ══ RIGHT: Diff viewer / Info ══ */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
        {view === 'diff' && diffs.length > 0 ? (
          <>
            {/* Diff header */}
            <div className="px-4 py-2.5 border-b border-canvas-border flex items-center gap-3">
              <button onClick={() => { setView('history'); setDiffs([]); setSelectedDiffFile(null); }} className="p-1 text-canvas-muted-deep hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-canvas-muted font-medium">{diffs.length} file{diffs.length !== 1 ? 's' : ''} changed</span>
              <div className="flex-1" />
              {/* File tabs */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {diffs.map(d => {
                  const cfg = statusColors[d.status];
                  return (
                    <button
                      key={d.path}
                      onClick={() => setSelectedDiffFile(d)}
                      className={`px-2 py-1 rounded text-[11px] whitespace-nowrap transition ${
                        selectedDiffFile?.path === d.path ? 'bg-white/[0.08] text-white' : 'text-canvas-muted-deep hover:text-canvas-text'
                      }`}
                    >
                      <span className={`${cfg.text} mr-1`}>{cfg.label}</span>
                      {d.path.split('/').pop()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Diff content */}
            {selectedDiffFile && (
              <div className="flex-1 overflow-auto font-mono text-[12px] leading-5" style={{ scrollbarWidth: 'thin' }}>
                <div className="px-4 py-2 border-b border-canvas-border flex items-center gap-3 bg-white/[0.02]">
                  <span className={`${statusColors[selectedDiffFile.status].text} font-medium`}>{selectedDiffFile.path}</span>
                  <span className="text-emerald-400/60 text-[10px]">+{selectedDiffFile.additions}</span>
                  <span className="text-primary-400/60 text-[10px]">-{selectedDiffFile.deletions}</span>
                </div>
                <div className="flex">
                  {/* Old content */}
                  <div className="flex-1 border-r border-canvas-border">
                    <div className="px-2 py-1 text-[10px] text-gray-600 border-b border-canvas-border bg-primary-500/[0.03]">Previous</div>
                    <pre className="p-3 text-canvas-muted-deep whitespace-pre-wrap break-all">
                      {selectedDiffFile.oldContent || '(file did not exist)'}
                    </pre>
                  </div>
                  {/* New content */}
                  <div className="flex-1">
                    <div className="px-2 py-1 text-[10px] text-gray-600 border-b border-canvas-border bg-emerald-500/[0.03]">Current</div>
                    <pre className="p-3 text-canvas-text whitespace-pre-wrap break-all">
                      {selectedDiffFile.newContent || '(file deleted)'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : view === 'changes' ? (
          /* Changes summary */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-6">
              <FolderGit2 className="w-12 h-12 text-violet-500/30 mx-auto" />
              <div>
                <h3 className="text-sm font-medium text-canvas-text mb-1">Version Control</h3>
                <p className="text-xs text-canvas-muted-deep">
                  {changes.length > 0
                    ? `${changes.length} changed file${changes.length !== 1 ? 's' : ''} detected. Stage files and write a commit message to save a snapshot.`
                    : 'Your working tree is clean. Edit files in the editor and changes will appear here.'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-lg font-bold text-violet-400">{commits.length}</div>
                  <div className="text-[10px] text-canvas-muted-deep mt-0.5">Commits</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-lg font-bold text-cyan-400">{branches.length}</div>
                  <div className="text-[10px] text-canvas-muted-deep mt-0.5">Branches</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-lg font-bold text-amber-400">{totalFiles}</div>
                  <div className="text-[10px] text-canvas-muted-deep mt-0.5">Files</div>
                </div>
              </div>
              {/* Branch list */}
              {branches.length > 1 && (
                <div className="text-left">
                  <h4 className="text-[10px] text-canvas-muted-deep uppercase tracking-wider mb-2">Branches</h4>
                  <div className="space-y-1">
                    {branches.map(b => (
                      <div key={b} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03]">
                        <GitBranch className={`w-3 h-3 ${b === branch ? 'text-violet-400' : 'text-gray-600'}`} />
                        <span className={`text-xs ${b === branch ? 'text-white' : 'text-canvas-muted'}`}>{b}</span>
                        {b === branch && <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 rounded-full ml-auto">HEAD</span>}
                        {b !== branch && b !== 'main' && (
                          <button onClick={() => deleteBranch(b)} className="ml-auto text-gray-600 hover:text-primary-400 transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History — prompt to click a commit */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Eye className="w-10 h-10 text-gray-700 mx-auto" />
              <p className="text-xs text-canvas-muted-deep">Click a commit to view changes</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {(loading || syncing) && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-canvas-card border border-canvas-border rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <span className="text-xs text-canvas-text">{loading ? 'Processing...' : 'Syncing files...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── FileRow sub-component ──────────────────────────────────────────

const FileRow: React.FC<{
  file: ChangedFile;
  onAction: () => void;
  onSecondaryAction?: () => void;
  actionIcon: React.ReactNode;
  secondaryIcon?: React.ReactNode;
}> = ({ file, onAction, onSecondaryAction, actionIcon, secondaryIcon }) => {
  const cfg = statusColors[file.status];
  const fileName = file.path.split('/').pop() || file.path;
  const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center px-3 py-1 hover:bg-white/[0.02] group text-[12px]"
    >
      <FileText className="w-3.5 h-3.5 mr-2 text-canvas-muted-deep shrink-0" />
      <div className="flex-1 truncate">
        <span className="text-canvas-text">{fileName}</span>
        {dirPath && <span className="text-gray-600 ml-1 text-[10px]">{dirPath}/</span>}
      </div>
      <span className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold ${cfg.text} ${cfg.bg} mr-1`}>
        {cfg.label}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        {secondaryIcon && onSecondaryAction && (
          <button onClick={(e) => { e.stopPropagation(); onSecondaryAction(); }} className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition">
            {secondaryIcon}
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onAction(); }} className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition">
          {actionIcon}
        </button>
      </div>
    </motion.div>
  );
};

export default GitPanel;
