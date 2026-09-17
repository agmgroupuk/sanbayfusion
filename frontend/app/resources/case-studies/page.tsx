'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, CustomWiggle, TextPlugin } from '@/lib/gsap';
import { Sparkles, TrendingUp, BarChart3, Building2, ArrowRight, CheckCircle, Users, Zap, Terminal, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, TextPlugin);

const caseStudies = [
  {
    title: "Healthcare Provider Reduces Response Time by 85%",
    industry: "Healthcare",
    company: "MedFirst Hospital Network",
    icon: "🏥",
    color: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6,182,212,0.4)',
    challenge: "Overwhelming patient inquiries and appointment scheduling",
    solution: "AI-powered patient support and scheduling assistant",
    results: ["85% faster response time", "60% reduction in call volume", "95% patient satisfaction", "$2M annual savings"],
    category: "Customer Success"
  },
  {
    title: "E-commerce Giant Scales Customer Support 10x",
    industry: "Retail",
    company: "ShopFlow Commerce",
    icon: "🛒",
    color: 'from-violet-500 to-fuchsia-500',
    glow: 'rgba(139,92,246,0.4)',
    challenge: "Seasonal customer service demands and 24/7 support needs",
    solution: "Multi-language AI agents for customer service and order management",
    results: ["10x support capacity", "24/7 availability", "40% cost reduction", "92% issue resolution"],
    category: "ROI Analysis"
  },
  {
    title: "Financial Services Improves Compliance by 95%",
    industry: "Finance",
    company: "SecureBank Holdings",
    icon: "🏦",
    color: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.4)',
    challenge: "Complex regulatory compliance and risk assessment",
    solution: "AI compliance monitoring and automated risk analysis",
    results: ["95% compliance improvement", "75% faster risk assessment", "50% audit preparation time", "Zero compliance violations"],
    category: "Implementation Stories"
  },
  {
    title: "Manufacturing Company Optimizes Production by 30%",
    industry: "Manufacturing",
    company: "TechFlow Industries",
    icon: "🏭",
    color: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.4)',
    challenge: "Production inefficiencies and quality control issues",
    solution: "AI-driven production optimization and quality monitoring",
    results: ["30% production optimization", "25% quality improvement", "20% waste reduction", "$5M cost savings"],
    category: "Before & After"
  }
];

const categories = ["All", "Customer Success", "ROI Analysis", "Implementation Stories", "Before & After"];

export default function CaseStudiesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

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
      CustomWiggle.create('caseWiggle', { wiggles: 5, type: 'uniform' });

      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9');

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(139,92,246,0.5), 0 0 160px rgba(139,92,246,0.2), inset 0 0 30px rgba(139,92,246,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      if (typewriterRef.current) {
        const phrases = [
          '85% faster response times',
          '10x support capacity',
          '95% compliance improvement',
          '30% production optimization',
          '$50M+ client savings',
          '99% satisfaction rate',
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

      ScrollTrigger.batch('.case-card', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 60, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.5)' }
          );
        }, start: 'top 90%', once: true
      });

      ScrollTrigger.batch('.stats-item', {
        onEnter: (elements) => {
          gsap.fromTo(elements,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }
          );
        }, start: 'top 90%', once: true
      });

      document.querySelectorAll('.case-card').forEach(card => {
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
          <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-40 right-[12%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-48 left-[12%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <BarChart3 className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Case</span>
              <br />
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Studies</span>
            </h1>
          </div>

          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
            Discover how organizations across industries are transforming their operations with
            <span className="text-violet-400"> our AI agents.</span>
          </p>

          <div className="flex justify-center items-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-cyan-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <Terminal className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span className="text-violet-400 font-semibold">Results</span>{' '}
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
          {categories.map((category, index) => (
            <button
              key={index}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${index === 0
                  ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/15'
                  : 'bg-white/[0.03] text-gray-600 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
          {caseStudies.map((study, index) => (
            <div key={index} className="case-card group relative">
              <div className={`card-glow absolute inset-0 bg-gradient-to-r ${study.color} rounded-2xl opacity-0 blur-xl transition-opacity`} />

              <div className={`relative h-full p-8 ${card} hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden`}>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/[0.06] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/[0.06] rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-6">
                  <div className="card-icon w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-white/[0.08]"
                    style={{
                      background: `linear-gradient(135deg, ${study.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))`,
                      boxShadow: `0 0 20px ${study.glow.replace('0.4', '0.12')}, 0 0 40px ${study.glow.replace('0.4', '0.06')}`,
                    }}>
                    {study.icon}
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                    {study.category}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {study.title}
                </h3>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                  <span className="font-medium text-gray-400">{study.industry}</span>
                  <span>•</span>
                  <span>{study.company}</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Challenge</div>
                    <p className="text-gray-400 text-sm">{study.challenge}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Solution</div>
                    <p className="text-gray-400 text-sm">{study.solution}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${card}`}>
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">Key Results</div>
                  <div className="grid grid-cols-2 gap-3">
                    {study.results.map((result, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{result}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center text-cyan-400 text-sm font-medium group-hover:gap-2 gap-1 transition-all cursor-pointer">
                  Read Full Story
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className={`p-8 ${card} hover:bg-white/[0.04] transition-all`}>
            <h3 className="text-2xl font-bold text-white text-center mb-8">Trusted by Industry Leaders</h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { value: '500+', label: 'Clients Served', icon: Users },
                { value: '85%', label: 'Avg. Efficiency Gain', icon: TrendingUp },
                { value: '$50M+', label: 'Client Savings', icon: BarChart3 },
                { value: '99%', label: 'Satisfaction Rate', icon: Sparkles },
              ].map((stat, i) => (
                <div key={i} className="stats-item text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className={`cta-section relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden text-center`}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-violet-500/20 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-lg" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                Join hundreds of organizations transforming their operations with AI.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/support"
                  className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Contact Us
                </Link>
                <Link
                  href="/agents"
                  className="px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Get Started Today
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
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
