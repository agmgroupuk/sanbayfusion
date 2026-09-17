'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { Video, Calendar, Clock, User, ArrowRight, Play, Users, Bell, Terminal, Sparkles, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, TextPlugin);

const webinars = [
  {
    title: "GenCraft Pro: Text to App in Minutes",
    date: "July 12, 2025",
    time: "2:00 PM EST",
    speaker: "Maula AI Team",
    role: "Product Engineering",
    status: "Upcoming",
    description: "See how GenCraft Pro turns natural language prompts into fully functional web apps with 170+ tools and one-click deployment.",
    topics: ["Text to App", "170+ Tools", "One-Click Deploy"],
    color: 'purple'
  },
  {
    title: "Canvas Studio: Professional AI Code Editor",
    date: "July 26, 2025",
    time: "3:00 PM EST",
    speaker: "Maula AI Team",
    role: "Product Engineering",
    status: "Upcoming",
    description: "Explore Canvas Studio's 16 specialized panels — from Knowledge Graph to Security Scanner — for a complete development workflow.",
    topics: ["16 Panels", "Knowledge Graph", "Collaboration"],
    color: 'cyan'
  },
  {
    title: "Building with AI Agents on Maula",
    date: "August 9, 2025",
    time: "2:00 PM EST",
    speaker: "Maula AI Team",
    role: "AI Engineering",
    status: "Upcoming",
    description: "Master Einstein, Tech Wizard, and all 8 specialized AI agents — learn prompt techniques, voice interaction, and multi-turn conversations.",
    topics: ["Agent Prompts", "Voice Interaction", "Multi-turn Chat"],
    color: 'emerald'
  },
  {
    title: "AI Lab & Developer Tools Deep Dive",
    date: "June 14, 2025",
    time: "2:00 PM EST",
    speaker: "Maula AI Team",
    role: "Developer Relations",
    status: "Recorded",
    description: "Hands-on walkthrough of AI Lab experiments and Developer Tools including API playground, webhooks, and SDK integration.",
    topics: ["AI Lab", "API Playground", "SDK Integration"],
    color: 'amber'
  },
  {
    title: "Image to Code with GenCraft Pro",
    date: "May 31, 2025",
    time: "3:00 PM EST",
    speaker: "Maula AI Team",
    role: "Product Engineering",
    status: "Recorded",
    description: "Upload screenshots, mockups, or wireframes and watch GenCraft Pro convert them into pixel-perfect working code.",
    topics: ["Image to Code", "Screenshot Conversion", "Live Preview"],
    color: 'pink'
  },
  {
    title: "Real-time Collaboration in Canvas Studio",
    date: "May 17, 2025",
    time: "2:00 PM EST",
    speaker: "Maula AI Team",
    role: "Product Engineering",
    status: "Recorded",
    description: "Set up team projects with role-based access, live cursors, and integrated AI assistance for collaborative coding.",
    topics: ["Team Roles", "Live Collaboration", "AI Assistance"],
    color: 'blue'
  }
];

export default function WebinarsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'recorded'>('all');

  const filteredWebinars = webinars.filter(w => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return w.status === 'Upcoming';
    if (filter === 'recorded') return w.status === 'Recorded';
    return true;
  });

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
      CustomWiggle.create('webinarWiggle', { wiggles: 5, type: 'uniform' });

      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(16,185,129,0.5), 0 0 160px rgba(16,185,129,0.2), inset 0 0 30px rgba(16,185,129,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      if (typewriterRef.current) {
        const phrases = [
          'GenCraft Pro: Text to App',
          'Canvas Studio Deep Dive',
          'AI Agents Masterclass',
          'Developer Tools & API',
          'Live Q&A Sessions',
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

      ScrollTrigger.batch('.webinar-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 60, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)' }
          );
        }, start: 'top 90%', once: true
      });

      document.querySelectorAll('.webinar-card').forEach(card => {
        const glow = card.querySelector('.card-glow');
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { scale: 1.02, y: -5, duration: 0.3, ease: 'back.out(2)' });
          if (glow) gsap.to(glow, { opacity: 0.06, duration: 0.3 });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { scale: 1, y: 0, duration: 0.3, ease: 'power2.out' });
          if (glow) gsap.to(glow, { opacity: 0, duration: 0.3 });
        });
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
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Video className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-emerald-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-emerald-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-emerald-400/40 shadow-2xl shadow-emerald-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(16,185,129,0.3) 100%)' }}>
              <Video className="w-14 h-14 relative z-10" style={{ color: '#6ee7b7', filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.8)) drop-shadow(0 0 40px rgba(16,185,129,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Webinars</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Join live sessions and access recorded presentations from
            <span className="text-emerald-400"> industry experts.</span>
          </p>

          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-cyan-600/10 to-emerald-600/15 border border-emerald-500/25 backdrop-blur-sm shadow-lg shadow-emerald-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/30">
                <Terminal className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-emerald-400 font-semibold">Live</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto flex justify-center gap-3">
          {[
            { id: 'all', label: 'All Webinars' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'recorded', label: 'Recorded' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as 'all' | 'upcoming' | 'recorded')}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${filter === f.id
                ? 'bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 text-white shadow-lg shadow-emerald-600/15'
                : 'bg-white/[0.03] text-gray-600 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Webinars Grid */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWebinars.map((webinar, index) => (
            <div key={index} className="webinar-card group relative">
              <div className="card-glow absolute inset-0 bg-emerald-500/20 rounded-2xl opacity-0 blur-xl transition-opacity" />

              <div className={`relative h-full p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all flex flex-col overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${webinar.status === 'Upcoming'
                      ? 'border-emerald-500/20 bg-emerald-500/10'
                      : 'border-violet-500/20 bg-violet-500/10'
                    }`}
                    style={{
                      boxShadow: webinar.status === 'Upcoming'
                        ? '0 0 20px rgba(16,185,129,0.12)'
                        : '0 0 20px rgba(139,92,246,0.12)',
                    }}>
                    {webinar.status === 'Upcoming' ? (
                      <Calendar className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Play className="w-6 h-6 text-violet-400" />
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${webinar.status === 'Upcoming'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    }`}>
                    {webinar.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {webinar.title}
                </h3>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                  {webinar.description}
                </p>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {webinar.date}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    {webinar.time}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <User className="w-4 h-4" />
                    {webinar.speaker} &bull; {webinar.role}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {webinar.topics.map((topic, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                      {topic}
                    </span>
                  ))}
                </div>

                <Link
                  href="/resources/webinars/register"
                  className={`w-full py-3 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2 text-sm ${webinar.status === 'Upcoming'
                      ? 'bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 text-white shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/30'
                      : 'bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15]'
                    }`}
                >
                  {webinar.status === 'Upcoming' ? (
                    <>Register Now <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Watch Recording <Play className="w-4 h-4" /></>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                style={{ boxShadow: '0 0 20px rgba(16,185,129,0.12)' }}>
                <Bell className="w-8 h-8 text-emerald-400" />
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Stay Updated</h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                Subscribe to get notifications about upcoming webinars and events.
              </p>
              <Link
                href="/agents"
                className="inline-flex items-center px-7 py-3.5 bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/30 transition-all gap-2"
              >
                Subscribe Now
                <ArrowRight className="w-4 h-4" />
              </Link>
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
