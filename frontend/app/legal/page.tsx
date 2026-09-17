'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, SplitText, TextPlugin, ScrambleTextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import { Scale, Shield, FileText, CreditCard, AlertTriangle, Cookie, ArrowRight, ChevronRight, Sparkles, Lock, Eye, CheckCircle, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, ScrambleTextPlugin, CustomWiggle, Observer);

/* ── Twinkling star type ── */
interface TwinklingStar {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

export default function LegalHubPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<TwinklingStar[]>([]);
  const animFrameRef = useRef<number>(0);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const legalDocuments = [
    {
      id: 'privacy',
      title: 'Privacy Policy',
      description: 'Learn how we collect, use, and protect your personal information across maula.ai and spaces.maula.ai (Canvas App, Canvas Studio, GenCraft Pro, Maula Editor).',
      icon: Shield,
      href: '/legal/privacy-policy',
      lastUpdated: 'February 18, 2026',
      glow: 'rgba(6,182,212,0.4)',
      color: 'from-cyan-500 to-blue-500',
      sections: ['Data Collection', 'Usage & Processing', 'Data Protection', 'Your Rights'],
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      description: 'Terms and conditions governing your use of maula.ai and spaces.maula.ai, including all AI tools, agents, and deployment services.',
      icon: FileText,
      href: '/legal/terms-of-service',
      lastUpdated: 'February 18, 2026',
      glow: 'rgba(139,92,246,0.4)',
      color: 'from-violet-500 to-purple-500',
      sections: ['Service Usage', 'User Responsibilities', 'Limitations', 'Termination'],
    },
    {
      id: 'cookies',
      title: 'Cookie Policy',
      description: 'Information about cookies, localStorage, and first-party tracking technologies used across maula.ai and spaces.maula.ai.',
      icon: Cookie,
      href: '/legal/cookie-policy',
      lastUpdated: 'February 18, 2026',
      glow: 'rgba(249,115,22,0.4)',
      color: 'from-amber-500 to-orange-500',
      sections: ['Cookie Types', 'localStorage Keys', 'First-Party Analytics', 'No Third-Party Tracking'],
    },
    {
      id: 'payments',
      title: 'Payments & Refunds',
      description: 'Policies regarding one-time agent purchases, payment methods, refunds, and access management across maula.ai and spaces.maula.ai.',
      icon: CreditCard,
      href: '/legal/payments-refunds',
      lastUpdated: 'February 18, 2026',
      glow: 'rgba(16,185,129,0.4)',
      color: 'from-emerald-500 to-teal-500',
      sections: ['Pricing Structure', 'Payment Methods', 'Refund Policy', 'Access Duration'],
    },
    {
      id: 'reports',
      title: 'Reports & Violations',
      description: 'Report inappropriate activities, misuse, or policy violations to our trust and safety team.',
      icon: AlertTriangle,
      href: '/legal/reports',
      lastUpdated: 'February 18, 2026',
      glow: 'rgba(239,68,68,0.4)',
      color: 'from-red-500 to-rose-500',
      sections: ['How to Report', 'Report Types', 'Investigation Process', 'Legal Disclaimer'],
    },
  ];

  const trustItems = [
    { icon: Shield, title: 'Data Protection', desc: 'AES-256-GCM encryption for credentials, TLS 1.2/1.3 transport, and strict access controls protect your data across maula.ai and spaces.maula.ai.', glow: 'rgba(6,182,212,0.4)' },
    { icon: Eye, title: 'Full Transparency', desc: 'Clear, readable policies that explain exactly how we operate and use your information.', glow: 'rgba(139,92,246,0.4)' },
    { icon: Scale, title: 'User Rights', desc: 'Access, export, or delete your data anytime. Your rights are always our top priority.', glow: 'rgba(16,185,129,0.4)' },
  ];

  /* ── Mouse tracking ── */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ── Twinkling stars canvas ── */
  const initStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 3;

    const starColors = [
      'rgba(255,255,255,', 'rgba(6,182,212,', 'rgba(139,92,246,',
      'rgba(236,72,153,', 'rgba(167,139,250,', 'rgba(34,211,238,',
    ];

