'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Building2, Heart, Landmark, ShoppingCart, Factory, Cpu, GraduationCap, ArrowRight, Users, Layers, Clock, Headphones, Sparkles, ChevronRight, Star } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, CustomEase, MotionPathPlugin, DrawSVGPlugin } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, CustomEase, MotionPathPlugin, DrawSVGPlugin);

/* ── colour map ── */
const colorMap: Record<string, { gradient: string; glow: string; border: string; text: string; bg: string }> = {
  red: { gradient: 'from-rose-500 to-red-500', glow: 'rgba(244,63,94,0.35)', border: 'border-rose-500/20', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  green: { gradient: 'from-emerald-500 to-green-500', glow: 'rgba(16,185,129,0.35)', border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  purple: { gradient: 'from-violet-500 to-purple-500', glow: 'rgba(139,92,246,0.35)', border: 'border-violet-500/20', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  orange: { gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.35)', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  blue: { gradient: 'from-blue-500 to-cyan-500', glow: 'rgba(59,130,246,0.35)', border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  pink: { gradient: 'from-pink-500 to-fuchsia-500', glow: 'rgba(236,72,153,0.35)', border: 'border-pink-500/20', text: 'text-pink-400', bg: 'bg-pink-500/10' },
};

const iconMap: Record<string, React.ComponentType<any>> = {
  Healthcare: Heart,
  'Finance & Banking': Landmark,
  'Retail & E-commerce': ShoppingCart,
  Manufacturing: Factory,
  Technology: Cpu,
  Education: GraduationCap,
};

export default function IndustriesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const industries = [
    { name: 'Healthcare', emoji: '🏥', href: '/industries/healthcare', color: 'red', desc: 'AI-powered diagnostics, patient monitoring, and clinical decision support systems.' },
    { name: 'Finance & Banking', emoji: '🏦', href: '/industries/finance-banking', color: 'green', desc: 'Fraud detection, algorithmic trading, and intelligent risk assessment solutions.' },
    { name: 'Retail & E-commerce', emoji: '🛒', href: '/industries/retail-ecommerce', color: 'purple', desc: 'Personalized recommendations, inventory optimization, and demand forecasting.' },
    { name: 'Manufacturing', emoji: '🏭', href: '/industries/manufacturing', color: 'orange', desc: 'Predictive maintenance, quality control, and supply chain optimization.' },
    { name: 'Technology', emoji: '💻', href: '/industries/technology', color: 'blue', desc: 'Code generation, automated testing, and intelligent DevOps workflows.' },
    { name: 'Education', emoji: '🎓', href: '/industries/education', color: 'pink', desc: 'Adaptive learning, automated grading, and personalized curriculum design.' },
  ];

  const stats = [
    { value: '50+', label: 'Enterprise Clients', icon: Users },
    { value: '6', label: 'Industry Verticals', icon: Layers },
    { value: '99.9%', label: 'Uptime SLA', icon: Clock },
    { value: '24/7', label: 'Support', icon: Headphones },
  ];

  /* ── twinkling stars canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize();
    window.addEventListener('resize', resize);

    const starColors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1) {
          ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── mouse tracking ── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; }, []);

  /* ── GSAP animations ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      /* Hero entrance */
      gsap.set('.hero-badge', { y: 20, opacity: 0, scale: 0.8 });
      gsap.set('.hero-icon-wrap', { y: 30, opacity: 0, scale: 0.6 });
      gsap.set('.hero-title-wrap', { y: 40, opacity: 0 });
      gsap.set('.hero-subtitle', { y: 30, opacity: 0 });
      gsap.set('.hero-badges-row', { y: 20, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to('.hero-icon-wrap', { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, '-=0.3')
        .to('.hero-title-wrap', { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
        .to('.hero-subtitle', { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
        .to('.hero-badges-row', { y: 0, opacity: 1, duration: 0.5 }, '-=0.2')
        .from('.hero-cta', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2');

      /* ScrambleText on stat values */
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const orig = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: orig, chars: '0123456789+%.', speed: 0.3 }, delay: i * 0.1 });
          },
        });
      });

      /* Stat cards flip */
      gsap.set('.stat-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.stats-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.stat-card').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
          });
        },
      });

      /* Industry cards stagger */
      gsap.set('.industry-card', { y: 60, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.industry-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 60, opacity: 0, scale: 0.95, duration: 0.3 }),
      });

      /* CTA reveal */
      gsap.set('.cta-section', { y: 40, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.cta-section',
        start: 'top 85%',
        onEnter: () => gsap.to('.cta-section', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }),
      });

      /* Parallax orbs */
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const s = self.scrollY;
          gsap.to('.nebula-1', { y: s * 0.12, duration: 0.4, ease: 'none' });
          gsap.to('.nebula-2', { y: s * -0.08, duration: 0.4, ease: 'none' });
        },
      });

      /* Orbit element */
      gsap.to('.orbit-dot', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 16,
        repeat: -1,
        ease: 'none',
      });

      /* DrawSVG decorative line */
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.industries-section',
        start: 'top 80%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }),
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  /* ── card hover 3D ── */
  const handleCardEnter = (idx: number, e: React.MouseEvent<HTMLElement>) => {
    setHoveredCard(idx);
    const card = e.currentTarget;
    const shine = card.querySelector('.card-shine') as HTMLElement;
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (shine) gsap.to(shine, { opacity: 1, duration: 0.3 });
    if (glow) gsap.to(glow, { opacity: 1, duration: 0.3 });
  };

  const handleCardMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) {
      shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.06) 0%, transparent 60%)`;
    }
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLElement>) => {
    setHoveredCard(null);
    const card = e.currentTarget;
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    const glow = card.querySelector('.card-glow') as HTMLElement;
    if (shine) gsap.to(shine, { opacity: 0, duration: 0.3 });
    if (glow) gsap.to(glow, { opacity: 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* ── twinkling stars ── */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* ── nebula orbs ── */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="nebula-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="nebula-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)' }} />
        <div className="orbit-dot absolute top-48 left-1/3 w-2 h-2 bg-violet-400/40 rounded-full" />
      </div>

      {/* ── scan line ── */}
      <div className="fixed inset-0 pointer-events-none z-[2]">
        <div className="absolute inset-0" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)',
        }} />
      </div>

      {/* ── micro grid ── */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ── mouse ambient light ── */}
      <div className="fixed inset-0 pointer-events-none z-[3] opacity-[0.02]" style={{
        background: `radial-gradient(600px circle at ${mouseRef.current.x}px ${mouseRef.current.y}px, rgba(139,92,246,0.15), transparent 70%)`,
      }} />

      {/* ── stardust particles ── */}
      <div className="fixed inset-0 pointer-events-none z-[2]">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            left: `${5 + i * 5}%`,
            top: `${8 + (i % 6) * 14}%`,
            background: `rgba(${[139, 92, 246][i % 3]}, ${[92, 246, 139][(i + 1) % 3]}, ${[246, 139, 92][(i + 2) % 3]}, 0.25)`,
            animation: `float-particle ${6 + Math.random() * 6}s ease-in-out ${i * 0.3}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-violet-500/20 bg-white/[0.02] backdrop-blur-sm mb-8">
            <Building2 className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">Enterprise AI Solutions</span>
          </div>

          {/* Large hero icon */}
          <div className="hero-icon-wrap relative inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-8">
            <Building2 className="w-10 h-10 md:w-12 md:h-12 text-violet-400" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
          </div>

          <div className="hero-title-wrap mb-6">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Industry Solutions</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-6 leading-relaxed">
            Specialized AI solutions designed for your industry's unique challenges and opportunities
          </p>

          {/* Badges row */}
          <div className="hero-badges-row flex flex-wrap items-center justify-center gap-3 mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-xs font-medium text-violet-300">
              <Star className="w-3 h-3" /> 6 Industry Verticals
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-xs font-medium text-emerald-300">
              <Sparkles className="w-3 h-3" /> AI-Powered Solutions
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-xs font-medium text-blue-300">
              <Users className="w-3 h-3" /> 50+ Enterprise Clients
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/industries/overview" className="hero-cta group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
              Explore Industries
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/support/book-consultation" className="hero-cta inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
              Book Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════ STATS ════════════════════════ */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="stat-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
                  <Icon className="w-5 h-5 text-violet-400/60 mx-auto mb-3" />
                  <p className="stat-value text-3xl md:text-4xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent mb-1">{stat.value}</p>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════ INDUSTRIES GRID ════════════════════════ */}
      <section className="industries-section relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-[2px] w-1/3 overflow-visible" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="1" x2="100%" y2="1" stroke="url(#indGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="indGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                <stop offset="50%" stopColor="rgba(139,92,246,0.4)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">Industry Verticals</h2>
            <p className="text-gray-500 text-lg">Tailored AI for every sector</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, idx) => {
              const c = colorMap[industry.color] || colorMap.blue;
              const Icon = iconMap[industry.name] || Cpu;
              return (
                <Link
                  key={idx}
                  href={industry.href}
                  data-card-id={`industry-${idx}`}
                  className="industry-card group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-all hover:border-white/[0.12]"
                  style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
                  onMouseEnter={(e) => handleCardEnter(idx, e)}
                  onMouseMove={handleCardMove}
                  onMouseLeave={handleCardLeave}
                >
                  {/* shine overlay */}
                  <div className="card-shine absolute inset-0 opacity-0 pointer-events-none z-10" />
                  {/* glow */}
                  <div className="card-glow absolute -inset-px rounded-2xl opacity-0 pointer-events-none z-0" style={{ boxShadow: `0 0 30px ${c.glow}, inset 0 0 30px ${c.glow.replace('0.35', '0.05')}` }} />

                  <div className="relative z-10 p-8">
                    {/* top accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.gradient} opacity-20`} />

                    {/* icon + emoji row */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${c.text}`} />
                      </div>
                      <span className="text-3xl">{industry.emoji}</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">
                      {industry.name}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">{industry.desc}</p>

                    <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${c.text} group-hover:gap-2.5 transition-all`}>
                      Explore Solutions
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════ BOTTOM CTA ════════════════════════ */}
      <section className="cta-section relative z-10 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 md:p-16 rounded-3xl overflow-hidden" style={{ background: 'rgba(3,3,4,0.85)', backdropFilter: 'blur(12px)' }}>
            {/* subtle border */}
            <div className="absolute inset-0 rounded-3xl border border-white/[0.06]" />
            {/* inner glow */}
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-violet-400/60 mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                Ready to Transform Your Industry?
              </h2>
              <p className="text-gray-500 mb-8 text-lg max-w-xl mx-auto leading-relaxed">
                Schedule a consultation with our industry experts to discover how AI can revolutionize your business.
              </p>
              <Link href="/support/book-consultation" className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all">
                Schedule Consultation
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── custom scrollbar + float keyframe ── */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        @keyframes float-particle {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(var(--fx, 30px), var(--fy, -20px)) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
