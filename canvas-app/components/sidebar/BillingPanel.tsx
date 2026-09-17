/**
 * BillingPanel — Subscription & billing info in the left sidebar
 * Shows plan details, usage, invoices, and navigation links to
 * the main Maula AI subscription/billing pages.
 */
import React, { useEffect, useState } from 'react';
import {
    Crown,
    ExternalLink,
    CreditCard,
    Receipt,
    TrendingUp,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    HardDrive,
    Cpu,
    LayoutDashboard,
} from 'lucide-react';
import billingService from '../../services/billingService';

interface PlanData {
    name: string;
    tier: string;
    status: string;
    type?: string;
    expiresAt?: string;
    isYearly?: boolean;
}

interface InvoiceItem {
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    description: string;
}

interface BillingPanelProps {
    authUser?: { id: string; email: string } | null;
}

const MAULA_BASE = 'https://maula.ai';

const BillingPanel: React.FC<BillingPanelProps> = ({ authUser }) => {
    const [planData, setPlanData] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'plan' | 'invoices'>('plan');
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);

    const loadPlan = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const result = await billingService.checkPlan();
            if (result.success && result.plan) {
                const p = result.plan;
                // Normalize API response: backend returns `type`/`expiryDate`/`hasAccess`
                // but the panel expects `tier`/`expiresAt`/`status`.
                setPlanData({
                    ...p,
                    tier: p.tier || p.type || 'free',
                    name: p.name || p.type || '',
                    status: result.hasAccess ? 'active' : 'inactive',
                    expiresAt: p.expiresAt || p.expiryDate || null,
                });
            }
        } catch (_) { }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadPlan(); }, []);

    // Load invoices when tab switches
    useEffect(() => {
        if (tab === 'invoices' && invoices.length === 0 && !invoicesLoading) {
            (async () => {
                setInvoicesLoading(true);
                try {
                    const res = await billingService.getInvoices?.();
                    if (res?.success && res.invoices) setInvoices(res.invoices);
                } catch { } finally { setInvoicesLoading(false); }
            })();
        }
    }, [tab]);

    const planTier = planData?.tier || planData?.type || 'free';
    const planName = planData?.name || (planTier === 'free' ? 'Free' : planTier.charAt(0).toUpperCase() + planTier.slice(1));
    const isActive = planData?.status === 'active';
    const expiryDate = planData?.expiresAt ? new Date(planData.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

    // Real usage fetched from backend
    const [usageData, setUsageData] = useState<{ storageMB: number; fileCount: number }>({ storageMB: 0, fileCount: 0 });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/canvas/files/storage/usage', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUsageData({ storageMB: data.usage?.megabytes || 0, fileCount: data.usage?.fileCount || 0 });
                    }
                }
            } catch (_) { /* silent */ }
        })();
    }, []);

    // Plan limits from backend plan data, with sensible defaults by tier
    const planLimits = (planData as Record<string, unknown>) || {};
    const storageLimitMB = Number(planLimits.storageLimitMB || planLimits.storageLimit) || (planTier === 'pro' ? 10000 : planTier === 'starter' ? 2000 : 500);
    const fileLimitCount = Number(planLimits.fileLimitCount || planLimits.fileLimit) || (planTier === 'pro' ? 5000 : planTier === 'starter' ? 500 : 100);
    const usageMetrics = [
        { label: 'Storage', used: Math.round(usageData.storageMB), limit: storageLimitMB, icon: HardDrive, color: 'text-amber-400', bar: 'from-amber-500 to-orange-500' },
        { label: 'Files', used: usageData.fileCount, limit: fileLimitCount, icon: Cpu, color: 'text-emerald-400', bar: 'from-emerald-500 to-teal-500' },
    ];

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-canvas-muted-deep animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* ── Navigation Links ─────────────────────────────── */}
            <div className="p-3 border-b border-canvas-border space-y-1.5">
                <p className="text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-2">Navigate</p>
                <a
                    href={`${MAULA_BASE}/overview/pricing`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-canvas-border hover:bg-primary-500/10 hover:border-primary-500/25 hover:text-primary-300 text-canvas-text transition-all group w-full text-left"
                >
                    <div className="w-6 h-6 rounded-md bg-primary-500/15 flex items-center justify-center shrink-0">
                        <Crown className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Subscription</p>
                        <p className="text-[10px] text-canvas-muted-deep">View & upgrade plans</p>
                    </div>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </a>
                <a
                    href={`${MAULA_BASE}/dashboard/billing`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-canvas-border hover:bg-primary-500/10 hover:border-primary-500/25 hover:text-primary-300 text-canvas-text transition-all group w-full text-left"
                >
                    <div className="w-6 h-6 rounded-md bg-primary-500/15 flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Billing Dashboard</p>
                        <p className="text-[10px] text-canvas-muted-deep">Invoices, history & settings</p>
                    </div>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </a>
            </div>

            {/* ── Tab bar ──────────────────────────────────────── */}
            <div className="flex gap-0.5 p-2 border-b border-canvas-border">
                {(['plan', 'invoices'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize ${tab === t ? 'bg-primary-500/15 text-primary-300' : 'text-canvas-muted-deep hover:text-canvas-text hover:bg-white/[0.04]'}`}
                    >
                        {t === 'plan' ? 'Plan & Usage' : 'Invoices'}
                    </button>
                ))}
                <button
                    onClick={() => loadPlan(true)}
                    disabled={refreshing}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-canvas-muted hover:bg-white/[0.04] transition-all"
                    title="Refresh"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {tab === 'plan' && (
                <div className="p-3 space-y-3">
                    {/* Current Plan Card */}
                    <div className="rounded-xl border border-canvas-border bg-canvas-card overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-canvas-border">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planTier === 'free' ? 'bg-gray-500/15' : 'bg-gradient-to-br from-primary-600/25 to-amber-500/20'}`}>
                                    <Crown className={`w-4 h-4 ${planTier === 'free' ? 'text-canvas-muted' : 'text-amber-400'}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-200">{planName}</p>
                                    <p className="text-[10px] text-canvas-muted-deep capitalize">{planTier} tier</p>
                                </div>
                            </div>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-canvas-muted border-gray-500/20'}`}>
                                {isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            {authUser?.email && (
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-canvas-muted-deep">Account</span>
                                    <span className="text-canvas-text truncate max-w-[160px]">{authUser.email}</span>
                                </div>
                            )}
                            {expiryDate && (
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-canvas-muted-deep flex items-center gap-1"><Calendar className="w-3 h-3" />Renews</span>
                                    <span className="text-canvas-text">{expiryDate}</span>
                                </div>
                            )}
                            {planData?.isYearly && (
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-canvas-muted-deep">Billing</span>
                                    <span className="text-emerald-400 font-medium">Yearly • Best Value</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Usage Metrics */}
                    <div>
                        <p className="text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest mb-2 px-0.5">This Month's Usage</p>
                        <div className="space-y-2.5">
                            {usageMetrics.map(m => {
                                const Icon = m.icon;
                                const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
                                const nearLimit = pct >= 80;
                                return (
                                    <div key={m.label} className="rounded-lg border border-canvas-border bg-canvas-card p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                                                <span className="text-[11px] text-canvas-text">{m.label}</span>
                                            </div>
                                            <span className={`text-[10px] font-semibold ${nearLimit ? 'text-amber-400' : 'text-canvas-muted'}`}>
                                                {m.used} / {m.limit >= 1000 ? `${m.limit / 1000}K` : m.limit}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${nearLimit ? 'from-amber-500 to-primary-500' : m.bar} transition-all`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        {nearLimit && (
                                            <p className="text-[10px] text-amber-400/80 mt-1">
                                                {100 - pct}% remaining — consider upgrading
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upgrade CTA (only for free / near-limit) */}
                    {planTier === 'free' && (
                        <a
                            href={`${MAULA_BASE}/overview/pricing`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white text-xs font-semibold transition-all shadow-lg shadow-primary-900/30"
                        >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Upgrade to Pro
                            <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                    )}
                </div>
            )}

            {tab === 'invoices' && (
                <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-canvas-muted-deep uppercase tracking-widest">Invoice History</p>
                        <a
                            href={`${MAULA_BASE}/dashboard/billing`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            View all <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>

                    <div className="space-y-2">
                        {invoicesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-4 h-4 text-canvas-muted-deep animate-spin" />
                            </div>
                        ) : invoices.length > 0 ? (
                            invoices.map(inv => (
                                <div key={inv.id} className="rounded-lg border border-canvas-border bg-canvas-card p-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${inv.status === 'paid' ? 'bg-emerald-500/10' : inv.status === 'failed' ? 'bg-primary-500/10' : 'bg-amber-500/10'}`}>
                                            <Receipt className={`w-3.5 h-3.5 ${inv.status === 'paid' ? 'text-emerald-400' : inv.status === 'failed' ? 'text-primary-400' : 'text-amber-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-200 font-medium">{inv.description}</p>
                                            <p className="text-[10px] text-canvas-muted-deep">{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-gray-200">${(inv.amount / 100).toFixed(2)}</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${inv.status === 'paid' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : inv.status === 'failed' ? 'text-primary-400 bg-primary-500/10 border-primary-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                                                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <>
                                {planData && isActive && (
                                    <div className="rounded-lg border border-canvas-border bg-canvas-card p-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-200 font-medium">{planName}</p>
                                                <p className="text-[10px] text-canvas-muted-deep">Current period</p>
                                            </div>
                                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="text-center py-6">
                                    <CreditCard className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                    <p className="text-[11px] text-canvas-muted-deep">Full invoice history available on</p>
                                    <a
                                        href={`${MAULA_BASE}/dashboard/billing`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
                                    >
                                        Billing Dashboard ↗
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPanel;
