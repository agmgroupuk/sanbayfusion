'use client';

import Link from 'next/link';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Code, Bug, Cloud, Shield, ArrowRight, ChevronRight } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, MotionPathPlugin, DrawSVGPlugin);

export default function TechnologyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    { icon: Code, title: 'Code Generation', description: 'AI-assisted code generation and intelligent autocomplete that accelerates development workflows', benefits: ['Multi-Language', 'Context-Aware', 'Best Practices'] },
    { icon: Bug, title: 'Bug Detection', description: 'Automated bug detection and code analysis finding issues before they reach production', benefits: ['Static Analysis', 'Runtime Detection', 'Auto-Fix Suggestions'] },
    { icon: Cloud, title: 'DevOps Automation', description: 'Intelligent CI/CD pipeline management and infrastructure automation with AI', benefits: ['Pipeline Optimization', 'Auto-Scaling', 'Cost Management'] },
    { icon: Shield, title: 'Security AI', description: 'AI-powered security scanning and vulnerability detection across your entire stack', benefits: ['Vulnerability Scanning', 'Threat Detection', 'Compliance Checks'] },
  ];

  const stats = [
    { value: '40%', label: 'Faster Development', icon: Code },
    { value: '60%', label: 'Fewer Bugs', icon: Bug },
    { value: '50%', label: 'DevOps Efficiency', icon: Cloud },
    { value: '99.9%', label: 'Security Accuracy', icon: Shield },
  ];

  const tools = [
    { title: 'AI Code Review', desc: 'Automated pull request analysis and feedback' },
    { title: 'Test Generation', desc: 'AI-generated test suites and coverage' },
    { title: 'Documentation AI', desc: 'Auto-generated docs and API references' },
    { title: 'Performance Profiling', desc: 'AI-driven performance optimization' },
    { title: 'Cloud Optimization', desc: 'Smart resource allocation and cost savings' },
    { title: 'Incident Response', desc: 'Automated incident detection and resolution' },
  ];

  const handleMouseMove = useCallback((e: React.MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const starColors = ['#ffffff', '#67e8f9', '#a5f3fc', '#22d3ee', '#c4b5fd', '#fde68a'];
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
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
      gsap.set('.tc-badge', { y: 20, opacity: 0, scale: 0.8 });
      gsap.set('.tc-sub', { y: 30, opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.to('.tc-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });

      gsap.set('.tc-title', { opacity: 0, y: 40 });
      tl.to('.tc-title', { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.3');
      tl.to('.tc-sub', { y: 0, opacity: 1, duration: 0.5 }, '-=0.4');
      tl.from('.tc-cta-btn', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2');

      gsap.utils.toArray<HTMLElement>('.tc-stat-value').forEach((el, i) => {
        const orig = el.textContent || '';
        ScrollTrigger.create({
          trigger: el, start: 'top 90%',
          onEnter: () => { gsap.to(el, { duration: 1, scrambleText: { text: orig, chars: '0123456789+%.', speed: 0.3 }, delay: i * 0.1 }); },
        });
      });

      gsap.set('.tc-stat', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.tc-stats-grid', start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.tc-stat').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
          });
        },
      });

      gsap.set('.tc-feature', { y: 60, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.tc-feature', {
        start: 'top 88%',
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)' }),
        onLeaveBack: batch => gsap.to(batch, { y: 60, opacity: 0, scale: 0.95, duration: 0.3 }),
      });

      gsap.set('.tc-tool', { y: 40, opacity: 0 });
      ScrollTrigger.batch('.tc-tool', {
        start: 'top 88%',
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' }),
      });

      gsap.set('.tc-draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({ trigger: '.tc-features-section', start: 'top 80%', onEnter: () => gsap.to('.tc-draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

      gsap.set('.tc-bottom-cta', { y: 40, opacity: 0 });
      ScrollTrigger.create({ trigger: '.tc-bottom-cta', start: 'top 85%', onEnter: () => gsap.to('.tc-bottom-cta', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }) });

      Observer.create({
        target: window, type: 'scroll', onChangeY: (self) => {
          gsap.to('.tc-nebula-1', { y: self.scrollY * 0.12, duration: 0.4, ease: 'none' });
          gsap.to('.tc-nebula-2', { y: self.scrollY * -0.08, duration: 0.4, ease: 'none' });
        }
      });

      gsap.to('.tc-orbit-dot', {
        motionPath: { path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }], curviness: 2 },
        duration: 16, repeat: -1, ease: 'none',
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCardMove = useCallback((e: React.MouseEvent<HTMLElement>, idx: number) => {
    setHoveredCard(idx);
    const card = e.currentTarget; const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) { shine.style.opacity = '1'; shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.06) 0%, transparent 60%)`; }
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (glow) glow.style.opacity = '1';
  }, []);

  const handleCardLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setHoveredCard(null);
    const card = e.currentTarget;
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (shine) shine.style.opacity = '0';
    if (glow) glow.style.opacity = '0';
  }, []);

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="tc-nebula-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="tc-nebula-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.03) 0%, transparent 70%)' }} />
        <div className="tc-orbit-dot absolute top-48 left-1/3 w-2 h-2 bg-cyan-400/40 rounded-full" />
      </div>
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.012) 2px, rgba(6,182,212,0.012) 4px)' }} />
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="fixed inset-0 pointer-events-none z-[3] opacity-[0.02]" style={{ background: `radial-gradient(600px circle at ${mouseRef.current.x}px ${mouseRef.current.y}px, rgba(6,182,212,0.15), transparent 70%)` }} />
      <div className="fixed inset-0 pointer-events-none z-[2]">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{ width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', background: 'rgba(6,182,212,0.3)', animation: `float-particle ${10 + Math.random() * 20}s linear infinite`, animationDelay: `-${Math.random() * 20}s` }} />
        ))}
      </div>

      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="tc-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-cyan-500/20 bg-white/[0.02] backdrop-blur-sm mb-8">
            <Code className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Technology Solutions</span>
          </div>
          <h1 className="tc-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ background: 'linear-gradient(to right, #ffffff, #67e8f9, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI for Technology</span>
          </h1>
          <p className="tc-sub text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Supercharge development workflows with AI-powered tools built for engineers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="https://sanbayfusion.com/agents" className="tc-cta-btn group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
              Explore Tools <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/support/book-consultation" className="tc-cta-btn inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
              Book Consultation
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12 px-4">
        <div className="tc-stats-grid max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="tc-stat relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                <Icon className="w-5 h-5 text-cyan-400/60 mx-auto mb-3" />
                <div className="tc-stat-value text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{s.value}</div>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tc-features-section relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 relative">
            <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-1 overflow-visible" viewBox="0 0 200 2"><line className="tc-draw-line" x1="0" y1="1" x2="200" y2="1" stroke="rgba(6,182,212,0.3)" strokeWidth="2" /></svg>
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Developer Tools</h2>
            <p className="text-gray-500 text-lg">AI-powered tools for modern engineering teams</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="tc-feature group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
                  style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                  onMouseMove={(e) => handleCardMove(e, idx)} onMouseLeave={handleCardLeave}
                >
                  <div className="card-shine absolute inset-0 opacity-0 pointer-events-none z-10 transition-opacity duration-300" />
                  <div className="card-glow absolute -inset-px rounded-2xl opacity-0 pointer-events-none z-0 transition-opacity duration-300" style={{ boxShadow: '0 0 30px rgba(6,182,212,0.2)' }} />
                  <div className="relative z-10 p-8">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20" />
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5"><Icon className="w-6 h-6 text-cyan-400" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{f.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {f.benefits.map((b, i) => (<span key={i} className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{b}</span>))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Engineering Tools</h2>
            <p className="text-gray-500 text-lg">Complete AI toolkit for development teams</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool, idx) => (
              <div key={idx} className="tc-tool relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0" />
                <h3 className="text-base font-bold text-white mb-2">{tool.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{tool.desc}</p>
                <ChevronRight className="w-4 h-4 text-cyan-400/40 absolute top-6 right-6 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tc-bottom-cta relative z-10 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden" style={{ background: 'rgba(3,3,4,0.85)', backdropFilter: 'blur(12px)' }}>
            <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <Code className="w-8 h-8 text-cyan-400/60 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">Ready to Transform Development?</h2>
              <p className="text-gray-500 mb-8 text-lg max-w-xl mx-auto leading-relaxed">Join thousands of engineering teams using our AI to ship faster and better.</p>
              <Link href="/support/book-consultation" className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg shadow-lg shadow-cyan-500/20 transition-all">
                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes float-particle { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 50% { transform: translateY(-100px) translateX(30px); } }
      `}</style>
    </div>
  );
}
