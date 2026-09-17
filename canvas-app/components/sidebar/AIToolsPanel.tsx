/**
 * AIToolsPanel — Fully wired AI code tools in the left sidebar
 * Tabs: Autofix · Explain · Refactor · Test Writer
 * All backed by /api/canvas/chat → backend AI calls.
 */
import React, { useState, useCallback } from 'react';
import {
    Wand2,
    BookOpen,
    RefreshCw,
    FlaskConical,
    Loader2,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    Copy,
    Check,
    Play,
    Lightbulb,
    Code2,
    Zap,
    FileCode2,
    Brain,
    X,
} from 'lucide-react';
import { canvasGenerateService } from '../../services/canvasGenerateService';

interface AIToolsPanelProps {
    activeFilePath?: string | null;
    getFileContent?: (path: string) => string;
    onApplyFix?: (path: string, newContent: string) => void;
}

type ToolTab = 'autofix' | 'explain' | 'refactor' | 'test';

interface FixResult {
    id: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    fix: string;
    applied?: boolean;
}

interface ExplainResult {
    summary: string;
    details: string;
    tips: string[];
}

interface RefactorResult {
    id: string;
    title: string;
    type: string;
    description: string;
    code: string;
    applied?: boolean;
}

const TABS: { key: ToolTab; label: string; icon: React.FC<any>; color: string }[] = [
    { key: 'autofix', label: 'Autofix', icon: Wand2, color: 'text-primary-400' },
    { key: 'explain', label: 'Explain', icon: BookOpen, color: 'text-blue-400' },
    { key: 'refactor', label: 'Refactor', icon: RefreshCw, color: 'text-cyan-400' },
    { key: 'test', label: 'Tests', icon: FlaskConical, color: 'text-emerald-400' },
];

// ── Helpers ─────────────────────────────────────────────────
function parseJsonBlock(text: string): any {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
        try { return JSON.parse(match[1] || match[0]); } catch (_) { }
    }
    try { return JSON.parse(text); } catch (_) { return null; }
}

function CodeBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative group rounded-lg bg-black/40 border border-canvas-border overflow-hidden">
            <button onClick={copy} className="absolute top-2 right-2 p-1 rounded-md bg-white/[0.06] text-canvas-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-white/[0.1]">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <pre className="p-3 text-[11px] text-canvas-text overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
        </div>
    );
}

function EmptyState({ icon: Icon, text, sub }: { icon: React.FC<any>; text: string; sub?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <Icon className="w-8 h-8 text-gray-600 mb-3" />
            <p className="text-xs text-canvas-muted text-center">{text}</p>
            {sub && <p className="text-[10px] text-gray-600 text-center mt-1">{sub}</p>}
        </div>
    );
}

