import React, { useState, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolDefinition {
    id: string;
    icon: string;
    label: string;
    desc: string;
    tag: string;
    /** Backend tool name for agent-chat */
    tool: string;
    /** Optional: custom form fields per tool */
    fields?: ToolField[];
    /** Optional: accent color override */
    accentColor?: string;
}

export interface ToolField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'toggle';
    placeholder?: string;
    options?: { value: string; label: string }[];
    defaultValue?: string | number | boolean;
    required?: boolean;
}

export interface ExecutionResult {
    id: string;
    toolId: string;
    toolLabel: string;
    toolIcon: string;
    input: string;
    fieldValues: Record<string, string | number | boolean>;
    output: string;
    rawData?: any;
    executedAt: string;
    duration: number;
    status: 'success' | 'error';
}

export interface ToolExecutionPanelProps {
    /** Category title (e.g., "Security Scanner") */
    title: string;
    /** Category icon */
    icon: string;
    /** Short tagline */
    tagline: string;
    /** Description for the right panel header */
    description: string;
    /** Accent color for theming (tailwind color name without prefix) */
    accentColor: string;
    /** Array of tool definitions */
    tools: ToolDefinition[];
    /** Current code context to send to backend */
    currentCode?: string;
    /** Optional: callback when user clicks "Apply Code" on results containing code blocks */
    onApplyCode?: (code: string) => void;
    /** Optional: custom prompt builder. If not provided, uses default */
    buildPrompt?: (tool: ToolDefinition, contextInput: string, fieldValues: Record<string, string | number | boolean>, currentCode?: string) => string;
    /** Optional: custom result parser. Receives full API response, returns formatted output string */
    parseResult?: (data: any, tool: ToolDefinition) => { output: string; rawData?: any };
    /** Optional: custom result renderer. If not provided, renders output as pre-formatted text */
    renderResult?: (result: ExecutionResult) => React.ReactNode;
    /** Optional: label for the main input */
    inputLabel?: string;
    /** Optional: placeholder for the main input */
    inputPlaceholder?: string;
    /** Optional: require input before execution (default false) */
    requireInput?: boolean;
    /** Optional: execute button label */
    executeLabel?: string;
    /** Optional: provider override */
    provider?: string;
    /** Optional: model override */
    modelId?: string;
}

// ─── Accent Color Mapping ─────────────────────────────────────────────────────

