'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft,
    Layers,
    Code2,
    FolderOpen,
    Rocket,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    CreditCard,
    Globe,
    AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DashboardData {
    stats: { apps: number; projects: number; deployments: number };
    plan: {
        type: string;
        status: string;
        startDate: string;
        expiryDate: string;
        daysRemaining: number;
    } | null;
    recentApps: {
        id: string;
        prompt: string;
        language: string;
        source: string;
        deployedUrl: string | null;
        createdAt: string;
        updatedAt: string;
    }[];
    recentProjects: {
        id: string;
        name: string;
        description: string | null;
        source: string;
        createdAt: string;
        updatedAt: string;
    }[];
    recentDeployments: {
        id: string;
        platform: string;
        projectName: string;
        url: string | null;
        status: string;
        error: string | null;
        createdAt: string;
    }[];
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPlanLabel(plan: string): string {
    if (plan.includes('yearly') || plan === 'pro_yearly') return 'Yearly';
    if (plan.includes('monthly') || plan === 'pro_monthly') return 'Monthly';
    if (plan === 'weekly') return 'Weekly';
    return plan;
}

function truncatePrompt(prompt: string, maxLen = 60): string {
    if (!prompt) return 'Untitled';
    return prompt.length > maxLen ? prompt.slice(0, maxLen) + '...' : prompt;
}

function CanvasStudioDashboardContent() {
    const { state } = useAuth();
    const searchParams = useSearchParams();
    const justPurchased = searchParams.get('justPurchased') === 'true';
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDashboard = useCallback(async () => {
        if (!state.user?.id) return;
        setError('');
        try {
            const res = await fetch(`/api/canvas-studio-dashboard/${state.user.id}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to load dashboard data');
            const json = await res.json();
            if (json.success) {
                setData(json);
            } else {
                throw new Error(json.error || 'Unknown error');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [state.user?.id]);

    // Initial load
    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Refresh when returning from payment success
    useEffect(() => {
        if (justPurchased) {
            setLoading(true);
            fetchDashboard();
        }
    }, [justPurchased, fetchDashboard]);

    if (!state.user) {
        return (
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <p className="text-gray-400">Please sign in to view your Canvas Studio dashboard.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/[0.04] blur-[150px]" />
                <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
                <div className="absolute top-2/3 left-1/2 w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.02] blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-3 leading-tight">
                                <span className="inline-flex items-center gap-3" style={{ background: 'linear-gradient(to right, #ffffff, #c4b5fd, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    <Layers className="w-10 h-10 md:w-12 md:h-12" style={{ WebkitTextFillColor: 'initial', color: '#c4b5fd' }} />
                                    Canvas Studio
                                </span>
                            </h1>
                            <p className="text-gray-400 text-lg">Your AI-powered code generation workspace</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setLoading(true); fetchDashboard(); }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <Link
                                href="/dashboard/billing"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl font-semibold transition-all"
                            >
                                <CreditCard className="w-4 h-4 text-purple-400" />
                                Billing
                            </Link>
                            <a
                                href="https://studio.sanbayfusion.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/20"
                            >
                                <Layers className="w-4 h-4" />
                                Open Studio
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-32">
                        <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                            <p className="text-gray-400">Loading Canvas Studio data...</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                        <p className="text-red-400">{error}</p>
                        <button onClick={() => { setLoading(true); fetchDashboard(); }} className="px-5 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors">
                            Retry
                        </button>
                    </div>
                )}

                {/* Main Content */}
                {!loading && !error && data && (
                    <>
                        {/* Plan Status */}
                        {data.plan ? (
                            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-violet-900/20 via-white/[0.02] to-cyan-900/20 border border-violet-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-violet-500/20">
                                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-white">Active — {getPlanLabel(data.plan.type)} Plan</h3>
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full">Active</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {data.plan.daysRemaining} days remaining &bull; Expires {new Date(data.plan.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href="https://studio.sanbayfusion.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-semibold transition-all text-sm"
                                    >
                                        Continue Building
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-amber-500/20">
                                            <AlertCircle className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">No Active Plan</h3>
                                            <p className="text-sm text-gray-400 mt-1">Subscribe to Canvas Studio to start building with AI</p>
                                        </div>
                                    </div>
                                    <a
                                        href="https://studio.sanbayfusion.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-semibold transition-all text-sm"
                                    >
                                        Get Started
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-violet-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/20 transition-colors" />
                                <div className="flex items-center gap-2 mb-2">
                                    <Code2 className="w-4 h-4 text-violet-400" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Apps Created</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.apps}</p>
                                <p className="text-xs text-gray-500 mt-1">Single-file generations</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-colors" />
                                <div className="flex items-center gap-2 mb-2">
                                    <FolderOpen className="w-4 h-4 text-cyan-400" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Projects</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.projects}</p>
                                <p className="text-xs text-gray-500 mt-1">Multi-file projects</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />
                                <div className="flex items-center gap-2 mb-2">
                                    <Rocket className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Deployments</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.deployments}</p>
                                <p className="text-xs text-gray-500 mt-1">External deploys</p>
                            </div>
                        </div>

                        {/* Recent Apps */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Code2 className="w-5 h-5 text-violet-400" />
                                    Recent Apps
                                </h2>
                                {data.stats.apps > 5 && (
                                    <a
                                        href="https://studio.sanbayfusion.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                                    >
                                        View all in Studio <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {data.recentApps.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
                                    <Code2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No apps created yet</p>
                                    <a href="https://studio.sanbayfusion.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-violet-400 hover:text-violet-300">
                                        Create your first app <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.recentApps.map((app) => (
                                        <div key={app.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors group backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                                                        <Code2 className="w-4 h-4 text-violet-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{truncatePrompt(app.prompt)}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500">{app.language}</span>
                                                            <span className="text-xs text-gray-600">&bull;</span>
                                                            <span className="text-xs text-gray-500">{app.source}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {app.deployedUrl && (
                                                        <a href={app.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                                                            <Globe className="w-3 h-3" /> Live
                                                        </a>
                                                    )}
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(app.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Projects */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-cyan-400" />
                                    Recent Projects
                                </h2>
                                {data.stats.projects > 5 && (
                                    <a
                                        href="https://studio.sanbayfusion.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                                    >
                                        View all in Studio <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {data.recentProjects.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
                                    <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No projects created yet</p>
                                    <a href="https://studio.sanbayfusion.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm text-cyan-400 hover:text-cyan-300">
                                        Start a new project <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.recentProjects.map((project) => (
                                        <div key={project.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/20 transition-colors group backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="p-2 rounded-lg bg-cyan-500/10 shrink-0">
                                                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{project.name || 'Untitled Project'}</p>
                                                        {project.description && (
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">{project.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/[0.04] rounded">{project.source}</span>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(project.updatedAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Deployments */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Rocket className="w-5 h-5 text-emerald-400" />
                                    Recent Deployments
                                </h2>
                            </div>

                            {data.recentDeployments.length === 0 ? (
                                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
                                    <Rocket className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No deployments yet</p>
                                    <p className="text-xs text-gray-500 mt-1">Deploy apps from Canvas Studio to Vercel, Netlify, and more</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.recentDeployments.map((dep) => (
                                        <div key={dep.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 transition-colors backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={`p-2 rounded-lg shrink-0 ${dep.status === 'success' ? 'bg-emerald-500/10' : dep.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                                        {dep.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : dep.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{dep.projectName || 'Unnamed'}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500 capitalize">{dep.platform}</span>
                                                            {dep.error && <span className="text-xs text-red-400 truncate">{dep.error}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {dep.url && (
                                                        <a href={dep.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                                                            <Globe className="w-3 h-3" /> Visit
                                                        </a>
                                                    )}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${dep.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : dep.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {dep.status}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(dep.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Links */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <a
                                href="https://studio.sanbayfusion.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/30 transition-all group backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Layers className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-white">Open Canvas Studio</span>
                                </div>
                                <p className="text-xs text-gray-500">Full IDE with AI code generation, preview, and deploy</p>
                            </a>
                            <Link
                                href="/dashboard/billing"
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all group backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-white">Billing & Purchases</span>
                                </div>
                                <p className="text-xs text-gray-500">View your subscription, purchase history, and pricing</p>
                            </Link>
                            <Link
                                href="/dashboard/deployed-sites"
                                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all group backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Globe className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-white">Hosted Sites</span>
                                </div>
                                <p className="text-xs text-gray-500">Manage sites deployed on sanbayfusion.com hosting</p>
                            </Link>
                        </div>
                    </>
                )}

                {/* Empty State - no data at all */}
                {!loading && !error && !data && (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Layers className="w-12 h-12 text-gray-600" />
                        <p className="text-gray-400 text-lg">No Canvas Studio data found</p>
                        <a
                            href="https://studio.sanbayfusion.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-semibold transition-all"
                        >
                            <Layers className="w-4 h-4" />
                            Get Started with Canvas Studio
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CanvasStudioDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        }>
            <CanvasStudioDashboardContent />
        </Suspense>
    );
}
