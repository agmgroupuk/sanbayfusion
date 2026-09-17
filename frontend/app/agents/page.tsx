'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, Observer } from '@/lib/gsap';
import Link from 'next/link';
import Image from 'next/image';
import { allAgents, getAgentCategories, getAgentsByCategory } from '@/lib/agentRegistry';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import AgentDetailsModal from '@/components/AgentDetailsModal';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import type { AgentConfig, AgentCategory } from '@/types/agents';
import { Bot, ArrowRight, Sparkles, Zap, Users, Crown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, Observer);

/* ── Per-agent glow color from their Tailwind gradient class ── */
const AGENT_GLOW: Record<string, string> = {
  'from-pink-400': 'rgba(244,114,182,0.4)',
  'from-rose-400': 'rgba(251,113,133,0.4)',
  'from-purple-400': 'rgba(192,132,252,0.4)',
  'from-violet-400': 'rgba(167,139,250,0.4)',
  'from-indigo-400': 'rgba(129,140,248,0.4)',
  'from-blue-400': 'rgba(96,165,250,0.4)',
  'from-cyan-400': 'rgba(34,211,238,0.4)',
  'from-teal-400': 'rgba(45,212,191,0.4)',
  'from-emerald-400': 'rgba(52,211,153,0.4)',
  'from-green-400': 'rgba(74,222,128,0.4)',
  'from-yellow-400': 'rgba(250,204,21,0.4)',
  'from-amber-400': 'rgba(251,191,36,0.4)',
  'from-orange-400': 'rgba(251,146,60,0.4)',
  'from-red-400': 'rgba(248,113,113,0.4)',
  'from-sky-400': 'rgba(56,189,248,0.4)',
  'from-fuchsia-400': 'rgba(232,121,249,0.4)',
  'from-lime-400': 'rgba(163,230,53,0.4)',
};
function getAgentGlow(agent: AgentConfig): string {
  const prefix = agent.color.split(' ')[0];
  return AGENT_GLOW[prefix] || 'rgba(139,92,246,0.4)';
}

/* ═══════════════════════════════════════════════════════════════════
   AGENT CARD — tools-page-style hover: 3D tilt, shine, border glow
   ═══════════════════════════════════════════════════════════════════ */
