'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { Code2, Users, Network, Image, Shield, Database, Layout, FolderOpen, BarChart3, Archive, Brain, Globe, Terminal, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin);

export default function CanvasStudioDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const features = [
    { icon: Code2, title: 'Monaco Code Editor', description: 'Full-powered code editor with IntelliSense, syntax highlighting, multi-cursor editing, search/replace, and custom themes.', color: 'from-cyan-500 to-blue-500' },
    { icon: Users, title: 'Real-Time Collaboration', description: 'Work together with your team in real-time with roles (Owner, Admin, Editor, Viewer), invites, and activity feeds.', color: 'from-green-500 to-emerald-500' },
    { icon: Network, title: 'Knowledge Graph', description: 'Visualize your codebase architecture with force, radial, and hierarchical layouts showing component dependencies.', color: 'from-violet-500 to-purple-500' },
    { icon: Image, title: 'AI Image Generation', description: 'Generate stunning images with AI directly inside your project workspace for assets and mockups.', color: 'from-pink-500 to-rose-500' },
    { icon: Shield, title: 'Security Scanner', description: 'Built-in security scanning to detect vulnerabilities, outdated dependencies, and potential threats in your code.', color: 'from-red-500 to-orange-500' },
    { icon: Database, title: 'Data Tools', description: 'Transform, analyze, and visualize data with built-in data manipulation tools and charting.', color: 'from-teal-500 to-cyan-500' },
    { icon: FolderOpen, title: 'Project Management', description: 'Manage multiple projects with workspaces, drafts, archives, and a central StudioHub dashboard.', color: 'from-amber-500 to-yellow-500' },
    { icon: Brain, title: 'AI/ML Panel', description: 'Machine learning tools integrated into your workflow for intelligent code suggestions and analysis.', color: 'from-indigo-500 to-violet-500' },
    { icon: Globe, title: 'Web Frontend Tools', description: 'Specialized web development tooling for frontend frameworks with live preview and responsive testing.', color: 'from-blue-500 to-indigo-500' },
  ];

  const panels = [
    { name: 'StudioHub', icon: '🏠', desc: 'Central hub for managing all your projects and workspaces' },
    { name: 'Code Editor', icon: '📝', desc: 'Monaco-powered editor with terminal and multi-file tabs' },
    { name: 'Collaboration', icon: '👥', desc: 'Real-time team editing with role-based access control' },
    { name: 'Knowledge Graph', icon: '🧠', desc: 'Visualize codebase with force/radial/hierarchical layouts' },
    { name: 'Image Generation', icon: '🖼️', desc: 'AI-powered image creation for project assets' },
    { name: 'File Parser', icon: '📂', desc: 'Parse and analyze uploaded files of any format' },
    { name: 'Security Scan', icon: '🔒', desc: 'Detect vulnerabilities and security issues in code' },
    { name: 'Data Tools', icon: '📊', desc: 'Transform, clean, and visualize datasets' },
    { name: 'Projects', icon: '📁', desc: 'Workspace and project lifecycle management' },
    { name: 'Archives', icon: '📦', desc: 'Manage archived projects and restore as needed' },
    { name: 'AI/ML Tools', icon: '🤖', desc: 'Machine learning model integration and analysis' },
    { name: 'Web Tools', icon: '🌐', desc: 'Specialized frontend development and testing tools' },
    { name: 'API Tools', icon: '🔌', desc: 'Build, test, and document APIs from the editor' },
    { name: 'Analytics', icon: '📈', desc: 'Project usage analytics and performance metrics' },
    { name: 'Drafts', icon: '✏️', desc: 'Save and manage works-in-progress' },
    { name: 'Dashboard', icon: '🎛️', desc: 'Overview of all activities, stats, and notifications' },
  ];

  const comparisonItems = [
    { feature: 'Primary Focus', studio: 'Professional IDE experience', gencraft: 'AI-first app generation' },
    { feature: 'Code Editor', studio: 'Full Monaco IDE with terminal', gencraft: 'Monaco with AI chat focus' },
    { feature: 'Collaboration', studio: 'Real-time multi-user editing', gencraft: 'Team invites & roles' },
    { feature: 'Knowledge Graph', studio: 'Full codebase visualization', gencraft: 'Not available' },
    { feature: 'AI Generation', studio: 'AI-assisted coding', gencraft: '170+ AI tools, text/image/voice to code' },
    { feature: 'Deployment', studio: 'Export & manual deploy', gencraft: 'One-click to 5 platforms' },
    { feature: 'Best For', studio: 'Development teams & complex projects', gencraft: 'Rapid prototyping & app building' },
  ];

  const stats = [
    { value: '16', label: 'IDE Panels' },
    { value: '4', label: 'User Roles' },
    { value: '3', label: 'Graph Layouts' },
    { value: '∞', label: 'Projects' },
  ];

  /* ── Stars canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#93c5fd', '#67e8f9', '#a5b4fc', '#c4b5fd', '#86efac'];
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

  /* ── GSAP Animations ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
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

      if (typewriterRef.current) {
        const phrases = ['Real-time team collaboration', 'Knowledge graph visualization', '16 specialized IDE panels', 'Security scanning built-in', 'AI-powered code assistant', 'Project management hub'];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({ trigger: el, start: 'top 85%', onEnter: () => { gsap.to(el, { duration: 1.5, scrambleText: { text: originalText, chars: '0123456789∞+', speed: 0.4 }, delay: i * 0.1 }); } });
      });

      gsap.set('.feature-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.feature-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      gsap.set('.panel-item', { y: 20, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.panel-item', { start: 'top 90%', onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(1.5)' }) });

      gsap.set('.compare-row', { x: -30, opacity: 0 });
      ScrollTrigger.batch('.compare-row', { start: 'top 88%', onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' }) });

      Observer.create({
        target: window, type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      gsap.to('.orbit-element', {
        motionPath: { path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }], curviness: 2 },
        duration: 12, repeat: -1, ease: 'none'
      });

      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({ trigger: '.stats-section', start: 'top 80%', onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, { x: `random(-60, 60)`, y: `random(-40, 40)`, rotation: `random(-100, 100)`, duration: `random(5, 8)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.15 });
      });

      if (window.innerWidth > 768) {
        Draggable.create('.draggable-card', { type: 'x,y', bounds: containerRef.current, inertia: true, onDragEnd: function () { gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }); } });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-orb-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-[50%] right-[30%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {[...Array(12)].map((_, i) => (<div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 5) * 16}%` }} />))}
        <div className="orbit-element absolute top-28 left-1/3 w-2 h-2 bg-blue-400/40 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 mb-6">
            <span className="text-4xl">💻</span>
          </div>
          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #67e8f9, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Canvas Studio</span>
            </h1>
          </div>
          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light">
            Professional AI code editor with real-time collaboration, knowledge graph visualization, 16 specialized panels, and team management
          </p>
          <div className="hero-badge flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-blue-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                <Terminal className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-1/2 opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#studioGrad)" strokeWidth="2" />
            <defs><linearGradient id="studioGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
          </svg>
          <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="stat-value text-2xl font-bold text-cyan-400">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Launch CTA */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-cyan-500/30 backdrop-blur-sm overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Open Canvas Studio</h2>
              <p className="text-gray-400 mb-6">Professional IDE experience with AI assistance and real-time team collaboration.</p>
              <Link href="https://studio.sanbayfusion.com" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                <Rocket className="w-5 h-5" />
                Launch Canvas Studio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="feature-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-cyan-500/50 transition-colors">
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

      {/* 16 Panels */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">16 Specialized Panels</h2>
          <p className="text-gray-500 text-center mb-8 max-w-2xl mx-auto">Every tool a developer needs, organized into dedicated panels within the IDE.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {panels.map((panel, idx) => (
              <div key={idx} className="panel-item text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/40 transition-colors">
                <div className="text-2xl mb-2">{panel.icon}</div>
                <h4 className="font-bold text-white text-sm">{panel.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{panel.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison: Studio vs GenCraft */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Canvas Studio vs GenCraft Pro</h2>
          <p className="text-gray-500 text-center mb-8">Two powerful tools for different workflows. Choose what fits your needs.</p>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 gap-0 p-4 border-b border-white/[0.06] text-center">
              <div className="text-sm font-bold text-gray-400">Feature</div>
              <div className="text-sm font-bold text-cyan-400">Canvas Studio</div>
              <div className="text-sm font-bold text-purple-400">GenCraft Pro</div>
            </div>
            {comparisonItems.map((item, idx) => (
              <div key={idx} className="compare-row grid grid-cols-3 gap-0 p-4 border-b border-white/[0.04] text-center hover:bg-white/[0.02] transition-colors">
                <div className="text-sm font-semibold text-white">{item.feature}</div>
                <div className="text-sm text-gray-400">{item.studio}</div>
                <div className="text-sm text-gray-400">{item.gencraft}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Deep Dive */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Team Collaboration</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Owner', desc: 'Full project control, billing, team management, and deletion rights.', icon: '👑', color: 'border-amber-500/30' },
              { title: 'Admin', desc: 'Manage team members, settings, and deploy. Cannot delete project.', icon: '🛡️', color: 'border-red-500/30' },
              { title: 'Editor', desc: 'Full code editing access, can commit changes and run builds.', icon: '✏️', color: 'border-blue-500/30' },
              { title: 'Viewer', desc: 'Read-only access to code, preview, and project analytics.', icon: '👁️', color: 'border-green-500/30' },
            ].map((role, idx) => (
              <div key={idx} className={`feature-card p-6 rounded-2xl bg-white/[0.02] border ${role.color} backdrop-blur-sm`}>
                <div className="text-3xl mb-3">{role.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{role.title}</h3>
                <p className="text-sm text-gray-400">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Coding Now</h2>
              <p className="text-gray-400 mb-6">Professional IDE experience with AI, collaboration, and 16 specialized panels.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="https://studio.sanbayfusion.com" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                  💻 Launch Canvas Studio
                </Link>
                <Link href="/docs/canvas" className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold transition-all">
                  🚀 View GenCraft Pro Docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
      `}</style>
    </div>
  );
}