    const stars: TwinklingStar[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }
    starsRef.current = stars;
  }, []);

  const animateStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    starsRef.current.forEach((star) => {
      star.twinklePhase += star.twinkleSpeed;
      const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
      const currentOpacity = star.opacity * (0.3 + twinkle * 0.7);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `${star.color}${currentOpacity.toFixed(2)})`;
      ctx.fill();

      // Glow effect for brighter stars
      if (star.size > 1.5 && twinkle > 0.6) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        gradient.addColorStop(0, `${star.color}${(currentOpacity * 0.3).toFixed(2)})`);
        gradient.addColorStop(1, `${star.color}0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });

    animFrameRef.current = requestAnimationFrame(animateStars);
  }, []);

  useEffect(() => {
    initStars();
    animateStars();
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 3;
        initStars();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [initStars, animateStars]);

  /* ── GSAP animations ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('legalWiggle', { wiggles: 5, type: 'uniform' });

      /* ── Background ── */
      gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
      });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      /* ── Hero entrance ── */
      gsap.fromTo('.hero-title', { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      gsap.fromTo('.hero-subtitle', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });

      /* ── Hero icon pulse ── */
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      /* ── Typewriter ── */
      if (typewriterRef.current) {
        const phrases = ['GDPR & CCPA compliant', 'SOC 2 Type II certified', 'Your data, your rights', 'Transparent by design', 'End-to-end encrypted'];
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tl.to({}, { duration: 2 });
          tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      /* ── Compliance badges entrance ── */
      gsap.from('.compliance-badge', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 });

      /* ── Legal cards stagger ── */
      gsap.utils.toArray<HTMLElement>('.legal-card').forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          opacity: 0, y: 60, scale: 0.92, duration: 0.7, delay: (i % 3) * 0.1, ease: 'power3.out',
        });
      });

      /* ── Trust section ── */
      gsap.set('.trust-section', { y: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.trust-section', start: 'top 85%',
        onEnter: () => {
          gsap.to('.trust-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
          gsap.from('.trust-card', { y: 50, opacity: 0, scale: 0.9, stagger: 0.15, duration: 0.6, delay: 0.2, ease: 'back.out(1.7)' });
        },
      });

      /* ── CTA entrance ── */
      gsap.set('.cta-section', { y: 50, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.cta-section', start: 'top 90%',
        onEnter: () => gsap.to('.cta-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }),
      });

      /* ── Scroll velocity skew ── */
      Observer.create({
        target: containerRef.current,
        type: 'scroll',
        onChangeY: (self) => {
          const velocity = Math.min(Math.abs(self.velocityY) / 1000, 1);
          gsap.to('.legal-card', { skewY: self.velocityY > 0 ? velocity * 1.5 : -velocity * 1.5, duration: 0.3, ease: 'power2.out' });
        },
        onStop: () => gsap.to('.legal-card', { skewY: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }),
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  /* ── Card hover with tilt + glow ── */
  const handleCardHover = (cardId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    if (isEntering) {
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
      gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)' });
      gsap.to(card.querySelector('.card-arrow'), { x: 6, opacity: 1, duration: 0.3 });
    } else {
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
      gsap.to(card.querySelector('.card-icon-wrap'), { scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-arrow'), { x: 0, opacity: 0.3, duration: 0.3 });
    }
  };

  const handleCardMove = (e: React.MouseEvent, cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) {
      shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
    }
  };

  const handleCardLeave = (cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ TWINKLING STARS CANVAS ═══ */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.8 }} />

      {/* ═══ DEEP DARK BACKGROUND LAYER ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(6,182,212,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
        ))}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)' }} />
      </div>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden z-10">
        <div className="container mx-auto px-4 text-center relative z-10">

          {/* Animated icon with rotating ring */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
              <Scale className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 className="hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Legal &</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Compliance</span>
          </h1>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
            Transparency and trust are at the core of our AI platform. Review our legal documents to understand how we
            <span className="text-cyan-400"> protect your rights.</span>
          </p>

          {/* Typewriter badge */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                <Lock className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>

          {/* Compliance Badges */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="compliance-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-cyan-500/20 backdrop-blur-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400 font-medium">GDPR Compliant</span>
            </div>
            <div className="compliance-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-violet-500/20 backdrop-blur-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-gray-400 font-medium">CCPA Ready</span>
            </div>
            <div className="compliance-badge px-5 py-2.5 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-400 font-medium">SOC 2 Type II</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LEGAL DOCUMENTS GRID ═══ */}
      <section className="relative py-16 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">

            {/* Section Header */}
            <div className="flex items-center gap-4 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-400/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.15))' }}>
                <FileText className="w-5 h-5" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Legal Documents</h2>
                <p className="text-sm text-gray-600">5 policies governing our platform and your rights</p>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {legalDocuments.map((doc) => {
                const IconComp = doc.icon;
                return (
                  <Link
                    key={doc.id}
                    href={doc.href}
                    data-card-id={doc.id}
                    className="legal-card group relative block"
                    style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                    onMouseEnter={() => handleCardHover(doc.id, true)}
                    onMouseLeave={() => { handleCardHover(doc.id, false); handleCardLeave(doc.id); }}
                    onMouseMove={(e) => handleCardMove(e, doc.id)}
                  >
                    <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${doc.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                    <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                      <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                      <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${doc.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                      <div className="relative z-10">
                        {/* Icon */}
                        <div className="card-icon-wrap mb-4">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-cyan-400/30"
                            style={{
                              background: `linear-gradient(135deg, ${doc.glow.replace('0.4', '0.25')}, rgba(6,182,212,0.15))`,
                              boxShadow: `0 0 20px ${doc.glow.replace('0.4', '0.12')}, 0 0 40px ${doc.glow.replace('0.4', '0.06')}`,
                            }}>
                            <IconComp className="w-7 h-7" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${doc.glow})` }} />
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">{doc.title}</h3>

                        {/* Description */}
                        <p className="text-gray-600 text-[13px] leading-relaxed mb-3 group-hover:text-gray-500 transition-colors duration-300">{doc.description}</p>

                        {/* Last Updated */}
                        <p className="text-[11px] text-gray-700 font-medium mb-4">Updated: {doc.lastUpdated}</p>

                        {/* Section Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {doc.sections.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.03] border border-white/[0.06] text-gray-600">{s}</span>
                          ))}
                        </div>

                        {/* Action */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                          <span className="text-xs font-semibold text-gray-600 group-hover:text-cyan-400 transition-colors duration-300 uppercase tracking-wider">Read Document</span>
                          <ArrowRight className="card-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-cyan-400 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TRUST SECTION ═══ */}
      <section className="trust-section relative py-20 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))' }}>
                <Star className="w-5 h-5" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Your Trust, Our Commitment</h2>
                <p className="text-sm text-gray-600">How we ensure your information stays safe</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {trustItems.map((item, i) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={i}
                    data-card-id={`trust-${i}`}
                    className="trust-card group relative block"
                    style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                    onMouseEnter={() => handleCardHover(`trust-${i}`, true)}
                    onMouseLeave={() => { handleCardHover(`trust-${i}`, false); handleCardLeave(`trust-${i}`); }}
                    onMouseMove={(e) => handleCardMove(e, `trust-${i}`)}
                  >
                    <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${item.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                    <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
                      <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
                      <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ background: `linear-gradient(to right, ${item.glow}, transparent)` }} />

                      <div className="relative z-10 text-center">
                        <div className="card-icon-wrap inline-block mb-5">
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto border border-cyan-400/30"
                            style={{
                              background: `linear-gradient(135deg, ${item.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))`,
                              boxShadow: `0 0 20px ${item.glow.replace('0.4', '0.12')}, 0 0 40px ${item.glow.replace('0.4', '0.06')}`,
                            }}>
                            <IconComp className="w-8 h-8" style={{ color: '#a5f3fc', filter: `drop-shadow(0 0 8px ${item.glow})` }} />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-200 mb-3 group-hover:text-white transition-colors duration-300">{item.title}</h3>
                        <p className="text-gray-600 text-[13px] leading-relaxed group-hover:text-gray-500 transition-colors duration-300">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA FOOTER ═══ */}
      <section className="cta-section relative py-20 mt-8 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Questions About Our Policies?</h3>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
            Our legal team is here to help clarify any questions you may have about our terms and policies.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/contact" className="px-7 py-3.5 bg-gradient-to-r from-cyan-600/90 to-violet-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-cyan-600/15 hover:shadow-cyan-600/30 transition-all duration-400 flex items-center justify-center gap-2">
              Contact Legal Team
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/support" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Get Support
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL STYLES ═══ */}
      <style jsx global>{`
                html { scroll-behavior: smooth; }

                .legal-card::before,
                .trust-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 1rem;
                    opacity: 0.015;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 1;
                }

                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #030304; }
                ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }

                @keyframes cursorBlink {
                    0%, 45% { opacity: 1; }
                    50%, 95% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .typewriter-cursor {
                    animation: cursorBlink 0.8s ease-in-out infinite;
                }
            `}</style>
    </div>
  );
}
