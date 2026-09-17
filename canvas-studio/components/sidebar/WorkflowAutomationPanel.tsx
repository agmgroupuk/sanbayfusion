import React, { useState } from 'react';

interface WorkflowStep {
    id: string;
    type: 'lint' | 'build' | 'test' | 'deploy' | 'notify' | 'custom';
    name: string;
    config: Record<string, string>;
    enabled: boolean;
}

interface Workflow {
    id: string;
    name: string;
    trigger: 'manual' | 'on-save' | 'on-commit' | 'scheduled';
    steps: WorkflowStep[];
    lastRun?: string;
    lastStatus?: 'success' | 'failed' | 'running';
}

interface WorkflowAutomationPanelProps {
    projectId?: string;
    isDarkMode?: boolean;
}

const STEP_TEMPLATES: { type: WorkflowStep['type']; icon: string; label: string; defaultConfig: Record<string, string> }[] = [
    { type: 'lint', icon: '🔍', label: 'Lint Code', defaultConfig: { tool: 'eslint' } },
    { type: 'build', icon: '🔨', label: 'Build Project', defaultConfig: { command: 'npm run build' } },
    { type: 'test', icon: '🧪', label: 'Run Tests', defaultConfig: { command: 'npm test' } },
    { type: 'deploy', icon: '🚀', label: 'Deploy', defaultConfig: { platform: 'maula' } },
    { type: 'notify', icon: '📧', label: 'Send Notification', defaultConfig: { channel: 'email' } },
    { type: 'custom', icon: '⚙️', label: 'Custom Command', defaultConfig: { command: '' } },
];

