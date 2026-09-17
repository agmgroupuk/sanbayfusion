/**
 * AIToolsPanel — Full-screen AI Tools with real backend integration
 * Autofix, Explain, Refactor, Tests — all connected to project files
 * History stored per-project in backend
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  BookOpen,
  TestTube2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Zap,
  Play,
  Copy,
  Code2,
  Brain,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Clock,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FolderOpen,
  History,
  X,
} from 'lucide-react';
import { editorBridge } from '../services/editorBridge';

// ── Types ──────────────────────────────────────────────────────────

type TabType = 'autofix' | 'explain' | 'refactor' | 'tests' | 'history';

interface CodeIssue {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestedFix?: string;
  fixedCode?: string;
}

interface RefactorSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  file: string;
  lineRange: [number, number];
  originalCode: string;
  refactoredCode: string;
  impact: 'high' | 'medium' | 'low';
}

interface GeneratedTest {
  id: string;
  name: string;
  code: string;
  type: string;
  framework: string;
  status?: 'pass' | 'fail' | 'pending';
}

interface Explanation {
  summary: string;
  detailed: string;
  complexity?: string;
  suggestions?: string[];
  relatedConcepts?: string[];
}

interface HistoryEntry {
  id: string;
  type: string;
  timestamp: string;
  summary: string;
  file?: string;
  codePreview?: string;
  issueCount?: number;
  filesAnalyzed?: number;
  framework?: string;
  testType?: string;
}

interface AIToolsPanelProps {
  projectId: string;
  isDarkMode: boolean;
  onFileUpdated?: (path: string, content: string) => void;
  className?: string;
}

const API = '/api/ai-tools';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Canvas-Source': 'standalone' },
    ...options,
  });
  return res.json();
}

// ── Component ──────────────────────────────────────────────────────

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({ projectId, isDarkMode, onFileUpdated, className = '' }) => {
  const [tab, setTab] = useState<TabType>('autofix');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autofix state
  const [issues, setIssues] = useState<CodeIssue[]>([]);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());

  // Explain state
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [explanation, setExplanation] = useState<Explanation | null>(null);

  // Refactor state
  const [suggestions, setSuggestions] = useState<RefactorSuggestion[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Tests state
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [testFramework, setTestFramework] = useState<'jest' | 'vitest' | 'mocha' | 'playwright'>('vitest');
  const [testType, setTestType] = useState<'unit' | 'integration' | 'e2e'>('unit');
  const [testCode, setTestCode] = useState('');
  const [testFile, setTestFile] = useState('');

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Shared
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const hasProject = projectId && !/^\d+$/.test(projectId);

  const getEditorFiles = useCallback((): Record<string, string> => {
    const files: Record<string, string> = {};
    editorBridge.toProjectFiles().forEach((f: { path: string; content: string }) => {
      files[f.path] = f.content;
    });
    return files;
  }, []);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Load history on mount ───────────────────────────────────────
  useEffect(() => {
    if (!hasProject) return;
    apiFetch(`/${projectId}/history`).then(r => {
      if (r.success) setHistory(r.history || []);
    }).catch(() => {});
  }, [projectId, hasProject]);

  // ── AUTOFIX ─────────────────────────────────────────────────────
  const runAutofix = async () => {
    setLoading(true);
    setError(null);
    setIssues([]);
    setFixedIds(new Set());
    try {
      const files = getEditorFiles();
      const res = await apiFetch(`/${projectId}/autofix`, {
        method: 'POST',
        body: JSON.stringify({ files }),
      });
      if (res.success) {
        setIssues(res.issues || []);
      } else {
        setError(res.message || 'Analysis failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fixIssue = async (issue: CodeIssue) => {
    setFixingId(issue.id);
    try {
      const content = editorBridge.getFile(issue.file) || '';
      const res = await apiFetch(`/${projectId}/fix`, {
        method: 'POST',
        body: JSON.stringify({ file: issue.file, content, issue }),
      });
      if (res.success) {
        editorBridge.updateFile(res.file, res.content);
        onFileUpdated?.(res.file, res.content);
        setFixedIds(prev => new Set([...prev, issue.id]));
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFixingId(null);
    }
  };

  const fixAll = async () => {
    for (const issue of issues.filter(i => i.fixable && !fixedIds.has(i.id))) {
      await fixIssue(issue);
    }
  };

  // ── EXPLAIN ─────────────────────────────────────────────────────
  const runExplain = async () => {
    if (!selectedCode.trim()) return;
    setLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const res = await apiFetch(`/${projectId}/explain`, {
        method: 'POST',
        body: JSON.stringify({ code: selectedCode, file: selectedFile }),
      });
      if (res.success) {
        setExplanation(res.explanation);
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REFACTOR ────────────────────────────────────────────────────
  const runRefactor = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAppliedIds(new Set());
    try {
      const files = getEditorFiles();
      const res = await apiFetch(`/${projectId}/refactor`, {
        method: 'POST',
        body: JSON.stringify({ files }),
      });
      if (res.success) {
        setSuggestions(res.suggestions || []);
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyRefactoring = async (suggestion: RefactorSuggestion) => {
    setApplyingId(suggestion.id);
    try {
      const content = editorBridge.getFile(suggestion.file) || '';
      const res = await apiFetch(`/${projectId}/refactor/apply`, {
        method: 'POST',
        body: JSON.stringify({ file: suggestion.file, content, suggestion }),
      });
      if (res.success) {
        editorBridge.updateFile(res.file, res.content);
        onFileUpdated?.(res.file, res.content);
        setAppliedIds(prev => new Set([...prev, suggestion.id]));
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplyingId(null);
    }
  };

  // ── TESTS ───────────────────────────────────────────────────────
  const runTests = async () => {
    if (!testCode.trim()) return;
    setLoading(true);
    setError(null);
    setTests([]);
    try {
      const res = await apiFetch(`/${projectId}/tests`, {
        method: 'POST',
        body: JSON.stringify({ code: testCode, file: testFile, framework: testFramework, testType }),
      });
      if (res.success) {
        setTests(res.tests || []);
      } else {
        setError(res.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addTestToProject = (test: GeneratedTest) => {
    const ext = testFramework === 'playwright' ? '.spec.ts' : '.test.ts';
    const name = (test.name || 'test').replace(/\s+/g, '-').toLowerCase();
    const path = `/tests/${name}${ext}`;
    editorBridge.createFile(path, test.code);
    onFileUpdated?.(path, test.code);
  };

  // ── HISTORY ─────────────────────────────────────────────────────
  const refreshHistory = async () => {
    try {
      const res = await apiFetch(`/${projectId}/history`);
      if (res.success) setHistory(res.history || []);
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await apiFetch(`/${projectId}/history`, { method: 'DELETE' });
      setHistory([]);
    } catch {}
  };

  // File picker helper — get list of project files for selection
  const projectFiles = useMemo(() => editorBridge.getAllFilePaths(), [tab]);

  // ── No project ──────────────────────────────────────────────────
  if (!hasProject) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3 max-w-sm">
          <Wand2 className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-sm font-medium text-canvas-muted">No Project Open</h3>
          <p className="text-xs text-gray-600">Open a project to use AI Tools. Autofix, Explain, Refactor, and Test features require project files.</p>
        </div>
      </div>
    );
  }

  // ── Tabs config ─────────────────────────────────────────────────
  const tabs: { key: TabType; label: string; icon: any; color: string }[] = [
    { key: 'autofix', label: 'Autofix', icon: Wand2, color: 'violet' },
    { key: 'explain', label: 'Explain', icon: BookOpen, color: 'blue' },
    { key: 'refactor', label: 'Refactor', icon: Sparkles, color: 'pink' },
    { key: 'tests', label: 'Tests', icon: TestTube2, color: 'emerald' },
    { key: 'history', label: 'History', icon: History, color: 'gray' },
  ];

  const impactColors: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-gray-500/10 text-canvas-muted border-gray-500/20',
  };

  const historyIcons: Record<string, any> = {
    autofix: AlertCircle,
    fix: Zap,
    explain: BookOpen,
    refactor: Sparkles,
    'refactor-apply': ArrowRight,
    tests: TestTube2,
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-canvas-border shrink-0">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${
                tab === t.key
                  ? `bg-${t.color}-500/15 text-${t.color}-400 border border-${t.color}-500/25`
                  : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
              }`}
              style={tab === t.key ? {
                backgroundColor: t.color === 'violet' ? 'rgba(139,92,246,0.15)' :
                  t.color === 'blue' ? 'rgba(59,130,246,0.15)' :
                  t.color === 'pink' ? 'rgba(236,72,153,0.15)' :
                  t.color === 'emerald' ? 'rgba(16,185,129,0.15)' :
                  'rgba(107,114,128,0.15)',
                color: t.color === 'violet' ? '#a78bfa' :
                  t.color === 'blue' ? '#60a5fa' :
                  t.color === 'pink' ? '#f472b6' :
                  t.color === 'emerald' ? '#34d399' :
                  '#9ca3af',
                borderColor: t.color === 'violet' ? 'rgba(139,92,246,0.25)' :
                  t.color === 'blue' ? 'rgba(59,130,246,0.25)' :
                  t.color === 'pink' ? 'rgba(236,72,153,0.25)' :
                  t.color === 'emerald' ? 'rgba(16,185,129,0.25)' :
                  'rgba(107,114,128,0.25)',
              } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 bg-primary-500/10 border-b border-primary-500/20 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-primary-400 shrink-0" />
          <span className="text-xs text-primary-400 flex-1 truncate">{error}</span>
          <button onClick={() => setError(null)} className="text-primary-400/60 hover:text-primary-400">&times;</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* ═══════════ AUTOFIX TAB ═══════════ */}
        {tab === 'autofix' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Action bar */}
            <div className="px-4 py-3 border-b border-canvas-border flex items-center gap-3 shrink-0">
              <button
                onClick={runAutofix}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:opacity-90 disabled:opacity-40 transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {loading ? 'Analyzing...' : 'Analyze Project'}
              </button>
              {issues.filter(i => i.fixable && !fixedIds.has(i.id)).length > 0 && (
                <button onClick={fixAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition">
                  <Sparkles className="w-3 h-3" />
                  Fix All ({issues.filter(i => i.fixable && !fixedIds.has(i.id)).length})
                </button>
              )}
              <div className="flex-1" />
              {issues.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary-400">{issues.filter(i => i.severity === 'error').length} errors</span>
                  <span className="text-amber-400">{issues.filter(i => i.severity === 'warning').length} warnings</span>
                  <span className="text-emerald-400">{fixedIds.size} fixed</span>
                </div>
              )}
            </div>

            {/* Issues list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {issues.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <Check className="w-10 h-10 text-emerald-400/30" />
                  <span className="text-xs text-canvas-muted-deep">No issues found</span>
                  <span className="text-[10px] text-gray-600">Click "Analyze Project" to scan all files</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {issues.map((issue, i) => {
                    const isFixed = fixedIds.has(issue.id);
                    const isFixing = fixingId === issue.id;
                    const isExpanded = expandedId === issue.id;
                    return (
                      <div key={issue.id} className={`${isFixed ? 'opacity-40' : ''}`}>
                        <div
                          className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer group flex items-start gap-3"
                          onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                        >
                          {issue.severity === 'error'
                            ? <AlertCircle className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
                            : <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${isFixed ? 'line-through text-canvas-muted-deep' : 'text-canvas-text'}`}>{issue.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-600 font-mono flex items-center gap-0.5">
                                <FileText className="w-2.5 h-2.5" />
                                {issue.file}:{issue.line}
                              </span>
                              {issue.suggestedFix && (
                                <span className="text-[10px] text-violet-400/60 truncate max-w-[200px]">{issue.suggestedFix}</span>
                              )}
                            </div>
                          </div>
                          {isFixed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : issue.fixable ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); fixIssue(issue); }}
                              disabled={isFixing}
                              className="px-2.5 py-1 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition flex items-center gap-1 opacity-0 group-hover:opacity-100"
                            >
                              {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              Fix
                            </button>
                          ) : null}
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                        </div>
                        <AnimatePresence>
                          {isExpanded && issue.fixedCode && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-3">
                                <pre className="p-3 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10 text-[11px] text-emerald-300 font-mono overflow-x-auto">{issue.fixedCode}</pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ EXPLAIN TAB ═══════════ */}
        {tab === 'explain' && (
          <div className="flex-1 flex min-h-0">
            {/* Left — code input */}
            <div className="w-96 shrink-0 border-r border-canvas-border flex flex-col">
              <div className="px-4 py-3 border-b border-canvas-border shrink-0">
                <h4 className="text-xs font-medium text-canvas-muted mb-2">Select file or paste code</h4>
                <select
                  value={selectedFile}
                  onChange={(e) => {
                    setSelectedFile(e.target.value);
                    const content = editorBridge.getFile(e.target.value);
                    if (content) setSelectedCode(content);
                  }}
                  className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-canvas-text outline-none focus:border-blue-500/30 mb-2"
                >
                  <option value="" className="bg-canvas-card">-- Select a file --</option>
                  {projectFiles.map(f => <option key={f} value={f} className="bg-canvas-card">{f}</option>)}
                </select>
                <button
                  onClick={runExplain}
                  disabled={loading || !selectedCode.trim()}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white disabled:opacity-30 hover:opacity-90 transition flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  {loading ? 'Analyzing...' : 'Explain Code'}
                </button>
              </div>
              <textarea
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                placeholder="Paste code here or select a file above..."
                className="flex-1 w-full bg-transparent px-4 py-3 text-[12px] text-canvas-text font-mono outline-none resize-none placeholder-gray-600"
                style={{ scrollbarWidth: 'thin' }}
              />
            </div>

            {/* Right — explanation */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              {!explanation && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <BookOpen className="w-10 h-10 text-blue-400/20" />
                  <span className="text-xs text-canvas-muted-deep">Select code and click "Explain Code"</span>
                  <span className="text-[10px] text-gray-600">Get detailed explanations, complexity analysis, and improvement tips</span>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Brain className="w-8 h-8 text-violet-400" />
                  </motion.div>
                  <span className="text-xs text-canvas-muted">Analyzing code...</span>
                </div>
              ) : explanation ? (
                <div className="space-y-5 max-w-2xl">
                  {/* Summary */}
                  <div>
                    <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Summary
                    </h3>
                    <p className="text-sm text-canvas-text leading-relaxed">{explanation.summary}</p>
                  </div>

                  {/* Detailed */}
                  <div>
                    <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-violet-400" /> Detailed Explanation
                    </h3>
                    <div className="text-xs text-canvas-muted leading-relaxed whitespace-pre-wrap">{explanation.detailed}</div>
                  </div>

                  {/* Complexity */}
                  {explanation.complexity && (
                    <div className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-canvas-border">
                      <BarChart3 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-canvas-muted-deep uppercase tracking-wider">Complexity</span>
                        <p className="text-xs text-canvas-text mt-0.5">{explanation.complexity}</p>
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {explanation.suggestions && explanation.suggestions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Improvement Tips
                      </h3>
                      <div className="space-y-1.5">
                        {explanation.suggestions.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-canvas-muted">
                            <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concepts */}
                  {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-canvas-muted uppercase tracking-wider mb-2">Related Concepts</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {explanation.relatedConcepts.map((c: string) => (
                          <span key={c} className="px-2.5 py-1 rounded-full text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ═══════════ REFACTOR TAB ═══════════ */}
        {tab === 'refactor' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-canvas-border flex items-center gap-3 shrink-0">
              <button
                onClick={runRefactor}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-pink-600 to-violet-600 text-white hover:opacity-90 disabled:opacity-40 transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {loading ? 'Analyzing...' : 'Analyze for Refactoring'}
              </button>
              <div className="flex-1" />
              {suggestions.length > 0 && (
                <span className="text-xs text-canvas-muted-deep">{suggestions.length - appliedIds.size} remaining</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {suggestions.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <Sparkles className="w-10 h-10 text-pink-400/20" />
                  <span className="text-xs text-canvas-muted-deep">No refactoring suggestions</span>
                  <span className="text-[10px] text-gray-600">Click "Analyze for Refactoring" to scan your code</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {suggestions.filter(s => !appliedIds.has(s.id)).map(suggestion => {
                    const isExpand = expandedId === suggestion.id;
                    const isApplying = applyingId === suggestion.id;
                    return (
                      <div key={suggestion.id}>
                        <div
                          className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer group flex items-start gap-3"
                          onClick={() => setExpandedId(isExpand ? null : suggestion.id)}
                        >
                          <Sparkles className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-200 font-medium">{suggestion.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${impactColors[suggestion.impact] || impactColors.low}`}>
                                {suggestion.impact}
                              </span>
                              <span className="text-[10px] text-gray-600 bg-white/[0.04] px-1.5 rounded">{suggestion.type}</span>
                            </div>
                            <p className="text-[11px] text-canvas-muted-deep mt-0.5 line-clamp-1">{suggestion.description}</p>
                            <span className="text-[10px] text-gray-600 font-mono flex items-center gap-0.5 mt-0.5">
                              <FileText className="w-2.5 h-2.5" />
                              {suggestion.file}:{suggestion.lineRange[0]}-{suggestion.lineRange[1]}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); applyRefactoring(suggestion); }}
                            disabled={isApplying}
                            className="px-2.5 py-1 rounded text-[10px] font-medium bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition flex items-center gap-1 opacity-0 group-hover:opacity-100"
                          >
                            {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                            Apply
                          </button>
                          {isExpand ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                        </div>
                        <AnimatePresence>
                          {isExpand && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 flex gap-3">
                                {/* Before */}
                                <div className="flex-1 rounded-lg border border-primary-500/10 overflow-hidden">
                                  <div className="px-3 py-1.5 bg-primary-500/[0.05] text-[10px] text-primary-400 font-medium">Before</div>
                                  <pre className="p-3 text-[11px] text-canvas-muted-deep font-mono overflow-x-auto whitespace-pre-wrap">{suggestion.originalCode}</pre>
                                </div>
                                {/* After */}
                                <div className="flex-1 rounded-lg border border-emerald-500/10 overflow-hidden">
                                  <div className="px-3 py-1.5 bg-emerald-500/[0.05] text-[10px] text-emerald-400 font-medium">After</div>
                                  <pre className="p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">{suggestion.refactoredCode}</pre>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TESTS TAB ═══════════ */}
        {tab === 'tests' && (
          <div className="flex-1 flex min-h-0">
            {/* Left — config + code */}
            <div className="w-96 shrink-0 border-r border-canvas-border flex flex-col">
              <div className="px-4 py-3 border-b border-canvas-border shrink-0 space-y-2">
                {/* Framework */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-canvas-muted-deep w-16">Framework:</span>
                  <div className="flex gap-0.5 flex-1">
                    {(['jest', 'vitest', 'mocha', 'playwright'] as const).map(fw => (
                      <button
                        key={fw}
                        onClick={() => setTestFramework(fw)}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition ${
                          testFramework === fw ? 'bg-white/[0.08] text-white border border-canvas-border' : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
                        }`}
                      >
                        {fw.charAt(0).toUpperCase() + fw.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Type */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-canvas-muted-deep w-16">Type:</span>
                  <div className="flex gap-0.5 flex-1">
                    {(['unit', 'integration', 'e2e'] as const).map(tt => (
                      <button
                        key={tt}
                        onClick={() => setTestType(tt)}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-medium capitalize transition ${
                          testType === tt ? 'bg-white/[0.08] text-white border border-canvas-border' : 'text-canvas-muted-deep hover:text-canvas-text border border-transparent'
                        }`}
                      >
                        {tt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* File selector */}
                <select
                  value={testFile}
                  onChange={(e) => {
                    setTestFile(e.target.value);
                    const content = editorBridge.getFile(e.target.value);
                    if (content) setTestCode(content);
                  }}
                  className="w-full bg-white/[0.04] border border-canvas-border rounded-lg px-3 py-1.5 text-xs text-canvas-text outline-none focus:border-emerald-500/30"
                >
                  <option value="" className="bg-canvas-card">-- Select a file --</option>
                  {projectFiles.map(f => <option key={f} value={f} className="bg-canvas-card">{f}</option>)}
                </select>
                <button
                  onClick={runTests}
                  disabled={loading || !testCode.trim()}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white disabled:opacity-30 hover:opacity-90 transition flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {loading ? 'Generating...' : 'Generate Tests'}
                </button>
              </div>
              <textarea
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Paste code to test or select a file above..."
                className="flex-1 w-full bg-transparent px-4 py-3 text-[12px] text-canvas-text font-mono outline-none resize-none placeholder-gray-600"
                style={{ scrollbarWidth: 'thin' }}
              />
            </div>

            {/* Right — generated tests */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {tests.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <TestTube2 className="w-10 h-10 text-emerald-400/20" />
                  <span className="text-xs text-canvas-muted-deep">No tests generated yet</span>
                  <span className="text-[10px] text-gray-600">Select code and click "Generate Tests"</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {tests.map(test => {
                    const isExp = expandedId === test.id;
                    return (
                      <div key={test.id}>
                        <div
                          className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer group flex items-center gap-3"
                          onClick={() => setExpandedId(isExp ? null : test.id)}
                        >
                          <TestTube2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-canvas-text">{test.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-600">{test.framework} • {test.type}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyText(test.id, test.code); }}
                              className="p-1 text-canvas-muted-deep hover:text-canvas-text"
                              title="Copy"
                            >
                              {copied === test.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); addTestToProject(test); }}
                              className="p-1 text-canvas-muted-deep hover:text-emerald-400"
                              title="Add to project"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          {isExp ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                        </div>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-3">
                                <pre className="p-3 rounded-lg bg-white/[0.02] border border-canvas-border text-[11px] text-canvas-text font-mono overflow-x-auto whitespace-pre-wrap">{test.code}</pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {tab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-canvas-border flex items-center gap-3 shrink-0">
              <button onClick={refreshHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-canvas-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
              <div className="flex-1" />
              {history.length > 0 && (
                <button onClick={clearHistory} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10 transition">
                  <Trash2 className="w-3 h-3" /> Clear History
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                  <History className="w-10 h-10 text-gray-600/30" />
                  <span className="text-xs text-canvas-muted-deep">No history yet</span>
                  <span className="text-[10px] text-gray-600">Operations from Autofix, Explain, Refactor, and Tests will appear here</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {history.map((entry, i) => {
                    const Icon = historyIcons[entry.type] || Clock;
                    return (
                      <div key={entry.id || i} className="px-4 py-3 hover:bg-white/[0.02] flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-canvas-muted-deep" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 bg-white/[0.04] px-1.5 rounded uppercase font-bold">{entry.type}</span>
                            <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-canvas-text mt-0.5">{entry.summary}</p>
                          {entry.file && <span className="text-[10px] text-gray-600 font-mono">{entry.file}</span>}
                          {entry.codePreview && <span className="text-[10px] text-gray-600 block truncate">{entry.codePreview}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-canvas-card border border-canvas-border rounded-lg px-4 py-2 pointer-events-auto">
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            <span className="text-xs text-canvas-text">Processing with AI...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIToolsPanel;
