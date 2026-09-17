'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';
import { Sparkles, Check, Crown, Zap, Clock, Shield, MessageSquare, ArrowRight, Star, Bot, ChevronDown, ChevronUp, Users, Gift, Brain } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomWiggle, CustomEase);

const pricingTiers = [
  {
    name: 'Daily Access',
    description: 'Perfect for short-term projects or trying out agents',
    originalPrice: '$1',
    price: '$1',
    period: 'day',
    perDay: '$1.00/day',
    glow: 'rgba(6,182,212,0.4)',
    gradient: 'from-cyan-500 to-blue-500',
    popular: false,
    discount: null,
    features: ['Access to any single agent', 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'Analytics dashboard', 'No auto-renewal'],
  },
  {
    name: 'Weekly Access',
    description: 'Great value for regular use and projects',
    originalPrice: '$10',
    price: '$5',
    period: 'week',
    perDay: '$0.71/day',
    glow: 'rgba(139,92,246,0.4)',
    gradient: 'from-violet-500 to-fuchsia-500',
    popular: true,
    discount: '50% OFF',
    features: ['Access to any single agent', 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'Analytics dashboard', 'No auto-renewal', 'Save 29% vs daily'],
  },
  {
    name: 'Monthly Access',
    description: 'Best value for ongoing work and long-term projects',
    originalPrice: '$30',
    price: '$15',
    period: 'month',
    perDay: '$0.50/day',
    glow: 'rgba(16,185,129,0.4)',
    gradient: 'from-emerald-500 to-teal-500',
    popular: false,
    discount: '50% OFF',
    features: ['Access to any single agent', 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'Analytics dashboard', 'No auto-renewal', 'Save 37% vs daily'],
  },
  {
    name: 'Yearly Access',
    description: 'Ultimate savings — full year of unlimited access',
    originalPrice: '$300',
    price: '$150',
    period: 'year',
    perDay: '$0.41/day',
    glow: 'rgba(245,158,11,0.4)',
    gradient: 'from-amber-500 to-orange-500',
    popular: false,
    discount: '50% OFF',
    features: ['Access to any single agent', 'Unlimited conversations', 'Real-time responses', 'Voice interaction', 'Agent memory', 'Analytics dashboard', 'No auto-renewal', 'Save 59% vs daily', '365 days of access'],
  },
];

