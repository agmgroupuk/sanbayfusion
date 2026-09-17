'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap'

export default function SmartAnalytics() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [activeMetric, setActiveMetric] = useState(0)

  const features = [
    {
      title: 'Real-time Dashboards',
      description: 'Interactive dashboards with live data visualization and instant updates',
      icon: '📊',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Predictive Modeling',
      description: 'Advanced AI models that forecast future trends and business outcomes',
      icon: '🔮',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      title: 'Data Visualization',
      description: 'Beautiful, interactive charts and comprehensive reports',
      icon: '📈',
      gradient: 'from-blue-500 to-cyan-600'
    }
  ]

  const metrics = [
    { name: 'Revenue', value: 2450000, change: '+12.5%', positive: true },
    { name: 'Users', value: 185000, change: '+28.3%', positive: true },
    { name: 'Conversion', value: 4.8, change: '+0.6%', positive: true },
    { name: 'Churn', value: 2.1, change: '-0.8%', positive: true }
  ]

  const chartData = [
    { month: 'Jan', value: 45 },
    { month: 'Feb', value: 52 },
    { month: 'Mar', value: 48 },
    { month: 'Apr', value: 65 },
    { month: 'May', value: 72 },
    { month: 'Jun', value: 85 },
    { month: 'Jul', value: 78 },
    { month: 'Aug', value: 92 }
  ]

  const insights = [
    { icon: '🎯', title: 'Accuracy', value: '98.5%', desc: 'Prediction accuracy' },
    { icon: '⚡', title: 'Speed', value: '< 1s', desc: 'Query response' },
    { icon: '🔄', title: 'Real-time', value: '24/7', desc: 'Data processing' },
    { icon: '📊', title: 'Sources', value: '50+', desc: 'Data integrations' }
  ]

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer)

    CustomWiggle.create('analyticsWiggle', { type: 'uniform', wiggles: 4 })
    CustomEase.create('analyticsBounce', 'M0,0 C0.15,0.5 0.25,1.1 0.45,1.08 0.6,1.05 0.75,1 1,1')

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(['.feature-card', '.metric-card', '.chart-bar', '.insight-box', '.data-point'], { autoAlpha: 0 })

      // Background animated gradients
      gsap.utils.toArray('.analytics-orb').forEach((orb: any, i) => {
        gsap.to(orb, {
          x: `random(-120, 120)`,
          y: `random(-120, 120)`,
          scale: `random(0.7, 1.5)`,
          rotation: 360,
          borderRadius: ['40% 60% 60% 40% / 60% 30% 70% 40%', '60% 40% 30% 70% / 40% 60% 40% 60%'],
          duration: 20 + i * 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Data points floating animation
      gsap.utils.toArray('.data-point').forEach((point: any, i) => {
        gsap.to(point, {
          autoAlpha: `random(0.3, 0.7)`,
          duration: 0.5,
          delay: i * 0.1
        })
        gsap.to(point, {
          y: `random(-30, 30)`,
          x: `random(-20, 20)`,
          scale: `random(0.8, 1.2)`,
          duration: `random(3, 6)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })
      })

      // Grid lines animation
      gsap.utils.toArray('.grid-line').forEach((line: any, i) => {
        gsap.from(line, {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 0.8,
          delay: 0.5 + i * 0.1,
          ease: 'power2.out'
        })
      })

      // Hero title with split
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })

        gsap.from(titleSplit.chars, {
          y: 80,
          rotationZ: gsap.utils.random(-15, 15, true),
          opacity: 0,
          duration: 0.7,
          ease: 'analyticsBounce',
          stagger: {
            amount: 0.5,
            from: 'random'
          }
        })

        // Shimmer effect
        gsap.to(titleSplit.chars, {
          backgroundPosition: '200% center',
          duration: 3,
          repeat: -1,
          stagger: {
            amount: 1.5,
            repeat: -1
          },
          ease: 'none'
        })
      }

      // Subtitle typewriter
      if (subtitleRef.current) {
        const text = subtitleRef.current.textContent || ''
        subtitleRef.current.textContent = ''
        gsap.to(subtitleRef.current, {
          text: text,
          duration: 2.5,
          delay: 0.7,
          ease: 'none'
        })
      }

      // Metric cards with counter animation
      gsap.utils.toArray('.metric-card').forEach((card: any, i) => {
        const valueEl = card.querySelector('.metric-value')
        const targetValue = parseFloat(card.dataset.value || '0')
        const isDecimal = targetValue < 100
        const format = card.dataset.format || 'number'

        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          duration: 0.6,
          delay: 1 + i * 0.15,
          ease: 'analyticsBounce',
          from: { y: 50, rotationX: 20 }
        })

        if (valueEl) {
          gsap.to({ val: 0 }, {
            val: targetValue,
            duration: 2,
            delay: 1.3 + i * 0.15,
            ease: 'power2.out',
            onUpdate: function () {
              const v = this.targets()[0].val
              if (format === 'currency') {
                valueEl.textContent = '$' + Math.round(v).toLocaleString()
              } else if (format === 'decimal') {
                valueEl.textContent = v.toFixed(1) + '%'
              } else {
                valueEl.textContent = Math.round(v).toLocaleString()
              }
            }
          })
        }

        // Hover effect
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.05, y: -10, duration: 0.3 })
          gsap.to(card.querySelector('.metric-icon'), { rotation: 360, duration: 0.6 })
        })
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, duration: 0.3 })
        })
      })

      // Chart bars animation
      gsap.utils.toArray('.chart-bar').forEach((bar: any, i) => {
        const height = bar.dataset.height || '50'

        gsap.to(bar, {
          autoAlpha: 1,
          height: `${height}%`,
          duration: 1,
          delay: 0.3 + i * 0.1,
          ease: 'elastic.out(1, 0.5)',
          scrollTrigger: {
            trigger: chartRef.current,
            start: 'top 75%'
          }
        })
      })

      // Feature cards with 3D flip
      gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          rotationY: 0,
          scale: 1,
          duration: 0.7,
          delay: 0.2 + i * 0.15,
          ease: 'analyticsBounce',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          }
        })

        const icon = card.querySelector('.card-icon')

        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.05,
            y: -15,
            boxShadow: '0 30px 60px -15px rgba(16, 185, 129, 0.25)',
            duration: 0.3
          })
          gsap.to(icon, {
            rotationY: 360,
            scale: 1.2,
            duration: 0.6,
            ease: 'back.out(1.7)'
          })
        })
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, boxShadow: 'none', duration: 0.3 })
          gsap.to(icon, { rotationY: 0, scale: 1, duration: 0.6 })
        })
      })

      // Insight boxes with stagger
      gsap.utils.toArray('.insight-box').forEach((box: any, i) => {
        gsap.to(box, {
          autoAlpha: 1,
          y: 0,
          rotation: 0,
          duration: 0.5,
          delay: 0.2 + i * 0.1,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: box,
            start: 'top 85%'
          }
        })

        // Pulse animation on icon
        const icon = box.querySelector('.insight-icon')
        gsap.to(icon, {
          scale: 1.1,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        })
      })

      // Live data simulation
      const updateMetric = () => {
        setActiveMetric(prev => (prev + 1) % metrics.length)
      }
      const metricInterval = setInterval(updateMetric, 2500)

      // CTA pulse
      gsap.to('.pulse-cta', {
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
        scale: 1.02,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })

      return () => clearInterval(metricInterval)

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="analytics-orb absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-r from-emerald-500/15 to-teal-600/15 blur-3xl" />
        <div className="analytics-orb absolute top-1/2 -right-40 w-[400px] h-[400px] bg-gradient-to-r from-blue-500/10 to-cyan-600/10 blur-3xl" />
        <div className="analytics-orb absolute -bottom-40 left-1/3 w-[350px] h-[350px] bg-gradient-to-r from-purple-500/10 to-indigo-600/10 blur-3xl" />
      </div>

      {/* Data Points */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="data-point absolute w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Grid Lines Background */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
            style={{ top: `${(i + 1) * 10}%` }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-300">AI-Powered Analytics</span>
          </div>

          <h1
            ref={titleRef}
            className="bg-[length:200%_auto] text-5xl md:text-7xl font-bold mb-4 leading-tight"
          >
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Smart Analytics</span>
          </h1>

          <p
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Transform raw data into actionable insights with AI-powered analytics that predict trends, identify opportunities, and provide real-time business intelligence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/overview"
              className="pulse-cta px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/25"
            >
              View Analytics Dashboard
            </Link>
            <Link
              href="/resources/case-studies"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              See Examples
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard Preview */}
      <div className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, i) => (
              <div
                key={metric.name}
                className={`metric-card relative p-6 bg-white/5 rounded-2xl border transition-all duration-500 opacity-0 ${activeMetric === i ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'
                  }`}
                data-value={metric.value}
                data-format={metric.name === 'Revenue' ? 'currency' : metric.name === 'Conversion' || metric.name === 'Churn' ? 'decimal' : 'number'}
                style={{ perspective: '1000px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{metric.name}</span>
                  <span className={`metric-icon text-xs px-2 py-1 rounded-full ${metric.positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                    {metric.change}
                  </span>
                </div>
                <div className="metric-value text-2xl md:text-3xl font-bold text-white">
                  0
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Chart */}
      <div ref={chartRef} className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Performance Trends
          </h2>

          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            <div className="flex items-end justify-between h-64 gap-4">
              {chartData.map((data, i) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-full flex items-end">
                    <div
                      className="chart-bar w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg opacity-0"
                      data-height={data.value}
                      style={{ height: 0 }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
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
            Analytics Features
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Everything you need for data-driven decisions
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:border-emerald-500/30 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px', transformStyle: 'preserve-3d', transform: 'rotateY(45deg) scale(0.9)' }}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />

                <div className="relative z-10">
                  <div className={`card-icon inline-flex text-5xl p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} bg-opacity-20 mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-emerald-300 transition-colors">
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

      {/* Insights Grid */}
      <div className="relative py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
            Platform Capabilities
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {insights.map((insight, i) => (
              <div
                key={insight.title}
                className="insight-box text-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300 opacity-0"
                style={{ transform: 'translateY(30px) rotate(-5deg)' }}
              >
                <div className="insight-icon text-4xl mb-4">{insight.icon}</div>
                <div className="text-3xl font-bold text-emerald-400 mb-1">{insight.value}</div>
                <div className="text-sm text-gray-400">{insight.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-3xl p-12 border border-emerald-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Unlock Data-Driven Growth
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Start making smarter decisions with AI-powered analytics
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard/overview"
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white font-semibold text-lg transition-all duration-300"
              >
                Try Analytics Dashboard
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
          className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
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