const ACCENT = {
    red: {
        text: 'text-primary-400',
        bg: 'bg-primary-600 hover:bg-primary-500',
        bgLight: 'bg-primary-500/10',
        bgBtn: 'bg-primary-500/20 hover:bg-primary-500/30',
        border: 'border-primary-500/30',
        borderActive: 'border-primary-500/40 bg-primary-500/10',
        textBtn: 'text-primary-400',
        focusBorder: 'focus:border-primary-500/40',
    },
    cyan: {
        text: 'text-cyan-400',
        bg: 'bg-cyan-600 hover:bg-cyan-500',
        bgLight: 'bg-cyan-500/10',
        bgBtn: 'bg-cyan-500/20 hover:bg-cyan-500/30',
        border: 'border-cyan-500/30',
        borderActive: 'border-cyan-500/40 bg-cyan-500/10',
        textBtn: 'text-cyan-400',
        focusBorder: 'focus:border-cyan-500/40',
    },
    emerald: {
        text: 'text-emerald-400',
        bg: 'bg-emerald-600 hover:bg-emerald-500',
        bgLight: 'bg-emerald-500/10',
        bgBtn: 'bg-emerald-500/20 hover:bg-emerald-500/30',
        border: 'border-emerald-500/30',
        borderActive: 'border-emerald-500/40 bg-emerald-500/10',
        textBtn: 'text-emerald-400',
        focusBorder: 'focus:border-emerald-500/40',
    },
    violet: {
        text: 'text-violet-400',
        bg: 'bg-violet-600 hover:bg-violet-500',
        bgLight: 'bg-violet-500/10',
        bgBtn: 'bg-violet-500/20 hover:bg-violet-500/30',
        border: 'border-violet-500/30',
        borderActive: 'border-violet-500/40 bg-violet-500/10',
        textBtn: 'text-violet-400',
        focusBorder: 'focus:border-violet-500/40',
    },
    amber: {
        text: 'text-amber-400',
        bg: 'bg-amber-600 hover:bg-amber-500',
        bgLight: 'bg-amber-500/10',
        bgBtn: 'bg-amber-500/20 hover:bg-amber-500/30',
        border: 'border-amber-500/30',
        borderActive: 'border-amber-500/40 bg-amber-500/10',
        textBtn: 'text-amber-400',
        focusBorder: 'focus:border-amber-500/40',
    },
    lime: {
        text: 'text-lime-400',
        bg: 'bg-lime-600 hover:bg-lime-500',
        bgLight: 'bg-lime-500/10',
        bgBtn: 'bg-lime-500/20 hover:bg-lime-500/30',
        border: 'border-lime-500/30',
        borderActive: 'border-lime-500/40 bg-lime-500/10',
        textBtn: 'text-lime-400',
        focusBorder: 'focus:border-lime-500/40',
    },
    pink: {
        text: 'text-pink-400',
        bg: 'bg-pink-600 hover:bg-pink-500',
        bgLight: 'bg-pink-500/10',
        bgBtn: 'bg-pink-500/20 hover:bg-pink-500/30',
        border: 'border-pink-500/30',
        borderActive: 'border-pink-500/40 bg-pink-500/10',
        textBtn: 'text-pink-400',
        focusBorder: 'focus:border-pink-500/40',
    },
    blue: {
        text: 'text-blue-400',
        bg: 'bg-blue-600 hover:bg-blue-500',
        bgLight: 'bg-blue-500/10',
        bgBtn: 'bg-blue-500/20 hover:bg-blue-500/30',
        border: 'border-blue-500/30',
        borderActive: 'border-blue-500/40 bg-blue-500/10',
        textBtn: 'text-blue-400',
        focusBorder: 'focus:border-blue-500/40',
    },
    orange: {
        text: 'text-orange-400',
        bg: 'bg-orange-600 hover:bg-orange-500',
        bgLight: 'bg-orange-500/10',
        bgBtn: 'bg-orange-500/20 hover:bg-orange-500/30',
        border: 'border-orange-500/30',
        borderActive: 'border-orange-500/40 bg-orange-500/10',
        textBtn: 'text-orange-400',
        focusBorder: 'focus:border-orange-500/40',
    },
} as const;

