/**
 * BuildPanel — Context-aware build pipeline
 * Shows project context, auto-detects framework, runs real server builds with SSE logs
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Package,
  Shield,
  FileSearch,
  Download,
  AlertTriangle,
  Settings,
  FileCode,
  Bug,
  BarChart3,
  Archive,
  Info,
  Code2,
  Layers,
  Folder,
  Terminal,
  Cpu,
  Zap,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink,
  Hash,
  GitBranch,
} from 'lucide-react';
import { useEditorStore } from '../../services/editorBridge';
import { buildService, type BuildLogEvent } from '../../services/buildService';

// ── Types ──────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'running' | 'success' | 'warning' | 'failed' | 'skipped';

interface BuildStage {
  id: string;
  name: string;
  status: StageStatus;
  duration?: number;
  output?: string[];
  description?: string;
}

interface ProjectContext {
  framework: { name: string; icon: string; id: string; color: string };
  language: string;
  fileCount: number;
  totalLines: number;
  totalSize: number;
  hasPkg: boolean;
  hasTests: boolean;
  hasLint: boolean;
  hasTypeScript: boolean;
  buildCommand: string;
  startCommand: string;
  depCount: number;
  devDepCount: number;
  fileBreakdown: { ext: string; count: number; size: number }[];
  entryFile: string;
}

interface BuildPanelProps {
  projectId: string;
  onDeployReady?: (buildId: string) => void;
  className?: string;
}

// ── Analyze types ──────────────────────────────────────────────────

interface AnalyzeIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  rule: string;
  category: 'security' | 'lint' | 'quality' | 'syntax';
}

interface AnalyzeReport {
  timestamp: number;
  duration: number;
  issues: AnalyzeIssue[];
  metrics: {
    qualityScore: number;
    errors: number;
    warnings: number;
    infos: number;
    securityIssues: number;
    syntaxErrors: number;
  };
}

// ── Security patterns ──────────────────────────────────────────────

const SECURITY_PATTERNS: { pattern: RegExp; severity: 'error' | 'warning'; message: string; rule: string }[] = [
  { pattern: /\beval\s*\(/, severity: 'error', message: 'eval() usage — potential code injection risk', rule: 'no-eval' },
  { pattern: /innerHTML\s*=/, severity: 'warning', message: 'Direct innerHTML assignment — potential XSS', rule: 'no-inner-html' },
  { pattern: /document\.write\s*\(/, severity: 'warning', message: 'document.write() — can cause XSS', rule: 'no-document-write' },
  { pattern: /dangerouslySetInnerHTML/, severity: 'warning', message: 'dangerouslySetInnerHTML — ensure sanitized', rule: 'react-no-danger' },
  { pattern: /localStorage\.setItem\(.*password/i, severity: 'error', message: 'Storing passwords in localStorage', rule: 'no-password-storage' },
  { pattern: /https?:\/\/[^\s'"]+api[_-]?key/i, severity: 'error', message: 'Possible API key exposed in URL', rule: 'no-exposed-secrets' },
  { pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}/i, severity: 'error', message: 'Possible hardcoded secret/API key', rule: 'no-hardcoded-secrets' },
];

// ── Lint patterns ──────────────────────────────────────────────────

const LINT_PATTERNS: { pattern: RegExp; severity: 'warning' | 'error'; message: string; rule: string; fileTypes?: string[] }[] = [
  { pattern: /\bvar\s+\w/, severity: 'warning', message: 'Use let/const instead of var', rule: 'no-var', fileTypes: ['js', 'ts', 'jsx', 'tsx'] },
  { pattern: /==(?!=)/, severity: 'warning', message: 'Use === instead of ==', rule: 'eqeqeq', fileTypes: ['js', 'ts', 'jsx', 'tsx'] },
  { pattern: /!=(?!=)/, severity: 'warning', message: 'Use !== instead of !=', rule: 'eqeqeq', fileTypes: ['js', 'ts', 'jsx', 'tsx'] },
  { pattern: /;\s*;/, severity: 'warning', message: 'Double semicolons', rule: 'no-extra-semi' },
  { pattern: /new\s+Array\s*\(/, severity: 'warning', message: 'Use [] instead of new Array()', rule: 'no-array-constructor' },
  { pattern: /\/\/\s*@ts-ignore/, severity: 'warning', message: '@ts-ignore suppresses type checking', rule: 'no-ts-ignore', fileTypes: ['ts', 'tsx'] },
  { pattern: /console\.(log|debug|info)\s*\(/, severity: 'info', message: 'Console statement left in code', rule: 'no-console', fileTypes: ['js', 'ts', 'jsx', 'tsx'] },
];

function runAnalysis(files: Record<string, string>): AnalyzeReport {
  const startTime = Date.now();
  const issues: AnalyzeIssue[] = [];

  for (const [path, content] of Object.entries(files)) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const lines = content.split('\n');

    // Syntax checks
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      let braceCount = 0, parenCount = 0;
      for (const line of lines) {
        const stripped = line.replace(/\/\/.*$/, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
        for (const ch of stripped) {
          if (ch === '{') braceCount++; else if (ch === '}') braceCount--;
          if (ch === '(') parenCount++; else if (ch === ')') parenCount--;
        }
      }
      if (braceCount !== 0) issues.push({ severity: 'error', file: path, message: `Unmatched braces (${braceCount > 0 ? braceCount + ' unclosed' : Math.abs(braceCount) + ' extra'})`, rule: 'syntax', category: 'syntax' });
      if (parenCount !== 0) issues.push({ severity: 'warning', file: path, message: `Unmatched parentheses`, rule: 'syntax', category: 'syntax' });
    }

    if (ext === 'json') {
      try { JSON.parse(content); } catch (e: any) {
        issues.push({ severity: 'error', file: path, message: `Invalid JSON: ${e.message?.split('\n')[0]}`, rule: 'json-parse', category: 'syntax' });
      }
    }

    if (ext === 'html' && !content.includes('<!DOCTYPE') && !content.includes('<!doctype')) {
      issues.push({ severity: 'info', file: path, message: 'Missing <!DOCTYPE html>', rule: 'doctype', category: 'quality' });
    }

    // Security scan
    for (let i = 0; i < lines.length; i++) {
      for (const rule of SECURITY_PATTERNS) {
        if (rule.pattern.test(lines[i])) {
          issues.push({ severity: rule.severity, file: path, line: i + 1, message: rule.message, rule: rule.rule, category: 'security' });
        }
      }
    }

    // Lint scan
    for (let i = 0; i < lines.length; i++) {
      for (const rule of LINT_PATTERNS) {
        if (rule.fileTypes && !rule.fileTypes.includes(ext)) continue;
        if (rule.pattern.test(lines[i])) {
          issues.push({ severity: rule.severity, file: path, line: i + 1, message: rule.message, rule: rule.rule, category: 'lint' });
        }
      }
    }

    // Quality checks
    if (lines.length > 500) {
      issues.push({ severity: 'info', file: path, message: `File has ${lines.length} lines — consider splitting`, rule: 'max-lines', category: 'quality' });
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;
  let score = 100;
  score -= errors * 10;
  score -= warnings * 3;
  score -= issues.filter(i => i.category === 'security').length * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    timestamp: Date.now(),
    duration: Date.now() - startTime,
    issues,
    metrics: {
      qualityScore: score,
      errors,
      warnings,
      infos,
      securityIssues: issues.filter(i => i.category === 'security').length,
      syntaxErrors: issues.filter(i => i.category === 'syntax').length,
    },
  };
}

// ── Framework Detector ─────────────────────────────────────────────

const FRAMEWORK_MAP: { check: (deps: Record<string, string>) => boolean; name: string; icon: string; id: string; color: string }[] = [
  { check: d => !!d.next, name: 'Next.js', icon: '▲', id: 'nextjs', color: '#ffffff' },
  { check: d => !!d['@remix-run/react'], name: 'Remix', icon: '💿', id: 'remix', color: '#121212' },
  { check: d => !!d.astro, name: 'Astro', icon: '🚀', id: 'astro', color: '#ff5d01' },
  { check: d => !!(d.svelte || d['@sveltejs/kit']), name: 'SvelteKit', icon: '🔥', id: 'svelte', color: '#ff3e00' },
  { check: d => !!d.vue, name: 'Vue 3', icon: '💚', id: 'vue', color: '#42b883' },
  { check: d => !!d['@angular/core'], name: 'Angular', icon: '🅰️', id: 'angular', color: '#dd0031' },
  { check: d => !!(d.react && d.vite), name: 'Vite + React', icon: '⚡', id: 'vite-react', color: '#646cff' },
  { check: d => !!d.react, name: 'React', icon: '⚛️', id: 'react', color: '#61dafb' },
  { check: d => !!d.express, name: 'Express', icon: '🟢', id: 'express', color: '#68a063' },
  { check: d => !!d.fastify, name: 'Fastify', icon: '⚡', id: 'fastify', color: '#000000' },
];

function analyzeProject(files: Record<string, string>): ProjectContext {
  const filePaths = Object.keys(files);
  let pkg: any = {};
  let hasPkg = false;

  const pkgEntry = Object.entries(files).find(([f]) => f.endsWith('package.json'));
  if (pkgEntry) {
    hasPkg = true;
    try { pkg = JSON.parse(pkgEntry[1]); } catch { }
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  let framework = { name: 'Static HTML', icon: '🌐', id: 'html', color: '#e34c26' };

  for (const fm of FRAMEWORK_MAP) {
    if (fm.check(deps)) { framework = fm; break; }
  }
  if (framework.id === 'html' && filePaths.some(f => f.endsWith('.py'))) {
    framework = { name: 'Python', icon: '🐍', id: 'python', color: '#3776ab' };
  }

  // Language breakdown
  const langCounts: Record<string, number> = {};
  const extBreakdown: Record<string, { count: number; size: number }> = {};
  let totalLines = 0;
  let totalSize = 0;

  for (const [p, content] of Object.entries(files)) {
    const ext = p.split('.').pop()?.toLowerCase() || 'other';
    const size = new Blob([content]).size;
    totalLines += content.split('\n').length;
    totalSize += size;
    langCounts[ext] = (langCounts[ext] || 0) + 1;
    if (!extBreakdown[ext]) extBreakdown[ext] = { count: 0, size: 0 };
    extBreakdown[ext].count++;
    extBreakdown[ext].size += size;
  }

  const language = Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0]?.[0]?.toUpperCase() || 'Unknown';
  const fileBreakdown = Object.entries(extBreakdown)
    .map(([ext, data]) => ({ ext, ...data }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 6);

  const entryFile = filePaths.find(f => /^(index\.(html|tsx|jsx|ts|js)|app\.(tsx|jsx|ts|js)|main\.(tsx|ts|js)|src\/index|src\/main|src\/App)/i.test(f)) || filePaths[0] || '';

  return {
    framework,
    language,
    fileCount: filePaths.length,
    totalLines,
    totalSize,
    hasPkg,
    hasTests: !!(pkg.scripts?.test && !pkg.scripts.test.includes('no test specified')),
    hasLint: !!(deps.eslint || pkg.scripts?.lint),
    hasTypeScript: !!deps.typescript,
    buildCommand: pkg.scripts?.build || (framework.id === 'html' ? '(static — no build step)' : 'none'),
    startCommand: pkg.scripts?.start || pkg.scripts?.dev || 'none',
    depCount: Object.keys(pkg.dependencies || {}).length,
    devDepCount: Object.keys(pkg.devDependencies || {}).length,
    fileBreakdown,
    entryFile,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const SERVER_STAGES = [
  { id: 'detect', name: 'Detect Framework', icon: FileSearch, desc: 'Identify project type and build tools' },
  { id: 'install', name: 'Install Dependencies', icon: Package, desc: 'Run npm install for all packages' },
  { id: 'lint', name: 'Lint & Type Check', icon: Bug, desc: 'ESLint + TypeScript compiler checks' },
  { id: 'test', name: 'Run Tests', icon: CheckCircle2, desc: 'Execute test suite' },
  { id: 'build', name: 'Build Project', icon: Layers, desc: 'Compile and bundle for production' },
  { id: 'security', name: 'Security Audit', icon: Shield, desc: 'Scan for known vulnerabilities' },
  { id: 'package', name: 'Package Output', icon: Archive, desc: 'Measure output and finalize artifacts' },
];

const STATUS_COLORS: Record<StageStatus, string> = {
  pending: 'text-zinc-500 bg-white/5',
  running: 'text-blue-300 bg-blue-500/20',
  success: 'text-emerald-300 bg-emerald-500/20',
  warning: 'text-yellow-300 bg-yellow-500/20',
  failed: 'text-primary-300 bg-primary-500/20',
  skipped: 'text-zinc-500 bg-white/5',
};

const STATUS_ICONS: Record<StageStatus, React.ReactNode> = {
  pending: <Clock size={10} />,
  running: <Loader2 size={10} className="animate-spin" />,
  success: <CheckCircle2 size={10} />,
  warning: <AlertTriangle size={10} />,
  failed: <XCircle size={10} />,
  skipped: <ChevronRight size={10} />,
};

// ── Component ──────────────────────────────────────────────────────

const BuildPanel: React.FC<BuildPanelProps> = ({ projectId, onDeployReady, className = '' }) => {
  const [buildMode, setBuildMode] = useState<'build' | 'analyze'>('build');
  const [isRunning, setIsRunning] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [serverStages, setServerStages] = useState<BuildStage[]>(
    SERVER_STAGES.map(s => ({ id: s.id, name: s.name, status: 'pending' as StageStatus, description: s.desc }))
  );
  const [serverBuildId, setServerBuildId] = useState<string | null>(null);
  const [serverBuildStatus, setServerBuildStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'cancelled'>('idle');
  const [buildDuration, setBuildDuration] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const sseRef = useRef<{ close: () => void } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const buildStartRef = useRef<number>(0);

  // Analyze state
  const [analyzeReport, setAnalyzeReport] = useState<AnalyzeReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeFilter, setAnalyzeFilter] = useState<'all' | 'security' | 'lint' | 'syntax' | 'quality'>('all');

  const files = useEditorStore(s => s.files);
  const project = useMemo(() => analyzeProject(files), [files]);
  const hasFiles = project.fileCount > 0;

  // SSE cleanup on unmount
  useEffect(() => {
    return () => { sseRef.current?.close(); };
  }, []);

  // ── Server Build ─────────────────────────────────────────────

  const runServerBuild = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setShowLogs(true);
    setServerLogs([]);
    setServerBuildId(null);
    setBuildDuration(null);
    setServerBuildStatus('running');
    buildStartRef.current = Date.now();
    setServerStages(SERVER_STAGES.map(s => ({ id: s.id, name: s.name, status: 'pending' as StageStatus, description: s.desc })));

    try {
      const { build } = await buildService.startBuild({ projectId, files });
      setServerBuildId(build.id);
      setServerLogs(prev => [...prev, `Build ${build.id.slice(0, 8)} started for ${project.framework.name} project`]);

      sseRef.current = buildService.subscribeLogs(
        build.id,
        (event: BuildLogEvent) => {
          switch (event.type) {
            case 'connected':
              setServerLogs(prev => [...prev, 'Connected to build server']);
              break;
            case 'stage-start':
              setServerStages(prev => prev.map(s =>
                s.id === event.stage ? { ...s, status: 'running' } : s
              ));
              setServerLogs(prev => [...prev, `▸ ${event.name || event.stage}...`]);
              break;
            case 'stage-complete':
              setServerStages(prev => prev.map(s =>
                s.id === event.stage ? { ...s, status: (event.status === 'warning' ? 'warning' : 'success') as StageStatus, duration: event.duration } : s
              ));
              setServerLogs(prev => [...prev, `✓ ${event.name || event.stage} (${event.duration}ms)`]);
              break;
            case 'stage-error':
              setServerStages(prev => prev.map(s =>
                s.id === event.stage ? { ...s, status: 'failed', duration: event.duration } : s
              ));
              setServerLogs(prev => [...prev, `✗ ${event.name || event.stage} failed: ${event.message || ''}`]);
              break;
            case 'log':
              if (event.message) setServerLogs(prev => [...prev, event.message!]);
              break;
            case 'complete':
              setServerBuildStatus('success');
              setBuildDuration(Math.round((Date.now() - buildStartRef.current) / 1000));
              setServerLogs(prev => [...prev, '', `✓ Build complete`]);
              break;
            case 'error':
              setServerBuildStatus('failed');
              setBuildDuration(Math.round((Date.now() - buildStartRef.current) / 1000));
              setServerLogs(prev => [...prev, '', `✗ Build failed: ${event.message || 'unknown error'}`]);
              break;
            case 'cancelled':
              setServerBuildStatus('cancelled');
              setServerLogs(prev => [...prev, '', '⊘ Build cancelled']);
              break;
          }
          setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        },
        (_finalStatus: string) => {
          setIsRunning(false);
          sseRef.current = null;
        },
        (error: Error) => {
          setServerLogs(prev => [...prev, `Connection error: ${error.message}`]);
          setServerBuildStatus('failed');
          setIsRunning(false);
          sseRef.current = null;
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setServerLogs(prev => [...prev, `Failed to start build: ${msg}`]);
      setServerBuildStatus('failed');
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    if (serverBuildId) {
      buildService.cancelBuild(serverBuildId).catch(() => { });
      sseRef.current?.close();
      sseRef.current = null;
      setServerBuildStatus('cancelled');
      setServerStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'skipped' } : s));
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify({ projectId, files, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Client-side Analyze ──────────────────────────────────────

  const runAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    // Small delay so the UI shows "analyzing" state
    await new Promise(r => setTimeout(r, 100));
    const report = runAnalysis(files);
    setAnalyzeReport(report);
    setIsAnalyzing(false);
  }, [files, isAnalyzing]);

  const filteredIssues = useMemo(() => {
    if (!analyzeReport) return [];
    if (analyzeFilter === 'all') return analyzeReport.issues;
    return analyzeReport.issues.filter(i => i.category === analyzeFilter);
  }, [analyzeReport, analyzeFilter]);

  // Determine which stages will actually run for this project
  const stageRelevance = useMemo(() => {
    const map: Record<string, { relevant: boolean; reason: string }> = {};
    map['detect'] = { relevant: true, reason: `Detect ${project.framework.name} configuration` };
    map['install'] = { relevant: project.hasPkg, reason: project.hasPkg ? `Install ${project.depCount + project.devDepCount} packages` : 'No package.json — will skip' };
    map['lint'] = { relevant: project.hasLint || project.hasTypeScript, reason: (project.hasLint ? 'ESLint' : '') + (project.hasLint && project.hasTypeScript ? ' + ' : '') + (project.hasTypeScript ? 'TypeScript' : '') || 'No lint tools — will skip' };
    map['test'] = { relevant: project.hasTests, reason: project.hasTests ? 'Run test suite' : 'No test script — will skip' };
    map['build'] = { relevant: project.buildCommand !== 'none' && project.buildCommand !== '(static — no build step)', reason: project.buildCommand !== 'none' ? `Run: ${project.buildCommand}` : 'No build command — will skip' };
    map['security'] = { relevant: project.hasPkg, reason: project.hasPkg ? 'npm audit vulnerability scan' : 'No package.json — will skip' };
    map['package'] = { relevant: true, reason: 'Measure output and prepare artifacts' };
    return map;
  }, [project]);

  const activeStageCount = Object.values(stageRelevance).filter(s => s.relevant).length;
  const completedStages = serverStages.filter(s => s.status === 'success' || s.status === 'warning').length;
  const failedStages = serverStages.filter(s => s.status === 'failed').length;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-canvas-border bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
            <Package size={16} className="text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{buildMode === 'build' ? 'Build & Deploy' : 'Code Analysis'}</span>
              {isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded-full text-[10px] text-blue-300">
                  <Loader2 size={10} className="animate-spin" /> Building...
                </span>
              )}
              {isAnalyzing && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full text-[10px] text-purple-300">
                  <Loader2 size={10} className="animate-spin" /> Analyzing...
                </span>
              )}
              {!isRunning && serverBuildStatus === 'success' && buildMode === 'build' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full text-[10px] text-emerald-300">
                  <CheckCircle2 size={10} /> Success {buildDuration && `(${buildDuration}s)`}
                </span>
              )}
              {!isRunning && serverBuildStatus === 'failed' && buildMode === 'build' && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-500/20 rounded-full text-[10px] text-primary-300">
                  <XCircle size={10} /> Failed
                </span>
              )}
              {analyzeReport && !isAnalyzing && buildMode === 'analyze' && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${analyzeReport.metrics.errors > 0 ? 'bg-primary-500/20 text-primary-300' : analyzeReport.metrics.warnings > 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {analyzeReport.metrics.errors > 0 ? <XCircle size={10} /> : analyzeReport.metrics.warnings > 0 ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                  {analyzeReport.metrics.errors > 0 ? `${analyzeReport.metrics.errors} errors` : analyzeReport.metrics.warnings > 0 ? `${analyzeReport.metrics.warnings} warnings` : 'Clean'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/30 mt-0.5">
              {hasFiles ? `${project.framework.icon} ${project.framework.name} · ${project.fileCount} files · ${formatBytes(project.totalSize)}` : 'No project loaded'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center bg-black/30 rounded-lg p-0.5 mr-1">
            <button
              onClick={() => !isRunning && setBuildMode('build')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${buildMode === 'build' ? 'bg-primary-600/40 text-primary-300' : 'text-zinc-500 hover:text-zinc-300'}`}
            >Build</button>
            <button
              onClick={() => !isRunning && setBuildMode('analyze')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${buildMode === 'analyze' ? 'bg-purple-600/40 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'}`}
            >Analyze</button>
          </div>
          {buildMode === 'build' && serverBuildStatus !== 'idle' && !isRunning && (
            <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-all" title="Export Project">
              <Download size={14} />
            </button>
          )}
          {buildMode === 'build' ? (
            isRunning ? (
              <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600/30 hover:bg-primary-600/50 rounded-lg text-xs font-medium text-primary-300 transition-colors border border-primary-500/20">
                <Square size={12} /> Stop
              </button>
            ) : (
              <button
                onClick={runServerBuild}
                disabled={!hasFiles}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${hasFiles ? 'bg-primary-600 hover:bg-primary-500 text-white' : 'bg-white/[0.04] text-white/20 cursor-not-allowed'}`}
              >
                <Play size={12} /> {serverBuildStatus !== 'idle' ? 'Rebuild' : 'Start Build'}
              </button>
            )
          ) : (
            <button
              onClick={runAnalyze}
              disabled={!hasFiles || isAnalyzing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${hasFiles && !isAnalyzing ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/[0.04] text-white/20 cursor-not-allowed'}`}
            >
              <Eye size={12} /> {analyzeReport ? 'Re-Analyze' : 'Analyze Code'}
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column — Project Context */}
        <div className="w-[340px] shrink-0 border-r border-canvas-border overflow-y-auto custom-scrollbar">
          {!hasFiles ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 px-6">
              <Folder className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-semibold mb-1">No Project Loaded</p>
              <p className="text-xs text-white/15 text-center">Generate or load a project first, then come back here to build it</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Framework Card */}
              <div className="rounded-xl border border-canvas-border bg-white/[0.02] overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{project.framework.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{project.framework.name}</div>
                      <div className="text-[10px] text-white/30">Detected Framework</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 rounded-lg bg-black/20">
                      <div className="text-white/25 mb-0.5">Files</div>
                      <div className="text-white font-semibold">{project.fileCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20">
                      <div className="text-white/25 mb-0.5">Lines</div>
                      <div className="text-white font-semibold">{project.totalLines.toLocaleString()}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20">
                      <div className="text-white/25 mb-0.5">Size</div>
                      <div className="text-white font-semibold">{formatBytes(project.totalSize)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20">
                      <div className="text-white/25 mb-0.5">Language</div>
                      <div className="text-white font-semibold">{project.language}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              {project.hasPkg && (
                <div className="rounded-xl border border-canvas-border bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={12} className="text-white/30" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dependencies</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-white font-semibold">{project.depCount}</span>
                      <span className="text-white/30 ml-1">production</span>
                    </div>
                    <div>
                      <span className="text-white font-semibold">{project.devDepCount}</span>
                      <span className="text-white/30 ml-1">dev</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scripts */}
              <div className="rounded-xl border border-canvas-border bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={12} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Scripts</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 w-12 shrink-0">build</span>
                    <code className="text-emerald-300/70 font-mono truncate">{project.buildCommand}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 w-12 shrink-0">start</span>
                    <code className="text-blue-300/70 font-mono truncate">{project.startCommand}</code>
                  </div>
                </div>
              </div>

              {/* Entry Point */}
              {project.entryFile && (
                <div className="rounded-xl border border-canvas-border bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode size={12} className="text-white/30" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Entry Point</span>
                  </div>
                  <code className="text-[11px] text-amber-300/70 font-mono">{project.entryFile}</code>
                </div>
              )}

              {/* File Breakdown */}
              <div className="rounded-xl border border-canvas-border bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={12} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">File Breakdown</span>
                </div>
                <div className="space-y-1.5">
                  {project.fileBreakdown.map(fb => {
                    const pct = Math.round((fb.size / project.totalSize) * 100);
                    return (
                      <div key={fb.ext} className="flex items-center gap-2 text-[10px]">
                        <span className="text-white/50 w-9 font-mono">.{fb.ext}</span>
                        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500/40 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                        <span className="text-white/30 w-8 text-right">{fb.count}</span>
                        <span className="text-white/20 w-12 text-right">{formatBytes(fb.size)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Build Pipeline Preview */}
              <div className="rounded-xl border border-canvas-border bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-white/30" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Pipeline Preview</span>
                  </div>
                  <span className="text-[10px] text-white/20">{activeStageCount}/{SERVER_STAGES.length} active</span>
                </div>
                <div className="space-y-1">
                  {SERVER_STAGES.map(stage => {
                    const rel = stageRelevance[stage.id];
                    return (
                      <div key={stage.id} className={`flex items-center gap-2 text-[10px] py-1 ${rel?.relevant ? '' : 'opacity-40'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${rel?.relevant ? 'bg-primary-400' : 'bg-zinc-600'}`} />
                        <span className={`${rel?.relevant ? 'text-white/60' : 'text-white/25'}`}>{stage.name}</span>
                        <span className="flex-1" />
                        <span className="text-white/15 truncate max-w-[120px]">{rel?.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Pipeline + Logs / Analyze Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {buildMode === 'build' ? (
            /* ─── Build Mode ────────────────────────────────────── */
            serverBuildStatus === 'idle' && !isRunning ? (
              /* Empty state — prompt to build */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-orange-500/10 flex items-center justify-center border border-primary-500/10">
                    <Layers size={28} className="text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to Build</h3>
                  <p className="text-xs text-white/30 mb-6 leading-relaxed">
                    {hasFiles
                      ? `Your ${project.framework.name} project with ${project.fileCount} files will be built on the server — dependencies installed, code compiled, tests run, and security checked.`
                      : 'Load or generate a project first, then build it here.'}
                  </p>
                  {hasFiles && (
                    <>
                      <button
                        onClick={runServerBuild}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-semibold text-white transition-all"
                      >
                        <Play size={14} /> Start Build
                      </button>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-[10px]">
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                          <div className="text-white/50 font-semibold">{activeStageCount} Stages</div>
                          <div className="text-white/20 mt-0.5">Will execute</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                          <div className="text-white/50 font-semibold">{project.depCount + project.devDepCount} Deps</div>
                          <div className="text-white/20 mt-0.5">To install</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                          <div className="text-white/50 font-semibold">{formatBytes(project.totalSize)}</div>
                          <div className="text-white/20 mt-0.5">Source</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Build running or completed */
              <>
                {/* Stage progress bar */}
                <div className="px-4 py-3 border-b border-canvas-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    {serverStages.map(stage => {
                      const statusColor = stage.status === 'success' ? 'bg-emerald-500' :
                        stage.status === 'warning' ? 'bg-yellow-500' :
                          stage.status === 'failed' ? 'bg-primary-500' :
                            stage.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-700';
                      return (
                        <div key={stage.id} className="flex-1 group relative">
                          <div className={`h-1.5 rounded-full ${statusColor} transition-colors`} />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-0.5 bg-zinc-800 border border-canvas-border rounded text-[9px] text-white whitespace-nowrap z-10">
                            {stage.name} — {stage.status}{stage.duration ? ` (${stage.duration}ms)` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/25">
                    <span>{isRunning ? `Building... ${completedStages}/${SERVER_STAGES.length} stages` : `${completedStages} passed${failedStages ? `, ${failedStages} failed` : ''}`}</span>
                    {buildDuration && <span>{buildDuration}s total</span>}
                  </div>
                </div>

                {/* Stage list + logs toggle */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-canvas-border">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Pipeline Stages</span>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${showLogs ? 'bg-white/[0.06] text-white/60' : 'text-white/25 hover:text-white/50'}`}
                  >
                    <Terminal size={10} /> {showLogs ? 'Hide Logs' : 'Show Logs'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {/* Stage cards */}
                  <div className="p-3 space-y-1">
                    {serverStages.map((stage, idx) => {
                      const config = SERVER_STAGES[idx];
                      const Icon = config.icon;
                      const rel = stageRelevance[stage.id];
                      return (
                        <div key={stage.id} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${stage.status === 'running' ? 'bg-blue-500/5 border border-blue-500/10' : 'border border-transparent hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-md ${STATUS_COLORS[stage.status]}`}>
                              {stage.status === 'pending' ? <Icon size={11} /> : STATUS_ICONS[stage.status]}
                            </span>
                            <div>
                              <span className="text-xs text-white/80 font-medium">{stage.name}</span>
                              {stage.status === 'pending' && rel && (
                                <div className="text-[9px] text-white/20 mt-0.5">{rel.reason}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {stage.duration !== undefined && stage.duration > 0 && (
                              <span className="text-[10px] text-zinc-600 font-mono">{(stage.duration / 1000).toFixed(1)}s</span>
                            )}
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[stage.status]}`}>{stage.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Logs terminal */}
                  <AnimatePresence>
                    {showLogs && serverLogs.length > 0 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-canvas-border"
                      >
                        <div className="px-3 py-2 flex items-center justify-between bg-black/30">
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Build Output</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(serverLogs.join('\n')); }}
                            className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                            title="Copy logs"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        <div className="bg-black/40 font-mono text-[11px] leading-[18px] p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {serverLogs.map((line, i) => (
                            <div key={i} className={
                              line.startsWith('✓') ? 'text-emerald-400' :
                                line.startsWith('✗') ? 'text-primary-400' :
                                  line.startsWith('▸') ? 'text-blue-300' :
                                    line.startsWith('⊘') ? 'text-yellow-400' :
                                      line.includes('warning') || line.includes('WARN') ? 'text-yellow-400' :
                                        line.includes('error') || line.includes('ERROR') ? 'text-primary-400' :
                                          'text-zinc-500'
                            }>{line}</div>
                          ))}
                          <div ref={logEndRef} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Build result card */}
                  {!isRunning && serverBuildStatus !== 'idle' && (
                    <div className="p-3">
                      <div className={`p-4 rounded-xl border ${serverBuildStatus === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' :
                        serverBuildStatus === 'cancelled' ? 'border-yellow-500/20 bg-yellow-500/5' :
                          'border-primary-500/20 bg-primary-500/5'
                        }`}>
                        <div className="flex items-center gap-2 mb-3">
                          {serverBuildStatus === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                            serverBuildStatus === 'cancelled' ? <AlertTriangle size={16} className="text-yellow-400" /> :
                              <XCircle size={16} className="text-primary-400" />}
                          <span className="text-sm font-semibold text-white">
                            {serverBuildStatus === 'success' ? 'Build Succeeded' :
                              serverBuildStatus === 'cancelled' ? 'Build Cancelled' : 'Build Failed'}
                          </span>
                          {buildDuration && <span className="text-[10px] text-white/30 ml-auto">{buildDuration}s</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                          <div className="p-2 rounded-lg bg-black/20 text-center">
                            <div className="text-white font-semibold">{project.framework.icon} {project.framework.name}</div>
                            <div className="text-white/20 mt-0.5">Framework</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 text-center">
                            <div className="text-white font-semibold">{project.fileCount}</div>
                            <div className="text-white/20 mt-0.5">Files</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 text-center">
                            <div className="text-emerald-400 font-semibold">{completedStages}</div>
                            <div className="text-white/20 mt-0.5">Passed</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 text-center">
                            <div className={`font-semibold ${failedStages > 0 ? 'text-primary-400' : 'text-white/40'}`}>{failedStages}</div>
                            <div className="text-white/20 mt-0.5">Failed</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            /* ─── Analyze Mode ──────────────────────────────────── */
            !analyzeReport && !isAnalyzing ? (
              /* Empty state — prompt to analyze */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 flex items-center justify-center border border-purple-500/10">
                    <Eye size={28} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Code Analysis</h3>
                  <p className="text-xs text-white/30 mb-6 leading-relaxed">
                    {hasFiles
                      ? `Scan your ${project.fileCount} files for security vulnerabilities, lint issues, syntax errors, and code quality problems — all in real-time, right in the browser.`
                      : 'Load or generate a project first, then analyze it here.'}
                  </p>
                  {hasFiles && (
                    <>
                      <button
                        onClick={runAnalyze}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                      >
                        <Eye size={14} /> Analyze Code
                      </button>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                          <div className="flex items-center gap-1 text-white/50 font-semibold"><Shield size={10} /> Security</div>
                          <div className="text-white/20 mt-0.5">XSS, eval, secrets</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-canvas-border">
                          <div className="flex items-center gap-1 text-white/50 font-semibold"><Bug size={10} /> Lint</div>
                          <div className="text-white/20 mt-0.5">var, ==, console.log</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : isAnalyzing ? (
              /* Analyzing spinner */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={32} className="text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-semibold text-white mb-1">Analyzing Code...</p>
                  <p className="text-[10px] text-white/30">Scanning {project.fileCount} files for issues</p>
                </div>
              </div>
            ) : analyzeReport && (
              /* Analysis results */
              <>
                {/* Quality score bar */}
                <div className="px-4 py-3 border-b border-canvas-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${analyzeReport.metrics.qualityScore >= 80 ? 'text-emerald-400' : analyzeReport.metrics.qualityScore >= 50 ? 'text-yellow-400' : 'text-primary-400'}`}>
                        {analyzeReport.metrics.qualityScore}
                      </div>
                      <div>
                        <div className="text-xs text-white/60 font-medium">Quality Score</div>
                        <div className="text-[10px] text-white/25">{analyzeReport.issues.length} issues found · {analyzeReport.duration}ms</div>
                      </div>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      {analyzeReport.metrics.errors > 0 && (
                        <span className="px-2 py-1 rounded-md bg-primary-500/15 text-primary-300 font-semibold">{analyzeReport.metrics.errors} errors</span>
                      )}
                      {analyzeReport.metrics.warnings > 0 && (
                        <span className="px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-300 font-semibold">{analyzeReport.metrics.warnings} warnings</span>
                      )}
                      {analyzeReport.metrics.securityIssues > 0 && (
                        <span className="px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 font-semibold">{analyzeReport.metrics.securityIssues} security</span>
                      )}
                      {analyzeReport.metrics.errors === 0 && analyzeReport.metrics.warnings === 0 && analyzeReport.metrics.securityIssues === 0 && (
                        <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold">All clear</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${analyzeReport.metrics.qualityScore >= 80 ? 'bg-emerald-500' : analyzeReport.metrics.qualityScore >= 50 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                      style={{ width: `${Math.max(analyzeReport.metrics.qualityScore, 2)}%` }}
                    />
                  </div>
                </div>

                {/* Category filter tabs */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-canvas-border">
                  {(['all', 'security', 'lint', 'syntax', 'quality'] as const).map(cat => {
                    const count = cat === 'all' ? analyzeReport.issues.length : analyzeReport.issues.filter(i => i.category === cat).length;
                    const icons: Record<string, React.ReactNode> = {
                      all: <Layers size={10} />,
                      security: <Shield size={10} />,
                      lint: <Code2 size={10} />,
                      syntax: <AlertTriangle size={10} />,
                      quality: <BarChart3 size={10} />,
                    };
                    return (
                      <button
                        key={cat}
                        onClick={() => setAnalyzeFilter(cat)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${analyzeFilter === cat ? 'bg-purple-600/30 text-purple-300' : 'text-white/25 hover:text-white/50'}`}
                      >
                        {icons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        {count > 0 && <span className="ml-0.5 text-[9px] opacity-60">({count})</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Issue list grouped by file */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredIssues.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="text-center">
                        <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm text-white/50 font-medium">No issues found</p>
                        <p className="text-[10px] text-white/20 mt-1">{analyzeFilter === 'all' ? 'Your code looks clean!' : `No ${analyzeFilter} issues detected`}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {Object.entries(
                        filteredIssues.reduce<Record<string, AnalyzeIssue[]>>((acc, issue) => {
                          (acc[issue.file] = acc[issue.file] || []).push(issue);
                          return acc;
                        }, {})
                      ).map(([file, issues]) => (
                        <div key={file} className="rounded-xl border border-canvas-border bg-white/[0.02] overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-black/20">
                            <FileCode size={11} className="text-white/30" />
                            <span className="text-[11px] text-white/50 font-mono truncate">{file}</span>
                            <span className="ml-auto text-[9px] text-white/20">{issues.length} issue{issues.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="divide-y divide-white/[0.04]">
                            {issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2">
                                <span className={`mt-0.5 shrink-0 ${issue.severity === 'error' ? 'text-primary-400' : issue.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                  {issue.severity === 'error' ? <XCircle size={11} /> : issue.severity === 'warning' ? <AlertTriangle size={11} /> : <Info size={11} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] text-white/70">{issue.message}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {issue.line && <span className="text-[9px] text-white/20 font-mono">line {issue.line}</span>}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${issue.category === 'security' ? 'bg-orange-500/15 text-orange-300' : issue.category === 'lint' ? 'bg-blue-500/15 text-blue-300' : issue.category === 'syntax' ? 'bg-primary-500/15 text-primary-300' : 'bg-zinc-500/15 text-zinc-300'}`}>
                                      {issue.rule}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildPanel;
