'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { FileText, Search, BookOpen, Code, Zap, Terminal, Key, MessageSquare, ChevronRight, Copy, Check, ArrowRight, Sparkles, Layout, ExternalLink } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, TextPlugin);

const agents = [
  { id: 'einstein', name: 'Einstein', avatar: '🧠', color: 'from-amber-500 to-orange-600' },
  { id: 'chess-player', name: 'Chess Player', avatar: '♟️', color: 'from-slate-600 to-gray-800' },
  { id: 'comedy-king', name: 'Comedy King', avatar: '🎭', color: 'from-yellow-500 to-amber-600' },
  { id: 'drama-queen', name: 'Drama Queen', avatar: '👑', color: 'from-purple-500 to-pink-600' },
  { id: 'lazy-pawn', name: 'Lazy Pawn', avatar: '😴', color: 'from-green-400 to-teal-500' },
  { id: 'knight-logic', name: 'Knight Logic', avatar: '♞', color: 'from-indigo-500 to-blue-600' },
  { id: 'rook-jokey', name: 'Rook Jokey', avatar: '♜', color: 'from-red-500 to-rose-600' },
  { id: 'bishop-burger', name: 'Bishop Burger', avatar: '🍔', color: 'from-orange-500 to-red-600' },
  { id: 'tech-wizard', name: 'Tech Wizard', avatar: '💻', color: 'from-cyan-500 to-blue-600' },
  { id: 'chef-biew', name: 'Chef Biew', avatar: '👨‍🍳', color: 'from-amber-600 to-yellow-500' },
  { id: 'fitness-guru', name: 'Fitness Guru', avatar: '💪', color: 'from-emerald-500 to-green-600' },
  { id: 'travel-buddy', name: 'Travel Buddy', avatar: '✈️', color: 'from-sky-500 to-indigo-600' },
];

const sections = [
  { id: 'getting-started', title: 'Getting Started', icon: Zap },
  { id: 'gencraft-pro', title: 'GenCraft Pro', icon: Layout },
  { id: 'canvas-studio', title: 'Canvas Studio', icon: Code },
  { id: 'api-reference', title: 'API Reference', icon: Terminal },
  { id: 'authentication', title: 'Authentication', icon: Key },
  { id: 'agents', title: 'Agent Reference', icon: MessageSquare },
];

