'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer, ScrambleTextPlugin } from '@/lib/gsap'

export default function SolutionsOverview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [activeFilter, setActiveFilter] = useState('all')

  const solutions = [
    {
      title: 'Enterprise AI',
      description: 'Comprehensive AI solutions for large-scale enterprise deployments',
      icon: '🏢',
      link: '/solutions/enterprise-ai',
      features: ['Scalable Infrastructure', 'Custom Integration', 'Enterprise Security'],
      category: 'enterprise',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      title: 'Process Automation',
      description: 'Automate complex business processes with intelligent AI workflows',
      icon: '⚡',
      link: '/solutions/process-automation',
      features: ['Workflow Designer', 'Smart Triggers', 'Process Analytics'],
      category: 'automation',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Smart Analytics',
      description: 'Transform data into actionable insights with AI-powered analytics',
      icon: '📊',
      link: '/solutions/smart-analytics',
      features: ['Real-time Dashboards', 'Predictive Modeling', 'Data Visualization'],
      category: 'analytics',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'AI Security',
      description: 'Protect your AI systems with advanced security and compliance features',
      icon: '🔒',
      link: '/solutions/ai-security',
      features: ['Threat Detection', 'Access Control', 'Audit Trails'],
      category: 'security',
      gradient: 'from-rose-500 to-pink-600'
    }
  ]

  const filters = [
    { id: 'all', label: 'All Solutions' },
    { id: 'enterprise', label: 'Enterprise' },
    { id: 'automation', label: 'Automation' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'security', label: 'Security' }
  ]

  const handleFilterChange = (filter: string) => {
    if (!gridRef.current) return

    const cards = gsap.utils.toArray('.solution-card') as HTMLElement[]
    const state = Flip.getState(cards)

    setActiveFilter(filter)

    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.6,
        ease: 'power2.inOut',
        stagger: 0.08,
        absolute: true,
        onEnter: (elements) => gsap.fromTo(elements, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.4 }),
        onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0, duration: 0.4 })
      })
    })
  }

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer, ScrambleTextPlugin)

    CustomWiggle.create('overviewWiggle', { type: 'uniform', wiggles: 4 })
    CustomEase.create('bounceOut', 'M0,0 C0.14,0.37 0.27,1.05 0.46,1.06 0.59,1.07 0.73,1 1,1')

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(['.solution-card', '.filter-btn', '.stat-card', '.feature-tag'], { autoAlpha: 0 })

      // Background mesh animation
      gsap.utils.toArray('.mesh-gradient').forEach((mesh: any, i) => {
        gsap.to(mesh, {
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          scale: `random(0.8, 1.3)`,
          rotation: 360,
          duration: 20 + i * 5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Floating geometric shapes
      gsap.utils.toArray('.geo-shape').forEach((shape: any, i) => {
        gsap.to(shape, {
          y: `random(-50, 50)`,
          x: `random(-30, 30)`,
          rotation: `random(-45, 45)`,
          duration: 4 + i,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3
        })
      })

      // Hero title with split chars
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        gsap.from(titleSplit.chars, {
          y: 80,
          rotationY: 90,
          opacity: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
          stagger: {
            amount: 0.6,
            from: 'random'
          }
        })

        // Shimmer effect
        titleSplit.chars.forEach((char, i) => {
          gsap.to(char, {
            backgroundPosition: '200% center',
            duration: 2,
            repeat: -1,
            ease: 'none',
            delay: i * 0.05
          })
        })
      }

      // Subtitle scramble text effect
      if (subtitleRef.current) {
        const originalText = subtitleRef.current.textContent || ''
        gsap.to(subtitleRef.current, {
          duration: 1.5,
          text: { value: originalText, scramble: 3, delimiter: ' ' },
          delay: 0.8,
          ease: 'none'
        })
      }

      // Filter buttons entrance
      gsap.to('.filter-btn', {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        delay: 1,
        ease: 'bounceOut',
        from: { y: 30, scale: 0.8 }
      })

      // Solution cards with 3D entrance
      gsap.utils.toArray('.solution-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          scale: 1,
          duration: 0.8,
          delay: 1.3 + i * 0.15,
          ease: 'bounceOut',
          from: { y: 60, rotationX: 15, scale: 0.9 }
        })

        // Card hover effects
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.03,
            y: -10,
            boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25)',
            duration: 0.3
          })
          gsap.to(card.querySelector('.card-icon'), {
            rotation: 360,
            scale: 1.2,
            duration: 0.5,
            ease: 'power2.out'
          })
          gsap.to(card.querySelectorAll('.feature-tag'), {
            scale: 1.05,
            stagger: 0.05,
            duration: 0.2
          })
        })

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            duration: 0.3
          })
          gsap.to(card.querySelector('.card-icon'), {
            rotation: 0,
            scale: 1,
            duration: 0.5
          })
          gsap.to(card.querySelectorAll('.feature-tag'), {
            scale: 1,
            stagger: 0.05,
            duration: 0.2
          })
        })
      })

      // Feature tags stagger entrance
      gsap.to('.feature-tag', {
        autoAlpha: 1,
        scale: 1,
        duration: 0.4,
        stagger: 0.05,
        delay: 1.8,
        ease: 'back.out(2)',
        from: { scale: 0 }
      })

      // Stat cards with counter animation
      gsap.utils.toArray('.stat-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          delay: 2 + i * 0.1,
          ease: 'power2.out',
          from: { y: 40 }
        })

        const number = card.querySelector('.stat-number')
        if (number) {
          const endValue = parseInt(number.dataset.value || '0')
          gsap.to({ val: 0 }, {
            val: endValue,
            duration: 2,
            delay: 2.2 + i * 0.1,
            ease: 'power2.out',
            onUpdate: function () {
              number.textContent = Math.round(this.targets()[0].val).toLocaleString()
            }
          })
        }
      })

      // Floating action button
      gsap.to('.floating-cta', {
        y: -10,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      })

      // ScrollTrigger for sections
      ScrollTrigger.batch('.scroll-reveal', {
        onEnter: (elements) => {
          gsap.from(elements, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out'
          })
        },
        start: 'top 85%'
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  const filteredSolutions = activeFilter === 'all'
    ? solutions
    : solutions.filter(s => s.category === activeFilter)

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="mesh-gradient absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl" />
        <div className="mesh-gradient absolute top-1/2 -right-40 w-[400px] h-[400px] bg-gradient-to-r from-amber-500/15 to-orange-600/15 rounded-full blur-3xl" />
        <div className="mesh-gradient absolute -bottom-40 left-1/3 w-[450px] h-[450px] bg-gradient-to-r from-emerald-500/10 to-teal-600/10 rounded-full blur-3xl" />
      </div>

      {/* Geometric shapes */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="geo-shape absolute top-[15%] left-[10%] w-20 h-20 border border-purple-500/20 rotate-45" />
        <div className="geo-shape absolute top-[25%] right-[15%] w-16 h-16 rounded-full border border-amber-500/20" />
        <div className="geo-shape absolute bottom-[30%] left-[20%] w-24 h-24 border border-emerald-500/20 rounded-lg rotate-12" />
        <div className="geo-shape absolute bottom-[20%] right-[10%] w-12 h-12 border-2 border-rose-500/20 rotate-45" />
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="filter-btn inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-8 opacity-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-sm font-medium text-purple-300">Complete Solutions Catalog</span>
          </div>

          <h1
            ref={titleRef}
            className="bg-[length:200%_auto] text-5xl md:text-7xl font-bold mb-4 leading-tight"
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Solutions</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Powerful AI solutions designed to transform your business operations, enhance productivity, and drive innovation across your organization.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/overview/spaces"
              className="filter-btn px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/25 opacity-0"
            >
              View Pricing
            </Link>
            <Link
              href="/support/book-consultation"
              className="filter-btn px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300 opacity-0"
            >
              Book Consultation
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="relative px-4 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`filter-btn px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 opacity-0 ${activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Solutions Grid */}
      <div ref={gridRef} className="relative px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredSolutions.map((solution) => (
              <Link
                key={solution.title}
                href={solution.link}
                className="solution-card group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-purple-500/30 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px' }}
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${solution.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />

                <div className="relative z-10">
                  <div className="flex items-start gap-6">
                    <div className={`card-icon text-5xl p-4 rounded-2xl bg-gradient-to-r ${solution.gradient} bg-opacity-20 transition-transform duration-500`}>
                      {solution.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                        {solution.title}
                      </h3>
                      <p className="text-gray-400 mb-4 leading-relaxed">
                        {solution.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {solution.features.map((feature) => (
                          <span
                            key={feature}
                            className="feature-tag px-3 py-1 text-sm bg-white/5 text-gray-300 rounded-full border border-white/10 opacity-0"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center text-purple-400 font-medium group-hover:text-purple-300">
                        Learn More
                        <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-24 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="scroll-reveal text-3xl md:text-4xl font-bold text-center text-white mb-16">
            Trusted by Industry Leaders
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500', suffix: '+', label: 'Enterprise Clients' },
              { value: '99', suffix: '%', label: 'Uptime Guarantee' },
              { value: '40', suffix: '%', label: 'Cost Reduction' },
              { value: '24', suffix: '/7', label: 'Support Available' }
            ].map((stat, i) => (
              <div key={stat.label} className="stat-card text-center p-6 bg-white/5 rounded-2xl border border-white/10 opacity-0">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <span className="stat-number" data-value={stat.value}>0</span>
                  <span className="text-purple-400">{stat.suffix}</span>
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="scroll-reveal relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-3xl p-12 border border-purple-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Choose the perfect solution for your business and start your AI transformation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/overview/spaces"
                className="floating-cta px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/25"
              >
                View All Pricing Plans
              </Link>
              <Link
                href="/support/contact-us"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
