/**
 * DocumentsPanel — Document parsing, archiving, Markdown tools & audio transcription
 * Tools: parse_pdf, parse_docx, parse_csv, parse_json, parse_html,
 *        transcribe_audio, archive_core, markdown_convert, markdown_validate
 */
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Loader2, Upload, ChevronDown, ChevronRight, Copy, Check,
    Download, Trash2, File, Archive, Hash, Code, Mic,
    CheckCircle2, AlertTriangle, RefreshCw, Eye, X, Plus, Table,
    FileJson, FileCode, FileSpreadsheet, FileArchive, Headphones,
} from 'lucide-react';

const API_BASE = '/api/canvas';

type Tab = 'parse' | 'archive' | 'markdown' | 'audio';

interface ParsedResult { type: string; fileName: string; content: string; metadata?: Record<string, string | number>; tables?: string[][]; }
interface ArchiveFile { name: string; size: number; type: string; }
interface MarkdownIssue { line: number; message: string; severity: 'error' | 'warning' | 'info'; }

const SUPPORTED_FORMATS = [
    { ext: 'pdf', icon: <File size={12} />, color: 'text-primary-400', label: 'PDF', tool: 'parse_pdf' },
    { ext: 'docx', icon: <FileText size={12} />, color: 'text-blue-400', label: 'Word', tool: 'parse_docx' },
    { ext: 'csv', icon: <FileSpreadsheet size={12} />, color: 'text-emerald-400', label: 'CSV', tool: 'parse_csv' },
    { ext: 'json', icon: <FileJson size={12} />, color: 'text-amber-400', label: 'JSON', tool: 'parse_json' },
    { ext: 'html', icon: <FileCode size={12} />, color: 'text-purple-400', label: 'HTML', tool: 'parse_html' },
    { ext: 'xml', icon: <FileCode size={12} />, color: 'text-cyan-400', label: 'XML', tool: 'parse_json' },
    { ext: 'txt', icon: <FileText size={12} />, color: 'text-zinc-400', label: 'Text', tool: 'parse_html' },
    { ext: 'md', icon: <Hash size={12} />, color: 'text-orange-400', label: 'Markdown', tool: 'parse_html' },
];

