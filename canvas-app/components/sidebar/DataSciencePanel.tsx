/**
 * DataSciencePanel — Data profiling, cleaning, visualization, analytics & ML model comparison
 * Tools: data_profile, data_clean, data_visualize, analytics_dashboard, analytics_track,
 *        feature_engineer, model_compare, data_correlate, outlier_detect
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3, Loader2, ChevronDown, ChevronRight, Copy, Check,
    RefreshCw, Plus, Trash2, Download, Eye, AlertTriangle,
    TrendingUp, TrendingDown, Minus, Activity, Database,
    FlaskConical, GitCompare, Zap, Table, Layers, Target,
    AreaChart, ScatterChart, LineChart, PieChart,
} from 'lucide-react';

const API_BASE = '/api/canvas';

type Tab = 'profile' | 'clean' | 'visualize' | 'analytics' | 'ml';

interface ColumnStat { name: string; type: string; count: number; nulls: number; unique: number; min?: string | number; max?: string | number; mean?: number; std?: number; }
interface DataIssue { column: string; issue: string; count: number; suggestion: string; severity: 'high' | 'medium' | 'low'; }
interface FeatureItem { name: string; importance: number; type: string; suggestion: string; }
interface ModelResult { name: string; accuracy?: number; f1?: number; rmse?: number; mae?: number; trainingTime?: number; notes?: string; }

const CHART_TYPES = [
    { type: 'bar', label: 'Bar', icon: <BarChart3 size={12} /> },
    { type: 'line', label: 'Line', icon: <LineChart size={12} /> },
    { type: 'area', label: 'Area', icon: <AreaChart size={12} /> },
    { type: 'scatter', label: 'Scatter', icon: <ScatterChart size={12} /> },
    { type: 'pie', label: 'Pie', icon: <PieChart size={12} /> },
    { type: 'heatmap', label: 'Heatmap', icon: <Layers size={12} /> },
] as const;

const ML_MODELS = ['Linear Regression', 'Logistic Regression', 'Random Forest', 'Gradient Boosting', 'SVM', 'K-Nearest Neighbors', 'Neural Network (MLP)', 'XGBoost', 'LightGBM', 'Decision Tree'] as const;

const STAT_TYPE_COLORS: Record<string, string> = {
    numeric: 'text-blue-400 bg-blue-500/10',
    categorical: 'text-purple-400 bg-purple-500/10',
    datetime: 'text-emerald-400 bg-emerald-500/10',
    boolean: 'text-amber-400 bg-amber-500/10',
    text: 'text-zinc-400 bg-white/[0.04]',
};

const SEVERITY_COLORS: Record<string, string> = {
    high: 'border-primary-500/20 bg-primary-500/5 text-primary-400',
    medium: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    low: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
};

const SAMPLE_CSV = `name,age,salary,department,performance
Alice,28,75000,Engineering,4.5
Bob,,102000,Marketing,3.8
Charlie,35,88000,Engineering,4.2
Diana,29,NULL,Product,4.9
Eve,41,95000,Marketing,3.5
Frank,33,78000,Engineering,
Grace,27,65000,Design,4.7`;

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string }> = ({ title, children, defaultOpen = true, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-canvas-border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-1.5">
                    {badge && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">{badge}</span>}
                    {open ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-3.5 space-y-2.5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Mini stat card
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color = 'text-white' }) => (
    <div className="bg-white/[0.03] border border-canvas-border rounded-xl p-2.5 text-center min-w-0">
        <div className={`text-sm font-bold ${color} truncate`}>{value}</div>
        <div className="text-[10px] text-zinc-500 leading-none mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{sub}</div>}
    </div>
);

// Mini spark bar
const SparkBar: React.FC<{ value: number; max?: number; color?: string }> = ({ value, max = 100, color = 'bg-cyan-500' }) => (
    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden flex-1">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${color}`} />
    </div>
);

const DataSciencePanel: React.FC<{ className?: string; projectId?: string }> = ({ className = '', projectId }) => {
    const [tab, setTab] = useState<Tab>('profile');
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

    // ── Profile state ───────────────────────────────────────────────────────
    const [profileData, setProfileData] = useState(SAMPLE_CSV);
    const [profileFormat, setProfileFormat] = useState<'csv' | 'json' | 'tsv'>('csv');
    const [profiling, setProfiling] = useState(false);
    const [profileStats, setProfileStats] = useState<{ rows: number; cols: number; memory: string; columns: ColumnStat[] } | null>(null);
    const [correlations, setCorrelations] = useState<{ col1: string; col2: string; r: number }[]>([]);
    const [corrLoading, setCorrLoading] = useState(false);

    const profileDataset = async () => {
        if (!profileData.trim()) return;
        setProfiling(true); setProfileStats(null);
        try {
            const r = await callTool('data_profile', { data: profileData, format: profileFormat, action: 'profile' });
            setProfileStats({
                rows: r.rows || 0, cols: r.cols || 0, memory: r.memory || '—',
                columns: r.columns || [],
            });
        } catch { } finally { setProfiling(false); }
    };

    const computeCorrelations = async () => {
        if (!profileData.trim()) return;
        setCorrLoading(true);
        try {
            const r = await callTool('data_correlate', { data: profileData, format: profileFormat });
            setCorrelations(r.correlations || []);
        } catch { } finally { setCorrLoading(false); }
    };

    // ── Clean state ─────────────────────────────────────────────────────────
    const [cleanData, setCleanData] = useState(SAMPLE_CSV);
    const [cleanOps, setCleanOps] = useState({
        fillNulls: true, removeOutliers: false, normalizeText: true,
        fixTypes: true, removeDuplicates: true, standardizeDates: false,
    });
    const [cleanLoading, setCleanLoading] = useState(false);
    const [cleanResult, setCleanResult] = useState<{ data: string; issues: DataIssue[]; summary: string } | null>(null);
    const [outlierLoad, setOutlierLoad] = useState(false);
    const [outliers, setOutliers] = useState<{ column: string; value: string | number; zScore: number }[]>([]);

    const cleanDataset = async () => {
        if (!cleanData.trim()) return;
        setCleanLoading(true); setCleanResult(null);
        try {
            const r = await callTool('data_clean', { data: cleanData, operations: cleanOps, action: 'clean' });
            setCleanResult({
                data: r.cleanedData || r.data || '',
                issues: r.issues || [],
                summary: r.summary || `Cleaned dataset: ${r.rowsRemoved || 0} rows removed, ${r.nullsFilled || 0} nulls filled`,
            });
        } catch { } finally { setCleanLoading(false); }
    };

    const detectOutliers = async () => {
        setOutlierLoad(true);
        try {
            const r = await callTool('outlier_detect', { data: cleanData, format: 'csv' });
            setOutliers(r.outliers || []);
        } catch { } finally { setOutlierLoad(false); }
    };

    // ── Visualize state ─────────────────────────────────────────────────────
    const [vizData, setVizData] = useState(SAMPLE_CSV);
    const [chartType, setChartType] = useState<string>('bar');
    const [xCol, setXCol] = useState('');
    const [yCol, setYCol] = useState('');
    const [groupCol, setGroupCol] = useState('');
    const [vizLoading, setVizLoading] = useState(false);
    const [vizResult, setVizResult] = useState<{ spec: string; imageUrl?: string } | null>(null);

    const visualize = async () => {
        if (!vizData.trim()) return;
        setVizLoading(true); setVizResult(null);
        try {
            const r = await callTool('data_visualize', { data: vizData, chartType, xColumn: xCol, yColumn: yCol, groupBy: groupCol, action: 'create' });
            setVizResult({ spec: r.spec || r.vegaSpec || JSON.stringify(r, null, 2), imageUrl: r.imageUrl });
        } catch { } finally { setVizLoading(false); }
    };

    // ── Analytics state ─────────────────────────────────────────────────────
    const [analyticsData, setAnalyticsData] = useState('');
    const [analyticsType, setAnalyticsType] = useState<'trend' | 'cohort' | 'funnel' | 'ab_test' | 'dashboard'>('trend');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsResult, setAnalyticsResult] = useState<string | null>(null);
    const [trackEvent, setTrackEvent] = useState('user_signup');
    const [trackProps, setTrackProps] = useState('{\n  "userId": "u_123",\n  "plan": "pro"\n}');
    const [trackLoading, setTrackLoading] = useState(false);

    const runAnalyticsFixed = async () => {
        if (!analyticsData.trim() && analyticsType !== 'dashboard') return;
        setAnalyticsLoading(true); setAnalyticsResult(null);
        try {
            let r;
            if (analyticsType === 'dashboard') {
                r = await callTool('analytics_dashboard', { action: 'generate', data: analyticsData });
            } else {
                r = await callTool('analytics_track', { action: analyticsType, data: analyticsData });
            }
            setAnalyticsResult(r.report || r.insights?.join('\n') || JSON.stringify(r, null, 2));
        } catch { } finally { setAnalyticsLoading(false); }
    };

    const sendTrackEvent = async () => {
        if (!trackEvent.trim()) return;
        setTrackLoading(true);
        try {
            let props: Record<string, unknown> = {};
            try { props = JSON.parse(trackProps); } catch { }
            await callTool('analytics_track', { action: 'track', event: trackEvent, properties: props });
        } catch { } finally { setTrackLoading(false); }
    };

    // ── ML state ────────────────────────────────────────────────────────────
    const [mlData, setMlData] = useState(SAMPLE_CSV);
    const [targetCol, setTargetCol] = useState('performance');
    const [selectedModels, setSelectedModels] = useState<string[]>(['Random Forest', 'Gradient Boosting', 'Linear Regression']);
    const [taskType, setTaskType] = useState<'classification' | 'regression'>('regression');
    const [mlLoading, setMlLoading] = useState(false);
    const [mlResults, setMlResults] = useState<ModelResult[]>([]);
    const [featureData, setFeatureData] = useState(SAMPLE_CSV);
    const [featureLoad, setFeatureLoad] = useState(false);
    const [features, setFeatures] = useState<FeatureItem[]>([]);

    const compareModels = async () => {
        if (!mlData.trim() || !targetCol.trim()) return;
        setMlLoading(true); setMlResults([]);
        try {
            const r = await callTool('model_compare', { data: mlData, target: targetCol, models: selectedModels, taskType, action: 'compare' });
            setMlResults(r.results || r.models || selectedModels.map(m => ({ name: m })));
        } catch { } finally { setMlLoading(false); }
    };

    const engineerFeatures = async () => {
        if (!featureData.trim()) return;
        setFeatureLoad(true); setFeatures([]);
        try {
            const r = await callTool('feature_engineer', { data: featureData, target: targetCol, action: 'suggest' });
            setFeatures(r.features || r.suggestions || []);
        } catch { } finally { setFeatureLoad(false); }
    };

    const toggleModel = (m: string) => setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'profile', label: 'Profile', icon: <Table size={12} />, tooltip: 'Deeply profile a dataset — stats, distributions, correlations, null rates' },
        { id: 'clean', label: 'Clean', icon: <Zap size={12} />, tooltip: 'Auto-detect and fix data quality issues: nulls, outliers, duplicates, type errors' },
        { id: 'visualize', label: 'Visualize', icon: <BarChart3 size={12} />, tooltip: 'Generate bar, line, scatter, pie, and heatmap charts from tabular data' },
        { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={12} />, tooltip: 'Trend analysis, cohort analysis, funnel tracking, and A/B test evaluation' },
        { id: 'ml', label: 'ML', icon: <FlaskConical size={12} />, tooltip: 'Compare ML models side-by-side and engineer predictive features' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            <div className="flex items-center gap-2 px-3.5 py-3 border-b border-canvas-border">
                <BarChart3 size={16} className="text-cyan-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Data Science</span>
                <span className="ml-auto text-[10px] text-zinc-500 hidden sm:block">Profile • Clean • Viz • Analytics • ML</span>
            </div>

            <div className="flex gap-0.5 px-2.5 py-2 border-b border-canvas-border overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} title={t.tooltip}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${tab === t.id ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── PROFILE TAB ── */}
                {tab === 'profile' && (
                    <>
                        <Section title="Dataset Input" defaultOpen>
                            <div className="space-y-2.5">
                                <div className="flex gap-1">
                                    {(['csv', 'json', 'tsv'] as const).map(f => (
                                        <button key={f} onClick={() => setProfileFormat(f)} title={`Profile a ${f.toUpperCase()} dataset`}
                                            className={`flex-1 py-1 text-[10px] font-mono rounded-lg border transition-colors uppercase ${profileFormat === f ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-canvas-border text-zinc-500'}`}>{f}</button>
                                    ))}
                                </div>
                                <textarea value={profileData} onChange={e => setProfileData(e.target.value)} rows={5}
                                    placeholder="Paste CSV, JSON, or TSV data here..."
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />
                                <div className="flex gap-1.5">
                                    <button onClick={profileDataset} disabled={profiling}
                                        title="Compute descriptive statistics, data types, null rates, unique counts, min/max, mean, and std for every column"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors">
                                        {profiling ? <Loader2 size={11} className="animate-spin" /> : <BarChart3 size={11} />}
                                        Profile
                                    </button>
                                    <button onClick={computeCorrelations} disabled={corrLoading}
                                        title="Compute Pearson correlation matrix for all numeric columns"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-zinc-300 text-[11px] font-medium rounded-lg transition-colors">
                                        {corrLoading ? <Loader2 size={11} className="animate-spin" /> : <ScatterChart size={11} />}
                                        Correlations
                                    </button>
                                </div>
                            </div>
                        </Section>

                        {profileStats && (
                            <>
                                <div className="grid grid-cols-3 gap-1">
                                    <StatCard label="Rows" value={profileStats.rows.toLocaleString()} color="text-cyan-300" />
                                    <StatCard label="Columns" value={profileStats.cols} color="text-blue-300" />
                                    <StatCard label="Memory" value={profileStats.memory} color="text-purple-300" />
                                </div>

                                <Section title="Column Statistics" badge={`${profileStats.columns.length}`} defaultOpen>
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {profileStats.columns.map((col, i) => (
                                            <div key={i} className="bg-white/[0.02] border border-canvas-border rounded-lg p-2">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[11px] font-semibold text-zinc-200 flex-1 truncate">{col.name}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STAT_TYPE_COLORS[col.type] || STAT_TYPE_COLORS['text']}`}>{col.type}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                                                    <span>Count: <span className="text-zinc-300">{col.count}</span></span>
                                                    <span>Nulls: <span className={col.nulls > 0 ? 'text-amber-400' : 'text-zinc-300'}>{col.nulls}</span></span>
                                                    <span>Unique: <span className="text-zinc-300">{col.unique}</span></span>
                                                    {col.mean !== undefined && <span>Mean: <span className="text-zinc-300">{col.mean?.toFixed(2)}</span></span>}
                                                    {col.std !== undefined && <span>Std: <span className="text-zinc-300">{col.std?.toFixed(2)}</span></span>}
                                                    {col.min !== undefined && <span>Min: <span className="text-zinc-300">{col.min}</span></span>}
                                                    {col.max !== undefined && <span>Max: <span className="text-zinc-300">{col.max}</span></span>}
                                                </div>
                                                {col.nulls > 0 && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <span className="text-[10px] text-zinc-600 shrink-0">null%</span>
                                                        <SparkBar value={col.nulls} max={col.count} color="bg-amber-500" />
                                                        <span className="text-[10px] text-amber-400 shrink-0 font-mono">{((col.nulls / col.count) * 100).toFixed(1)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            </>
                        )}

                        {correlations.length > 0 && (
                            <Section title="Top Correlations" badge={`${correlations.length}`}>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 15).map((c, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono text-zinc-400 truncate min-w-0 flex-1">{c.col1} × {c.col2}</span>
                                            <SparkBar value={Math.abs(c.r) * 100} color={c.r > 0.7 ? 'bg-emerald-500' : c.r < -0.7 ? 'bg-primary-500' : c.r > 0 ? 'bg-blue-500' : 'bg-orange-500'} />
                                            <span className={`text-[10px] font-mono font-bold w-10 text-right shrink-0 ${Math.abs(c.r) > 0.7 ? (c.r > 0 ? 'text-emerald-400' : 'text-primary-400') : 'text-zinc-400'}`}>{c.r.toFixed(3)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── CLEAN TAB ── */}
                {tab === 'clean' && (
                    <>
                        <Section title="Cleaning Operations" defaultOpen>
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { key: 'fillNulls', label: 'Fill Nulls', tooltip: 'Fill missing values with median/mode' },
                                        { key: 'removeOutliers', label: 'Rm Outliers', tooltip: 'Remove statistical outliers' },
                                        { key: 'normalizeText', label: 'Norm Text', tooltip: 'Trim spaces, fix casing' },
                                        { key: 'fixTypes', label: 'Fix Types', tooltip: 'Auto-cast to correct types' },
                                        { key: 'removeDuplicates', label: 'Dedup', tooltip: 'Remove duplicate rows' },
                                        { key: 'standardizeDates', label: 'Std Dates', tooltip: 'Unify date formats' },
                                    ].map(({ key, label, tooltip }) => (
                                        <label key={key} title={tooltip} className="flex items-center gap-1.5 bg-white/[0.03] border border-canvas-border rounded-lg px-2 py-1.5 cursor-pointer hover:border-cyan-500/20 transition-colors">
                                            <input type="checkbox" checked={(cleanOps as Record<string, boolean>)[key]} onChange={e => setCleanOps(prev => ({ ...prev, [key]: e.target.checked }))} className="w-3 h-3 accent-cyan-500 shrink-0" />
                                            <span className="text-[10px] text-zinc-300 truncate">{label}</span>
                                        </label>
                                    ))}
                                </div>

                                <textarea value={cleanData} onChange={e => setCleanData(e.target.value)} rows={4}
                                    placeholder="Paste CSV data with quality issues..."
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />

                                <div className="flex gap-1.5">
                                    <button onClick={cleanDataset} disabled={cleanLoading}
                                        title="Apply selected cleaning operations"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors">
                                        {cleanLoading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                                        Clean
                                    </button>
                                    <button onClick={detectOutliers} disabled={outlierLoad}
                                        title="Detect outliers using Z-score analysis"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-zinc-300 text-[11px] font-medium rounded-lg transition-colors">
                                        {outlierLoad ? <Loader2 size={10} className="animate-spin" /> : <AlertTriangle size={10} />}
                                        Outliers
                                    </button>
                                </div>
                            </div>
                        </Section>

                        {cleanResult && (
                            <Section title="Clean Result">
                                <p className="text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">{cleanResult.summary}</p>
                                {cleanResult.issues.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Detected Issues</span>
                                        {cleanResult.issues.map((issue, i) => (
                                            <div key={i} className={`p-2 rounded-lg border text-[10px] ${SEVERITY_COLORS[issue.severity]}`}>
                                                <div className="flex justify-between mb-0.5">
                                                    <span className="font-semibold truncate">{issue.column}</span>
                                                    <span className="shrink-0 ml-2">{issue.count} affected</span>
                                                </div>
                                                <p className="truncate">{issue.issue}</p>
                                                <p className="text-zinc-400 mt-0.5 truncate">→ {issue.suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {cleanResult.data && (
                                    <div className="mt-2">
                                        <div className="flex justify-end mb-1">
                                            <button onClick={() => copyText(cleanResult.data, 'clean')} title="Copy cleaned dataset" className="text-zinc-500 hover:text-white">
                                                {copied === 'clean' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                            </button>
                                        </div>
                                        <pre className="text-[10px] font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-lg p-2 max-h-40 overflow-auto leading-relaxed">{cleanResult.data}</pre>
                                    </div>
                                )}
                            </Section>
                        )}

                        {outliers.length > 0 && (
                            <Section title="Outliers Detected" badge={`${outliers.length}`}>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {outliers.map((o, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px] bg-white/[0.02] rounded-lg px-2 py-1 border border-canvas-border">
                                            <span className="text-zinc-500 w-16 truncate shrink-0">{o.column}</span>
                                            <span className="font-mono text-amber-400 flex-1 truncate">{o.value}</span>
                                            <span className="text-zinc-600 shrink-0">z={o.zScore.toFixed(2)}</span>
                                            <AlertTriangle size={9} className="text-amber-400 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── VISUALIZE TAB ── */}
                {tab === 'visualize' && (
                    <Section title="Chart Builder" defaultOpen>
                        <div className="space-y-2.5">
                            <textarea value={vizData} onChange={e => setVizData(e.target.value)} rows={3}
                                placeholder="Paste CSV or JSON data..."
                                className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />

                            <div>
                                <label className="block text-[10px] text-zinc-500 mb-1">Chart Type</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {CHART_TYPES.map(c => (
                                        <button key={c.type} onClick={() => setChartType(c.type)} title={`Create a ${c.label.toLowerCase()} chart`}
                                            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${chartType === c.type ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                            {c.icon}{c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { label: 'X Axis', val: xCol, set: setXCol, placeholder: 'col name' },
                                    { label: 'Y Axis', val: yCol, set: setYCol, placeholder: 'col name' },
                                    { label: 'Group', val: groupCol, set: setGroupCol, placeholder: 'optional' },
                                ].map(({ label, val, set, placeholder }) => (
                                    <div key={label}>
                                        <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
                                        <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                                            className="w-full text-[10px] font-mono bg-white/[0.04] border border-canvas-border rounded-lg px-2 py-1.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40" />
                                    </div>
                                ))}
                            </div>

                            <button onClick={visualize} disabled={vizLoading}
                                title="Generate chart spec"
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors">
                                {vizLoading ? <Loader2 size={11} className="animate-spin" /> : <BarChart3 size={11} />}
                                Generate Chart
                            </button>

                            {vizResult && (
                                <div className="space-y-1.5">
                                    {vizResult.imageUrl && (
                                        <img src={vizResult.imageUrl} alt="Chart" className="w-full rounded-lg border border-canvas-border" />
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-zinc-500">Vega-Lite Spec</span>
                                        <button onClick={() => copyText(vizResult.spec, 'viz')} title="Copy spec" className="text-zinc-500 hover:text-white">
                                            {copied === 'viz' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                        </button>
                                    </div>
                                    <pre className="text-[10px] font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-lg p-2 max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">{vizResult.spec}</pre>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* ── ANALYTICS TAB ── */}
                {tab === 'analytics' && (
                    <>
                        <Section title="Analytics" defaultOpen>
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap gap-1">
                                    {([['trend', '📈 Trend', 'Time-series trends'], ['cohort', '👥 Cohort', 'Cohort retention'], ['funnel', '🔽 Funnel', 'Conversion funnel'], ['ab_test', '⚗️ A/B Test', 'A/B significance test'], ['dashboard', '📊 Dashboard', 'Auto KPI dashboard']] as [typeof analyticsType, string, string][]).map(([v, l, tip]) => (
                                        <button key={v} onClick={() => setAnalyticsType(v)} title={tip}
                                            className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${analyticsType === v ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>{l}</button>
                                    ))}
                                </div>
                                <textarea value={analyticsData} onChange={e => setAnalyticsData(e.target.value)} rows={3}
                                    placeholder={analyticsType === 'ab_test' ? '{"control": {"users": 5000, "conversions": 250}, "variant": {"users": 5000, "conversions": 310}}' : 'Paste event data, metrics, or CSV...'}
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />
                                <button onClick={runAnalyticsFixed} disabled={analyticsLoading}
                                    title="Run the selected analysis"
                                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors">
                                    {analyticsLoading ? <Loader2 size={11} className="animate-spin" /> : <TrendingUp size={11} />}
                                    Run Analysis
                                </button>
                                {analyticsResult && (
                                    <div>
                                        <div className="flex justify-end mb-1">
                                            <button onClick={() => copyText(analyticsResult, 'analytics')} title="Copy report" className="text-zinc-500 hover:text-white">
                                                {copied === 'analytics' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                            </button>
                                        </div>
                                        <pre className="text-[10px] font-mono text-zinc-300 bg-canvas-card border border-canvas-border rounded-lg p-2 max-h-48 overflow-auto whitespace-pre-wrap leading-relaxed">{analyticsResult}</pre>
                                    </div>
                                )}
                            </div>
                        </Section>

                        <Section title="Event Tracker">
                            <div className="space-y-2.5">
                                <p className="text-[10px] text-zinc-500">Track custom events with properties.</p>
                                <input value={trackEvent} onChange={e => setTrackEvent(e.target.value)} placeholder="event_name"
                                    className="w-full text-[11px] font-mono bg-white/[0.04] border border-canvas-border rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-cyan-500/50" />
                                <textarea value={trackProps} onChange={e => setTrackProps(e.target.value)} rows={3}
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />
                                <button onClick={sendTrackEvent} disabled={trackLoading}
                                    title="Send analytics event"
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 text-[11px] font-medium rounded-lg transition-colors">
                                    {trackLoading ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                                    Send Event
                                </button>
                            </div>
                        </Section>
                    </>
                )}

                {/* ── ML TAB ── */}
                {tab === 'ml' && (
                    <>
                        <Section title="Model Comparison" defaultOpen>
                            <div className="space-y-2.5">
                                <div className="flex gap-1.5">
                                    {(['classification', 'regression'] as const).map(t => (
                                        <button key={t} onClick={() => setTaskType(t)}
                                            title={t === 'classification' ? 'Predict categories' : 'Predict numeric values'}
                                            className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg border capitalize transition-colors ${taskType === t ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-0.5">Target Column</label>
                                    <input value={targetCol} onChange={e => setTargetCol(e.target.value)} placeholder="column to predict"
                                        className="w-full text-[10px] font-mono bg-white/[0.04] border border-canvas-border rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-cyan-500/40" />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 mb-1">Models</label>
                                    <div className="flex flex-wrap gap-1">
                                        {ML_MODELS.map(m => (
                                            <button key={m} onClick={() => toggleModel(m)} title={`Include ${m}`}
                                                className={`text-[10px] px-1.5 py-0.5 rounded-lg border transition-colors ${selectedModels.includes(m) ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>

                                <textarea value={mlData} onChange={e => setMlData(e.target.value)} rows={3}
                                    placeholder="Paste training dataset CSV..."
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />

                                <button onClick={compareModels} disabled={mlLoading || !selectedModels.length}
                                    title="Train and compare all selected models"
                                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors">
                                    {mlLoading ? <Loader2 size={11} className="animate-spin" /> : <GitCompare size={11} />}
                                    {mlLoading ? 'Training...' : 'Compare Models'}
                                </button>

                                {mlResults.length > 0 && (
                                    <div className="space-y-1.5">
                                        {mlResults.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0)).map((r, i) => (
                                            <div key={i} className={`p-2 rounded-lg border ${i === 0 ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-canvas-border bg-white/[0.02]'}`}>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {i === 0 && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-bold shrink-0">BEST</span>}
                                                    <span className="text-[11px] font-medium text-zinc-200 truncate">{r.name}</span>
                                                    {r.trainingTime && <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{r.trainingTime}ms</span>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                                    {r.accuracy !== undefined && (
                                                        <div className="flex items-center gap-1.5 col-span-2">
                                                            <span className="text-[10px] text-zinc-600 shrink-0">Acc</span>
                                                            <SparkBar value={r.accuracy * 100} color={i === 0 ? 'bg-cyan-500' : 'bg-zinc-600'} />
                                                            <span className="text-[10px] font-mono text-zinc-300 shrink-0">{(r.accuracy * 100).toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                    {r.f1 !== undefined && <span className="text-[10px] text-zinc-500">F1: <span className="text-zinc-300 font-mono">{r.f1?.toFixed(3)}</span></span>}
                                                    {r.rmse !== undefined && <span className="text-[10px] text-zinc-500">RMSE: <span className="text-zinc-300 font-mono">{r.rmse?.toFixed(3)}</span></span>}
                                                    {r.mae !== undefined && <span className="text-[10px] text-zinc-500">MAE: <span className="text-zinc-300 font-mono">{r.mae?.toFixed(3)}</span></span>}
                                                </div>
                                                {r.notes && <p className="text-[10px] text-zinc-600 mt-1 truncate">{r.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Section>

                        <Section title="Feature Engineering">
                            <div className="space-y-2.5">
                                <p className="text-[10px] text-zinc-500">Auto-suggest features to improve model performance.</p>
                                <textarea value={featureData} onChange={e => setFeatureData(e.target.value)} rows={3}
                                    className="w-full text-[10px] font-mono bg-canvas-card border border-canvas-border rounded-lg px-2.5 py-2 text-zinc-300 outline-none focus:border-cyan-500/40 resize-none leading-relaxed" />
                                <button onClick={engineerFeatures} disabled={featureLoad}
                                    title="Analyze dataset and suggest features"
                                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-zinc-300 text-[11px] font-medium rounded-lg transition-colors">
                                    {featureLoad ? <Loader2 size={11} className="animate-spin" /> : <Target size={11} />}
                                    Suggest Features
                                </button>
                                {features.length > 0 && (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {features.map((f, i) => (
                                            <div key={i} className="bg-white/[0.02] border border-canvas-border rounded-lg p-2">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[11px] font-medium text-zinc-200 flex-1 truncate">{f.name}</span>
                                                    <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1 py-0.5 rounded shrink-0">{f.type}</span>
                                                    <span className="text-[10px] font-bold text-cyan-400 shrink-0">{(f.importance * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <SparkBar value={f.importance * 100} color="bg-cyan-500" />
                                                </div>
                                                <p className="text-[10px] text-zinc-500 leading-snug">{f.suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Section>
                    </>
                )}

            </div>
        </div>
    );
};

export default DataSciencePanel;
