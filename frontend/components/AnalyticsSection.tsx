'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, DrawSVGPlugin, CustomEase, Observer, ScrambleTextPlugin, Physics2DPlugin, Flip, Draggable } from '@/lib/gsap';

const studioFeatures = [
  { icon: '🚀', title: 'Instant Deploy', desc: 'One-click deploy with Free SSL & Global CDN', stat: '< 3s' },
  { icon: '🤖', title: 'AI Agent Builder', desc: 'Natural language to infrastructure actions', stat: '18+ Models' },
  { icon: '🎨', title: 'Visual Builder', desc: 'Describe what you want, watch it come alive', stat: 'Real-time' },
];

const capabilities = [
  'Build complete web apps from prompts',
  'AI-powered code generation & debugging',
  'One-click deploy to sanbayfusion.com subdomain',
  'Free SSL, Global CDN & instant hosting',
  'Real-time preview & live collaboration',
];

export default function AnalyticsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin, Physics2DPlugin, Observer, Flip, Draggable);
    CustomEase.create('studioReveal', 'M0,0 C0.14,0 0.27,0.428 0.42,0.867 0.502,1.112 0.578,1.087 0.642,1.015 0.72,0.928 0.822,1.01 0.878,1.003 0.924,0.998 0.955,1 1,1');

    const ctx = gsap.context(() => {
      // --- TITLE: whole-element entrance (preserves gradient) ---
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 50, scale: 0.92, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
            duration: 1.2, ease: 'power3.out',
            scrollTrigger: {
              trigger: titleRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // --- DESCRIPTION fade in ---
      if (descRef.current) {
        gsap.fromTo(
          descRef.current,
          { opacity: 0, y: 20, filter: 'blur(6px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1.0, ease: 'power2.out',
            scrollTrigger: {
              trigger: descRef.current,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // --- SHOWCASE CARDS: staggered entrance ---
      if (showcaseRef.current) {
        const panels = showcaseRef.current.querySelectorAll('.studio-panel');
        panels.forEach((panel, i) => {
          gsap.fromTo(
            panel,
            { opacity: 0, y: 60, scale: 0.85, filter: 'blur(6px)' },
            {
              opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
              duration: 1, delay: i * 0.15, ease: 'power3.out',
              scrollTrigger: {
                trigger: showcaseRef.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          );

          panel.addEventListener('mouseenter', () => gsap.to(panel, { y: -8, scale: 1.02, duration: 0.3, ease: 'power2.out' }));
          panel.addEventListener('mouseleave', () => gsap.to(panel, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)' }));
        });
      }

      // --- FEATURE CARDS: Physics-inspired burst ---
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.studio-card');
        const offsets = [
          { x: -150, y: 100, r: -20 },
          { x: 0, y: 120, r: 0 },
          { x: 150, y: 100, r: 20 },
        ];
        cards.forEach((card, i) => {
          const off = offsets[i];
          gsap.fromTo(
            card,
            { opacity: 0, x: off.x, y: off.y, rotation: off.r, scale: 0.3, filter: 'blur(6px)' },
            {
              opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)',
              duration: 1.2, delay: i * 0.1, ease: 'elastic.out(1, 0.6)',
              scrollTrigger: {
                trigger: cardsRef.current,
                start: 'top 85%',
                end: 'top 50%',
                scrub: 0.6,
                toggleActions: 'play reverse play reverse',
              },
            }
          );
          card.addEventListener('mouseenter', () => gsap.to(card, { y: -10, scale: 1.05, boxShadow: '0 20px 50px rgba(6,182,212,0.2)', duration: 0.3, ease: 'power2.out' }));
          card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, scale: 1, boxShadow: 'none', duration: 0.5, ease: 'elastic.out(1,0.4)' }));
        });
      }

      // --- FEATURES LIST: wipe entrance ---
      if (featRef.current) {
        const items = featRef.current.querySelectorAll('li');
        items.forEach((item, i) => {
          gsap.fromTo(
            item,
            { opacity: 0, x: 50, clipPath: 'inset(0 100% 0 0)' },
            {
              opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)',
              duration: 0.7, delay: i * 0.08, ease: 'back.out(1.3)',
              scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });
      }

      // --- CTA: entrance ---
      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 30, scale: 0.9 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.8, ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaRef.current,
              start: 'top 92%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-cyan-600/[0.08] to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-blue-600/[0.08] to-transparent rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.8)' }} />
            <span className="text-sm font-medium tracking-wide" style={{ color: 'rgba(6,182,212,0.9)' }}>Canvas Studio</span>
          </div>
          <h2
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            style={{
              opacity: 0,
              background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(186,230,253,0.9), rgba(6,182,212,0.6))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(6,182,212,0.2))',
            }}
          >
            {'Build & Deploy'}
            <br />
            {'With AI Power'}
          </h2>
          <p ref={descRef} className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(186,230,253,0.6)', opacity: 0 }}>
            Describe what you want to build and watch it come alive. GenCraft Pro generates complete web apps, deploys instantly with Free SSL &amp; Global CDN.
          </p>
        </div>

        {/* Showcase Panels - 3 glass cards showing Canvas Studio UI */}
        <div ref={showcaseRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Panel 1: GenCraft Pro Interface */}
          <div className="studio-panel rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.09), rgba(255,255,255,0.03), rgba(0,0,0,0.25))', border: '1px solid rgba(239,68,68,0.2)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 24px rgba(239,68,68,0.07), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                  <span className="text-white text-lg">{'✦'}</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">GenCraft Pro</div>
                  <div className="text-gray-500 text-xs">Neural Interface</div>
                </div>
              </div>
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-white/90 font-bold text-xl mb-1">One Last AI</div>
                <div className="text-gray-500 text-xs font-mono tracking-wider uppercase">AI Digital Friend Zone</div>
              </div>
              <div className="flex gap-2">
                {['AI Chat', 'Agents', 'Home'].map((btn) => (
                  <span key={btn} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                    {btn}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 2: AI Agent Builder */}
          <div className="studio-panel rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.09), rgba(255,255,255,0.03), rgba(0,0,0,0.25))', border: '1px solid rgba(6,182,212,0.2)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 24px rgba(6,182,212,0.07), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-lg">{'🤖'}</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">AI Agent</div>
                  <div className="text-gray-500 text-xs">{'Natural language → actions'}</div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { emoji: '🚀', label: 'Deploy' },
                  { emoji: '🟡', label: 'Status' },
                  { emoji: '🔧', label: 'Debug' },
                  { emoji: '📊', label: 'Performance' },
                  { emoji: '💾', label: 'Backup' },
                ].map((tag) => (
                  <span key={tag.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium mr-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                    {tag.emoji} {tag.label}
                  </span>
                ))}
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-gray-500 text-xs italic">{'"Tell the agent what to do"'}</div>
              </div>
            </div>
          </div>

          {/* Panel 3: Deploy Feature */}
          <div className="studio-panel rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.09), rgba(255,255,255,0.03), rgba(0,0,0,0.25))', border: '1px solid rgba(249,115,22,0.2)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 24px rgba(249,115,22,0.07), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
                  <span className="text-white text-lg">{'🚀'}</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Deploy to sanbayfusion.com</div>
                  <div className="text-gray-500 text-xs">Publish Your App</div>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                {[
                  { icon: '🛡️', label: 'Free SSL' },
                  { icon: '📡', label: 'Global CDN' },
                  { icon: '⚡', label: 'Instant' },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                    {item.icon} {item.label}
                  </span>
                ))}
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-sm font-semibold" style={{ color: 'rgba(252,165,165,0.9)' }}>{'🚀 Deploy Now — Get Shareable Link'}</div>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-gray-600">{'No tokens or API keys needed · Deploys in seconds · Free forever'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Feature cards + capabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Feature stat cards */}
          <div ref={cardsRef} className="grid grid-cols-3 gap-4">
            {studioFeatures.map((f, i) => (
              <div key={i} className="studio-card rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.05), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.18)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                <div className="text-3xl mb-3" style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }}>{f.icon}</div>
                <div className="text-2xl font-bold mb-1" style={{ background: 'linear-gradient(to right, #22d3ee, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{f.stat}</div>
                <div className="text-white/80 text-sm font-medium mb-1">{f.title}</div>
                <div className="text-gray-500 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Right: Capabilities list + CTA */}
          <div>
            <ul ref={featRef} className="space-y-4 mb-10">
              {capabilities.map((cap, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(6,182,212,0.3)' }}>
                    <svg className="w-3.5 h-3.5 text-cyan-300 group-hover:text-cyan-100 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-gray-300 text-base group-hover:text-white transition-colors">{cap}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div ref={ctaRef}>
              <a
                href="https://canvas.sanbayfusion.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 group"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                  boxShadow: '0 0 30px rgba(6,182,212,0.25), 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                  textShadow: '0 0 10px rgba(255,255,255,0.3)',
                }}
              >
                Try Canvas Studio
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
