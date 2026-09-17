'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap'

export default function ProcessAutomation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const workflowRef = useRef<HTMLDivElement>(null)
  const [activeWorkflow, setActiveWorkflow] = useState(0)

  const features = [
    {
      title: 'Workflow Designer',
      description: 'Visual drag-and-drop interface for creating complex automation workflows',
      icon: '🔄',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Smart Triggers',
      description: 'AI-powered triggers that adapt to changing business conditions',
      icon: '⚡',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      title: 'Process Analytics',
      description: 'Real-time insights into process performance and optimization opportunities',
      icon: '📈',
      gradient: 'from-emerald-500 to-teal-600'
    }
  ]

  const workflows = [
    { name: 'Customer Onboarding', time: '45 min → 5 min', savings: '89%' },
    { name: 'Invoice Processing', time: '2 hours → 10 min', savings: '92%' },
    { name: 'Report Generation', time: '1 day → 30 min', savings: '97%' },
    { name: 'Data Entry', time: '4 hours → 15 min', savings: '94%' }
  ]

  const automationSteps = [
    { icon: '📥', title: 'Input', desc: 'Receive data from any source' },
    { icon: '🤖', title: 'Process', desc: 'AI analyzes and transforms' },
    { icon: '✅', title: 'Validate', desc: 'Smart validation checks' },
    { icon: '📤', title: 'Output', desc: 'Deliver to any destination' }
  ]

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer)

    CustomWiggle.create('automationWiggle', { type: 'easeInOut', wiggles: 6 })
    CustomEase.create('automationBounce', 'M0,0 C0.2,0.6 0.35,1.15 0.5,1.05 0.65,0.95 0.8,1 1,1')

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(['.feature-card', '.workflow-item', '.step-node', '.stat-circle', '.floating-gear'], { autoAlpha: 0 })

      // Background gears rotation
      gsap.utils.toArray('.floating-gear').forEach((gear: any, i) => {
        gsap.to(gear, {
          autoAlpha: 0.15,
          duration: 1,
          delay: i * 0.2
        })
        gsap.to(gear, {
          rotation: i % 2 === 0 ? 360 : -360,
          duration: 20 + i * 5,
          repeat: -1,
          ease: 'none'
        })
      })

      // Background orbs
      gsap.utils.toArray('.auto-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          scale: `random(0.7, 1.4)`,
          borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '60% 40% 30% 70% / 60% 30% 70% 40%'],
          duration: 15 + i * 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Data flow particles
      gsap.utils.toArray('.data-particle').forEach((particle: any) => {
        gsap.to(particle, {
          motionPath: {
            path: [
              { x: 0, y: 0 },
              { x: 100, y: -50 },
              { x: 200, y: 0 },
              { x: 300, y: 50 },
              { x: 400, y: 0 }
            ],
            curviness: 1.5
          },
          opacity: [0, 1, 1, 1, 0],
          duration: 4,
          repeat: -1,
          ease: 'none',
          delay: Math.random() * 4
        })
      })

      // Hero title with split and wave
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        gsap.from(titleSplit.chars, {
          y: 100,
          rotationX: -90,
          opacity: 0,
          duration: 0.8,
          ease: 'automationBounce',
          stagger: {
            amount: 0.6,
            from: 'start'
          }
        })

        // Wave animation on chars
        gsap.to(titleSplit.chars, {
          y: -10,
          duration: 1.5,
          stagger: {
            amount: 1,
            from: 'start',
            repeat: -1,
            yoyo: true
          },
          ease: 'sine.inOut',
          delay: 1
        })
      }

      // Subtitle typing effect
      if (subtitleRef.current) {
        const text = subtitleRef.current.textContent || ''
        subtitleRef.current.textContent = ''
        gsap.to(subtitleRef.current, {
          text: text,
          duration: 2,
          delay: 0.8,
          ease: 'none'
        })
      }

      // Feature cards with staggered entrance
      gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          rotationY: 0,
          duration: 0.7,
          delay: 1.2 + i * 0.2,
          ease: 'automationBounce',
          from: { y: 80, rotationY: 30 }
        })

        // Hover animation
        const icon = card.querySelector('.card-icon')

        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.05,
            y: -15,
            boxShadow: '0 30px 60px -15px rgba(245, 158, 11, 0.3)',
            duration: 0.3
          })
          gsap.to(icon, {
            rotation: 360,
            scale: 1.3,
            duration: 0.6,
            ease: 'back.out(1.7)'
          })
        })

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            duration: 0.3
          })
          gsap.to(icon, {
            rotation: 0,
            scale: 1,
            duration: 0.6
          })
        })
      })

      // Workflow items with Flip animation
      gsap.utils.toArray('.workflow-item').forEach((item: any, i) => {
        gsap.to(item, {
          autoAlpha: 1,
          x: 0,
          duration: 0.6,
          delay: 0.2 + i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%'
          }
        })
      })

      // Step nodes with connected animation
      const stepNodes = gsap.utils.toArray('.step-node') as HTMLElement[]
      const connectorLine = document.querySelector('.connector-line')

      stepNodes.forEach((node, i) => {
        gsap.to(node, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.5,
          delay: 0.3 + i * 0.2,
          ease: 'back.out(2)',
          scrollTrigger: {
            trigger: workflowRef.current,
            start: 'top 70%'
          }
        })

        // Pulse effect on nodes
        gsap.to(node.querySelector('.node-pulse'), {
          scale: 1.5,
          opacity: 0,
          duration: 1.5,
          repeat: -1,
          delay: i * 0.3,
          ease: 'power1.out'
        })
      })

      if (connectorLine) {
        gsap.from(connectorLine, {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: workflowRef.current,
            start: 'top 70%'
          }
        })
      }

      // Stat circles with counter
      gsap.utils.toArray('.stat-circle').forEach((circle: any, i) => {
        const progressRing = circle.querySelector('.progress-ring')
        const valueEl = circle.querySelector('.stat-value')
        const targetValue = parseInt(circle.dataset.value || '0')

        gsap.to(circle, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.6,
          delay: i * 0.15,
          ease: 'automationBounce',
          scrollTrigger: {
            trigger: circle,
            start: 'top 85%'
          }
        })

        if (progressRing) {
          const circumference = 2 * Math.PI * 45
          progressRing.style.strokeDasharray = circumference
          progressRing.style.strokeDashoffset = circumference

          gsap.to(progressRing, {
            strokeDashoffset: circumference - (targetValue / 100) * circumference,
            duration: 2,
            delay: 0.3 + i * 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: circle,
              start: 'top 85%'
            }
          })
        }

        if (valueEl) {
          gsap.to({ val: 0 }, {
            val: targetValue,
            duration: 2,
            delay: 0.3 + i * 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: circle,
              start: 'top 85%'
            },
            onUpdate: function () {
              valueEl.textContent = Math.round(this.targets()[0].val) + '%'
            }
          })
        }
      })

      // Auto-rotate workflow showcase
      const rotateWorkflow = () => {
        setActiveWorkflow(prev => (prev + 1) % workflows.length)
      }
      const workflowInterval = setInterval(rotateWorkflow, 3000)

      // CTA button animation
      gsap.to('.cta-arrow', {
        x: 5,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      })

      gsap.to('.pulse-btn', {
        boxShadow: '0 0 40px rgba(245, 158, 11, 0.4)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })

      return () => clearInterval(workflowInterval)

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="auto-orb absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-r from-amber-500/15 to-orange-600/15 blur-3xl" />
        <div className="auto-orb absolute top-1/2 -right-32 w-[400px] h-[400px] bg-gradient-to-r from-purple-500/10 to-indigo-600/10 blur-3xl" />
        <div className="auto-orb absolute -bottom-32 left-1/4 w-[350px] h-[350px] bg-gradient-to-r from-emerald-500/10 to-teal-600/10 blur-3xl" />
      </div>

      {/* Floating Gears */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="floating-gear absolute top-[10%] left-[5%] text-6xl opacity-0">⚙️</div>
        <div className="floating-gear absolute top-[20%] right-[10%] text-5xl opacity-0">⚙️</div>
        <div className="floating-gear absolute bottom-[30%] left-[15%] text-4xl opacity-0">⚙️</div>
        <div className="floating-gear absolute bottom-[15%] right-[5%] text-7xl opacity-0">⚙️</div>
      </div>

      {/* Data Flow Particles */}
      <div className="fixed top-1/2 left-0 w-full pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="data-particle absolute w-2 h-2 rounded-full bg-amber-400"
            style={{ top: `${i * 20}px` }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-sm font-medium text-amber-300">Intelligent Automation</span>
          </div>

          <h1
            ref={titleRef}
            className="bg-[length:200%_auto] text-5xl md:text-7xl font-bold mb-4 leading-tight"
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Process Automation</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Automate complex business processes with intelligent AI workflows that adapt, learn, and optimize over time to maximize efficiency and reduce manual work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://maula.ai/agents"
              className="pulse-btn px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              Try Automation Agents
              <svg className="cta-arrow w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/resources/tutorials"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              View Tutorials
            </Link>
          </div>
        </div>
      </div>

      {/* Workflow Showcase */}
      <div className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-3xl p-8 border border-amber-500/20">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Automation Impact</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {workflows.map((workflow, i) => (
                <div
                  key={workflow.name}
                  className={`workflow-item p-4 rounded-xl cursor-pointer transition-all duration-300 opacity-0 ${activeWorkflow === i
                    ? 'bg-amber-500/20 border-2 border-amber-500/50 scale-105'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  onClick={() => setActiveWorkflow(i)}
                  style={{ transform: 'translateX(-20px)' }}
                >
                  <div className="text-sm text-gray-400 mb-1">{workflow.name}</div>
                  <div className="text-xs text-gray-500 mb-2">{workflow.time}</div>
                  <div className="text-2xl font-bold text-amber-400">{workflow.savings}</div>
                  <div className="text-xs text-gray-500">Time Saved</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Powerful Automation Features
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to automate any business process
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:border-amber-500/30 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px' }}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />

                <div className="relative z-10">
                  <div className={`card-icon inline-flex text-5xl p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} bg-opacity-20 mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-amber-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automation Flow Diagram */}
      <div ref={workflowRef} className="relative py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16">
            Simple four-step automation pipeline
          </p>

          <div className="relative">
            {/* Connector line */}
            <div className="connector-line absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform -translate-y-1/2 hidden md:block" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {automationSteps.map((step, i) => (
                <div
                  key={step.title}
                  className="step-node relative text-center opacity-0"
                  style={{ transform: 'scale(0.5)' }}
                >
                  {/* Pulse ring */}
                  <div className="node-pulse absolute inset-0 rounded-full bg-amber-500/20 z-0" />

                  <div className="relative z-10 w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-2 border-amber-500/50 flex items-center justify-center text-4xl">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
            Automation Results
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 90, label: 'Faster Processing' },
              { value: 85, label: 'Error Reduction' },
              { value: 70, label: 'Cost Savings' },
              { value: 95, label: 'User Satisfaction' }
            ].map((stat) => (
              <div
                key={stat.label}
                className="stat-circle relative text-center opacity-0"
                data-value={stat.value}
                style={{ transform: 'scale(0.8)' }}
              >
                <svg className="w-28 h-28 mx-auto mb-4 -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="45"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    className="progress-ring"
                    cx="56"
                    cy="56"
                    r="45"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="stat-value absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[-12px] text-2xl font-bold text-white">
                  0%
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-3xl p-12 border border-amber-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Start Automating Today
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              See how much time and money you can save with AI automation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://maula.ai/agents"
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-semibold text-lg transition-all duration-300"
              >
                Explore Automation Agents
              </Link>
              <Link
                href="/overview/spaces"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="relative py-12 px-4 text-center">
        <Link
          href="/solutions/overview"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Solutions
        </Link>
      </div>
    </div>
  )
}
