'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, CheckCircle, XCircle, Clock, ArrowRight, RefreshCw, AlertTriangle, Sparkles, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AgentSubscription {
  id: string;
  agentId: string;
  agentName: string;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
}

interface CanvasSubscription {
  id: string;
  app: 'gencraft-pro' | 'canvas-studio';
  appLabel: string;
  plan: string;
  status: string;
  price: number;
  startDate: string;
  expiryDate: string;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

function BillingContent() {
  const { state } = useAuth();
  const searchParams = useSearchParams();
  const justPurchased = searchParams.get('justPurchased') === 'true';
  const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
  const [canvasSubs, setCanvasSubs] = useState<CanvasSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<AgentSubscription | null>(null);
  const [selectedCanvasSub, setSelectedCanvasSub] = useState<CanvasSubscription | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!state.user?.id) return;

    try {
      setError('');
      setLoading(true);

      // Fetch agent subscriptions AND canvas subscriptions in parallel
      const [agentRes, canvasRes] = await Promise.allSettled([
        fetch(`/api/agent/subscriptions/user/${state.user.id}`, { credentials: 'include' }),
        fetch(`/api/canvas-subscriptions/${state.user.id}`, { credentials: 'include' }),
      ]);

      if (agentRes.status === 'fulfilled' && agentRes.value.ok) {
        const result = await agentRes.value.json();
        setSubscriptions(result.subscriptions || []);
      }

      if (canvasRes.status === 'fulfilled' && canvasRes.value.ok) {
        const result = await canvasRes.value.json();
        setCanvasSubs(result.subscriptions || []);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Error loading subscription data');
    } finally {
      setLoading(false);
    }
  }, [state.user?.id]);

  // Initial load
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Refresh when returning from payment success
  useEffect(() => {
    if (justPurchased) {
      setLoading(true);
      fetchSubscriptions();
    }
  }, [justPurchased, fetchSubscriptions]);

  const handleCancelClick = (sub: AgentSubscription) => {
    setSelectedSub(sub);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedSub) return;

    setCancellingId(selectedSub.id);
    setShowCancelModal(false);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: selectedSub.id,
          userId: state.user?.id,
          agentId: selectedSub.agentId,
          immediate: true,
        }),
      });

      if (response.ok) {
        await fetchSubscriptions();
      } else {
        const errorData = await response.json();
        alert(errorData.error || errorData.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('Error cancelling subscription. Please try again.');
    } finally {
      setCancellingId(null);
      setSelectedSub(null);
    }
  };

  const handleCanvasCancel = (sub: CanvasSubscription) => {
    setSelectedCanvasSub(sub);
    setShowCancelModal(true);
  };

  const handleConfirmCanvasCancel = async () => {
    if (!selectedCanvasSub) return;

    setCancellingId(selectedCanvasSub.id);
    setShowCancelModal(false);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: selectedCanvasSub.id,
          userId: state.user?.id,
          agentId: selectedCanvasSub.app,
          immediate: true,
        }),
      });

      if (response.ok) {
        await fetchSubscriptions();
      } else {
        const errorData = await response.json();
        alert(errorData.error || errorData.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling canvas subscription:', err);
      alert('Error cancelling subscription. Please try again.');
    } finally {
      setCancellingId(null);
      setSelectedCanvasSub(null);
    }
  };

  // Calculate stats — agents + canvas combined
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(
    (s) => s.status === 'expired' || s.status === 'cancelled'
  );
  const activeCanvasSubs = canvasSubs.filter((s) => s.status === 'active' && s.expiryDate && new Date(s.expiryDate) > new Date());
  const inactiveCanvasSubs = canvasSubs.filter((s) => s.status !== 'active' || !s.expiryDate || new Date(s.expiryDate) <= new Date());
  const totalActive = activeSubscriptions.length + activeCanvasSubs.length;
  const totalInactive = inactiveSubscriptions.length + inactiveCanvasSubs.length;
  const agentSpent = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
  const canvasSpent = canvasSubs.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalSpent = agentSpent + canvasSpent;

  // All purchases sorted by date for the purchase history table
  const allPurchases = [
    ...subscriptions.map(s => ({
      id: s.id,
      name: s.agentName || s.agentId,
      app: 'AI Agent' as string,
      plan: s.plan,
      price: s.price,
      status: s.status,
      startDate: s.startDate,
      expiryDate: s.expiryDate,
    })),
    ...canvasSubs.map(s => ({
      id: s.id,
      name: s.appLabel,
      app: s.appLabel,
      plan: s.plan,
      price: s.price,
      status: s.status,
      startDate: s.startDate,
      expiryDate: s.expiryDate,
    })),
  ].sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());

  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diff);
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return plan;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'daily':
        return 'bg-blue-500/20 text-blue-400';
      case 'weekly':
        return 'bg-purple-500/20 text-purple-400';
      case 'monthly':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-white/5 text-gray-300';
    }
  };

  const getCanvasPlanLabel = (plan: string, price: number) => {
    const cleanPlan = plan?.replace('pro_', '').replace('_', ' ');
    return `$${price}/${cleanPlan || 'plan'}`;
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center relative p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
          <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-white/[0.06] rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-white/[0.06] rounded-bl-lg" />
          <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Please log in to view billing</span>
          </h1>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold transition-all hover:shadow-lg shadow-cyan-500/25"
          >
            Log In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
      {/* Background gradient orbs - Legal page theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (selectedSub || selectedCanvasSub) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative p-8 max-w-md w-full rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-2xl overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-red-500/30 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-red-500/30 rounded-bl-lg" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cancel Access?</h3>
              <p className="text-gray-400">
                Are you sure you want to cancel access to{' '}
                <span className="text-white font-semibold">
                  {selectedSub ? (selectedSub.agentName || selectedSub.agentId) : selectedCanvasSub?.appLabel}
                </span>
                ?
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">
                ⚠️ This will <strong>immediately</strong> revoke your access.
                {selectedSub
                  ? " You won't be able to chat with this agent until you purchase again."
                  : " You won't be able to use this app until you purchase again."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedSub(null);
                  setSelectedCanvasSub(null);
                }}
                className="flex-1 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium rounded-xl border border-white/[0.08] transition-colors"
              >
                Keep Access
              </button>
              <button
                onClick={selectedSub ? handleConfirmCancel : handleConfirmCanvasCancel}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
              >
                Yes, Cancel Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-black" />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + (i * 7)}%`,
                top: `${20 + (i % 4) * 18}%`,
                background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#10b981',
                opacity: 0.3
              }}
            />
          ))}
        </div>

        <div className="container-custom text-center relative z-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 mb-8">
            <CreditCard className="w-14 h-14 text-emerald-400" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent">Billing & Purchases</h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed">
            Manage all your purchases — AI Agents, GenCraft Pro, and Canvas Studio
          </p>
          <div className="w-40 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 mx-auto mb-10 rounded-full" />
          <Link
            href="/dashboard"
            className="hero-badge px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium backdrop-blur-sm hover:bg-cyan-500/20 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      {/* Billing Content */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">

          {/* Stats Cards */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-emerald-400">{totalActive}</div>
                <div className="text-sm text-gray-400">Active Plans</div>
              </div>
              <div className="text-center p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-400">{totalInactive}</div>
                <div className="text-sm text-gray-400">Expired / Cancelled</div>
              </div>
              <div className="text-center p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-purple-400">${totalSpent.toFixed(2)}</div>
                <div className="text-sm text-gray-400">Total Spent</div>
              </div>
            </div>
          </div>

          {/* Pricing Reminder — All Apps */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-lg shrink-0 mt-1">
                <span className="text-2xl">💡</span>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-white">One-Time Purchase — No Renewal, No Upgrade, No Downgrade</p>
                <p className="text-sm text-gray-400">
                  All plans are one-time purchases. When a plan expires, you can buy a new one. Cancel anytime to change duration.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🤖</span>
                      <span className="font-medium text-white">AI Agents</span>
                    </div>
                    <p className="text-gray-500">Daily • Weekly • Monthly</p>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-red-400" />
                      <span className="font-medium text-white">GenCraft Pro</span>
                    </div>
                    <p className="text-gray-500">Weekly • Monthly • Yearly</p>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="font-medium text-white">Canvas Studio</span>
                    </div>
                    <p className="text-gray-500">Weekly • Monthly • Yearly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                    Active Subscriptions ({activeSubscriptions.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {activeSubscriptions.map((sub) => {
                    const daysRemaining = getDaysRemaining(sub.expiryDate);
                    const isExpiringSoon = daysRemaining <= 3;
                    const isCancelling = cancellingId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className={`p-6 ${isExpiringSoon ? 'bg-amber-500/5' : ''}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg text-white">
                                {sub.agentName || sub.agentId}
                              </h3>
                              <span
                                className={`text-xs font-medium px-3 py-1 rounded-full ${getPlanColor(sub.plan)}`}
                              >
                                {getPlanLabel(sub.plan)}
                              </span>
                              {isExpiringSoon && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium border border-amber-500/30">
                                  ⚠️ Expiring Soon
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className={isExpiringSoon ? 'text-amber-400 font-medium' : ''}>
                                {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} days remaining`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleCancelClick(sub)}
                              disabled={isCancelling}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors border border-red-500/30 disabled:opacity-50"
                            >
                              {isCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                            <a
                              href={`https://${sub.agentId}-chat.maula.ai/${sub.id}`}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                              Chat Now
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Inactive Subscriptions */}
          {inactiveSubscriptions.length > 0 && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-gray-400 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                    Inactive Subscriptions ({inactiveSubscriptions.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {inactiveSubscriptions.map((sub) => (
                    <div key={sub.id} className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-400">
                              {sub.agentName || sub.agentId}
                            </h3>
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/[0.04] text-gray-500 border border-white/[0.06]">
                              {getPlanLabel(sub.plan)}
                            </span>
                            <span
                              className={`text-xs font-medium px-3 py-1 rounded-full ${sub.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                                }`}
                            >
                              {sub.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {sub.status === 'cancelled' ? 'Cancelled' : 'Expired'}:{' '}
                            {new Date(sub.expiryDate).toLocaleDateString()}
                          </div>
                        </div>

                        <Link
                          href={
                            sub.agentId === 'canvas-studio'
                              ? 'https://maula.ai/overview/studio'
                              : `https://maula.ai/subscribe?agent=${encodeURIComponent(sub.agentName || sub.agentId)}&slug=${sub.agentId}`
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Purchase Again
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Canvas App Subscriptions (GenCraft Pro + Canvas Studio) ─── */}
          {activeCanvasSubs.length > 0 && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    Active Canvas Plans ({activeCanvasSubs.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {activeCanvasSubs.map((sub) => {
                    const daysRemaining = getDaysRemaining(sub.expiryDate);
                    const isExpiringSoon = daysRemaining <= 3;
                    return (
                      <div key={sub.id} className={`p-6 ${isExpiringSoon ? 'bg-amber-500/5' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {sub.app === 'gencraft-pro' ? <Sparkles className="w-5 h-5 text-red-400" /> : <Layers className="w-5 h-5 text-cyan-400" />}
                              <h3 className="font-bold text-lg text-white">{sub.appLabel}</h3>
                              <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-500/20 text-red-400">
                                {getCanvasPlanLabel(sub.plan, sub.price)}
                              </span>
                              {isExpiringSoon && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium border border-amber-500/30">
                                  ⚠️ Expiring Soon
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              {sub.startDate && <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>}
                              <span>•</span>
                              <span className={isExpiringSoon ? 'text-amber-400 font-medium' : ''}>
                                {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} days remaining`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleCanvasCancel(sub)}
                              disabled={cancellingId === sub.id}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors border border-red-500/30 disabled:opacity-50"
                            >
                              {cancellingId === sub.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                            <Link
                              href={sub.app === 'gencraft-pro' ? 'https://canvas.maula.ai' : 'https://studio.maula.ai'}
                              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                              Open {sub.app === 'gencraft-pro' ? 'GenCraft' : 'Studio'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Inactive Canvas Plans */}
          {inactiveCanvasSubs.length > 0 && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-gray-400 flex items-center gap-3">
                    <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                    Expired Canvas Plans ({inactiveCanvasSubs.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {inactiveCanvasSubs.map((sub) => (
                    <div key={sub.id} className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {sub.app === 'gencraft-pro' ? <Sparkles className="w-5 h-5 text-gray-500" /> : <Layers className="w-5 h-5 text-gray-500" />}
                            <h3 className="font-bold text-lg text-gray-400">{sub.appLabel}</h3>
                            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/[0.04] text-gray-500 border border-white/[0.06]">
                              {getCanvasPlanLabel(sub.plan, sub.price)}
                            </span>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${sub.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'}`}>
                              {sub.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {sub.expiryDate && `${sub.status === 'cancelled' ? 'Cancelled' : 'Expired'}: ${new Date(sub.expiryDate).toLocaleDateString()}`}
                          </div>
                        </div>
                        <Link
                          href={sub.app === 'gencraft-pro' ? 'https://maula.ai/overview/pricing' : 'https://maula.ai/overview/studio'}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Purchase Again
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Purchase History Table ─── */}
          {allPurchases.length > 0 && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="p-6 border-b border-white/[0.06]">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    Purchase History ({allPurchases.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Product</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Type</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Plan</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Amount</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Date</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Expires</th>
                        <th className="text-left p-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {allPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-white font-medium">{p.name}</td>
                          <td className="p-4 text-gray-400">{p.app}</td>
                          <td className="p-4 text-gray-400 capitalize">{p.plan?.replace('pro_', '').replace('_', ' ')}</td>
                          <td className="p-4 text-white font-medium">${(p.price || 0).toFixed(2)}</td>
                          <td className="p-4 text-gray-400">{p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}</td>
                          <td className="p-4 text-gray-400">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '—'}</td>
                          <td className="p-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              p.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                'bg-white/[0.04] text-gray-400'
                              }`}>
                              {p.status === 'active' ? 'Active' : p.status === 'cancelled' ? 'Cancelled' : 'Expired'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No Subscriptions */}
          {subscriptions.length === 0 && canvasSubs.length === 0 && !error && (
            <div className="mb-8">
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
                <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🤖</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  No Purchases Yet
                </h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Purchase access to AI agents, GenCraft Pro, or Canvas Studio to get started
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/agents"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Browse Agents
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="https://canvas.maula.ai"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    GenCraft Pro
                    <Sparkles className="w-4 h-4" />
                  </Link>
                  <Link
                    href="https://studio.maula.ai"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Canvas Studio
                    <Layers className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-8">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchSubscriptions}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/agents"
                className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors group"
              >
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-medium text-white group-hover:text-purple-300 transition-colors">Browse Agents</p>
                  <p className="text-sm text-gray-500">Explore AI agents</p>
                </div>
              </Link>
              <Link
                href="/overview"
                className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-colors group"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-medium text-white group-hover:text-emerald-300 transition-colors">View Pricing</p>
                  <p className="text-sm text-gray-500">See all plans</p>
                </div>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-colors group"
              >
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">Dashboard</p>
                  <p className="text-sm text-gray-500">Back to overview</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030304] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        }>
            <BillingContent />
        </Suspense>
    );
}
