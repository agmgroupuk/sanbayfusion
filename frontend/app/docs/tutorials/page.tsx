'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsTutorialsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const tutorials = [
    { title: 'Getting Started with Maula', description: 'Learn the basics and create your first AI agent in under 10 minutes', difficulty: 'Beginner', duration: '10 min', href: '/docs/agents/getting-started', icon: '🚀' },
    { title: 'Building Your First Chatbot', description: 'Create a conversational AI chatbot with personality and memory', difficulty: 'Beginner', duration: '20 min', href: '#', icon: '🤖' },
    { title: 'Advanced Agent Configuration', description: 'Fine-tune your agents with custom prompts and behaviors', difficulty: 'Intermediate', duration: '30 min', href: '/docs/agents/configuration', icon: '⚙️' },
    { title: 'Multi-Agent Workflows', description: 'Orchestrate multiple agents to work together on complex tasks', difficulty: 'Advanced', duration: '45 min', href: '#', icon: '🔗' },
    { title: 'Real-World Use Cases', description: 'Explore practical examples for customer support, content creation, and more', difficulty: 'Intermediate', duration: '25 min', href: '#', icon: '💼' },
    { title: 'Production Deployment', description: 'Deploy your agents to production with best practices and monitoring', difficulty: 'Advanced', duration: '40 min', href: '#', icon: '🌐' }
  ];

  const stats = [
    { value: '50+', label: 'Tutorials' },
    { value: '100+', label: 'Code Examples' },
    { value: '10+ hrs', label: 'Video Content' },
    { value: '5K+', label: 'Students' }
  ];

  const categories = [
    { name: 'Getting Started', count: 8, color: 'green' },
    { name: 'Agent Development', count: 12, color: 'blue' },
    { name: 'Integrations', count: 10, color: 'purple' },
    { name: 'Advanced Topics', count: 15, color: 'orange' },
    { name: 'Best Practices', count: 7, color: 'pink' }
  ];

  const difficultyColors: Record<string, string> = {
    Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
    Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Advanced: 'bg-red-500/20 text-red-400 border-red-500/30'
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

      // 2. ScrambleText on stat values
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789+', speed: 0.3 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger for tutorial cards
      gsap.set('.tutorial-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.tutorial-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for category tags
      gsap.set('.category-tag', { opacity: 0, y: 20 });
      ScrollTrigger.create({
        trigger: '.categories-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.category-tag').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.4, delay: i * 0.08, ease: 'power2.out' });
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
          path: [{ x: 0, y: 0 }, { x: 45, y: -20 }, { x: 90, y: 0 }, { x: 45, y: 20 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 11,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'tutorialsWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.tutorials-section',
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

      // 11. Stats reveal animation
      gsap.set('.stat-card', { y: 30, opacity: 0 });
      ScrollTrigger.batch('.stat-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' })
      });

      // 12. Tutorial icon hover animation
      gsap.utils.toArray<HTMLElement>('.tutorial-icon').forEach((icon) => {
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
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-fuchsia-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-violet-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-purple-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-violet-500/30 mb-6">
            <span className="text-xl">📖</span>
            <span className="font-medium">Step-by-Step Guides</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tutorials</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Learn how to build amazing AI experiences with our comprehensive guides
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#tutorials" className="action-btn px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
              Start Learning
            </a>
            <a href="#categories" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              Browse Categories
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
                <p className="stat-value text-2xl md:text-3xl font-bold text-violet-400 mb-1">{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Browse by Category</h2>
          <div className="categories-grid flex flex-wrap justify-center gap-3">
            {categories.map((cat, idx) => (
              <button key={idx} className="category-tag px-5 py-2 rounded-full bg-gradient-to-r from-gray-800/80 to-gray-700/50 border border-gray-600/50 text-white hover:border-violet-500/50 transition-all flex items-center gap-2">
                <span>{cat.name}</span>
                <span className="text-xs text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded-full">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorials Grid */}
      <section id="tutorials" className="tutorials-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#tutorialsGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="tutorialsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Popular Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial, idx) => (
              <Link key={idx} href={tutorial.href} className="tutorial-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-violet-500/50 transition-colors block">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-violet-500/30 rounded-tr-lg" />
                <div className="tutorial-icon text-4xl mb-4">{tutorial.icon}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${difficultyColors[tutorial.difficulty]}`}>
                    {tutorial.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">⏱️ {tutorial.duration}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">{tutorial.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{tutorial.description}</p>
                <span className="text-violet-400 text-sm font-medium">Start Tutorial →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Build Your First Agent?</h2>
              <p className="text-gray-400 mb-6">Start with our getting started guide and have your first AI agent running in minutes.</p>
              <Link href="/docs/agents/getting-started" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                🚀 Get Started Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
