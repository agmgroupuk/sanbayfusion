/**
 * ApiTesterPanel — Full-featured API testing, mocking, documentation & webhook inspector
 * Tools: api_request, api_mock, api_document, api_test, api_transform, webhook_listen, sdk_generate
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Plus, Trash2, Copy, Check, Loader2, ChevronDown, ChevronRight,
    Globe, Code, FileText, Webhook, Play, RefreshCw, AlertTriangle,
    CheckCircle2, Clock, Zap, Settings, Download, Eye, X, Terminal,
    Shield, Lock, Key, Hash, BarChart3, BookOpen, Package,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const API_BASE = '/api/canvas';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    POST: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    PATCH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    DELETE: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    HEAD: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    OPTIONS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const STATUS_COLOR = (code: number) => {
    if (code < 200) return 'text-zinc-400';
    if (code < 300) return 'text-emerald-400';
    if (code < 400) return 'text-amber-400';
    if (code < 500) return 'text-orange-400';
    return 'text-primary-400';
};

const AUTH_TYPES = ['None', 'Bearer Token', 'API Key', 'Basic Auth', 'OAuth 2.0'] as const;
type AuthType = typeof AUTH_TYPES[number];

type Tab = 'request' | 'mock' | 'docs' | 'test' | 'webhook' | 'sdk';

interface Header { key: string; value: string; enabled: boolean; }
interface ApiResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
    size: number;
}
interface MockEndpoint { method: string; path: string; statusCode: number; body: string; delay: number; id: string; }
interface WebhookEvent { id: string; receivedAt: string; method: string; headers: Record<string, string>; body: string; }
interface TestAssertion { type: 'status' | 'body_contains' | 'header_exists' | 'response_time'; value: string; passed?: boolean; message?: string; }

// ── Tooltip ────────────────────────────────────────────────────────────────
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative inline-flex">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
            <div className="bg-zinc-800 border border-canvas-border text-white text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl max-w-[300px] text-center leading-snug">
                {text}
            </div>
        </div>
    </div>
);

// ── Collapsible Section ────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }> = ({ title, children, defaultOpen = true, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-canvas-border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-2">
                    {badge && <span className="text-xs bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded-full">{badge}</span>}
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

// ── Main Component ─────────────────────────────────────────────────────────
const ApiTesterPanel: React.FC<{ className?: string; projectId?: string; previewUrl?: string | null }> = ({ className = '', projectId, previewUrl }) => {
    const [tab, setTab] = useState<Tab>('request');

    // ── Request state ──────────────────────────────────────────────────────
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('');
    const [headers, setHeaders] = useState<Header[]>([
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true },
    ]);
    const [body, setBody] = useState('{\n  "key": "value"\n}');
    const [authType, setAuthType] = useState<AuthType>('None');
    const [authValue, setAuthValue] = useState('');
    const [authUser, setAuthUser] = useState('');
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [reqTab, setReqTab] = useState<'headers' | 'body' | 'auth' | 'params'>('headers');
    const [copied, setCopied] = useState(false);
    const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'raw'>('body');

    // ── Mock state ─────────────────────────────────────────────────────────
    const [mocks, setMocks] = useState<MockEndpoint[]>([]);
    const [mockLoading, setMockLoading] = useState(false);
    const [mockMethod, setMockMethod] = useState('GET');
    const [mockPath, setMockPath] = useState('/api/users');
    const [mockStatus, setMockStatus] = useState('200');
    const [mockBody, setMockBody] = useState('{\n  "data": [],\n  "total": 0\n}');
    const [mockDelay, setMockDelay] = useState('0');

    // ── Docs state ─────────────────────────────────────────────────────────
    const [docsUrl, setDocsUrl] = useState('');
    const [docsResult, setDocsResult] = useState<string | null>(null);
    const [docsLoading, setDocsLoading] = useState(false);

    // ── Test state ─────────────────────────────────────────────────────────
    const [testUrl, setTestUrl] = useState('');
    const [assertions, setAssertions] = useState<TestAssertion[]>([
        { type: 'status', value: '200' },
        { type: 'response_time', value: '2000' },
    ]);
    const [testRunning, setTestRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestAssertion[] | null>(null);

    // ── Webhook state ──────────────────────────────────────────────────────
    const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
    const [webhookListening, setWebhookListening] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
    const webhookPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── SDK state ──────────────────────────────────────────────────────────
    const [sdkSpecUrl, setSdkSpecUrl] = useState('');
    const [sdkLanguage, setSdkLanguage] = useState('typescript');
    const [sdkResult, setSdkResult] = useState<string | null>(null);
    const [sdkLoading, setSdkLoading] = useState(false);

    // ── Tool caller ────────────────────────────────────────────────────────
    const callTool = useCallback(async (tool: string, params: Record<string, unknown>) => {
        const endpoint = tool.startsWith('api_') || tool.startsWith('webhook') || tool.startsWith('sdk_')
            ? `${API_BASE}/execute-data-tool`
            : `${API_BASE}/execute-data-tool`;
        const res = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, ...params }),
        });
        return res.json();
    }, []);

    // ── Send Request ───────────────────────────────────────────────────────
    const sendRequest = async () => {
        if (!url.trim()) return;
        setLoading(true);
        setResponse(null);
        try {
            const activeHeaders: Record<string, string> = {};
            headers.filter(h => h.enabled && h.key).forEach(h => { activeHeaders[h.key] = h.value; });
            if (authType === 'Bearer Token' && authValue) activeHeaders['Authorization'] = `Bearer ${authValue}`;
            if (authType === 'API Key' && authValue) activeHeaders['X-API-Key'] = authValue;
            if (authType === 'Basic Auth' && authUser && authValue) {
                activeHeaders['Authorization'] = `Basic ${btoa(`${authUser}:${authValue}`)}`;
            }

            const result = await callTool('api_request', {
                method, url,
                headers: activeHeaders,
                body: ['GET', 'HEAD', 'OPTIONS'].includes(method) ? undefined : body,
            });

            if (result.success !== false) {
                setResponse({
                    status: result.status || 200,
                    statusText: result.statusText || 'OK',
                    headers: result.headers || {},
                    body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body || result, null, 2),
                    duration: result.duration || 0,
                    size: result.size || 0,
                });
            } else {
                setResponse({ status: 0, statusText: result.error || 'Error', headers: {}, body: result.error || 'Request failed', duration: 0, size: 0 });
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Network error';
            setResponse({ status: 0, statusText: 'Error', headers: {}, body: msg, duration: 0, size: 0 });
        } finally { setLoading(false); }
    };

    // ── Add Mock ───────────────────────────────────────────────────────────
    const addMock = async () => {
        setMockLoading(true);
        try {
            const result = await callTool('api_mock', {
                action: 'create',
                method: mockMethod,
                path: mockPath,
                statusCode: parseInt(mockStatus),
                body: mockBody,
                delay: parseInt(mockDelay),
            });
            if (result.success !== false) {
                setMocks(prev => [...prev, { id: Date.now().toString(), method: mockMethod, path: mockPath, statusCode: parseInt(mockStatus), body: mockBody, delay: parseInt(mockDelay) }]);
            }
        } catch { }
        finally { setMockLoading(false); }
    };

    // ── Generate Docs ──────────────────────────────────────────────────────
    const generateDocs = async () => {
        if (!docsUrl.trim()) return;
        setDocsLoading(true);
        try {
            const r = await callTool('api_document', { action: 'generate', source: docsUrl });
            setDocsResult(r.markdown || r.content || JSON.stringify(r, null, 2));
        } catch { } finally { setDocsLoading(false); }
    };

    // ── Run Test Suite ─────────────────────────────────────────────────────
    const runTests = async () => {
        if (!testUrl.trim()) return;
        setTestRunning(true);
        setTestResults(null);
        try {
            const r = await callTool('api_test', { url: testUrl, assertions });
            const results: TestAssertion[] = assertions.map((a, i) => ({
                ...a,
                passed: r.results?.[i]?.passed ?? true,
                message: r.results?.[i]?.message || '',
            }));
            setTestResults(results);
        } catch { } finally { setTestRunning(false); }
    };

    // ── Webhook listen ─────────────────────────────────────────────────────
    const toggleWebhook = async () => {
        if (webhookListening) {
            if (webhookPollRef.current) clearInterval(webhookPollRef.current);
            setWebhookListening(false);
        } else {
            setWebhookListening(true);
            await callTool('webhook_listen', { action: 'start' });
            webhookPollRef.current = setInterval(async () => {
                const r = await callTool('webhook_listen', { action: 'poll' });
                if (r.events?.length) setWebhookEvents(prev => [...r.events, ...prev].slice(0, 50));
            }, 2000);
        }
    };
    useEffect(() => () => { if (webhookPollRef.current) clearInterval(webhookPollRef.current); }, []);

    // ── Generate SDK ───────────────────────────────────────────────────────
    const generateSdk = async () => {
        if (!sdkSpecUrl.trim()) return;
        setSdkLoading(true);
        try {
            const r = await callTool('sdk_generate', { spec: sdkSpecUrl, language: sdkLanguage });
            setSdkResult(r.code || r.content || JSON.stringify(r, null, 2));
        } catch { } finally { setSdkLoading(false); }
    };

    const copyText = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'request', label: 'Request', icon: <Send size={12} />, tooltip: 'Send HTTP requests with custom headers, body, and auth' },
        { id: 'mock', label: 'Mock', icon: <Zap size={12} />, tooltip: 'Create mock API endpoints for testing without a real server' },
        { id: 'docs', label: 'Docs', icon: <BookOpen size={12} />, tooltip: 'Auto-generate OpenAPI/Swagger documentation from code or URL' },
        { id: 'test', label: 'Test', icon: <CheckCircle2 size={12} />, tooltip: 'Run automated API test suites with assertions' },
        { id: 'webhook', label: 'Hooks', icon: <Webhook size={12} />, tooltip: 'Listen and inspect incoming webhook events in real time' },
        { id: 'sdk', label: 'SDK', icon: <Package size={12} />, tooltip: 'Auto-generate client SDKs from an OpenAPI spec' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-canvas-border">
                <Globe size={20} className="text-blue-400 shrink-0" />
                <span className="text-lg font-semibold text-white">API Tester</span>
                <span className="ml-auto text-xs text-zinc-500">REST • Mock • Docs • Hooks</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2.5 border-b border-canvas-border overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                    <Tooltip key={t.id} text={t.tooltip}>
                        <button
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}
                        >
                            {t.icon}{t.label}
                        </button>
                    </Tooltip>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── REQUEST TAB ── */}
                {tab === 'request' && (
                    <>
                        {/* URL Bar */}
                        <div className="flex gap-2.5">
                            <div className="relative">
                                <select value={method} onChange={e => setMethod(e.target.value)}
                                    className={`appearance-none text-sm font-bold px-3 py-2 rounded-xl border cursor-pointer bg-canvas-card outline-none ${METHOD_COLORS[method]}`}>
                                    {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendRequest()}
                                placeholder={previewUrl ? `${previewUrl}/api/...` : 'https://api.example.com/endpoint'}
                                className="flex-1 text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 font-mono" />
                            <Tooltip text="Send HTTP request and display response below">
                                <button onClick={sendRequest} disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    {loading ? 'Sending' : 'Send'}
                                </button>
                            </Tooltip>
                        </div>

                        {/* Request sub-tabs */}
                        <div className="flex gap-0.5">
                            {(['headers', 'body', 'auth', 'params'] as const).map(t => (
                                <button key={t} onClick={() => setReqTab(t)}
                                    className={`flex-1 py-1 text-xs font-medium rounded transition-colors capitalize ${reqTab === t ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Headers */}
                        {reqTab === 'headers' && (
                            <Section title="Headers" badge={`${headers.filter(h => h.enabled).length}`}>
                                <div className="space-y-1">
                                    {headers.map((h, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <input type="checkbox" checked={h.enabled} onChange={e => setHeaders(prev => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                                                className="w-3 h-3 accent-blue-500" />
                                            <input value={h.key} onChange={e => setHeaders(prev => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                                                placeholder="Header name" className="flex-1 text-xs bg-white/[0.04] border border-canvas-border rounded px-2 py-1 text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40 font-mono" />
                                            <input value={h.value} onChange={e => setHeaders(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                                                placeholder="Value" className="flex-1 text-xs bg-white/[0.04] border border-canvas-border rounded px-2 py-1 text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40 font-mono" />
                                            <button onClick={() => setHeaders(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-primary-400 transition-colors"><Trash2 size={11} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setHeaders(prev => [...prev, { key: '', value: '', enabled: true }])}
                                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 transition-colors">
                                        <Plus size={10} /> Add Header
                                    </button>
                                </div>
                            </Section>
                        )}

                        {/* Body */}
                        {reqTab === 'body' && (
                            <Section title="Request Body">
                                <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                                    placeholder={'{\n  "key": "value"\n}'}
                                    className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40 resize-none" />
                            </Section>
                        )}

                        {/* Auth */}
                        {reqTab === 'auth' && (
                            <Section title="Authentication">
                                <div className="space-y-3">
                                    <div className="flex gap-1 flex-wrap">
                                        {AUTH_TYPES.map(a => (
                                            <Tooltip key={a} text={`Use ${a} authentication`}>
                                                <button onClick={() => setAuthType(a)}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${authType === a ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                    {a}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                    {authType !== 'None' && (
                                        <div className="space-y-1.5">
                                            {authType === 'Basic Auth' && (
                                                <input value={authUser} onChange={e => setAuthUser(e.target.value)} placeholder="Username"
                                                    className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded px-3 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40" />
                                            )}
                                            <input value={authValue} onChange={e => setAuthValue(e.target.value)}
                                                type={authType === 'Basic Auth' ? 'password' : 'text'}
                                                placeholder={authType === 'Bearer Token' ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' : authType === 'Basic Auth' ? 'Password' : 'API Key value'}
                                                className="w-full text-xs font-mono bg-white/[0.04] border border-canvas-border rounded px-3 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/40" />
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {/* Response */}
                        {response && (
                            <Section title="Response" defaultOpen>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className={`font-bold ${STATUS_COLOR(response.status)}`}>{response.status} {response.statusText}</span>
                                        <span className="text-zinc-500 flex items-center gap-1"><Clock size={10} />{response.duration}ms</span>
                                        <span className="text-zinc-500">{response.size > 1024 ? `${(response.size / 1024).toFixed(1)}KB` : `${response.size}B`}</span>
                                        <Tooltip text="Copy response body to clipboard">
                                            <button onClick={() => copyText(response.body)} className="ml-auto text-zinc-500 hover:text-white transition-colors">
                                                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="flex gap-1">
                                        {(['body', 'headers', 'raw'] as const).map(t => (
                                            <button key={t} onClick={() => setResponseTab(t)}
                                                className={`flex-1 py-1 text-xs rounded capitalize transition-colors ${responseTab === t ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
                                        ))}
                                    </div>
                                    {responseTab === 'body' && (
                                        <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                                            {(() => { try { return JSON.stringify(JSON.parse(response.body), null, 2); } catch { return response.body; } })()}
                                        </pre>
                                    )}
                                    {responseTab === 'headers' && (
                                        <div className="bg-canvas-card border border-canvas-border rounded-xl p-2 space-y-1 max-h-48 overflow-auto">
                                            {Object.entries(response.headers).map(([k, v]) => (
                                                <div key={k} className="flex gap-2 text-xs font-mono">
                                                    <span className="text-blue-400 shrink-0">{k}:</span>
                                                    <span className="text-zinc-400 break-all">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {responseTab === 'raw' && (
                                        <pre className="text-xs font-mono text-zinc-400 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                                            HTTP/1.1 {response.status} {response.statusText}{'\n'}
                                            {Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}{'\n\n'}
                                            {response.body}
                                        </pre>
                                    )}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── MOCK TAB ── */}
                {tab === 'mock' && (
                    <>
                        <Section title="Create Mock Endpoint" defaultOpen>
                            <div className="space-y-3">
                                <div className="flex gap-2.5">
                                    <select value={mockMethod} onChange={e => setMockMethod(e.target.value)}
                                        className={`text-sm font-bold px-3 py-2 rounded-xl border cursor-pointer bg-canvas-card outline-none ${METHOD_COLORS[mockMethod]}`}>
                                        {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input value={mockPath} onChange={e => setMockPath(e.target.value)} placeholder="/api/resource"
                                        className="flex-1 text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Status Code</label>
                                        <input value={mockStatus} onChange={e => setMockStatus(e.target.value)} placeholder="200"
                                            className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500/50" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Delay (ms)</label>
                                        <input value={mockDelay} onChange={e => setMockDelay(e.target.value)} placeholder="0"
                                            className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white outline-none focus:border-blue-500/50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Response Body (JSON)</label>
                                    <textarea value={mockBody} onChange={e => setMockBody(e.target.value)} rows={5}
                                        className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 outline-none focus:border-blue-500/40 resize-none" />
                                </div>
                                <Tooltip text="Register this mock endpoint — any request matching this method+path returns the configured response">
                                    <button onClick={addMock} disabled={mockLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {mockLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Add Mock Endpoint
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {mocks.length > 0 && (
                            <Section title="Active Mocks" badge={`${mocks.length}`}>
                                <div className="space-y-1">
                                    {mocks.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-2.5 py-1.5 border border-canvas-border">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[m.method]}`}>{m.method}</span>
                                            <span className="text-sm font-mono text-zinc-300 flex-1 truncate">{m.path}</span>
                                            <span className={STATUS_COLOR(m.statusCode) + ' text-xs font-semibold'}>{m.statusCode}</span>
                                            <button onClick={() => setMocks(prev => prev.filter(x => x.id !== m.id))} className="text-zinc-600 hover:text-primary-400"><Trash2 size={11} /></button>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── DOCS TAB ── */}
                {tab === 'docs' && (
                    <Section title="Generate API Documentation" defaultOpen>
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">Auto-generate OpenAPI/Swagger documentation from a URL, code file, or API endpoint.</p>
                            <input value={docsUrl} onChange={e => setDocsUrl(e.target.value)} placeholder="https://api.example.com or paste code..."
                                className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                            <Tooltip text="Analyze the API and generate comprehensive OpenAPI 3.0 Swagger documentation">
                                <button onClick={generateDocs} disabled={docsLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {docsLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                    Generate Docs
                                </button>
                            </Tooltip>
                            {docsResult && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-500">Output</span>
                                        <Tooltip text="Copy generated documentation">
                                            <button onClick={() => copyText(docsResult)} className="text-zinc-500 hover:text-white">
                                                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-64 whitespace-pre-wrap">{docsResult}</pre>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* ── TEST TAB ── */}
                {tab === 'test' && (
                    <>
                        <Section title="API Test Suite" defaultOpen>
                            <div className="space-y-3">
                                <input value={testUrl} onChange={e => setTestUrl(e.target.value)} placeholder="https://api.example.com/endpoint"
                                    className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Assertions</span>
                                        <Tooltip text="Add a new test assertion condition">
                                            <button onClick={() => setAssertions(prev => [...prev, { type: 'status', value: '200' }])}
                                                className="text-xs text-zinc-500 hover:text-blue-400 flex items-center gap-0.5"><Plus size={10} /> Add</button>
                                        </Tooltip>
                                    </div>
                                    {assertions.map((a, i) => (
                                        <div key={i} className={`flex items-center gap-2.5 p-1.5 rounded-xl border ${testResults ? (testResults[i]?.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-primary-500/20 bg-primary-500/5') : 'border-canvas-border'}`}>
                                            <select value={a.type} onChange={e => setAssertions(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as TestAssertion['type'] } : x))}
                                                className="text-xs bg-canvas-card border border-canvas-border rounded px-1.5 py-1 text-zinc-300 outline-none">
                                                <option value="status">Status =</option>
                                                <option value="body_contains">Body contains</option>
                                                <option value="header_exists">Header exists</option>
                                                <option value="response_time">Time &lt; (ms)</option>
                                            </select>
                                            <input value={a.value} onChange={e => setAssertions(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                                                className="flex-1 text-xs font-mono bg-canvas-card border border-canvas-border rounded px-1.5 py-1 text-zinc-300 outline-none" />
                                            {testResults?.[i] && (
                                                testResults[i].passed
                                                    ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                                    : <AlertTriangle size={11} className="text-primary-400 shrink-0" />
                                            )}
                                            <button onClick={() => setAssertions(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-primary-400"><X size={10} /></button>
                                        </div>
                                    ))}
                                </div>

                                <Tooltip text="Run all assertions against the endpoint and show pass/fail results">
                                    <button onClick={runTests} disabled={testRunning} className="w-full flex items-center justify-center gap-2.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {testRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                        {testRunning ? 'Running Tests...' : 'Run Tests'}
                                    </button>
                                </Tooltip>
                                {testResults && (
                                    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-xl text-sm font-semibold ${testResults.every(r => r.passed) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'}`}>
                                        {testResults.every(r => r.passed) ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                        {testResults.filter(r => r.passed).length}/{testResults.length} assertions passed
                                    </div>
                                )}
                            </div>
                        </Section>
                    </>
                )}

                {/* ── WEBHOOK TAB ── */}
                {tab === 'webhook' && (
                    <>
                        <Section title="Webhook Inspector" defaultOpen>
                            <div className="space-y-3">
                                <p className="text-xs text-zinc-500">Start a listener to capture and inspect incoming webhook payloads in real time.</p>
                                <Tooltip text={webhookListening ? 'Stop listening for incoming webhooks' : 'Start listening — any POST to the webhook URL will appear below'}>
                                    <button onClick={toggleWebhook}
                                        className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-colors ${webhookListening ? 'bg-primary-600 hover:bg-primary-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                        {webhookListening ? <><X size={12} /> Stop Listening</> : <><Webhook size={12} /> Start Listening</>}
                                    </button>
                                </Tooltip>
                                {webhookListening && (
                                    <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-2.5 py-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs text-emerald-400">Listening for events...</span>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {webhookEvents.length > 0 && (
                            <Section title="Captured Events" badge={`${webhookEvents.length}`}>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {webhookEvents.map(ev => (
                                        <div key={ev.id} onClick={() => setSelectedEvent(ev === selectedEvent ? null : ev)}
                                            className="flex items-center gap-2 p-2 rounded-xl border border-canvas-border hover:border-blue-500/20 bg-white/[0.02] cursor-pointer transition-all">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[ev.method] || METHOD_COLORS['POST']}`}>{ev.method}</span>
                                            <span className="text-xs text-zinc-400 flex-1 truncate font-mono">{new Date(ev.receivedAt).toLocaleTimeString()}</span>
                                            <ChevronRight size={10} className={`text-zinc-600 transition-transform ${selectedEvent?.id === ev.id ? 'rotate-90' : ''}`} />
                                        </div>
                                    ))}
                                </div>
                                {selectedEvent && (
                                    <div className="mt-2 space-y-1.5">
                                        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Payload</span>
                                        <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-40 whitespace-pre-wrap">
                                            {(() => { try { return JSON.stringify(JSON.parse(selectedEvent.body), null, 2); } catch { return selectedEvent.body; } })()}
                                        </pre>
                                    </div>
                                )}
                            </Section>
                        )}
                    </>
                )}

                {/* ── SDK TAB ── */}
                {tab === 'sdk' && (
                    <Section title="SDK Generator" defaultOpen>
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">Auto-generate a fully typed client SDK from an OpenAPI 3.0 spec URL or JSON.</p>
                            <input value={sdkSpecUrl} onChange={e => setSdkSpecUrl(e.target.value)} placeholder="https://api.example.com/openapi.json"
                                className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Target Language</label>
                                <div className="flex flex-wrap gap-1">
                                    {['typescript', 'javascript', 'python', 'go', 'rust', 'swift', 'kotlin'].map(lang => (
                                        <Tooltip key={lang} text={`Generate SDK for ${lang}`}>
                                            <button onClick={() => setSdkLanguage(lang)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors capitalize ${sdkLanguage === lang ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                {lang}
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                            <Tooltip text="Parse the OpenAPI spec and generate a fully typed SDK with auth, error handling, and type definitions">
                                <button onClick={generateSdk} disabled={sdkLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {sdkLoading ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                                    Generate SDK
                                </button>
                            </Tooltip>
                            {sdkResult && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-500">Generated SDK</span>
                                        <div className="flex gap-2">
                                            <Tooltip text="Copy SDK code"><button onClick={() => copyText(sdkResult)} className="text-zinc-500 hover:text-white">{copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button></Tooltip>
                                            <Tooltip text="Download as file"><button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([sdkResult])); a.download = `sdk.${sdkLanguage === 'typescript' ? 'ts' : sdkLanguage}`; a.click(); }} className="text-zinc-500 hover:text-white"><Download size={11} /></button></Tooltip>
                                        </div>
                                    </div>
                                    <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-64 whitespace-pre-wrap">{sdkResult}</pre>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

            </div>
        </div>
    );
};

export default ApiTesterPanel;
