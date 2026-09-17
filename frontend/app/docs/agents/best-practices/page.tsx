'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsAgentsBestPracticesPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const practices = [
    {
      category: 'Design',
      icon: '🎨',
      items: [
        { title: 'Define Clear Objectives', description: 'Start with a specific purpose and target audience for your agent' },
        { title: 'Keep Prompts Focused', description: 'Use concise, clear instructions in your system prompts' },
        { title: 'Design for Edge Cases', description: 'Plan how your agent handles unexpected or off-topic queries' }
      ]
    },
    {
      category: 'Performance',
      icon: '⚡',
      items: [
        { title: 'Optimize Context Window', description: 'Balance conversation history with response quality' },
        { title: 'Use Streaming Responses', description: 'Improve perceived speed with streamed output' },
        { title: 'Implement Caching', description: 'Cache common queries to reduce latency and costs' }
      ]
    },
    {
      category: 'Security',
      icon: '🔒',
      items: [
        { title: 'Validate All Inputs', description: 'Sanitize user input to prevent prompt injection' },
        { title: 'Limit Scope of Actions', description: 'Only enable the tools your agent actually needs' },
        { title: 'Rotate API Keys', description: 'Regularly rotate credentials and use environment variables' }
      ]
    },
    {
      category: 'User Experience',
      icon: '💫',
      items: [
        { title: 'Provide Clear Feedback', description: 'Show loading states and handle errors gracefully' },
        { title: 'Set Expectations', description: 'Let users know what your agent can and cannot do' },
        { title: 'Enable Corrections', description: 'Allow users to correct misunderstandings easily' }
      ]
    }
  ];

  const dosDonts = {
    dos: [
      'Test with real user scenarios',
      'Monitor conversations regularly',
      'Iterate based on feedback',
      'Document your agent\'s capabilities',
      'Use appropriate response lengths'
    ],
    donts: [
      'Overcomplicate initial prompts',
      'Ignore edge cases',
      'Skip error handling',
      'Expose sensitive data',
      'Forget about rate limits'
    ]
  };

  const metrics = [
    { name: 'Response Time', target: '< 2s', description: 'Average time to first response' },
    { name: 'Success Rate', target: '> 95%', description: 'Conversations that achieve user goal' },
    { name: 'User Satisfaction', target: '> 4.5/5', description: 'Average rating from users' },
    { name: 'Fallback Rate', target: '< 5%', description: 'Percentage of failed responses' }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.3')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on practice titles
      gsap.utils.toArray<HTMLElement>('.practice-title').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for practice cards
      gsap.set('.practice-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.practice-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for metric cards
      gsap.set('.metric-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.metrics-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.metric-card').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'bestPracticesWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.practices-section',
        start: 'top 80%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' })
      });

      // 9. Draggable cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-card', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-40, 40)`,
          rotation: `random(-90, 90)`,
          duration: `random(5, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Do's and Don'ts list items
      gsap.set('.list-item', { x: -20, opacity: 0 });
      ScrollTrigger.batch('.list-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' })
      });

      // 12. Practice item stagger
      gsap.set('.practice-item', { y: 15, opacity: 0 });
      ScrollTrigger.batch('.practice-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-sky-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-blue-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-sky-500/30 mb-6">
            <span className="text-xl">⭐</span>
            <span className="font-medium">Expert Guidelines</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Best Practices</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Learn from successful implementations and avoid common pitfalls
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#practices" className="action-btn px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/25 transition-all">
              View Guidelines
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Best Practices Grid */}
      <section id="practices" className="practices-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#bpGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="bpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Key Practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {practices.map((practice, idx) => (
              <div key={idx} className="practice-card draggable-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-sky-500/50 transition-colors">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-sky-500/30 rounded-tr-lg" />
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{practice.icon}</span>
                  <h3 className="practice-title text-lg font-bold text-sky-400">{practice.category}</h3>
                </div>
                <ul className="space-y-3">
                  {practice.items.map((item, i) => (
                    <li key={i} className="practice-item">
                      <h4 className="text-white font-medium text-sm">{item.title}</h4>
                      <p className="text-gray-400 text-xs">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Do's and Don'ts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Do's */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/20 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <span>✅</span> Do's
              </h3>
              <ul className="space-y-2">
                {dosDonts.dos.map((item, idx) => (
                  <li key={idx} className="list-item flex items-center gap-2 text-gray-300 text-sm">
                    <span className="text-green-400">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-red-900/30 to-rose-900/30 border border-red-500/20 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                <span>❌</span> Don'ts
              </h3>
              <ul className="space-y-2">
                {dosDonts.donts.map((item, idx) => (
                  <li key={idx} className="list-item flex items-center gap-2 text-gray-300 text-sm">
                    <span className="text-red-400">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Key Metrics to Track</h2>
          <div className="metrics-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="metric-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
                <h3 className="text-sm font-bold text-white mb-1">{metric.name}</h3>
                <p className="text-xl font-bold text-sky-400 mb-2">{metric.target}</p>
                <p className="text-gray-400 text-xs">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-sky-900/30 to-blue-900/30 border border-sky-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-blue-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Having Issues?</h2>
              <p className="text-gray-400 mb-6">Check out our troubleshooting guide for common problems and solutions.</p>
              <Link href="/docs/agents/troubleshooting" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/25 transition-all">
                🔧 Troubleshooting Guide
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
