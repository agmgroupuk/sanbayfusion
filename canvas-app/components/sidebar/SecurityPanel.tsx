/**
 * SecurityPanel — Full-featured security scanning, cryptography, auth generation & threat modeling
 * Tools: scan_secrets, scan_vulnerabilities, crypto_hash, crypto_encrypt, crypto_sign,
 *        auth_generate, threat_model, incident_response, policy_enforce
 */
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../../services/editorBridge';
import {
    Shield, ShieldAlert, ShieldCheck, Lock, Key, Hash, AlertTriangle,
    CheckCircle2, Loader2, Copy, Check, ChevronDown, ChevronRight,
    Eye, EyeOff, RefreshCw, Download, Fingerprint, Bug, FileWarning,
    Terminal, BookOpen, Zap, X, Plus, Scan,
} from 'lucide-react';

const API_BASE = '/api/canvas';

type Tab = 'scan' | 'crypto' | 'auth' | 'threat';

const HASH_ALGORITHMS = ['SHA-256', 'SHA-512', 'SHA-384', 'SHA-1', 'MD5', 'BLAKE2b'] as const;
const ENCRYPT_ALGORITHMS = ['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305', 'RSA-OAEP'] as const;
const AUTH_TYPES = ['JWT', 'API Key', 'Session Token', 'OAuth 2.0 Token', 'TOTP Secret', 'SSH Key Pair', 'TLS Certificate'] as const;

