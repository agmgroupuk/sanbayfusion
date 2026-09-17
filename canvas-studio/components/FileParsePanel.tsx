import React, { useState, useRef, useCallback } from 'react';

interface ParsedFile {
    name: string;
    type: string;
    size: number;
    content: string;
}

interface FileParseResult {
    fileName: string;
    fileType: string;
    content: string;
    rows?: number;
    pages?: number;
    wordCount?: number;
}

const ACCEPT_TYPES = '.pdf,.csv,.docx,.doc,.txt,.md,.json,.html,.xml,.xlsx';
const MAX_SIZE_MB = 10;

function detectFileType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        pdf: 'PDF Document',
        csv: 'CSV Spreadsheet',
        docx: 'Word Document',
        doc: 'Word Document',
        txt: 'Plain Text',
        md: 'Markdown',
        json: 'JSON Data',
        html: 'HTML Page',
        xml: 'XML Data',
        xlsx: 'Excel Spreadsheet',
    };
    return map[ext] || 'Unknown';
}

export default function FileParsePanel() {
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [result, setResult] = useState<FileParseResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'preview' | 'raw'>('preview');
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File must be under ${MAX_SIZE_MB} MB`);
            return;
        }
        setParsing(true);
        setError(null);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/canvas/parse-file', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Parse failed');
            setResult({
                fileName: file.name,
                fileType: detectFileType(file.name),
                content: data.content || data.text || '',
                rows: data.rows,
                pages: data.pages,
                wordCount: data.wordCount,
            });
        } catch (e: any) {
            setError(e.message || 'Failed to parse file');
        } finally {
            setParsing(false);
        }
    }, []);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = '';
    };

    const copyContent = () => {
        if (result?.content) navigator.clipboard.writeText(result.content);
    };

    const preview = result?.content?.slice(0, 2000) || '';

    return (
        <div className="p-6 space-y-5">
            {/* Drop zone */}
            <div
                onDragEnter={e => { e.preventDefault(); setDragging(true); }}
                onDragOver={e => e.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging
                        ? 'border-cyan-500/60 bg-cyan-500/5'
                        : 'border-gray-700 hover:border-gray-600 bg-black/20'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT_TYPES}
                    onChange={onFileInput}
                    className="hidden"
                />
                {parsing ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <svg className="animate-spin h-8 w-8 text-cyan-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <p className="text-sm text-canvas-muted">Parsing file...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="text-4xl">📄</div>
                        <div>
                            <p className="text-sm font-medium text-canvas-text">
                                {dragging ? 'Drop to parse' : 'Drop a file here or click to upload'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">PDF, CSV, DOCX, TXT, MD, JSON, HTML, XML (max {MAX_SIZE_MB} MB)</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg px-4 py-3 text-sm text-primary-400">
                    {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="space-y-4">
                    {/* File info */}
                    <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-200 truncate">{result.fileName}</p>
                                <p className="text-xs text-cyan-400 mt-0.5">{result.fileType}</p>
                            </div>
                            <div className="flex gap-4 text-xs text-canvas-muted-deep shrink-0">
                                {result.pages != null && <span>{result.pages} pages</span>}
                                {result.rows != null && <span>{result.rows} rows</span>}
                                {result.wordCount != null && <span>{result.wordCount} words</span>}
                            </div>
                        </div>
                    </div>

                    {/* Content tabs */}
                    <div>
                        <div className="flex border-b border-gray-800 mb-3">
                            {(['preview', 'raw'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-4 py-2 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t
                                            ? 'border-cyan-500 text-cyan-400'
                                            : 'border-transparent text-canvas-muted-deep hover:text-canvas-muted'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="bg-black/40 border border-gray-800 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-canvas-text whitespace-pre-wrap font-mono leading-relaxed">
                                {preview}
                                {(result.content?.length || 0) > 2000 && (
                                    <span className="text-gray-600">
                                        {'\n\n'}... +{result.content.length - 2000} more characters
                                    </span>
                                )}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={copyContent}
                            className="flex-1 py-2 text-xs font-medium bg-black/40 border border-gray-700 hover:border-cyan-500/40 text-canvas-muted hover:text-cyan-400 rounded-lg transition-all"
                        >
                            📋 Copy Content
                        </button>
                        <button
                            onClick={() => { setResult(null); setError(null); }}
                            className="flex-1 py-2 text-xs font-medium bg-black/40 border border-gray-700 hover:border-gray-600 text-canvas-muted-deep hover:text-canvas-muted rounded-lg transition-all"
                        >
                            + Parse Another
                        </button>
                    </div>

                    {/* Send to chat hint */}
                    <p className="text-xs text-gray-600 text-center">
                        💡 Tip: Type in chat to ask the AI about this parsed content — paste a snippet for best results
                    </p>
                </div>
            )}
        </div>
    );
}