export default function DocumentationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [activeSection, setActiveSection] = useState('getting-started');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
    const stars = Array.from({ length: 120 }, () => ({
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

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('docWiggle', { wiggles: 5, type: 'uniform' });

      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      if (typewriterRef.current) {
        const phrases = [
          'npm install @maula/sdk',
          'GenCraft Pro — Text to App',
          'Canvas Studio — 16 AI Panels',
          '18+ AI Agent Endpoints',
          '170+ Built-in Tools',
          'Real-time Collaboration',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.floating-icon').forEach((icon, i) => {
        gsap.fromTo(icon,
          { y: 30, opacity: 0, scale: 0 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, delay: 0.3 + i * 0.1, ease: 'back.out(2)' }
        );
        gsap.to(icon, {
          y: `random(-15, 15)`, x: `random(-10, 10)`, rotation: `random(-10, 10)`,
          duration: `random(3, 5)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.2
        });
      });

      ScrollTrigger.batch('.doc-section', {
        onEnter: (elements) => {
          gsap.fromTo(elements, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' });
        }, start: 'top 90%', once: true
      });

      ScrollTrigger.create({
        trigger: '.cta-section', start: 'top 90%', once: true,
        onEnter: () => { gsap.fromTo('.cta-section', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }); }
      });

      ScrollTrigger.refresh();
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)' }} />
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[10%]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <Code className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
              <FileText className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Documentation</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Everything you need to integrate and build with
            <span className="text-cyan-400"> Maula AI agents.</span>
          </p>

          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                <Terminal className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-cyan-400 font-semibold">$</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 transition-colors backdrop-blur-sm"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 overflow-hidden group ${activeSection === section.id
                      ? 'bg-white/[0.04] text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]'
                    }`}
                >
                  <section.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110 ${activeSection === section.id ? 'text-cyan-400' : ''}`} />
                  <span className="font-medium relative z-10">{section.title}</span>
                  {activeSection === section.id && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-l-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="doc-section space-y-8">
              {/* Getting Started */}
              <div className={`relative p-8 ${card} hover:bg-white/[0.04] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg" />
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  Getting Started
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Maula AI is a complete AI platform with 18+ specialized agents, GenCraft Pro (AI app builder with 170+ tools), Canvas Studio (professional AI code editor with 16 panels), Developer Tools, and AI Lab experiments.
                </p>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Quick Start Steps</h3>
                  <ol className="space-y-3">
                    {[
                      'Chat with 18 specialized AI agents at maula.ai/chat',
                      'Build full apps from text or images with GenCraft Pro at maula.ai/canvas',
                      'Code professionally with Canvas Studio at studio.maula.ai',
                      'Use 29 free developer tools at maula.ai/tools',
                      'Experiment with AI Lab at maula.ai/lab'
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-400">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 text-sm font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* API Reference */}
              <div className={`doc-section relative p-8 ${card} hover:bg-white/[0.04] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg" />
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                    <Code className="w-5 h-5 text-violet-400" />
                  </div>
                  API Reference
                </h2>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Base URL</h3>
                  <div className="relative">
                    <div className={`p-4 rounded-xl font-mono text-sm text-emerald-400 ${card}`}>
                      https://api.maula.ai/v1
                    </div>
                    <button
                      onClick={() => copyToClipboard('https://api.maula.ai/v1')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Endpoints</h3>
                  {[
                    { method: 'GET', path: '/agents', desc: 'List all available agents' },
                    { method: 'POST', path: '/conversations', desc: 'Create a new conversation' },
                    { method: 'GET', path: '/conversations/:id', desc: 'Retrieve conversation history' },
                    { method: 'POST', path: '/conversations/:id/messages', desc: 'Send a message' },
                    { method: 'POST', path: '/canvas/generate', desc: 'Generate apps via GenCraft Pro' },
                    { method: 'POST', path: '/studio/projects', desc: 'Create a Canvas Studio project' },
                    { method: 'GET', path: '/studio/projects/:id', desc: 'Get Studio project details' },
                    { method: 'POST', path: '/studio/collaborate', desc: 'Invite collaborators to a project' },
                  ].map((endpoint, i) => (
                    <div key={i} className={`p-4 rounded-xl ${card}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${endpoint.method === 'GET' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-gray-300 font-mono text-sm">{endpoint.path}</code>
                      </div>
                      <p className="text-gray-500 text-sm mt-2">{endpoint.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GenCraft Pro */}
              <div className={`doc-section relative p-8 ${card} hover:bg-white/[0.04] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg" />
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-purple-400" />
                  </div>
                  GenCraft Pro
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  GenCraft Pro is a full AI-powered app builder that turns text prompts, images, or voice commands into complete, deployable web applications — with 170+ built-in tools across 16 categories.
                </p>

                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Core Features</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Text to App', desc: 'Describe any app in plain English and get a working application in seconds' },
                      { title: 'Image to Code', desc: 'Upload a screenshot or mockup and AI converts it to functional code' },
                      { title: 'Voice Input', desc: 'Speak your app ideas naturally and watch them come to life' },
                      { title: 'Live Preview', desc: 'See changes in real-time as you iterate on your application' },
                      { title: 'Monaco Code Editor', desc: 'Full VS Code-quality editor with syntax highlighting and IntelliSense' },
                      { title: 'One-Click Deploy', desc: 'Deploy to Netlify, Vercel, or download as a complete project' },
                      { title: 'Built-in Git', desc: 'Version control with branching, commits, and diff viewer' },
                      { title: 'Security Scanner', desc: 'Automated vulnerability scanning with fix suggestions' },
                    ].map((feature, i) => (
                      <div key={i} className={`p-4 ${card}`}>
                        <div className="text-sm font-bold text-white mb-1">{feature.title}</div>
                        <div className="text-xs text-gray-500">{feature.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">170+ Tools by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Web Apps', 'Mobile Apps', 'Games', 'Data Visualization', 'AI/ML', 'APIs', 'Databases', 'Authentication', 'E-commerce', 'Dashboards', 'Landing Pages', 'Portfolios', 'Blogs', 'Social Media', 'Productivity', 'Developer Tools'].map((cat, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs border border-purple-500/15">{cat}</span>
                    ))}
                  </div>
                </div>

                <Link href="/canvas" className="mt-6 inline-flex items-center text-purple-400 hover:text-purple-300 font-medium transition-colors">
                  Open GenCraft Pro <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {/* Canvas Studio */}
              <div className={`doc-section relative p-8 ${card} hover:bg-white/[0.04] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg" />
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <Code className="w-5 h-5 text-cyan-400" />
                  </div>
                  Canvas Studio
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Canvas Studio is a professional AI-powered code editor at studio.maula.ai with 16 specialized panels, real-time collaboration, and a built-in knowledge graph for complex projects.
                </p>

                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">16 Specialized Panels</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['AI Chat', 'Code Editor', 'Live Preview', 'File Explorer', 'Terminal', 'Knowledge Graph', 'AI Image Gen', 'Security Scanner', 'Data Tools', 'Project Manager', 'AI/ML Panel', 'Web Tools', 'Git Integration', 'Video Editor', 'Archive', 'Workspace'].map((panel, i) => (
                      <div key={i} className={`p-3 text-center ${card}`}>
                        <div className="text-xs font-medium text-gray-300">{panel}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Key Capabilities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Real-Time Collaboration', desc: 'Work together with your team — Owner, Admin, Editor, and Viewer roles' },
                      { title: 'Knowledge Graph', desc: 'Visualize project architecture with interactive node graphs (Tree, Force, Radial layouts)' },
                      { title: 'AI Image Generation', desc: 'Generate images, icons, and assets directly inside your project' },
                      { title: 'Integrated Terminal', desc: 'Full terminal with package management and build commands' },
                    ].map((cap, i) => (
                      <div key={i} className={`p-4 ${card}`}>
                        <div className="text-sm font-bold text-white mb-1">{cap.title}</div>
                        <div className="text-xs text-gray-500">{cap.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 ${card} mb-4`}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">GenCraft Pro vs Canvas Studio</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400"><span>Best For</span><span className="text-purple-400">Quick Prototyping</span><span className="text-cyan-400">Professional Development</span></div>
                    <div className="flex justify-between text-gray-400"><span>Input</span><span className="text-purple-400">Text / Image / Voice</span><span className="text-cyan-400">Code-first</span></div>
                    <div className="flex justify-between text-gray-400"><span>Collaboration</span><span className="text-purple-400">Single User</span><span className="text-cyan-400">Multi-user Roles</span></div>
                    <div className="flex justify-between text-gray-400"><span>Tools</span><span className="text-purple-400">170+ Built-in</span><span className="text-cyan-400">16 Specialized Panels</span></div>
                  </div>
                </div>

                <Link href="https://studio.maula.ai" className="mt-2 inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Open Canvas Studio <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {/* Agents */}
              <div className={`doc-section relative p-8 ${card} hover:bg-white/[0.04] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg" />
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-violet-500/20 border border-fuchsia-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-fuchsia-400" />
                  </div>
                  Available Agents
                </h2>
                <p className="text-gray-400 mb-6">
                  Browse our collection of 18 specialized AI agents, each with unique capabilities.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {agents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className={`p-4 rounded-xl ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group`}
                    >
                      <div className="text-3xl mb-2">{agent.avatar}</div>
                      <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {agent.name}
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/agents"
                  className="mt-6 inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  View All Agents
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Need Help?</h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                Our support team is here to help you get started.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/support"
                  className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Contact Support
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/resources/tutorials"
                  className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all flex items-center justify-center gap-2"
                >
                  View Tutorials
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
