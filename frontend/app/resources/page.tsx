'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { Sparkles, BookOpen, Newspaper, Video, FileText, GraduationCap, Briefcase, ChevronRight, Mail, Send, Zap, Users, Terminal, Library } from 'lucide-react';

const resourceCategories = [
  {
    title: 'Blog',
    description: '89+ articles on AI history, technology trends, and expert insights.',
    icon: BookOpen,
    href: '/resources/blog',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
    items: ['AI History & Evolution', 'Technology Deep Dives', 'Expert Opinions', 'Industry Analysis']
  },
  {
    title: 'Case Studies',
    description: 'Explore real-world success stories and implementations from our clients.',
    icon: FileText,
    href: '/resources/case-studies',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    items: ['Customer Success', 'ROI Analysis', 'Implementation Stories', 'Before & After']
  },
  {
    title: 'News',
    description: 'Latest news, product updates, and announcements from Maula AI.',
    icon: Newspaper,
    href: '/resources/news',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    items: ['Product Updates', 'Company Announcements', 'Industry News', 'Feature Releases']
  },
  {
    title: 'Webinars',
    description: 'Join live sessions and access recorded presentations from industry experts.',
    icon: Video,
    href: '/resources/webinars',
    color: 'emerald',
    gradient: 'from-emerald-500 to-cyan-500',
    items: ['Live Sessions', 'Recorded Content', 'Expert Panels', 'Q&A Sessions']
  },
  {
    title: 'Documentation',
    description: 'Comprehensive guides and technical documentation for our platform.',
    icon: FileText,
    href: '/resources/documentation',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-500',
    items: ['API Reference', 'Integration Guides', 'Best Practices', 'Troubleshooting']
  },
  {
    title: 'Tutorials',
    description: 'Step-by-step guides to help you get the most out of our AI agents.',
    icon: GraduationCap,
    href: '/resources/tutorials',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    items: ['Getting Started', 'Advanced Features', 'Video Guides', 'Interactive Demos']
  },
  {
    title: 'Careers',
    description: 'Join our team and help shape the future of AI.',
    icon: Briefcase,
    href: '/resources/careers',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    items: ['Open Positions', 'Company Culture', 'Benefits', 'Growth Opportunities']
  }
];

export default function ResourcesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [email, setEmail] = useState('');

  /* ── Scroll to top on mount ── */
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }, []);

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

  /* ── GSAP ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('resourceWiggle', { wiggles: 5, type: 'uniform' });

      // Hero entrance
      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      // Hero icon pulse
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(6,182,212,0.5), 0 0 160px rgba(6,182,212,0.2), inset 0 0 30px rgba(6,182,212,0.1)',
        scale: 1.08,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Rotating rings
      gsap.to('.hero-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });

      // Typewriter
      if (typewriterRef.current) {
        const phrases = [
          'Read 89+ AI articles',
          'Explore real case studies',
          'Watch expert webinars',
          'Follow step-by-step tutorials',
          'Browse API documentation',
          'Discover career opportunities',
          'Stay updated with AI news',
          'Learn best practices',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      // Resource cards
      ScrollTrigger.batch('.resource-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 60, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)' }
          );
        },
        start: 'top 90%',
        once: true
      });

      // CTA section
      ScrollTrigger.create({
        trigger: '.cta-section',
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.fromTo('.cta-section',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
          );
        }
      });

      // Floating icons
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

      // Card hover
      document.querySelectorAll('.resource-card').forEach(card => {
        const glow = card.querySelector('.card-glow');
        const icon = card.querySelector('.card-icon');
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.02, y: -8, duration: 0.3, ease: 'back.out(2)' });
          if (glow) gsap.to(glow, { opacity: 0.06, duration: 0.3 });
          if (icon) gsap.to(icon, { scale: 1.1, rotation: 5, duration: 0.3, ease: 'back.out(2)' });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, duration: 0.3, ease: 'power2.out' });
          if (glow) gsap.to(glow, { opacity: 0, duration: 0.3 });
          if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
        });
      });

      ScrollTrigger.refresh();
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* Twinkling stars */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Nebula orbs */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.015) 2px, rgba(6,182,212,0.015) 4px)' }} />

      {/* Micro grid */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Floating icons */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[10%]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Animated icon with rotating rings */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-cyan-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-cyan-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-cyan-400/40 shadow-2xl shadow-cyan-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.25) 50%, rgba(6,182,212,0.3) 100%)' }}>
              <Library className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Resources &</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Learning</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Discover insights, learn best practices, and stay ahead with our
            <span className="text-cyan-400"> comprehensive resource library.</span>
          </p>

          {/* Typewriter badge */}
          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-cyan-600/15 border border-cyan-500/25 backdrop-blur-sm shadow-lg shadow-cyan-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30">
                <Terminal className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-cyan-400 font-semibold">I can</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-cyan-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ RESOURCE CARDS ════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resourceCategories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className="resource-card group relative block"
            >
              <div className={`card-glow absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-2xl opacity-0 blur-xl transition-opacity`} />

              <div className={`relative h-full p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className={`card-icon w-14 h-14 rounded-xl bg-gradient-to-br ${category.gradient} bg-opacity-20 flex items-center justify-center mb-4 shadow-lg`} style={{ background: `linear-gradient(135deg, var(--tw-gradient-from) / 0.2, var(--tw-gradient-to) / 0.2)` }}>
                  <category.icon className="w-7 h-7 text-white/80" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {category.title}
                </h3>

                <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                  {category.description}
                </p>

                <ul className="space-y-2 mb-4">
                  {category.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center text-cyan-400 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                  Explore
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════ NEWSLETTER CTA ════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-500/20 rounded-bl-lg" />

            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-cyan-400" />
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stay Updated</h2>

              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                Subscribe to our newsletter for the latest resources, insights, and updates delivered to your inbox.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Subscribe
                </button>
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
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
