'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap, SplitText, CustomWiggle, CustomEase } from '@/lib/gsap'

export default function SubscriptionSuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(SplitText, CustomEase)
    
    CustomWiggle.create('errorWiggle', { type: 'anticipate', wiggles: 3 })
    CustomEase.create('errorBounce', 'M0,0 C0.14,0.5 0.25,1.1 0.44,1.08 0.58,1.02 0.75,1 1,1')

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(['.error-detail', '.action-btn', '.help-text'], { autoAlpha: 0 })

      // Background orbs animation
      gsap.utils.toArray('.error-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          x: `random(-80, 80)`,
          y: `random(-80, 80)`,
          scale: `random(0.7, 1.3)`,
          rotation: 360,
          borderRadius: ['40% 60% 60% 40% / 60% 30% 70% 40%', '60% 40% 30% 70% / 40% 60% 40% 60%'],
          duration: 15 + i * 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Glitch particles
      gsap.utils.toArray('.glitch-particle').forEach((particle: any) => {
        gsap.to(particle, {
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          opacity: `random(0, 0.5)`,
          duration: `random(0.5, 2)`,
          repeat: -1,
          yoyo: true,
          ease: 'steps(3)'
        })
      })

      // Error icon animation with shake
      const errorIcon = document.querySelector('.error-icon')
      if (errorIcon) {
        gsap.from(errorIcon, {
          scale: 0,
          rotation: -180,
          duration: 0.8,
          ease: 'elastic.out(1, 0.4)'
        })

        // Continuous pulse
        gsap.to(errorIcon, {
          boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)',
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.8
        })
      }

      // Title animation
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars' })
        
        gsap.from(titleSplit.chars, {
          y: 50,
          rotationX: -90,
          opacity: 0,
          duration: 0.6,
          ease: 'errorBounce',
          stagger: {
            amount: 0.4,
            from: 'center'
          },
          delay: 0.3
        })

        // Shake effect
        gsap.to(titleRef.current, {
          x: 'errorWiggle',
          duration: 0.5,
          delay: 1
        })
      }

      // Error detail box
      gsap.to('.error-detail', {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        delay: 0.8,
        ease: 'power2.out',
        from: { y: 30 }
      })

      // Action buttons with stagger
      gsap.to('.action-btn', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.15,
        delay: 1.2,
        ease: 'errorBounce',
        from: { y: 30, scale: 0.9 }
      })

      // Help text
      gsap.to('.help-text', {
        autoAlpha: 1,
        duration: 0.5,
        delay: 1.8
      })

      // Button hover effects
      gsap.utils.toArray('.action-btn').forEach((btn: any) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, y: -5, duration: 0.3 })
        })
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, y: 0, duration: 0.3 })
        })
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="error-orb absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-r from-red-600/20 to-rose-600/20 blur-3xl" />
        <div className="error-orb absolute top-1/2 -right-32 w-[400px] h-[400px] bg-gradient-to-r from-orange-500/15 to-red-600/15 blur-3xl" />
        <div className="error-orb absolute -bottom-32 left-1/4 w-[350px] h-[350px] bg-gradient-to-r from-pink-500/10 to-rose-600/10 blur-3xl" />
      </div>

      {/* Glitch Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="glitch-particle absolute w-1 h-4 bg-red-500/40"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 90}deg)`
            }}
          />
        ))}
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Error Icon */}
        <div className="error-icon w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-rose-600/20 flex items-center justify-center text-5xl mb-8 border border-red-500/30">
          ⚠️
        </div>

        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl font-bold text-white mb-6 text-center"
        >
          Something Went Wrong
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl text-center mb-10">
          We encountered an error while processing your subscription. This is usually temporary.
        </p>

        {/* Error Details Box */}
        <div className="error-detail w-full max-w-2xl bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-red-500/20 mb-10 opacity-0">
          <h3 className="text-lg font-semibold text-white mb-4">Error Details</h3>
          
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 mb-4">
            <p className="text-red-300 text-sm font-mono">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>

          {error.digest && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Error ID:</span>
              <code className="px-2 py-1 bg-white/5 rounded">{error.digest}</code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
          <button
            onClick={reset}
            className="action-btn flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-semibold text-center hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-blue-500/25 opacity-0"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="action-btn flex-1 py-4 px-6 bg-white/5 border border-blue-500/30 rounded-xl text-blue-400 font-semibold text-center hover:bg-blue-500/10 transition-all duration-300 opacity-0"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/support/contact-us"
            className="action-btn flex-1 py-4 px-6 bg-white/5 border border-red-500/30 rounded-xl text-red-400 font-semibold text-center hover:bg-red-500/10 transition-all duration-300 opacity-0"
          >
            Contact Support
          </Link>
        </div>

        {/* Help Text */}
        <p className="help-text text-gray-500 text-sm mt-10 text-center max-w-lg opacity-0">
          If this problem persists, please contact our support team with the error details above.
        </p>
      </div>
    </div>
  )
}
