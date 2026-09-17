'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';

gsap.registerPlugin(ScrambleTextPlugin, ScrollTrigger, Flip, Observer, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin);
CustomWiggle.create('gettingStartedWiggle', { wiggles: 5, type: 'anticipate' });

export default function ClientContent() {
  const containerRef = useRef<HTMLDivElement>(null);

  const quickStartSteps = [
    { step: 1, title: 'Create Your Account', description: 'Sign up for a free Maula account to get started with AI agents', icon: '📝' },
    { step: 2, title: 'Choose an Agent Template', description: 'Select from our pre-built templates or start from scratch', icon: '🎯' },
    { step: 3, title: 'Configure Your Agent', description: 'Customize the personality, knowledge base, and capabilities', icon: '⚙️' },
    { step: 4, title: 'Test and Iterate', description: 'Use the playground to test your agent and refine its responses', icon: '🧪' },
    { step: 5, title: 'Deploy to Production', description: 'Publish your agent and integrate it with your applications', icon: '🚀' }
  ];

  const coreConcepts = [
    { title: 'Agents', description: 'AI-powered entities that can understand context and perform tasks', icon: '🤖' },
    { title: 'Conversations', description: 'Multi-turn dialogues with memory and context retention', icon: '💬' },
    { title: 'Knowledge Base', description: 'Custom data that your agent can reference and learn from', icon: '📚' },
    { title: 'Tools & Actions', description: 'Capabilities your agent can use to interact with external systems', icon: '🔧' },
    { title: 'Webhooks', description: 'Real-time notifications when events occur in your agent', icon: '🔔' },
    { title: 'Analytics', description: 'Insights into how users interact with your agent', icon: '📊' }
  ];

  const quickTips = [
    'Start with a clear purpose for your agent',
    'Keep initial prompts concise and focused',
    'Test with real user scenarios early',
    'Monitor conversations for improvement opportunities',
    'Iterate based on user feedback'
  ];

  const nextSteps = [
    { title: 'Configuration Guide', href: '/docs/agents/configuration', desc: 'Deep dive into agent settings' },
    { title: 'Agent Types', href: '/docs/agents/agents-type', desc: 'Explore different agent personalities' },
    { title: 'API Reference', href: '/docs/agents/api-reference', desc: 'Integrate agents into your apps' },
    { title: 'Best Practices', href: '/docs/agents/best-practices', desc: 'Learn from successful implementations' }
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

      // 2. ScrambleText on step numbers
      gsap.utils.toArray<HTMLElement>('.step-number').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.6, scrambleText: { text: originalText, chars: '12345', speed: 0.4 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger for step cards
      gsap.set('.step-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.step-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for concept cards
      gsap.set('.concept-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.concepts-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.concept-card').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.08, ease: 'power2.out' });
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
          path: [{ x: 0, y: 0 }, { x: 55, y: -25 }, { x: 110, y: 0 }, { x: 55, y: 25 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 13,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'gettingStartedWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.steps-section',
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

      // 11. Quick tips reveal
      gsap.set('.tip-item', { x: -20, opacity: 0 });
      ScrollTrigger.batch('.tip-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' })
      });

      // 12. Next steps cards animation
      gsap.set('.next-step-card', { y: 20, opacity: 0 });
      ScrollTrigger.batch('.next-step-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-green-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-emerald-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-green-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-6">
            <span className="text-xl">🚀</span>
            <span className="font-medium">Quick Start Guide</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="hero-title bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">Getting Started</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Create your first AI agent in under 10 minutes with our step-by-step guide
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#steps" className="action-btn px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
              Start Building
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* What Are AI Agents */}
      <section className="relative z-10 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500/30 rounded-tr-lg" />
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">What Are AI Agents?</h2>
            <p className="text-gray-300 mb-4">AI agents are intelligent software entities that can understand natural language, maintain context across conversations, and perform tasks on behalf of users. Unlike simple chatbots, agents can:</p>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Remember previous conversations</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Access external data and APIs</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Execute complex multi-step workflows</li>
              <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Learn and adapt to user preferences</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Start Steps */}
      <section id="steps" className="steps-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#gettingStartedGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="gettingStartedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-10">Quick Start Guide</h2>
          <div className="space-y-4">
            {quickStartSteps.map((step) => (
              <div key={step.step} className="step-card draggable-card group relative flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-emerald-500/50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="step-number w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center font-bold text-white">
                    {step.step}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{step.icon}</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{step.title}</h3>
                  </div>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Concepts */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Core Concepts</h2>
          <div className="concepts-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreConcepts.map((concept, idx) => (
              <div key={idx} className="concept-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-500/20 rounded-tr-lg" />
                <div className="text-3xl mb-3">{concept.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{concept.title}</h3>
                <p className="text-gray-400 text-sm">{concept.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="relative z-10 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/20 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>💡</span> Quick Tips
            </h2>
            <ul className="space-y-2">
              {quickTips.map((tip, idx) => (
                <li key={idx} className="tip-item flex items-center gap-3 text-gray-300">
                  <span className="text-emerald-400">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Next Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextSteps.map((step, idx) => (
              <Link key={idx} href={step.href} className="next-step-card group relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-emerald-500/50 transition-colors block">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
                <span className="text-emerald-400 text-sm mt-2 inline-block">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Create Your First Agent?</h2>
              <p className="text-gray-400 mb-6">Sign up for free and start building AI agents that delight your users.</p>
              <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                🚀 Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