interface ScanFinding { severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; title: string; description: string; file?: string; line?: number; cve?: string; }
interface ThreatItem { category: string; threat: string; likelihood: 'High' | 'Medium' | 'Low'; impact: 'High' | 'Medium' | 'Low'; mitigation: string; }

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'text-primary-400 bg-primary-500/10 border-primary-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    info: 'text-zinc-400 bg-white/[0.04] border-canvas-border',
};
const SEVERITY_ICON: Record<string, React.ReactNode> = {
    critical: <ShieldAlert size={11} />, high: <AlertTriangle size={11} />,
    medium: <FileWarning size={11} />, low: <Shield size={11} />, info: <ShieldCheck size={11} />,
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative inline-flex">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
            <div className="bg-zinc-800 border border-canvas-border text-white text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl max-w-[300px] text-center leading-snug">{text}</div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string; badgeColor?: string }> = ({ title, children, defaultOpen = true, badge, badgeColor = 'bg-primary-500/20 text-primary-300' }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-canvas-border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-2">
                    {badge && <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
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

const SecurityPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
    const files = useEditorStore(s => s.files);
    const projectCode = useMemo(() => {
        return Object.entries(files)
            .filter(([p]) => /\.(tsx?|jsx?|mjs|cjs|json|env|ya?ml|toml|py|rb|go|rs|php)$/.test(p))
            .map(([path, content]) => `// --- ${path} ---\n${content}`)
            .join('\n\n');
    }, [files]);
    const hasProjectFiles = Object.keys(files).length > 0;

    const [tab, setTab] = useState<Tab>('scan');
    const [copied, setCopied] = useState<string | null>(null);
    const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

    const callTool = useCallback(async (tool: string, params: Record<string, unknown>) => {
        const res = await fetch(`${API_BASE}/execute-data-tool`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, ...params }),
        });
        return res.json();
    }, []);

    // ── Scan state ──────────────────────────────────────────────────────────
    const [scanTarget, setScanTarget] = useState('');
    const [scanType, setScanType] = useState<'secrets' | 'vulnerabilities'>('secrets');
    const [scanning, setScanning] = useState(false);
    const [scanFindings, setScanFindings] = useState<ScanFinding[]>([]);
    const [scanDone, setScanDone] = useState(false);

    const runScan = async () => {
        if (!scanTarget.trim()) return;
        setScanning(true); setScanFindings([]); setScanDone(false);
        try {
            const tool = scanType === 'secrets' ? 'scan_secrets' : 'scan_vulnerabilities';
            const r = await callTool(tool, { target: scanTarget, action: 'scan' });
            const findings: ScanFinding[] = r.findings || r.results || [];
            setScanFindings(findings);
            setScanDone(true);
        } catch { } finally { setScanning(false); }
    };

    const scanSummary = {
        critical: scanFindings.filter(f => f.severity === 'critical').length,
        high: scanFindings.filter(f => f.severity === 'high').length,
        medium: scanFindings.filter(f => f.severity === 'medium').length,
        low: scanFindings.filter(f => f.severity === 'low').length,
    };

    // ── Crypto state ────────────────────────────────────────────────────────
    const [cryptoOp, setCryptoOp] = useState<'hash' | 'encrypt' | 'decrypt' | 'sign' | 'verify'>('hash');
    const [cryptoInput, setCryptoInput] = useState('');
    const [cryptoKey, setCryptoKey] = useState('');
    const [hashAlgo, setHashAlgo] = useState<string>('SHA-256');
    const [encryptAlgo, setEncryptAlgo] = useState<string>('AES-256-GCM');
    const [cryptoResult, setCryptoResult] = useState<string | null>(null);
    const [cryptoLoading, setCryptoLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const runCrypto = async () => {
        if (!cryptoInput.trim()) return;
        setCryptoLoading(true); setCryptoResult(null);
        try {
            let tool = 'crypto_hash';
            const params: Record<string, unknown> = { input: cryptoInput };
            if (cryptoOp === 'hash') { tool = 'crypto_hash'; params.algorithm = hashAlgo; }
            else if (cryptoOp === 'encrypt') { tool = 'crypto_encrypt'; params.algorithm = encryptAlgo; params.key = cryptoKey; params.action = 'encrypt'; }
            else if (cryptoOp === 'decrypt') { tool = 'crypto_encrypt'; params.algorithm = encryptAlgo; params.key = cryptoKey; params.action = 'decrypt'; }
            else if (cryptoOp === 'sign') { tool = 'crypto_sign'; params.key = cryptoKey; params.action = 'sign'; }
            else if (cryptoOp === 'verify') { tool = 'crypto_sign'; params.key = cryptoKey; params.action = 'verify'; }

            const r = await callTool(tool, params);
            setCryptoResult(r.result || r.hash || r.ciphertext || r.signature || r.valid?.toString() || JSON.stringify(r, null, 2));
        } catch { } finally { setCryptoLoading(false); }
    };

    // ── Auth state ──────────────────────────────────────────────────────────
    const [authType, setAuthType] = useState<string>('JWT');
    const [authOutput, setAuthOutput] = useState<Record<string, string> | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [jwtPayload, setJwtPayload] = useState('{\n  "sub": "user_id",\n  "exp": 3600,\n  "iss": "your-app"\n}');
    const [jwtSecret, setJwtSecret] = useState('');
    const [apiKeyLength, setApiKeyLength] = useState('32');
    const [apiKeyPrefix, setApiKeyPrefix] = useState('sk_');

    const generateAuth = async () => {
        setAuthLoading(true); setAuthOutput(null);
        try {
            const params: Record<string, unknown> = { type: authType };
            if (authType === 'JWT') { try { params.payload = JSON.parse(jwtPayload); } catch { params.payload = {}; } params.secret = jwtSecret; }
            if (authType === 'API Key') { params.length = parseInt(apiKeyLength); params.prefix = apiKeyPrefix; }
            const r = await callTool('auth_generate', params);
            const output: Record<string, string> = {};
            if (r.token) output['Token'] = r.token;
            if (r.key) output['API Key'] = r.key;
            if (r.publicKey) output['Public Key'] = r.publicKey;
            if (r.privateKey) output['Private Key'] = r.privateKey;
            if (r.secret) output['Secret'] = r.secret;
            if (r.certificate) output['Certificate'] = r.certificate;
            if (Object.keys(output).length === 0 && r.result) output['Result'] = typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
            setAuthOutput(Object.keys(output).length > 0 ? output : { Result: JSON.stringify(r, null, 2) });
        } catch { } finally { setAuthLoading(false); }
    };

    // ── Threat state ────────────────────────────────────────────────────────
    const [appName, setAppName] = useState('');
    const [appDescription, setAppDescription] = useState('');
    const [appComponents, setAppComponents] = useState('Web App, REST API, PostgreSQL Database, Redis Cache');
    const [threatItems, setThreatItems] = useState<ThreatItem[]>([]);
    const [threatLoading, setThreatLoading] = useState(false);
    const [incidentResp, setIncidentResp] = useState('');
    const [incidentLoading, setIncidentLoading] = useState(false);
    const [incidentResult, setIncidentResult] = useState<string | null>(null);
    const [threatTab, setThreatTab] = useState<'model' | 'incident'>('model');

    const LIKELIHOOD_COLOR = (l: string) => l === 'High' ? 'text-primary-400' : l === 'Medium' ? 'text-amber-400' : 'text-emerald-400';
    const IMPACT_COLOR = (i: string) => i === 'High' ? 'text-primary-400' : i === 'Medium' ? 'text-amber-400' : 'text-emerald-400';

    const runThreatModel = async () => {
        if (!appName.trim()) return;
        setThreatLoading(true); setThreatItems([]);
        try {
            const r = await callTool('threat_model', {
                action: 'analyze', name: appName,
                description: appDescription,
                components: appComponents.split(',').map(s => s.trim()),
            });
            setThreatItems(r.threats || r.items || []);
        } catch { } finally { setThreatLoading(false); }
    };

    const runIncidentResponse = async () => {
        if (!incidentResp.trim()) return;
        setIncidentLoading(true); setIncidentResult(null);
        try {
            const r = await callTool('incident_response', { incident: incidentResp, action: 'respond' });
            setIncidentResult(r.playbook || r.steps?.join('\n') || JSON.stringify(r, null, 2));
        } catch { } finally { setIncidentLoading(false); }
    };

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'scan', label: 'Scan', icon: <Scan size={12} />, tooltip: 'Scan code for secrets and vulnerabilities' },
        { id: 'crypto', label: 'Crypto', icon: <Lock size={12} />, tooltip: 'Hash, encrypt, sign and verify data with industry-standard algorithms' },
        { id: 'auth', label: 'Auth', icon: <Key size={12} />, tooltip: 'Generate secure tokens, API keys, JWTs, SSH keys and more' },
        { id: 'threat', label: 'Threat', icon: <ShieldAlert size={12} />, tooltip: 'Generate STRIDE threat models and incident response playbooks' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-canvas-border">
                <Shield size={20} className="text-primary-400 shrink-0" />
                <span className="text-lg font-semibold text-white">Security</span>
                <span className="ml-auto text-xs text-zinc-500">Scan • Crypto • Auth • Threat</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2.5 border-b border-canvas-border">
                {TABS.map(t => (
                    <Tooltip key={t.id} text={t.tooltip}>
                        <button onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${tab === t.id ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}>
                            {t.icon}{t.label}
                        </button>
                    </Tooltip>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── SCAN TAB ── */}
                {tab === 'scan' && (
                    <>
                        <Section title="Security Scanner" defaultOpen>
                            <div className="space-y-3">
                                <div className="flex gap-1">
                                    {(['secrets', 'vulnerabilities'] as const).map(t => (
                                        <Tooltip key={t} text={t === 'secrets' ? 'Detect hardcoded API keys, passwords, tokens, and credentials in code' : 'Scan dependencies and code for known CVEs and security vulnerabilities'}>
                                            <button onClick={() => setScanType(t)}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-xl border transition-colors capitalize ${scanType === t ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                {t === 'secrets' ? '🔑 Secrets' : '🐛 Vulns'}
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                                {hasProjectFiles && (
                                    <Tooltip text="Automatically scan all your project's source files for security issues">
                                        <button onClick={() => { setScanTarget(projectCode); }} className="w-full flex items-center justify-center gap-2 py-1.5 mb-1 bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 text-xs font-semibold rounded-xl transition-colors border border-emerald-500/20">
                                            <Shield size={11} /> Load Project Code ({Object.keys(files).length} files)
                                        </button>
                                    </Tooltip>
                                )}
                                <textarea value={scanTarget} onChange={e => setScanTarget(e.target.value)} rows={5}
                                    placeholder={scanType === 'secrets' ? 'Paste code or click "Load Project Code" above...\n\nconst apiKey = "sk-abc123...";\nconst dbUrl = "postgres://...";\n' : 'Paste package.json, requirements.txt, or click "Load Project Code"...\n\n{"dependencies": {"lodash": "4.17.20"}}'}
                                    className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40 resize-none" />
                                <Tooltip text={`Run ${scanType} detection with pattern matching and known vulnerability databases`}>
                                    <button onClick={runScan} disabled={scanning || !scanTarget.trim()} className="w-full flex items-center justify-center gap-2.5 py-2 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {scanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
                                        {scanning ? 'Scanning...' : `Scan ${scanType === 'secrets' ? 'Secrets' : 'Vulns'}`}
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {scanDone && (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-4 gap-1">
                                    {[
                                        { label: 'Critical', count: scanSummary.critical, color: 'text-primary-400 bg-primary-500/10 border-primary-500/20' },
                                        { label: 'High', count: scanSummary.high, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                                        { label: 'Medium', count: scanSummary.medium, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                                        { label: 'Low', count: scanSummary.low, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                                    ].map(({ label, count, color }) => (
                                        <div key={label} className={`flex flex-col items-center p-2 rounded-xl border text-center ${color}`}>
                                            <span className="text-base font-bold">{count}</span>
                                            <span className="text-sm font-medium">{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {scanFindings.length === 0
                                    ? <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-sm text-emerald-400"><ShieldCheck size={13} /> No issues found — looking clean!</div>
                                    : (
                                        <Section title="Findings" badge={`${scanFindings.length}`} defaultOpen>
                                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                                {scanFindings.map((f, i) => (
                                                    <div key={i} className={`p-2.5 rounded-xl border ${SEVERITY_COLORS[f.severity]}`}>
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 shrink-0">{SEVERITY_ICON[f.severity]}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-sm font-semibold truncate">{f.title}</span>
                                                                    <span className={`text-sm font-bold uppercase shrink-0 ${SEVERITY_COLORS[f.severity].split(' ')[0]}`}>{f.severity}</span>
                                                                </div>
                                                                <p className="text-xs opacity-75 mt-0.5 leading-snug">{f.description}</p>
                                                                {(f.file || f.cve) && (
                                                                    <div className="flex gap-2 mt-1">
                                                                        {f.file && <span className="text-sm font-mono opacity-50">{f.file}{f.line ? `:${f.line}` : ''}</span>}
                                                                        {f.cve && <span className="text-sm font-mono text-yellow-400">{f.cve}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                    )
                                }
                            </>
                        )}
                    </>
                )}

                {/* ── CRYPTO TAB ── */}
                {tab === 'crypto' && (
                    <Section title="Cryptographic Operations" defaultOpen>
                        <div className="space-y-3">
                            {/* Operation selector */}
                            <div className="flex flex-wrap gap-1">
                                {(['hash', 'encrypt', 'decrypt', 'sign', 'verify'] as const).map(op => (
                                    <Tooltip key={op} text={{ hash: 'Compute a one-way cryptographic hash', encrypt: 'Encrypt data symmetrically or asymmetrically', decrypt: 'Decrypt ciphertext back to plaintext', sign: 'Create a digital signature for data integrity', verify: 'Verify a digital signature' }[op]}>
                                        <button onClick={() => setCryptoOp(op)}
                                            className={`text-xs px-2.5 py-1 rounded-xl border capitalize transition-colors ${cryptoOp === op ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                            {op}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>

                            {/* Algorithm selector */}
                            {cryptoOp === 'hash' && (
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Algorithm</label>
                                    <div className="flex flex-wrap gap-1">
                                        {HASH_ALGORITHMS.map(a => (
                                            <button key={a} onClick={() => setHashAlgo(a)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${hashAlgo === a ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(cryptoOp === 'encrypt' || cryptoOp === 'decrypt') && (
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Algorithm</label>
                                    <div className="flex flex-wrap gap-1">
                                        {ENCRYPT_ALGORITHMS.map(a => (
                                            <button key={a} onClick={() => setEncryptAlgo(a)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${encryptAlgo === a ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Input Data</label>
                                <textarea value={cryptoInput} onChange={e => setCryptoInput(e.target.value)} rows={3}
                                    placeholder={cryptoOp === 'hash' ? 'Text to hash...' : cryptoOp === 'decrypt' || cryptoOp === 'verify' ? 'Ciphertext / signature...' : 'Plaintext to encrypt / sign...'}
                                    className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40 resize-none" />
                            </div>

                            {/* Key input */}
                            {cryptoOp !== 'hash' && (
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        {cryptoOp === 'sign' || cryptoOp === 'verify' ? 'Private / Public Key (PEM)' : 'Encryption Key'}
                                    </label>
                                    <div className="relative">
                                        <input type={showKey ? 'text' : 'password'} value={cryptoKey} onChange={e => setCryptoKey(e.target.value)}
                                            placeholder="Paste key or leave blank to auto-generate"
                                            className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-2.5 pr-8 py-1.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40" />
                                        <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                            {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <Tooltip text="Execute cryptographic operation with the selected algorithm and parameters">
                                <button onClick={runCrypto} disabled={cryptoLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {cryptoLoading ? <Loader2 size={12} className="animate-spin" /> : <Hash size={12} />}
                                    {cryptoOp === 'hash' ? 'Compute Hash' : cryptoOp === 'encrypt' ? 'Encrypt' : cryptoOp === 'decrypt' ? 'Decrypt' : cryptoOp === 'sign' ? 'Sign' : 'Verify'}
                                </button>
                            </Tooltip>

                            {cryptoResult && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500">Result</span>
                                        <Tooltip text="Copy result to clipboard">
                                            <button onClick={() => copyText(cryptoResult, 'crypto')} className="text-zinc-500 hover:text-white">
                                                {copied === 'crypto' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="bg-canvas-card border border-canvas-border rounded-xl p-2.5">
                                        <p className="text-xs font-mono text-zinc-300 break-all leading-relaxed">{cryptoResult}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* ── AUTH TAB ── */}
                {tab === 'auth' && (
                    <Section title="Auth Generator" defaultOpen>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1.5">Credential Type</label>
                                <div className="flex flex-wrap gap-1">
                                    {AUTH_TYPES.map(t => (
                                        <Tooltip key={t} text={`Generate a secure ${t}`}>
                                            <button onClick={() => setAuthType(t)}
                                                className={`text-xs px-2 py-1 rounded-xl border transition-colors ${authType === t ? 'border-primary-500/40 bg-primary-500/10 text-primary-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                {t}
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>

                            {/* JWT options */}
                            {authType === 'JWT' && (
                                <div className="space-y-1.5">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Payload (JSON)</label>
                                        <textarea value={jwtPayload} onChange={e => setJwtPayload(e.target.value)} rows={4}
                                            className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 outline-none focus:border-primary-500/40 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Signing Secret</label>
                                        <input type="password" value={jwtSecret} onChange={e => setJwtSecret(e.target.value)} placeholder="Leave blank to auto-generate"
                                            className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-2.5 py-1.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40" />
                                    </div>
                                </div>
                            )}

                            {/* API Key options */}
                            {authType === 'API Key' && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Prefix</label>
                                        <input value={apiKeyPrefix} onChange={e => setApiKeyPrefix(e.target.value)} placeholder="sk_"
                                            className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none focus:border-primary-500/40" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Length (bytes)</label>
                                        <input type="number" value={apiKeyLength} onChange={e => setApiKeyLength(e.target.value)} min="16" max="64"
                                            className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none focus:border-primary-500/40" />
                                    </div>
                                </div>
                            )}

                            <Tooltip text="Generate a cryptographically secure credential with best-practice defaults">
                                <button onClick={generateAuth} disabled={authLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                    {authLoading ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                                    Generate {authType}
                                </button>
                            </Tooltip>

                            {authOutput && (
                                <div className="space-y-1.5">
                                    {Object.entries(authOutput).map(([k, v]) => (
                                        <div key={k}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-zinc-500">{k}</span>
                                                <Tooltip text={`Copy ${k}`}>
                                                    <button onClick={() => copyText(v, k)} className="text-zinc-500 hover:text-white">
                                                        {copied === k ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                            <div className="bg-canvas-card border border-canvas-border rounded-xl p-2 max-h-28 overflow-auto">
                                                <p className="text-xs font-mono text-zinc-300 break-all">{v}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* ── THREAT TAB ── */}
                {tab === 'threat' && (
                    <>
                        <div className="flex gap-1 mb-2">
                            {(['model', 'incident'] as const).map(t => (
                                <button key={t} onClick={() => setThreatTab(t)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-xl capitalize transition-colors ${threatTab === t ? 'bg-primary-500/10 text-primary-300 ring-1 ring-primary-500/20' : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.03]'}`}>
                                    {t === 'model' ? '🏗 Threat Model' : '🚨 Incident Response'}
                                </button>
                            ))}
                        </div>

                        {threatTab === 'model' && (
                            <Section title="STRIDE Threat Model" defaultOpen>
                                <div className="space-y-3">
                                    <input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Application name"
                                        className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-primary-500/50" />
                                    <textarea value={appDescription} onChange={e => setAppDescription(e.target.value)} rows={2}
                                        placeholder="Brief description of what the app does..."
                                        className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40 resize-none" />
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Components (comma-separated)</label>
                                        <input value={appComponents} onChange={e => setAppComponents(e.target.value)}
                                            className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-zinc-300 outline-none focus:border-primary-500/40" />
                                    </div>
                                    <Tooltip text="Analyze system architecture using the STRIDE framework and identify potential threats, attack vectors, and mitigations">
                                        <button onClick={runThreatModel} disabled={threatLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                            {threatLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
                                            Generate Threat Model
                                        </button>
                                    </Tooltip>

                                    {threatItems.length > 0 && (
                                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                            {threatItems.map((item, i) => (
                                                <div key={i} className="bg-white/[0.03] border border-canvas-border rounded-xl p-2.5">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-zinc-200">{item.threat}</span>
                                                        <span className="text-sm bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/20 shrink-0">{item.category}</span>
                                                    </div>
                                                    <div className="flex gap-3 text-xs mb-1.5">
                                                        <span>Likelihood: <span className={LIKELIHOOD_COLOR(item.likelihood)}>{item.likelihood}</span></span>
                                                        <span>Impact: <span className={IMPACT_COLOR(item.impact)}>{item.impact}</span></span>
                                                    </div>
                                                    <p className="text-xs text-zinc-500 leading-snug"><span className="text-emerald-400 font-medium">Mitigation:</span> {item.mitigation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {threatTab === 'incident' && (
                            <Section title="Incident Response Playbook" defaultOpen>
                                <div className="space-y-3">
                                    <p className="text-xs text-zinc-500">Describe the security incident and get a structured response playbook with containment, eradication, and recovery steps.</p>
                                    <textarea value={incidentResp} onChange={e => setIncidentResp(e.target.value)} rows={4}
                                        placeholder="Example: Detected unauthorized access to production database. Multiple failed login attempts followed by a successful login from IP 192.168.1.100 at 02:30 UTC. Possible credential compromise."
                                        className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-primary-500/40 resize-none" />
                                    <Tooltip text="Generate a structured incident response playbook with immediate actions, containment steps, and post-incident review">
                                        <button onClick={runIncidentResponse} disabled={incidentLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                            {incidentLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                            Generate Playbook
                                        </button>
                                    </Tooltip>
                                    {incidentResult && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-zinc-500">Response Playbook</span>
                                                <Tooltip text="Copy playbook to clipboard">
                                                    <button onClick={() => copyText(incidentResult, 'incident')} className="text-zinc-500 hover:text-white">
                                                        {copied === 'incident' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                            <pre className="text-xs font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-xl p-2.5 overflow-auto max-h-64 whitespace-pre-wrap">{incidentResult}</pre>
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default SecurityPanel;
