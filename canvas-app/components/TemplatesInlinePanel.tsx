import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProgrammingLanguage, Template } from '../types';
import { Search, ArrowLeft, Eye, Code, Play, X, ChevronRight, Zap, FileText, Globe } from 'lucide-react';
import { PREBUILT_APPS, PrebuiltApp } from '../data/prebuilt-apps';
import { TEMPLATES, LANGUAGES } from './TemplatesPanel';

// ── Unified item type ──────────────────────────────────────────────

interface UnifiedTemplate {
    id: string;
    name: string;
    description: string;
    language: ProgrammingLanguage;
    icon: string;
    tags: string[];
    category: string;
    type: 'prebuilt' | 'ai-prompt';
    code?: string;
    prompt?: string;
}

// Merge prebuilt apps and AI templates into one list
function getUnifiedTemplates(): UnifiedTemplate[] {
    const items: UnifiedTemplate[] = [];

    // Prebuilt apps first (they have actual code)
    for (const app of PREBUILT_APPS) {
        items.push({
            id: `prebuilt-${app.id}`,
            name: app.name,
            description: app.description,
            language: app.language,
            icon: app.icon,
            tags: [],
            category: 'prebuilt',
            type: 'prebuilt',
            code: app.code,
        });
    }

    // AI prompt templates
    for (const tpl of TEMPLATES) {
        // Skip if a prebuilt app already covers this name
        if (items.some(i => i.name.toLowerCase() === tpl.name.toLowerCase())) continue;
        const lang = LANGUAGES.find(l => l.id === tpl.language);
        items.push({
            id: `template-${tpl.id}`,
            name: tpl.name,
            description: tpl.description,
            language: tpl.language,
            icon: lang?.icon || '📄',
            tags: tpl.tags || [],
            category: tpl.category,
            type: 'ai-prompt',
            prompt: tpl.prompt,
        });
    }

    return items;
}

const ALL_TEMPLATES = getUnifiedTemplates();

// ── Category/filter config ─────────────────────────────────────────

type FilterTab = 'all' | 'landing' | 'dashboard' | 'ecommerce' | 'portfolio' | 'api' | 'game' | 'component' | 'fullstack' | 'automation';
const CATEGORY_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'landing', label: 'Landing Pages' },
    { id: 'dashboard', label: 'Dashboards' },
    { id: 'ecommerce', label: 'E-commerce' },
    { id: 'portfolio', label: 'Portfolios' },
    { id: 'api', label: 'APIs' },
    { id: 'component', label: 'Components' },
    { id: 'fullstack', label: 'Full-Stack' },
    { id: 'automation', label: 'Automation' },
    { id: 'game', label: 'Games' },
];

const LANG_FILTERS: { id: ProgrammingLanguage | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'html', label: 'HTML' },
    { id: 'react', label: 'React' },
    { id: 'python', label: 'Python' },
    { id: 'nextjs', label: 'Next.js' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'javascript', label: 'JavaScript' },
];

// ── Props ──────────────────────────────────────────────────────────

interface TemplatesInlinePanelProps {
    onUsePrebuilt: (app: PrebuiltApp) => void;
    onUseAITemplate?: (template: Template) => void;
}

// ── Component ──────────────────────────────────────────────────────