export default function WorkflowAutomationPanel({ projectId, isDarkMode = true }: WorkflowAutomationPanelProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [editing, setEditing] = useState<Workflow | null>(null);
    const [running, setRunning] = useState<string | null>(null);
    const [runOutput, setRunOutput] = useState<{ workflowId: string; results: { step: string; status: string; output: string }[] } | null>(null);

    const border = isDarkMode ? 'border-canvas-border' : 'border-gray-200';
    const subtext = isDarkMode ? 'text-canvas-muted' : 'text-canvas-muted-deep';
    const cardBg = isDarkMode ? 'bg-white/[0.06]' : 'bg-gray-50';

    const createWorkflow = () => {
        const newWorkflow: Workflow = {
            id: crypto.randomUUID(),
            name: `Workflow ${workflows.length + 1}`,
            trigger: 'manual',
            steps: [],
        };
        setWorkflows(prev => [...prev, newWorkflow]);
        setEditing(newWorkflow);
    };

    const addStep = (type: WorkflowStep['type']) => {
        if (!editing) return;
        const template = STEP_TEMPLATES.find(t => t.type === type);
        if (!template) return;
        const step: WorkflowStep = {
            id: crypto.randomUUID(),
            type,
            name: template.label,
            config: { ...template.defaultConfig },
            enabled: true,
        };
        const updated = { ...editing, steps: [...editing.steps, step] };
        setEditing(updated);
        setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    };

    const removeStep = (stepId: string) => {
        if (!editing) return;
        const updated = { ...editing, steps: editing.steps.filter(s => s.id !== stepId) };
        setEditing(updated);
        setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    };

    const runWorkflow = async (workflow: Workflow) => {
        if (!projectId) return;
        setRunning(workflow.id);
        setRunOutput(null);
        const results: { step: string; status: string; output: string }[] = [];

        for (const step of workflow.steps.filter(s => s.enabled)) {
            try {
                const res = await fetch(`/api/agent-ops/${projectId}/execute`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: `${step.type}: ${step.name} — ${JSON.stringify(step.config)}` }),
                });
                const data = await res.json();
                results.push({
                    step: step.name,
                    status: res.ok ? 'success' : 'failed',
                    output: data.result || data.error || 'Completed',
                });
                if (!res.ok) break;
            } catch (err) {
                results.push({ step: step.name, status: 'failed', output: String(err) });
                break;
            }
        }

        setRunOutput({ workflowId: workflow.id, results });
        setWorkflows(prev => prev.map(w => w.id === workflow.id ? {
            ...w,
            lastRun: new Date().toISOString(),
            lastStatus: results.every(r => r.status === 'success') ? 'success' : 'failed',
        } : w));
        setRunning(null);
    };

    const statusColors: Record<string, string> = {
        success: 'text-emerald-400',
        failed: 'text-primary-400',
        running: 'text-amber-400 animate-pulse',
    };

    return (
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-canvas-card text-canvas-text' : 'bg-white text-gray-800'}`}>
            <div className={`p-4 border-b ${border}`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                        {editing ? 'Edit Workflow' : 'Workflows'}
                    </h2>
                    {editing ? (
                        <button onClick={() => setEditing(null)} className="text-xs text-canvas-muted hover:text-cyan-400">← Back</button>
                    ) : (
                        <button onClick={createWorkflow} className="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all">+ New</button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                {!projectId ? (
                    <div className={`text-center py-8 ${subtext}`}>
                        <p className="text-2xl mb-2">⚡</p>
                        <p className="text-xs">Open a project to create workflows</p>
                    </div>
                ) : editing ? (
                    <>
                        {/* Workflow name & trigger */}
                        <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                            <label className={`text-[10px] ${subtext} block mb-1`}>Workflow Name</label>
                            <input type="text" value={editing.name} onChange={e => {
                                const updated = { ...editing, name: e.target.value };
                                setEditing(updated);
                                setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
                            }} className={`w-full px-2 py-1.5 text-xs rounded border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text' : 'bg-white text-gray-800'} focus:outline-none focus:border-cyan-500/50`} />
                            <label className={`text-[10px] ${subtext} block mt-2 mb-1`}>Trigger</label>
                            <select value={editing.trigger} onChange={e => {
                                const updated = { ...editing, trigger: e.target.value as Workflow['trigger'] };
                                setEditing(updated);
                                setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
                            }} className={`w-full px-2 py-1.5 text-xs rounded border ${border} ${isDarkMode ? 'bg-white/[0.08] text-canvas-text' : 'bg-white text-gray-800'}`}>
                                <option value="manual">Manual</option>
                                <option value="on-save">On Save</option>
                                <option value="on-commit">On Commit</option>
                                <option value="scheduled">Scheduled</option>
                            </select>
                        </div>

                        {/* Steps */}
                        <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                            <h3 className="text-xs font-medium mb-2">Steps ({editing.steps.length})</h3>
                            {editing.steps.map((step, i) => (
                                <div key={step.id} className={`flex items-center gap-2 p-2 rounded border ${border} mb-1.5 ${step.enabled ? '' : 'opacity-50'}`}>
                                    <span className="text-sm">{STEP_TEMPLATES.find(t => t.type === step.type)?.icon || '⚙️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs truncate">{i + 1}. {step.name}</p>
                                        <p className={`text-[9px] ${subtext} truncate`}>{Object.entries(step.config).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
                                    </div>
                                    <button onClick={() => {
                                        const updated = { ...editing, steps: editing.steps.map(s => s.id === step.id ? { ...s, enabled: !s.enabled } : s) };
                                        setEditing(updated);
                                        setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
                                    }} className={`text-[10px] ${step.enabled ? 'text-emerald-400' : 'text-canvas-muted-deep'}`}>
                                        {step.enabled ? '●' : '○'}
                                    </button>
                                    <button onClick={() => removeStep(step.id)} className="text-xs text-canvas-muted-deep hover:text-primary-400">✕</button>
                                </div>
                            ))}
                        </div>

                        {/* Add Step */}
                        <div className={`p-3 rounded-lg border ${border} ${cardBg}`}>
                            <h3 className="text-xs font-medium mb-2">Add Step</h3>
                            <div className="grid grid-cols-2 gap-1.5">
                                {STEP_TEMPLATES.map(t => (
                                    <button key={t.type} onClick={() => addStep(t.type)}
                                        className={`p-2 text-xs rounded border ${border} hover:border-cyan-500/30 transition-all flex items-center gap-1.5`}>
                                        <span>{t.icon}</span> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Workflow list */
                    workflows.length === 0 ? (
                        <div className={`text-center py-8 ${subtext}`}>
                            <p className="text-2xl mb-2">⚡</p>
                            <p className="text-xs">No workflows yet</p>
                            <p className="text-[10px] mt-1">Create automated build & deploy pipelines</p>
                        </div>
                    ) : workflows.map(w => (
                        <div key={w.id} className={`p-3 rounded-lg border ${border} ${cardBg} group`}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-medium truncate">{w.name}</h3>
                                        {w.lastStatus && <span className={`text-[9px] ${statusColors[w.lastStatus]}`}>● {w.lastStatus}</span>}
                                    </div>
                                    <p className={`text-[10px] ${subtext}`}>{w.steps.length} steps · Trigger: {w.trigger}</p>
                                    {w.lastRun && <p className={`text-[9px] ${subtext}`}>Last run: {new Date(w.lastRun).toLocaleString()}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => runWorkflow(w)} disabled={running === w.id}
                                        className="p-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 disabled:opacity-50">
                                        {running === w.id ? '⏳' : '▶'}
                                    </button>
                                    <button onClick={() => setEditing(w)} className="p-1.5 text-xs text-canvas-muted hover:text-cyan-400 rounded hover:bg-cyan-500/10">✎</button>
                                    <button onClick={() => setWorkflows(prev => prev.filter(x => x.id !== w.id))} className="p-1.5 text-xs text-canvas-muted-deep hover:text-primary-400 rounded hover:bg-primary-500/10">✕</button>
                                </div>
                            </div>

                            {/* Run output */}
                            {runOutput?.workflowId === w.id && (
                                <div className={`mt-2 p-2 rounded border ${border} ${isDarkMode ? 'bg-black/30' : 'bg-gray-100'}`}>
                                    {runOutput.results.map((r, i) => (
                                        <div key={i} className="flex items-start gap-1.5 text-[10px] py-0.5">
                                            <span className={r.status === 'success' ? 'text-emerald-400' : 'text-primary-400'}>{r.status === 'success' ? '✓' : '✗'}</span>
                                            <span className="font-medium">{r.step}</span>
                                            <span className={subtext}>— {r.output}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
