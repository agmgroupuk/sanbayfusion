'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Lock, Crown, Loader2, Sparkles, Zap, Bot, Wrench, FlaskConical, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface SubscriptionGuardProps {
  children: ReactNode;
  /** Custom message to show when user doesn't have subscription */
  message?: string;
  /** Where to redirect for subscription (default: /preview) */
  pricingUrl?: string;
}

/**
 * SubscriptionGuard - Protects pages that require an active subscription
 *
 * Usage:
 * ```tsx
 * export default function MyProtectedPage() {
 *   return (
 *     <SubscriptionGuard>
 *       <YourPageContent />
 *     </SubscriptionGuard>
 *   );
 * }
 * ```
 *
 * This component:
 * 1. Shows loading spinner while checking auth/subscription status
 * 2. If not logged in: Shows login prompt
 * 3. If logged in but no subscription: Shows upgrade prompt
 * 4. If logged in with active subscription: Renders children
 */
export function SubscriptionGuard({
  children,
  message = 'This feature requires an active subscription to access.',
  pricingUrl = '/overview',
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading } =
    useSubscriptionStatus();

  // Combined loading state
  const isLoading = authState.isLoading || subscriptionLoading;

  // Show loading spinner while checking
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        {/* Nebula orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-25" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-[3px] border-violet-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-mono tracking-wider uppercase">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#030304] text-white flex items-center justify-center py-12 px-4 overflow-hidden">
        {/* Nebula orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-25 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)', animationDuration: '8s' }} />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)', animationDuration: '10s' }} />
          <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4), transparent 70%)', animationDuration: '12s' }} />
        </div>

        {/* Grid overlay */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Scan line */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent animate-[scanDown_8s_linear_infinite]" style={{ animation: 'scanDown 8s linear infinite' }} />
        </div>

        {/* Stardust particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-[2px] h-[2px] rounded-full animate-pulse" style={{
              background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(16,185,129,0.5)',
              left: `${8 + i * 7.5}%`,
              top: `${10 + (i % 5) * 18}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + (i % 3)}s`
            }} />
          ))}
        </div>

        <div className="relative z-10 max-w-lg w-full space-y-8">
          {/* Header with Logo */}
          <div className="text-center">
            <Link href="/home" className="inline-block mb-6 group">
              <div className="relative">
                <Image src="/images/logos/company-logo.png" alt="Maula AI" width={80} height={80} className="w-20 h-20 object-contain transition-transform duration-500 group-hover:scale-110" priority />
                <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Authentication</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #22d3ee, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Required</span>
            </h1>
            <p className="text-gray-500 text-sm font-light">Sign in to access this feature</p>
          </div>

          {/* Card */}
          <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-500">
            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-cyan-500/20 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-violet-500/20 rounded-bl-2xl" />

            {/* Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Lock className="w-9 h-9 text-violet-400" />
              </div>
              <p className="text-gray-400 font-light leading-relaxed max-w-sm mx-auto">
                Please log in to access this feature. Already have an account? Sign in below.
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mb-8" />

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Link
                href="/auth/login"
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.7), rgba(6,182,212,0.5))', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>

              <Link
                href="/auth/signup"
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-gray-300 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-gray-500 text-sm">
              New to Maula AI?{' '}
              <Link href="/overview" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                View our plans
              </Link>
            </p>
            <Link href="/home" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-400 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to homepage
            </Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes scanDown {
            0% { transform: translateY(-100vh); }
            100% { transform: translateY(100vh); }
          }
        `}</style>
      </div>
    );
  }

  // Logged in but no active subscription - show upgrade prompt
  if (!hasActiveSubscription) {
    const features = [
      { icon: Wrench, label: 'Access to all Network Tools', glow: 'rgba(6,182,212,0.4)' },
      { icon: Zap, label: 'Access to all Developer Utils', glow: 'rgba(139,92,246,0.4)' },
      { icon: FlaskConical, label: 'Access to AI Lab Experiments', glow: 'rgba(16,185,129,0.4)' },
      { icon: Bot, label: 'Chat with AI Agents', glow: 'rgba(6,182,212,0.4)' },
      { icon: Sparkles, label: 'Priority support & updates', glow: 'rgba(236,72,153,0.4)' },
    ];

    return (
      <div className="min-h-screen bg-[#030304] text-white flex items-center justify-center py-12 px-4 overflow-hidden">
        {/* Nebula orbs - matching lab page */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.06]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent 70%)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.05]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.8), transparent 70%)' }} />
          <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.6), transparent 70%)' }} />
        </div>

        {/* Grid overlay - matching lab */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Scan line */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" style={{ animation: 'scanDown 8s linear infinite' }} />
        </div>

        {/* Stardust particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute w-[2px] h-[2px] rounded-full animate-pulse" style={{
              background: i % 3 === 0 ? 'rgba(139,92,246,0.5)' : i % 3 === 1 ? 'rgba(6,182,212,0.5)' : 'rgba(236,72,153,0.4)',
              left: `${5 + i * 6}%`,
              top: `${8 + (i % 5) * 18}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + (i % 3)}s`
            }} />
          ))}
        </div>

        <div className="relative z-10 max-w-md w-full space-y-6">
          {/* Crown icon with glow */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-5 border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.15))', boxShadow: '0 0 30px rgba(6,182,212,0.1), 0 0 60px rgba(139,92,246,0.05)' }}>
              <Crown className="w-8 h-8" style={{ color: '#67e8f9', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' }} />
            </div>
            <p className="text-gray-500 text-sm font-light leading-relaxed max-w-sm mx-auto">{message}</p>
          </div>

          {/* Card - lab style glassmorphism */}
          <div className="relative rounded-2xl overflow-hidden group">
            {/* Glow border effect */}
            <div className="absolute -inset-px rounded-2xl opacity-40" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(139,92,246,0.2), rgba(236,72,153,0.15))' }} />

            <div className="relative p-6 rounded-2xl bg-[#070709] border border-white/[0.06]">
              {/* Top glow strip */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              {/* Features list */}
              <div className="mb-6">
                <h3 className="text-[10px] font-bold text-gray-600 mb-4 uppercase tracking-[0.2em]">
                  What you get
                </h3>
                <ul className="space-y-3">
                  {features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${feat.glow.replace('0.4', '0.15')}, transparent)` }}>
                        <feat.icon className="w-4 h-4" style={{ color: feat.glow.replace('0.4)', '0.9)'), filter: `drop-shadow(0 0 4px ${feat.glow})` }} />
                      </div>
                      <span className="text-[13px] text-gray-400 font-light">{feat.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <Link
                  href={pricingUrl}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.7), rgba(139,92,246,0.6))', border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 0 20px rgba(6,182,212,0.15), 0 0 40px rgba(139,92,246,0.08)' }}
                >
                  <Sparkles className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' }} />
                  View Subscription Plans
                </Link>

                <button
                  onClick={() => router.back()}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-gray-600 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] hover:text-gray-400 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes scanDown {
            0% { transform: translateY(-100vh); }
            100% { transform: translateY(100vh); }
          }
        `}</style>
      </div>
    );
  }

  // Has active subscription - render the protected content
  return <>{children}</>;
}

export default SubscriptionGuard;