const TemplatesInlinePanel: React.FC<TemplatesInlinePanelProps> = ({ onUsePrebuilt, onUseAITemplate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLang, setSelectedLang] = useState<ProgrammingLanguage | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<FilterTab>('all');
    const [viewingTemplate, setViewingTemplate] = useState<UnifiedTemplate | null>(null);
    const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Filter templates
    const filtered = useMemo(() => {
        return ALL_TEMPLATES.filter(item => {
            if (selectedLang !== 'all' && item.language !== selectedLang) return false;
            if (selectedCategory !== 'all') {
                if (selectedCategory === 'landing' && item.category !== 'landing' && item.category !== 'prebuilt') return false;
                if (selectedCategory !== 'landing' && item.category !== selectedCategory && item.category === 'prebuilt') return true;
                if (selectedCategory !== 'landing' && item.category !== selectedCategory && item.category !== 'prebuilt') return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) ||
                    item.tags.some(t => t.toLowerCase().includes(q));
            }
            return true;
        });
    }, [searchQuery, selectedLang, selectedCategory]);

    // Language icon lookup
    const getLangInfo = (langId: ProgrammingLanguage) => {
        const lang = LANGUAGES.find(l => l.id === langId);
        return { icon: lang?.icon || '📄', name: lang?.name || langId, color: lang?.color || '#666' };
    };

    // Handle Use action
    const handleUse = (item: UnifiedTemplate) => {
        if (item.type === 'prebuilt') {
            const app = PREBUILT_APPS.find(a => `prebuilt-${a.id}` === item.id);
            if (app) onUsePrebuilt(app);
        } else if (item.type === 'ai-prompt' && onUseAITemplate) {
            const tpl = TEMPLATES.find(t => `template-${t.id}` === item.id);
            if (tpl) onUseAITemplate(tpl);
        }
    };

    // Write HTML to iframe for preview (must be before conditional return)
    const viewingCode = viewingTemplate?.code || '';
    const isHtmlCode = viewingCode.trimStart().startsWith('<!DOCTYPE') || viewingCode.trimStart().startsWith('<html') || (viewingCode.trimStart().startsWith('<') && !viewingCode.trimStart().startsWith('<'));
    const isPrebuiltViewing = viewingTemplate?.type === 'prebuilt' && !!viewingTemplate?.code;
    // Detect actual HTML content more accurately
    const htmlTest = viewingCode.trimStart();
    const canIframePreview = isPrebuiltViewing && (
        htmlTest.startsWith('<!DOCTYPE') || htmlTest.startsWith('<html') ||
        (htmlTest.startsWith('<') && (htmlTest.includes('</html>') || htmlTest.includes('</body>') || htmlTest.includes('</head>')))
    );
    useEffect(() => {
        if (canIframePreview && previewMode === 'preview' && iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(viewingCode);
                doc.close();
            }
        }
    }, [viewingTemplate, previewMode, canIframePreview, viewingCode]);

    // Extract info from code comments for rich preview
    const extractCodeInfo = (code: string) => {
        const lines = code.split('\n');
        const features: string[] = [];
        const runCommands: string[] = [];
        let title = '';
        let overview = '';

        for (const line of lines) {
            const trimmed = line.trim();
            // Extract "Run:" instructions
            if (/^[#*\/]*\s*Run:/i.test(trimmed)) {
                runCommands.push(trimmed.replace(/^[#*\/]*\s*Run:\s*/i, ''));
            }
            // Extract bullet-point features (lines starting with - in comments)
            if (/^[#*]*\s*-\s+\*\*/.test(trimmed) || /^#\s*-\s+/.test(trimmed)) {
                features.push(trimmed.replace(/^[#*]*\s*-\s+/, '').replace(/\*\*/g, ''));
            }
            // Top-level title from docstring or comment header
            if (!title && /^(#\s+[A-Z]|"""|\/\*\*|\/\/\s*={3,})/.test(trimmed)) {
                const nextLine = lines[lines.indexOf(line) + 1]?.trim();
                if (nextLine && !/^[=#*\/"]/.test(nextLine) && nextLine.length > 5) {
                    title = nextLine;
                }
            }
        }

        // Extract description from first block comment
        const commentMatch = code.match(/(?:"""[\s\S]*?"""|\/\*\*[\s\S]*?\*\/|^\/\/.*\n(?:\/\/.*\n)*)/);
        if (commentMatch) {
            const commentLines = commentMatch[0].split('\n')
                .map(l => l.replace(/^[\s]*[#*/"]+\s?/, '').trim())
                .filter(l => l && !l.startsWith('===') && !l.startsWith('---') && !l.startsWith('Run:'));
            overview = commentLines.slice(0, 4).join(' ').trim();
        }

        // Detect language-specific info
        const imports = lines.filter(l => /^(import |from |const .* = require|using )/.test(l.trim())).slice(0, 8);
        const functions = lines.filter(l => /^(def |function |class |export |async function |const \w+ = |app\.)/.test(l.trim())).slice(0, 10);

        return { features, runCommands, title, overview, imports, functions };
    };

    // ── Template Detail / Preview View ──

    if (viewingTemplate) {
        const lang = getLangInfo(viewingTemplate.language);
        const codeInfo = isPrebuiltViewing ? extractCodeInfo(viewingCode) : null;

        return (
            <div className="flex flex-col h-full">
                {/* Detail Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-canvas-border">
                    <button onClick={() => { setViewingTemplate(null); setPreviewMode('preview'); }}
                        className="flex items-center gap-1 text-[11px] text-canvas-muted hover:text-white transition-colors">
                        <ArrowLeft size={14} /> Back
                    </button>
                    {(isPrebuiltViewing) && (
                        <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-md p-0.5">
                            <button onClick={() => setPreviewMode('preview')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${previewMode === 'preview' ? 'bg-primary-600/20 text-primary-400' : 'text-canvas-muted-deep hover:text-canvas-text'
                                    }`}>
                                <Eye size={10} /> {canIframePreview ? 'Preview' : 'Info'}
                            </button>
                            <button onClick={() => setPreviewMode('code')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${previewMode === 'code' ? 'bg-primary-600/20 text-primary-400' : 'text-canvas-muted-deep hover:text-canvas-text'
                                    }`}>
                                <Code size={10} /> Code
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview / Code Area */}
                <div className="flex-1 overflow-hidden relative bg-black/20">
                    {canIframePreview && previewMode === 'preview' ? (
                        <iframe
                            ref={iframeRef}
                            className="w-full h-full border-0 bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title="Template Preview"
                        />
                    ) : isPrebuiltViewing && previewMode === 'code' ? (
                        /* Code view mode */
                        <div className="h-full overflow-auto p-3">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-canvas-border">
                                <span className="text-lg">{viewingTemplate.icon}</span>
                                <div>
                                    <p className="text-xs font-medium text-white">{viewingTemplate.name}</p>
                                    <p className="text-[10px] text-canvas-muted-deep">{lang.name} · {viewingCode.split('\n').length} lines</p>
                                </div>
                            </div>
                            <pre className="text-[11px] text-canvas-text font-mono leading-5 whitespace-pre-wrap break-all">
                                {viewingCode}
                            </pre>
                        </div>
                    ) : isPrebuiltViewing ? (
                        /* Rich info preview for non-HTML prebuilt (or HTML info view) */
                        <div className="h-full overflow-auto p-4 space-y-4">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-3xl">{viewingTemplate.icon}</span>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{viewingTemplate.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border" style={{ borderColor: `${lang.color}40`, color: lang.color, background: `${lang.color}15` }}>{lang.name}</span>
                                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Ready to Use</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white/[0.03] border border-canvas-border rounded-xl p-3">
                                <p className="text-xs text-canvas-text leading-relaxed">{viewingTemplate.description}</p>
                            </div>

                            {/* Run command */}
                            {codeInfo && codeInfo.runCommands.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">▶ How to Run</p>
                                    {codeInfo.runCommands.map((cmd, i) => (
                                        <div key={i} className="bg-black/30 border border-canvas-border rounded-lg px-3 py-2 mb-1 font-mono text-[11px] text-green-400">
                                            $ {cmd}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Key functions / classes */}
                            {codeInfo && codeInfo.functions.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">⚡ Key Components</p>
                                    <div className="space-y-1">
                                        {codeInfo.functions.map((fn, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.02] border border-canvas-border rounded-lg">
                                                <span className="text-[10px]">{fn.trim().startsWith('class ') ? '🏗️' : fn.trim().startsWith('def ') || fn.trim().startsWith('function ') || fn.trim().startsWith('async ') ? '⚙️' : fn.trim().startsWith('app.') ? '🔗' : '📦'}</span>
                                                <code className="text-[10px] text-canvas-muted font-mono truncate">{fn.trim()}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Imports / Dependencies */}
                            {codeInfo && codeInfo.imports.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">📦 Dependencies</p>
                                    <div className="flex flex-wrap gap-1">
                                        {codeInfo.imports.map((imp, i) => {
                                            const modName = imp.match(/(?:from |import |require\(['"])([a-zA-Z_][\w.-]*)/)?.[1] || imp.trim();
                                            return (
                                                <span key={i} className="px-2 py-0.5 text-[9px] rounded-md bg-white/[0.04] border border-canvas-border text-canvas-muted-deep font-mono">
                                                    {modName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Code stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/[0.02] border border-canvas-border rounded-lg p-2.5 text-center">
                                    <div className="text-sm font-bold text-white">{viewingCode.split('\n').length}</div>
                                    <div className="text-[9px] text-gray-600">Lines</div>
                                </div>
                                <div className="bg-white/[0.02] border border-canvas-border rounded-lg p-2.5 text-center">
                                    <div className="text-sm font-bold text-white">{codeInfo?.functions.length || 0}</div>
                                    <div className="text-[9px] text-gray-600">Functions</div>
                                </div>
                                <div className="bg-white/[0.02] border border-canvas-border rounded-lg p-2.5 text-center">
                                    <div className="text-sm font-bold text-white">{codeInfo?.imports.length || 0}</div>
                                    <div className="text-[9px] text-gray-600">Imports</div>
                                </div>
                            </div>

                            {/* Tip */}
                            <div className="bg-gradient-to-r from-primary-600/10 to-orange-600/10 border border-primary-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Zap size={12} className="text-primary-400" />
                                    <span className="text-[10px] font-semibold text-primary-400">Ready to Use</span>
                                </div>
                                <p className="text-[10px] text-canvas-muted">Click "Use Template" to load this into your workspace. You can then customize it through chat or edit files directly.</p>
                            </div>
                        </div>
                    ) : (
                        /* AI Template — show prompt + description */
                        <div className="h-full overflow-auto p-4 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{viewingTemplate.icon}</span>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{viewingTemplate.name}</h3>
                                    <p className="text-[10px] text-canvas-muted-deep">{lang.name} · AI Generated</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">Description</p>
                                <p className="text-xs text-canvas-text leading-relaxed">{viewingTemplate.description}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">AI Prompt</p>
                                <div className="bg-white/[0.03] border border-canvas-border rounded-lg p-3">
                                    <p className="text-[11px] text-canvas-muted leading-relaxed">{viewingTemplate.prompt}</p>
                                </div>
                            </div>
                            {viewingTemplate.tags.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-canvas-muted-deep uppercase tracking-widest mb-1.5">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                        {viewingTemplate.tags.map(t => (
                                            <span key={t} className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded text-[10px]">#{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-gradient-to-r from-primary-600/10 to-orange-600/10 border border-primary-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Zap size={12} className="text-primary-400" />
                                    <span className="text-[10px] font-semibold text-primary-400">AI Generated Template</span>
                                </div>
                                <p className="text-[10px] text-canvas-muted">Click "Use Template" below to generate this app with AI. You can then customize it through the chat.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail Footer — Template Info + Use Button */}
                <div className="border-t border-canvas-border px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{viewingTemplate.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-canvas-text truncate">{viewingTemplate.name}</p>
                            <p className="text-[10px] text-gray-600 truncate">{viewingTemplate.description}</p>
                        </div>
                    </div>
                    <button onClick={() => handleUse(viewingTemplate)}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        <Play size={13} />
                        {viewingTemplate.type === 'prebuilt' ? 'Use Template' : 'Generate with AI'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Templates List View ──

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] text-canvas-muted-deep mb-2">
                    {ALL_TEMPLATES.filter(t => t.type === 'prebuilt').length} ready-to-use · {ALL_TEMPLATES.filter(t => t.type === 'ai-prompt').length} AI templates
                </p>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-canvas-muted-deep" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg focus:ring-1 focus:ring-primary-500/40 focus:border-primary-500/30 outline-none text-gray-200 placeholder-gray-600" />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-canvas-muted-deep" /></button>
                    )}
                </div>
            </div>

            {/* Category Tabs */}
            <div className="px-3 pb-1.5 flex flex-wrap gap-1 border-b border-canvas-border">
                {CATEGORY_TABS.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2 py-0.5 text-[9px] rounded-md font-medium transition-all whitespace-nowrap ${selectedCategory === cat.id
                            ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                            : 'text-canvas-muted-deep border border-canvas-border hover:border-white/[0.12] hover:text-canvas-text'
                            }`}>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Language filter pills */}
            <div className="px-3 py-1.5 flex flex-wrap gap-1 border-b border-canvas-border">
                {LANG_FILTERS.map(lang => (
                    <button key={lang.id} onClick={() => setSelectedLang(lang.id)}
                        className={`px-2 py-0.5 text-[9px] rounded-md font-medium transition-all ${selectedLang === lang.id
                            ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                            : 'text-canvas-muted-deep border border-canvas-border hover:border-white/[0.12] hover:text-canvas-text'
                            }`}>
                        {lang.label}
                    </button>
                ))}
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 text-xs">No templates match your search</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filtered.map(item => {
                            const lang = getLangInfo(item.language);
                            return (
                                <div key={item.id}
                                    className="rounded-xl border border-canvas-border hover:border-primary-500/20 bg-white/[0.02] hover:bg-primary-500/5 transition-all group overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-medium text-canvas-text group-hover:text-primary-300 transition-colors truncate">
                                                        {item.name}
                                                    </p>
                                                    {item.type === 'prebuilt' ? (
                                                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
                                                            READY
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                                                {/* Tech tags */}
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded bg-white/[0.04] text-canvas-muted-deep border border-canvas-border"
                                                        style={{ borderColor: `${lang.color}30`, color: lang.color }}>
                                                        {lang.name}
                                                    </span>
                                                    {item.tags.slice(0, 2).map(t => (
                                                        <span key={t} className="px-1.5 py-0.5 text-[9px] rounded bg-white/[0.04] text-gray-600">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* View / Use Buttons */}
                                        <div className="flex items-center gap-2 mt-3">
                                            <button onClick={() => setViewingTemplate(item)}
                                                className="flex-1 py-1.5 rounded-md text-[11px] font-medium border border-canvas-border text-canvas-muted hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] transition-all flex items-center justify-center gap-1.5">
                                                <Eye size={12} /> View
                                            </button>
                                            <button onClick={() => handleUse(item)}
                                                className="flex-1 py-1.5 rounded-md text-[11px] font-medium bg-gradient-to-r from-primary-600/80 to-primary-500/80 hover:from-primary-600 hover:to-primary-500 text-white transition-all flex items-center justify-center gap-1.5">
                                                <Play size={12} /> Use
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer with count */}
            <div className="px-3 py-2 border-t border-canvas-border text-center">
                <span className="text-[10px] text-gray-600">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
            </div>
        </div>
    );
};

export default TemplatesInlinePanel;
