'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function RoadmapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const roadmap = [
    {
      quarter: 'Q4 2025',
      status: 'Completed',
      statusColor: 'green',
      icon: '✓',
      features: [
        { name: 'Voice integration for all agents', description: 'Natural voice conversations with every AI agent', completed: true },
        { name: 'Advanced analytics dashboard', description: 'Deep insights into usage patterns and performance', completed: true },
        { name: 'Custom agent creation', description: 'Build and train your own specialized AI agents', completed: true }
      ]
    },
    {
      quarter: 'Q1 2026',
      status: 'In Progress',
      statusColor: 'amber',
      icon: '🔄',
      features: [
        { name: 'Mobile app launch', description: 'Native iOS and Android apps for on-the-go access', completed: false },
        { name: 'Slack integration', description: 'Use agents directly in your Slack workspace', completed: true },
        { name: 'Team collaboration features', description: 'Share agents and conversations with your team', completed: false },
        { name: 'Canvas code generation', description: 'AI-powered code and content generation workspace', completed: true }
      ]
    },
    {
      quarter: 'Q2 2026',
      status: 'Planned',
      statusColor: 'blue',
      icon: '📋',
      features: [
        { name: 'Enterprise SSO', description: 'SAML and OAuth integration for enterprise security', completed: false },
        { name: 'Advanced security features', description: 'SOC 2 compliance and advanced encryption', completed: false },
        { name: 'API marketplace', description: 'Discover and integrate third-party AI tools', completed: false }
      ]
    },
    {
      quarter: 'Q3 2026',
      status: 'Planned',
      statusColor: 'purple',
      icon: '🚀',
      features: [
        { name: 'Multi-modal agents', description: 'Agents that understand images, audio, and documents', completed: false },
        { name: 'Workflow automation', description: 'Chain agents together for complex tasks', completed: false },
        { name: 'White-label solutions', description: 'Deploy branded AI agents for your customers', completed: false }
      ]
    }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90, scale: 0.9 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-icon', { scale: 0, rotation: -360 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, '-=0.3')
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.7, stagger: 0.015 }, '-=0.8')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4');

      // 2. ScrambleText on progress percentage
      gsap.utils.toArray<HTMLElement>('.progress-percent').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(el, {
              duration: 1.8,
              scrambleText: { text: el.dataset.value || el.innerText, chars: '0123456789%', speed: 0.5 },
            });
          },
          once: true
        });
      });

      // 3. ScrollTrigger for roadmap phases with 3D reveal
      gsap.set('.phase-card', { y: 80, opacity: 0, rotateX: -15, scale: 0.95 });
      ScrollTrigger.batch('.phase-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 80, opacity: 0, rotateX: -15, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for feature items
      gsap.set('.feature-item', { opacity: 0, x: -30 });
      ScrollTrigger.batch('.feature-item', {
        start: 'top 85%',
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, x: 0 });
            Flip.from(state, { duration: 0.4, delay: i * 0.05, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.2, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.1, x: scrollY * -0.03, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-dot', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 40, y: -20 }, { x: 80, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 8,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on phase icons
      gsap.utils.toArray<HTMLElement>('.phase-icon').forEach((icon) => {
        icon.addEventListener('mouseenter', () => {
          gsap.to(icon, { rotation: 15, scale: 1.15, duration: 0.5, ease: 'roadmapWiggle' });
        });
        icon.addEventListener('mouseleave', () => {
          gsap.to(icon, { rotation: 0, scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for timeline connector
      gsap.set('.timeline-path', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.timeline-section',
        start: 'top 70%',
        onEnter: () => gsap.to('.timeline-path', { drawSVG: '100%', duration: 2, ease: 'power2.inOut' })
      });

      // 9. Progress bar animation
      gsap.utils.toArray<HTMLElement>('.progress-fill').forEach((bar) => {
        gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
        ScrollTrigger.create({
          trigger: bar,
          start: 'top 85%',
          onEnter: () => gsap.to(bar, { scaleX: 1, duration: 1.2, ease: 'power2.out' }),
          once: true
        });
      });

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-70, 70)`,
          y: `random(-50, 50)`,
          rotation: `random(-90, 90)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.25
        });
      });

      // 12. CTA section reveal
      gsap.set('.cta-section', { y: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.cta-section',
        start: 'top 85%',
        onEnter: () => gsap.to('.cta-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'from-green-500 to-emerald-500',
      amber: 'from-amber-500 to-orange-500',
      blue: 'from-blue-500 to-cyan-500',
      purple: 'from-purple-500 to-pink-500'
    };
    return colors[color] || colors.blue;
  };

  const getStatusBorder = (color: string) => {
    const borders: Record<string, string> = {
      green: 'border-green-500/30',
      amber: 'border-amber-500/30',
      blue: 'border-blue-500/30',
      purple: 'border-purple-500/30'
    };
    return borders[color] || borders.blue;
  };

  const completedCount = roadmap.reduce((acc, phase) => acc + phase.features.filter(f => f.completed).length, 0);
  const totalCount = roadmap.reduce((acc, phase) => acc + phase.features.length, 0);
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-dot absolute top-40 right-1/4 w-2 h-2 bg-purple-400/40 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-full border border-cyan-500/30 mb-8">
            <span className="text-xl">🗺️</span>
            <span className="font-medium">Building the Future</span>
          </div>
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 mb-6">
            <span className="text-4xl phase-icon">🚀</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Product Roadmap</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto">
            See what we're building next and help shape the future of Sanbay Fusion
          </p>
        </div>
      </section>

      {/* Timeline Section */}
      <section ref={timelineRef} className="timeline-section relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* SVG Timeline Path */}
          <svg className="absolute left-1/2 top-0 h-full w-1 opacity-40 hidden md:block" style={{ transform: 'translateX(-50%)' }}>
            <line className="timeline-path" x1="0" y1="0" x2="0" y2="100%" stroke="url(#roadmapGrad)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="roadmapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="33%" stopColor="#f59e0b" />
                <stop offset="66%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          <div className="space-y-8">
            {roadmap.map((phase, idx) => (
              <div key={idx} className="phase-card relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                {/* Phase Header */}
                <div className={`p-6 border-b border-white/[0.06] bg-white/[0.02]`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`phase-icon w-14 h-14 bg-gradient-to-br ${getStatusColor(phase.statusColor)} rounded-xl flex items-center justify-center text-white text-2xl shadow-lg`}>
                      {phase.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white">{phase.quarter}</h2>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r ${getStatusColor(phase.statusColor)} text-white`}>
                      {phase.status}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="p-6">
                  <div className="space-y-4">
                    {phase.features.map((feature, fIdx) => (
                      <div
                        key={fIdx}
                        className={`feature-item flex items-start gap-4 p-4 rounded-xl transition-all ${
                          feature.completed
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-white/[0.02] border border-white/[0.04]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          feature.completed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {feature.completed ? '✓' : '○'}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${feature.completed ? 'text-green-300' : 'text-white'}`}>
                            {feature.name}
                          </h3>
                          <p className={`text-sm mt-1 ${feature.completed ? 'text-green-400/70' : 'text-gray-400'}`}>
                            {feature.description}
                          </p>
                        </div>
                        {feature.completed && (
                          <span className="text-xs font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                            Done
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Summary */}
          <div className="mt-12 relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4">Overall Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-white/[0.04] rounded-full h-4 overflow-hidden">
                <div
                  className="progress-fill h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-percent text-sm font-semibold text-cyan-400" data-value={`${progressPercent}%`}>
                {progressPercent}%
              </span>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-500">Completed: {completedCount} features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-500">In Progress: {roadmap[1].features.filter(f => !f.completed).length} features</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                <span className="text-gray-500">Planned: {totalCount - completedCount - roadmap[1].features.filter(f => !f.completed).length} features</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
                <span className="text-4xl">💡</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Have an Idea?</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                We love hearing from our community. Share your feature requests and help shape the future of Sanbay Fusion.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/community/suggestions" className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all">
                  ➕ Submit Your Idea
                </Link>
                <Link href="/community" className="px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                  👥 Join Community
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
