/**
 * CloudPanel — Full-featured cloud deployment, scaling, logs, secrets, cost & monitoring
 * Tools: cloud_deploy, cloud_scale, cloud_logs, cloud_secrets, cloud_cost,
 *        cloud_domain, cloud_backup, cloud_monitor, cloud_network
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud, Loader2, ChevronDown, ChevronRight, Copy, Check, RefreshCw,
    Plus, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle2, XCircle,
    Activity, BarChart3, DollarSign, Server, Globe, Database, Lock,
    Zap, Download, Upload, Play, Square, Settings, Terminal,
    ArrowUp, ArrowDown, Clock, HardDrive, Cpu, Wifi,
} from 'lucide-react';

const API_BASE = '/api/canvas';

type Tab = 'deploy' | 'scale' | 'logs' | 'secrets' | 'cost';

const PROVIDERS = ['AWS', 'GCP', 'Azure', 'DigitalOcean', 'Railway', 'Fly.io', 'Vercel', 'Render'] as const;
const REGIONS: Record<string, string[]> = {
    AWS: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'],
    GCP: ['us-central1', 'europe-west1', 'asia-east1', 'asia-southeast1'],
    Azure: ['East US', 'West Europe', 'Southeast Asia', 'Australia East'],
    DigitalOcean: ['nyc1', 'sfo3', 'ams3', 'sgp1', 'lon1'],
    'Railway': ['us-west2', 'us-east4', 'europe-west4'],
    'Fly.io': ['iad', 'lax', 'lhr', 'sin', 'syd'],
    Vercel: ['iad1', 'lhr1', 'sin1', 'hnd1'],
    Render: ['oregon', 'ohio', 'frankfurt', 'singapore'],
};
const RUNTIMES = ['Node.js 20', 'Node.js 18', 'Python 3.12', 'Python 3.11', 'Go 1.21', 'Ruby 3.3', 'Java 21', 'Docker'] as const;

interface DeployConfig { provider: string; region: string; runtime: string; name: string; envVars: { key: string; value: string }[]; }
interface LogEntry { timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string; service?: string; }
interface Secret { id: string; key: string; value: string; environment: string; lastUpdated: string; revealed: boolean; }
interface CostItem { service: string; cost: number; trend: 'up' | 'down' | 'flat'; change: number; unit: string; }
interface ScaleMetric { name: string; current: number; target: number; unit: string; icon: React.ReactNode; }

const LEVEL_COLORS: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-amber-400',
    error: 'text-primary-400',
    debug: 'text-zinc-500',
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative inline-flex">
        {children}
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
            <div className="bg-zinc-800 border border-canvas-border text-white text-xs px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl max-w-[300px] text-center leading-snug">{text}</div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string; badgeColor?: string }> = ({ title, children, defaultOpen = true, badge, badgeColor = 'bg-blue-500/20 text-blue-300' }) => {
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

// Mini gauge bar
const GaugeBar: React.FC<{ value: number; max?: number; color?: string }> = ({ value, max = 100, color = 'bg-blue-500' }) => (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${color}`}
        />
    </div>
);

const CloudPanel: React.FC<{ className?: string; projectId?: string; previewUrl?: string | null }> = ({ className = '', projectId, previewUrl }) => {
    const [tab, setTab] = useState<Tab>('deploy');
    const [copied, setCopied] = useState<string | null>(null);
    const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

    const callTool = useCallback(async (tool: string, params: Record<string, unknown>) => {
        const res = await fetch(`${API_BASE}/execute-data-tool`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, projectId, ...params }),
        });
        return res.json();
    }, [projectId]);

    // ── Deploy state ────────────────────────────────────────────────────────
    const [deploy, setDeploy] = useState<DeployConfig>({
        provider: 'Railway', region: 'us-west2', runtime: 'Node.js 20', name: '', envVars: [],
    });
    const [deploying, setDeploying] = useState(false);
    const [deployResult, setDeployResult] = useState<{ success: boolean; url?: string; deployId?: string; logs?: string } | null>(null);

    const runDeploy = async () => {
        if (!deploy.name.trim()) return;
        setDeploying(true); setDeployResult(null);
        try {
            const r = await callTool('cloud_deploy', {
                action: 'deploy', provider: deploy.provider,
                region: deploy.region, runtime: deploy.runtime,
                name: deploy.name,
                envVars: Object.fromEntries(deploy.envVars.filter(e => e.key).map(e => [e.key, e.value])),
            });
            setDeployResult({ success: r.success !== false, url: r.url, deployId: r.deployId || r.id, logs: r.logs });
        } catch { setDeployResult({ success: false }); }
        finally { setDeploying(false); }
    };

    // ── Scale state ─────────────────────────────────────────────────────────
    const [scaleService, setScaleService] = useState('');
    const [scaleProv, setScaleProv] = useState('Railway');
    const [minInstances, setMinInstances] = useState('1');
    const [maxInstances, setMaxInstances] = useState('10');
    const [cpuTarget, setCpuTarget] = useState('70');
    const [memTarget, setMemTarget] = useState('80');
    const [scaleLoading, setScaleLoading] = useState(false);
    const [scaleMetrics, setScaleMetrics] = useState<ScaleMetric[]>([]);

    const applyScale = async () => {
        if (!scaleService.trim()) return;
        setScaleLoading(true);
        try {
            const r = await callTool('cloud_scale', {
                action: 'scale', service: scaleService, provider: scaleProv,
                minInstances: parseInt(minInstances), maxInstances: parseInt(maxInstances),
                cpuTarget: parseInt(cpuTarget), memTarget: parseInt(memTarget),
            });
            if (r.metrics) {
                setScaleMetrics([
                    { name: 'CPU', current: r.metrics.cpu || 0, target: parseInt(cpuTarget), unit: '%', icon: <Cpu size={11} /> },
                    { name: 'Memory', current: r.metrics.memory || 0, target: parseInt(memTarget), unit: '%', icon: <HardDrive size={11} /> },
                    { name: 'Instances', current: r.metrics.instances || 1, target: parseInt(maxInstances), unit: '', icon: <Server size={11} /> },
                    { name: 'RPS', current: r.metrics.rps || 0, target: 1000, unit: ' req/s', icon: <Activity size={11} /> },
                ]);
            }
        } catch { } finally { setScaleLoading(false); }
    };

    // ── Logs state ──────────────────────────────────────────────────────────
    const [logsService, setLogsService] = useState('');
    const [logsProv, setLogsProv] = useState('Railway');
    const [logsLines, setLogsLines] = useState('100');
    const [logsLevel, setLogsLevel] = useState('all');
    const [logsFilter, setLogsFilter] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsTailing, setLogsTailing] = useState(false);
    const logsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchLogs = useCallback(async () => {
        if (!logsService.trim()) return;
        try {
            const r = await callTool('cloud_logs', { action: 'fetch', service: logsService, provider: logsProv, lines: parseInt(logsLines), level: logsLevel });
            const entries: LogEntry[] = r.logs || r.entries || [];
            setLogs(entries);
            setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { }
    }, [logsService, logsProv, logsLines, logsLevel, callTool]);

    const toggleTail = async () => {
        if (logsTailing) {
            if (logsPollRef.current) clearInterval(logsPollRef.current);
            setLogsTailing(false);
        } else {
            setLogsTailing(true);
            await fetchLogs();
            logsPollRef.current = setInterval(fetchLogs, 3000);
        }
    };
    useEffect(() => () => { if (logsPollRef.current) clearInterval(logsPollRef.current); }, []);

    const filteredLogs = logs.filter(l => {
        if (logsLevel !== 'all' && l.level !== logsLevel) return false;
        if (logsFilter && !l.message.toLowerCase().includes(logsFilter.toLowerCase())) return false;
        return true;
    });

    // ── Secrets state ───────────────────────────────────────────────────────
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [secretsProv, setSecretsProv] = useState('Railway');
    const [secretsEnv, setSecretsEnv] = useState('production');
    const [newSecretKey, setNewSecretKey] = useState('');
    const [newSecretVal, setNewSecretVal] = useState('');
    const [secretsLoading, setSecretsLoading] = useState(false);

    const loadSecrets = async () => {
        setSecretsLoading(true);
        try {
            const r = await callTool('cloud_secrets', { action: 'list', provider: secretsProv, environment: secretsEnv });
            const list: Secret[] = (r.secrets || []).map((s: Record<string, string>, i: number) => ({
                id: s.id || String(i), key: s.key || s.name, value: s.value || '***', environment: secretsEnv, lastUpdated: s.updatedAt || 'Unknown', revealed: false,
            }));
            setSecrets(list);
        } catch { } finally { setSecretsLoading(false); }
    };

    const addSecret = async () => {
        if (!newSecretKey.trim()) return;
        try {
            await callTool('cloud_secrets', { action: 'set', provider: secretsProv, environment: secretsEnv, key: newSecretKey, value: newSecretVal });
            setSecrets(prev => [...prev, { id: Date.now().toString(), key: newSecretKey, value: newSecretVal, environment: secretsEnv, lastUpdated: new Date().toISOString(), revealed: false }]);
            setNewSecretKey(''); setNewSecretVal('');
        } catch { }
    };

    const removeSecret = async (id: string, key: string) => {
        try {
            await callTool('cloud_secrets', { action: 'delete', provider: secretsProv, environment: secretsEnv, key });
            setSecrets(prev => prev.filter(s => s.id !== id));
        } catch { }
    };

    const toggleReveal = (id: string) => setSecrets(prev => prev.map(s => s.id === id ? { ...s, revealed: !s.revealed } : s));

    // ── Cost state ──────────────────────────────────────────────────────────
    const [costProv, setCostProv] = useState('AWS');
    const [costPeriod, setCostPeriod] = useState<'day' | 'week' | 'month'>('month');
    const [costItems, setCostItems] = useState<CostItem[]>([]);
    const [costTotal, setCostTotal] = useState(0);
    const [costLoading, setCostLoading] = useState(false);

    const loadCost = async () => {
        setCostLoading(true);
        try {
            const r = await callTool('cloud_cost', { action: 'analyze', provider: costProv, period: costPeriod });
            const items: CostItem[] = r.breakdown || r.items || [];
            setCostItems(items);
            setCostTotal(r.total || items.reduce((a, b) => a + b.cost, 0));
        } catch { } finally { setCostLoading(false); }
    };

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'deploy', label: 'Deploy', icon: <Upload size={12} />, tooltip: 'Configure and trigger cloud deployments across providers' },
        { id: 'scale', label: 'Scale', icon: <Activity size={12} />, tooltip: 'Set autoscaling rules and target metrics for services' },
        { id: 'logs', label: 'Logs', icon: <Terminal size={12} />, tooltip: 'Stream and filter real-time logs from cloud services' },
        { id: 'secrets', label: 'Secrets', icon: <Lock size={12} />, tooltip: 'Manage environment secrets and config vars securely' },
        { id: 'cost', label: 'Cost', icon: <DollarSign size={12} />, tooltip: 'Analyze cloud spend and identify cost optimization opportunities' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-canvas-border">
                <Cloud size={20} className="text-sky-400 shrink-0" />
                <span className="text-lg font-semibold text-white">Cloud</span>
                <span className="ml-auto text-xs text-zinc-500">Deploy • Scale • Logs • Secrets • Cost</span>
            </div>

            <div className="flex gap-1 px-4 py-2.5 border-b border-canvas-border overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                    <Tooltip key={t.id} text={t.tooltip}>
                        <button onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 justify-center transition-all ${tab === t.id ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}>
                            {t.icon}{t.label}
                        </button>
                    </Tooltip>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── DEPLOY TAB ── */}
                {tab === 'deploy' && (
                    <>
                        <Section title="Deployment Configuration" defaultOpen>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Service Name</label>
                                    <input value={deploy.name} onChange={e => setDeploy(d => ({ ...d, name: e.target.value }))} placeholder="my-api-service"
                                        className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500/50" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Provider</label>
                                        <select value={deploy.provider} onChange={e => setDeploy(d => ({ ...d, provider: e.target.value, region: REGIONS[e.target.value]?.[0] || '' }))}
                                            className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none focus:border-sky-500/50 cursor-pointer">
                                            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Region</label>
                                        <select value={deploy.region} onChange={e => setDeploy(d => ({ ...d, region: e.target.value }))}
                                            className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none focus:border-sky-500/50 cursor-pointer">
                                            {(REGIONS[deploy.provider] || []).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Runtime</label>
                                    <div className="flex flex-wrap gap-1">
                                        {RUNTIMES.map(r => (
                                            <Tooltip key={r} text={`Deploy with ${r} runtime`}>
                                                <button onClick={() => setDeploy(d => ({ ...d, runtime: r }))}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${deploy.runtime === r ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                    {r}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>

                                {/* Env vars for deployment */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs text-zinc-500">Environment Variables</label>
                                        <Tooltip text="Add a build-time environment variable">
                                            <button onClick={() => setDeploy(d => ({ ...d, envVars: [...d.envVars, { key: '', value: '' }] }))} className="text-xs text-zinc-500 hover:text-sky-400 flex items-center gap-0.5"><Plus size={10} /> Add</button>
                                        </Tooltip>
                                    </div>
                                    {deploy.envVars.map((ev, i) => (
                                        <div key={i} className="flex items-center gap-1 mb-1">
                                            <input value={ev.key} onChange={e => setDeploy(d => ({ ...d, envVars: d.envVars.map((x, j) => j === i ? { ...x, key: e.target.value } : x) }))}
                                                placeholder="KEY" className="flex-1 text-xs font-mono bg-white/[0.04] border border-canvas-border rounded px-2 py-1 text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                            <input value={ev.value} onChange={e => setDeploy(d => ({ ...d, envVars: d.envVars.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))}
                                                placeholder="value" className="flex-1 text-xs font-mono bg-white/[0.04] border border-canvas-border rounded px-2 py-1 text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                            <button onClick={() => setDeploy(d => ({ ...d, envVars: d.envVars.filter((_, j) => j !== i) }))} className="text-zinc-600 hover:text-primary-400"><Trash2 size={11} /></button>
                                        </div>
                                    ))}
                                </div>

                                <Tooltip text={`Deploy to ${deploy.provider} ${deploy.region} with ${deploy.runtime}`}>
                                    <button onClick={runDeploy} disabled={deploying || !deploy.name}
                                        className="w-full flex items-center justify-center gap-2.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {deploying ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        {deploying ? 'Deploying...' : 'Deploy'}
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {deployResult && (
                            <Section title="Deploy Result" defaultOpen badgeColor={deployResult.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary-500/20 text-primary-300'} badge={deployResult.success ? 'Success' : 'Failed'}>
                                {deployResult.success
                                    ? <div className="space-y-1.5">
                                        {deployResult.url && <div className="flex items-center gap-2 text-sm"><Globe size={11} className="text-sky-400" /><a href={deployResult.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate">{deployResult.url}</a></div>}
                                        {deployResult.deployId && <div className="text-xs text-zinc-500">Deploy ID: <span className="font-mono text-zinc-400">{deployResult.deployId}</span></div>}
                                        {deployResult.logs && <pre className="text-sm font-mono text-zinc-400 bg-canvas-card rounded-xl p-2 max-h-32 overflow-auto">{deployResult.logs}</pre>}
                                    </div>
                                    : <div className="flex items-center gap-2 text-primary-400 text-sm"><XCircle size={12} /> Deployment failed. Check service logs for details.</div>
                                }
                            </Section>
                        )}
                    </>
                )}

                {/* ── SCALE TAB ── */}
                {tab === 'scale' && (
                    <>
                        <Section title="Autoscaling Configuration" defaultOpen>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Provider</label>
                                        <select value={scaleProv} onChange={e => setScaleProv(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Service Name</label>
                                        <input value={scaleService} onChange={e => setScaleService(e.target.value)} placeholder="my-api"
                                            className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Min Instances', val: minInstances, set: setMinInstances, tooltip: 'Minimum number of instances to keep running at all times' },
                                        { label: 'Max Instances', val: maxInstances, set: setMaxInstances, tooltip: 'Maximum instances to scale up to during peak load' },
                                        { label: 'CPU Target (%)', val: cpuTarget, set: setCpuTarget, tooltip: 'Scale up when CPU exceeds this percentage' },
                                        { label: 'Memory Target (%)', val: memTarget, set: setMemTarget, tooltip: 'Scale up when memory usage exceeds this percentage' },
                                    ].map(({ label, val, set, tooltip }) => (
                                        <div key={label}>
                                            <Tooltip text={tooltip}>
                                                <label className="block text-xs text-zinc-500 mb-1 cursor-help">{label}</label>
                                            </Tooltip>
                                            <input type="number" value={val} onChange={e => set(e.target.value)}
                                                className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none focus:border-sky-500/40" />
                                        </div>
                                    ))}
                                </div>
                                <Tooltip text="Apply autoscaling configuration and fetch current performance metrics">
                                    <button onClick={applyScale} disabled={scaleLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {scaleLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                        Apply Rules
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {scaleMetrics.length > 0 && (
                            <Section title="Current Metrics">
                                <div className="space-y-3">
                                    {scaleMetrics.map((m, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-zinc-400">{m.icon}{m.name}</span>
                                                <span className="font-mono text-white">{m.current}{m.unit} / {m.target}{m.unit}</span>
                                            </div>
                                            <GaugeBar value={m.current} max={m.target} color={m.current / m.target > 0.8 ? 'bg-primary-500' : m.current / m.target > 0.6 ? 'bg-amber-500' : 'bg-sky-500'} />
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── LOGS TAB ── */}
                {tab === 'logs' && (
                    <>
                        <Section title="Log Stream" defaultOpen>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Provider</label>
                                        <select value={logsProv} onChange={e => setLogsProv(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Service</label>
                                        <input value={logsService} onChange={e => setLogsService(e.target.value)} placeholder="service-name"
                                            className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Level</label>
                                        <select value={logsLevel} onChange={e => setLogsLevel(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            <option value="all">All levels</option>
                                            <option value="error">Errors only</option>
                                            <option value="warn">Warnings+</option>
                                            <option value="info">Info+</option>
                                            <option value="debug">Debug (verbose)</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Lines</label>
                                        <select value={logsLines} onChange={e => setLogsLines(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {['50', '100', '250', '500'].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <input value={logsFilter} onChange={e => setLogsFilter(e.target.value)} placeholder="Filter log messages..."
                                    className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-sky-500/50" />
                                <div className="flex gap-2">
                                    <Tooltip text="Fetch latest log entries once">
                                        <button onClick={fetchLogs} disabled={logsLoading} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 text-xs font-medium rounded-xl transition-colors">
                                            <RefreshCw size={11} /> Fetch Logs
                                        </button>
                                    </Tooltip>
                                    <Tooltip text={logsTailing ? 'Stop auto-refreshing logs every 3 seconds' : 'Tail logs — auto-refresh every 3 seconds'}>
                                        <button onClick={toggleTail}
                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-xl transition-colors ${logsTailing ? 'bg-primary-600 hover:bg-primary-500 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                                            {logsTailing ? <><Square size={11} /> Stop Tail</> : <><Play size={11} /> Tail Logs</>}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </Section>

                        {filteredLogs.length > 0 && (
                            <Section title="Output" badge={`${filteredLogs.length}`} defaultOpen>
                                <div className="bg-canvas-card rounded-xl border border-canvas-border max-h-64 overflow-y-auto font-mono p-1.5">
                                    {filteredLogs.map((l, i) => (
                                        <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-white/[0.02] rounded px-1 group">
                                            <span className="text-sm text-zinc-600 shrink-0 mt-0.5">{new Date(l.timestamp).toLocaleTimeString()}</span>
                                            <span className={`text-sm font-bold uppercase w-8 shrink-0 mt-0.5 ${LEVEL_COLORS[l.level]}`}>{l.level}</span>
                                            {l.service && <span className="text-sm text-purple-400 shrink-0">[{l.service}]</span>}
                                            <span className="text-xs text-zinc-300 break-all leading-snug">{l.message}</span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                                {logsTailing && (
                                    <div className="flex items-center gap-2.5 text-xs text-sky-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                        Tailing live — auto-refreshing every 3s
                                    </div>
                                )}
                            </Section>
                        )}
                    </>
                )}

                {/* ── SECRETS TAB ── */}
                {tab === 'secrets' && (
                    <>
                        <Section title="Secret Manager" defaultOpen>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Provider</label>
                                        <select value={secretsProv} onChange={e => setSecretsProv(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Environment</label>
                                        <select value={secretsEnv} onChange={e => setSecretsEnv(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {['production', 'staging', 'development', 'preview'].map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2.5">
                                    <input value={newSecretKey} onChange={e => setNewSecretKey(e.target.value)} placeholder="SECRET_KEY"
                                        className="flex-1 text-xs font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                    <input type="password" value={newSecretVal} onChange={e => setNewSecretVal(e.target.value)} placeholder="value"
                                        className="flex-1 text-xs font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-sky-500/40" />
                                    <Tooltip text="Set this secret in the selected environment">
                                        <button onClick={addSecret} className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-colors"><Plus size={12} /></button>
                                    </Tooltip>
                                </div>
                                <Tooltip text="Load all secrets from the selected provider and environment">
                                    <button onClick={loadSecrets} disabled={secretsLoading} className="w-full flex items-center justify-center gap-2.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 text-xs font-medium rounded-xl transition-colors">
                                        {secretsLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                                        Load Secrets
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {secrets.length > 0 && (
                            <Section title="Secrets" badge={`${secrets.length}`}>
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {secrets.map(s => (
                                        <div key={s.id} className="flex items-center gap-2 bg-white/[0.02] border border-canvas-border rounded-xl px-2.5 py-1.5">
                                            <Lock size={10} className="text-zinc-600 shrink-0" />
                                            <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{s.key}</span>
                                            <span className="text-xs font-mono text-zinc-600 flex-1 truncate">
                                                {s.revealed ? s.value : '•'.repeat(Math.min(s.value.length, 20))}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => toggleReveal(s.id)} className="text-zinc-600 hover:text-zinc-300">{s.revealed ? <EyeOff size={11} /> : <Eye size={11} />}</button>
                                                {s.revealed && (
                                                    <Tooltip text="Copy value">
                                                        <button onClick={() => copyText(s.value, s.id)} className="text-zinc-600 hover:text-zinc-300">{copied === s.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
                                                    </Tooltip>
                                                )}
                                                <button onClick={() => removeSecret(s.id, s.key)} className="text-zinc-600 hover:text-primary-400"><Trash2 size={11} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── COST TAB ── */}
                {tab === 'cost' && (
                    <>
                        <Section title="Cost Analyzer" defaultOpen>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Cloud Provider</label>
                                        <select value={costProv} onChange={e => setCostProv(e.target.value)} className="w-full text-xs bg-canvas-card border border-canvas-border rounded-xl px-3 py-2 text-zinc-300 outline-none cursor-pointer">
                                            {['AWS', 'GCP', 'Azure', 'DigitalOcean'].map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Period</label>
                                        <div className="flex gap-1 h-[30px]">
                                            {(['day', 'week', 'month'] as const).map(p => (
                                                <button key={p} onClick={() => setCostPeriod(p)}
                                                    className={`flex-1 text-xs rounded border transition-colors capitalize ${costPeriod === p ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-canvas-border text-zinc-500'}`}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Tooltip text="Pull cost breakdown from the provider's billing API and identify optimization opportunities">
                                    <button onClick={loadCost} disabled={costLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {costLoading ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                                        Analyze Costs
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {costItems.length > 0 && (
                            <>
                                <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                                    <span className="text-sm text-zinc-300">Total ({costPeriod})</span>
                                    <span className="text-base font-bold text-white">${costTotal.toFixed(2)}</span>
                                </div>
                                <Section title="Breakdown" defaultOpen>
                                    <div className="space-y-3">
                                        {costItems.sort((a, b) => b.cost - a.cost).map((item, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-0.5">
                                                        <span className="text-zinc-300">{item.service}</span>
                                                        <div className="flex items-center gap-1">
                                                            {item.trend === 'up' && <ArrowUp size={9} className="text-primary-400" />}
                                                            {item.trend === 'down' && <ArrowDown size={9} className="text-emerald-400" />}
                                                            <span className={item.trend === 'up' ? 'text-primary-400' : item.trend === 'down' ? 'text-emerald-400' : 'text-zinc-400'}>
                                                                ${item.cost.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <GaugeBar value={item.cost} max={costTotal} color={i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-orange-500' : i === 2 ? 'bg-amber-500' : 'bg-sky-500'} />
                                                    <div className="text-sm text-zinc-600 mt-0.5">{item.unit}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            </>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default CloudPanel;
