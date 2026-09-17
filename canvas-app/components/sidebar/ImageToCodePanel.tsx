/**
 * ImageToCodePanel — AI Image→Code converter, full-width panel
 * Upload a UI mockup screenshot → generate clean code in various frameworks.
 * Full-width layout with upload on top/left and generated code + history below/right.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    ImageIcon,
    Upload,
    Loader2,
    Sparkles,
    X,
    Copy,
    Download,
    Check,
    Share2,
    RotateCcw,
    Trash2,
    ChevronDown,
    ChevronUp,
    Clock,
    Play,
    AlertCircle,
    RefreshCw,
    Code2,
    Zap,
    Eye,
    FileCode,
    Layers,
    Wand2,
    Filter,
} from 'lucide-react';
import imageToCodeService from '../../services/imageToCodeService';
import type { ImageToCodeLanguage } from '../../services/imageToCodeService';
import { userHistoryService } from '../../services/userHistoryService';

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────
export interface HistoryItem {
    id: string;
    thumbDataUrl: string;
    language: ImageToCodeLanguage;
    code: string;
    timestamp: number;
    status: 'success' | 'failed';
    error?: string;
}

interface ImageToCodePanelProps {
    onUseCode: (code: string, language: ImageToCodeLanguage) => void;
    defaultLanguage?: ImageToCodeLanguage;
}

// ── Language definitions ──────────────────────────────────────────
interface LangOption {
    id: ImageToCodeLanguage;
    label: string;
    description: string;
    ext: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

const LANGUAGES: LangOption[] = [
    { id: 'html', label: 'HTML / CSS / JS', description: 'Vanilla web — standalone HTML file', ext: 'html', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
    { id: 'react', label: 'React', description: 'React + TypeScript + Tailwind CSS', ext: 'tsx', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
    { id: 'vue', label: 'Vue.js', description: 'Vue 3 SFC — Composition API + Tailwind', ext: 'vue', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    { id: 'nextjs', label: 'Next.js', description: 'Next.js App Router + TypeScript + Tailwind', ext: 'tsx', color: 'text-white', bgColor: 'bg-white/10', borderColor: 'border-canvas-border' },
    { id: 'angular', label: 'Angular', description: 'Angular standalone component + TypeScript', ext: 'ts', color: 'text-primary-400', bgColor: 'bg-primary-500/10', borderColor: 'border-primary-500/20' },
    { id: 'svelte', label: 'Svelte', description: 'Svelte component with scoped styles', ext: 'svelte', color: 'text-orange-300', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/20' },
];

function getLangOption(id: ImageToCodeLanguage): LangOption {
    return LANGUAGES.find(l => l.id === id) || LANGUAGES[0];
}

// ──────────────────────────────────────────────────────────────────
// Thumbnail helper
// ──────────────────────────────────────────────────────────────────
async function makeThumbnail(dataUrl: string, size = 200): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
            const scale = Math.min(size / img.width, size / img.height, 1);
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────
const ImageToCodePanel: React.FC<ImageToCodePanelProps> = ({
    onUseCode,
    defaultLanguage = 'html',
}) => {
    const [language, setLanguage] = useState<ImageToCodeLanguage>(defaultLanguage);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<ImageToCodeLanguage | 'all'>('all');
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [codeExpanded, setCodeExpanded] = useState(true);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Hydrate history from DB on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await userHistoryService.list<HistoryItem>('image_to_code', 50);
            if (cancelled || !res.success || !res.items) return;
            setHistory(res.items.map((row) => ({ ...(row.data as HistoryItem), id: row.id })));
        })();
        return () => { cancelled = true; };
    }, []);

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [shareFlash, setShareFlash] = useState(false);

    useEffect(() => { setLanguage(defaultLanguage); }, [defaultLanguage]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setLangDropdownOpen(false);
            }
        };
        if (langDropdownOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [langDropdownOpen]);

    // ── Dropzone ──────────────────────────────────────────────────
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('Image must be less than 10 MB'); return; }
        setImageFile(file);
        setError(null);
        setGeneratedCode(null);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
        maxFiles: 1,
        noClick: false,
    });

    // ── Generate ──────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!imageFile || !imagePreview) return;
        setIsGenerating(true);
        setError(null);
        setGeneratedCode(null);

        let code = '';
        let status: HistoryItem['status'] = 'failed';
        let errMsg: string | undefined;

        try {
            const result = await imageToCodeService.convertFile(imageFile, language);
            code = result.code || '';
            setGeneratedCode(code);
            setCodeExpanded(true);
            status = 'success';
        } catch (err) {
            errMsg = err instanceof Error ? err.message : 'Conversion failed';
            setError(errMsg);
            status = 'failed';
        } finally {
            setIsGenerating(false);
        }

        if (imagePreview) {
            const thumb = await makeThumbnail(imagePreview);
            const item: HistoryItem = {
                id: Date.now().toString(),
                thumbDataUrl: thumb,
                language,
                code,
                timestamp: Date.now(),
                status,
                error: errMsg,
            };
            setHistory(prev => [item, ...prev].slice(0, 50));
            userHistoryService.create<HistoryItem>('image_to_code', item, item.id);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────
    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setGeneratedCode(null);
        setError(null);
        setCodeExpanded(true);
    };

    const copyCode = async (code: string, markId: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(markId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch { /* ignore */ }
    };

    const downloadCode = (code: string, lang: ImageToCodeLanguage) => {
        const opt = getLangOption(lang);
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-component.${opt.ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const shareCode = async (code: string) => {
        try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
        setShareFlash(true);
        setTimeout(() => setShareFlash(false), 2500);
    };

    const deleteItem = (id: string) => {
        setHistory(prev => prev.filter(h => h.id !== id));
        userHistoryService.remove('image_to_code', id);
        if (expandedId === id) setExpandedId(null);
    };

    const clearAll = () => {
        setHistory([]);
        userHistoryService.clear('image_to_code');
        setExpandedId(null);
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-canvas-card text-white overflow-hidden">
            {/* Full-width 2-column layout */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT COLUMN: Upload & Controls ── */}
                <div className="w-[380px] min-w-[320px] shrink-0 flex flex-col border-r border-canvas-border overflow-y-auto">
                    {/* Upload section header */}
                    <div className="px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                                <Wand2 className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Upload & Convert</h3>
                                <p className="text-[10px] text-white/30">Screenshot → Production Code</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pb-5 space-y-4 flex-1">
                        {/* Language selector dropdown */}
                        <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Output Framework</label>
                            <div className="relative" ref={langDropdownRef}>
                                <button
                                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                                    className="w-full flex items-center justify-between gap-2 p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-canvas-border transition-all"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${getLangOption(language).bgColor} ${getLangOption(language).color} ${getLangOption(language).borderColor} border`}>
                                            {getLangOption(language).label}
                                        </span>
                                        <span className="text-[10px] text-white/30 truncate">{getLangOption(language).description}</span>
                                    </div>
                                    <ChevronDown size={14} className={`text-white/30 shrink-0 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {langDropdownOpen && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-canvas-card border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.id}
                                                onClick={() => { setLanguage(lang.id); setLangDropdownOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-all ${language === lang.id ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'}`}
                                            >
                                                <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${lang.bgColor} ${lang.color} ${lang.borderColor} border min-w-[70px] text-center`}>
                                                    {lang.label}
                                                </span>
                                                <span className="text-[10px] text-white/40 flex-1 truncate">{lang.description}</span>
                                                {language === lang.id && <Check size={12} className="text-cyan-400 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dropzone */}
                        {!imagePreview ? (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive
                                    ? 'border-cyan-400 bg-cyan-400/10'
                                    : 'border-canvas-border hover:border-cyan-400/50 hover:bg-cyan-400/[0.04]'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragActive ? 'text-cyan-400' : 'text-white/15'}`} />
                                <p className="text-sm font-semibold text-white/50 mb-1">
                                    {isDragActive ? 'Drop the image here' : 'Drag & drop a UI screenshot'}
                                </p>
                                <p className="text-xs text-white/25">or click to browse — PNG, JPG, WebP (max 10 MB)</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative rounded-xl overflow-hidden border border-canvas-border">
                                    <img src={imagePreview} alt="Uploaded preview" className="w-full rounded-xl max-h-[300px] object-contain bg-black/30" />
                                    <button
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-primary-600/90 rounded-lg transition-colors"
                                    >
                                        <X size={13} className="text-white" />
                                    </button>
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 rounded-md text-[10px] text-white/60 font-medium max-w-[80%] truncate">
                                        {imageFile?.name}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                                <AlertCircle size={14} className="text-primary-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-primary-300 leading-relaxed">{error}</p>
                            </div>
                        )}

                        {/* Generate button */}
                        {imagePreview && !generatedCode && (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-cyan-900/20"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Analyzing image with AI...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" />Generate {getLangOption(language).label} Code</>
                                )}
                            </button>
                        )}

                        {/* Quick actions after generation */}
                        {generatedCode && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onUseCode(generatedCode, language)}
                                        className="flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 transition-all"
                                    >
                                        <Play size={13} />Use in App
                                    </button>
                                    <button
                                        onClick={() => copyCode(generatedCode, 'generated')}
                                        className="flex items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border rounded-xl text-xs font-medium text-white/50 hover:text-white/80 transition-all"
                                    >
                                        {copiedId === 'generated'
                                            ? <><Check size={13} className="text-emerald-400" />Copied!</>
                                            : <><Copy size={13} />Copy Code</>}
                                    </button>
                                    <button
                                        onClick={() => downloadCode(generatedCode, language)}
                                        className="flex items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border rounded-xl text-xs font-medium text-white/50 hover:text-white/80 transition-all"
                                    >
                                        <Download size={13} />Download
                                    </button>
                                    <button
                                        onClick={() => shareCode(generatedCode)}
                                        className="flex items-center justify-center gap-1.5 py-3 bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border rounded-xl text-xs font-medium text-white/50 hover:text-white/80 transition-all"
                                    >
                                        <Share2 size={13} />{shareFlash ? 'Copied!' : 'Share'}
                                    </button>
                                </div>
                                <button
                                    onClick={clearImage}
                                    className="w-full py-2 text-xs font-medium text-white/20 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <RotateCcw size={12} />Convert Another Image
                                </button>
                            </div>
                        )}

                        {/* Features */}
                        {!imagePreview && (
                            <div className="space-y-2 pt-2">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Features</p>
                                {[
                                    { icon: <Zap size={12} />, label: 'AI-powered pixel-perfect conversion' },
                                    { icon: <Eye size={12} />, label: 'Responsive & accessible output' },
                                    { icon: <Layers size={12} />, label: 'Clean semantic HTML structure' },
                                    { icon: <Sparkles size={12} />, label: 'Modern CSS / Tailwind classes' },
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center gap-2.5 py-1.5 text-white/25">
                                        <span className="text-cyan-500/40">{f.icon}</span>
                                        <span className="text-[11px]">{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Generated Code & History ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Generated code area */}
                    {generatedCode ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-canvas-border shrink-0">
                                <div className="flex items-center gap-2">
                                    <Code2 size={14} className="text-cyan-400" />
                                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Generated Code</span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">✓ Ready</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${getLangOption(language).bgColor} ${getLangOption(language).color} ${getLangOption(language).borderColor} border`}>
                                        {getLangOption(language).label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => copyCode(generatedCode, 'code-top')} className="text-[10px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                                        {copiedId === 'code-top' ? <><Check size={11} className="text-emerald-400" />Copied</> : <><Copy size={11} />Copy</>}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <pre className="text-[12px] text-white/70 p-5 leading-relaxed font-mono whitespace-pre-wrap break-words">
                                    {generatedCode}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        /* History or empty state */
                        <div className="flex-1 overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 p-10">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg font-semibold mb-1">No conversions yet</p>
                                    <p className="text-sm text-white/15">Upload a UI screenshot on the left to get started</p>
                                </div>
                            ) : (
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-white/30" />
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Conversion History</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">
                                                {historyFilter === 'all' ? history.length : history.filter(h => h.language === historyFilter).length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Filter by language */}
                                            <select
                                                value={historyFilter}
                                                onChange={e => setHistoryFilter(e.target.value as ImageToCodeLanguage | 'all')}
                                                className="text-[10px] bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1 text-white/50 outline-none cursor-pointer appearance-none"
                                            >
                                                <option value="all">All Languages</option>
                                                {LANGUAGES.map(l => (
                                                    <option key={l.id} value={l.id}>{l.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={clearAll}
                                                className="text-[10px] font-medium text-white/20 hover:text-primary-400 hover:bg-primary-500/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                                            >
                                                <Trash2 size={10} />Clear All
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {history
                                            .filter(item => historyFilter === 'all' || item.language === historyFilter)
                                            .map(item => {
                                                const itemLang = getLangOption(item.language);
                                                return (
                                                    <div key={item.id} className="rounded-xl border border-canvas-border bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-all">
                                                        {/* Thumbnail */}
                                                        <div className="aspect-video bg-black/30 overflow-hidden">
                                                            <img src={item.thumbDataUrl} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        {/* Meta */}
                                                        <div className="p-3 space-y-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${itemLang.bgColor} ${itemLang.color} ${itemLang.borderColor}`}>
                                                                    {itemLang.label}
                                                                </span>
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${item.status === 'success'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                                                                    }`}>
                                                                    {item.status === 'success' ? '✓ Success' : '✗ Failed'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-white/30">{new Date(item.timestamp).toLocaleString()}</p>

                                                            {item.status === 'success' && (
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={() => { onUseCode(item.code, item.language); }}
                                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/25 rounded-lg text-[10px] font-semibold text-cyan-300 transition-all"
                                                                    >
                                                                        <Play size={10} />Use
                                                                    </button>
                                                                    <button
                                                                        onClick={() => copyCode(item.code, item.id)}
                                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-canvas-border rounded-lg text-[10px] font-medium text-white/40 hover:text-white/70 transition-all"
                                                                    >
                                                                        {copiedId === item.id ? <><Check size={10} className="text-emerald-400" />Copied</> : <><Copy size={10} />Copy</>}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteItem(item.id)}
                                                                        className="p-1.5 bg-white/[0.04] hover:bg-primary-500/15 border border-canvas-border rounded-lg text-white/25 hover:text-primary-400 transition-all"
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {item.status === 'failed' && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="text-[10px] text-primary-400/60 flex-1 truncate">{item.error || 'Failed'}</p>
                                                                    <button
                                                                        onClick={() => deleteItem(item.id)}
                                                                        className="p-1.5 hover:bg-primary-500/15 rounded-lg text-white/25 hover:text-primary-400 transition-all"
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Share flash notification */}
            {shareFlash && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-300 shadow-xl pointer-events-none z-50">
                    Code copied to clipboard!
                </div>
            )}
        </div>
    );
};

export default ImageToCodePanel;
