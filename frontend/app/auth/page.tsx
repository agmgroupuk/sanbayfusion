'use client';

import { useEffect, useRef } from 'react';
import { gsap, SplitText } from '@/lib/gsap';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const features = [
    { icon: '💬', title: 'Saved Conversations', desc: 'Your chat history persists across sessions' },
    { icon: '🤖', title: '18 AI Agents', desc: 'Access to all specialized AI assistants' },
    { icon: '⚡', title: 'Personalized Experience', desc: 'Tailored recommendations and preferences' }
  ];

  // ─── Ice particles canvas ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
      opacity: Math.random() * 0.4 + 0.1, phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() * 0.001;
      particles.forEach(p => {
        p.x += p.vx + Math.sin(t + p.phase) * 0.15;
        p.y += p.vy;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        const flicker = p.opacity + Math.sin(t * 2 + p.phase) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 255, ${Math.max(0, flicker)})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // ─── GSAP Animations ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSubtitle = new SplitText('.hero-subtitle', { type: 'words' });

      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateX: -90 });
      gsap.set(heroSubtitle.words, { y: 30, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });
      gsap.set('.ice-card', { y: 60, opacity: 0, scale: 0.95 });
      gsap.set('.features-block', { y: 60, opacity: 0 });
      gsap.set('.feature-item', { y: 30, opacity: 0 });
      gsap.set('.footer-links', { y: 20, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.4')
        .to(heroSubtitle.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4')
        .to('.ice-card', { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.4)' }, '-=0.3')
        .to('.features-block', { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
        .to('.feature-item', { y: 0, opacity: 1, duration: 0.4, stagger: 0.1 }, '-=0.2')
        .to('.footer-links', { y: 0, opacity: 1, duration: 0.4 }, '-=0.2');

      gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.frost-glow', { opacity: 0.06, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -8 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.card-glow'), { opacity: entering ? 1 : 0, duration: 0.3 });
    gsap.to(card.querySelector('.card-icon'), { scale: entering ? 1.15 : 1, rotate: entering ? 8 : 0, duration: 0.4, ease: 'back.out(2)' });
    gsap.to(card.querySelector('.card-arrow'), { x: entering ? 8 : 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#030304' }}>
      {/* ── Frost / Fog Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.15) 20%, rgba(186,230,253,0.25) 50%, rgba(147,197,253,0.15) 80%, transparent)' }} />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(186,230,253,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(186,230,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,230,253,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="fog-layer-1 absolute top-[20%] left-[-10%] w-[60%] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
        <div className="fog-layer-2 absolute top-[50%] right-[-5%] w-[50%] h-[250px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(186,230,253,0.03) 0%, transparent 70%)' }} />
        <div className="frost-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,1) 0%, transparent 60%)' }} />
      </div>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* ── Header ── */}
          <div className="mb-12">
            <div className="hero-icon inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.08) 0%, rgba(186,230,253,0.04) 100%)', border: '1px solid rgba(147,197,253,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.05), inset 0 1px 0 rgba(186,230,253,0.08)' }}>
              <Image src="/images/logos/company-logo-original.png" alt="Maula AI" width={120} height={120} className="w-28 h-28 object-contain" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Welcome to AI Agents</span>
            </h1>
            <p className="hero-subtitle text-xl max-w-2xl mx-auto" style={{ color: 'rgba(148,163,184,0.8)' }}>
              Join our platform to access powerful AI agents, save your conversations, and unlock personalized experiences tailored just for you.
            </p>
          </div>

          {/* ── Auth Ice Cards ── */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
            <Link href="/auth/signup" className="ice-card group relative block" onMouseEnter={(e) => handleCardHover(e, true)} onMouseLeave={(e) => handleCardHover(e, false)}>
              <div className="relative p-8 rounded-2xl overflow-hidden h-full" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
                <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.04) 0%, transparent 100%)' }} />
                <div className="card-glow absolute inset-0 opacity-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <div className="card-icon w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.12) 0%, rgba(96,165,250,0.08) 100%)', border: '1px solid rgba(147,197,253,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.1)' }}>
                    <span className="text-2xl">👤</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors" style={{ textShadow: '0 0 20px rgba(147,197,253,0.1)' }}>Create Account</h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(148,163,184,0.7)' }}>New to our platform? Sign up to start your AI journey with personalized agents.</p>
                  <div className="flex items-center justify-center gap-2 font-semibold" style={{ color: 'rgba(147,197,253,0.8)' }}>Get Started <span className="card-arrow">→</span></div>
                  <p className="text-xs mt-4" style={{ color: 'rgba(148,163,184,0.4)' }}>Paid per-agent access • Starting at $1/day</p>
                </div>
              </div>
            </Link>

            <Link href="/auth/login" className="ice-card group relative block" onMouseEnter={(e) => handleCardHover(e, true)} onMouseLeave={(e) => handleCardHover(e, false)}>
              <div className="relative p-8 rounded-2xl overflow-hidden h-full" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
                <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.04) 0%, transparent 100%)' }} />
                <div className="card-glow absolute inset-0 opacity-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(147,197,253,0.08) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <div className="card-icon w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.12) 0%, rgba(96,165,250,0.08) 100%)', border: '1px solid rgba(147,197,253,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.1)' }}>
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors" style={{ textShadow: '0 0 20px rgba(147,197,253,0.1)' }}>Welcome Back</h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(148,163,184,0.7)' }}>Already have an account? Sign in to continue your conversations.</p>
                  <div className="flex items-center justify-center gap-2 font-semibold" style={{ color: 'rgba(147,197,253,0.8)' }}>Sign In <span className="card-arrow">→</span></div>
                  <p className="text-xs mt-4" style={{ color: 'rgba(148,163,184,0.4)' }}>Secure • Fast • Easy</p>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Features Ice Block ── */}
          <div className="features-block relative p-8 rounded-2xl overflow-hidden mb-8" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.035) 0%, rgba(96,165,250,0.02) 50%, rgba(186,230,253,0.025) 100%)', border: '1px solid rgba(147,197,253,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(147,197,253,0.03), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
            <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.035) 0%, transparent 100%)' }} />
            <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(147,197,253,0.06) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom right, rgba(96,165,250,0.04) 0%, transparent 70%)' }} />
            <h3 className="relative text-2xl font-bold text-white mb-8" style={{ textShadow: '0 0 20px rgba(147,197,253,0.1)' }}>What you&apos;ll get with an account</h3>
            <div className="relative grid md:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className="feature-item text-center">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.08) 0%, rgba(186,230,253,0.04) 100%)', border: '1px solid rgba(147,197,253,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.08)' }}>
                    <span className="text-2xl">{f.icon}</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2" style={{ textShadow: '0 0 12px rgba(147,197,253,0.08)' }}>{f.title}</h4>
                  <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer Links ── */}
          <div className="footer-links flex justify-center items-center gap-6 flex-wrap text-sm">
            <Link href="/auth/reset-password" className="frost-link transition-all duration-200" style={{ color: 'rgba(147,197,253,0.7)' }}>Forgot Password?</Link>
            <span style={{ color: 'rgba(147,197,253,0.15)' }}>•</span>
            <Link href="/legal" className="frost-link transition-all duration-200" style={{ color: 'rgba(148,163,184,0.5)' }}>Terms & Privacy</Link>
            <span style={{ color: 'rgba(147,197,253,0.15)' }}>•</span>
            <Link href="/support" className="frost-link transition-all duration-200" style={{ color: 'rgba(148,163,184,0.5)' }}>Need Help?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
