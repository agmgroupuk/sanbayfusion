'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { gsap, ScrollTrigger, CustomEase, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

const milestones = [
  { quarter: 'Q1 2025', title: 'Multi-Modal Agents v2', desc: 'Next-gen agents with vision, voice, and reasoning capabilities', status: 'current', icon: '🤖' },
  { quarter: 'Q2 2025', title: 'Canvas Builder 3.0', desc: 'AI-first visual builder with natural language to UI generation', status: 'upcoming', icon: '🎨' },
  { quarter: 'Q3 2025', title: 'Enterprise SSO & RBAC', desc: 'Advanced security features for enterprise deployments', status: 'planned', icon: '🔐' },
  { quarter: 'Q4 2025', title: 'Agent Marketplace', desc: 'Share, discover, and monetize AI agents with the community', status: 'planned', icon: '🏪' },
  { quarter: 'Q1 2026', title: 'Autonomous Workflows', desc: 'Self-healing AI pipelines that adapt and optimize continuously', status: 'vision', icon: '🚀' },
];

export default function RoadmapSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('timelineReveal', 'M0,0 C0.11,0.494 0.192,0.726 0.318,0.852 0.45,0.984 0.65,1 1,1');
    const ctx = gsap.context(() => {

      // ─── TITLE: whole-element blur entrance (no SplitText) ───
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
          { opacity: 0, y: 40, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.2,
            scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── PROGRESS LINE: grows with scroll, connecting dots ───
      if (progressLineRef.current && timelineRef.current) {
        gsap.fromTo(progressLineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: timelineRef.current,
              start: 'top 70%',
              end: 'bottom 30%',
              scrub: 0.8,
            },
          }
        );
      }

      // ─── MILESTONE CARDS + DOTS: entrance on scroll ───
      if (timelineRef.current) {
        const items = timelineRef.current.querySelectorAll('.milestone-item');
        items.forEach((item, i) => {
          const isLeft = i % 2 === 0;

          // Card entrance
          gsap.fromTo(item.querySelector('.milestone-card'),
            {
              opacity: 0,
              x: isLeft ? -80 : 80,
              y: 20,
              scale: 0.85,
              filter: 'blur(6px)',
            },
            {
              opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)',
              duration: 0.9, ease: 'power3.out',
              scrollTrigger: { trigger: item, start: 'top 85%', toggleActions: 'play none none reverse' },
            }
          );

          // Dot entrance — syncs with the progress line reaching it
          const dot = item.querySelector('.timeline-dot');
          if (dot) {
            gsap.fromTo(dot,
              { scale: 0, opacity: 0 },
              {
                scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)',
                scrollTrigger: { trigger: item, start: 'top 80%', toggleActions: 'play none none reverse' },
              }
            );
          }

          // Dot glow pulse when connected
          const dotInner = item.querySelector('.dot-glow');
          if (dotInner) {
            gsap.fromTo(dotInner,
              { scale: 0, opacity: 0 },
              {
                scale: 1.8, opacity: 0.6, duration: 0.6, ease: 'power2.out',
                scrollTrigger: { trigger: item, start: 'top 78%', toggleActions: 'play none none reverse' },
              }
            );
          }

          // Hover tilt
          const el = item as HTMLElement;
          el.addEventListener('mouseenter', () => {
            gsap.to(el.querySelector('.milestone-card'), { scale: 1.03, y: -4, duration: 0.3, ease: 'power2.out' });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el.querySelector('.milestone-card'), { scale: 1, y: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' });
          });
        });
      }

      // ─── CTA ───
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none reverse' }
          }
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 rounded-full px-4 py-2 mb-6 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
              <span className="text-violet-300 text-sm font-medium">🗺️ Roadmap</span>
            </div>
            <h2
              ref={titleRef}
              className="text-4xl md:text-6xl font-black leading-tight mb-4"
              style={{ opacity: 0 }}
            >
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Where We&apos;re</span>{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Headed</span>
            </h2>
            <p ref={subtitleRef} className="text-gray-400 text-lg max-w-2xl mx-auto font-light" style={{ opacity: 0 }}>
              Our vision for the future of AI-powered development.
            </p>
          </div>

          {/* Timeline */}
          <div ref={timelineRef} className="relative max-w-3xl mx-auto">

            {/* Background track line (always visible, very faint) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/[0.04] z-0" />

            {/* Animated progress line (grows with scroll) */}
            <div
              ref={progressLineRef}
              className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 z-[1] origin-top"
              style={{
                background: 'linear-gradient(to bottom, #06b6d4, #3b82f6, #8b5cf6, #d946ef)',
                boxShadow: '0 0 8px rgba(139,92,246,0.4), 0 0 20px rgba(139,92,246,0.2)',
                transform: 'scaleY(0)',
              }}
            />

            <div className="space-y-12 sm:space-y-16 relative z-10">
              {milestones.map((ms, i) => {
                const isLeft = i % 2 === 0;
                const dotColors: Record<string, string> = {
                  current: 'bg-cyan-400 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]',
                  upcoming: 'bg-blue-400 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]',
                  planned: 'bg-violet-400 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)]',
                  vision: 'bg-fuchsia-400 border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.6)]',
                };
                const glowColors: Record<string, string> = {
                  current: 'bg-cyan-400/30',
                  upcoming: 'bg-blue-400/30',
                  planned: 'bg-violet-400/30',
                  vision: 'bg-fuchsia-400/30',
                };
                const badgeColors: Record<string, string> = {
                  current: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
                  upcoming: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
                  planned: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
                  vision: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25',
                };
                const cardBg: Record<string, string> = {
                  current: 'rgba(6,182,212,0.08)',
                  upcoming: 'rgba(59,130,246,0.08)',
                  planned: 'rgba(139,92,246,0.08)',
                  vision: 'rgba(217,70,239,0.08)',
                };
                const cardBorder: Record<string, string> = {
                  current: 'rgba(6,182,212,0.2)',
                  upcoming: 'rgba(59,130,246,0.2)',
                  planned: 'rgba(139,92,246,0.2)',
                  vision: 'rgba(217,70,239,0.2)',
                };
                const cardGlow: Record<string, string> = {
                  current: 'rgba(6,182,212,0.07)',
                  upcoming: 'rgba(59,130,246,0.07)',
                  planned: 'rgba(139,92,246,0.07)',
                  vision: 'rgba(217,70,239,0.07)',
                };
                const hoverBorder: Record<string, string> = {
                  current: 'hover:border-cyan-500/35',
                  upcoming: 'hover:border-blue-500/35',
                  planned: 'hover:border-violet-500/35',
                  vision: 'hover:border-fuchsia-500/35',
                };

                return (
                  <div
                    key={i}
                    className={`milestone-item relative flex items-center gap-4 sm:gap-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Card */}
                    <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                      <div className={`milestone-card backdrop-blur-sm rounded-2xl p-5 ${hoverBorder[ms.status]} transition-all duration-500 inline-block max-w-sm group`} style={{ background: `linear-gradient(135deg, ${cardBg[ms.status]}, rgba(0,0,0,0.28))`, border: `1px solid ${cardBorder[ms.status]}`, boxShadow: `0 8px 40px rgba(0,0,0,0.45), 0 0 18px ${cardGlow[ms.status]}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColors[ms.status]}`}>
                          {ms.quarter}
                        </span>
                        <h3 className="text-white font-bold text-lg mt-3 mb-1 group-hover:text-gray-100 transition-colors">{ms.icon} {ms.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{ms.desc}</p>
                      </div>
                    </div>

                    {/* Center dot with glow */}
                    <div className="timeline-dot relative z-10 shrink-0 flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
                      {/* Glow ring */}
                      <div className={`dot-glow absolute w-5 h-5 rounded-full ${glowColors[ms.status]} opacity-0`} />
                      {/* Dot */}
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${dotColors[ms.status]} relative z-10`} />
                    </div>

                    {/* Spacer for alternating */}
                    <div className="flex-1" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Button */}
          <div ref={ctaRef} className="text-center mt-12" style={{ opacity: 0 }}>
            <Link
              href="/community/roadmap"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400"
            >
              <Sparkles className="w-4 h-4" />
              View Full Roadmap
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
