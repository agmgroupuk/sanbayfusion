'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap'

export default function EnterpriseAI() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const features = [
    {
      title: 'Scalable Infrastructure',
      description: 'Deploy AI agents across thousands of endpoints with enterprise-grade scalability',
      icon: '🏗️',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      title: 'Custom Integration',
      description: 'Seamlessly integrate with existing enterprise systems and workflows',
      icon: '🔗',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Advanced Security',
      description: 'Enterprise-grade security with SSO, RBAC, and compliance controls',
      icon: '🛡️',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Dedicated Support',
      description: '24/7 dedicated support with guaranteed SLA and response times',
      icon: '🎧',
      gradient: 'from-amber-500 to-orange-600'
    }
  ]

  const benefits = [
    { text: 'Reduce operational costs by up to 40%', value: 40 },
    { text: 'Improve customer satisfaction by 35%', value: 35 },
    { text: 'Accelerate decision-making processes', value: 80 },
    { text: 'Scale AI capabilities across departments', value: 100 },
    { text: 'Maintain compliance and security standards', value: 99 }
  ]

  const deploymentSteps = [
    { step: 1, title: 'Discovery', desc: 'Analyze your infrastructure', duration: '1-2 weeks' },
    { step: 2, title: 'Planning', desc: 'Custom deployment strategy', duration: '1 week' },
    { step: 3, title: 'Integration', desc: 'Seamless system integration', duration: '2-4 weeks' },
    { step: 4, title: 'Training', desc: 'Team onboarding & training', duration: '1-2 weeks' },
    { step: 5, title: 'Launch', desc: 'Go live with full support', duration: 'Ongoing' }
  ]

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer)

    CustomWiggle.create('enterpriseWiggle', { type: 'anticipate', wiggles: 5 })
    CustomEase.create('enterpriseBounce', 'M0,0 C0.14,0.55 0.27,1.18 0.44,1.08 0.58,0.99 0.75,1 1,1')

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(['.feature-card', '.benefit-item', '.timeline-item', '.stat-box', '.floating-badge'], { autoAlpha: 0 })

      // Background animations
      gsap.utils.toArray('.enterprise-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          x: `random(-80, 80)`,
          y: `random(-80, 80)`,
          scale: `random(0.8, 1.4)`,
          rotation: i % 2 === 0 ? 360 : -360,
          borderRadius: ['40% 60% 60% 40% / 60% 30% 70% 40%', '60% 40% 30% 70% / 40% 60% 40% 60%'],
          duration: 18 + i * 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Particle field
      gsap.utils.toArray('.particle-dot').forEach((dot: any) => {
        gsap.to(dot, {
          x: `random(-150, 150)`,
          y: `random(-150, 150)`,
          opacity: `random(0.2, 0.8)`,
          scale: `random(0.5, 2)`,
          duration: `random(5, 12)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Hero title animation
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        // 3D flip entrance
        gsap.from(titleSplit.chars, {
          rotationY: 180,
          opacity: 0,
          scale: 0.5,
          y: 50,
          duration: 0.9,
          ease: 'enterpriseBounce',
          stagger: {
            amount: 0.7,
            from: 'edges'
          }
        })

        // Continuous glow effect
        gsap.to(titleSplit.words, {
          textShadow: '0 0 40px rgba(168, 85, 247, 0.6)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          stagger: 0.2,
          ease: 'sine.inOut'
        })
      }

      // Subtitle typewriter
      if (subtitleRef.current) {
        const text = subtitleRef.current.textContent || ''
        subtitleRef.current.textContent = ''
        gsap.to(subtitleRef.current, {
          text: text,
          duration: 2.5,
          delay: 0.8,
          ease: 'none'
        })
      }

      // Floating badges entrance with wiggle
      gsap.to('.floating-badge', {
        autoAlpha: 1,
        y: 0,
        rotation: 'enterpriseWiggle',
        duration: 0.8,
        stagger: 0.15,
        delay: 1.2,
        ease: 'enterpriseBounce',
        from: { y: 30 }
      })

      // Feature cards with 3D reveal
      gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          rotationY: 0,
          rotationX: 0,
          y: 0,
          duration: 0.8,
          delay: 1.5 + i * 0.15,
          ease: 'enterpriseBounce',
          from: { rotationY: 45, rotationX: 15, y: 50 }
        })

        // Icon spin on hover
        const icon = card.querySelector('.feature-icon')
        const contentItems = card.querySelectorAll('.feature-content')

        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.05, y: -10, duration: 0.3, ease: 'power2.out' })
          gsap.to(icon, { rotation: 360, scale: 1.2, duration: 0.6, ease: 'back.out(1.7)' })
          gsap.to(contentItems, { x: 5, stagger: 0.05, duration: 0.2 })
        })

        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, duration: 0.3 })
          gsap.to(icon, { rotation: 0, scale: 1, duration: 0.6 })
          gsap.to(contentItems, { x: 0, stagger: 0.05, duration: 0.2 })
        })
      })

      // Benefits with progress bars
      gsap.utils.toArray('.benefit-item').forEach((item: any, i) => {
        const progressBar = item.querySelector('.progress-fill')
        const valueEl = item.querySelector('.progress-value')
        const targetValue = parseInt(item.dataset.value || '0')

        gsap.to(item, {
          autoAlpha: 1,
          x: 0,
          duration: 0.6,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%'
          }
        })

        if (progressBar) {
          gsap.to(progressBar, {
            width: `${targetValue}%`,
            duration: 1.5,
            delay: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%'
            }
          })
        }

        if (valueEl) {
          gsap.to({ val: 0 }, {
            val: targetValue,
            duration: 1.5,
            delay: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%'
            },
            onUpdate: function () {
              valueEl.textContent = Math.round(this.targets()[0].val) + '%'
            }
          })
        }
      })

      // Timeline items with connected line animation
      const timelineItems = gsap.utils.toArray('.timeline-item') as HTMLElement[]
      const timelineLine = document.querySelector('.timeline-line')

      if (timelineLine) {
        gsap.from(timelineLine, {
          scaleY: 0,
          transformOrigin: 'top',
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top 70%'
          }
        })
      }

      timelineItems.forEach((item, i) => {
        const dot = item.querySelector('.timeline-dot')
        const content = item.querySelector('.timeline-content')

        gsap.to(item, {
          autoAlpha: 1,
          duration: 0.5,
          delay: 0.3 + i * 0.2,
          scrollTrigger: {
            trigger: item,
            start: 'top 80%'
          }
        })

        if (dot) {
          gsap.from(dot, {
            scale: 0,
            duration: 0.5,
            delay: 0.3 + i * 0.2,
            ease: 'back.out(2)',
            scrollTrigger: {
              trigger: item,
              start: 'top 80%'
            }
          })
        }

        if (content) {
          gsap.from(content, {
            x: i % 2 === 0 ? -50 : 50,
            opacity: 0,
            duration: 0.6,
            delay: 0.5 + i * 0.2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 80%'
            }
          })
        }
      })

      // Stats boxes with counter
      gsap.utils.toArray('.stat-box').forEach((box: any, i) => {
        const number = box.querySelector('.stat-number')
        const endValue = parseInt(number?.dataset?.value || '0')

        gsap.to(box, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          delay: i * 0.1,
          ease: 'enterpriseBounce',
          scrollTrigger: {
            trigger: box,
            start: 'top 85%'
          }
        })

        if (number) {
          gsap.to({ val: 0 }, {
            val: endValue,
            duration: 2,
            delay: 0.3 + i * 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: box,
              start: 'top 85%'
            },
            onUpdate: function () {
              number.textContent = Math.round(this.targets()[0].val).toLocaleString()
            }
          })
        }
      })

      // CTA button magnetic effect
      const ctaBtn = document.querySelector('.magnetic-cta') as HTMLElement
      if (ctaBtn) {
        ctaBtn.addEventListener('mousemove', (e) => {
          const rect = ctaBtn.getBoundingClientRect()
          const x = e.clientX - rect.left - rect.width / 2
          const y = e.clientY - rect.top - rect.height / 2
          gsap.to(ctaBtn, { x: x * 0.2, y: y * 0.2, duration: 0.3 })
        })
        ctaBtn.addEventListener('mouseleave', () => {
          gsap.to(ctaBtn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
        })
      }

      // Floating CTA pulse
      gsap.to('.pulse-cta', {
        boxShadow: '0 0 40px rgba(168, 85, 247, 0.5)',
        scale: 1.02,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="enterprise-orb absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/20 to-indigo-600/20 blur-3xl" />
        <div className="enterprise-orb absolute top-1/3 -right-32 w-[400px] h-[400px] bg-gradient-to-r from-blue-500/15 to-cyan-600/15 blur-3xl" />
        <div className="enterprise-orb absolute -bottom-32 left-1/4 w-[350px] h-[350px] bg-gradient-to-r from-emerald-500/10 to-teal-600/10 blur-3xl" />
      </div>

      {/* Particle field */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="particle-dot absolute w-1 h-1 rounded-full bg-purple-400/40"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Floating badges */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <div className="floating-badge px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-300 text-sm opacity-0">
              🏆 Enterprise Grade
            </div>
            <div className="floating-badge px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-300 text-sm opacity-0">
              🔒 SOC 2 Compliant
            </div>
            <div className="floating-badge px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-300 text-sm opacity-0">
              ⚡ 99.9% Uptime SLA
            </div>
          </div>

          <h1
            ref={titleRef}
            className="bg-[length:200%_auto] text-5xl md:text-7xl font-bold mb-4 leading-tight"
            style={{ perspective: '1000px' }}
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Enterprise AI Solutions</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Deploy AI at enterprise scale with our comprehensive platform designed for large organizations requiring advanced security, compliance, and scalability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/support/book-consultation"
              className="magnetic-cta pulse-cta px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-purple-500/25"
            >
              Schedule Enterprise Demo
            </Link>
            <Link
              href="/overview"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              View Enterprise Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '500', suffix: '+', label: 'Enterprise Clients' },
              { value: '40', suffix: '%', label: 'Cost Reduction' },
              { value: '99', suffix: '.9%', label: 'Uptime SLA' },
              { value: '24', suffix: '/7', label: 'Premium Support' }
            ].map((stat) => (
              <div key={stat.label} className="stat-box text-center p-6 bg-white/5 rounded-2xl border border-white/10 opacity-0">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <span className="stat-number" data-value={stat.value}>0</span>
                  <span className="text-purple-400">{stat.suffix}</span>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div ref={featuresRef} className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-white mb-4">
            Enterprise-Grade Features
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Built for the demands of large organizations
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-purple-500/30 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />

                <div className="relative z-10">
                  <div className={`feature-icon inline-flex text-5xl p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} bg-opacity-20 mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="feature-content text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="feature-content text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div ref={benefitsRef} className="relative py-24 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Proven Enterprise Results
              </h2>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Our enterprise clients see measurable improvements in efficiency, customer satisfaction, and operational costs within the first quarter.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div
                    key={benefit.text}
                    className="benefit-item opacity-0"
                    data-value={benefit.value}
                    style={{ transform: 'translateX(-30px)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">{benefit.text}</span>
                      <span className="progress-value text-purple-400 font-bold">0%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="progress-fill h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-3xl p-8 border border-purple-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Ready to Transform?</h3>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Free enterprise consultation
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom deployment plan
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dedicated success manager
                </div>
              </div>
              <Link
                href="/support/book-consultation"
                className="block w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-center hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
              >
                Schedule Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Timeline */}
      <div ref={timelineRef} className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Enterprise Deployment Journey
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16">
            From discovery to launch in 6-8 weeks
          </p>

          <div className="relative">
            {/* Timeline line */}
            <div className="timeline-line absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-purple-500 to-indigo-600" />

            <div className="space-y-12">
              {deploymentSteps.map((step, i) => (
                <div
                  key={step.step}
                  className={`timeline-item relative flex items-center opacity-0 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Dot */}
                  <div className="timeline-dot absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 border-4 border-[#0d0d12] z-10" />

                  {/* Content */}
                  <div className={`timeline-content w-5/12 ${i % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <div className="text-purple-400 font-bold mb-1">Step {step.step}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-400 mb-2">{step.desc}</p>
                      <span className="text-sm text-gray-500">{step.duration}</span>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="w-5/12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="relative py-12 px-4 text-center">
        <Link
          href="/solutions/overview"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
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
