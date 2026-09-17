/**
 * AgentPanel — Full-screen AI Agent with project selector, file upload,
 * action tabs (Deploy, Status, Debug, Performance, Backup, Security),
 * inline results, and execution history.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Sparkles,
  Rocket,
  Bug,
  Gauge,
  Database,
  Shield,
  BarChart3,
  Trash2,
  Globe,
  Wrench,
  X,
  ChevronDown,
  Upload,
  FolderOpen,
  FileText,
  RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface PlanStep {
  action: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
}

interface ExecutionResult {
  executionId: string;
  intent: string;
  plan: PlanStep[];
  results: Array<{ action: string; status: string; result?: { message?: string; detail?: any }; error?: string }>;
  summary: string;
  timestamp: number;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  content: string;
}

interface AgentPanelProps {
  projectId: string;
  isDarkMode?: boolean;
  className?: string;
}

type ActionTab = 'deploy' | 'status' | 'debug' | 'performance' | 'backup' | 'security';

const INTENT_ICONS: Record<string, React.ReactNode> = {
  deploy: <Rocket size={14} className="text-emerald-400" />,
  build: <Wrench size={14} className="text-blue-400" />,
  rollback: <Clock size={14} className="text-amber-400" />,
  debug: <Bug size={14} className="text-primary-400" />,
  scale: <Gauge size={14} className="text-violet-400" />,
  database: <Database size={14} className="text-cyan-400" />,
  setup: <Sparkles size={14} className="text-pink-400" />,
  security: <Shield size={14} className="text-orange-400" />,
  status: <BarChart3 size={14} className="text-zinc-400" />,
  cost: <BarChart3 size={14} className="text-green-400" />,
  domain: <Globe size={14} className="text-blue-400" />,
  cleanup: <Trash2 size={14} className="text-zinc-400" />,
};

const STEP_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-zinc-500" />,
  running: <Loader2 size={14} className="text-violet-400 animate-spin" />,
  completed: <CheckCircle2 size={14} className="text-emerald-400" />,
  failed: <XCircle size={14} className="text-primary-400" />,
  skipped: <SkipForward size={14} className="text-zinc-500" />,
};

const ACTION_TABS: { id: ActionTab; label: string; icon: string; command: string; desc: string }[] = [
  { id: 'deploy', label: 'Deploy', icon: '🚀', command: 'deploy to production', desc: 'Build, validate & deploy' },
  { id: 'status', label: 'Status', icon: '📊', command: 'check status', desc: 'Health & activity check' },
  { id: 'debug', label: 'Debug', icon: '🐛', command: 'debug and fix errors', desc: 'Analyze & fix issues' },
  { id: 'performance', label: 'Performance', icon: '⚡', command: 'analyze performance', desc: 'Bundle & speed audit' },
  { id: 'backup', label: 'Backup', icon: '💾', command: 'backup database', desc: 'Backup project data' },
  { id: 'security', label: 'Security', icon: '🔒', command: 'security audit', desc: 'Vulnerability scan' },
];

function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtTime(ts: number | string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────

const AgentPanel: React.FC<AgentPanelProps> = ({ projectId: defaultProjectId, isDarkMode = true, className = '' }) => {
  const cardCls = isDarkMode
    ? 'bg-white/[0.02] border border-canvas-border rounded-xl'
    : 'bg-white border border-gray-200 rounded-xl shadow-sm';
  const valCls = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const subCls = isDarkMode ? 'text-canvas-muted-deep' : 'text-canvas-muted';

  // ── State ──
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<ExecutionResult[]>([]);
  const [expandedExec, setExpandedExec] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionTab | null>(null);

  // Project selector
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(defaultProjectId === 'default' ? '' : defaultProjectId);
  const [projectDropdown, setProjectDropdown] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // File/folder upload — session-only UI state, ZERO browser storage.
  // Files are sent to backend on each command and persisted server-side.
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load projects ──
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/canvas-projects', { credentials: 'include' });
      const data = await res.json();
      if (data?.projects) {
        setProjects(data.projects);
        // Auto-select first project if none selected
        if (!selectedProject && data.projects.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch { /* ignore */ }
    setLoadingProjects(false);
  }, [selectedProject]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  // ── Execute command ──
  const executeCommand = async (cmd?: string) => {
    const input = cmd || command;
    if (!input.trim() || isExecuting) return;

    // Must have either a project or uploaded files
    if (!selectedProject && uploadedFiles.length === 0) {
      setError('Please select a project or upload files first');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setCommand('');

    try {
      // Build uploaded file map { path → content }
      const fileContents: Record<string, string> = {};
      for (const f of uploadedFiles) {
        fileContents[f.path] = f.content;
      }

      let url: string;
      let body: Record<string, unknown>;

      if (selectedProject) {
        // Use project endpoint, also send uploaded files
        url = `/api/agent-ops/${selectedProject}/execute`;
        body = { command: input, files: Object.keys(fileContents).length > 0 ? fileContents : undefined };
      } else {
        // Use upload-only analyze endpoint
        url = '/api/agent-ops/analyze';
        body = { command: input, files: fileContents };
      }

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        const result: ExecutionResult = {
          executionId: data.executionId,
          intent: data.intent,
          plan: data.plan,
          results: data.results,
          summary: data.summary,
          timestamp: Date.now(),
        };
        setHistory(prev => [...prev, result]);
        setExpandedExec(data.executionId);
      } else {
        setError(data.error || 'Execution failed');
      }
    } catch {
      setError('Network error — could not reach agent');
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelExecution = async () => {
    try {
      await fetch(`/api/agent-ops/${selectedProject}/cancel`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles: UploadedFile[] = [];
    const readPromises = Array.from(files).map(file => {
      return new Promise<UploadedFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            path: (file as any).webkitRelativePath || file.name,
            size: file.size,
            type: file.type || 'unknown',
            content: reader.result as string,
          });
        };
        reader.onerror = () => {
          resolve({
            name: file.name,
            path: (file as any).webkitRelativePath || file.name,
            size: file.size,
            type: file.type || 'unknown',
            content: '',
          });
        };
        reader.readAsText(file);
      });
    });
    const results = await Promise.all(readPromises);
    newFiles.push(...results.filter(f => f.content.length > 0));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const runAction = (action: ActionTab) => {
    setActiveAction(action);
    const tab = ACTION_TABS.find(t => t.id === action);
    if (tab) executeCommand(tab.command);
  };

  const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || 'No project selected';

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className={`h-full min-h-0 flex flex-col ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'} ${className}`}>

      {/* ─── Top bar: Project Selector + Upload + Stats ─── */}
      <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'} shrink-0`}>
        <div className="flex items-center gap-4">
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdown(!projectDropdown)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode
                ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20'
                : 'bg-violet-50 border border-violet-300 text-violet-700 hover:bg-violet-100'
              }`}
            >
              <FolderOpen size={14} />
              <span className="max-w-[200px] truncate">{selectedProjectName}</span>
              <ChevronDown size={12} className={`transition-transform ${projectDropdown ? 'rotate-180' : ''}`} />
            </button>

            {projectDropdown && (
              <div className={`absolute top-full left-0 mt-1 w-80 max-h-64 overflow-y-auto rounded-xl shadow-2xl z-50 ${isDarkMode ? 'bg-canvas-card border border-canvas-border' : 'bg-white border border-gray-200'}`}>
                <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${subCls}`}>Select Project</span>
                    <button onClick={loadProjects} title="Refresh projects" className={`text-[10px] ${subCls} hover:text-violet-400`}>
                      <RefreshCw size={10} className={loadingProjects ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                {projects.length === 0 ? (
                  <div className={`px-4 py-6 text-center text-xs ${subCls}`}>
                    {loadingProjects ? 'Loading projects...' : 'No projects found'}
                  </div>
                ) : (
                  projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p.id); setProjectDropdown(false); }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-all ${selectedProject === p.id
                        ? isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'
                        : isDarkMode ? 'hover:bg-white/5 text-canvas-text' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen size={12} className={selectedProject === p.id ? 'text-violet-400' : subCls} />
                        <span className="text-xs font-medium truncate">{p.name}</span>
                      </div>
                      {selectedProject === p.id && (
                        <CheckCircle2 size={12} className="text-violet-400 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isDarkMode
              ? 'bg-white/5 border border-canvas-border text-canvas-muted hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10'
              : 'bg-gray-100 border border-gray-200 text-canvas-muted-deep hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50'
            }`}
          >
            <Upload size={12} />
            Files
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" title="Upload files" onChange={e => handleFileUpload(e.target.files)} />

          {/* Folder Upload */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isDarkMode
              ? 'bg-white/5 border border-canvas-border text-canvas-muted hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10'
              : 'bg-gray-100 border border-gray-200 text-canvas-muted-deep hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50'
            }`}
          >
            <FolderOpen size={12} />
            Folder
          </button>
          {/* @ts-expect-error webkitdirectory is a non-standard attribute */}
          <input ref={folderInputRef} type="file" multiple className="hidden" title="Upload folder" webkitdirectory="" onChange={e => handleFileUpload(e.target.files)} />

          <div className="flex-1" />

          {/* Stats */}
          <div className="flex items-center gap-4">
            {[
              { n: history.length, l: 'Runs', c: 'text-violet-400' },
              { n: history.filter(h => h.results?.every(r => r.status === 'completed')).length, l: 'Success', c: 'text-emerald-400' },
              { n: history.filter(h => h.results?.some(r => r.status === 'failed')).length, l: 'Failed', c: 'text-primary-400' },
              { n: uploadedFiles.length, l: 'Uploads', c: 'text-cyan-400' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className={`text-lg font-bold font-mono ${s.c}`}>{s.n}</div>
                <div className={`text-[8px] ${subCls} font-mono uppercase tracking-wider`}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Uploaded Files Bar ─── */}
      {uploadedFiles.length > 0 && (
        <div className={`px-6 py-2 border-b ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'} shrink-0`}>
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${subCls} shrink-0`}>Uploaded:</span>
            {uploadedFiles.map((f, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono shrink-0 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'}`}>
                <FileText size={10} />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <span className={`${subCls} text-[8px]`}>{fmtBytes(f.size)}</span>
                <button onClick={() => removeUploadedFile(i)} title="Remove file" className="text-canvas-muted-deep hover:text-primary-400 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
            <button onClick={() => setUploadedFiles([])} className={`text-[9px] ${subCls} hover:text-primary-400 font-mono shrink-0`}>Clear all</button>
          </div>
        </div>
      )}

      {/* ─── Main Content: 2-column layout ─── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ═══ LEFT: Action Tabs + Command Input + History list ═══ */}
        <div className={`w-80 shrink-0 flex flex-col border-r ${isDarkMode ? 'border-canvas-border' : 'border-gray-200'}`}>

          {/* Action Tabs Grid */}
          <div className="p-4 space-y-3 shrink-0">
            <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${subCls}`}>Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => runAction(tab.id)}
                  disabled={isExecuting}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-center transition-all ${activeAction === tab.id
                    ? isDarkMode
                      ? 'bg-violet-500/15 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                      : 'bg-violet-100 border border-violet-400'
                    : isDarkMode
                      ? 'bg-white/[0.02] border border-canvas-border hover:bg-violet-500/10 hover:border-violet-500/20'
                      : 'bg-white border border-gray-200 hover:bg-violet-50 hover:border-violet-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeAction === tab.id ? 'text-violet-400' : valCls}`}>{tab.label}</span>
                  <span className={`text-[8px] ${subCls} leading-tight`}>{tab.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Command Input */}
          <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'} shrink-0`}>
            <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${subCls} mb-2`}>Custom Command</p>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${isDarkMode ? 'bg-white/[0.03] border-canvas-border focus-within:border-violet-500/30' : 'bg-white border-gray-200 focus-within:border-violet-400'}`}>
              <Sparkles size={14} className="text-violet-400 shrink-0" />
              <input
                ref={inputRef}
                value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeCommand()}
                placeholder="Tell the agent what to do..."
                disabled={isExecuting}
                className={`bg-transparent text-xs flex-1 outline-none disabled:opacity-50 ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-800 placeholder:text-canvas-muted'}`}
              />
              <button
                onClick={() => executeCommand()}
                disabled={!command.trim() || isExecuting}
                title="Execute command"
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 transition-colors"
              >
                <Send size={12} className="text-white" />
              </button>
            </div>
          </div>

          {/* History List (left sidebar) */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={`px-4 py-2 border-t ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'} sticky top-0 z-10 ${isDarkMode ? 'bg-canvas-card' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${subCls}`}>History ({history.length})</p>
                {history.length > 0 && (
                  <button onClick={() => setHistory([])} className={`text-[9px] ${subCls} hover:text-primary-400 font-mono`}>Clear</button>
                )}
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {history.length === 0 && !isExecuting && (
                <div className="text-center py-8">
                  <Bot size={28} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-700' : 'text-canvas-text'}`} />
                  <p className={`text-xs font-bold ${subCls}`}>No executions yet</p>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-700' : 'text-canvas-muted'}`}>
                    Select an action or type a command
                  </p>
                </div>
              )}

              {history.map(exec => (
                <button
                  key={exec.executionId}
                  onClick={() => setExpandedExec(expandedExec === exec.executionId ? null : exec.executionId)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${expandedExec === exec.executionId
                    ? isDarkMode ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-violet-50 border border-violet-300'
                    : isDarkMode ? 'bg-white/[0.02] border border-canvas-border hover:bg-white/[0.04]' : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {INTENT_ICONS[exec.intent] || INTENT_ICONS.status}
                    <span className={`text-xs font-bold capitalize flex-1 ${valCls}`}>{exec.intent}</span>
                    <span className={`text-[10px] font-mono ${exec.results?.every(r => r.status === 'completed') ? 'text-emerald-400' : exec.results?.some(r => r.status === 'failed') ? 'text-primary-400' : 'text-zinc-500'}`}>
                      {exec.plan.filter(s => s.status === 'completed').length}/{exec.plan.length}
                    </span>
                  </div>
                  <p className={`text-[9px] ${subCls} mt-1 truncate`}>{exec.summary}</p>
                  <span className={`text-[8px] ${subCls} font-mono`}>{fmtTime(exec.timestamp)}</span>
                </button>
              ))}

              {isExecuting && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'}`}>
                  <Loader2 size={14} className="text-violet-400 animate-spin" />
                  <span className="text-xs text-violet-400 flex-1">Executing...</span>
                  <button onClick={cancelExecution} title="Cancel execution" className="p-1 rounded hover:bg-white/10">
                    <X size={12} className="text-canvas-muted" />
                  </button>
                </div>
              )}

              {error && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-red-50 border border-red-200'}`}>
                  <XCircle size={14} className="text-primary-400" />
                  <span className="text-xs text-primary-400">{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Results Detail Panel ═══ */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          {!expandedExec ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 ${isDarkMode ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'}`}>
                <Bot size={36} className={isDarkMode ? 'text-violet-400/60' : 'text-violet-300'} />
              </div>
              <h3 className={`text-sm font-bold ${valCls} mb-2`}>AI Agent Ready</h3>
              <p className={`text-xs ${subCls} max-w-sm text-center leading-relaxed`}>
                Select a project, then use the action buttons or type a custom command.
                Results will appear here with full details.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {['Deploy', 'Debug', 'Security'].map((label, i) => (
                  <div key={i} className={`px-4 py-2.5 rounded-lg text-center ${isDarkMode ? 'bg-white/[0.02] border border-canvas-border' : 'bg-white border border-gray-200'}`}>
                    <span className="text-lg">{['🚀', '🐛', '🔒'][i]}</span>
                    <p className={`text-[10px] ${subCls} mt-1`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (() => {
              const exec = history.find(h => h.executionId === expandedExec);
              if (!exec) return null;
              const allSuccess = exec.results?.every(r => r.status === 'completed');
              const hasFailed = exec.results?.some(r => r.status === 'failed');

              return (
                <div className="p-6 space-y-6">
                  {/* Result Header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${allSuccess
                      ? isDarkMode ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-300'
                      : hasFailed
                        ? isDarkMode ? 'bg-primary-500/15 border border-primary-500/30' : 'bg-red-50 border border-primary-300'
                        : isDarkMode ? 'bg-violet-500/15 border border-violet-500/30' : 'bg-violet-50 border border-violet-300'
                    }`}>
                      {allSuccess ? <CheckCircle2 size={24} className="text-emerald-400" /> : hasFailed ? <XCircle size={24} className="text-primary-400" /> : (INTENT_ICONS[exec.intent] || <BarChart3 size={24} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold capitalize ${valCls}`}>{exec.intent}</h3>
                      <p className={`text-xs ${subCls} font-mono`}>{fmtTime(exec.timestamp)}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase ${allSuccess
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : hasFailed
                        ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {allSuccess ? 'Success' : hasFailed ? 'Failed' : 'Partial'}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className={`${cardCls} p-4`}>
                    <p className={`text-sm ${valCls} leading-relaxed`}>{exec.summary}</p>
                  </div>

                  {/* Steps with results */}
                  <div>
                    <h4 className={`text-[10px] font-mono font-bold uppercase tracking-widest ${subCls} mb-3`}>
                      Execution Steps ({exec.plan.filter(s => s.status === 'completed').length}/{exec.plan.length} completed)
                    </h4>
                    <div className="space-y-3">
                      {exec.plan.map((step, i) => {
                        const stepResult = exec.results?.[i];
                        return (
                          <div key={i} className={`${cardCls} p-4`}>
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">{STEP_STATUS_ICONS[step.status]}</div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${
                                  step.status === 'completed' ? valCls :
                                  step.status === 'failed' ? 'text-primary-400' :
                                  step.status === 'skipped' ? subCls : valCls
                                }`}>{step.label}</p>
                              </div>
                              <span className={`text-[10px] font-mono font-bold uppercase ${
                                step.status === 'completed' ? 'text-emerald-400' :
                                step.status === 'failed' ? 'text-primary-400' :
                                step.status === 'running' ? 'text-violet-400' : subCls
                              }`}>{step.status}</span>
                            </div>

                            {stepResult && (
                              <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-canvas-border' : 'border-gray-100'}`}>
                                {stepResult.result?.message && (
                                  <p className={`text-xs ${isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep'} leading-relaxed`}>{stepResult.result.message}</p>
                                )}
                                {stepResult.result?.detail && typeof stepResult.result.detail === 'object' && (
                                  <div className={`mt-2 p-3 rounded-lg text-[11px] font-mono overflow-x-auto ${isDarkMode ? 'bg-black/30 text-canvas-muted' : 'bg-gray-50 text-gray-600'}`}>
                                    {Array.isArray(stepResult.result.detail) ? (
                                      <ul className="space-y-1">
                                        {(stepResult.result.detail as any[]).map((item: any, j: number) => (
                                          <li key={j} className="flex items-start gap-2">
                                            <span className={`shrink-0 ${typeof item === 'object' && item?.severity === 'critical' ? 'text-primary-400' : typeof item === 'object' && item?.severity === 'high' ? 'text-orange-400' : typeof item === 'object' && item?.severity === 'warning' ? 'text-amber-400' : 'text-violet-400'}`}>•</span>
                                            <span>{typeof item === 'object' ? (item.desc || item.issue || item.file ? `${item.file ? item.file + ': ' : ''}${item.desc || item.issue || ''}${item.count ? ` (${item.count}×)` : ''}${item.severity ? ` [${item.severity}]` : ''}` : JSON.stringify(item)) : String(item)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="space-y-1">
                                        {Object.entries(stepResult.result.detail).map(([key, val]) => (
                                          <div key={key} className="flex items-start gap-2">
                                            <span className="text-violet-400 font-bold shrink-0">{key}:</span>
                                            <span>{typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {stepResult.error && (
                                  <div className={`mt-2 p-3 rounded-lg text-xs ${isDarkMode ? 'bg-primary-500/5 text-primary-400 border border-primary-500/10' : 'bg-red-50 text-primary-600 border border-red-200'}`}>
                                    {stepResult.error}
                                  </div>
                                )}
                              </div>
                            )}

                            {step.error && !stepResult?.error && (
                              <div className={`mt-2 p-2 rounded text-xs ${isDarkMode ? 'bg-primary-500/5 text-primary-400' : 'bg-red-50 text-primary-600'}`}>
                                {step.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Re-run button */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => executeCommand(exec.intent)}
                      disabled={isExecuting}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 ${isDarkMode
                        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25'
                        : 'bg-violet-100 text-violet-700 border border-violet-300 hover:bg-violet-200'
                      }`}
                    >
                      <RefreshCw size={12} />
                      Re-run {exec.intent}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentPanel;
