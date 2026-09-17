/**
 * GitPanel — Advanced persistent Git version control
 * Backend-persisted commits, branches, stash, tags, amend, merge, diff
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Clock,
  X,
  RefreshCw,
  Search,
  Undo2,
  Zap,
  Bug,
  Paintbrush,
  BookOpen,
  Wrench,
  Archive,
  Copy,
  Tag,
  Layers,
  GitMerge,
  Loader2,
  AlertCircle,
  Trash2,
  ArrowDownToLine,
  PenLine,
  Columns2,
  AlignJustify,
  ChevronUp,
  Github,
  Upload,
  Link,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import {
  gitService,
  type ChangeFile,
  type GitCommitData,
  type GitBranchData,
  type GitStashData,
  type GitTagData,
} from '../../services/gitService';
import { editorBridge, useEditorStore } from '../../services/editorBridge';

// ── Save & Init helper ─────────────────────────────────────────────

async function ensureProjectSaved(): Promise<string | null> {
  const state = useEditorStore.getState();
  if (state.currentProjectId) return state.currentProjectId;
  const ok = await state.saveToBackend();
  if (!ok) return null;
  return useEditorStore.getState().currentProjectId;
}

// ── Types ──────────────────────────────────────────────────────────

interface GitPanelProps {
  className?: string;
}

type ViewTab = 'changes' | 'history' | 'branches' | 'stash' | 'remote';

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  oldLineNum: number;
  newLineNum: number;
}

// ── Constants ──────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  modified: { label: 'M', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  added: { label: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  deleted: { label: 'D', color: 'text-primary-400', bg: 'bg-primary-500/10' },
};

const COMMIT_PREFIXES = [
  { prefix: 'feat', label: 'Feature', icon: <Zap size={10} />, color: 'text-emerald-400' },
  { prefix: 'fix', label: 'Fix', icon: <Bug size={10} />, color: 'text-primary-400' },
  { prefix: 'refactor', label: 'Refactor', icon: <Wrench size={10} />, color: 'text-blue-400' },
  { prefix: 'style', label: 'Style', icon: <Paintbrush size={10} />, color: 'text-purple-400' },
  { prefix: 'docs', label: 'Docs', icon: <BookOpen size={10} />, color: 'text-cyan-400' },
  { prefix: 'chore', label: 'Chore', icon: <Archive size={10} />, color: 'text-zinc-400' },
];

const TAB_CONFIG: { key: ViewTab; label: string }[] = [
  { key: 'changes', label: 'Changes' },
  { key: 'history', label: 'History' },
  { key: 'branches', label: 'Branches' },
  { key: 'stash', label: 'Stash' },
  { key: 'remote', label: 'GitHub' },
];

// ── Diff ───────────────────────────────────────────────────────────

function computeDiff(original: string, current: string): DiffLine[] {
  const origLines = original.split('\n');
  const currLines = current.split('\n');
  const result: DiffLine[] = [];

  const m = origLines.length;
  const n = currLines.length;

  if (m + n > 2000) {
    origLines.forEach((l, i) => result.push({ type: 'removed', content: l, oldLineNum: i + 1, newLineNum: 0 }));
    currLines.forEach((l, i) => result.push({ type: 'added', content: l, oldLineNum: 0, newLineNum: i + 1 }));
    return result;
  }

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = origLines[i - 1] === currLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const ops: Array<{ type: 'same' | 'added' | 'removed'; line: string }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === currLines[j - 1]) {
      ops.unshift({ type: 'same', line: origLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'added', line: currLines[j - 1] });
      j--;
    } else {
      ops.unshift({ type: 'removed', line: origLines[i - 1] });
      i--;
    }
  }

  let oldLn = 0, newLn = 0;
  for (const op of ops) {
    if (op.type === 'removed') { oldLn++; }
    else if (op.type === 'added') { newLn++; }
    else { oldLn++; newLn++; }
    result.push({ type: op.type, content: op.line, oldLineNum: op.type === 'added' ? 0 : oldLn, newLineNum: op.type === 'removed' ? 0 : newLn });
  }
  return result;
}

function getDiffStats(file: ChangeFile): { additions: number; deletions: number } {
  const orig = (file.originalContent || '').split('\n').length;
  const curr = (file.currentContent || '').split('\n').length;
  return { additions: Math.max(0, curr - orig), deletions: Math.max(0, orig - curr) };
}

// ── Component ──────────────────────────────────────────────────────

const GitPanel: React.FC<GitPanelProps> = ({ className = '' }) => {
  const files = useEditorStore(s => s.files);
  const projectId = useEditorStore(s => s.currentProjectId);

  // Core state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Git state from backend
  const [activeBranch, setActiveBranch] = useState('main');
  const [commits, setCommits] = useState<GitCommitData[]>([]);
  const [branches, setBranches] = useState<GitBranchData[]>([]);
  const [stashes, setStashes] = useState<GitStashData[]>([]);
  const [tags, setTags] = useState<GitTagData[]>([]);
  const [lastSnapshot, setLastSnapshot] = useState<Record<string, string>>({});

  // Local working state
  const [stagedFiles, setStagedFiles] = useState<ChangeFile[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<ChangeFile[]>([]);

  // UI state
  const [view, setView] = useState<ViewTab>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [isAmend, setIsAmend] = useState(false);
  const [diffFile, setDiffFile] = useState<ChangeFile | null>(null);
  const [diffMode, setDiffMode] = useState<'inline' | 'split'>('inline');
  const [showStaged, setShowStaged] = useState(true);
  const [showChanges, setShowChanges] = useState(true);
  const [searchCommit, setSearchCommit] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [stashMessage, setStashMessage] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<{ commitId: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Remote / GitHub push state
  const [remoteToken, setRemoteToken] = useState('');
  const [remoteRepo, setRemoteRepo] = useState('');
  const [remoteBranch, setRemoteBranch] = useState('main');
  const [remotePushMsg, setRemotePushMsg] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [pushLog, setPushLog] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [savedRemote, setSavedRemote] = useState<{ repo: string; branch: string; tokenHint: string } | null>(null);

  const prevFilesRef = useRef<string>('');
  const initRef = useRef(false);

  // ── Init ──

  useEffect(() => {
    if (!projectId || Object.keys(files).length === 0 || initRef.current) return;
    initRef.current = true;
    setIsLoading(true);
    setError(null);

    gitService.init(projectId, files)
      .then(data => {
        setActiveBranch(data.branch);
        setCommits(data.commits);
        setBranches(data.branches);
        setStashes(data.stashes);
        setTags(data.tags);
        setLastSnapshot(data.lastSnapshot);
        setIsInitialized(true);
        // Load saved remote config
        gitService.getRemote(projectId).then(r => { if (r) { setSavedRemote(r); setRemoteRepo(r.repo); setRemoteBranch(r.branch); } }).catch(() => { });
      })
      .catch(err => {
        setError(err.message);
        initRef.current = false;
      })
      .finally(() => setIsLoading(false));
  }, [projectId, files]);

  // ── Change Detection ──

  useEffect(() => {
    if (!isInitialized || !lastSnapshot) return;
    const filesKey = JSON.stringify(files);
    if (filesKey === prevFilesRef.current) return;
    prevFilesRef.current = filesKey;

    const changes = gitService.detectChanges(files, lastSnapshot);
    const stagedPaths = new Set(stagedFiles.map(f => f.path));
    setUnstagedFiles(changes.filter(c => !stagedPaths.has(c.path)));
  }, [files, lastSnapshot, isInitialized, stagedFiles]);

  const totalChanges = stagedFiles.length + unstagedFiles.length;

  // ── Operations ──

  const handleStage = useCallback((path: string) => {
    const file = unstagedFiles.find(f => f.path === path);
    if (!file) return;
    setStagedFiles(prev => [...prev, { ...file, staged: true }]);
    setUnstagedFiles(prev => prev.filter(f => f.path !== path));
  }, [unstagedFiles]);

  const handleUnstage = useCallback((path: string) => {
    const file = stagedFiles.find(f => f.path === path);
    if (!file) return;
    setUnstagedFiles(prev => [...prev, { ...file, staged: false }]);
    setStagedFiles(prev => prev.filter(f => f.path !== path));
  }, [stagedFiles]);

  const handleStageAll = useCallback(() => {
    setStagedFiles(prev => [...prev, ...unstagedFiles.map(f => ({ ...f, staged: true }))]);
    setUnstagedFiles([]);
  }, [unstagedFiles]);

  const handleUnstageAll = useCallback(() => {
    setUnstagedFiles(prev => [...prev, ...stagedFiles.map(f => ({ ...f, staged: false }))]);
    setStagedFiles([]);
  }, [stagedFiles]);

  const handleDiscard = useCallback((path: string) => {
    const original = lastSnapshot[path];
    const state = editorBridge.getState();
    if (original !== undefined) {
      state.updateFile(path, original);
    } else {
      state.deleteFile(path);
    }
    setUnstagedFiles(prev => prev.filter(f => f.path !== path));
  }, [lastSnapshot]);

  const handleDiscardAll = useCallback(() => {
    const state = editorBridge.getState();
    for (const file of unstagedFiles) {
      const original = lastSnapshot[file.path];
      if (original !== undefined) state.updateFile(file.path, original);
      else state.deleteFile(file.path);
    }
    setUnstagedFiles([]);
  }, [unstagedFiles, lastSnapshot]);

  const handleCommit = useCallback(async () => {
    if (!projectId || !commitMessage.trim() || stagedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const changedPaths = stagedFiles.map(f => f.path);
      let commit: GitCommitData;
      if (isAmend) {
        commit = await gitService.amend(projectId, commitMessage.trim(), files, changedPaths, activeBranch);
        setCommits(prev => [commit, ...prev.slice(1)]);
      } else {
        commit = await gitService.commit(projectId, commitMessage.trim(), files, changedPaths, activeBranch);
        setCommits(prev => [commit, ...prev]);
      }
      setCommitMessage('');
      setIsAmend(false);
      setStagedFiles([]);
      setLastSnapshot({ ...files });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, commitMessage, stagedFiles, files, isAmend, activeBranch]);

  const handleRestore = useCallback(async (commitId: string) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { snapshot } = await gitService.restore(projectId, commitId);
      const state = editorBridge.getState();
      for (const path of Object.keys(files)) {
        if (!(path in snapshot)) state.deleteFile(path);
      }
      for (const [path, content] of Object.entries(snapshot)) {
        if (path in files) state.updateFile(path, content);
        else state.createFile(path, content);
      }
      setLastSnapshot(snapshot);
      setStagedFiles([]);
      setRestoreConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, files]);

  // Branch operations
  const handleCreateBranch = useCallback(async () => {
    if (!projectId || !newBranchName.trim()) return;
    setIsLoading(true);
    try {
      const branch = await gitService.createBranch(projectId, newBranchName.trim());
      setBranches(prev => [...prev, branch]);
      setActiveBranch(newBranchName.trim());
      setNewBranchName('');
      const historyData = await gitService.getHistory(projectId, newBranchName.trim());
      setCommits(historyData.commits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, newBranchName]);

  const handleSwitchBranch = useCallback(async (name: string) => {
    if (!projectId || name === activeBranch) return;
    if (totalChanges > 0) {
      setError('Stash or commit changes before switching branches');
      return;
    }
    setIsLoading(true);
    try {
      const data = await gitService.switchBranch(projectId, name);
      const state = editorBridge.getState();
      for (const path of Object.keys(files)) {
        if (!(path in data.snapshot)) state.deleteFile(path);
      }
      for (const [path, content] of Object.entries(data.snapshot)) {
        if (path in files) state.updateFile(path, content);
        else state.createFile(path, content);
      }
      setActiveBranch(data.branch);
      setCommits(data.commits);
      setLastSnapshot(data.snapshot);
      setStagedFiles([]);
      setBranches(prev => prev.map(b => ({ ...b, isActive: b.name === name })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeBranch, totalChanges, files]);

  const handleDeleteBranch = useCallback(async (name: string) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await gitService.deleteBranch(projectId, name);
      setBranches(prev => prev.filter(b => b.name !== name));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleMerge = useCallback(async () => {
    if (!projectId || !mergeSource) return;
    setIsLoading(true);
    try {
      const { commit, snapshot } = await gitService.mergeBranch(projectId, mergeSource);
      const state = editorBridge.getState();
      for (const path of Object.keys(files)) {
        if (!(path in snapshot)) state.deleteFile(path);
      }
      for (const [path, content] of Object.entries(snapshot)) {
        if (path in files) state.updateFile(path, content);
        else state.createFile(path, content);
      }
      setCommits(prev => [commit, ...prev]);
      setLastSnapshot(snapshot);
      setMergeSource('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, mergeSource, files]);

  // Stash operations
  const handleSaveStash = useCallback(async () => {
    if (!projectId || totalChanges === 0) return;
    setIsLoading(true);
    try {
      const stash = await gitService.saveStash(projectId, files, stashMessage || undefined, activeBranch);
      setStashes(prev => [stash, ...prev]);
      setStashMessage('');
      // Revert files to last snapshot
      const state = editorBridge.getState();
      for (const file of [...stagedFiles, ...unstagedFiles]) {
        const original = lastSnapshot[file.path];
        if (original !== undefined) state.updateFile(file.path, original);
        else state.deleteFile(file.path);
      }
      setStagedFiles([]);
      setUnstagedFiles([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, files, stashMessage, activeBranch, totalChanges, stagedFiles, unstagedFiles, lastSnapshot]);

  const handlePopStash = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const { snapshot } = await gitService.popStash(projectId);
      const state = editorBridge.getState();
      for (const [path, content] of Object.entries(snapshot)) {
        if (path in files) state.updateFile(path, content);
        else state.createFile(path, content);
      }
      setStashes(prev => prev.slice(1));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, files]);

  const handleDropStash = useCallback(async (stashId: string) => {
    if (!projectId) return;
    try {
      await gitService.dropStash(projectId, stashId);
      setStashes(prev => prev.filter(s => s.id !== stashId));
    } catch (err: any) {
      setError(err.message);
    }
  }, [projectId]);

  // GitHub Push
  const handleGitHubPush = useCallback(async () => {
    const pid = projectId || await ensureProjectSaved();
    if (!pid) { setPushLog({ type: 'error', text: 'Save your project first' }); return; }
    if (!remoteToken.trim()) { setPushLog({ type: 'error', text: 'GitHub token is required' }); return; }
    if (!remoteRepo.trim()) { setPushLog({ type: 'error', text: 'Repository (owner/repo) is required' }); return; }
    const msg = remotePushMsg.trim() || commitMessage.trim() || 'Update from Maula Canvas';
    setIsPushing(true);
    setPushLog({ type: 'info', text: `Pushing to ${remoteRepo}@${remoteBranch}...` });
    try {
      const result = await gitService.pushToGitHub(pid, remoteToken, remoteRepo, remoteBranch, msg);
      // Save remote config (token hint = last 4 chars)
      const hint = remoteToken.length >= 4 ? `****${remoteToken.slice(-4)}` : '****';
      gitService.saveRemote(pid, remoteRepo, remoteBranch, hint)
        .then(r => setSavedRemote({ repo: r.repo, branch: r.branch, tokenHint: hint }))
        .catch(() => { });
      setPushLog({ type: 'success', text: `Pushed ${result.fileCount} file${result.fileCount !== 1 ? 's' : ''} — ${result.shortSha} → ${result.commitUrl}` });
    } catch (err: any) {
      setPushLog({ type: 'error', text: err.message || 'Push failed' });
    } finally {
      setIsPushing(false);
    }
  }, [projectId, remoteToken, remoteRepo, remoteBranch, remotePushMsg, commitMessage]);

  // Tag operations
  const handleCreateTag = useCallback(async () => {
    if (!projectId || !tagInput?.name.trim() || !tagInput?.commitId) return;
    try {
      const tag = await gitService.createTag(projectId, tagInput.name.trim(), tagInput.commitId);
      setTags(prev => [tag, ...prev]);
      setTagInput(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [projectId, tagInput]);

  const handleDeleteTag = useCallback(async (name: string) => {
    if (!projectId) return;
    try {
      await gitService.deleteTag(projectId, name);
      setTags(prev => prev.filter(t => t.name !== name));
    } catch (err: any) {
      setError(err.message);
    }
  }, [projectId]);

  const applyPrefix = (prefix: string) => {
    setCommitMessage(prev => {
      const stripped = prev.replace(/^(feat|fix|refactor|style|docs|chore):\s*/, '');
      return `${prefix}: ${stripped}`;
    });
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRefresh = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await gitService.init(projectId, files);
      setActiveBranch(data.branch);
      setCommits(data.commits);
      setBranches(data.branches);
      setStashes(data.stashes);
      setTags(data.tags);
      setLastSnapshot(data.lastSnapshot);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, files]);

  // Clear error after 4s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Sub-components ──

  const FileRow: React.FC<{
    file: ChangeFile;
    onAction: () => void;
    onSecondary?: () => void;
    actionIcon: React.ReactNode;
    secondaryIcon?: React.ReactNode;
    onViewDiff?: () => void;
  }> = ({ file, onAction, onSecondary, actionIcon, secondaryIcon, onViewDiff }) => {
    const config = statusConfig[file.status] || statusConfig.modified;
    const fileName = file.path.split('/').pop() || file.path;
    const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';
    const stats = getDiffStats(file);

    return (
      <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
        className="flex items-center px-3 py-1 hover:bg-white/[0.02] group text-[12px] cursor-pointer"
        onClick={onViewDiff}>
        <FileText className="w-3.5 h-3.5 mr-2 text-canvas-muted-deep shrink-0" />
        <div className="flex-1 truncate">
          <span className="text-canvas-text">{fileName}</span>
          {dirPath && <span className="text-gray-600 ml-1 text-[10px]">{dirPath}/</span>}
        </div>
        {stats.additions > 0 && <span className="text-emerald-400/60 text-[10px] mr-1">+{stats.additions}</span>}
        {stats.deletions > 0 && <span className="text-primary-400/60 text-[10px] mr-1">-{stats.deletions}</span>}
        <span className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold ${config.color} ${config.bg} mr-1`}>
          {config.label}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {secondaryIcon && onSecondary && (
            <button onClick={e => { e.stopPropagation(); onSecondary(); }}
              className="p-0.5 text-canvas-muted-deep hover:text-primary-400 transition-colors" title="Discard">
              {secondaryIcon}
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onAction(); }}
            className="p-0.5 text-canvas-muted-deep hover:text-canvas-text transition-colors">
            {actionIcon}
          </button>
        </div>
      </motion.div>
    );
  };

  const DiffView: React.FC<{ file: ChangeFile; onClose: () => void }> = ({ file, onClose }) => {
    const original = file.originalContent || '';
    const current = file.currentContent || '';
    const diffLines = useMemo(() => computeDiff(original, current), [original, current]);
    const additions = diffLines.filter(l => l.type === 'added').length;
    const deletions = diffLines.filter(l => l.type === 'removed').length;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-canvas-border">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={13} className="text-canvas-muted-deep" />
            <span className="text-xs text-canvas-text truncate">{file.path}</span>
            <span className="text-[10px] text-emerald-400">+{additions}</span>
            <span className="text-[10px] text-primary-400">-{deletions}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setDiffMode(m => m === 'inline' ? 'split' : 'inline')}
              className="p-1 rounded hover:bg-white/10 text-canvas-muted-deep hover:text-canvas-text" title="Toggle diff mode">
              {diffMode === 'inline' ? <Columns2 size={12} /> : <AlignJustify size={12} />}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
              <X size={14} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {diffMode === 'split' && file.status === 'modified' ? (
          /* Side-by-side diff */
          <div className="flex-1 overflow-auto flex">
            <div className="flex-1 font-mono text-[11px] leading-5 border-r border-canvas-border overflow-auto">
              <div className="p-1">
                {diffLines.filter(l => l.type !== 'added').map((line, i) => (
                  <div key={`l-${i}`} className={`flex ${line.type === 'removed' ? 'bg-primary-500/5 border-l-2 border-primary-500/30' : 'border-l-2 border-transparent'}`}>
                    <span className={`w-8 text-right pr-2 select-none shrink-0 ${line.type === 'removed' ? 'text-primary-500/40' : 'text-gray-700'}`}>{line.oldLineNum || ''}</span>
                    <span className={`whitespace-pre ${line.type === 'removed' ? 'text-primary-300/80' : 'text-canvas-muted-deep'}`}>{line.content || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 font-mono text-[11px] leading-5 overflow-auto">
              <div className="p-1">
                {diffLines.filter(l => l.type !== 'removed').map((line, i) => (
                  <div key={`r-${i}`} className={`flex ${line.type === 'added' ? 'bg-emerald-500/5 border-l-2 border-emerald-500/30' : 'border-l-2 border-transparent'}`}>
                    <span className={`w-8 text-right pr-2 select-none shrink-0 ${line.type === 'added' ? 'text-emerald-500/40' : 'text-gray-700'}`}>{line.newLineNum || ''}</span>
                    <span className={`whitespace-pre ${line.type === 'added' ? 'text-emerald-300/80' : 'text-canvas-muted-deep'}`}>{line.content || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Inline diff */
          <div className="flex-1 overflow-auto font-mono text-[11px] leading-5">
            {file.status === 'added' ? (
              <div className="p-2">
                {(current || '').split('\n').map((line, i) => (
                  <div key={i} className="flex bg-emerald-500/5 border-l-2 border-emerald-500/30">
                    <span className="w-10 text-right pr-2 text-emerald-500/40 select-none shrink-0">{i + 1}</span>
                    <span className="text-emerald-300/80 whitespace-pre">{line || ' '}</span>
                  </div>
                ))}
              </div>
            ) : file.status === 'deleted' ? (
              <div className="p-2">
                {(original || '').split('\n').map((line, i) => (
                  <div key={i} className="flex bg-primary-500/5 border-l-2 border-primary-500/30">
                    <span className="w-10 text-right pr-2 text-primary-500/40 select-none shrink-0">{i + 1}</span>
                    <span className="text-primary-300/80 whitespace-pre line-through">{line || ' '}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2">
                {diffLines.map((line, i) => (
                  <div key={i} className={`flex ${line.type === 'added' ? 'bg-emerald-500/5 border-l-2 border-emerald-500/30' :
                    line.type === 'removed' ? 'bg-primary-500/5 border-l-2 border-primary-500/30' :
                      'border-l-2 border-transparent'}`}>
                    <span className={`w-10 text-right pr-2 select-none shrink-0 ${line.type === 'added' ? 'text-emerald-500/40' :
                      line.type === 'removed' ? 'text-primary-500/40' : 'text-gray-700'}`}>
                      {line.type === 'removed' ? line.oldLineNum : line.newLineNum}
                    </span>
                    <span className="w-4 text-center select-none shrink-0">
                      {line.type === 'added' ? <span className="text-emerald-400">+</span> :
                        line.type === 'removed' ? <span className="text-primary-400">-</span> : ' '}
                    </span>
                    <span className={`whitespace-pre ${line.type === 'added' ? 'text-emerald-300/80' :
                      line.type === 'removed' ? 'text-primary-300/80' : 'text-canvas-muted-deep'}`}>
                      {line.content || ' '}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // ── Auto-init: save project + initialize git ──

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isSaving = useEditorStore(s => s.isSaving);

  const handleInitRepo = useCallback(async () => {
    setIsAutoSaving(true);
    setError(null);
    try {
      const pid = await ensureProjectSaved();
      if (!pid) throw new Error('Failed to save project');
      // projectId will update via zustand selector, triggering the init useEffect
    } catch (err: any) {
      setError(err.message || 'Failed to initialize repository');
    } finally {
      setIsAutoSaving(false);
    }
  }, []);

  // ── Render ──

  // No projectId — show init button
  if (!projectId) {
    const hasFiles = Object.keys(files).length > 0;
    const saving = isAutoSaving || isSaving;
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-canvas-card text-canvas-muted-deep gap-4 px-6 ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600/20 to-primary-500/10 flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-primary-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-canvas-text font-medium">Version Control</p>
          <p className="text-[11px] text-gray-600 leading-relaxed max-w-[200px]">
            {hasFiles
              ? 'Initialize a repository to track changes, create branches, and manage your code history.'
              : 'Start coding first, then initialize a repository to track your changes.'}
          </p>
        </div>
        <button
          onClick={handleInitRepo}
          disabled={!hasFiles || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-primary-500/20"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCommit className="w-3.5 h-3.5" />}
          {saving ? 'Saving project...' : 'Initialize Repository'}
        </button>
        {error && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 rounded-lg">
            <AlertCircle size={11} className="text-primary-400 shrink-0" />
            <span className="text-[10px] text-primary-300">{error}</span>
          </div>
        )}
        {!hasFiles && (
          <p className="text-[10px] text-gray-700 italic">No files in workspace yet</p>
        )}
      </div>
    );
  }

  // Loading init
  if (isLoading && !isInitialized) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-canvas-card text-canvas-muted-deep gap-3 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Initializing version control...</span>
      </div>
    );
  }

  // Diff view
  if (diffFile) {
    return (
      <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
        <DiffView file={diffFile} onClose={() => setDiffFile(null)} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-canvas-card ${className}`}>
      {/* Branch header */}
      <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
        <GitBranch className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs text-canvas-text font-medium">{activeBranch}</span>
        {totalChanges > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px]">{totalChanges}</span>
        )}
        <div className="flex-1" />
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-canvas-muted-deep" />}
        <button onClick={handleRefresh} disabled={isLoading}
          className="p-1 text-canvas-muted-deep hover:text-canvas-text transition-colors disabled:opacity-30" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 py-1.5 bg-primary-500/10 border-b border-primary-500/20 flex items-center gap-2">
            <AlertCircle size={11} className="text-primary-400 shrink-0" />
            <span className="text-[10px] text-primary-300 flex-1 truncate">{error}</span>
            <button onClick={() => setError(null)} className="text-canvas-muted-deep hover:text-canvas-text"><X size={10} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="px-2 py-1 border-b border-canvas-border flex gap-0.5">
        {TAB_CONFIG.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${view === t.key ? 'bg-white/[0.06] text-white' : 'text-canvas-muted-deep hover:text-canvas-text'}`}>
            {t.label}
            {t.key === 'stash' && stashes.length > 0 && (
              <span className="ml-1 text-[9px] text-purple-400">({stashes.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════ CHANGES TAB ════════ */}
      {view === 'changes' && (
        <>
          {/* Commit prefix chips */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-canvas-border overflow-x-auto scrollbar-none">
            {COMMIT_PREFIXES.map(p => (
              <button key={p.prefix} onClick={() => applyPrefix(p.prefix)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap transition-colors ${commitMessage.startsWith(p.prefix + ':') ? 'bg-white/10 ' + p.color : 'text-gray-600 hover:text-canvas-muted hover:bg-white/5'}`}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {/* Commit input */}
          <div className="px-3 py-2 border-b border-canvas-border">
            <textarea
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              rows={2}
              className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-2 text-xs text-canvas-text placeholder-gray-600 outline-none resize-none focus:border-primary-500/30 transition-colors"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommit(); }}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={isAmend} onChange={e => setIsAmend(e.target.checked)}
                  className="w-3 h-3 rounded border-canvas-border bg-white/5 accent-primary-500" />
                <span className="text-[10px] text-canvas-muted-deep">Amend</span>
              </label>
              <div className="flex-1" />
              <button onClick={handleCommit}
                disabled={!commitMessage.trim() || stagedFiles.length === 0 || isLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-1">
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {isAmend ? 'Amend' : 'Commit'} ({stagedFiles.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Staged */}
            <div>
              <button onClick={() => setShowStaged(!showStaged)}
                className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200 transition-colors">
                {showStaged ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                Staged Changes
                <span className="ml-1.5 px-1.5 py-0 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">{stagedFiles.length}</span>
                <div className="flex-1" />
                {stagedFiles.length > 0 && (
                  <button onClick={e => { e.stopPropagation(); handleUnstageAll(); }}
                    className="p-0.5 hover:text-gray-200" title="Unstage all">
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </button>
              <AnimatePresence>
                {showStaged && stagedFiles.map(file => (
                  <FileRow key={file.path} file={file}
                    onAction={() => handleUnstage(file.path)}
                    actionIcon={<Minus className="w-3 h-3" />}
                    onViewDiff={() => setDiffFile(file)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Unstaged */}
            <div>
              <button onClick={() => setShowChanges(!showChanges)}
                className="w-full flex items-center px-3 py-1.5 text-[11px] font-medium text-canvas-muted hover:text-gray-200 transition-colors">
                {showChanges ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                Changes
                <span className="ml-1.5 px-1.5 py-0 rounded-full bg-amber-500/10 text-amber-400 text-[10px]">{unstagedFiles.length}</span>
                <div className="flex-1" />
                <div className="flex items-center gap-0.5">
                  {unstagedFiles.length > 0 && (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleDiscardAll(); }}
                        className="p-0.5 hover:text-primary-400" title="Discard all">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleStageAll(); }}
                        className="p-0.5 hover:text-gray-200" title="Stage all">
                        <Plus className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </button>
              <AnimatePresence>
                {showChanges && unstagedFiles.map(file => (
                  <FileRow key={file.path} file={file}
                    onAction={() => handleStage(file.path)}
                    onSecondary={() => handleDiscard(file.path)}
                    actionIcon={<Plus className="w-3 h-3" />}
                    secondaryIcon={<RotateCcw className="w-3 h-3" />}
                    onViewDiff={() => setDiffFile(file)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {totalChanges === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
                <Check className="w-6 h-6 opacity-40" />
                <span className="text-xs">Working tree clean</span>
                <span className="text-[10px] text-gray-700">No uncommitted changes</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════ HISTORY TAB ════════ */}
      {view === 'history' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Search */}
          <div className="px-3 py-1.5 border-b border-canvas-border">
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-md px-2">
              <Search size={11} className="text-zinc-500" />
              <input value={searchCommit} onChange={e => setSearchCommit(e.target.value)}
                placeholder="Search commits..."
                className="bg-transparent text-[11px] text-white w-full py-1 outline-none placeholder:text-zinc-600" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {commits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                <GitCommit className="w-6 h-6 opacity-40" />
                <span className="text-xs">No commits yet</span>
              </div>
            ) : (
              commits
                .filter(c => !searchCommit || c.message.toLowerCase().includes(searchCommit.toLowerCase()))
                .map((commit, idx) => {
                  const commitTags = tags.filter(t => t.commitId === commit.id);
                  return (
                    <motion.div key={commit.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-start px-3 py-2 border-b border-canvas-border hover:bg-white/[0.02] group">
                      {/* Graph dot */}
                      <div className="flex flex-col items-center mr-3 mt-0.5">
                        <div className={`w-2 h-2 rounded-full ring-2 ${commit.isMerge ? 'bg-purple-500 ring-purple-500/20' :
                          idx === 0 ? 'bg-primary-500 ring-primary-500/20' : 'bg-gray-600 ring-gray-600/20'}`} />
                        {idx < commits.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {commit.isMerge && <GitMerge size={10} className="text-purple-400 shrink-0" />}
                          <p className="text-xs text-canvas-text truncate">{commit.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-600">{commit.author}</span>
                          <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(commit.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {commit.stats.additions > 0 && <span className="text-[9px] text-emerald-500/60">+{commit.stats.additions}</span>}
                          {commit.stats.deletions > 0 && <span className="text-[9px] text-primary-500/60">-{commit.stats.deletions}</span>}
                        </div>

                        {/* Tags */}
                        {commitTags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {commitTags.map(t => (
                              <span key={t.id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px]">
                                <Tag size={8} /> {t.name}
                                <button onClick={() => handleDeleteTag(t.name)} className="ml-0.5 hover:text-primary-400"><X size={7} /></button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Files in commit */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {commit.files.slice(0, 4).map(f => (
                            <span key={f} className="px-1 py-0.5 bg-white/[0.04] rounded text-[9px] text-canvas-muted-deep truncate max-w-[100px]">
                              {f.split('/').pop()}
                            </span>
                          ))}
                          {commit.files.length > 4 && (
                            <span className="text-[9px] text-gray-600">+{commit.files.length - 4} more</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => copyHash(commit.hash)}
                          className="text-[10px] text-gray-600 font-mono hover:text-canvas-muted flex items-center gap-0.5" title="Copy hash">
                          {copiedHash === commit.hash ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
                          {commit.hash.slice(0, 7)}
                        </button>

                        {/* Tag button */}
                        {tagInput?.commitId === commit.id ? (
                          <div className="flex items-center gap-1">
                            <input value={tagInput.name} onChange={e => setTagInput({ ...tagInput, name: e.target.value })}
                              placeholder="v1.0"
                              className="w-14 bg-white/[0.06] rounded px-1 py-0.5 text-[9px] text-white outline-none"
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setTagInput(null); }}
                              autoFocus />
                            <button onClick={handleCreateTag} className="text-emerald-400"><Check size={9} /></button>
                            <button onClick={() => setTagInput(null)} className="text-canvas-muted-deep"><X size={9} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setTagInput({ commitId: commit.id, name: '' })}
                            className="flex items-center gap-0.5 text-[9px] text-gray-600 hover:text-amber-400" title="Add tag">
                            <Tag size={9} /> Tag
                          </button>
                        )}

                        {/* Restore */}
                        {idx > 0 && (
                          restoreConfirm === commit.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleRestore(commit.id)}
                                className="px-1.5 py-0.5 bg-primary-600/20 hover:bg-primary-600/40 rounded text-[9px] text-primary-400">Confirm</button>
                              <button onClick={() => setRestoreConfirm(null)}
                                className="px-1 py-0.5 text-[9px] text-canvas-muted-deep hover:text-canvas-text">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setRestoreConfirm(commit.id)}
                              className="flex items-center gap-0.5 text-[9px] text-gray-600 hover:text-amber-400" title="Restore">
                              <Undo2 size={9} /> Restore
                            </button>
                          )
                        )}
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ════════ BRANCHES TAB ════════ */}
      {view === 'branches' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Create branch */}
          <div className="px-3 py-2 border-b border-canvas-border">
            <div className="flex items-center gap-1">
              <input value={newBranchName} onChange={e => setNewBranchName(e.target.value)}
                placeholder="New branch name..."
                className="flex-1 bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-primary-500/30"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateBranch(); }} />
              <button onClick={handleCreateBranch}
                disabled={!newBranchName.trim() || isLoading}
                className="px-2 py-1 rounded-md text-xs font-medium bg-primary-600/80 text-white disabled:opacity-30 hover:bg-primary-600 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Branch list */}
          <div className="flex-1 overflow-y-auto py-1">
            {branches.map(branch => (
              <motion.div key={branch.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex items-center gap-2 px-3 py-2 transition-colors group ${branch.name === activeBranch ? 'bg-primary-600/10 border-l-2 border-primary-500' : 'hover:bg-white/[0.02] border-l-2 border-transparent'}`}>
                <GitBranch className={`w-3.5 h-3.5 shrink-0 ${branch.name === activeBranch ? 'text-primary-400' : 'text-gray-600'}`} />
                <span className={`text-xs flex-1 truncate ${branch.name === activeBranch ? 'text-white font-medium' : 'text-canvas-muted'}`}>
                  {branch.name}
                </span>
                {branch.name === activeBranch ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 text-[9px]">current</span>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleSwitchBranch(branch.name)}
                      className="px-1.5 py-0.5 rounded text-[9px] text-canvas-muted hover:text-white hover:bg-white/10">Switch</button>
                    {deleteConfirm === branch.name ? (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleDeleteBranch(branch.name)}
                          className="px-1 py-0.5 text-[9px] text-primary-400 hover:bg-primary-600/20 rounded">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-1 py-0.5 text-[9px] text-canvas-muted-deep">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(branch.name)}
                        className="p-0.5 text-gray-600 hover:text-primary-400"><Trash2 size={10} /></button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Merge section */}
          {branches.length > 1 && (
            <div className="px-3 py-2 border-t border-canvas-border">
              <div className="flex items-center gap-1 mb-1.5">
                <GitMerge size={11} className="text-purple-400" />
                <span className="text-[10px] text-canvas-muted">Merge into {activeBranch}</span>
              </div>
              <div className="flex items-center gap-1">
                <select value={mergeSource} onChange={e => setMergeSource(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1 text-xs text-canvas-text outline-none appearance-none">
                  <option value="">Select branch...</option>
                  {branches.filter(b => b.name !== activeBranch).map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <button onClick={handleMerge} disabled={!mergeSource || isLoading}
                  className="px-2 py-1 rounded-md text-xs font-medium bg-purple-600/80 text-white disabled:opacity-30 hover:bg-purple-600 transition-colors">
                  Merge
                </button>
              </div>
            </div>
          )}

          {branches.length <= 1 && (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-gray-600">Create branches to organize your work</p>
            </div>
          )}
        </div>
      )}

      {/* ════════ STASH TAB ════════ */}
      {view === 'stash' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Save stash */}
          <div className="px-3 py-2 border-b border-canvas-border">
            <div className="flex items-center gap-1 mb-1.5">
              <input value={stashMessage} onChange={e => setStashMessage(e.target.value)}
                placeholder="Stash message (optional)..."
                className="flex-1 bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-purple-500/30" />
              <button onClick={handleSaveStash} disabled={totalChanges === 0 || isLoading}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-600/80 text-white disabled:opacity-30 hover:bg-purple-600 transition-colors flex items-center gap-1">
                <ArrowDownToLine size={10} /> Stash
              </button>
            </div>
            {totalChanges > 0 && (
              <p className="text-[10px] text-gray-600">{totalChanges} change{totalChanges !== 1 ? 's' : ''} will be stashed</p>
            )}
          </div>

          {/* Stash list */}
          <div className="flex-1 overflow-y-auto">
            {stashes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                <Layers className="w-6 h-6 opacity-40" />
                <span className="text-xs">No stashes saved</span>
                <span className="text-[10px] text-gray-700">Stash working changes to switch context</span>
              </div>
            ) : (
              stashes.map((stash, idx) => (
                <motion.div key={stash.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start px-3 py-2 border-b border-canvas-border hover:bg-white/[0.02] group">
                  <Layers size={12} className="text-purple-400/60 mr-2 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-canvas-text truncate">stash@{'{' + idx + '}'}: {stash.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-600">{stash.branch}</span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(stash.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {idx === 0 && (
                      <button onClick={handlePopStash}
                        className="px-1.5 py-0.5 rounded text-[9px] text-emerald-400 hover:bg-emerald-600/20">Pop</button>
                    )}
                    <button onClick={() => handleDropStash(stash.id)}
                      className="px-1.5 py-0.5 rounded text-[9px] text-primary-400 hover:bg-primary-600/20">Drop</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── GitHub Remote / Push ───────────────────────────────── */}
      {view === 'remote' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-canvas-border flex items-center gap-2">
            <Github size={12} className="text-canvas-muted" />
            <span className="text-xs font-medium text-canvas-text">Push to GitHub</span>
            {savedRemote && (
              <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                <Check size={9} /> {savedRemote.repo}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
            {/* Token */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-canvas-muted-deep flex items-center gap-1">
                <Link size={9} /> GitHub Token
                {savedRemote && <span className="text-gray-600 ml-1">({savedRemote.tokenHint})</span>}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={remoteToken}
                  onChange={e => setRemoteToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1.5 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-purple-500/30 font-mono"
                />
                <button onClick={() => setShowToken(v => !v)}
                  className="p-1.5 rounded-md text-canvas-muted-deep hover:text-canvas-text hover:bg-white/[0.04] transition-colors">
                  {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <p className="text-[9px] text-gray-700">Tokens are never stored — only a hint is saved</p>
            </div>

            {/* Repo URL */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-canvas-muted-deep flex items-center gap-1">
                <Github size={9} /> Repository
              </label>
              <input
                type="text"
                value={remoteRepo}
                onChange={e => setRemoteRepo(e.target.value)}
                placeholder="owner/repo-name"
                className="bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1.5 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-purple-500/30"
              />
            </div>

            {/* Branch */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-canvas-muted-deep flex items-center gap-1">
                <GitBranch size={9} /> Branch
              </label>
              <input
                type="text"
                value={remoteBranch}
                onChange={e => setRemoteBranch(e.target.value)}
                placeholder="main"
                className="bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1.5 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-purple-500/30"
              />
            </div>

            {/* Commit message */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-canvas-muted-deep flex items-center gap-1">
                <GitCommit size={9} /> Commit Message
              </label>
              <input
                type="text"
                value={remotePushMsg}
                onChange={e => setRemotePushMsg(e.target.value)}
                placeholder={commitMessage || 'Update from Maula Canvas'}
                className="bg-white/[0.04] border border-canvas-border rounded-md px-2 py-1.5 text-xs text-canvas-text placeholder-gray-600 outline-none focus:border-purple-500/30"
              />
            </div>

            {/* Push button */}
            <button
              onClick={handleGitHubPush}
              disabled={isPushing || !remoteToken.trim() || !remoteRepo.trim()}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-emerald-600/80 text-white disabled:opacity-30 hover:bg-emerald-600 transition-colors"
            >
              {isPushing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {isPushing ? 'Pushing…' : 'Push to GitHub'}
            </button>

            {/* Push log */}
            {pushLog && (
              <div className={`flex items-start gap-2 p-2 rounded-md text-[10px] border ${pushLog.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                  pushLog.type === 'error' ? 'bg-primary-500/10 border-primary-500/20 text-primary-300' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-300'
                }`}>
                {pushLog.type === 'success' ? <Check size={10} className="mt-0.5 shrink-0" /> :
                  pushLog.type === 'error' ? <AlertCircle size={10} className="mt-0.5 shrink-0" /> :
                    <Loader2 size={10} className="mt-0.5 shrink-0 animate-spin" />}
                <span className="break-all">
                  {pushLog.text}
                  {pushLog.type === 'success' && pushLog.text.includes('https://') && (
                    <a href={pushLog.text.split(' → ')[1]} target="_blank" rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 underline opacity-80 hover:opacity-100">
                      View <ExternalLink size={8} />
                    </a>
                  )}
                </span>
              </div>
            )}

            {/* Help */}
            <div className="mt-1 p-2 rounded-md bg-white/[0.02] border border-canvas-border">
              <p className="text-[9px] text-gray-700 leading-relaxed">
                Requires a GitHub Personal Access Token with <strong className="text-gray-600">repo</strong> scope.
                Create one at <span className="text-gray-600">github.com → Settings → Developer settings → Personal access tokens</span>.
                Private repos are supported.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitPanel;
