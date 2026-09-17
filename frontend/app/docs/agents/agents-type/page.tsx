'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsAgentsTypePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const agentTypes = [
    { name: 'Conversational', description: 'General-purpose chatbots for customer interactions and support', icon: '💬', color: 'blue', features: ['Natural dialogue', 'Context retention', 'Multi-turn conversations', 'Personality customization'] },
    { name: 'Task-Oriented', description: 'Focused agents designed to complete specific objectives', icon: '✅', color: 'green', features: ['Goal tracking', 'Step-by-step guidance', 'Progress monitoring', 'Automated workflows'] },
    { name: 'Knowledge Base', description: 'Agents that provide information from custom data sources', icon: '📚', color: 'purple', features: ['Document search', 'FAQ handling', 'Citation support', 'Real-time updates'] },
    { name: 'Creative', description: 'Generate content, stories, and creative outputs', icon: '🎨', color: 'pink', features: ['Content generation', 'Style adaptation', 'Format flexibility', 'Ideation support'] },
    { name: 'Analytical', description: 'Process and analyze data to provide insights', icon: '📊', color: 'cyan', features: ['Data processing', 'Pattern recognition', 'Report generation', 'Trend analysis'] },
    { name: 'Multi-Modal', description: 'Handle text, images, and other media types', icon: '🖼️', color: 'orange', features: ['Image understanding', 'File processing', 'Voice support', 'Media generation'] }
  ];

  const useCases = [
    { type: 'Customer Support', agentType: 'Conversational', description: 'Handle inquiries 24/7' },
    { type: 'Sales Assistant', agentType: 'Task-Oriented', description: 'Guide customers through purchases' },
    { type: 'Documentation Bot', agentType: 'Knowledge Base', description: 'Answer questions from your docs' },
    { type: 'Content Writer', agentType: 'Creative', description: 'Generate blog posts and copy' },
    { type: 'Data Analyst', agentType: 'Analytical', description: 'Process and visualize data' },
    { type: 'Image Assistant', agentType: 'Multi-Modal', description: 'Understand and create images' }
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

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

      // 2. ScrambleText on agent type names
      gsap.utils.toArray<HTMLElement>('.type-name').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for type cards
      gsap.set('.type-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.type-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for use case cards
      gsap.set('.usecase-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.usecases-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.usecase-card').forEach((el, i) => {
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
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'agentTypesWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.types-section',
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

      // 11. Feature items stagger
      gsap.set('.feature-item', { x: -10, opacity: 0 });
      ScrollTrigger.batch('.feature-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out' })
      });

      // 12. Type icon hover animation
      gsap.utils.toArray<HTMLElement>('.type-icon').forEach((icon) => {
        icon.addEventListener('mouseenter', () => {
          gsap.to(icon, { scale: 1.3, rotation: 10, duration: 0.3, ease: 'back.out(2)' });
        });
        icon.addEventListener('mouseleave', () => {
          gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-indigo-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-violet-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 backdrop-blur-sm rounded-full border border-indigo-500/30 mb-6">
            <span className="text-xl">🤖</span>
            <span className="font-medium">Agent Categories</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Agent Types</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Explore different agent personalities and capabilities for your use case
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#types" className="action-btn px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
              Explore Types
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Agent Types */}
      <section id="types" className="types-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#typesGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="typesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Available Agent Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentTypes.map((type, idx) => (
              <div key={idx} className="type-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-indigo-500/50 transition-colors">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-indigo-500/30 rounded-tr-lg" />
                <div className="type-icon text-4xl mb-4">{type.icon}</div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${colorClasses[type.color]} mb-3 inline-block`}>
                  {type.name}
                </span>
                <h3 className="type-name text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{type.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{type.description}</p>
                <ul className="space-y-1">
                  {type.features.map((feature, i) => (
                    <li key={i} className="feature-item text-gray-500 text-xs flex items-center gap-2">
                      <span className="text-indigo-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Common Use Cases</h2>
          <div className="usecases-grid grid grid-cols-2 md:grid-cols-3 gap-4">
            {useCases.map((useCase, idx) => (
              <div key={idx} className="usecase-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center hover:border-indigo-500/50 transition-colors">
                <h3 className="text-sm font-bold text-white mb-1">{useCase.type}</h3>
                <p className="text-indigo-400 text-xs mb-2">{useCase.agentType}</p>
                <p className="text-gray-400 text-xs">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Create Your Agent?</h2>
              <p className="text-gray-400 mb-6">Start with our getting started guide to build your first AI agent.</p>
              <Link href="/docs/agents/getting-started" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
                🚀 Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
