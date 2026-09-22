'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function FooterGSAP() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const footerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }
    if (!turnstileToken) {
      setStatus('error');
      setMessage('Please complete the security check');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/email/newsletter-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage('You\'re subscribed! Check your email for confirmation.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const footerLinks = [
    { name: 'Agents', href: '/agents' },
    { name: 'Demo', href: 'https://demo.sanbayfusion.com' },
    { name: 'Canvas', href: 'https://studio.sanbayfusion.com' },
    { name: 'Editor', href: 'https://editor.sanbayfusion.com' },
    { name: 'AI Lab', href: '/lab' },
    { name: 'Industries', href: '/industries' },
    { name: 'Pricing', href: '/overview' },
    { name: 'Dashboard', href: '/dashboard/overview' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Community', href: '/community/overview' },
    { name: 'Resources', href: '/resources' },
    { name: 'Careers', href: '/resources/careers' },
    { name: 'All Tools', href: '/tools' },
    { name: 'Status', href: '/status' },
    { name: 'Rewards', href: '/rewards' },
    { name: 'API', href: '/docs/api' },
    { name: 'Support', href: '/support' },
  ];

  const bottomLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Legal', href: '/legal' },
    { name: 'Security', href: '/security' },
  ];

  const socialLinks = [
    {
      name: 'Facebook', href: 'https://facebook.com/maulaai', icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      )
    },
    {
      name: 'Instagram', href: 'https://instagram.com/maulaai', icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      )
    },
    {
      name: 'TikTok', href: 'https://tiktok.com/@maulaai', icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.43v-7.15a8.16 8.16 0 005.58 2.17V11.2a4.85 4.85 0 01-5.58-1.62v7.05"/></svg>
      )
    },
    {
      name: 'GitHub', href: 'https://github.com/maulaai', icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
      )
    },
    {
      name: 'LINE', href: 'https://line.me/R/ti/p/@maulaai', icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
      )
    },
  ];

  // ─── Floating ice particles canvas ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) { canvas.width = rect.width; canvas.height = rect.height; }
    };
    resize();

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      opacity: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
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

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // ─── GSAP Animations ───
  useEffect(() => {
    if (!footerRef.current) return;
    const ctx = gsap.context(() => {
      // Ice blocks reveal
      gsap.set('.ice-block', { y: 30, opacity: 0, scale: 0.96 });
      ScrollTrigger.batch('.ice-block', {
        start: 'top 95%',
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out' }),
      });

      // Frost glow pulse on main container
      gsap.to('.frost-glow', {
        opacity: 0.06,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Social icons hover shimmer
      gsap.utils.toArray<HTMLElement>('.social-ice').forEach(el => {
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { boxShadow: '0 0 20px rgba(147,197,253,0.3), inset 0 0 15px rgba(147,197,253,0.08)', scale: 1.08, duration: 0.3, ease: 'power2.out' });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { boxShadow: '0 0 0px rgba(147,197,253,0), inset 0 0 0px rgba(147,197,253,0)', scale: 1, duration: 0.4, ease: 'power2.out' });
        });
      });

      // Link frost underline
      gsap.utils.toArray<HTMLElement>('.frost-link').forEach(el => {
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { color: 'rgba(186,230,253,1)', textShadow: '0 0 8px rgba(147,197,253,0.4)', duration: 0.25 });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { color: 'rgba(148,163,184,1)', textShadow: '0 0 0px rgba(147,197,253,0)', duration: 0.3 });
        });
      });

      // Fog drift
      gsap.to('.fog-layer-1', { x: 40, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.fog-layer-2', { x: -30, duration: 15, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.fog-layer-3', { x: 20, y: -10, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    }, footerRef);
    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="relative w-full overflow-hidden" style={{ backgroundColor: '#030304' }}>

      {/* ── Frost / Fog Background Layers ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top edge frost glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.15) 20%, rgba(186,230,253,0.25) 50%, rgba(147,197,253,0.15) 80%, transparent)' }} />
        <div className="absolute top-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(180deg, rgba(147,197,253,0.03) 0%, transparent 100%)' }} />

        {/* Deep shadow overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

        {/* Drifting fog layers */}
        <div className="fog-layer-1 absolute top-[10%] left-[-10%] w-[60%] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,0.04) 0%, transparent 70%)' }} />
        <div className="fog-layer-2 absolute top-[40%] right-[-5%] w-[50%] h-[250px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(186,230,253,0.03) 0%, transparent 70%)' }} />
        <div className="fog-layer-3 absolute bottom-[5%] left-[20%] w-[40%] h-[200px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(96,165,250,0.03) 0%, transparent 70%)' }} />

        {/* Frost glow center pulse */}
        <div className="frost-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(ellipse, rgba(147,197,253,1) 0%, transparent 60%)' }} />

        {/* Micro frost grid */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(186,230,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,230,253,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* ── Ice Particle Canvas ── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1]" />

      {/* ── Main Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto pt-20 pb-8 px-4 sm:px-6 lg:px-8">

        {/* Top Row: Brand + Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">

          {/* Brand Ice Block */}
          <div className="lg:col-span-4 ice-block">
            <div className="relative p-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.04) 0%, rgba(186,230,253,0.02) 50%, rgba(96,165,250,0.03) 100%)', border: '1px solid rgba(147,197,253,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(147,197,253,0.04), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
              {/* Inner frost sheen */}
              <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.04) 0%, transparent 100%)' }} />

              <Link href="/" className="relative flex items-center gap-3 mb-5 group">
                <div className="relative">
                  <div className="absolute inset-[-4px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 70%)' }} />
                  <Image src="/images/logos/company-logo.png" alt="Maula AI" width={44} height={44} className="relative w-11 h-11 object-contain" />
                </div>
                <span className="text-xl font-bold" style={{ background: 'linear-gradient(135deg, #e2e8f0 0%, #bae6fd 50%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  sanbayfusion.com
                </span>
              </Link>
              <p className="relative text-sm leading-relaxed text-slate-400/80 mb-6">
                Transform your business with intelligent AI agents. 18+ specialized personalities ready to revolutionize how you work.
              </p>

              {/* Social Ice Cubes */}
              <div className="relative flex items-center gap-2.5">
                {socialLinks.map((social) => (
                  <Link key={social.name} href={social.href} target="_blank" rel="noopener noreferrer"
                    className="social-ice w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-200 transition-colors duration-300"
                    style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.06) 0%, rgba(186,230,253,0.02) 100%)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.05)' }}>
                    {social.icon}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Links Ice Block */}
          <div className="lg:col-span-8 ice-block">
            <div className="relative p-6 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.03) 0%, rgba(186,230,253,0.015) 50%, rgba(96,165,250,0.02) 100%)', border: '1px solid rgba(147,197,253,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(147,197,253,0.03), inset 0 1px 0 rgba(186,230,253,0.05)' }}>
              {/* Top sheen */}
              <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.03) 0%, transparent 100%)' }} />

              <h3 className="relative text-[10px] font-semibold uppercase tracking-[0.2em] mb-6" style={{ color: 'rgba(147,197,253,0.4)' }}>
                Quick Links
              </h3>
              <div className="relative grid grid-cols-3 sm:grid-cols-5 gap-x-6 gap-y-3.5">
                {footerLinks.map((link) => (
                  <Link key={link.name} href={link.href} className="frost-link text-slate-400 text-sm transition-all duration-200">
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Newsletter + App Store Ice Block ── */}
        <div className="ice-block mb-8">
          <div className="relative p-6 sm:p-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.035) 0%, rgba(96,165,250,0.02) 50%, rgba(186,230,253,0.025) 100%)', border: '1px solid rgba(147,197,253,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(147,197,253,0.03), inset 0 1px 0 rgba(186,230,253,0.06)' }}>
            {/* Frost sheen bar */}
            <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(186,230,253,0.035) 0%, transparent 100%)' }} />
            {/* Corner frost accents */}
            <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(147,197,253,0.06) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none" style={{ background: 'radial-gradient(circle at bottom right, rgba(96,165,250,0.04) 0%, transparent 70%)' }} />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Newsletter */}
              <div>
                <h4 className="text-white font-semibold mb-1.5 text-lg" style={{ textShadow: '0 0 20px rgba(147,197,253,0.1)' }}>Stay in the loop</h4>
                <p className="text-slate-500 text-sm mb-4">Get the latest updates on new features and announcements.</p>
                <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none transition-all duration-300"
                    style={{ background: 'rgba(147,197,253,0.04)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 0px rgba(147,197,253,0)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.25)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px rgba(147,197,253,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(147,197,253,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 0px rgba(147,197,253,0)'; }}
                    required
                  />
                  <button type="submit" disabled={status === 'loading' || !turnstileToken} className="px-6 py-3 rounded-xl font-medium text-sm text-white whitespace-nowrap transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(6,182,212,0.5) 100%)', border: '1px solid rgba(147,197,253,0.2)', boxShadow: '0 4px 16px rgba(59,130,246,0.2), inset 0 1px 0 rgba(186,230,253,0.15)' }}>
                    {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </form>
                <div className="mt-3 flex">
                  <div className="overflow-hidden rounded-xl transition-all duration-300"
                    style={{ border: '1px solid rgba(147,197,253,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.05)', filter: 'brightness(0.55) contrast(1.1)' }}>
                    <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
                  </div>
                </div>
                {status === 'success' && (
                  <p className="text-blue-300 text-sm flex items-center gap-2 mt-3" style={{ textShadow: '0 0 8px rgba(147,197,253,0.3)' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {message}
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-red-400 text-sm mt-3">{message}</p>
                )}
              </div>

              {/* App Badges */}
              <div className="flex flex-wrap gap-3 md:justify-end">
                {/* App Store */}
                <div className="relative group">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-not-allowed transition-all duration-300 group-hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.05) 0%, rgba(186,230,253,0.02) 100%)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.05)' }}>
                    <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 leading-tight">Download on the</span>
                      <span className="text-sm font-semibold text-slate-200 leading-tight">App Store</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(6,182,212,0.7))', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                    SOON
                  </div>
                </div>

                {/* Google Play */}
                <div className="relative group">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-not-allowed transition-all duration-300 group-hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, rgba(147,197,253,0.05) 0%, rgba(186,230,253,0.02) 100%)', border: '1px solid rgba(147,197,253,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.05)' }}>
                    <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 leading-tight">GET IT ON</span>
                      <span className="text-sm font-semibold text-slate-200 leading-tight">Google Play</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(6,182,212,0.7))', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                    SOON
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="ice-block">
          <div className="relative py-5 px-1" style={{ borderTop: '1px solid rgba(147,197,253,0.06)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-slate-600 text-sm">
                © {currentYear} Maula AI. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                {bottomLinks.map((link) => (
                  <Link key={link.name} href={link.href} className="frost-link text-slate-500 text-sm transition-all duration-200">
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom frost scrollbar for this section ── */}
      <style jsx>{`
        footer ::-webkit-scrollbar { width: 4px; }
        footer ::-webkit-scrollbar-track { background: transparent; }
        footer ::-webkit-scrollbar-thumb { background: rgba(147,197,253,0.2); border-radius: 2px; }
      `}</style>
    </footer>
  );
}