const ARCHIVE_FORMATS = ['zip', 'tar', 'tar.gz', 'tar.bz2', '7z', 'rar'] as const;

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative inline-flex">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
            <div className="bg-zinc-800 border border-canvas-border text-white text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl max-w-[300px] text-center leading-snug">{text}</div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }> = ({ title, children, defaultOpen = true, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-canvas-border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-2">
                    {badge && <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">{badge}</span>}
                    {open ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-3 space-y-3">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DocumentsPanel: React.FC<{ className?: string; projectId?: string }> = ({ className = '', projectId }) => {
    const [tab, setTab] = useState<Tab>('parse');
    const [copied, setCopied] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

    const callTool = useCallback(async (tool: string, params: Record<string, unknown>) => {
        const res = await fetch(`${API_BASE}/execute-data-tool`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, projectId, ...params }),
        });
        return res.json();
    }, [projectId]);

    // ── Parse state ─────────────────────────────────────────────────────────
    const [parseInput, setParseInput] = useState('');
    const [parseFormat, setParseFormat] = useState('pdf');
    const [parseLoading, setParseLoading] = useState(false);
    const [parseResult, setParseResult] = useState<ParsedResult | null>(null);
    const [parseTab, setParseTab] = useState<'text' | 'metadata' | 'tables'>('text');
    const [dragOver, setDragOver] = useState(false);

    const parseTool = SUPPORTED_FORMATS.find(f => f.ext === parseFormat)?.tool || 'parse_pdf';

    const parseDocument = async () => {
        if (!parseInput.trim()) return;
        setParseLoading(true); setParseResult(null);
        try {
            const r = await callTool(parseTool, { action: 'parse', input: parseInput, format: parseFormat });
            setParseResult({
                type: parseFormat,
                fileName: 'document.' + parseFormat,
                content: r.text || r.content || r.html || JSON.stringify(r.data || r, null, 2),
                metadata: r.metadata || r.info,
                tables: r.tables,
            });
        } catch { } finally { setParseLoading(false); }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        setParseFormat(SUPPORTED_FORMATS.find(f => f.ext === ext)?.ext || ext);
        const reader = new FileReader();
        reader.onload = ev => setParseInput(ev.target?.result as string || '');
        reader.readAsText(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        setParseFormat(SUPPORTED_FORMATS.find(f => f.ext === ext)?.ext || ext);
        const reader = new FileReader();
        reader.onload = ev => setParseInput(ev.target?.result as string || '');
        reader.readAsText(file);
    };

    // ── Archive state ───────────────────────────────────────────────────────
    const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
    const [archiveFormat, setArchiveFormat] = useState<string>('zip');
    const [archiveName, setArchiveName] = useState('archive');
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveResult, setArchiveResult] = useState<{ url?: string; size?: number } | null>(null);
    const [extractInput, setExtractInput] = useState('');
    const [extractLoading, setExtractLoading] = useState(false);
    const [extractedFiles, setExtractedFiles] = useState<ArchiveFile[]>([]);
    const [archiveOp, setArchiveOp] = useState<'create' | 'extract' | 'list'>('create');

    const createArchive = async () => {
        if (!archiveFiles.length) return;
        setArchiveLoading(true);
        try {
            const r = await callTool('archive_core', {
                action: 'create', format: archiveFormat,
                name: archiveName + '.' + archiveFormat,
                files: archiveFiles.map(f => f.name),
            });
            setArchiveResult({ url: r.url || r.path, size: r.size });
        } catch { } finally { setArchiveLoading(false); }
    };

    const extractArchive = async () => {
        if (!extractInput.trim()) return;
        setExtractLoading(true);
        try {
            const r = await callTool('archive_core', { action: 'extract', input: extractInput });
            setExtractedFiles(r.files || []);
        } catch { } finally { setExtractLoading(false); }
    };

    const listArchive = async () => {
        if (!extractInput.trim()) return;
        setExtractLoading(true);
        try {
            const r = await callTool('archive_core', { action: 'list', input: extractInput });
            setExtractedFiles(r.files || r.contents || []);
        } catch { } finally { setExtractLoading(false); }
    };

    // ── Markdown state ──────────────────────────────────────────────────────
    const [mdInput, setMdInput] = useState('# Hello World\n\nThis is a **Markdown** document.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("Hello!");\n```\n');
    const [mdTarget, setMdTarget] = useState<'html' | 'pdf' | 'docx' | 'json' | 'plaintext'>('html');
    const [mdLoading, setMdLoading] = useState(false);
    const [mdResult, setMdResult] = useState<string | null>(null);
    const [mdValidating, setMdValidating] = useState(false);
    const [mdIssues, setMdIssues] = useState<MarkdownIssue[] | null>(null);
    const [mdOp, setMdOp] = useState<'convert' | 'validate'>('convert');
    const [mdPreview, setMdPreview] = useState(false);

    const convertMarkdown = async () => {
        if (!mdInput.trim()) return;
        setMdLoading(true); setMdResult(null);
        try {
            const r = await callTool('markdown_convert', { action: 'convert', input: mdInput, target: mdTarget });
            setMdResult(r.output || r.content || r.html || JSON.stringify(r, null, 2));
        } catch { } finally { setMdLoading(false); }
    };

    const validateMarkdown = async () => {
        if (!mdInput.trim()) return;
        setMdValidating(true); setMdIssues(null);
        try {
            const r = await callTool('markdown_validate', { action: 'validate', input: mdInput });
            setMdIssues(r.issues || r.errors || []);
        } catch { } finally { setMdValidating(false); }
    };

    // ── Audio state ─────────────────────────────────────────────────────────
    const [audioInput, setAudioInput] = useState('');
    const [audioLang, setAudioLang] = useState('en');
    const [audioModel, setAudioModel] = useState('whisper-large');
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioResult, setAudioResult] = useState<{ text: string; segments?: { start: number; end: number; text: string }[] } | null>(null);
    const [audioOptions, setAudioOptions] = useState({ diarize: false, timestamps: true, translate: false });

    const transcribeAudio = async () => {
        if (!audioInput.trim()) return;
        setAudioLoading(true); setAudioResult(null);
        try {
            const r = await callTool('transcribe_audio', {
                input: audioInput, language: audioLang, model: audioModel, ...audioOptions,
            });
            setAudioResult({ text: r.text || r.transcript || '', segments: r.segments || r.words });
        } catch { } finally { setAudioLoading(false); }
    };

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'parse', label: 'Parse', icon: <File size={12} />, tooltip: 'Extract structured content from PDF, Word, CSV, JSON, HTML and more' },
        { id: 'archive', label: 'Archive', icon: <Archive size={12} />, tooltip: 'Create, extract, and inspect ZIP/TAR/7z archives' },
        { id: 'markdown', label: 'Markdown', icon: <Hash size={12} />, tooltip: 'Convert Markdown to HTML/PDF/DOCX and validate syntax with linting' },
        { id: 'audio', label: 'Transcribe', icon: <Mic size={12} />, tooltip: 'Transcribe audio files to text using Whisper with timestamps and speaker diarization' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-canvas-border">
                <FileText size={20} className="text-amber-400 shrink-0" />
                <span className="text-lg font-semibold text-white">Documents</span>
                <span className="ml-auto text-xs text-zinc-500">Parse • Archive • Markdown • Audio</span>
            </div>

            <div className="flex gap-1 px-4 py-2.5 border-b border-canvas-border">
                {TABS.map(t => (
                    <Tooltip key={t.id} text={t.tooltip}>
                        <button onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 justify-center transition-all ${tab === t.id ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}>
                            {t.icon}{t.label}
                        </button>
                    </Tooltip>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── PARSE TAB ── */}
                {tab === 'parse' && (
                    <>
                        <Section title="Document Parser" defaultOpen>
                            <div className="space-y-3">
                                {/* Format selector */}
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1.5">Document Format</label>
                                    <div className="flex flex-wrap gap-1">
                                        {SUPPORTED_FORMATS.map(f => (
                                            <Tooltip key={f.ext} text={`Parse ${f.label} document`}>
                                                <button onClick={() => setParseFormat(f.ext)}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-xs font-medium transition-colors ${parseFormat === f.ext ? `border-amber-500/40 bg-amber-500/10 text-amber-300` : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                    <span className={parseFormat === f.ext ? 'text-amber-400' : f.color}>{f.icon}</span>
                                                    {f.label}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>

                                {/* Drop zone */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleFileDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragOver ? 'border-amber-500/50 bg-amber-500/5' : 'border-canvas-border hover:border-canvas-border bg-white/[0.02]'}`}>
                                    <Upload size={18} className="text-zinc-500" />
                                    <span className="text-sm text-zinc-500">Drop file or click to select</span>
                                    <span className="text-xs text-zinc-600">Supports: PDF, DOCX, CSV, JSON, HTML, XML, TXT, MD</span>
                                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.csv,.json,.html,.xml,.txt,.md" onChange={handleFileSelect} />
                                </div>

                                <div className="flex items-center gap-2 text-xs text-zinc-600">
                                    <div className="flex-1 h-px bg-white/[0.06]" />
                                    <span>or paste content</span>
                                    <div className="flex-1 h-px bg-white/[0.06]" />
                                </div>

                                <textarea value={parseInput} onChange={e => setParseInput(e.target.value)} rows={4}
                                    placeholder={parseFormat === 'json' ? '{\n  "users": [{"id": 1, "name": "Alice"}]\n}' : parseFormat === 'csv' ? 'name,age,email\nAlice,30,alice@example.com' : 'Paste document content here...'}
                                    className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500/40 resize-none" />

                                <Tooltip text={`Deeply parse the ${parseFormat.toUpperCase()} content and extract structured text, tables, and metadata`}>
                                    <button onClick={parseDocument} disabled={parseLoading || !parseInput}
                                        className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {parseLoading ? <Loader2 size={12} className="animate-spin" /> : <File size={12} />}
                                        {parseLoading ? 'Parsing...' : `Parse ${parseFormat.toUpperCase()}`}
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {parseResult && (
                            <Section title="Parsed Content" defaultOpen>
                                <div className="flex gap-1">
                                    {(['text', 'metadata', 'tables'] as const).map(t => (
                                        <button key={t} onClick={() => setParseTab(t)}
                                            className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${parseTab === t ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
                                    ))}
                                </div>

                                {parseTab === 'text' && (
                                    <>
                                        <div className="flex justify-end">
                                            <Tooltip text="Copy extracted text to clipboard">
                                                <button onClick={() => copyText(parseResult.content, 'parsed')} className="text-zinc-500 hover:text-white">
                                                    {copied === 'parsed' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-56 whitespace-pre-wrap">{parseResult.content}</pre>
                                    </>
                                )}

                                {parseTab === 'metadata' && parseResult.metadata && (
                                    <div className="space-y-1">
                                        {Object.entries(parseResult.metadata).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2 text-xs">
                                                <span className="text-zinc-500 w-28 shrink-0">{k}</span>
                                                <span className="text-zinc-300 font-mono">{String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {parseTab === 'tables' && (
                                    parseResult.tables?.length
                                        ? <div className="space-y-3 max-h-56 overflow-auto">
                                            {parseResult.tables.map((table, ti) => (
                                                <div key={ti} className="overflow-x-auto">
                                                    <table className="w-full text-xs border-collapse">
                                                        {table.map((row, ri) => (
                                                            <tr key={ri} className={ri === 0 ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}>
                                                                {row.map((cell, ci) => (
                                                                    <td key={ci} className="border border-canvas-border px-2 py-1 text-zinc-300 whitespace-nowrap">{cell}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </table>
                                                </div>
                                            ))}
                                        </div>
                                        : <p className="text-xs text-zinc-600 text-center py-3">No tables detected in this document</p>
                                )}
                            </Section>
                        )}
                    </>
                )}

                {/* ── ARCHIVE TAB ── */}
                {tab === 'archive' && (
                    <>
                        <div className="flex gap-1">
                            {(['create', 'extract', 'list'] as const).map(op => (
                                <button key={op} onClick={() => setArchiveOp(op)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-xl capitalize transition-colors ${archiveOp === op ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.03]'}`}>{op}</button>
                            ))}
                        </div>

                        {archiveOp === 'create' && (
                            <Section title="Create Archive" defaultOpen>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-zinc-500 mb-1">Archive Name</label>
                                            <input value={archiveName} onChange={e => setArchiveName(e.target.value)} placeholder="archive"
                                                className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-amber-500/40" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-zinc-500 mb-1">Format</label>
                                            <select value={archiveFormat} onChange={e => setArchiveFormat(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                                {ARCHIVE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* File list */}
                                    <div className="space-y-1">
                                        {archiveFiles.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-2.5 py-1.5 border border-canvas-border">
                                                <File size={10} className="text-zinc-500 shrink-0" />
                                                <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{f.name}</span>
                                                <span className="text-sm text-zinc-600">{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}</span>
                                                <button onClick={() => setArchiveFiles(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-primary-400"><X size={11} /></button>
                                            </div>
                                        ))}
                                        <Tooltip text="Add a file path to include in the archive">
                                            <button onClick={() => setArchiveFiles(prev => [...prev, { name: `file${prev.length + 1}.txt`, size: 0, type: 'text/plain' }])}
                                                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                                                <Plus size={10} /> Add File Path
                                            </button>
                                        </Tooltip>
                                    </div>

                                    <Tooltip text={`Bundle all files into a ${archiveFormat} archive`}>
                                        <button onClick={createArchive} disabled={archiveLoading || !archiveFiles.length}
                                            className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                            {archiveLoading ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                                            Create {archiveFormat.toUpperCase()}
                                        </button>
                                    </Tooltip>

                                    {archiveResult && (
                                        <div className="flex items-center gap-2 text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 text-emerald-400">
                                            <CheckCircle2 size={11} />
                                            <span>Archive created {archiveResult.size ? `(${(archiveResult.size / 1024).toFixed(1)} KB)` : ''}</span>
                                            {archiveResult.url && (
                                                <Tooltip text="Download archive"><a href={archiveResult.url} className="ml-auto text-zinc-400 hover:text-white"><Download size={11} /></a></Tooltip>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {(archiveOp === 'extract' || archiveOp === 'list') && (
                            <Section title={archiveOp === 'extract' ? 'Extract Archive' : 'List Contents'} defaultOpen>
                                <div className="space-y-3">
                                    <textarea value={extractInput} onChange={e => setExtractInput(e.target.value)} rows={3}
                                        placeholder="Paste archive content (base64) or provide file path..."
                                        className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500/40 resize-none" />
                                    <Tooltip text={archiveOp === 'extract' ? 'Extract all files from the archive and return their contents' : 'List all files inside the archive without extracting'}>
                                        <button onClick={archiveOp === 'extract' ? extractArchive : listArchive} disabled={extractLoading}
                                            className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                            {extractLoading ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                                            {archiveOp === 'extract' ? 'Extract' : 'List Files'}
                                        </button>
                                    </Tooltip>
                                    {extractedFiles.length > 0 && (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {extractedFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-white/[0.02] rounded-xl px-2 py-1 border border-canvas-border">
                                                    <File size={10} className="text-zinc-500 shrink-0" />
                                                    <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{f.name}</span>
                                                    <span className="text-sm text-zinc-600">{f.type}</span>
                                                    <span className="text-sm text-zinc-600">{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── MARKDOWN TAB ── */}
                {tab === 'markdown' && (
                    <>
                        <div className="flex gap-1">
                            {(['convert', 'validate'] as const).map(op => (
                                <button key={op} onClick={() => setMdOp(op)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-xl capitalize transition-colors ${mdOp === op ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.03]'}`}>{op}</button>
                            ))}
                        </div>

                        <Section title="Markdown Input" defaultOpen>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">{mdInput.split('\n').length} lines • {mdInput.length} chars</span>
                                    <Tooltip text="Toggle rendered HTML preview">
                                        <button onClick={() => setMdPreview(!mdPreview)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${mdPreview ? 'border-amber-500/40 text-amber-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                            <Eye size={10} /> Preview
                                        </button>
                                    </Tooltip>
                                </div>
                                {!mdPreview
                                    ? <textarea value={mdInput} onChange={e => setMdInput(e.target.value)} rows={8}
                                        className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 outline-none focus:border-amber-500/40 resize-none" />
                                    : <div className="bg-canvas-card border border-canvas-border rounded-xl p-3 max-h-48 overflow-auto prose prose-invert prose-sm max-w-none text-sm"
                                        dangerouslySetInnerHTML={{ __html: mdInput.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/^# (.+)/gm, '<h1>$1</h1>').replace(/^## (.+)/gm, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>') }} />
                                }

                                {mdOp === 'convert' && (
                                    <>
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1">Convert to</label>
                                            <div className="flex flex-wrap gap-1">
                                                {(['html', 'pdf', 'docx', 'json', 'plaintext'] as const).map(t => (
                                                    <Tooltip key={t} text={`Convert Markdown to ${t.toUpperCase()}`}>
                                                        <button onClick={() => setMdTarget(t)}
                                                            className={`text-xs px-2.5 py-1 rounded-xl border uppercase font-mono transition-colors ${mdTarget === t ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        </div>
                                        <Tooltip text={`Convert Markdown to ${mdTarget.toUpperCase()} format with full syntax support`}>
                                            <button onClick={convertMarkdown} disabled={mdLoading}
                                                className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                                {mdLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                                Convert to {mdTarget.toUpperCase()}
                                            </button>
                                        </Tooltip>
                                        {mdResult && (
                                            <div className="space-y-1">
                                                <div className="flex justify-end">
                                                    <Tooltip text="Copy converted output">
                                                        <button onClick={() => copyText(mdResult, 'md')} className="text-zinc-500 hover:text-white">
                                                            {copied === 'md' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                                <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-48 whitespace-pre-wrap">{mdResult}</pre>
                                            </div>
                                        )}
                                    </>
                                )}

                                {mdOp === 'validate' && (
                                    <>
                                        <Tooltip text="Lint Markdown for broken links, heading hierarchy, code block syntax, and formatting issues">
                                            <button onClick={validateMarkdown} disabled={mdValidating}
                                                className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                                {mdValidating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                Validate Markdown
                                            </button>
                                        </Tooltip>
                                        {mdIssues !== null && (
                                            mdIssues.length === 0
                                                ? <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400"><CheckCircle2 size={11} /> No issues found — Markdown looks great!</div>
                                                : <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {mdIssues.map((issue, i) => (
                                                        <div key={i} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${issue.severity === 'error' ? 'border-primary-500/20 bg-primary-500/5 text-primary-400' : issue.severity === 'warning' ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-canvas-border text-zinc-400'}`}>
                                                            <span className="font-mono shrink-0">L{issue.line}</span>
                                                            <span>{issue.message}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Section>
                    </>
                )}

                {/* ── AUDIO TAB ── */}
                {tab === 'audio' && (
                    <Section title="Audio Transcription" defaultOpen>
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">Transcribe audio and video files using Whisper with support for 97 languages, timestamps, and speaker identification.</p>

                            <div
                                onClick={() => audioInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-canvas-border hover:border-amber-500/30 rounded-xl cursor-pointer transition-all bg-white/[0.02]">
                                <Headphones size={20} className="text-zinc-500" />
                                <span className="text-sm text-zinc-500">Click to select audio/video file</span>
                                <span className="text-xs text-zinc-600">MP3 • WAV • M4A • FLAC • OGG • MP4 • WebM</span>
                                <input ref={audioInputRef} type="file" className="hidden" accept="audio/*,video/*" onChange={e => { const f = e.target.files?.[0]; if (f) setAudioInput(f.name); }} />
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                                <div className="flex-1 h-px bg-white/[0.06]" /><span>or paste URL / path</span><div className="flex-1 h-px bg-white/[0.06]" />
                            </div>

                            <input value={audioInput} onChange={e => setAudioInput(e.target.value)}
                                placeholder="https://example.com/audio.mp3 or /path/to/audio.wav"
                                className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-amber-500/50" />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Language</label>
                                    <select value={audioLang} onChange={e => setAudioLang(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                        {[['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['ja', 'Japanese'], ['zh', 'Chinese'], ['ar', 'Arabic'], ['auto', 'Auto-detect']].map(([v, l]) => (
                                            <option key={v} value={v}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Model</label>
                                    <select value={audioModel} onChange={e => setAudioModel(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                        {['whisper-tiny', 'whisper-base', 'whisper-small', 'whisper-medium', 'whisper-large'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {[
                                    { key: 'timestamps', label: 'Timestamps', tooltip: 'Include word-level timecodes in the transcript' },
                                    { key: 'diarize', label: 'Diarize', tooltip: 'Identify and label different speakers (Speaker 1, Speaker 2...)' },
                                    { key: 'translate', label: 'Translate to EN', tooltip: 'Automatically translate output to English' },
                                ].map(({ key, label, tooltip }) => (
                                    <Tooltip key={key} text={tooltip}>
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input type="checkbox" checked={(audioOptions as Record<string, boolean>)[key]} onChange={e => setAudioOptions(prev => ({ ...prev, [key]: e.target.checked }))} className="w-3 h-3 accent-amber-500" />
                                            <span className="text-xs text-zinc-400">{label}</span>
                                        </label>
                                    </Tooltip>
                                ))}
                            </div>

                            <Tooltip text="Transcribe the audio using Whisper — larger models are more accurate but slower">
                                <button onClick={transcribeAudio} disabled={audioLoading || !audioInput}
                                    className="w-full flex items-center justify-center gap-2.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {audioLoading ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
                                    {audioLoading ? 'Transcribing...' : 'Transcribe Audio'}
                                </button>
                            </Tooltip>

                            {audioResult && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500">Transcript</span>
                                        <Tooltip text="Copy transcript to clipboard">
                                            <button onClick={() => copyText(audioResult.text, 'audio')} className="text-zinc-500 hover:text-white">
                                                {copied === 'audio' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="bg-canvas-card border border-canvas-border rounded-xl p-2.5 max-h-40 overflow-y-auto">
                                        <p className="text-sm text-zinc-300 leading-relaxed">{audioResult.text}</p>
                                    </div>
                                    {audioResult.segments && audioResult.segments.length > 0 && (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            <span className="text-xs text-zinc-500">Timed Segments</span>
                                            {audioResult.segments.map((s, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs">
                                                    <span className="font-mono text-amber-400 shrink-0">{s.start.toFixed(1)}s</span>
                                                    <span className="text-zinc-300">{s.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

            </div>
        </div>
    );
};

export default DocumentsPanel;
