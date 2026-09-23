'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { Users, Terminal } from 'lucide-react';


export default function CommunityOverviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const communityLinks = [
    { emoji: '💬', title: 'Discord Community', description: 'Join our active Discord server to connect with other AI enthusiasts, get help, and share your projects.', link: '/community/discord', linkText: 'Join Discord', color: 'from-indigo-500 to-purple-600' },
    { emoji: '🔧', title: 'Contributing', description: 'Help improve Sanbay Fusion by contributing code, reporting bugs, or suggesting new features.', link: '/community/contributing', linkText: 'Get Involved', color: 'from-green-500 to-emerald-600' },
    { emoji: '🗺️', title: 'Open Roadmap', description: 'See what features are coming next, track progress, and vote on what matters to you.', link: '/community/roadmap', linkText: 'View Roadmap', color: 'from-amber-500 to-orange-600' },
    { emoji: '💡', title: 'Suggestions', description: 'Share your ideas and feature requests. We love hearing from our community!', link: '/community/suggestions', linkText: 'Submit Ideas', color: 'from-pink-500 to-rose-600' }
  ];

  const stats = [
    { number: '10K+', label: 'Active Members', emoji: '👥' },
    { number: '5K+', label: 'GitHub Stars', emoji: '⭐' },
    { number: '500+', label: 'Contributions', emoji: '🔧' },
    { number: '18', label: 'AI Agents', emoji: '🤖' }
  ];

  const highlights = [
    { icon: '❤️', title: 'Supportive Environment', description: 'Our community is welcoming to all skill levels' },
    { icon: '💻', title: 'Open Source Spirit', description: 'Transparency and collaboration at our core' },
    { icon: '⭐', title: 'Recognition', description: 'Top contributors get featured and rewarded' }
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
      CustomWiggle.create('communityWiggle', { wiggles: 5, type: 'easeOut' });

      // Hero entrance
      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });
      gsap.set('.cta-btn', { y: 30, opacity: 0, scale: 0.9 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9')
        .to('.cta-btn', { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)' }, '-=0.6');

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
          'Connect with AI enthusiasts',
          'Contribute code & ideas',
          'Vote on the roadmap',
          'Get help from the community',
          'Share your AI projects',
          'Join the Discord server',
          'Earn contributor rewards',
          'Shape the future of AI',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      // ScrambleText on stats
      gsap.utils.toArray<HTMLElement>('.stat-number').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(el, { duration: 1.8, scrambleText: { text: el.dataset.value || el.innerText, chars: '0123456789+K', speed: 0.5 } });
          },
          once: true
        });
      });

      // Stat cards batch
      gsap.set('.stat-card', { y: 80, opacity: 0, scale: 0.85 });
      ScrollTrigger.batch('.stat-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.5)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 80, opacity: 0, scale: 0.85, duration: 0.3 })
      });

      // Link cards Flip reveal
      gsap.set('.link-card', { opacity: 0, y: 60 });
      ScrollTrigger.batch('.link-card', {
        start: 'top 80%',
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.6, delay: i * 0.1, ease: 'power2.out' });
          });
        }
      });

      // Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-bg-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-bg-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      // MotionPath orbit
      gsap.to('.orbit-dot', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 80, y: -40 }, { x: 160, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 10,
        repeat: -1,
        ease: 'none'
      });

      // Wiggle icons on hover
      gsap.utils.toArray<HTMLElement>('.wiggle-icon').forEach((icon) => {
        icon.addEventListener('mouseenter', () => {
          gsap.to(icon, { rotation: 25, duration: 0.6, ease: 'communityWiggle' });
        });
        icon.addEventListener('mouseleave', () => {
          gsap.to(icon, { rotation: 0, duration: 0.3 });
        });
      });

      // DrawSVG
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.draw-section',
        start: 'top 70%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' })
      });

      // Highlight cards
      gsap.set('.highlight-card', { y: 50, opacity: 0 });
      ScrollTrigger.batch('.highlight-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out' })
      });

      // Float particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-80, 80)`, y: `random(-60, 60)`, rotation: `random(-90, 90)`,
          duration: `random(5, 10)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.25
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -8 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.card-glow'), { opacity: entering ? 0.06 : 0, duration: 0.3 });
    gsap.to(card.querySelector('.card-arrow'), { x: entering ? 8 : 0, duration: 0.3 });
  };

  const card = 'rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm';
  const innerCard = 'rounded-xl bg-white/[0.02] border border-white/[0.06]';

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      {/* Twinkling stars */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Nebula orbs */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-bg-1 absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-bg-2 absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] right-[30%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.015) 2px, rgba(6,182,212,0.015) 4px)' }} />

      {/* Micro grid */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Float particles & orbit */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 4) * 20}%` }} />
        ))}
        <div className="orbit-dot absolute top-32 left-1/4 w-2 h-2 bg-purple-400/40 rounded-full" />
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
              <Users className="w-14 h-14 relative z-10" style={{ color: '#a5f3fc', filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Our</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Community</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light">
            Join thousands of AI enthusiasts, developers, and innovators building the future together.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link href="/community/discord" className="cta-btn inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all">
              💬 Join Discord
            </Link>
            <Link href="/community/contributing" className="cta-btn inline-flex items-center gap-2 px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
              🔧 Contribute
            </Link>
          </div>

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

      {/* ════════ STATS ════════ */}
      <section className="relative z-10 py-16 px-4 draw-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Community Stats</h2>
            <p className="text-gray-500 text-lg">A growing community making AI accessible to everyone</p>
          </div>

          <svg className="absolute left-0 right-0 top-1/2 h-1 w-full opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#lineGradient)" strokeWidth="2" />
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className={`stat-card relative p-6 ${card} text-center overflow-hidden group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all`}>
                <span className="text-4xl mb-3 block wiggle-icon">{stat.emoji}</span>
                <div className="stat-number text-3xl md:text-4xl font-bold text-cyan-400" data-value={stat.number}>
                  {stat.number}
                </div>
                <p className="text-gray-500 text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ GET INVOLVED ════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.02] border border-cyan-500/20 mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Get Involved</h2>
            <p className="text-gray-500 text-lg">There are many ways to be part of our community</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {communityLinks.map((item, idx) => (
              <Link
                key={idx}
                href={item.link}
                className="link-card group relative block"
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
              >
                <div className={`relative p-8 ${card} overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all`}>
                  <div className={`card-glow absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl opacity-0`} />
                  <div className="relative z-10 flex items-start gap-5">
                    <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300 wiggle-icon`}>
                      {item.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                      <p className="text-gray-500 mb-4">{item.description}</p>
                      <div className="flex items-center gap-2 text-cyan-400 font-medium">
                        {item.linkText}
                        <span className="card-arrow transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ WHY JOIN US ════════ */}
      <section ref={cardsContainerRef} className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Why Join Us?</h2>
            <p className="text-gray-500 text-lg">Be part of a community that values collaboration, learning, and innovation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {highlights.map((item, idx) => (
              <div key={idx} className={`highlight-card relative p-8 ${card} text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all`}>
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BOTTOM CTA ════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`relative p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to Get Started?</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                Join our community today and be part of the AI revolution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/community/discord" className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all">
                  💬 Join Discord
                </Link>
                <Link href="/community" className="px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                  Browse Community
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
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
