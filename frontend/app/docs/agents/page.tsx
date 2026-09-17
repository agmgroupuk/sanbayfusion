'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';
import { BookOpen, Cog, Users, Code, Lightbulb, Wrench, ArrowRight } from 'lucide-react';


export default function DocsAgentsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const agentDocs = [
    { title: 'Getting Started with Agents', description: 'Learn the basics of creating and deploying AI agents', category: 'Introduction', readTime: '5 min', href: '/docs/agents/getting-started', icon: BookOpen, color: 'blue' },
    { title: 'Agent Configuration', description: 'How to configure your agents for optimal performance', category: 'Configuration', readTime: '8 min', href: '/docs/agents/configuration', icon: Cog, color: 'purple' },
    { title: 'Available Agent Types', description: 'Explore all the different types of agents you can deploy', category: 'Reference', readTime: '12 min', href: '/docs/agents/agents-type', icon: Users, color: 'cyan' },
    { title: 'Agent API Reference', description: 'Complete API documentation for agent integration', category: 'API', readTime: '15 min', href: '/docs/agents/api-reference', icon: Code, color: 'green' },
    { title: 'Best Practices', description: 'Tips and tricks for getting the most out of your agents', category: 'Guide', readTime: '10 min', href: '/docs/agents/best-practices', icon: Lightbulb, color: 'yellow' },
    { title: 'Troubleshooting', description: 'Common issues and how to resolve them', category: 'Support', readTime: '6 min', href: '/docs/agents/troubleshooting', icon: Wrench, color: 'orange' }
  ];

  const availableAgents = [
    { name: 'Ben Sega', slug: 'ben-sega', specialty: 'Gaming & Entertainment', emoji: '🎮' },
    { name: 'Einstein', slug: 'einstein', specialty: 'Scientific Research', emoji: '🔬' },
    { name: 'Chef Biew', slug: 'chef-biew', specialty: 'Culinary Arts', emoji: '👨‍🍳' },
    { name: 'Tech Wizard', slug: 'tech-wizard', specialty: 'Technology Support', emoji: '💻' },
    { name: 'Travel Buddy', slug: 'travel-buddy', specialty: 'Travel Planning', emoji: '✈️' },
    { name: 'Fitness Guru', slug: 'fitness-guru', specialty: 'Health & Fitness', emoji: '💪' }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
      yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
      orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }
    };
    return colors[color] || colors.blue;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.4')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on read times
      gsap.utils.toArray<HTMLElement>('.read-time').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789 min', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for doc cards
      gsap.set('.doc-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.doc-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for agent cards reveal
      gsap.set('.agent-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.agents-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.agent-card').forEach((el, i) => {
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
          path: [{ x: 0, y: 0 }, { x: 40, y: -20 }, { x: 80, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 10,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'agentDocsWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative line
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.docs-grid',
        start: 'top 75%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' })
      });

      // 9. Draggable cards with Inertia
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

      // 11. Icon hover animation
      gsap.utils.toArray<HTMLElement>('.doc-card').forEach((card) => {
        const icon = card.querySelector('.doc-icon');
        const arrow = card.querySelector('.arrow-icon');
        card.addEventListener('mouseenter', () => {
          gsap.to(icon, { scale: 1.15, rotation: 5, duration: 0.3 });
          gsap.to(arrow, { x: 5, opacity: 1, duration: 0.3 });
          gsap.to(card.querySelector('.card-glow'), { opacity: 0.1, duration: 0.3 });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3 });
          gsap.to(arrow, { x: 0, opacity: 0, duration: 0.3 });
          gsap.to(card.querySelector('.card-glow'), { opacity: 0, duration: 0.3 });
        });
      });

      // 12. Agent emoji bounce on hover
      gsap.utils.toArray<HTMLElement>('.agent-card').forEach((card) => {
        const emoji = card.querySelector('.agent-emoji');
        card.addEventListener('mouseenter', () => {
          gsap.to(emoji, { scale: 1.3, y: -5, duration: 0.3, ease: 'back.out(2)' });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(emoji, { scale: 1, y: 0, duration: 0.3 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-blue-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-cyan-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 mb-6">
            <span className="text-4xl">🤖</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Agent Documentation</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive guides and documentation for working with AI agents
          </p>
        </div>
      </section>

      {/* Documentation Grid */}
      <section className="docs-grid relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#agentGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="agentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentDocs.map((doc, idx) => {
              const IconComponent = doc.icon;
              const colorClasses = getColorClasses(doc.color);
              return (
                <Link key={idx} href={doc.href} className="doc-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-blue-500/50 transition-colors block">
                  <div className="card-glow absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl opacity-0" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-blue-500/30 rounded-tr-lg" />
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`doc-icon w-12 h-12 rounded-xl ${colorClasses.bg} flex items-center justify-center`}>
                        <IconComponent className={`w-6 h-6 ${colorClasses.text}`} />
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
                        {doc.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{doc.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{doc.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="read-time text-sm text-gray-500">📖 {doc.readTime} read</span>
                      <ArrowRight className="arrow-icon w-5 h-5 text-blue-400 opacity-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Available Agents Section */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Available Agents</h2>
          <div className="agents-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAgents.map((agent, idx) => (
              <Link key={idx} href={`/agents/${agent.slug}`} className="agent-card group relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-purple-500/50 transition-colors block">
                <div className="agent-emoji text-3xl mb-3">{agent.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{agent.name}</h3>
                <p className="text-sm text-gray-500">{agent.specialty}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center">
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500/30 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-purple-500/30 rounded-bl-lg" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
              <p className="text-gray-400 mb-6">Ready to start building with AI agents?</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="https://maula.ai/agents" className="action-btn px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
                  View All Agents
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/agents/random" className="action-btn px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                  Try Random Agent
                </Link>
                <Link href="/support" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
                  Get Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
