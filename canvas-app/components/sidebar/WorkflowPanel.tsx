/**
 * WorkflowPanel — Visual workflow builder, executor, scheduler & visualizer
 * Tools: workflow_create, workflow_execute, workflow_schedule, workflow_visualize, workflow_optimize
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Loader2, Plus, Trash2, ChevronDown, ChevronRight,
    Play, Pause, Square, RefreshCw, Copy, Check, Clock,
    CheckCircle2, XCircle, AlertTriangle, ArrowRight, Settings,
    GitBranch, Timer, BarChart3, Eye, Download, Calendar,
    Workflow, Code, Activity, Circle,
} from 'lucide-react';

const API_BASE = '/api/canvas';

type Tab = 'builder' | 'execute' | 'schedule' | 'visualize';

interface WorkflowStep {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'transform' | 'delay' | 'loop';
    name: string;
    config: Record<string, string>;
}

interface WorkflowRun { id: string; startedAt: string; status: 'running' | 'success' | 'failed' | 'pending'; duration?: number; steps?: { name: string; status: string; duration?: number }[]; }
interface ScheduledJob { id: string; name: string; cron: string; nextRun: string; status: 'active' | 'paused' | 'error'; runs: number; lastStatus?: string; }

const STEP_TYPES: { type: WorkflowStep['type']; label: string; color: string; icon: React.ReactNode; description: string }[] = [
    { type: 'trigger', label: 'Trigger', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5', icon: <Zap size={11} />, description: 'Event that starts the workflow (HTTP, schedule, webhook)' },
    { type: 'action', label: 'Action', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5', icon: <Play size={11} />, description: 'Execute an operation (API call, database query, file operation)' },
    { type: 'condition', label: 'Condition', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5', icon: <GitBranch size={11} />, description: 'Branch the workflow based on a condition (if/else)' },
    { type: 'transform', label: 'Transform', color: 'text-purple-400 border-purple-500/30 bg-purple-500/5', icon: <Code size={11} />, description: 'Transform, map or filter data between steps' },
    { type: 'delay', label: 'Delay', color: 'text-orange-400 border-orange-500/30 bg-orange-500/5', icon: <Timer size={11} />, description: 'Pause execution for a fixed duration or until a condition' },
    { type: 'loop', label: 'Loop', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5', icon: <RefreshCw size={11} />, description: 'Iterate over a list or repeat while a condition is true' },
];

const CRON_PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 min', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Mon–Fri at 9am', value: '0 9 * * 1-5' },
    { label: 'Weekly Sunday', value: '0 0 * * 0' },
    { label: 'Monthly', value: '0 0 1 * *' },
];

const RUN_STATUS_COLORS: Record<string, string> = {
    running: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-primary-400 bg-primary-500/10 border-primary-500/30',
    pending: 'text-zinc-400 bg-white/[0.04] border-canvas-border',
};

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
                    {badge && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">{badge}</span>}
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

const WorkflowPanel: React.FC<{ className?: string; projectId?: string }> = ({ className = '', projectId }) => {
    const [tab, setTab] = useState<Tab>('builder');
    const [copied, setCopied] = useState(false);

    const callTool = useCallback(async (tool: string, params: Record<string, unknown>) => {
        const res = await fetch(`${API_BASE}/execute-data-tool`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, projectId, ...params }),
        });
        return res.json();
    }, [projectId]);

    // ── Builder state ───────────────────────────────────────────────────────
    const [wfName, setWfName] = useState('my-workflow');
    const [wfDescription, setWfDescription] = useState('');
    const [steps, setSteps] = useState<WorkflowStep[]>([
        { id: '1', type: 'trigger', name: 'HTTP Request trigger', config: { method: 'POST', path: '/run' } },
        { id: '2', type: 'action', name: 'Send email notification', config: { to: '{{ trigger.email }}', subject: 'Workflow triggered' } },
    ]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [savedWf, setSavedWf] = useState<{ id: string; yaml?: string } | null>(null);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    const addStep = (type: WorkflowStep['type']) => {
        const defaults: Record<WorkflowStep['type'], Record<string, string>> = {
            trigger: { event: 'http', method: 'POST' },
            action: { tool: '', params: '{}' },
            condition: { condition: '{{ step.result }} == true', trueBranch: 'continue', falseBranch: 'stop' },
            transform: { expression: '{{ input | json_encode }}', outputKey: 'result' },
            delay: { duration: '5', unit: 'seconds' },
            loop: { over: '{{ items }}', variable: 'item', maxIterations: '100' },
        };
        const info = STEP_TYPES.find(s => s.type === type);
        setSteps(prev => [...prev, { id: Date.now().toString(), type, name: info?.label + ' step', config: defaults[type] }]);
    };

    const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));
    const updateStep = (id: string, field: 'name' | 'config', value: string | Record<string, string>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const saveWorkflow = async () => {
        setSaveLoading(true);
        try {
            const r = await callTool('workflow_create', { action: 'create', name: wfName, description: wfDescription, steps });
            setSavedWf({ id: r.id || r.workflowId || 'wf_' + Date.now(), yaml: r.yaml || r.definition });
        } catch { } finally { setSaveLoading(false); }
    };

    // ── Execute state ───────────────────────────────────────────────────────
    const [execWfId, setExecWfId] = useState('');
    const [execInput, setExecInput] = useState('{\n  "key": "value"\n}');
    const [execMode, setExecMode] = useState<'sync' | 'async'>('sync');
    const [running, setRunning] = useState(false);
    const [runHistory, setRunHistory] = useState<WorkflowRun[]>([]);
    const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

    const executeWorkflow = async () => {
        const id = execWfId || savedWf?.id;
        if (!id) return;
        setRunning(true);
        const runId = 'run_' + Date.now();
        const newRun: WorkflowRun = { id: runId, startedAt: new Date().toISOString(), status: 'running' };
        setRunHistory(prev => [newRun, ...prev]);
        try {
            let input: Record<string, unknown> = {};
            try { input = JSON.parse(execInput); } catch { }
            const r = await callTool('workflow_execute', { action: 'execute', workflowId: id, input, mode: execMode });
            const updatedRun: WorkflowRun = {
                id: runId, startedAt: newRun.startedAt,
                status: r.success !== false ? 'success' : 'failed',
                duration: r.duration,
                steps: r.steps,
            };
            setRunHistory(prev => prev.map(run => run.id === runId ? updatedRun : run));
            setSelectedRun(updatedRun);
        } catch {
            setRunHistory(prev => prev.map(run => run.id === runId ? { ...run, status: 'failed' } : run));
        } finally { setRunning(false); }
    };

    // ── Schedule state ──────────────────────────────────────────────────────
    const [schedWfId, setSchedWfId] = useState('');
    const [schedName, setSchedName] = useState('');
    const [cronExpr, setCronExpr] = useState('0 * * * *');
    const [schedLoading, setSchedLoading] = useState(false);
    const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);

    const createSchedule = async () => {
        if (!schedWfId.trim() || !cronExpr.trim()) return;
        setSchedLoading(true);
        try {
            const r = await callTool('workflow_schedule', {
                action: 'create', workflowId: schedWfId,
                name: schedName || `${schedWfId} schedule`,
                cron: cronExpr,
            });
            setScheduledJobs(prev => [...prev, {
                id: r.id || Date.now().toString(),
                name: schedName || schedWfId,
                cron: cronExpr, nextRun: r.nextRun || 'Calculated shortly',
                status: 'active', runs: 0,
            }]);
            setSchedWfId(''); setSchedName('');
        } catch { } finally { setSchedLoading(false); }
    };

    const toggleJob = async (jobId: string, currentStatus: string) => {
        const action = currentStatus === 'active' ? 'pause' : 'resume';
        try {
            await callTool('workflow_schedule', { action, scheduleId: jobId });
            setScheduledJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: action === 'pause' ? 'paused' : 'active' } : j));
        } catch { }
    };

    const deleteJob = async (jobId: string) => {
        try {
            await callTool('workflow_schedule', { action: 'delete', scheduleId: jobId });
            setScheduledJobs(prev => prev.filter(j => j.id !== jobId));
        } catch { }
    };

    // ── Visualize state ─────────────────────────────────────────────────────
    const [vizWfId, setVizWfId] = useState('');
    const [vizData, setVizData] = useState<{ nodes: { id: string; label: string; type: string }[]; edges: { from: string; to: string }[] } | null>(null);
    const [vizLoading, setVizLoading] = useState(false);
    const [optResult, setOptResult] = useState<string | null>(null);
    const [optLoading, setOptLoading] = useState(false);

    const visualize = async () => {
        const id = vizWfId || savedWf?.id;
        if (!id) return;
        setVizLoading(true);
        try {
            const r = await callTool('workflow_visualize', { action: 'graph', workflowId: id });
            setVizData(r.graph || r);
        } catch { } finally { setVizLoading(false); }
    };

    const optimize = async () => {
        const id = vizWfId || savedWf?.id;
        if (!id) return;
        setOptLoading(true);
        try {
            const r = await callTool('workflow_optimize', { action: 'suggest', workflowId: id });
            setOptResult(r.suggestions?.join('\n') || r.report || JSON.stringify(r, null, 2));
        } catch { } finally { setOptLoading(false); }
    };

    const TABS: { id: Tab; label: string; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'builder', label: 'Builder', icon: <Workflow size={12} />, tooltip: 'Visually assemble workflow steps: triggers, actions, conditions, transforms' },
        { id: 'execute', label: 'Execute', icon: <Play size={12} />, tooltip: 'Run a workflow manually with custom input and view execution trace' },
        { id: 'schedule', label: 'Schedule', icon: <Calendar size={12} />, tooltip: 'Schedule workflows with cron expressions and manage recurring jobs' },
        { id: 'visualize', label: 'Visualize', icon: <Eye size={12} />, tooltip: 'Generate a visual graph of the workflow and get optimization suggestions' },
    ];

    return (
        <div className={`flex flex-col h-full bg-canvas-card text-white ${className}`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-canvas-border">
                <Zap size={20} className="text-purple-400 shrink-0" />
                <span className="text-lg font-semibold text-white">Workflow</span>
                <span className="ml-auto text-xs text-zinc-500">Build • Execute • Schedule • Visualize</span>
            </div>

            <div className="flex gap-1 px-4 py-2.5 border-b border-canvas-border">
                {TABS.map(t => (
                    <Tooltip key={t.id} text={t.tooltip}>
                        <button onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-1 justify-center transition-all ${tab === t.id ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}>
                            {t.icon}{t.label}
                        </button>
                    </Tooltip>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* ── BUILDER TAB ── */}
                {tab === 'builder' && (
                    <>
                        <Section title="Workflow Info" defaultOpen>
                            <div className="space-y-1.5">
                                <input value={wfName} onChange={e => setWfName(e.target.value)} placeholder="Workflow name"
                                    className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />
                                <input value={wfDescription} onChange={e => setWfDescription(e.target.value)} placeholder="Description (optional)"
                                    className="w-full text-sm bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-purple-500/50" />
                            </div>
                        </Section>

                        {/* Step type palette */}
                        <Section title="Add Step">
                            <div className="grid grid-cols-3 gap-1">
                                {STEP_TYPES.map(s => (
                                    <Tooltip key={s.type} text={s.description}>
                                        <button onClick={() => addStep(s.type)}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all hover:opacity-90 active:scale-95 ${s.color}`}>
                                            {s.icon}
                                            <span className="text-xs font-medium">{s.label}</span>
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </Section>

                        {/* Steps list */}
                        <Section title="Steps" badge={`${steps.length}`} defaultOpen>
                            <div className="space-y-1.5">
                                {steps.map((step, i) => {
                                    const info = STEP_TYPES.find(s => s.type === step.type);
                                    const isExpanded = expandedStep === step.id;
                                    return (
                                        <div key={step.id} className={`rounded-xl border ${info?.color || 'border-canvas-border text-zinc-400'} overflow-hidden`}>
                                            <div className="flex items-center gap-2 px-3.5 py-2.5">
                                                <span className="text-xs font-mono text-zinc-600 w-4 shrink-0">{i + 1}</span>
                                                <span className="shrink-0">{info?.icon}</span>
                                                <input value={step.name} onChange={e => updateStep(step.id, 'name', e.target.value)}
                                                    className="flex-1 text-sm bg-transparent outline-none text-current placeholder-zinc-600 min-w-0" />
                                                <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} className="shrink-0 opacity-50 hover:opacity-100">
                                                    {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                                </button>
                                                <button onClick={() => removeStep(step.id)} className="shrink-0 opacity-40 hover:opacity-100 hover:text-primary-400"><Trash2 size={11} /></button>
                                            </div>
                                            {isExpanded && (
                                                <div className="px-2.5 pb-2 space-y-1.5 border-t border-current/10">
                                                    {Object.entries(step.config).map(([k, v]) => (
                                                        <div key={k} className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-zinc-500 w-24 shrink-0">{k}</span>
                                                            <input value={v} onChange={e => updateStep(step.id, 'config', { ...step.config, [k]: e.target.value })}
                                                                className="flex-1 text-xs font-mono bg-black/20 border border-current/10 rounded px-1.5 py-0.5 outline-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {steps.length === 0 && (
                                    <p className="text-xs text-zinc-600 text-center py-3">Add steps above to build your workflow</p>
                                )}
                            </div>
                            {steps.length > 1 && (
                                <Tooltip text="Save workflow definition to backend — returns workflow ID for execution and scheduling">
                                    <button onClick={saveWorkflow} disabled={saveLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors mt-2">
                                        {saveLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                        Save Workflow
                                    </button>
                                </Tooltip>
                            )}
                            {savedWf && (
                                <div className="flex items-center gap-2 py-2 px-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 mt-1">
                                    <CheckCircle2 size={11} />
                                    <span>Saved — ID: <span className="font-mono">{savedWf.id}</span></span>
                                    <Tooltip text="Copy workflow ID">
                                        <button onClick={() => { navigator.clipboard.writeText(savedWf.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="ml-auto">
                                            {copied ? <Check size={10} /> : <Copy size={10} />}
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </Section>
                    </>
                )}

                {/* ── EXECUTE TAB ── */}
                {tab === 'execute' && (
                    <>
                        <Section title="Run Workflow" defaultOpen>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Workflow ID {savedWf && <span className="text-purple-400 ml-1">— saved: {savedWf.id}</span>}</label>
                                    <input value={execWfId} onChange={e => setExecWfId(e.target.value)} placeholder={savedWf?.id || 'workflow-id or leave blank to use saved'}
                                        className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Input (JSON)</label>
                                    <textarea value={execInput} onChange={e => setExecInput(e.target.value)} rows={4}
                                        className="w-full text-xs font-mono bg-canvas-card border border-canvas-border rounded-xl px-3.5 py-2.5 text-zinc-300 outline-none focus:border-purple-500/40 resize-none" />
                                </div>
                                <div className="flex gap-2">
                                    {(['sync', 'async'] as const).map(m => (
                                        <Tooltip key={m} text={m === 'sync' ? 'Wait for completion and show full trace' : 'Fire-and-forget — returns immediately with a run ID'}>
                                            <button onClick={() => setExecMode(m)}
                                                className={`flex-1 py-1.5 text-xs rounded-xl border capitalize transition-colors ${execMode === m ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-canvas-border text-zinc-500'}`}>
                                                {m}
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                                <Tooltip text="Execute the workflow with the provided JSON input and display the step-by-step execution trace">
                                    <button onClick={executeWorkflow} disabled={running || (!execWfId && !savedWf)}
                                        className="w-full flex items-center justify-center gap-2.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                        {running ? 'Running...' : 'Execute'}
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {runHistory.length > 0 && (
                            <Section title="Run History" badge={`${runHistory.length}`} defaultOpen>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {runHistory.map(run => (
                                        <button key={run.id} onClick={() => setSelectedRun(run === selectedRun ? null : run)}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all ${selectedRun?.id === run.id ? 'border-purple-500/30 bg-purple-500/5' : 'border-canvas-border bg-white/[0.02] hover:border-purple-500/20'}`}>
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'running' ? 'bg-blue-400 animate-pulse' : run.status === 'success' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-primary-400' : 'bg-zinc-500'}`} />
                                            <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{run.id}</span>
                                            {run.duration && <span className="text-sm text-zinc-500">{run.duration}ms</span>}
                                            <span className={`text-sm font-semibold uppercase ${run.status === 'success' ? 'text-emerald-400' : run.status === 'failed' ? 'text-primary-400' : run.status === 'running' ? 'text-blue-400' : 'text-zinc-500'}`}>{run.status}</span>
                                        </button>
                                    ))}
                                </div>

                                {selectedRun?.steps && (
                                    <div className="mt-2 space-y-1">
                                        <span className="text-xs text-zinc-500">Execution Trace</span>
                                        {selectedRun.steps.map((s, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${s.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : s.status === 'failed' ? 'border-primary-500/20 bg-primary-500/5 text-primary-400' : 'border-canvas-border text-zinc-400'}`}>
                                                <span className="font-mono shrink-0">{i + 1}.</span>
                                                <span className="flex-1 truncate">{s.name}</span>
                                                {s.duration && <span className="text-zinc-600 text-sm">{s.duration}ms</span>}
                                                {s.status === 'success' ? <CheckCircle2 size={10} /> : s.status === 'failed' ? <XCircle size={10} /> : <Circle size={10} className="animate-pulse" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Section>
                        )}
                    </>
                )}

                {/* ── SCHEDULE TAB ── */}
                {tab === 'schedule' && (
                    <>
                        <Section title="Create Schedule" defaultOpen>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Workflow ID</label>
                                        <input value={schedWfId} onChange={e => setSchedWfId(e.target.value)} placeholder={savedWf?.id || 'workflow-id'}
                                            className="w-full text-xs font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-purple-500/40" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Job Name</label>
                                        <input value={schedName} onChange={e => setSchedName(e.target.value)} placeholder="daily-report"
                                            className="w-full text-xs bg-white/[0.04] border border-canvas-border rounded-xl px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-purple-500/40" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Cron Expression</label>
                                    <input value={cronExpr} onChange={e => setCronExpr(e.target.value)} placeholder="0 * * * *"
                                        className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1.5">Presets</label>
                                    <div className="flex flex-wrap gap-1">
                                        {CRON_PRESETS.map(p => (
                                            <Tooltip key={p.value} text={`Cron: ${p.value}`}>
                                                <button onClick={() => setCronExpr(p.value)}
                                                    className={`text-xs px-2 py-1 rounded border transition-colors ${cronExpr === p.value ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-canvas-border text-zinc-500 hover:text-zinc-300'}`}>
                                                    {p.label}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                                <Tooltip text="Register a cron schedule that automatically triggers this workflow at the specified interval">
                                    <button onClick={createSchedule} disabled={schedLoading} className="w-full flex items-center justify-center gap-2.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                                        {schedLoading ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                                        Schedule Workflow
                                    </button>
                                </Tooltip>
                            </div>
                        </Section>

                        {scheduledJobs.length > 0 && (
                            <Section title="Scheduled Jobs" badge={`${scheduledJobs.length}`}>
                                <div className="space-y-1.5">
                                    {scheduledJobs.map(job => (
                                        <div key={job.id} className="bg-white/[0.02] border border-canvas-border rounded-xl p-2.5">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div>
                                                    <span className="text-sm font-medium text-zinc-200">{job.name}</span>
                                                    <div className="text-xs font-mono text-zinc-500 mt-0.5">{job.cron}</div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Tooltip text={job.status === 'active' ? 'Pause this schedule' : 'Resume this schedule'}>
                                                        <button onClick={() => toggleJob(job.id, job.status)} className="text-zinc-500 hover:text-zinc-300">
                                                            {job.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="Delete this schedule permanently">
                                                        <button onClick={() => deleteJob(job.id)} className="text-zinc-600 hover:text-primary-400"><Trash2 size={12} /></button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className={job.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>
                                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${job.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                                    {job.status}
                                                </span>
                                                <span className="text-zinc-600">Next: <span className="text-zinc-400 font-mono">{job.nextRun}</span></span>
                                                {job.runs > 0 && <span className="text-zinc-600">{job.runs} runs</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}

                {/* ── VISUALIZE TAB ── */}
                {tab === 'visualize' && (
                    <>
                        <Section title="Workflow Graph" defaultOpen>
                            <div className="space-y-3">
                                <input value={vizWfId} onChange={e => setVizWfId(e.target.value)} placeholder={savedWf?.id || 'Workflow ID (or use saved)'}
                                    className="w-full text-sm font-mono bg-white/[0.04] border border-canvas-border rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50" />
                                <div className="flex gap-2">
                                    <Tooltip text="Generate a visual graph of all nodes and edges in the workflow">
                                        <button onClick={visualize} disabled={vizLoading} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors">
                                            {vizLoading ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
                                            Visualize
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Analyze workflow for performance bottlenecks, redundant steps, and optimization suggestions">
                                        <button onClick={optimize} disabled={optLoading} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-zinc-300 text-xs font-medium rounded-xl transition-colors">
                                            {optLoading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                                            Optimize
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </Section>

                        {vizData && (
                            <Section title="Graph Nodes" badge={`${vizData.nodes?.length || 0}`}>
                                <div className="space-y-1.5">
                                    {/* Visual flow */}
                                    {vizData.nodes?.map((node, i) => {
                                        const info = STEP_TYPES.find(s => s.type === node.type as WorkflowStep['type']);
                                        return (
                                            <div key={node.id}>
                                                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${info?.color || 'border-canvas-border text-zinc-400'}`}>
                                                    <span className="shrink-0">{info?.icon || <Circle size={10} />}</span>
                                                    <span className="text-sm font-medium flex-1">{node.label}</span>
                                                    <span className="text-sm opacity-50 capitalize">{node.type}</span>
                                                </div>
                                                {i < vizData.nodes.length - 1 && (
                                                    <div className="flex justify-center py-0.5"><ArrowRight size={10} className="text-zinc-700 rotate-90" /></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}

                        {optResult && (
                            <Section title="Optimization Suggestions">
                                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono bg-canvas-card border border-canvas-border rounded-xl p-2.5 max-h-48 overflow-auto">{optResult}</pre>
                            </Section>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

export default WorkflowPanel;