type AccentKey = keyof typeof ACCENT;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ToolExecutionPanel({
    title,
    icon,
    tagline,
    description,
    accentColor,
    tools,
    currentCode,
    onApplyCode,
    buildPrompt,
    parseResult,
    renderResult,
    inputLabel = 'Additional Context (Optional)',
    inputPlaceholder,
    requireInput = false,
    executeLabel = 'Execute',
    provider = 'mistral',
    modelId = 'mistral-large-latest',
}: ToolExecutionPanelProps) {
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contextInput, setContextInput] = useState('');
    const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean>>({});
    const [history, setHistory] = useState<ExecutionResult[]>([]);
    const [expandedResult, setExpandedResult] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const accent = ACCENT[(accentColor as AccentKey)] || ACCENT.cyan;
    const selectedTool = tools.find(t => t.id === activeTool);

    // Reset fields when switching tools
    const selectTool = useCallback((toolId: string) => {
        setActiveTool(toolId);
        setError(null);
        setContextInput('');
        const tool = tools.find(t => t.id === toolId);
        if (tool?.fields) {
            const defaults: Record<string, string | number | boolean> = {};
            tool.fields.forEach(f => {
                if (f.defaultValue !== undefined) defaults[f.id] = f.defaultValue;
            });
            setFieldValues(defaults);
        } else {
            setFieldValues({});
        }
    }, [tools]);

    const updateField = useCallback((fieldId: string, value: string | number | boolean) => {
        setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    // ─── Execute ─────────────────────────────────────────────────────────────

    const execute = useCallback(async () => {
        if (!selectedTool) return;
        if (requireInput && !contextInput.trim()) return;

        setBusy(true);
        setError(null);
        const startTime = Date.now();

        try {
            const prompt = buildPrompt
                ? buildPrompt(selectedTool, contextInput, fieldValues, currentCode)
                : contextInput.trim()
                    ? `Perform a ${selectedTool.label} operation using the ${selectedTool.tool} tool. Focus on: ${contextInput.trim()}.${currentCode ? `\n\nCode:\n${currentCode.slice(0, 15000)}` : ''}\n\nProvide detailed, actionable results.`
                    : `Perform a comprehensive ${selectedTool.label} operation using the ${selectedTool.tool} tool on the current project.${currentCode ? `\n\nCode:\n${currentCode.slice(0, 15000)}` : ''}\n\nProvide detailed findings with specific recommendations.`;

            const res = await fetch('/api/canvas/agent-chat', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
                body: JSON.stringify({
                    message: prompt,
                    provider,
                    modelId,
                    conversationHistory: [],
                    ...(currentCode ? { currentCode: currentCode.slice(0, 15000) } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Operation failed');

            let output: string;
            let rawData: any;

            if (parseResult) {
                const parsed = parseResult(data, selectedTool);
                output = parsed.output;
                rawData = parsed.rawData;
            } else {
                const toolResult = data.toolResults?.find((t: any) => t.name === selectedTool.tool);
                if (toolResult?.result) {
                    output = typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result, null, 2);
                    rawData = toolResult.result;
                } else {
                    output = data.response || data.message || JSON.stringify(data, null, 2);
                }
            }

            const result: ExecutionResult = {
                id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                toolId: selectedTool.id,
                toolLabel: selectedTool.label,
                toolIcon: selectedTool.icon,
                input: contextInput.trim() || '(full analysis)',
                fieldValues: { ...fieldValues },
                output,
                rawData,
                executedAt: new Date().toLocaleString(),
                duration: Date.now() - startTime,
                status: 'success',
            };
            setHistory(prev => [result, ...prev]);
            setExpandedResult(result.id);

            // Scroll to results
            setTimeout(() => resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        } catch (e: any) {
            setError(e.message || 'Operation failed');
        } finally {
            setBusy(false);
        }
    }, [selectedTool, contextInput, fieldValues, currentCode, buildPrompt, parseResult, requireInput, provider, modelId]);

    // ─── Actions ─────────────────────────────────────────────────────────────

    const deleteResult = (id: string) => {
        setHistory(prev => prev.filter(r => r.id !== id));
        if (expandedResult === id) setExpandedResult(null);
    };

    const exportResult = (result: ExecutionResult) => {
        const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.toolId}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportJSON = (result: ExecutionResult) => {
        const report = {
            tool: result.toolLabel,
            executedAt: result.executedAt,
            duration: `${(result.duration / 1000).toFixed(1)}s`,
            input: result.input,
            fields: result.fieldValues,
            output: result.rawData || result.output,
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.toolId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyResult = (result: ExecutionResult) => {
        navigator.clipboard.writeText(result.output);
        setCopiedId(result.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const shareResult = (result: ExecutionResult) => {
        if (navigator.share) {
            navigator.share({
                title: `${title} - ${result.toolLabel}`,
                text: result.output.slice(0, 2000),
            });
        } else {
            // Fallback: copy to clipboard
            copyResult(result);
        }
    };

    const totalRuns = history.length;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex">
            {/* ═══ Main Panel (Left) ═══ */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header — Tool Selected */}
                {selectedTool ? (
                    <div className="border-b border-canvas-border p-5">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedTool.icon}</span>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-bold text-gray-200">{selectedTool.label}</h2>
                                <p className="text-xs text-canvas-muted-deep mt-0.5 leading-relaxed">{selectedTool.desc}</p>
                            </div>
                            <button onClick={() => setActiveTool(null)} className="text-gray-600 hover:text-canvas-muted transition-colors p-1">✕</button>
                        </div>

                        {/* Custom Fields */}
                        {selectedTool.fields && selectedTool.fields.length > 0 && (
                            <div className="mt-4 space-y-3">
                                {selectedTool.fields.map(field => (
                                    <div key={field.id}>
                                        <label className="block text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-1.5">
                                            {field.label} {field.required && <span className="text-primary-400">*</span>}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                value={String(fieldValues[field.id] ?? field.defaultValue ?? '')}
                                                onChange={e => updateField(field.id, e.target.value)}
                                                placeholder={field.placeholder}
                                                rows={3}
                                                className={`w-full text-xs font-mono bg-black/40 border border-canvas-border rounded-xl px-3.5 py-2.5 text-canvas-text placeholder-gray-700 outline-none ${accent.focusBorder} resize-none`}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                value={String(fieldValues[field.id] ?? field.defaultValue ?? '')}
                                                onChange={e => updateField(field.id, e.target.value)}
                                                className="w-full text-xs bg-black/40 border border-canvas-border rounded-xl px-3.5 py-2.5 text-canvas-text outline-none"
                                            >
                                                {field.options?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'number' ? (
                                            <input
                                                type="number"
                                                value={String(fieldValues[field.id] ?? field.defaultValue ?? '')}
                                                onChange={e => updateField(field.id, Number(e.target.value))}
                                                placeholder={field.placeholder}
                                                className={`w-full text-xs font-mono bg-black/40 border border-canvas-border rounded-xl px-3.5 py-2.5 text-canvas-text placeholder-gray-700 outline-none ${accent.focusBorder}`}
                                            />
                                        ) : field.type === 'toggle' ? (
                                            <button
                                                onClick={() => updateField(field.id, !fieldValues[field.id])}
                                                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-colors ${fieldValues[field.id] ? `${accent.borderActive} ${accent.textBtn}` : 'border-canvas-border text-canvas-muted-deep'}`}
                                            >
                                                {fieldValues[field.id] ? '✓ Enabled' : '○ Disabled'}
                                            </button>
                                        ) : (
                                            <input
                                                type="text"
                                                value={String(fieldValues[field.id] ?? field.defaultValue ?? '')}
                                                onChange={e => updateField(field.id, e.target.value)}
                                                placeholder={field.placeholder}
                                                className={`w-full text-xs font-mono bg-black/40 border border-canvas-border rounded-xl px-3.5 py-2.5 text-canvas-text placeholder-gray-700 outline-none ${accent.focusBorder}`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Context Input */}
                        <div className="mt-4">
                            <label className="block text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-2">
                                {inputLabel} {requireInput && <span className="text-primary-400">*</span>}
                            </label>
                            <textarea
                                value={contextInput}
                                onChange={e => setContextInput(e.target.value)}
                                placeholder={inputPlaceholder || `Describe what you need from ${selectedTool.label.toLowerCase()}...`}
                                rows={3}
                                className={`w-full text-xs font-mono bg-black/40 border border-canvas-border rounded-xl px-3.5 py-2.5 text-canvas-text placeholder-gray-700 outline-none ${accent.focusBorder} resize-none`}
                            />
                        </div>

                        {/* Execute Button */}
                        <button
                            onClick={execute}
                            disabled={busy || (requireInput && !contextInput.trim())}
                            className={`w-full mt-3 flex items-center justify-center gap-2.5 py-2.5 ${accent.bg} disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors`}
                        >
                            {busy ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Running...
                                </>
                            ) : (
                                <>{selectedTool.icon} {executeLabel}</>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Header — No Tool Selected */
                    <div className="border-b border-canvas-border p-5">
                        <h2 className={`text-sm font-bold ${accent.text} uppercase tracking-wider`}>{icon} {title}</h2>
                        <p className="text-xs text-canvas-muted-deep mt-1">{tagline} — select a tool from the right panel</p>
                        {history.length > 0 && (
                            <div className={`mt-3 rounded-lg px-3 py-2 border ${accent.bgLight} ${accent.border}`}>
                                <span className={`text-xs font-semibold ${accent.text}`}>{history.length} execution{history.length !== 1 ? 's' : ''} completed</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-5 mt-3 bg-primary-500/10 border border-primary-500/30 rounded-lg px-4 py-3 text-xs text-primary-400 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-primary-500 hover:text-primary-400 ml-2">✕</button>
                    </div>
                )}

                {/* Results / History */}
                <div ref={resultsRef} className="flex-1 overflow-y-auto p-5 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                    {history.length === 0 && !selectedTool && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <span className="text-4xl mb-3">{icon}</span>
                            <p className="text-sm text-canvas-muted font-medium">No executions yet</p>
                            <p className="text-xs text-gray-600 mt-1 max-w-xs">Select a tool from the right panel and run it. Results will appear here with full output, download, and sharing options.</p>
                        </div>
                    )}

                    {history.map(result => {
                        const isExpanded = expandedResult === result.id;
                        return (
                            <div key={result.id} className="border border-canvas-border rounded-xl overflow-hidden">
                                {/* Result Header */}
                                <button
                                    onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                                >
                                    <span className="text-sm">{result.toolIcon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-canvas-text">{result.toolLabel}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${result.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
                                                {result.status === 'success' ? '✓ Success' : '✕ Error'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-gray-600">{result.executedAt}</span>
                                            <span className="text-[10px] text-gray-700">{(result.duration / 1000).toFixed(1)}s</span>
                                        </div>
                                    </div>
                                    <span className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-canvas-border">
                                        {/* Action Bar */}
                                        <div className="flex items-center gap-1 px-4 py-2 bg-white/[0.01] border-b border-canvas-border flex-wrap">
                                            <button onClick={() => exportResult(result)} className={`text-[10px] text-canvas-muted-deep hover:${accent.textBtn} px-2 py-1 rounded hover:bg-white/[0.04] transition-colors`} title="Download as text">
                                                📥 Download
                                            </button>
                                            <button onClick={() => exportJSON(result)} className={`text-[10px] text-canvas-muted-deep hover:${accent.textBtn} px-2 py-1 rounded hover:bg-white/[0.04] transition-colors`} title="Download as JSON">
                                                📋 JSON
                                            </button>
                                            <button onClick={() => copyResult(result)} className={`text-[10px] text-canvas-muted-deep hover:${accent.textBtn} px-2 py-1 rounded hover:bg-white/[0.04] transition-colors`} title="Copy to clipboard">
                                                {copiedId === result.id ? '✅ Copied' : '📋 Copy'}
                                            </button>
                                            <button onClick={() => shareResult(result)} className={`text-[10px] text-canvas-muted-deep hover:${accent.textBtn} px-2 py-1 rounded hover:bg-white/[0.04] transition-colors`} title="Share">
                                                🔗 Share
                                            </button>
                                            {onApplyCode && result.output.includes('```') && (
                                                <button onClick={() => {
                                                    const codeMatch = result.output.match(/```[\w]*\n([\s\S]*?)```/);
                                                    if (codeMatch?.[1]) onApplyCode(codeMatch[1]);
                                                }} className="text-[10px] text-canvas-muted-deep hover:text-emerald-400 px-2 py-1 rounded hover:bg-white/[0.04] transition-colors" title="Apply code to editor">
                                                    ✨ Apply Code
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                setActiveTool(result.toolId);
                                                setContextInput(result.input === '(full analysis)' ? '' : result.input);
                                            }} className={`text-[10px] text-canvas-muted-deep hover:${accent.textBtn} px-2 py-1 rounded hover:bg-white/[0.04] transition-colors`} title="Re-run with same input">
                                                🔄 Re-run
                                            </button>
                                            <div className="flex-1" />
                                            <button onClick={() => deleteResult(result.id)} className="text-[10px] text-gray-600 hover:text-primary-400 px-2 py-1 rounded hover:bg-primary-500/10 transition-colors" title="Delete">
                                                🗑️ Delete
                                            </button>
                                        </div>

                                        {/* Input Context */}
                                        {result.input && result.input !== '(full analysis)' && (
                                            <div className="px-4 py-2 bg-white/[0.01]">
                                                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Input: </span>
                                                <span className="text-[10px] text-canvas-muted italic">{result.input}</span>
                                            </div>
                                        )}

                                        {/* Field Values */}
                                        {Object.keys(result.fieldValues).length > 0 && (
                                            <div className="px-4 py-2 bg-white/[0.01] border-t border-canvas-border flex flex-wrap gap-2">
                                                {Object.entries(result.fieldValues).map(([key, val]) => (
                                                    <span key={key} className="text-[9px] font-mono text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                                        {key}: {String(val)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Output */}
                                        <div className="p-4">
                                            {renderResult ? renderResult(result) : (
                                                <pre className="text-[11px] font-mono text-canvas-text whitespace-pre-wrap break-words bg-black/30 rounded-lg p-3 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                                    {result.output}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Right Tool List Panel ═══ */}
            <div className="w-72 border-l border-canvas-border flex flex-col bg-white/[0.01]">
                {/* Panel Header */}
                <div className="p-4 border-b border-canvas-border">
                    <h3 className={`text-xs font-bold ${accent.text} uppercase tracking-wider`}>{icon} {title}</h3>
                    <p className="text-[10px] text-gray-600 mt-1">{tagline}</p>
                    <p className="text-[10px] text-gray-700 mt-2 leading-relaxed">{description}</p>
                </div>

                {/* Tool Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                    {tools.map(tool => (
                        <div
                            key={tool.id}
                            className={`rounded-xl border p-3 transition-all cursor-pointer ${activeTool === tool.id
                                ? accent.borderActive
                                : 'border-canvas-border bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                }`}
                            onClick={() => selectTool(tool.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-lg">{tool.icon}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-canvas-text truncate">{tool.label}</p>
                                        <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">{tool.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectTool(tool.id);
                                        // Execute after state update
                                        setTimeout(() => {
                                            const btn = document.querySelector('[data-exec-btn]') as HTMLButtonElement;
                                            if (btn && !btn.disabled) btn.click();
                                        }, 100);
                                    }}
                                    className={`ml-2 px-2.5 py-1 text-[10px] font-bold ${accent.bgBtn} ${accent.textBtn} rounded-lg transition-colors shrink-0`}
                                >
                                    RUN
                                </button>
                            </div>
                            <div className="mt-1.5">
                                <span className="text-[9px] text-gray-700 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">{tool.tag}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Stats */}
                {history.length > 0 && (
                    <div className="border-t border-canvas-border p-3">
                        <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider font-semibold">Execution History</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-center bg-white/[0.03] rounded-lg p-2">
                                <div className="text-sm font-bold text-canvas-text">{totalRuns}</div>
                                <div className="text-[9px] text-gray-600">Total Runs</div>
                            </div>
                            <div className="text-center bg-white/[0.03] rounded-lg p-2">
                                <div className="text-sm font-bold text-emerald-400">{history.filter(r => r.status === 'success').length}</div>
                                <div className="text-[9px] text-gray-600">Successful</div>
                            </div>
                        </div>
                        <button onClick={() => { setHistory([]); setExpandedResult(null); }}
                            className="w-full mt-2 text-[10px] text-gray-600 hover:text-primary-400 py-1 rounded hover:bg-primary-500/10 transition-colors">
                            Clear History
                        </button>
                    </div>
                )}

                <div className="border-t border-canvas-border px-3 py-2">
                    <p className="text-[9px] text-gray-700">Click <span className={`${accent.textBtn} font-bold`}>Run</span> to execute · Results appear in the main panel with download and share options</p>
                </div>
            </div>
        </div>
    );
}
