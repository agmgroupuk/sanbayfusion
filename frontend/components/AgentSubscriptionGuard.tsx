'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { Lock, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface AgentSubscriptionGuardProps {
  children: React.ReactNode;
  agentId: string;
  agentName: string;
}

/**
 * AgentSubscriptionGuard - Protects agent chat pages that require a subscription to that specific agent
 *
 * Usage:
 * ```tsx
 * export default function BenSegaPage() {
 *   return (
 *     <AgentSubscriptionGuard agentId="ben-sega" agentName="Ben Sega">
 *       <UniversalAgentChat agent={agentConfig} />
 *     </AgentSubscriptionGuard>
 *   );
 * }
 * ```
 */

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function AgentSubscriptionGuardInner({
  children,
  agentId,
  agentName,
}: AgentSubscriptionGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState } = useAuth();
  const {
    hasActiveSubscription,
    getSubscription,
    getDaysRemaining,
    loading: subscriptionLoading,
    refreshSubscriptions,
  } = useSubscriptions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [directCheckDone, setDirectCheckDone] = useState(false);
  const [directCheckResult, setDirectCheckResult] = useState(false);

  // Check if coming from successful checkout (fresh=1 parameter)
  useEffect(() => {
    const isFresh = searchParams.get('fresh') === '1';
    if (isFresh && !hasRefreshed && authState.isAuthenticated) {
      setIsRefreshing(true);
      setHasRefreshed(true);

      // Force refresh subscriptions after successful checkout
      refreshSubscriptions().finally(() => {
        setIsRefreshing(false);
        // Clean up the URL by removing the fresh parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('fresh');
        window.history.replaceState({}, '', url.toString());
      });
    }
  }, [searchParams, hasRefreshed, authState.isAuthenticated, refreshSubscriptions]);

  // Fallback: if context says no subscription, do a direct API check
  // This catches cases where context has stale data (e.g. navigated without ?fresh=1)
  useEffect(() => {
    if (
      !authState.isLoading &&
      !subscriptionLoading &&
      !isRefreshing &&
      authState.isAuthenticated &&
      authState.user?.id &&
      !hasActiveSubscription(agentId) &&
      !directCheckDone
    ) {
      setDirectCheckDone(true);
      // Direct API call to verify subscription status
      fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: authState.user.id,
          agentId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.hasAccess || data.hasActiveSubscription) {
            setDirectCheckResult(true);
            // Also refresh the context so future checks work
            refreshSubscriptions();
          }
        })
        .catch(() => {
          // Ignore errors — will show subscribe page as fallback
        });
    }
  }, [
    authState.isLoading,
    subscriptionLoading,
    isRefreshing,
    authState.isAuthenticated,
    authState.user?.id,
    agentId,
    hasActiveSubscription,
    directCheckDone,
    refreshSubscriptions,
  ]);

  // Combined loading state
  const isLoading = authState.isLoading || subscriptionLoading || isRefreshing || (!directCheckDone && authState.isAuthenticated && !hasActiveSubscription(agentId));

  // Show loading spinner while checking
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Checking access to {agentName}...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center py-12 px-4 overflow-hidden">
        {/* Background effects matching login page */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-purple-400/40 rounded-full animate-pulse" style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 4) * 20}%`, animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>

        <div className="relative z-10 max-w-md w-full space-y-8">
          {/* Header with Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block mb-6">
              <Image src="/images/logos/company-logo.png" alt="Sanbay Fusion" width={80} height={80} className="w-20 h-20 object-contain" priority />
            </Link>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">Login Required</span>
            </h1>
            <p className="text-gray-400 text-lg">Sign in to chat with {agentName}</p>
          </div>

          {/* Card */}
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-gray-700/50 backdrop-blur-sm">
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-purple-500/30 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-purple-500/30 rounded-bl-lg" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-gray-400">
                Please log in to chat with {agentName}.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {(() => {
                const loginHref = `/auth/login?redirect=${encodeURIComponent(
                  `https://${agentId}-chat.sanbayfusion.com/`
                )}`;
                return (
                  <Link
                    href={loginHref}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white text-center hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    🔑 Sign In
                  </Link>
                );
              })()}

              <Link
                href="/auth/signup"
                className="w-full px-6 py-3 border border-gray-700/50 rounded-xl font-semibold text-gray-300 text-center hover:bg-gray-800/50 transition-all duration-300"
              >
                Create Account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-gray-400">
              Don't have a subscription?{' '}
              <Link
                href={`https://sanbayfusion.com/subscribe?agent=${encodeURIComponent(agentName)}&slug=${agentId}`}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Subscribe to {agentName}
              </Link>
            </p>
            <Link href="/" className="inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back to homepage</Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but no subscription for this agent - show subscribe prompt
  if (!hasActiveSubscription(agentId) && !directCheckResult) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center py-12 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 max-w-md w-full space-y-8">
          {/* Header with Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block mb-6">
                  <Image src="/images/logos/company-logo.png" alt="Sanbay Fusion" width={80} height={80} className="w-20 h-20 object-contain" priority />
            </Link>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">Subscribe to {agentName}</span>
            </h1>
            <p className="text-gray-400 text-lg">Choose a plan that works for you</p>
          </div>

          {/* Card */}
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-gray-700/50 backdrop-blur-sm">
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-purple-500/30 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-purple-500/30 rounded-bl-lg" />

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl mb-4">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-gray-400">
                You need an active subscription to chat with {agentName}.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700/30">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Subscription includes
              </h3>
              <ul className="text-left text-sm text-gray-300 space-y-2.5">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Unlimited chat with{' '}
                  {agentName}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Voice chat
                  capabilities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> File & image uploads
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Chat history saved
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`https://sanbayfusion.com/subscribe?agent=${encodeURIComponent(agentName)}&slug=${agentId}`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <Crown className="w-5 h-5" />
                Subscribe Now
              </Link>

              <Link
                href="https://sanbayfusion.com/agents"
                className="w-full px-6 py-3 border border-gray-700/50 rounded-xl font-semibold text-gray-300 text-center hover:bg-gray-800/50 transition-all duration-300"
              >
                Browse Other Agents
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <Link href="/" className="inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back to homepage</Link>
          </div>
        </div>
      </div>
    );
  }

  // Has active subscription for this agent - render the chat
  return <>{children}</>;
}

// Wrapper component with Suspense boundary for useSearchParams
export function AgentSubscriptionGuard(props: AgentSubscriptionGuardProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AgentSubscriptionGuardInner {...props} />
    </Suspense>
  );
}

export default AgentSubscriptionGuard;
