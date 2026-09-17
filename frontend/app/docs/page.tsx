'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { BookOpen, Terminal } from 'lucide-react';


export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const docSections = [
    { title: 'Agent Documentation', description: 'Learn how to create, configure, and deploy AI agents', icon: '🤖', href: '/docs/agents', topics: ['Getting Started', 'Configuration', 'API Reference', 'Best Practices'], color: 'from-blue-500 to-cyan-500' },
    { title: 'GenCraft Pro', description: 'Build complete web applications with AI — text to app, image to code, 170+ tools', icon: '🎨', href: '/docs/canvas', topics: ['Text to App', 'Image to Code', 'Voice Input', '170+ Tools'], color: 'from-purple-500 to-fuchsia-500' },
    { title: 'Canvas Studio', description: 'Professional AI code editor with 16 specialized panels and real-time collaboration', icon: '🖥️', href: '/docs/canvas-studio', topics: ['Monaco Editor', '16 Panels', 'Knowledge Graph', 'Team Collaboration'], color: 'from-cyan-500 to-blue-500' },
    { title: 'Developer Tools', description: '29 free network, security, domain, and developer utilities — no ads, unlimited', icon: '🛠️', href: '/docs/tools', topics: ['Network Tools', 'Security Tools', 'Domain Tools', 'Dev Utilities'], color: 'from-emerald-500 to-teal-500' },
    { title: 'AI Lab', description: '11 experimental AI playgrounds — battle models, generate music, clone voices, create art', icon: '🧪', href: '/docs/lab', topics: ['AI Battle Arena', 'Voice Cloning', 'Music Generator', 'Neural Art'], color: 'from-violet-500 to-fuchsia-500' },
    { title: 'Data Generator', description: 'Generate realistic test data for your applications', icon: '📊', href: '/docs/data-generator', topics: ['Users & Profiles', 'Products', 'Analytics', 'Custom Data'], color: 'from-blue-500 to-indigo-500' },
    { title: 'API Reference', description: 'Complete API documentation for all endpoints and methods', icon: '📚', href: '/docs/api', topics: ['Authentication', 'Endpoints', 'Rate Limits', 'Error Codes'], color: 'from-orange-500 to-red-500' },
    { title: 'Integration Guides', description: 'Step-by-step guides for integrating with popular platforms', icon: '🔗', href: '/docs/integrations', topics: ['Slack', 'Discord', 'Teams', 'Webhooks'], color: 'from-green-500 to-emerald-500' },
    { title: 'SDKs & Libraries', description: 'Official SDKs and community libraries for various languages', icon: '💻', href: '/docs/sdks', topics: ['JavaScript', 'Python', 'Go', 'PHP'], color: 'from-teal-500 to-cyan-500' },
    { title: 'Tutorials', description: 'Hands-on tutorials to help you build amazing AI experiences', icon: '🎓', href: '/docs/tutorials', topics: ['Quick Start', 'Advanced Features', 'Use Cases', 'Examples'], color: 'from-indigo-500 to-purple-500' },
    { title: 'Support', description: 'Get help, report bugs, and connect with the community', icon: '🆘', href: '/support', topics: ['FAQ', 'Contact Support', 'Community', 'Bug Reports'], color: 'from-rose-500 to-pink-500' }
  ];

  const stats = [
    { value: '18', label: 'AI Agents' },
    { value: '170+', label: 'Built-in Tools' },
    { value: '29', label: 'Dev Utilities' },
    { value: '11', label: 'AI Experiments' }
  ];

  const quickStartSteps = [
    { step: 1, title: 'Choose an Agent', desc: 'Select from our library of pre-built agents' },
    { step: 2, title: 'Configure', desc: 'Customize the agent to fit your needs' },
    { step: 3, title: 'Deploy', desc: 'Launch your agent and start using it' }
  ];

  /* ── Twinkling stars ── */
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

  /* ── GSAP Animations ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-title-wrap', { y: 50, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to('.hero-title-wrap', { y: 0, opacity: 1, duration: 0.8 }, '-=0.3')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4');

      // Hero icon pulse with luxurious glow
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(59, 130, 246, 0.5), 0 0 160px rgba(59, 130, 246, 0.2), inset 0 0 30px rgba(59, 130, 246, 0.1)',
        scale: 1.08,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Rotating rings around hero icon
      gsap.to('.hero-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });

      // Typewriter animation for docs capabilities
      if (typewriterRef.current) {
        const phrases = [
          'Create & deploy AI agents',
          'Build apps with Canvas',
          'Generate realistic test data',
          'Integrate with Slack & Discord',
          'Explore 50+ API endpoints',
          'Use SDKs in 4 languages',
          'Follow step-by-step tutorials',
          'Configure agent personalities',
        ];
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
          trigger: el,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(el, { duration: 1.5, scrambleText: { text: originalText, chars: '0123456789+', speed: 0.4 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger for doc section cards
      gsap.set('.doc-card', { y: 60, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.doc-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 60, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip animation for quick start steps
      gsap.set('.quick-step', { opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: '.quick-start-section',
        start: 'top 75%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.quick-step').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.15, ease: 'power2.out' });
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
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, x: scrollY * 0.02, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting docs icon
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on doc cards hover
      CustomWiggle.create('docsWiggle', { wiggles: 4, type: 'easeOut' });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.stats-section',
        start: 'top 80%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' })
      });

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-60, 60)`,
          y: `random(-40, 40)`,
          rotation: `random(-100, 100)`,
          duration: `random(5, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Stats section reveal
      gsap.set('.stat-card', { y: 30, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.stat-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' })
      });

      // 12. Card icon wiggle on hover
      gsap.utils.toArray<HTMLElement>('.doc-card').forEach((card) => {
        const icon = card.querySelector('.card-icon');
        card.addEventListener('mouseenter', () => {
          gsap.to(icon, { rotation: 15, scale: 1.2, duration: 0.3, ease: 'back.out(2)' });
          gsap.to(card.querySelector('.card-glow'), { opacity: 0.08, duration: 0.3 });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(icon, { rotation: 0, scale: 1, duration: 0.3 });
          gsap.to(card.querySelector('.card-glow'), { opacity: 0, duration: 0.3 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';
  const innerCard = 'rounded-xl bg-white/[0.02] border border-white/[0.06]';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* Twinkling stars */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Nebula orbs (parallax-driven) */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-orb-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-[50%] right-[30%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.012) 2px, rgba(59,130,246,0.012) 4px)' }} />

      {/* Micro grid */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Floating particles & orbit element */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-blue-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-element absolute top-28 left-1/3 w-2 h-2 bg-cyan-400/40 rounded-full" />
      </div>

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Animated icon with rotating rings */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-blue-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-blue-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-blue-400/40 shadow-2xl shadow-blue-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(59,130,246,0.3) 100%)' }}>
              <BookOpen className="w-14 h-14 relative z-10" style={{ color: '#93c5fd', filter: 'drop-shadow(0 0 18px rgba(96,165,250,0.8)) drop-shadow(0 0 40px rgba(59,130,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Developer</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Documentation</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light">
            Everything you need to build amazing AI agent experiences
          </p>

          {/* Typewriter badge */}
          <div className="flex justify-center items-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600/15 via-cyan-600/10 to-blue-600/15 border border-blue-500/25 backdrop-blur-sm shadow-lg shadow-blue-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30">
                <Terminal className="w-3.5 h-3.5 text-blue-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-blue-400 font-semibold">I can</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-blue-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ STATS ════════ */}
      <section className="stats-section relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-1/2 opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#docsGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="docsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className={`relative p-6 ${card}`}>
            <div className="grid grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className={`stat-card text-center p-4 ${innerCard}`}>
                  <div className="stat-value text-2xl font-bold text-blue-400">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ DOC GRID ════════ */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docSections.map((section, idx) => (
              <Link key={idx} href={section.href} className={`doc-card group relative p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all block`}>
                <div className="card-glow absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl opacity-0" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-blue-500/20 rounded-tr-lg" />
                <div className="relative z-10">
                  <div className={`card-icon w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <span className="text-2xl">{section.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{section.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{section.description}</p>
                  <ul className="space-y-1.5">
                    {section.topics.map((topic, ti) => (
                      <li key={ti} className="text-sm text-gray-600 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500/60 rounded-full mr-2"></span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ QUICK START ════════ */}
      <section className="quick-start-section relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden`}>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />
            <div className="relative z-10 text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Quick Start</h2>
              <p className="text-gray-500">Get up and running with your first AI agent in minutes</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {quickStartSteps.map((s, idx) => (
                <div key={idx} className={`quick-step text-center p-6 ${innerCard}`}>
                  <div className={`w-12 h-12 ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-violet-600' : 'bg-emerald-600'} rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl`}>
                    {s.step}
                  </div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/docs/agents" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/20 transition-all text-center">
                View Agent Docs
              </Link>
              <Link href="https://maula.ai/agents" className="px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all text-center">
                Browse Agents
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ BOTTOM CTA ════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-white/[0.02] border border-blue-500/10 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Need Help?</h2>
              <p className="text-gray-500 mb-6">Can&apos;t find what you&apos;re looking for? Our support team is here to help.</p>
              <Link href="/support" className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                🛠️ Get Support
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.5); }
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
