'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomWiggle, CustomEase, ScrollToPlugin, Observer } from '@/lib/gsap'

export default function AISecurity() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const shieldRef = useRef<HTMLDivElement>(null)
  const [threatLevel, setThreatLevel] = useState(0)

  const features = [
    {
      title: 'Threat Detection',
      description: 'AI-powered security monitoring and real-time threat identification',
      icon: '🛡️',
      gradient: 'from-rose-500 to-pink-600'
    },
    {
      title: 'Access Control',
      description: 'Role-based access control with enterprise SSO integration',
      icon: '🔐',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      title: 'Audit Trails',
      description: 'Comprehensive logging and compliance reporting for all activities',
      icon: '📋',
      gradient: 'from-blue-500 to-cyan-600'
    }
  ]

  const securityLayers = [
    { name: 'Network Security', status: 'Active', icon: '🌐' },
    { name: 'Application Firewall', status: 'Active', icon: '🔥' },
    { name: 'Data Encryption', status: 'AES-256', icon: '🔒' },
    { name: 'Identity Management', status: 'SSO/MFA', icon: '👤' },
    { name: 'Intrusion Detection', status: 'Real-time', icon: '🚨' },
    { name: 'Compliance Monitor', status: 'SOC 2', icon: '✅' }
  ]

  const certifications = [
    { name: 'SOC 2 Type II', icon: '🏆' },
    { name: 'GDPR', icon: '🇪🇺' },
    { name: 'HIPAA', icon: '🏥' },
    { name: 'ISO 27001', icon: '📜' }
  ]

  const stats = [
    { value: '99.99', suffix: '%', label: 'Uptime SLA' },
    { value: '0', suffix: '', label: 'Data Breaches' },
    { value: '24', suffix: '/7', label: 'Monitoring' },
    { value: '< 1', suffix: 'min', label: 'Response Time' }
  ]

  useEffect(() => {
    if (!containerRef.current) return

    gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, Draggable, MotionPathPlugin, CustomEase, ScrollToPlugin, Observer)
    
    CustomWiggle.create('securityWiggle', { type: 'anticipate', wiggles: 3 })
    CustomEase.create('securityBounce', 'M0,0 C0.12,0.4 0.25,1.1 0.42,1.08 0.58,1.05 0.75,1 1,1')

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(['.feature-card', '.security-layer', '.cert-badge', '.stat-box', '.shield-ring', '.scan-line'], { autoAlpha: 0 })

      // Background orbs
      gsap.utils.toArray('.security-orb').forEach((orb: any, i) => {
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

      // Matrix-like falling characters
      gsap.utils.toArray('.matrix-char').forEach((char: any) => {
        gsap.to(char, {
          y: '100vh',
          opacity: [0, 1, 1, 0],
          duration: `random(3, 8)`,
          repeat: -1,
          ease: 'none',
          delay: Math.random() * 5
        })
      })

      // Shield animation
      if (shieldRef.current) {
        // Shield rings pulsing
        gsap.utils.toArray('.shield-ring').forEach((ring: any, i) => {
          gsap.to(ring, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.6,
            delay: 1 + i * 0.2,
            ease: 'securityBounce'
          })

          gsap.to(ring, {
            scale: 1.1,
            opacity: 0.5,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: 1.5 + i * 0.3
          })
        })

        // Scanning line
        gsap.to('.scan-line', {
          autoAlpha: 0.5,
          duration: 0.5,
          delay: 1.5
        })
        gsap.to('.scan-line', {
          rotation: 360,
          duration: 4,
          repeat: -1,
          ease: 'none',
          delay: 2
        })
      }

      // Hero title with split
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' })
        
        gsap.from(titleSplit.chars, {
          scale: 0,
          rotationZ: gsap.utils.random(-30, 30, true),
          opacity: 0,
          duration: 0.6,
          ease: 'securityBounce',
          stagger: {
            amount: 0.5,
            from: 'center'
          }
        })

        // Glow pulse on title
        gsap.to(titleRef.current, {
          textShadow: '0 0 30px rgba(244, 63, 94, 0.6)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.8
        })
      }

      // Subtitle typewriter
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

      // Security layers with stagger and glow
      gsap.utils.toArray('.security-layer').forEach((layer: any, i) => {
        gsap.to(layer, {
          autoAlpha: 1,
          x: 0,
          duration: 0.5,
          delay: 1.5 + i * 0.1,
          ease: 'power2.out'
        })

        // Status indicator pulse
        const status = layer.querySelector('.status-dot')
        if (status) {
          gsap.to(status, {
            scale: 1.3,
            opacity: 0.5,
            duration: 1,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: 2 + i * 0.15
          })
        }

        // Hover effect
        layer.addEventListener('mouseenter', () => {
          gsap.to(layer, {
            scale: 1.03,
            x: 10,
            boxShadow: '0 0 30px rgba(244, 63, 94, 0.2)',
            duration: 0.3
          })
        })
        layer.addEventListener('mouseleave', () => {
          gsap.to(layer, {
            scale: 1,
            x: 0,
            boxShadow: 'none',
            duration: 0.3
          })
        })
      })

      // Feature cards
      gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          duration: 0.7,
          delay: 0.2 + i * 0.15,
          ease: 'securityBounce',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          }
        })

        const icon = card.querySelector('.card-icon')
        const shield = card.querySelector('.card-shield')

        card.addEventListener('mouseenter', () => {
          gsap.to(card, { 
            scale: 1.05, 
            y: -15,
            boxShadow: '0 30px 60px -15px rgba(244, 63, 94, 0.25)',
            duration: 0.3 
          })
          gsap.to(icon, { 
            rotation: 'securityWiggle', 
            scale: 1.2, 
            duration: 0.6 
          })
          if (shield) {
            gsap.to(shield, { opacity: 1, scale: 1.1, duration: 0.3 })
          }
        })
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, boxShadow: 'none', duration: 0.3 })
          gsap.to(icon, { rotation: 0, scale: 1, duration: 0.6 })
          if (shield) {
            gsap.to(shield, { opacity: 0.5, scale: 1, duration: 0.3 })
          }
        })
      })

      // Certification badges with flip entrance
      gsap.utils.toArray('.cert-badge').forEach((badge: any, i) => {
        gsap.to(badge, {
          autoAlpha: 1,
          rotationY: 0,
          scale: 1,
          duration: 0.6,
          delay: 0.3 + i * 0.15,
          ease: 'securityBounce',
          scrollTrigger: {
            trigger: badge,
            start: 'top 85%'
          }
        })

        // Shine effect
        gsap.to(badge.querySelector('.badge-shine'), {
          x: '200%',
          duration: 1.5,
          repeat: -1,
          repeatDelay: 2,
          ease: 'power2.inOut',
          delay: 1 + i * 0.3
        })
      })

      // Stat boxes with counter
      gsap.utils.toArray('.stat-box').forEach((box: any, i) => {
        const valueEl = box.querySelector('.stat-value')
        const targetValue = parseFloat(box.dataset.value || '0')

        gsap.to(box, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: box,
            start: 'top 85%'
          }
        })

        if (valueEl && targetValue > 0) {
          gsap.to({ val: 0 }, {
            val: targetValue,
            duration: 2,
            delay: 0.3 + i * 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: box,
              start: 'top 85%'
            },
            onUpdate: function() {
              const v = this.targets()[0].val
              if (targetValue < 10) {
                valueEl.textContent = v.toFixed(2)
              } else {
                valueEl.textContent = Math.round(v).toString()
              }
            }
          })
        }
      })

      // Threat level simulation
      const threatInterval = setInterval(() => {
        setThreatLevel(Math.floor(Math.random() * 100))
      }, 3000)

      // CTA pulse
      gsap.to('.pulse-cta', {
        boxShadow: '0 0 40px rgba(244, 63, 94, 0.4)',
        scale: 1.02,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })

      return () => clearInterval(threatInterval)

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="security-orb absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-r from-rose-500/15 to-pink-600/15 blur-3xl" />
        <div className="security-orb absolute top-1/2 -right-40 w-[400px] h-[400px] bg-gradient-to-r from-purple-500/10 to-indigo-600/10 blur-3xl" />
        <div className="security-orb absolute -bottom-40 left-1/3 w-[350px] h-[350px] bg-gradient-to-r from-blue-500/10 to-cyan-600/10 blur-3xl" />
      </div>

      {/* Matrix Characters */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="matrix-char absolute text-rose-400 text-xs font-mono"
            style={{
              left: `${i * 5}%`,
              top: '-20px'
            }}
          >
            {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
          </div>
        ))}
      </div>

      {/* Hero Section */}
      <div ref={heroRef} className="relative pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-rose-300">All Systems Secure</span>
              </div>

              <h1
                ref={titleRef}
                className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
              >
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Security</span>
              </h1>

              <p
                ref={subtitleRef}
                className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed"
              >
                Protect your AI systems with advanced security features, compliance controls, and threat detection designed specifically for AI-powered environments.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/legal/privacy-policy"
                  className="pulse-cta px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-rose-500/25"
                >
                  Security Overview
                </Link>
                <Link
                  href="/support/contact-us"
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
                >
                  Security Consultation
                </Link>
              </div>
            </div>

            {/* Shield Animation */}
            <div ref={shieldRef} className="relative flex items-center justify-center">
              <div className="relative w-72 h-72">
                {/* Shield rings */}
                <div className="shield-ring absolute inset-0 rounded-full border-2 border-rose-500/30 opacity-0" style={{ transform: 'scale(0.5)' }} />
                <div className="shield-ring absolute inset-4 rounded-full border-2 border-rose-500/40 opacity-0" style={{ transform: 'scale(0.5)' }} />
                <div className="shield-ring absolute inset-8 rounded-full border-2 border-rose-500/50 opacity-0" style={{ transform: 'scale(0.5)' }} />
                
                {/* Scanning line */}
                <div className="scan-line absolute inset-0 opacity-0" style={{ transformOrigin: 'center' }}>
                  <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-rose-500 to-transparent" />
                </div>

                {/* Center shield icon */}
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 flex items-center justify-center border border-rose-500/30">
                  <span className="text-6xl">🛡️</span>
                </div>

                {/* Threat level indicator */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-sm text-gray-400 mb-1">Threat Level</div>
                  <div className={`text-2xl font-bold ${threatLevel < 30 ? 'text-green-400' : threatLevel < 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {threatLevel}% Blocked
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Layers */}
      <div className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Active Security Layers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {securityLayers.map((layer, i) => (
              <div
                key={layer.name}
                className="security-layer relative flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 opacity-0"
                style={{ transform: 'translateX(-30px)' }}
              >
                <div className="text-2xl">{layer.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{layer.name}</div>
                  <div className="flex items-center gap-2">
                    <div className="status-dot w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-green-400">{layer.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Enterprise Security Features
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Comprehensive protection for your AI infrastructure
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:border-rose-500/30 transition-all duration-500 opacity-0"
                style={{ perspective: '1000px', transform: 'translateY(50px) rotateX(15deg)' }}
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                
                <div className="relative z-10">
                  <div className={`card-icon inline-flex text-5xl p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} bg-opacity-20 mb-6`}>
                    {feature.icon}
                  </div>
                  <div className="card-shield absolute top-4 right-4 text-2xl opacity-50">🔒</div>
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-rose-300 transition-colors">
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

      {/* Certifications */}
      <div className="relative py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
            Compliance & Certifications
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {certifications.map((cert, i) => (
              <div
                key={cert.name}
                className="cert-badge relative overflow-hidden text-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all duration-300 opacity-0"
                style={{ perspective: '1000px', transform: 'rotateY(90deg) scale(0.8)' }}
              >
                <div className="badge-shine absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full" />
                <div className="text-4xl mb-3">{cert.icon}</div>
                <div className="text-sm font-medium text-gray-300">{cert.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="stat-box text-center p-6 bg-white/5 rounded-2xl border border-white/10 opacity-0"
                data-value={stat.value}
                style={{ transform: 'translateY(30px)' }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  <span className="stat-value">{stat.value === '0' ? '0' : '0'}</span>
                  <span className="text-rose-400">{stat.suffix}</span>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-rose-900/20 to-pink-900/20 rounded-3xl p-12 border border-rose-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Secure Your AI Today
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Get a comprehensive security assessment for your AI infrastructure
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/support/contact-us"
                className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl text-white font-semibold text-lg transition-all duration-300"
              >
                Request Security Assessment
              </Link>
              <Link
                href="/legal/privacy-policy"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300"
              >
                View Security Docs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="relative py-12 px-4 text-center">
        <Link
          href="/solutions/overview"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-rose-400 transition-colors"
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
