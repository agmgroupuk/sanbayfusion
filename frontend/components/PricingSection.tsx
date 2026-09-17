'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, MessageSquare, Paintbrush, CreditCard, Sparkles } from 'lucide-react';
import { gsap, ScrollTrigger, CustomEase, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('cardSpring', 'M0,0 C0.12,0.82 0.23,1.1 0.5,1 0.73,0.92 0.85,1 1,1');
    const ctx = gsap.context(() => {
      // ─── TITLE ───
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 60, filter: 'blur(20px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── SUBTITLE ───
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 30, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.15,
            scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── CARDS ───
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.pricing-card');
        cards.forEach((card, i) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: cardsRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });

          tl.fromTo(card,
            { opacity: 0, y: 60, scale: 0.85, filter: 'blur(6px)' },
            { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, delay: i * 0.12, ease: 'cardSpring' }
          );

          // 3D tilt on hover
          const el = card as HTMLElement;
          Observer.create({
            target: el,
            type: 'pointer',
            onMove: (self) => {
              const rect = el.getBoundingClientRect();
              const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
              const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
              gsap.to(el, { rotateY: x * 10, rotateX: -y * 8, z: 15, duration: 0.3, ease: 'power2.out' });
            },
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { rotateY: 0, rotateX: 0, z: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
          });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden" style={{ perspective: '1200px' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">💰 Pricing</span>
            </div>
            <h2
              ref={titleRef}
              className="text-4xl md:text-6xl font-black leading-tight mb-4"
              style={{ opacity: 0 }}
            >
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Choose Your</span>{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Plan</span>
            </h2>
            <p ref={subtitleRef} className="text-gray-400 text-lg max-w-2xl mx-auto" style={{ opacity: 0 }}>
              Flexible options for every need. Pay only for what you use.
            </p>
          </div>

          {/* Cards Grid */}
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch" style={{ transformStyle: 'preserve-3d' }}>

            {/* ─── CARD 1: Universal Chat ─── */}
            <div className="pricing-card" style={{ transformStyle: 'preserve-3d' }}>
              <div className="relative backdrop-blur-xl rounded-2xl p-6 sm:p-8 hover:border-cyan-500/35 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 8px 50px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border border-cyan-400/30 shadow-[0_4px_20px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <MessageSquare className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Universal Chat</h3>
                    <p className="text-gray-500 text-xs">AI-Powered Conversations</p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Chat with 18+ AI agents across text, voice, and vision. Get instant answers, code help, creative writing, and more — powered by GPT-4, Claude, Gemini & other top models.
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {['18+ Specialized AI Agents', 'Multi-model routing (GPT-4, Claude, Gemini)', 'Voice & vision capabilities', 'Conversation history & export', 'Real-time streaming responses'].map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                      <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Price rows */}
                <div className="space-y-1.5 mb-6">
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Daily</span>
                    <span className="text-white text-base font-bold">$1</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Weekly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$10</span>
                      <span className="text-white text-base font-bold">$5</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 shadow-[0_4px_24px_rgba(6,182,212,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <span className="text-cyan-400 text-sm font-semibold">Monthly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$30</span>
                      <span className="text-white text-base font-bold">$15</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Yearly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$300</span>
                      <span className="text-white text-base font-bold">$150</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/overview/spaces"
                  className="block text-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                >
                  View Chat Plans
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
            </div>

            {/* ─── CARD 2: Canvas Studio (Most Popular) ─── */}
            <div className="pricing-card" style={{ transformStyle: 'preserve-3d' }}>
              <div className="relative backdrop-blur-xl rounded-2xl p-6 sm:p-8 hover:border-violet-500/55 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(217,70,239,0.06), rgba(0,0,0,0.28))', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 8px 50px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                {/* Popular badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-violet-500/30">
                  Most Popular
                </div>

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center border border-violet-400/30 shadow-[0_4px_20px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Paintbrush className="w-5 h-5 text-violet-300 drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Canvas Studio</h3>
                    <p className="text-gray-500 text-xs">AI App Builder</p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Build full-stack web apps with AI. Describe what you want, and Canvas Studio generates production-ready code. Deploy instantly with one click — no coding required.
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {['Unlimited AI generations', 'All AI models (GPT-4, Claude, Gemini)', 'Multi-page site builder', 'One-click deploy to Maula.ai', 'Export & download code', 'Image-to-code conversion'].map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                      <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Price rows */}
                <div className="space-y-1.5 mb-6">
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Weekly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$14</span>
                      <span className="text-white text-base font-bold">$7</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-400/20 shadow-[0_4px_24px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <span className="text-violet-400 text-sm font-semibold">Monthly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$38</span>
                      <span className="text-white text-base font-bold">$19</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Yearly</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm line-through">$240</span>
                      <span className="text-white text-base font-bold">$120</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded">50% OFF</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/overview/pricing"
                  className="block text-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-0.5"
                >
                  View Studio Plans
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
            </div>

            {/* ─── CARD 3: Credits / Spaces ─── */}
            <div className="pricing-card" style={{ transformStyle: 'preserve-3d' }}>
              <div className="relative backdrop-blur-xl rounded-2xl p-6 sm:p-8 hover:border-emerald-500/35 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 8px 50px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center border border-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <CreditCard className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Maula Spaces</h3>
                    <p className="text-gray-500 text-xs">Credit-Based Access</p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Add credits and use them across all Maula AI apps. Pay as you go — load a minimum of $5 and use credits across our entire suite of AI-powered tools.
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {['Pay-as-you-go model', 'Minimum $5 credit top-up', 'Use across all Maula apps', 'No expiry on credits', 'Instant access to all tools'].map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* App rows */}
                <div className="space-y-1.5 mb-6">
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Maula Editor</span>
                    <span className="text-emerald-400 text-xs">Code Editor</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Canvas Build</span>
                    <span className="text-teal-400 text-xs">App Builder</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 shadow-[0_4px_24px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <span className="text-emerald-400 text-sm font-semibold">Gen Craft</span>
                    <span className="text-emerald-300 text-xs">AI Generator</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    <span className="text-gray-400 text-sm">Neural Chat</span>
                    <span className="text-blue-400 text-xs">AI Chat</span>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="https://spaces.maula.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                >
                  Explore Spaces
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </a>
              </div>
            </div>

          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
