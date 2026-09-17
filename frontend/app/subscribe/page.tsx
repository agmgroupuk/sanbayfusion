'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin } from '@/lib/gsap'
import { Sparkles, CheckCircle, Crown, Zap, ArrowRight, ChevronRight, Lock, CreditCard, RefreshCw, BoltIcon } from 'lucide-react'

function SubscriptionContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const { state } = useAuth()
  const agentName = searchParams.get('agent') || 'AI Agent'
  const agentSlug = searchParams.get('slug') || 'agent'
  const intent = searchParams.get('intent')
  const [checking, setChecking] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeSubscription, setActiveSubscription] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)
  const [animationsReady, setAnimationsReady] = useState(false)

  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      if (!state.isAuthenticated || !state.user) {
        const currentUrl = `${window.location.origin}/subscribe?agent=${agentName}&slug=${agentSlug}`
        router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`)
        return
      }

      try {
        const user = state.user
        if (user) {
          const response = await fetch('/api/subscriptions/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              agentId: agentSlug,
            }),
          })

          const data = await response.json()

          if ((data.hasAccess || data.hasActiveSubscription) && data.subscription) {
            const subscription = data.subscription
            if (!subscription.daysUntilRenewal && subscription.expiryDate) {
              const expiry = new Date(subscription.expiryDate)
              const now = new Date()
              subscription.daysUntilRenewal = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            }
            setActiveSubscription(subscription)

            if (intent === 'cancel') {
              setTimeout(() => {
                const cancelButton = document.querySelector('[data-cancel-button]') as HTMLButtonElement
                if (cancelButton) cancelButton.click()
              }, 500)
            }
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      }

      setChecking(false)
      setAnimationsReady(true)
    }

    checkAccessAndRedirect()
  }, [agentName, agentSlug, router, state.isAuthenticated, state.user, intent])

  // GSAP Animations
  useEffect(() => {
    if (!containerRef.current || !animationsReady || checking) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, MotionPathPlugin, CustomEase, ScrollToPlugin)

    CustomWiggle.create('subscribeWiggle', { type: 'easeOut', wiggles: 4 })
    CustomEase.create('subscribeBounce', 'M0,0 C0.14,0.5 0.25,1.1 0.44,1.08 0.58,1.02 0.75,1 1,1')

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(['.plan-card', '.info-card', '.active-sub-card', '.badge-pill'], { autoAlpha: 0 })

      // Background orbs animation
      gsap.utils.toArray('.subscribe-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          scale: `random(0.7, 1.4)`,
          rotation: 360,
          borderRadius: ['40% 60% 60% 40% / 60% 30% 70% 40%', '60% 40% 30% 70% / 40% 60% 40% 60%'],
          duration: 18 + i * 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Floating particles
      gsap.utils.toArray('.particle').forEach((particle: any) => {
        gsap.to(particle, {
          y: `random(-80, 80)`,
          x: `random(-50, 50)`,
          opacity: `random(0.2, 0.6)`,
          scale: `random(0.5, 1.5)`,
          duration: `random(4, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Title animation
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        gsap.from(titleSplit.chars, {
          y: 80,
          rotationX: -90,
          opacity: 0,
          duration: 0.8,
          ease: 'subscribeBounce',
          stagger: {
            amount: 0.6,
            from: 'center'
          }
        })

        // Shimmer effect
        gsap.to(titleSplit.chars, {
          backgroundPosition: '200% center',
          duration: 3,
          repeat: -1,
          stagger: { amount: 1, repeat: -1 },
          ease: 'none'
        })
      }

      // Subtitle typewriter
      if (subtitleRef.current) {
        const text = subtitleRef.current.textContent || ''
        subtitleRef.current.textContent = ''
        gsap.to(subtitleRef.current, {
          text: text,
          duration: 1.5,
          delay: 0.6,
          ease: 'none'
        })
      }

      // Badge pills entrance
      gsap.to('.badge-pill', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.8,
        ease: 'back.out(2)',
        from: { y: 20, scale: 0.8 }
      })

      // Active subscription card
      if (activeSubscription) {
        gsap.to('.active-sub-card', {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          delay: 1,
          ease: 'subscribeBounce',
          from: { y: 50, scale: 0.9 }
        })

        // Celebrate animation
        gsap.to('.celebrate-icon', {
          rotation: 15,
          scale: 1.1,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        })

        // Progress bar animation
        const progressFill = document.querySelector('.progress-fill')
        if (progressFill && activeSubscription.daysUntilRenewal) {
          const maxDays = activeSubscription.plan === 'monthly' ? 30 : activeSubscription.plan === 'weekly' ? 7 : 1
          const progress = (activeSubscription.daysUntilRenewal / maxDays) * 100
          gsap.to(progressFill, {
            width: `${progress}%`,
            duration: 1.5,
            delay: 1.3,
            ease: 'power2.out'
          })
        }
      } else {
        // Plan cards with 3D flip entrance
        gsap.utils.toArray('.plan-card').forEach((card: any, i) => {
          gsap.to(card, {
            autoAlpha: 1,
            rotationY: 0,
            scale: 1,
            duration: 0.8,
            delay: 1 + i * 0.2,
            ease: 'subscribeBounce',
            from: { rotationY: 90, scale: 0.8 }
          })

          // Hover effects
          card.addEventListener('mouseenter', () => {
            gsap.to(card, {
              scale: 1.03,
              y: -8,
              duration: 0.4,
              ease: 'power2.out'
            })
            gsap.to(card.querySelector('.plan-icon'), {
              rotation: 15,
              scale: 1.1,
              duration: 0.4
            })
          })

          card.addEventListener('mouseleave', () => {
            gsap.to(card, {
              scale: 1,
              y: 0,
              duration: 0.4
            })
            gsap.to(card.querySelector('.plan-icon'), {
              rotation: 0,
              scale: 1,
              duration: 0.4
            })
          })
        })
      }

      // Info cards entrance
      gsap.to('.info-card', {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.info-section',
          start: 'top 80%'
        }
      })

      // Recommended badge subtle glow
      gsap.to('.recommended-badge', {
        boxShadow: '0 0 15px rgba(139,92,246,0.4)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })

    }, containerRef)

    return () => ctx.revert()
  }, [animationsReady, checking, activeSubscription])

  const handleCancelSubscription = async () => {
    if (!state.user || !activeSubscription) return

    if (!confirm(`Are you sure you want to cancel your ${activeSubscription.plan} subscription to ${agentName}? You will lose access immediately.`)) {
      return
    }

    setCancelling(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: state.user.id,
          agentId: agentSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      setActiveSubscription(null)
      alert('Access cancelled successfully. You can purchase again anytime to continue using this agent.')

      if (intent === 'cancel') {
        router.push('/dashboard/agent-management')
      }
    } catch (error) {
      console.error('Cancel subscription error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to cancel access. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const subscriptionPlans = [
    {
      type: 'Daily',
      price: '$1',
      originalPrice: null,
      discount: null,
      period: 'per day',
      icon: '⚡',
      features: [
        'Full access to ' + agentName,
        'Unlimited conversations',
        'Real-time responses',
        'No auto-renewal',
      ],
      recommended: false,
      billingCycle: 'daily',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      type: 'Weekly',
      price: '$5',
      originalPrice: '$10',
      discount: '50% OFF',
      period: 'per week',
      icon: '🌟',
      features: [
        'Full access to ' + agentName,
        'Unlimited conversations',
        'Real-time responses',
        'No auto-renewal',
        'Save 29% vs daily',
      ],
      recommended: true,
      billingCycle: 'weekly',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      type: 'Monthly',
      price: '$15',
      originalPrice: '$30',
      discount: '50% OFF',
      period: 'per month',
      icon: '👑',
      features: [
        'Full access to ' + agentName,
        'Unlimited conversations',
        'Real-time responses',
        'No auto-renewal',
        'Save 39% vs daily',
        'Best value',
      ],
      recommended: false,
      billingCycle: 'monthly',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      type: 'Yearly',
      price: '$150',
      originalPrice: '$300',
      discount: '50% OFF',
      period: 'per year',
      icon: '♾️',
      features: [
        'Full access to ' + agentName,
        'Unlimited conversations',
        'Real-time responses',
        'No auto-renewal',
        'Save 59% vs daily',
        '365 days of access',
      ],
      recommended: false,
      billingCycle: 'yearly',
      gradient: 'from-emerald-500 to-teal-600'
    },
  ]

  const handleSubscribe = async (plan: any) => {
    setErrorMessage(null)

    if (!state.isAuthenticated || !state.user) {
      const currentUrl = `${window.location.origin}/subscribe?agent=${agentName}&slug=${agentSlug}`
      router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    if (processingPlan) return

    setProcessingPlan(plan.billingCycle)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentSlug,
          agentName,
          plan: plan.billingCycle,
          userId: state.user.id,
          userEmail: state.user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success || !data.url) {
        if (data.alreadySubscribed && data.existingSubscription) {
          const expiryDate = new Date(data.existingSubscription.expiryDate).toLocaleDateString()
          throw new Error(
            `You already have an active ${data.existingSubscription.plan} subscription. ` +
            `It expires on ${expiryDate} (${data.existingSubscription.daysUntilRenewal || 0} days remaining).`
          )
        }
        throw new Error(data.error || 'Failed to start checkout session')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Stripe checkout error:', error)
      const message = error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      setErrorMessage(message)
      setProcessingPlan(null)
    }
  }

  // Mouse-following ambient light
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const ambient = document.querySelector('.subscribe-ambient-light') as HTMLElement
    if (ambient) {
      ambient.style.left = `${e.clientX - 250}px`
      ambient.style.top = `${e.clientY - 250}px`
    }
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
          </div>
          <p className="text-gray-500 text-sm tracking-wide">Checking access status...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-hidden" onMouseMove={handleMouseMove}>
      {/* ═══ BACKGROUND LAYER ═══ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Nebula orbs — very subtle */}
        <div className="subscribe-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="subscribe-orb absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="subscribe-orb absolute top-[60%] left-[50%] w-[500px] h-[500px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />

        {/* Micro grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Scan line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
          style={{ animation: 'scanLine 8s linear infinite' }} />

        {/* Mouse-following ambient light */}
        <div className="subscribe-ambient-light fixed w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.015]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)', transition: 'left 0.3s ease-out, top 0.3s ease-out' }} />
      </div>

      {/* Stardust particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute rounded-full"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              left: `${3 + i * 4.7}%`,
              top: `${8 + (i % 7) * 13}%`,
              background: ['#8b5cf6', '#06b6d4', '#ec4899'][i % 3],
              opacity: 0.6
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Hero icon — rotating ring + violet gradient container */}
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-10">
            {/* Outer rotating dashed ring */}
            <div className="absolute inset-0 w-28 h-28 rounded-full border-2 border-dashed border-violet-500/30"
              style={{ animation: 'spin 20s linear infinite' }} />
            {/* Icon container */}
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-violet-400/30"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))',
                boxShadow: '0 0 30px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.08), inset 0 1px 1px rgba(255,255,255,0.05)'
              }}>
              <Crown className="w-9 h-9" style={{ color: '#ddd6fe', filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }} />
            </div>
          </div>

          <h1
            ref={titleRef}
            className="text-4xl md:text-6xl font-bold mb-4 leading-tight tracking-tight"
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{agentName}</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-lg text-gray-500 mb-10 max-w-xl mx-auto"
          >
            {activeSubscription
              ? `Manage your access to ${agentName}`
              : `Choose a one-time purchase plan for access to ${agentName}`}
          </p>

          {/* Info badge */}
          <div className="badge-pill inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.015] border border-white/[0.04] text-gray-500 text-xs uppercase tracking-widest font-medium opacity-0">
            <Lock className="w-3.5 h-3.5 text-violet-400" />
            <span>One agent per purchase &bull; No auto-renewal</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="max-w-3xl mx-auto mb-8 px-4 relative z-10">
          <div className="bg-red-500/[0.06] border border-red-500/20 text-red-400 p-4 rounded-2xl text-center text-sm backdrop-blur-sm">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Active Subscription Card */}
      {activeSubscription && (
        <div className="max-w-3xl mx-auto mb-16 px-4 relative z-10">
          <div className="active-sub-card rounded-2xl bg-white/[0.015] border border-white/[0.04] backdrop-blur-sm p-8 opacity-0 overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-medium uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Subscription
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">You have access to {agentName}</h2>
              </div>
              <div className="celebrate-icon w-14 h-14 rounded-xl flex items-center justify-center border border-emerald-400/20"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))', boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}>
                <Sparkles className="w-7 h-7 text-emerald-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.035]">
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium mb-1">Plan</div>
                <div className="text-lg font-bold text-gray-200 capitalize">{activeSubscription.plan}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.035]">
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium mb-1">Time Remaining</div>
                <div className="text-lg font-bold text-cyan-400/80">{activeSubscription.daysUntilRenewal || 0} days</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.035]">
                <div className="text-[11px] text-gray-600 uppercase tracking-widest font-medium mb-1">Status</div>
                <div className="text-lg font-bold text-emerald-400/80">Active</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="progress-fill h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" style={{ width: 0 }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://${agentSlug}-chat.maula.ai/?fresh=1`}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm text-center shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400"
              >
                Open Agent Chat
              </a>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                data-cancel-button
                className="flex-1 py-3.5 px-6 bg-white/[0.03] border border-red-500/20 rounded-xl text-red-400 font-semibold text-sm hover:bg-red-500/[0.06] hover:border-red-500/30 transition-all duration-300 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Access'}
              </button>
            </div>

            <p className="text-gray-600 text-xs mt-6 text-center tracking-wide">
              After expiration or cancellation, you can purchase a new plan anytime
            </p>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      {!activeSubscription && (
        <div ref={cardsRef} className="relative px-4 pb-16 z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {subscriptionPlans.map((plan, index) => (
                <div
                  key={index}
                  className={`plan-card group relative block rounded-2xl opacity-0`}
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                >
                  {/* Outer glow on hover */}
                  <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${plan.recommended ? 'rgba(139,92,246,0.2)' : 'rgba(6,182,212,0.12)'}, transparent 60%)`, filter: 'blur(1px)' }} />

                  <div className={`relative p-6 rounded-2xl bg-white/[0.015] border backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:bg-white/[0.03] ${plan.recommended
                    ? 'border-violet-500/20 group-hover:border-violet-500/35'
                    : 'border-white/[0.04] group-hover:border-white/[0.08]'
                    }`}>
                    {/* Mouse-follow shine overlay */}
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {/* Top accent line */}
                    <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${plan.recommended ? 'from-violet-500/40 via-fuchsia-500/40 to-violet-500/40' : 'from-transparent via-cyan-500/30 to-transparent'
                      } opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    {plan.recommended && (
                      <div className="recommended-badge absolute -top-3.5 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 rounded-full text-white/90 text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-violet-900/30">
                        Most Popular
                      </div>
                    )}

                    <div className="relative z-10">
                      <div className="text-center mb-6">
                        {/* Plan icon — tools page style */}
                        <div className="plan-icon inline-flex w-14 h-14 rounded-xl items-center justify-center mb-4 border"
                          style={{
                            borderColor: plan.recommended ? 'rgba(139,92,246,0.3)' : 'rgba(6,182,212,0.25)',
                            background: plan.recommended
                              ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))'
                              : 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.1))',
                            boxShadow: `0 0 20px ${plan.recommended ? 'rgba(139,92,246,0.12)' : 'rgba(6,182,212,0.1)'}, 0 0 40px ${plan.recommended ? 'rgba(139,92,246,0.06)' : 'rgba(6,182,212,0.05)'}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                          }}>
                          {index === 0 && <Zap className="w-6 h-6" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.4))' }} />}
                          {index === 1 && <Sparkles className="w-6 h-6" style={{ color: '#ddd6fe', filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }} />}
                          {index === 2 && <Crown className="w-6 h-6" style={{ color: '#f0abfc', filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.4))' }} />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-300 mb-2 group-hover:text-gray-100 transition-colors duration-300">{plan.type}</h3>
                        <div className="flex items-baseline justify-center gap-2">
                          {plan.originalPrice && (
                            <span className="text-lg font-bold text-gray-700 line-through">{plan.originalPrice}</span>
                          )}
                          <span className="text-3xl font-black text-gray-100 tracking-tight">{plan.price}</span>
                          <span className="text-gray-600 text-sm">{plan.period}</span>
                        </div>
                        {plan.discount && (
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400/80 text-[10px] font-bold uppercase tracking-wider">
                            🎉 {plan.discount} Welcome Gift
                          </span>
                        )}
                      </div>

                      <ul className="space-y-2.5 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-gray-600 text-[13px] group-hover:text-gray-400 transition-colors duration-300">
                            <CheckCircle className="w-4 h-4 text-violet-500/50 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={processingPlan !== null}
                        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-400 ${plan.recommended
                          ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white/90 shadow-lg shadow-violet-900/20 hover:shadow-violet-800/30 hover:from-violet-600/90 hover:to-fuchsia-600/90'
                          : 'bg-white/[0.02] text-gray-500 border border-white/[0.05] hover:bg-white/[0.04] hover:text-gray-300 hover:border-white/[0.1]'
                          } ${processingPlan !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {processingPlan === plan.billingCycle ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <>
                            Get {plan.type} Access
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="info-section relative py-16 px-4 z-10">
        <div className="max-w-4xl mx-auto">
          {/* Subtle divider */}
          <div className="w-48 h-px mx-auto mb-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <h2 className="text-2xl font-bold text-white mb-10 text-center tracking-tight"
            style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Important Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: Lock, title: 'Individual Purchases', desc: 'Each agent requires its own purchase. No auto-renewal, no recurring charges.', color: 'violet' },
              { icon: CreditCard, title: 'Unified Pricing', desc: 'All agents use the same simple pricing: $1/day, $10→$5/week, $30→$15/month, $300→$150/year — 50% OFF Welcome Gift!', color: 'cyan' },
              { icon: RefreshCw, title: 'Easy Cancellation', desc: 'Cancel anytime. Access expires naturally at the end of your chosen period.', color: 'fuchsia' },
              { icon: BoltIcon, title: 'Instant Access', desc: "Once you purchase, you'll have immediate unlimited conversations.", color: 'emerald' }
            ].map((item, i) => {
              const IconComp = item.icon
              const borderHover = item.color === 'violet' ? 'hover:border-violet-500/20' : item.color === 'cyan' ? 'hover:border-cyan-500/20' : item.color === 'fuchsia' ? 'hover:border-fuchsia-500/20' : 'hover:border-emerald-500/20'
              const iconColor = item.color === 'violet' ? '#ddd6fe' : item.color === 'cyan' ? '#a5f3fc' : item.color === 'fuchsia' ? '#f0abfc' : '#6ee7b7'
              const glowColor = item.color === 'violet' ? 'rgba(139,92,246,0.4)' : item.color === 'cyan' ? 'rgba(6,182,212,0.4)' : item.color === 'fuchsia' ? 'rgba(236,72,153,0.4)' : 'rgba(16,185,129,0.4)'
              return (
                <div
                  key={item.title}
                  className={`info-card p-5 rounded-2xl bg-white/[0.015] border border-white/[0.035] backdrop-blur-sm ${borderHover} transition-colors duration-500 opacity-0`}
                  style={{ transform: 'translateY(30px)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-white/[0.05]"
                    style={{ background: `linear-gradient(135deg, ${glowColor.replace('0.4', '0.15')}, rgba(139,92,246,0.05))` }}>
                    <IconComp className="w-5 h-5" style={{ color: iconColor, filter: `drop-shadow(0 0 6px ${glowColor})` }} />
                  </div>
                  <h3 className="font-bold text-gray-300 text-sm mb-1.5">{item.title}</h3>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="relative py-12 px-4 text-center z-10">
        <Link
          href="https://maula.ai/agents"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-violet-400 transition-colors duration-300 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Agents
        </Link>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @keyframes scanLine {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
      `}</style>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030304] flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
            </div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  )
}
