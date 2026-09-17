'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';
import { Users, Package, FileText, BarChart3, MessageSquare, Mail, Zap, Shield, Download, Settings, Copy } from 'lucide-react';


export default function DataGeneratorDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  const dataTypes = [
    { icon: Users, title: 'Users & Profiles', description: 'Generate realistic user data with names, emails, and addresses.', fields: ['name', 'email', 'avatar', 'address', 'phone'], color: 'from-blue-500 to-cyan-500', emoji: '👤' },
    { icon: Package, title: 'Products', description: 'Create product catalogs with prices, categories, and inventory.', fields: ['name', 'description', 'price', 'category', 'sku'], color: 'from-orange-500 to-red-500', emoji: '📦' },
    { icon: FileText, title: 'Posts & Articles', description: 'Generate blog posts, articles with titles and content.', fields: ['title', 'content', 'author', 'tags', 'publishedAt'], color: 'from-green-500 to-emerald-500', emoji: '📝' },
    { icon: BarChart3, title: 'Analytics Data', description: 'Create time-series analytics for charts and dashboards.', fields: ['date', 'pageViews', 'visitors', 'bounceRate'], color: 'from-purple-500 to-indigo-500', emoji: '📊' },
    { icon: MessageSquare, title: 'Comments & Reviews', description: 'Generate user reviews, ratings, and feedback.', fields: ['author', 'content', 'rating', 'helpful', 'verified'], color: 'from-pink-500 to-rose-500', emoji: '💬' },
    { icon: Mail, title: 'Emails & Messages', description: 'Create email threads and chat messages.', fields: ['from', 'to', 'subject', 'body', 'timestamp'], color: 'from-teal-500 to-cyan-500', emoji: '✉️' }
  ];

  const features = [
    { icon: Zap, title: 'Instant Generation', description: 'Get data in milliseconds' },
    { icon: Shield, title: 'Realistic & Valid', description: 'Properly formatted data' },
    { icon: Settings, title: 'Customizable', description: 'Choose your fields' },
    { icon: Download, title: 'Multiple Formats', description: 'JSON, CSV, or SQL' }
  ];

  const useCases = [
    { title: 'Frontend Development', description: 'Populate UI mockups with realistic data', icon: '🎨' },
    { title: 'API Testing', description: 'Generate test payloads for endpoints', icon: '🔧' },
    { title: 'Database Seeding', description: 'Fill dev databases with sample data', icon: '🗄️' },
    { title: 'Demo Environments', description: 'Create compelling demos', icon: '📺' },
    { title: 'Load Testing', description: 'Generate large datasets', icon: '⚡' },
    { title: 'Documentation', description: 'Create example data for docs', icon: '📚' }
  ];

  const exampleCode = `const response = await fetch('/api/generate-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'users',
    count: 10,
    fields: ['name', 'email', 'avatar', 'address']
  })
});
const { data } = await response.json();`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExample(id);
    setTimeout(() => setCopiedExample(null), 2000);
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

      // 2. ScrambleText on feature titles
      gsap.utils.toArray<HTMLElement>('.feature-title').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger for data type cards
      gsap.set('.datatype-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.datatype-card', {
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
            Flip.from(state, { duration: 0.5, delay: i * 0.06, ease: 'power2.out' });
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
        duration: 10,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on copy button
      const copyBtn = document.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('mouseenter', () => {
          gsap.to(copyBtn, { scale: 1.1, duration: 0.3, ease: 'dataGenWiggle' });
        });
        copyBtn.addEventListener('mouseleave', () => {
          gsap.to(copyBtn, { scale: 1, duration: 0.3 });
        });
      }

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.datatypes-section',
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

      // 11. Feature cards reveal
      gsap.set('.feature-card', { y: 20, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.feature-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.5)' })
      });

      // 12. Code block typing effect
      ScrollTrigger.create({
        trigger: '.code-block',
        start: 'top 85%',
        onEnter: () => {
          gsap.fromTo('.code-content', { opacity: 0.3, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8 });
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-blue-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-indigo-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Data Generator</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
            Generate realistic test data instantly for development, testing, and demos
          </p>
        </div>
      </section>

      {/* Quick Features */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {features.map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <div key={idx} className="feature-card text-center p-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="feature-title font-bold text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Data Types Grid */}
      <section className="datatypes-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#dataGenGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="dataGenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Supported Data Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataTypes.map((type, idx) => {
              const IconComponent = type.icon;
              return (
                <div key={idx} className="datatype-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-blue-500/50 transition-colors">
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-blue-500/30 rounded-tr-lg" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{type.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{type.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {type.fields.map((field, fidx) => (
                      <span key={fidx} className="px-2 py-1 bg-white/[0.04] rounded text-xs text-gray-400 font-mono border border-white/[0.06]">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Quick Start</h2>
          <div className="code-block relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
              <span className="text-sm text-gray-300">API Request</span>
              <button onClick={() => copyToClipboard(exampleCode, 'example')} className="copy-btn text-gray-400 hover:text-white transition text-sm flex items-center gap-1">
                <Copy className="w-4 h-4" />
                {copiedExample === 'example' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="code-content p-4 text-sm text-gray-300 overflow-x-auto">
              <code>{exampleCode}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Use Cases</h2>
          <div className="usecases-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((useCase, idx) => (
              <div key={idx} className="usecase-card relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-blue-500/50 transition-colors">
                <div className="text-3xl mb-3">{useCase.icon}</div>
                <h3 className="font-bold text-white mb-1">{useCase.title}</h3>
                <p className="text-sm text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Generating Data</h2>
              <p className="text-gray-400 mb-6">Create realistic test data for your projects in seconds.</p>
              <Link href="/data-generator" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                🚀 Launch Data Generator
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
