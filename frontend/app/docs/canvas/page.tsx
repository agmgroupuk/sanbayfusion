'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { Layout, Code, Sparkles, Download, Play, Rocket, Image, Mic, GitBranch, Database, Shield, Cloud, Video, BarChart3, Workflow, Terminal } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin);

export default function CanvasDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const features = [
    { icon: Sparkles, title: 'Text to App', description: 'Describe your app in plain English and watch it come to life with AI-powered code generation.', color: 'from-purple-500 to-fuchsia-500' },
    { icon: Image, title: 'Image to Code', description: 'Upload a screenshot or design mockup and get pixel-perfect working code instantly.', color: 'from-pink-500 to-rose-500' },
    { icon: Mic, title: 'Voice Input', description: 'Speak your app idea aloud and let AI transform your words into a working application.', color: 'from-amber-500 to-orange-500' },
    { icon: Play, title: 'Live Preview', description: 'See your app running in real-time with desktop, tablet, and mobile responsive views.', color: 'from-green-500 to-emerald-500' },
    { icon: Code, title: 'Monaco Editor', description: 'Full-featured code editor with syntax highlighting, search/replace, and multi-file projects.', color: 'from-blue-500 to-cyan-500' },
    { icon: Cloud, title: 'One-Click Deploy', description: 'Deploy to 5 platforms — Maula, Vercel, Railway, Netlify, and Cloudflare — with a single click.', color: 'from-sky-500 to-blue-500' },
    { icon: GitBranch, title: 'Built-in Git', description: 'Full in-memory git with init, commit, branch, merge, diff, stash, push, and tag support.', color: 'from-orange-500 to-red-500' },
    { icon: Database, title: 'In-Memory Database', description: 'Run SQL queries (CREATE, INSERT, SELECT), generate schemas, migrations, and backups.', color: 'from-teal-500 to-emerald-500' },
    { icon: Shield, title: 'Security Scanner', description: 'SHA-256 hashing, AES-256 encryption, malware scanning, vulnerability detection, and JWT generation.', color: 'from-red-500 to-rose-500' },
    { icon: Video, title: 'AI Video Editor', description: 'Create, trim, merge, convert, compress, add subtitles, watermarks, and generate GIFs from videos.', color: 'from-violet-500 to-purple-500' },
    { icon: BarChart3, title: 'Data Science', description: 'Data profiling, cleaning, visualization, analytics, ML model comparison, and feature engineering.', color: 'from-indigo-500 to-blue-500' },
    { icon: Workflow, title: 'Workflow Automation', description: 'Create, execute, schedule, visualize, and optimize automated workflows and pipelines.', color: 'from-cyan-500 to-teal-500' },
  ];

  const toolCategories = [
    { name: 'File System', count: '10+', icon: '📁', desc: 'File watch, sync, read/write operations' },
    { name: 'Git', count: '12+', icon: '🔀', desc: 'Init, commit, branch, merge, diff, stash, push, tag' },
    { name: 'Dev Tools', count: '15+', icon: '🛠️', desc: 'NPM management, Docker, debugging, testing' },
    { name: 'Web Tools', count: '12+', icon: '🌐', desc: 'Analysis, scaffolding, optimization, Lighthouse' },
    { name: 'Database', count: '10+', icon: '🗄️', desc: 'SQL, schemas, migrations, backups' },
    { name: 'API Tools', count: '10+', icon: '🔌', desc: 'HTTP requests, mock servers, OpenAPI, SDKs' },
    { name: 'Security', count: '12+', icon: '🔒', desc: 'Encryption, hashing, scanning, JWT, API keys' },
    { name: 'Image Tools', count: '12+', icon: '🖼️', desc: 'Generate, edit, resize, OCR, background removal' },
    { name: 'Video Tools', count: '15+', icon: '🎬', desc: 'Generate, trim, merge, compress, subtitles, GIF' },
    { name: 'Data Science', count: '10+', icon: '📊', desc: 'Profiling, visualization, ML models, analytics' },
    { name: 'Knowledge Graph', count: '8+', icon: '🧠', desc: 'Create, query, visualize, merge, reason over graphs' },
    { name: 'Workflow', count: '8+', icon: '⚡', desc: 'Create, execute, schedule, optimize workflows' },
    { name: 'Business', count: '8+', icon: '💼', desc: 'Growth analysis, pricing, A/B testing, campaigns' },
    { name: 'Collaboration', count: '8+', icon: '👥', desc: 'Invites, roles, comments, tasks, approvals' },
    { name: 'LLM/Agents', count: '12+', icon: '🤖', desc: 'Chat, embeddings, fine-tuning, model routing' },
    { name: 'Archives', count: '8+', icon: '📦', desc: 'Create, extract, compress, encrypt, split, merge' },
  ];

  const useCases = [
    { title: 'Landing Pages', description: 'Marketing pages with hero sections, CTAs, and testimonials', icon: '🎯' },
    { title: 'Dashboards', description: 'Data visualization dashboards with charts and live metrics', icon: '📊' },
    { title: 'Forms & Surveys', description: 'Complex forms with validation and multi-step wizards', icon: '📝' },
    { title: 'E-commerce', description: 'Product listings, shopping carts, and checkout flows', icon: '🛒' },
    { title: 'Admin Panels', description: 'CRUD interfaces, data tables, and management consoles', icon: '⚙️' },
    { title: 'Portfolio Sites', description: 'Personal portfolios, image galleries, and showcases', icon: '🎨' },
    { title: 'SaaS Apps', description: 'Full SaaS applications with auth, billing, and dashboards', icon: '🚀' },
    { title: 'Games', description: 'Browser-based games, interactive puzzles, and simulations', icon: '🎮' },
    { title: 'Blogs & CMS', description: 'Content management systems with markdown and rich editors', icon: '📰' },
  ];

  const steps = [
    { step: 1, title: 'Describe Your App', description: 'Type a description, upload a screenshot, or speak your idea using voice input.' },
    { step: 2, title: 'AI Generates Code', description: 'AI creates complete, production-ready code in 40+ languages and frameworks.' },
    { step: 3, title: 'Preview & Iterate', description: 'See your app running live on desktop, tablet, and mobile. Request changes to refine it.' },
    { step: 4, title: 'Deploy Anywhere', description: 'One-click deploy to Maula, Vercel, Railway, Netlify, or Cloudflare.' }
  ];

  const stats = [
    { value: '170+', label: 'AI Tools' },
    { value: '40+', label: 'Languages' },
    { value: '5', label: 'Deploy Targets' },
    { value: '15+', label: 'Tool Categories' },
  ];

  const techStack = [
    { name: 'React', description: 'Component architecture', icon: '⚛️' },
    { name: 'Vue', description: 'Progressive framework', icon: '💚' },
    { name: 'Next.js', description: 'Full-stack React', icon: '▲' },
    { name: 'Python', description: 'Backend & ML', icon: '🐍' },
    { name: 'TypeScript', description: 'Type-safe code', icon: '📘' },
    { name: 'Tailwind CSS', description: 'Utility styling', icon: '🎨' },
    { name: 'Vite', description: 'Build tooling', icon: '⚡' },
    { name: 'Astro', description: 'Content sites', icon: '🚀' },
    { name: 'HTML/CSS/JS', description: 'Web fundamentals', icon: '🌐' },
    { name: 'Svelte', description: 'Reactive framework', icon: '🧡' },
    { name: 'Node.js', description: 'Server runtime', icon: '💚' },
    { name: 'Express', description: 'API framework', icon: '🔧' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-title-wrap', { y: 50, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
        .to('.hero-title-wrap', { y: 0, opacity: 1, duration: 0.8 }, '-=0.4')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4')
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.3');

      // Typewriter
      if (typewriterRef.current) {
        const phrases = ['Build apps from text descriptions', 'Upload screenshots to get code', 'Deploy to 5 platforms instantly', '170+ AI-powered tools', 'Voice input app generation', '40+ languages supported'];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      // 2. ScrambleText on stats
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el, start: 'top 85%',
          onEnter: () => { gsap.to(el, { duration: 1.5, scrambleText: { text: originalText, chars: '0123456789+', speed: 0.4 }, delay: i * 0.1 }); }
        });
      });

      // 3. ScrollTrigger for feature cards
      gsap.set('.feature-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.feature-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for use case cards
      gsap.set('.usecase-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.usecases-grid', start: 'top 80%',
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
        target: window, type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: { path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }], curviness: 2 },
        duration: 10, repeat: -1, ease: 'none'
      });

      // 7. CustomWiggle
      CustomWiggle.create('canvasWiggle', { wiggles: 5, type: 'uniform' });
      const launchBtn = document.querySelector('.launch-btn');
      if (launchBtn) {
        launchBtn.addEventListener('mouseenter', () => { gsap.to(launchBtn, { scale: 1.05, duration: 0.4, ease: 'canvasWiggle' }); });
        launchBtn.addEventListener('mouseleave', () => { gsap.to(launchBtn, { scale: 1, duration: 0.3 }); });
      }

      // 8. DrawSVG
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({ trigger: '.stats-section', start: 'top 80%', onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

      // 9. Draggable
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-card', { type: 'x,y', bounds: containerRef.current, inertia: true, onDragEnd: function () { gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }); } });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, { x: `random(-60, 60)`, y: `random(-40, 40)`, rotation: `random(-100, 100)`, duration: `random(5, 8)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.15 });
      });

      // 11. Tool categories reveal
      gsap.set('.tool-cat', { y: 20, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.tool-cat', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(1.5)' })
      });

      // 12. Tech stack + step cards
      gsap.set('.tech-item', { y: 20, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.tech-item', { start: 'top 90%', onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)' }) });
      gsap.set('.step-card', { x: -30, opacity: 0 });
      ScrollTrigger.batch('.step-card', { start: 'top 85%', onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: 'power2.out' }) });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  /* ── Stars canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#d8b4fe', '#f0abfc', '#93c5fd', '#fca5a5'];
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Twinkling stars */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-orb-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-[50%] right-[30%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.03) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {[...Array(12)].map((_, i) => (<div key={i} className="float-particle absolute w-1.5 h-1.5 bg-purple-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 5) * 16}%` }} />))}
        <div className="orbit-element absolute top-28 left-1/3 w-2 h-2 bg-fuchsia-400/40 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 mb-6">
            <span className="text-4xl">🚀</span>
          </div>
          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #d8b4fe, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>GenCraft Pro</span>
            </h1>
          </div>
          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light">
            AI-powered full-stack web application builder with 170+ tools, 40+ languages, and one-click deployment to 5 platforms
          </p>
          {/* Typewriter badge */}
          <div className="hero-badge flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-purple-600/15 border border-purple-500/25 backdrop-blur-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/30">
                <Terminal className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="inline-block w-[2px] h-4 bg-purple-400 ml-0.5 align-middle animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-1/2 opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#canvasGrad)" strokeWidth="2" />
            <defs><linearGradient id="canvasGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#d946ef" /></linearGradient></defs>
          </svg>
          <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="stat-value text-2xl font-bold text-purple-400">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start CTA */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-purple-500/30 backdrop-blur-sm overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-gray-400 mb-6">Jump right in and start creating your first app with GenCraft Pro.</p>
              <Link href="https://canvas.maula.ai" className="launch-btn inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                <Rocket className="w-5 h-5" />
                Launch GenCraft Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="feature-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-purple-500/50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 170+ Tools */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">170+ AI-Powered Tools</h2>
          <p className="text-gray-500 text-center mb-8 max-w-2xl mx-auto">Organized across 16 categories, every tool you need to build, test, deploy, and scale applications.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {toolCategories.map((cat, idx) => (
              <div key={idx} className="tool-cat text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/40 transition-colors group">
                <div className="text-2xl mb-2">{cat.icon}</div>
                <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                <div className="text-purple-400 text-xs font-semibold mt-1">{cat.count} tools</div>
                <p className="text-xs text-gray-600 mt-1">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-gray-400">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">What You Can Build</h2>
          <div className="usecases-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((useCase, idx) => (
              <div key={idx} className="usecase-card relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-purple-500/50 transition-colors">
                <div className="text-3xl mb-3">{useCase.icon}</div>
                <h3 className="font-bold text-white mb-1">{useCase.title}</h3>
                <p className="text-sm text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Languages & Frameworks */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">40+ Supported Languages</h2>
          <p className="text-gray-500 text-center mb-8">Generate production-ready code in any major language or framework</p>
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {techStack.map((tech, idx) => (
                <div key={idx} className="tech-item text-center p-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  <div className="text-3xl mb-2">{tech.icon}</div>
                  <h4 className="font-bold text-white text-sm">{tech.name}</h4>
                  <p className="text-xs text-gray-500">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-purple-900/30 to-fuchsia-900/30 border border-purple-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Building Now</h2>
              <p className="text-gray-400 mb-6">Transform your ideas into working applications in minutes with 170+ AI tools.</p>
              <Link href="https://canvas.maula.ai" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                🚀 Launch GenCraft Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.5); }
      `}</style>
    </div>
  );
}
