'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap'

export default function SolutionsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const orbsRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  const solutions = [
    {
      title: 'Enterprise AI',
      description: 'Scale AI across your organization with enterprise-grade security and compliance',
      icon: '🏢',
      link: '/solutions/enterprise-ai',
      color: 'from-purple-500 to-indigo-600',
      stats: '40% Cost Reduction'
    },
    {
      title: 'Process Automation',
      description: 'Intelligent workflows that adapt and optimize business processes automatically',
      icon: '⚡',
      link: '/solutions/process-automation',
      color: 'from-amber-500 to-orange-600',
      stats: '10x Faster'
    },
    {
      title: 'Smart Analytics',
      description: 'Transform data into actionable insights with AI-powered intelligence',
      icon: '📊',
      link: '/solutions/smart-analytics',
      color: 'from-emerald-500 to-teal-600',
      stats: '360° Visibility'
    },
    {
      title: 'AI Security',
      description: 'Protect your AI systems with advanced threat detection and compliance',
      icon: '🔒',
      link: '/solutions/ai-security',
      color: 'from-rose-500 to-pink-600',
      stats: '99.9% Uptime'
    }
  ]

  useEffect(() => {
    if (!containerRef.current) return

    // Register plugins
    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer)

    // Create custom eases
    CustomWiggle.create('cardWiggle', { type: 'easeOut', wiggles: 3 })
    CustomEase.create('elasticPop', 'M0,0 C0.12,0.52 0.2,1.1 0.4,1.12 0.6,1.14 0.7,1 1,1')

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(['.solution-card', '.floating-icon', '.stat-badge'], { autoAlpha: 0 })

      // Background particles
      const particles = gsap.utils.toArray('.particle')
      particles.forEach((particle: any, i) => {
        gsap.to(particle, {
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          rotation: `random(-180, 180)`,
          scale: `random(0.5, 1.5)`,
          duration: `random(4, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.1
        })
      })

      // Morphing background orbs
      gsap.utils.toArray('.morph-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' as any,
          x: `random(-50, 50)`,
          y: `random(-50, 50)`,
          rotation: 360,
          duration: 15 + i * 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Hero title animation with SplitText
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        gsap.from(titleSplit.chars, {
          y: 100,
          rotationX: -90,
          opacity: 0,
          duration: 1,
          ease: 'back.out(1.7)',
          stagger: {
            amount: 0.8,
            from: 'center'
          }
        })

        // Continuous color wave on title
        gsap.to(titleSplit.chars, {
          backgroundPosition: '200% center',
          duration: 3,
          repeat: -1,
          ease: 'linear',
          stagger: {
            amount: 1,
            repeat: -1
          }
        })
      }

      // Subtitle typewriter effect
      if (subtitleRef.current) {
        const originalText = subtitleRef.current.textContent
        subtitleRef.current.textContent = ''

        gsap.to(subtitleRef.current, {
          text: originalText,
          duration: 2,
          delay: 0.8,
          ease: 'none'
        })
      }

      // Solution cards with 3D flip entrance
      gsap.utils.toArray('.solution-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          rotationY: 0,
          scale: 1,
          duration: 0.8,
          delay: 1.2 + i * 0.2,
          ease: 'elasticPop',
          from: {
            rotationY: 90,
            scale: 0.5
          }
        })

        // Magnetic hover effect
        const magneticHover = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left - rect.width / 2
          const y = e.clientY - rect.top - rect.height / 2

          gsap.to(card, {
            x: x * 0.1,
            y: y * 0.1,
            rotationY: x * 0.05,
            rotationX: -y * 0.05,
            duration: 0.3,
            ease: 'power2.out'
          })
        }

        const magneticLeave = () => {
          gsap.to(card, {
            x: 0,
            y: 0,
            rotationY: 0,
            rotationX: 0,
            duration: 0.5,
            ease: 'elastic.out(1, 0.3)'
          })
        }

        card.addEventListener('mousemove', magneticHover)
        card.addEventListener('mouseleave', magneticLeave)
      })

      // Floating icons with MotionPath
      gsap.utils.toArray('.floating-icon').forEach((icon: any, i) => {
        const paths = [
          'M0,0 C50,-30 100,30 150,0 C200,-30 250,30 300,0',
          'M0,0 C30,50 -30,100 0,150 C30,200 -30,250 0,300',
          'M0,0 C-50,50 50,100 0,150 C50,200 -50,250 0,300'
        ]

        gsap.to(icon, {
          autoAlpha: 0.6,
          duration: 0.5,
          delay: 2 + i * 0.2
        })

        gsap.to(icon, {
          motionPath: {
            path: paths[i % paths.length],
            curviness: 1.5,
            autoRotate: true
          },
          duration: 8 + i * 2,
          repeat: -1,
          ease: 'none',
          delay: 2 + i * 0.2
        })
      })

      // Stat badges with wiggle entrance
      gsap.utils.toArray('.stat-badge').forEach((badge: any, i) => {
        gsap.to(badge, {
          autoAlpha: 1,
          scale: 1,
          rotation: 'cardWiggle',
          duration: 0.8,
          delay: 1.5 + i * 0.15,
          ease: 'elasticPop',
          from: {
            scale: 0,
            rotation: -15
          }
        })
      })

      // CTA button pulse
      gsap.to('.cta-btn', {
        scale: 1.02,
        boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2
      })

      // Scroll indicator bounce
      gsap.to('.scroll-indicator', {
        y: 15,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div ref={orbsRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="morph-orb absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 blur-3xl" />
        <div className="morph-orb absolute top-1/2 -right-32 w-80 h-80 bg-gradient-to-r from-amber-500/15 to-orange-600/15 blur-3xl" />
        <div className="morph-orb absolute -bottom-32 left-1/3 w-72 h-72 bg-gradient-to-r from-emerald-500/15 to-teal-600/15 blur-3xl" />
      </div>

      {/* Floating Particles */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 rounded-full bg-purple-500/30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Floating Icons */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="floating-icon absolute top-1/4 left-[10%] text-4xl opacity-0">🚀</div>
        <div className="floating-icon absolute top-1/3 right-[15%] text-3xl opacity-0">✨</div>
        <div className="floating-icon absolute bottom-1/3 left-[20%] text-4xl opacity-0">🎯</div>
        <div className="floating-icon absolute bottom-1/4 right-[10%] text-3xl opacity-0">💡</div>
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="stat-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 opacity-0">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">AI Solutions Platform</span>
          </div>

          <h1
            ref={titleRef}
            className="bg-[length:200%_auto] text-5xl md:text-7xl font-bold mb-4 leading-tight"
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Solutions Hub</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Discover comprehensive AI solutions designed to revolutionize your business operations and drive unprecedented growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/solutions/overview"
              className="cta-btn px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/25"
            >
              Explore All Solutions
            </Link>
            <Link
              href="/support/book-consultation"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              Book Consultation
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="scroll-indicator flex flex-col items-center gap-2 text-gray-500">
            <span className="text-sm">Scroll to explore</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Solutions Cards Section */}
      <div ref={cardsRef} className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {solutions.map((solution, index) => (
              <Link
                key={solution.title}
                href={solution.link}
                className="solution-card group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
              >
                {/* Card glow effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${solution.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`text-5xl p-4 rounded-2xl bg-gradient-to-r ${solution.color} bg-opacity-20`}>
                      {solution.icon}
                    </div>
                    <div className="stat-badge px-3 py-1 rounded-full bg-white/10 text-sm text-gray-300 opacity-0">
                      {solution.stats}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                    {solution.title}
                  </h3>

                  <p className="text-gray-400 leading-relaxed mb-6">
                    {solution.description}
                  </p>

                  <div className="flex items-center text-purple-400 font-medium group-hover:text-purple-300">
                    Explore Solution
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of companies already using Sanbay Fusion
          </p>
          <Link
            href="/overview/spaces"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
          >
            Get Started Today
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