const comparisonRows = [
  { feature: 'Chat Interface', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Voice Interaction', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Real-time Responses', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Agent Memory', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Analytics Dashboard', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Conversations', daily: 'Unlimited', weekly: 'Unlimited', monthly: 'Unlimited', yearly: 'Unlimited' },
  { feature: 'AI Models (9+ Providers)', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'No Auto-Renewal', daily: true, weekly: true, monthly: true, yearly: true },
  { feature: 'Savings vs Daily', daily: '—', weekly: '29%', monthly: '37%', yearly: '59%' },
  { feature: 'Access Duration', daily: '24 hours', weekly: '7 days', monthly: '30 days', yearly: '365 days' },
];

const faqs = [
  { q: 'Can I change plans anytime?', a: 'Yes! Since each purchase is one-time with no auto-renewal, simply choose a different plan when you repurchase. Your current access continues until expiration.' },
  { q: 'Do you offer enterprise plans?', a: 'Yes! Contact our sales team for custom enterprise pricing, volume discounts, and dedicated support.' },
  { q: 'Is there a free trial?', a: "No free trials, but enjoy our 50% OFF Welcome Gift! Agent access starts at just $1/day (regularly $2). Weekly, monthly, and yearly plans are also 50% off. No auto-renewal — you only pay once per purchase." },
  { q: 'Will I be charged automatically?', a: 'No! There is NO auto-renewal. Each purchase is one-time only. You must manually purchase again when your access expires if you want to continue using the agent.' },
];

export default function PerAgentPricingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      CustomWiggle.create('agentWiggle', { wiggles: 5, type: 'uniform' });

      gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
      });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

      if (titleRef.current) gsap.fromTo(titleRef.current, { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', delay: 0.2 });
      if (subtitleRef.current) gsap.fromTo(subtitleRef.current, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.5 });

      if (typewriterRef.current) {
        const phrases = ['All agents — same flat pricing', '🎉 50% OFF Welcome Gift — Limited Time!', '$1/day · $10→$5/week · $30→$15/month', 'Choose your billing cycle', 'One-time payment, instant access'];
        const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tl.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tl.to({}, { duration: 2 });
          tl.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.to('.hero-icon-container', { boxShadow: '0 0 80px rgba(139, 92, 246, 0.5), 0 0 160px rgba(139, 92, 246, 0.2)', scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      ScrollTrigger.batch('.pricing-card', { onEnter: (els) => gsap.fromTo(els, { y: 60, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'power3.out' }), start: 'top 90%', once: true });

      gsap.utils.toArray<HTMLElement>('.faq-card').forEach((el, i) => {
        gsap.set(el, { opacity: 0, y: 30 });
        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.06, ease: 'power3.out' }),
        });
      });

      ScrollTrigger.create({
        trigger: '.cta-block',
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.fromTo('.cta-block', { y: 40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' });
        },
      });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleCardHover = (cardId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    if (isEntering) {
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
    } else {
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
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
    if (shine) shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
  };

  const handleCardLeave = (cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══ BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
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
            <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(192,38,211,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
              <Bot className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(167,139,250,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-fuchsia-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight" style={{ opacity: 0 }}>
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Simple Per-Agent</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pricing</span>
          </h1>

          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
            All agents use the same transparent pricing. No hidden fees.
            <span className="text-violet-400"> Choose your billing cycle.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {[
              { icon: Shield, label: 'Transparent Pricing' },
              { icon: Zap, label: 'Instant Access' },
              { icon: Gift, label: 'No Auto-Renewal' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400">
                <badge.icon className="w-4 h-4 text-violet-400" />
                {badge.label}
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-14">
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
        </div>
      </section>

      {/* ═══ PRICING CARDS ═══ */}
      <section className="relative py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Choose Your Billing Cycle</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Every plan includes all features — you only choose your duration</p>

            <div className="grid md:grid-cols-3 gap-6">
              {pricingTiers.map((tier, i) => (
                <div key={i} data-card-id={`tier-${i}`}
                  className={`pricing-card group relative block ${tier.popular ? 'md:scale-105 md:z-10' : ''}`}
                  style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                  onMouseEnter={() => handleCardHover(`tier-${i}`, true)}
                  onMouseLeave={() => { handleCardHover(`tier-${i}`, false); handleCardLeave(`tier-${i}`); }}
                  onMouseMove={(e) => handleCardMove(e, `tier-${i}`)}>
                  <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity" style={{ background: `linear-gradient(135deg, ${tier.glow}, transparent 60%)`, filter: 'blur(1px)' }} />
                  <div className={`relative h-full rounded-2xl bg-white/[0.02] border ${tier.popular ? 'border-violet-500/40 shadow-lg shadow-violet-600/10' : 'border-white/[0.06]'} backdrop-blur-sm overflow-hidden transition-colors duration-500 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]`}>
                    <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                    {tier.popular && (
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-b-xl text-[10px] font-bold text-white uppercase tracking-wider z-20">
                        Most Popular
                      </div>
                    )}

                    <div className={`relative p-6 bg-gradient-to-br ${tier.gradient} overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                      <div className="relative z-10 flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 border border-white/30">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed relative z-10">{tier.description}</p>
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-gray-600 text-xs mb-1">Starting at</p>
                        <div className="flex items-baseline gap-2">
                          {tier.discount && (
                            <span className="text-xl font-bold text-gray-600 line-through">{tier.originalPrice}</span>
                          )}
                          <span className="text-4xl font-black text-white">{tier.price}</span>
                          <span className="text-gray-500">/{tier.period}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-violet-400 text-xs">{tier.perDay}</p>
                          {tier.discount && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              🎉 {tier.discount} Welcome Gift
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Pricing Structure</p>
                        <p className="text-sm font-semibold text-gray-300">One Agent at a Time</p>
                      </div>

                      <ul className="space-y-2.5 mb-6">
                        {tier.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2.5 text-sm text-gray-400">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-400/30" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15))' }}>
                              <Check className="w-2.5 h-2.5 text-emerald-300" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Link href="https://sanbayfusion.com/agents"
                        className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${tier.popular
                          ? 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30'
                          : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15]'}`}>
                        Get Started
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE COMPARISON TABLE ═══ */}
      <section className="relative py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Feature Comparison</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Every plan includes all features — you only choose your billing cycle</p>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="px-6 py-4 text-left font-semibold text-gray-300">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold text-cyan-400">
                        <Clock className="w-5 h-5 mx-auto mb-1" />Daily ($1)
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-violet-400 bg-violet-500/[0.05]">
                        <Clock className="w-5 h-5 mx-auto mb-1" />Weekly (<span className="line-through text-gray-500">$10</span> $5)
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-emerald-400">
                        <Clock className="w-5 h-5 mx-auto mb-1" />Monthly (<span className="line-through text-gray-500">$30</span> $15)
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-amber-400">
                        <Clock className="w-5 h-5 mx-auto mb-1" />Yearly (<span className="line-through text-gray-500">$300</span> $150)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03] transition-colors`}>
                        <td className="px-6 py-3.5 font-medium text-gray-300">{row.feature}</td>
                        <td className="px-6 py-3.5 text-center text-gray-500">
                          {typeof row.daily === 'boolean' ? (
                            <Check className="w-5 h-5 mx-auto text-emerald-400" />
                          ) : (
                            <span className="font-medium">{row.daily}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center text-gray-500 bg-violet-500/[0.03]">
                          {typeof row.weekly === 'boolean' ? (
                            <Check className="w-5 h-5 mx-auto text-emerald-400" />
                          ) : (
                            <span className="font-medium text-violet-400">{row.weekly}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center text-gray-500">
                          {typeof row.monthly === 'boolean' ? (
                            <Check className="w-5 h-5 mx-auto text-emerald-400" />
                          ) : (
                            <span className="font-medium">{row.monthly}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center text-gray-500">
                          {typeof (row as any).yearly === 'boolean' ? (
                            <Check className="w-5 h-5 mx-auto text-emerald-400" />
                          ) : (
                            <span className="font-medium text-amber-400">{(row as any).yearly}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="relative py-20 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Everything you need to know about our pricing</p>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-card rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-colors duration-300">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="relative z-10 w-full flex items-center justify-between p-5 text-left cursor-pointer select-none hover:bg-white/[0.03] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-400/20"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(192,38,211,0.1))' }}>
                        <span className="text-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))' }}>
                          {i === 0 ? '🔄' : i === 1 ? '🏢' : i === 2 ? '🆓' : '💳'}
                        </span>
                      </div>
                      <span className="font-bold text-gray-200 text-sm">{faq.q}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-violet-400' : 'text-gray-600'}`} />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: openFaq === i ? '1fr' : '0fr',
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pt-0 ml-14">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mb-4" />
                        <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-24 z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="cta-block relative max-w-4xl mx-auto rounded-2xl overflow-hidden">
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' }} />

            <div className="relative p-12 text-center border border-violet-500/20 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(15,15,20,0.95) 40%, rgba(6,182,212,0.08) 100%)' }}>
              <div className="absolute inset-0 rounded-2xl opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(6,182,212,0.2) 100%)', boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}>
                  <Sparkles className="w-8 h-8 text-violet-300" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.6))' }} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Ready to get started?</h3>
                <p className="text-gray-400 mb-10 max-w-xl mx-auto text-sm leading-relaxed">
                  Choose your plan and start building amazing AI experiences today. Browse our collection of specialized AI agents.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="https://sanbayfusion.com/agents" className="group relative px-8 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-600/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(192,38,211,0.75) 100%)' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-white/10 to-violet-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Bot className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Browse Agents</span>
                  </Link>
                  <Link href="/support/contact-us" className="px-8 py-3.5 rounded-xl text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white hover:border-violet-500/30 transition-all duration-300">
                    Contact Sales <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
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