// ── Autofix Tab ──────────────────────────────────────────────
function AutofixTab({ filePath, getContent, onApply }: { filePath?: string | null; getContent?: (p: string) => string; onApply?: (p: string, c: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [fixes, setFixes] = useState<FixResult[]>([]);
    const [applying, setApplying] = useState<string | null>(null);
    const [error, setError] = useState('');

    const analyze = async () => {
        if (!filePath || !getContent) return;
        const code = getContent(filePath);
        if (!code) return;
        setLoading(true);
        setError('');
        setFixes([]);
        try {
            const res = await canvasGenerateService.chat({
                message: `Analyze this code for bugs, errors and issues. Return JSON array of issues:\n[\n  {\n    "id": "1",\n    "issue": "Description of the problem",\n    "severity": "error|warning|info",\n    "fix": "Fixed code snippet or explanation"\n  }\n]\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the JSON array, no other text.`,
                context: `File: ${filePath}`,
            });
            if (res.success && res.message) {
                const parsed = parseJsonBlock(res.message);
                if (Array.isArray(parsed)) {
                    setFixes(parsed);
                } else {
                    setFixes([{ id: '1', issue: res.message.slice(0, 300), severity: 'info', fix: '' }]);
                }
            } else {
                setError(res.error || 'Analysis failed');
            }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const applyFix = async (fix: FixResult) => {
        if (!filePath || !getContent || !onApply) return;
        setApplying(fix.id);
        try {
            const code = getContent(filePath);
            const res = await canvasGenerateService.chat({
                message: `Apply this fix to the code:\n\nIssue: ${fix.issue}\nFix: ${fix.fix}\n\nOriginal code:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the complete fixed code, no explanations.`,
                context: `File: ${filePath}`,
            });
            if (res.success && res.message) {
                const cleaned = res.message.replace(/```[\w]*\n?/g, '').replace(/```$/g, '').trim();
                onApply(filePath, cleaned);
                setFixes(prev => prev.map(f => f.id === fix.id ? { ...f, applied: true } : f));
            }
        } catch (_) { }
        finally { setApplying(null); }
    };

    if (!filePath) return <EmptyState icon={FileCode2} text="No file open" sub="Open a file in the editor to analyze" />;

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-canvas-border">
                <button
                    onClick={analyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-primary-600/80 to-primary-500/80 hover:from-primary-600 hover:to-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {loading ? 'Analyzing...' : 'Analyze for Issues'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}
                {!loading && !error && fixes.length === 0 && (
                    <EmptyState icon={CheckCircle2} text="Run analysis to detect issues" sub="AI will check for bugs, bad practices, errors" />
                )}
                {fixes.map(fix => (
                    <div key={fix.id} className={`rounded-lg border bg-canvas-card overflow-hidden ${fix.applied ? 'border-emerald-500/20 opacity-60' : fix.severity === 'error' ? 'border-primary-500/20' : fix.severity === 'warning' ? 'border-amber-500/20' : 'border-canvas-border'}`}>
                        <div className="flex items-start gap-2 p-3">
                            {fix.severity === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" /> :
                                fix.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" /> :
                                    <Lightbulb className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-200 leading-snug">{fix.issue}</p>
                                {fix.fix && <p className="text-[10px] text-canvas-muted-deep mt-1 leading-snug">{fix.fix.slice(0, 120)}{fix.fix.length > 120 ? '...' : ''}</p>}
                            </div>
                        </div>
                        {!fix.applied && fix.fix && onApply && (
                            <div className="px-3 pb-2.5">
                                <button
                                    onClick={() => applyFix(fix)}
                                    disabled={!!applying}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/25 disabled:opacity-40 transition-all"
                                >
                                    {applying === fix.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    Apply Fix
                                </button>
                            </div>
                        )}
                        {fix.applied && (
                            <div className="px-3 pb-2.5 flex items-center gap-1 text-[10px] text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Fixed
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Explain Tab ──────────────────────────────────────────────
function ExplainTab({ filePath, getContent }: { filePath?: string | null; getContent?: (p: string) => string }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ExplainResult | null>(null);
    const [customCode, setCustomCode] = useState('');
    const [innerTab, setInnerTab] = useState<'summary' | 'details' | 'tips'>('summary');
    const [error, setError] = useState('');

    const explain = async () => {
        const code = customCode.trim() || (filePath && getContent ? getContent(filePath) : '');
        if (!code) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await canvasGenerateService.chat({
                message: `Explain this code. Return JSON:\n{\n  "summary": "1-2 sentence overview",\n  "details": "Detailed multi-paragraph explanation",\n  "tips": ["tip 1", "tip 2", "tip 3"]\n}\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the JSON object.`,
            });
            if (res.success && res.message) {
                const parsed = parseJsonBlock(res.message);
                if (parsed?.summary) {
                    setResult(parsed);
                } else {
                    setResult({ summary: res.message.slice(0, 200), details: res.message, tips: [] });
                }
            } else {
                setError(res.error || 'Explanation failed');
            }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-canvas-border space-y-2">
                <textarea
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value)}
                    placeholder={filePath ? `Leave empty to explain ${filePath.split('/').pop()}...` : 'Paste code to explain...'}
                    rows={3}
                    className="w-full px-3 py-2 text-[11px] bg-white/[0.04] border border-canvas-border rounded-lg focus:ring-1 focus:ring-blue-500/40 outline-none text-canvas-text placeholder-gray-600 resize-none"
                />
                <button
                    onClick={explain}
                    disabled={loading || (!customCode.trim() && !filePath)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-blue-600/80 to-blue-500/80 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    {loading ? 'Explaining...' : 'Explain Code'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {error && <div className="m-3 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">{error}</div>}
                {!result && !loading && !error && <EmptyState icon={BookOpen} text="Get a plain-English explanation" sub="Understands HTML, CSS, JS, TypeScript" />}
                {result && (
                    <div>
                        <div className="flex gap-0.5 p-2 border-b border-canvas-border">
                            {(['summary', 'details', 'tips'] as const).map(t => (
                                <button key={t} onClick={() => setInnerTab(t)} className={`flex-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all capitalize ${innerTab === t ? 'bg-blue-500/15 text-blue-300' : 'text-canvas-muted-deep hover:text-canvas-text'}`}>
                                    {t === 'tips' ? '💡 Tips' : t}
                                </button>
                            ))}
                        </div>
                        <div className="p-3">
                            {innerTab === 'summary' && <p className="text-xs text-canvas-text leading-relaxed">{result.summary}</p>}
                            {innerTab === 'details' && <p className="text-xs text-canvas-text leading-relaxed whitespace-pre-wrap">{result.details}</p>}
                            {innerTab === 'tips' && (
                                <ul className="space-y-2">
                                    {result.tips.length > 0 ? result.tips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-canvas-text">
                                            <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                            {tip}
                                        </li>
                                    )) : <p className="text-xs text-canvas-muted-deep">No tips available</p>}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Refactor Tab ─────────────────────────────────────────────
function RefactorTab({ filePath, getContent, onApply }: { filePath?: string | null; getContent?: (p: string) => string; onApply?: (p: string, c: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<RefactorResult[]>([]);
    const [applying, setApplying] = useState<string | null>(null);
    const [error, setError] = useState('');

    const analyze = async () => {
        if (!filePath || !getContent) return;
        const code = getContent(filePath);
        if (!code) return;
        setLoading(true);
        setError('');
        setSuggestions([]);
        try {
            const res = await canvasGenerateService.chat({
                message: `Suggest code refactoring improvements. Return JSON array:\n[\n  {\n    "id": "1",\n    "title": "Short title",\n    "type": "simplify|optimize|modernize|extract|pattern",\n    "description": "What to improve and why",\n    "code": "Example improved code snippet"\n  }\n]\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the JSON array, max 5 suggestions.`,
                context: `File: ${filePath}`,
            });
            if (res.success && res.message) {
                const parsed = parseJsonBlock(res.message);
                if (Array.isArray(parsed)) setSuggestions(parsed);
                else setError('Could not parse suggestions');
            } else setError(res.error || 'Analysis failed');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const apply = async (s: RefactorResult) => {
        if (!filePath || !getContent || !onApply) return;
        setApplying(s.id);
        try {
            const code = getContent(filePath);
            const res = await canvasGenerateService.chat({
                message: `Apply this refactoring to the entire file:\n\nRefactoring: ${s.title}\n${s.description}\n\nOriginal:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the complete refactored file, no markdown fences.`,
            });
            if (res.success && res.message) {
                const cleaned = res.message.replace(/```[\w]*\n?/g, '').replace(/```$/g, '').trim();
                onApply(filePath, cleaned);
                setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, applied: true } : x));
            }
        } catch (_) { }
        finally { setApplying(null); }
    };

    const typeColors: Record<string, string> = {
        simplify: 'text-primary-400', optimize: 'text-emerald-400', modernize: 'text-cyan-400',
        extract: 'text-blue-400', pattern: 'text-pink-400',
    };

    if (!filePath) return <EmptyState icon={Code2} text="No file open" sub="Open a file to get refactoring suggestions" />;

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-canvas-border">
                <button
                    onClick={analyze}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-cyan-600/80 to-cyan-500/80 hover:from-cyan-600 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {loading ? 'Scanning...' : 'Suggest Refactors'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {error && <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">{error}</div>}
                {!loading && !error && suggestions.length === 0 && <EmptyState icon={RefreshCw} text="Scan for refactoring opportunities" sub="Simplify, optimize, modernize your code" />}
                {suggestions.map(s => (
                    <div key={s.id} className={`rounded-lg border bg-canvas-card overflow-hidden ${s.applied ? 'border-emerald-500/20 opacity-60' : 'border-canvas-border'}`}>
                        <div className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-xs text-gray-200 font-medium">{s.title}</p>
                                <span className={`text-[10px] font-medium capitalize shrink-0 ${typeColors[s.type] || 'text-canvas-muted'}`}>{s.type}</span>
                            </div>
                            <p className="text-[11px] text-canvas-muted-deep leading-snug">{s.description.slice(0, 150)}</p>
                            {s.code && <div className="mt-2"><CodeBlock code={s.code.slice(0, 300)} /></div>}
                        </div>
                        {!s.applied && onApply && (
                            <div className="px-3 pb-2.5">
                                <button
                                    onClick={() => apply(s)}
                                    disabled={!!applying}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 text-[10px] font-medium hover:bg-cyan-500/25 disabled:opacity-40 transition-all"
                                >
                                    {applying === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                    Apply to File
                                </button>
                            </div>
                        )}
                        {s.applied && <div className="px-3 pb-2.5 flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Applied</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Test Writer Tab ───────────────────────────────────────────
function TestWriterTab({ filePath, getContent }: { filePath?: string | null; getContent?: (p: string) => string }) {
    const [loading, setLoading] = useState(false);
    const [tests, setTests] = useState('');
    const [framework, setFramework] = useState<'jest' | 'vitest' | 'vanilla'>('jest');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        const code = filePath && getContent ? getContent(filePath) : '';
        if (!code) return;
        setLoading(true);
        setError('');
        setTests('');
        try {
            const res = await canvasGenerateService.chat({
                message: `Write comprehensive unit tests for this code using ${framework === 'vanilla' ? 'plain JavaScript assertions' : framework}.\n\nInclude:\n- Tests for all main functions\n- Edge cases and error handling\n- Descriptive test names\n\nCode:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nReturn ONLY the test code, no explanations.`,
                context: `File: ${filePath}, Framework: ${framework}`,
            });
            if (res.success && res.message) {
                const cleaned = res.message.replace(/```[\w]*\n?/g, '').replace(/```$/g, '').trim();
                setTests(cleaned);
            } else setError(res.error || 'Test generation failed');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const copy = async () => {
        await navigator.clipboard.writeText(tests);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!filePath) return <EmptyState icon={FlaskConical} text="No file open" sub="Open a file to generate tests for it" />;

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-canvas-border space-y-2">
                <div className="flex gap-1">
                    {(['jest', 'vitest', 'vanilla'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFramework(f)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-medium capitalize transition-all ${framework === f ? 'bg-emerald-500/15 text-emerald-300' : 'text-canvas-muted-deep hover:text-canvas-text bg-white/[0.03]'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <button
                    onClick={generate}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 hover:from-emerald-600 hover:to-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                    {loading ? 'Generating...' : `Generate ${framework} Tests`}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {error && <div className="mb-3 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">{error}</div>}
                {!tests && !loading && !error && <EmptyState icon={FlaskConical} text="Generate tests for your code" sub={`Will use ${framework} testing format`} />}
                {tests && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-canvas-muted-deep">Generated tests</span>
                            <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] text-canvas-muted hover:text-white text-[10px] transition-all">
                                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <CodeBlock code={tests} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Panel ───────────────────────────────────────────────
const AIToolsPanel: React.FC<AIToolsPanelProps> = ({ activeFilePath, getFileContent, onApplyFix }) => {
    const [tab, setTab] = useState<ToolTab>('autofix');

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b border-canvas-border bg-canvas-card/80 shrink-0">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-medium transition-all border-b-2 ${tab === t.key
                                    ? `${t.color} border-current`
                                    : 'text-gray-600 border-transparent hover:text-canvas-muted'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* File context badge */}
            {activeFilePath && (
                <div className="px-3 py-1.5 border-b border-canvas-border bg-white/[0.02]">
                    <div className="flex items-center gap-1.5">
                        <FileCode2 className="w-3 h-3 text-canvas-muted-deep shrink-0" />
                        <span className="text-[10px] text-canvas-muted-deep truncate">{activeFilePath}</span>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {tab === 'autofix' && <AutofixTab filePath={activeFilePath} getContent={getFileContent} onApply={onApplyFix} />}
                {tab === 'explain' && <ExplainTab filePath={activeFilePath} getContent={getFileContent} />}
                {tab === 'refactor' && <RefactorTab filePath={activeFilePath} getContent={getFileContent} onApply={onApplyFix} />}
                {tab === 'test' && <TestWriterTab filePath={activeFilePath} getContent={getFileContent} />}
            </div>
        </div>
    );
};

export default AIToolsPanel;