function AgentCardGSAP({ agent }: { agent: AgentConfig }) {
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { hasActiveSubscription, getDaysRemaining, loading } = useSubscriptions();

  // Prevent hydration mismatch by only showing subscription status after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isSubscribed = mounted ? hasActiveSubscription(agent.id) : false;
  const daysRemaining = mounted ? getDaysRemaining(agent.id) : 0;

  const linkHref = mounted && isSubscribed
    ? `https://${agent.id}-chat.maula.ai/`
    : `https://maula.ai/subscribe?agent=${encodeURIComponent(agent.name)}&slug=${agent.id}`;

  const actionText = !mounted || loading
    ? 'Checking...'
    : isSubscribed
      ? `✓ Subscribed (${daysRemaining}d left)`
      : 'Subscribe to Access';

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-details-button]')) {
      e.preventDefault();
    }
  };

  return (
    <>
      <Link
        href={linkHref}
        className="agent-card group relative block"
        onClick={handleCardClick}
        data-card-id={agent.id}
        style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
      >
        <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${getAgentGlow(agent)}, transparent 60%)`, filter: 'blur(1px)' }} />
        <div className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden h-full transition-colors duration-500 group-hover:border-white/[0.1] group-hover:bg-white/[0.04]">
          <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />
          <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-40 transition-opacity duration-500" style={{ background: `linear-gradient(to right, ${getAgentGlow(agent)}, transparent)` }} />

          <div className="relative z-10">
            {/* Avatar */}
            <div className="card-icon-wrap mb-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center overflow-hidden border border-white/[0.15] shadow-lg`} style={{ boxShadow: `0 0 20px ${getAgentGlow(agent).replace('0.4', '0.12')}, 0 0 40px ${getAgentGlow(agent).replace('0.4', '0.06')}` }}>
                <Image src={agent.avatarUrl} alt={agent.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              </div>
            </div>

            {/* Name */}
            <h3 className="text-base font-bold text-gray-200 mb-1.5 group-hover:text-white transition-colors duration-300 truncate" title={agent.name}>
              {agent.name}
            </h3>

            {/* Specialty badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3" style={{ background: getAgentGlow(agent).replace('0.4', '0.1'), border: `1px solid ${getAgentGlow(agent).replace('0.4', '0.2')}`, color: getAgentGlow(agent).replace('0.4', '0.9') }}>
              <Sparkles className="w-3 h-3" /> {agent.specialty}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-2 group-hover:text-gray-500 transition-colors">{agent.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-white/[0.03] text-gray-600 rounded-full border border-white/[0.06]">{tag}</span>
              ))}
            </div>

            {/* Action */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <span className={`text-[12px] font-medium ${isSubscribed ? 'text-emerald-400' : 'text-violet-400'}`}>
                {actionText}
              </span>
              <div className="flex items-center gap-2">
                {agent.details && (
                  <button
                    data-details-button
                    onClick={(e) => { e.preventDefault(); setShowDetails(true); }}
                    className="p-1.5 text-gray-700 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all duration-200"
                    title="View agent details"
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                )}
                <ArrowRight className="card-arrow w-4 h-4 text-gray-700 opacity-30 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {agent.details && (
        <AgentDetailsModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          agentName={agent.name}
          agentIcon={agent.details.icon}
          sections={agent.details.sections}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function AgentsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...getAgentCategories()];
  const agents = activeCategory === 'All' ? allAgents : getAgentsByCategory(activeCategory);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ── GSAP ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      /* Background */
      gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
      });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      /* Hero */
      if (titleRef.current) gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      if (subtitleRef.current) gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });
      gsap.to('.hero-icon-container', { boxShadow: '0 0 80px rgba(139,92,246,0.5), 0 0 160px rgba(139,92,246,0.2)', scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      /* Typewriter */
      if (typewriterRef.current) {
        const phrases = ['18 specialized AI agents', 'Unique personalities & expertise', 'From Einstein to Comedy King', 'Subscribe & start chatting', 'Powered by top AI models'];
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tl.to({}, { duration: 2 });
          tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      /* Observer parallax */
      Observer.create({
        target: window, type: 'scroll',
        onChangeY: (self) => {
          gsap.to('.nebula-orb-1', { y: self.scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.nebula-orb-2', { y: self.scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  /* Cards animate on category change */
  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.agent-card');
    gsap.fromTo(cards, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.4)' });
  }, [activeCategory]);

  /* ── Card Hover Handlers (tools-page style) ── */
  const handleCardHover = useCallback((cardId: string, isEntering: boolean) => {
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
  }, []);

  const handleCardMove = useCallback((e: React.MouseEvent, cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.3, ease: 'power2.out' });
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
  }, []);

  const handleCardLeave = useCallback((cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  }, []);

  /* Attach hover listeners */
  useEffect(() => {
    const cards = document.querySelectorAll('.agent-card');
    const handlers = new Map<Element, { enter: () => void; leave: () => void; move: (e: Event) => void }>();
    cards.forEach((card) => {
      const id = card.getAttribute('data-card-id');
      if (!id) return;
      const h = {
        enter: () => handleCardHover(id, true),
        leave: () => { handleCardHover(id, false); handleCardLeave(id); },
        move: (e: Event) => handleCardMove(e as unknown as React.MouseEvent, id),
      };
      card.addEventListener('mouseenter', h.enter);
      card.addEventListener('mouseleave', h.leave);
      card.addEventListener('mousemove', h.move);
      handlers.set(card, h);
    });
    return () => {
      handlers.forEach((h, card) => {
        card.removeEventListener('mouseenter', h.enter);
        card.removeEventListener('mouseleave', h.leave);
        card.removeEventListener('mousemove', h.move);
      });
    };
  }, [activeCategory, handleCardHover, handleCardMove, handleCardLeave]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb nebula-orb-1 absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb nebula-orb-2 absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
        ))}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]" style={{ left: mousePos.x - 250, top: mousePos.y - 250, background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="relative inline-block mb-10">
            <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
            <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <Bot className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Agents</span>
          </h1>

          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
            Choose from 18 specialized AI personalities, each bringing unique expertise to help you tackle
            <span className="text-violet-400"> any challenge.</span>
          </p>

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <Bot className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://maula.ai/agents/random" className="px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400 flex items-center justify-center gap-2" onClick={(e) => { e.preventDefault(); const random = allAgents[Math.floor(Math.random() * allAgents.length)]; window.location.href = `https://${random.id}-chat.maula.ai/`; }}>
              <Zap className="w-4 h-4" /> Surprise Me
            </a>
            <Link href="/docs/agents" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" /> How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="relative py-10 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '18', label: 'AI Agents', icon: Bot, glow: 'rgba(139,92,246,0.4)' },
              { value: '8', label: 'Categories', icon: Users, glow: 'rgba(6,182,212,0.4)' },
              { value: '5+', label: 'AI Models', icon: Sparkles, glow: 'rgba(236,72,153,0.4)' },
              { value: '24/7', label: 'Available', icon: Zap, glow: 'rgba(16,185,129,0.4)' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.1] transition-colors duration-500">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-violet-400/30" style={{ background: `linear-gradient(135deg, ${stat.glow.replace('0.4', '0.25')}, rgba(139,92,246,0.15))` }}>
                  <stat.icon className="w-5 h-5" style={{ color: '#c4b5fd', filter: `drop-shadow(0 0 6px ${stat.glow})` }} />
                </div>
                <div className="text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-gray-600 text-xs uppercase tracking-widest font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CATEGORY FILTER ═══ */}
      <section className="relative z-10 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border ${activeCategory === cat
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-lg shadow-violet-900/20'
                    : 'bg-white/[0.02] border-white/[0.06] text-gray-600 hover:text-gray-400 hover:border-white/[0.1] hover:bg-white/[0.04]'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ AGENTS GRID ═══ */}
      <section className="relative py-12 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))' }}>
                <Bot className="w-5 h-5" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {activeCategory === 'All' ? 'All Agents' : activeCategory}
                </h2>
                <p className="text-sm text-gray-600">{agents.length} agent{agents.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {agents.map((agent) => (
                <AgentCardGSAP key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ready to Chat?</h3>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">All 18 amazing AI agents are ready to help you with anything.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="https://maula.ai/agents/random" className="px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400 flex items-center justify-center gap-2" onClick={(e) => { e.preventDefault(); const random = allAgents[Math.floor(Math.random() * allAgents.length)]; window.location.href = `https://${random.id}-chat.maula.ai/`; }}>
              🎲 Surprise Me
            </a>
            <a href="https://demo.maula.ai" className="px-7 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 font-semibold text-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] transition-all duration-400 flex items-center justify-center gap-2">
              🎨 Open Studio <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        @keyframes cursorBlink { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
        .typewriter-cursor { animation: cursorBlink 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}