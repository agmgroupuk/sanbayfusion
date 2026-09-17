'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { Briefcase, Users, Code, TrendingUp, MapPin, Clock, Heart, Zap, Coffee, GraduationCap, ArrowRight, Sparkles, Check, ChevronRight, Terminal, DollarSign } from 'lucide-react';

const jobListings = [
  {
    id: 'sales-executive',
    title: 'Sales Executive',
    department: 'Business Development',
    location: 'Remote / Hybrid',
    type: 'Full-time',
    experience: '3+ years',
    color: 'emerald',
    gradient: 'from-emerald-500 to-cyan-500',
    icon: TrendingUp,
  },
  {
    id: 'sales-manager',
    title: 'Sales Manager',
    department: 'Business Development',
    location: 'Remote / Hybrid',
    type: 'Full-time',
    experience: '5+ years',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    icon: Briefcase,
  },
  {
    id: 'fullstack-developer',
    title: 'Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    experience: '2+ years',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
    icon: Code,
  },
  {
    id: 'ai-engineer',
    title: 'AI/ML Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    experience: '3+ years',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    icon: Zap,
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    experience: '2+ years',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    icon: Sparkles,
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    experience: '3+ years',
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-500',
    icon: Code,
  },
];

const benefits = [
  { icon: DollarSign, title: 'Competitive Salary', desc: 'Top-of-market compensation with equity options' },
  { icon: Heart, title: 'Health Benefits', desc: 'Comprehensive health, dental, and vision coverage' },
  { icon: Coffee, title: 'Remote First', desc: 'Work from anywhere with flexible hours' },
  { icon: GraduationCap, title: 'Learning Budget', desc: '$2,000/year for courses and conferences' },
  { icon: Users, title: 'Great Team', desc: 'Collaborative culture with talented people' },
  { icon: Zap, title: 'Fast Growth', desc: 'Rapid career advancement opportunities' },
];

const values = [
  { title: 'Innovation', desc: 'We push boundaries and embrace new ideas' },
  { title: 'Transparency', desc: 'Open communication and honest feedback' },
  { title: 'Impact', desc: 'Every contribution matters and makes a difference' },
  { title: 'Growth', desc: 'Continuous learning and personal development' },
];

export default function CareersPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

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
      CustomWiggle.create('careerWiggle', { wiggles: 5, type: 'uniform' });

      // Hero entrance
      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      // Hero icon pulse
      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(139,92,246,0.5), 0 0 160px rgba(139,92,246,0.2), inset 0 0 30px rgba(139,92,246,0.1)',
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
          'Join our engineering team',
          'Build the future of AI',
          'Work from anywhere globally',
          'Shape conversational AI',
          'Grow your career with us',
          'Collaborate with top talent',
          'Design innovative products',
          'Make a real impact',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

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

      // Job cards
      ScrollTrigger.batch('.job-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 60, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)' }
          );
        },
        start: 'top 90%',
        once: true
      });

      // Benefit cards
      ScrollTrigger.batch('.benefit-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
          );
        },
        start: 'top 90%',
        once: true
      });

      // Value cards
      ScrollTrigger.batch('.value-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { x: -30, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }
          );
        },
        start: 'top 90%',
        once: true
      });

      // CTA
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

      // Card hover effects
      document.querySelectorAll('.job-card').forEach(card => {
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
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)' }} />

      {/* Micro grid */}
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Floating icons */}
      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[10%]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">

          {/* Animated icon with rotating rings */}
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <Briefcase className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Build the</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Future</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Join Maula AI and help shape the future of
            <span className="text-violet-400"> conversational AI.</span>
          </p>

          {/* Typewriter badge */}
          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-cyan-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <Terminal className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-violet-400 font-semibold">I can</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ OPEN POSITIONS ════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Open Positions</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Find your next role and join our growing team of passionate innovators.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobListings.map((job) => (
              <Link
                key={job.id}
                href={`/resources/apply-job?position=${encodeURIComponent(job.title)}&id=${job.id}`}
                className="job-card group relative block"
              >
                <div className={`card-glow absolute inset-0 bg-gradient-to-r ${job.gradient} rounded-2xl opacity-0 blur-xl transition-opacity`} />

                <div className={`relative h-full p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className={`card-icon w-12 h-12 rounded-xl bg-gradient-to-br ${job.gradient} flex items-center justify-center mb-4`} style={{ background: `linear-gradient(135deg, var(--tw-gradient-from) / 0.2, var(--tw-gradient-to) / 0.2)` }}>
                    <job.icon className="w-6 h-6 text-white/80" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {job.title}
                  </h3>

                  <p className="text-gray-500 text-sm mb-4">{job.department}</p>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4 text-gray-600" />
                      {job.type} • {job.experience}
                    </div>
                  </div>

                  <div className="flex items-center text-cyan-400 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                    Apply Now
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BENEFITS ════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Why Join Us?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">We offer competitive benefits and a culture that values your growth.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className={`benefit-card group relative p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-violet-500/20 rounded-bl-lg" />

                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-cyan-500/20 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ VALUES ════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Our Values</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <div key={i} className={`value-card group relative flex items-start gap-4 p-6 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-violet-500/20 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{value.title}</h3>
                  <p className="text-gray-500 text-sm">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-violet-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Don&apos;t See Your Role?
              </h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                We&apos;re always looking for talented people. Send us your resume and we&apos;ll reach out if there&apos;s a fit.
              </p>
              <Link
                href="/resources/apply-job?position=General Application&id=general"
                className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-lg shadow-lg shadow-violet-500/20 transition-all hover:scale-105"
              >
                Submit General Application
                <ArrowRight className="w-5 h-5 ml-2" />
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
