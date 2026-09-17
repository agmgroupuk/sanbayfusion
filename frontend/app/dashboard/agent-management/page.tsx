'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  agentSubscriptionService,
  type AgentSubscription,
} from '@/services/agentSubscriptionService';
import { allAgents } from '@/lib/agentRegistry';
import {
  ArrowRight,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useSubscribeRedirect } from '@/hooks/useSubscribeRedirect';
import { gsap, ScrollTrigger, CustomWiggle, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, Observer);

interface AgentCardState {
  agentId: string;
  agentName: string;
  isUnlocked: boolean;
  subscription?: AgentSubscription | null;
}

type PlanType = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PLAN_LABELS: Record<PlanType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default function AgentManagementPage() {
  const { state } = useAuth();
  const user = state.user;
  const userId = user?.id;
  const [subscriptions, setSubscriptions] = useState<
    AgentSubscription[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingAgentId, setCancellingAgentId] = useState<string | null>(
    null
  );
  const redirectToSubscribe = useSubscribeRedirect();

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      if (!userId) {
        setSubscriptions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data =
          await agentSubscriptionService.getUserSubscriptions(userId);
        if (isMounted) {
          setSubscriptions(data);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load subscriptions', err);
        if (isMounted) {
          setError(
            'Unable to load subscription information. Please try again later.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSubscriptions();

    // Refresh subscriptions when page becomes visible (user returns from checkout)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        // Add a small delay to allow webhook processing
        setTimeout(() => {
          loadSubscriptions();
        }, 2000);
      }
    };

    // Also refresh when window gains focus
    const handleFocus = () => {
      if (userId) {
        // Add a small delay to allow webhook processing
        setTimeout(() => {
          loadSubscriptions();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  const activeAgentCount = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) {
      return 0;
    }
    return subscriptions.filter((sub) => sub.status === 'active').length;
  }, [subscriptions]);

  const agentStates: AgentCardState[] = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) {
      return allAgents.map((agent) => ({
        agentId: agent.id,
        agentName: agent.name,
        isUnlocked: false,
      }));
    }

    return allAgents.map((agent) => {
      const subscription = subscriptions.find(
        (sub) => sub.agentId === agent.id && sub.status === 'active'
      );
      return {
        agentId: agent.id,
        agentName: agent.name,
        isUnlocked: Boolean(subscription),
        subscription,
      };
    });
  }, [subscriptions]);

  const goToSubscribe = (
    agentId: string,
    agentName: string,
    options?: { plan?: string; intent?: 'upgrade' | 'downgrade' | 'cancel' }
  ) => {
    redirectToSubscribe({
      agentName,
      agentSlug: agentId,
      plan: options?.plan,
      intent: options?.intent,
    });
  };

  const handleCardClick = (agentId: string, agentName: string) => {
    goToSubscribe(agentId, agentName);
  };

  const handleCancelSubscription = async (
    agentId: string,
    agentName: string
  ) => {
    if (!userId) return;

    // Confirm cancellation
    if (
      !confirm(
        `Are you sure you want to cancel your subscription to ${agentName}? You will lose access immediately.`
      )
    ) {
      return;
    }

    setCancellingAgentId(agentId);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          agentId,
          immediate: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Successfully cancelled - refresh subscriptions list
      const updatedSubs =
        await agentSubscriptionService.getUserSubscriptions(userId);
      setSubscriptions(updatedSubs);

      alert(`Successfully cancelled your subscription to ${agentName}.`);
    } catch (err) {
      console.error('Cancel subscription error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to cancel subscription. Please try again.'
      );
    } finally {
      setCancellingAgentId(null);
    }
  };

  const handleChatWithAgent = (agentId: string, subscriptionId: string) => {
    // Navigate to the dedicated agent chat subdomain
    window.location.href = `https://${agentId}-chat.maula.ai/${subscriptionId}`;
  };

  const handleRefreshSubscriptions = () => {
    if (userId) {
      const loadSubscriptions = async () => {
        setIsLoading(true);
        try {
          const data =
            await agentSubscriptionService.getUserSubscriptions(userId);
          setSubscriptions(data);
          setError(null);
        } catch (err) {
          console.error('Failed to load subscriptions', err);
          setError(
            'Unable to load subscription information. Please try again later.'
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadSubscriptions();
    }
  };

  return (
    <ProtectedRoute>
      <style jsx global>{`
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(147, 51, 234, 0.25); box-shadow: 0 0 15px -3px rgba(147, 51, 234, 0.08); }
          33% { border-color: rgba(234, 88, 12, 0.2); box-shadow: 0 0 15px -3px rgba(234, 88, 12, 0.06); }
          66% { border-color: rgba(34, 197, 94, 0.2); box-shadow: 0 0 15px -3px rgba(34, 197, 94, 0.06); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .active-card {
          animation: borderGlow 6s ease-in-out infinite;
        }
        .active-badge-shimmer {
          background: linear-gradient(90deg, rgba(147,51,234,0.15) 0%, rgba(234,88,12,0.15) 33%, rgba(34,197,94,0.15) 66%, rgba(147,51,234,0.15) 100%);
          background-size: 200% 100%;
          animation: shimmer 4s linear infinite;
        }
        .active-count-glow {
          animation: borderGlow 6s ease-in-out infinite;
        }
      `}</style>
      <div className="min-h-screen bg-[#030304] text-white overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-fuchsia-500/[0.02] rounded-full blur-3xl" />
          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-pulse"
              style={{
                left: `${5 + i * 6}%`,
                top: `${10 + (i % 5) * 18}%`,
                background: 'rgba(255,255,255,0.2)',
                opacity: 0.3,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-20">
          <div className="container-custom text-center relative z-10">
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm font-medium mb-8">
              <ShieldCheck className="w-4 h-4" />
              <span>Agent Subscriptions</span>
            </div>

            {/* Hero Icon */}
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm rounded-3xl mb-8">
              <ShieldCheck className="w-14 h-14 text-white/60" />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Agent Management
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
              Purchase access to specialized agents on a per-agent basis
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.1] px-6 py-3 active-count-glow">
                <p className="text-sm text-gray-400">Active Agents</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-orange-300 to-green-400 bg-clip-text text-transparent">{activeAgentCount}</p>
              </div>
              <button
                onClick={handleRefreshSubscriptions}
                disabled={isLoading}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] disabled:opacity-50 transition-colors"
                title="Refresh subscription status"
              >
                <RefreshCw className={`w-6 h-6 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Gradient Line */}
            <div className="w-32 h-px bg-gradient-to-r from-white/0 via-white/[0.15] to-white/0 rounded-full mx-auto mb-8" />

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white font-semibold rounded-xl transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        {/* Agent Cards Section */}
        <section className="py-16 px-4 relative z-10">
          <div className="container-custom space-y-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            )}

            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {agentStates.map((agent) => {
                  const subscriptionPlan = agent.subscription?.plan as
                    | PlanType
                    | undefined;

                  return (
                    <div
                      key={agent.agentId}
                      className={`relative rounded-2xl border p-6 transition-all duration-300 group ${agent.isUnlocked
                        ? 'bg-white/[0.03] border-white/[0.1] active-card'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                        }`}
                    >
                      {!agent.isUnlocked && (
                        <div className="absolute inset-0 rounded-2xl bg-[#030304]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                          <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                            <Lock className="w-7 h-7 text-white/50" />
                          </div>
                          <p className="font-semibold text-white mb-2">
                            Purchase Access to {agent.agentName}
                          </p>
                          <p className="text-sm text-gray-400 mb-4">
                            Get instant access by choosing a plan.
                          </p>
                          <button
                            onClick={() =>
                              handleCardClick(agent.agentId, agent.agentName)
                            }
                            className="px-6 py-3 bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white font-semibold rounded-xl transition-all inline-flex items-center gap-2"
                          >
                            Purchase Access
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm uppercase tracking-wide text-gray-500">
                            Agent
                          </p>
                          <h3 className="text-2xl font-bold text-white">
                            {agent.agentName}
                          </h3>
                        </div>
                        {agent.isUnlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border border-white/[0.1] text-white/80 active-badge-shimmer">
                            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-gray-500">
                            <Lock className="w-4 h-4" /> Locked
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 mb-5">
                        {agent.isUnlocked
                          ? `Currently on ${PLAN_LABELS[subscriptionPlan ?? 'daily']
                          } plan. You can cancel anytime.`
                          : `Purchase access to ${agent.agentName} to explore personalized capabilities.`}
                      </p>

                      <div className="space-y-3">
                        {agent.isUnlocked && (
                          <>
                            <button
                              onClick={() => handleChatWithAgent(agent.agentId, agent.subscription?._id || '')}
                              className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/70 hover:bg-white/[0.06] transition-colors"
                            >
                              Chat with Agent
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleCancelSubscription(
                                  agent.agentId,
                                  agent.agentName
                                )
                              }
                              disabled={cancellingAgentId === agent.agentId}
                              className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-red-400/70 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {cancellingAgentId === agent.agentId ? (
                                <>
                                  <span>Cancelling...</span>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </>
                              ) : (
                                <>
                                  Cancel Subscription
                                  <span className="text-xs uppercase tracking-widest font-semibold">
                                    Stop
                                  </span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>

                      {!agent.isUnlocked && (
                        <button
                          onClick={() =>
                            handleCardClick(agent.agentId, agent.agentName)
                          }
                          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06] transition-colors"
                        >
                          Purchase Access
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 hover:border-white/[0.1] transition-all">
              <h2 className="text-2xl font-bold text-white mb-6">
                How Agent Management Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { step: 'Choose', color: 'cyan', icon: '🎯' },
                  { step: 'Access', color: 'purple', icon: '🔓' },
                  { step: 'Renew', color: 'emerald', icon: '🔄' }
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className={`p-5 rounded-xl border bg-white/[0.02] border-white/[0.06]`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="text-sm font-semibold text-white/50">
                        Step {index + 1}
                      </p>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {item.step}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {index === 0 &&
                        'Select any locked agent to see plan options and purchase access.'}
                      {index === 1 &&
                        'Chat with your unlocked agents and access their specialized capabilities.'}
                      {index === 2 &&
                        'Renew or cancel subscriptions anytime - no auto-renewal.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
