'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  Globe,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Search,
  AlertCircle,
  Rocket,
  Clock,
  HardDrive,
  FileCode2,
  BarChart3,
  CreditCard,
  Shield,
  Zap,
  Crown,
  ChevronDown,
  ChevronUp,
  History,
  Eye,
} from 'lucide-react';

interface DeployedSite {
  slug: string;
  url: string;
  fileCount?: number;
  totalSize?: number;
  lastModified?: string;
  status?: string;
}

interface DeployHistory {
  id: string;
  platform: string;
  projectName: string;
  url?: string;
  status: string;
  error?: string;
  createdAt: string;
}

const HOSTING_PLANS = {
  weekly: {
    name: 'Weekly',
    price: 7,
    period: 'week',
    sites: 10,
    storage: 500 * 1024 * 1024,
    bandwidth: '50 GB/mo',
    customDomain: false,
    ssl: true,
    analytics: true,
    priority: false,
    icon: Globe,
  },
  monthly: {
    name: 'Monthly',
    price: 19,
    period: 'month',
    sites: 50,
    storage: 2 * 1024 * 1024 * 1024,
    bandwidth: '200 GB/mo',
    customDomain: true,
    ssl: true,
    analytics: true,
    priority: true,
    icon: Zap,
    popular: true,
  },
  yearly: {
    name: 'Yearly',
    price: 120,
    period: 'year',
    sites: 100,
    storage: 10 * 1024 * 1024 * 1024,
    bandwidth: 'Unlimited',
    customDomain: true,
    ssl: true,
    analytics: true,
    priority: true,
    icon: Crown,
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

export default function DeployedSitesPage() {
  const { state } = useAuth();
  const [sites, setSites] = useState<DeployedSite[]>([]);
  const [deployHistory, setDeployHistory] = useState<DeployHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sites' | 'history'>('sites');
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [currentPlanKey, setCurrentPlanKey] = useState<'weekly' | 'monthly' | 'yearly' | null>(null);

  // Fetch user's canvas/hosting subscription plan (not agent subscriptions)
  useEffect(() => {
    const fetchPlan = async () => {
      if (!state.user?.id) return;
      try {
        const res = await fetch(`/api/gencraft/studio-plan`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.hasAccess && data.plan) {
            const planType = data.plan.type || 'weekly';
            if (planType === 'yearly' || planType === 'annual' || planType === 'pro_yearly') setCurrentPlanKey('yearly');
            else if (planType === 'monthly' || planType === 'pro_monthly') setCurrentPlanKey('monthly');
            else setCurrentPlanKey('weekly');
          }
          // else leave null — no active hosting plan
        }
      } catch (err) {
        console.error('Failed to fetch hosting plan:', err);
      }
    };
    fetchPlan();
  }, [state.user?.id]);

  const currentPlan = currentPlanKey ? HOSTING_PLANS[currentPlanKey] : null;
  const totalStorage = sites.reduce((sum, s) => sum + (s.totalSize || 0), 0);
  const maxSites = currentPlan?.sites || 1;
  const maxStorage = currentPlan?.storage || 1;
  const storagePercent = currentPlan ? Math.min((totalStorage / maxStorage) * 100, 100) : 0;
  const sitesPercent = currentPlan ? Math.min((sites.length / maxSites) * 100, 100) : 0;

  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/canvas/deployments', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deployed sites');
      const data = await response.json();
      setSites(data.deployments || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/canvas/deploy/history', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDeployHistory(data.history || []);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (state.user) {
      fetchSites();
      fetchHistory();
    }
  }, [state.user, fetchSites, fetchHistory]);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete ${slug}.maula.ai permanently? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      const response = await fetch(`/api/canvas/deploy/${slug}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete site');
      setSites(sites.filter(s => s.slug !== slug));
    } catch {
      alert('Failed to delete site. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredSites = sites.filter(site =>
    site.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
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
                  <span className="inline-flex items-center gap-3" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hosting Dashboard</span>
                </h1>
                <p className="text-gray-400 text-lg">Manage your deployed sites and hosting plan</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl font-semibold transition-all"
                >
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  Billing
                </Link>
                <Link
                  href="https://canvas.maula.ai"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20"
                >
                  <Rocket className="w-5 h-5" />
                  Create New Site
                </Link>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Active Sites</span>
              </div>
              <p className="text-2xl font-bold text-white">{sites.length}<span className="text-sm text-gray-500 ml-1">/ {maxSites}</span></p>
              <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all" style={{ width: `${sitesPercent}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-400">Storage Used</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatBytes(totalStorage)}<span className="text-sm text-gray-500 ml-1">/ {formatBytes(maxStorage)}</span></p>
              <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${storagePercent > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'}`} style={{ width: `${storagePercent}%` }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">SSL / HTTPS</span>
              </div>
              <p className="text-2xl font-bold text-green-400">Active</p>
              <p className="text-xs text-gray-500 mt-2">All sites secured</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-400">Domain</span>
              </div>
              <p className="text-xl font-bold text-purple-400">*.maula.ai</p>
              <p className="text-xs text-gray-500 mt-2">Global CDN delivery</p>
            </div>
          </div>

          {/* Current Plan Card */}
          {currentPlan ? (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 via-white/[0.02] to-cyan-900/20 border border-purple-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <currentPlan.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{currentPlan.name} Plan</h3>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full">Current</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {currentPlan.sites} sites &bull; {formatBytes(currentPlan.storage)} storage &bull; {currentPlan.bandwidth} bandwidth &bull; {currentPlan.ssl ? 'SSL included' : 'No SSL'}
                    </p>
                    {'savings' in currentPlan && currentPlan.savings && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">{currentPlan.savings}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <div className="flex items-baseline gap-2 justify-end">
                      {'originalPrice' in currentPlan && (
                        <span className="text-lg text-gray-500 line-through">${currentPlan.originalPrice}</span>
                      )}
                      <p className="text-2xl font-bold text-white">
                        ${currentPlan.price}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">/{currentPlan.period}</p>
                    {'discount' in currentPlan && currentPlan.discount && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">{currentPlan.discount}</span>
                    )}
                  </div>
                  <Link
                    href="/dashboard/billing"
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
                  >
                    Manage Plan
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Custom Domains', available: currentPlan.customDomain },
                  { label: 'Site Analytics', available: currentPlan.analytics },
                  { label: 'Priority Support', available: currentPlan.priority },
                  { label: 'Auto SSL/HTTPS', available: currentPlan.ssl },
                ].map(feat => (
                  <div key={feat.label} className="flex items-center gap-2 text-sm">
                    {feat.available ? (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                    )}
                    <span className={feat.available ? 'text-gray-300' : 'text-gray-600'}>{feat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-gray-900/40 via-white/[0.02] to-gray-900/40 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gray-500/20">
                    <Globe className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">No Active Plan</h3>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 rounded-full">Inactive</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Subscribe to a hosting plan to deploy and manage your sites
                    </p>
                  </div>
                </div>
                <Link
                  href="/overview/pricing"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
                >
                  Subscribe Now
                </Link>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06] w-fit">
            {([
              { key: 'sites' as const, label: 'My Sites', icon: Globe, count: sites.length },
              { key: 'history' as const, label: 'Deploy History', icon: History, count: deployHistory.length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                  ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-700/50 text-gray-500'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ========== SITES TAB ========== */}
          {activeTab === 'sites' && (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search deployed sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <button
                  onClick={() => { setLoading(true); fetchSites(); }}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                  <p className="text-gray-400">Loading your deployed sites...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-red-400 mb-2">{error}</p>
                  <button onClick={() => { setLoading(true); fetchSites(); }} className="text-purple-400 hover:text-purple-300">
                    Try again
                  </button>
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
                    <Globe className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {searchQuery ? 'No sites found' : 'No deployed sites yet'}
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-md">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Build your first website with AI in Canvas Studio and deploy it here.'}
                  </p>
                  {!searchQuery && (
                    <Link href="https://canvas.maula.ai" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors">
                      <Rocket className="w-5 h-5" />
                      Create Your First Site
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSites.map((site) => (
                    <div key={site.slug} className="group">
                      <div
                        className={`relative p-5 rounded-2xl bg-white/[0.03] border transition-all overflow-hidden cursor-pointer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${expandedSite === site.slug ? 'border-purple-500/40' : 'border-white/[0.06] hover:border-purple-500/30'
                          }`}
                        onClick={() => setExpandedSite(expandedSite === site.slug ? null : site.slug)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-white text-lg truncate">{site.slug}</h3>
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {site.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            {site.fileCount !== undefined && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-lg">
                                <FileCode2 className="w-3 h-3" />
                                {site.fileCount} files
                              </span>
                            )}
                            {site.totalSize !== undefined && site.totalSize > 0 && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-lg">
                                <HardDrive className="w-3 h-3" />
                                {formatBytes(site.totalSize)}
                              </span>
                            )}
                            {site.lastModified && (
                              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-lg">
                                <Clock className="w-3 h-3" />
                                {formatDate(site.lastModified)}
                              </span>
                            )}

                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              Live
                            </span>

                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyUrl(site.url); }}
                                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                                title="Copy URL"
                              >
                                {copiedUrl === site.url ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                              </button>
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
                                title="Visit Site"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="w-4 h-4 text-purple-400" />
                              </a>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(site.slug); }}
                                disabled={deleting === site.slug}
                                className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/20 border border-white/[0.08] hover:border-red-500/30 transition-colors"
                                title="Delete Site"
                              >
                                {deleting === site.slug ? <RefreshCw className="w-4 h-4 text-red-400 animate-spin" /> : <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />}
                              </button>
                            </div>

                            <button className="p-1 text-gray-500">
                              {expandedSite === site.slug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {expandedSite === site.slug && (
                          <div className="mt-4 pt-4 border-t border-white/[0.04] grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Full URL</p>
                              <p className="text-sm text-purple-400 truncate">{site.url}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Files</p>
                              <p className="text-sm text-white">{site.fileCount ?? 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Size</p>
                              <p className="text-sm text-white">{site.totalSize ? formatBytes(site.totalSize) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Last Deploy</p>
                              <p className="text-sm text-white">{site.lastModified ? formatDate(site.lastModified) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">SSL</p>
                              <p className="text-sm text-green-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Active</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">CDN</p>
                              <p className="text-sm text-green-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Global</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Status</p>
                              <p className="text-sm text-green-400">Live</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Actions</p>
                              <Link
                                href="https://canvas.maula.ai"
                                className="text-xs px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors inline-block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Edit in Studio
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ========== HISTORY TAB ========== */}
          {activeTab === 'history' && (
            <div>
              {deployHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No deploy history yet</h3>
                  <p className="text-gray-400">Your deployment history will appear here after your first deploy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deployHistory.map((entry) => (
                    <div key={entry.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.status === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            {entry.status === 'success' ? (
                              <Check className="w-5 h-5 text-green-400" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{entry.projectName}</h4>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                              <span className="capitalize">{entry.platform}</span>
                              <span>&bull;</span>
                              <span>{formatDate(entry.createdAt)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${entry.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {entry.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                          {entry.url && (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                              Visit <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      {entry.error && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-400">{entry.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Help Section */}
          <div className="mt-12 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <h3 className="font-semibold text-white mb-3">💡 Tips</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• All sites include automatic HTTPS/SSL and global CDN delivery</li>
              <li>• Use <Link href="https://canvas.maula.ai" className="text-purple-400 hover:text-purple-300 underline">Canvas Studio</Link> to build and deploy multi-page apps with AI</li>
              <li>• Redeploy to the same URL to update your site instantly</li>
              <li>• Upgrade to Pro for custom domains and site analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
