'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomEase, Observer, ScrambleTextPlugin } from '@/lib/gsap';

const features = [
  { icon: '🤖', title: 'AI Agents', desc: 'Build & deploy intelligent agents with custom personalities, memory, and tool access — no code required.' },
  { icon: '🎨', title: 'Canvas Studio', desc: 'Visual drag-and-drop app builder. Create full-stack web apps, dashboards, and tools powered by AI.' },
  { icon: '💬', title: 'Real-time Chat', desc: 'Talk to your AI agents with voice, text, and multimodal inputs. Emotional TTS brings responses to life.' },
  { icon: '🔌', title: 'Open API & Integrations', desc: 'Connect with Slack, Discord, Zapier, and 100+ services. Full REST API for custom workflows.' },
];

const highlights = [
  'Free Tier Available', 'No Credit Card Required', 'Deploy in Minutes', 'Open Source Friendly', 'Community Driven', 'Always Improving',
];

export default function CommunityStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      /* ── Title: whole-element blur entrance (no SplitText) ── */
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 30, filter: 'blur(12px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      /* ── Feature cards: staggered entrance with 3D tilt hover ── */
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.feature-card');
        cards.forEach((card, i) => {
          gsap.fromTo(card,
            { opacity: 0, y: 50, scale: 0.92, filter: 'blur(6px)' },
            {
              opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.8, delay: i * 0.12, ease: 'back.out(1.7)',
              scrollTrigger: { trigger: cardsRef.current, start: 'top 80%', toggleActions: 'play none none reverse' }
            }
          );
          const el = card as HTMLElement;
          el.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(el, {
              rotateY: x * 15, rotateX: -y * 10, scale: 1.04,
              boxShadow: `${x * 15}px ${y * 15}px 30px rgba(6,182,212,0.08)`,
              duration: 0.3, ease: 'power2.out', transformPerspective: 600,
            });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, boxShadow: 'none', duration: 0.5, ease: 'elastic.out(1,0.6)' });
          });
        });
      }

      /* ── Badges: staggered entrance ── */
      if (badgesRef.current) {
        const items = badgesRef.current.querySelectorAll('.badge-item');
        items.forEach((item, i) => {
          gsap.fromTo(item,
            { opacity: 0, y: 20, scale: 0.8 },
            {
              opacity: 1, y: 0, scale: 1, duration: 0.6, delay: i * 0.06, ease: 'back.out(1.5)',
              scrollTrigger: { trigger: badgesRef.current, start: 'top 90%', toggleActions: 'play none none reverse' }
            }
          );
        });
      }

      /* ── CTA button entrance ── */
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 92%', toggleActions: 'play none none reverse' }
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
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">🌐 Join the Community</span>
            </div>
            <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4">
              Build with Maula AI
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to create, deploy, and scale intelligent AI applications — all in one platform.
            </p>
          </div>

          {/* Feature cards */}
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
            {features.map((f, i) => (
              <div key={i} className="feature-card group">
                <div className="backdrop-blur-xl rounded-2xl p-6 sm:p-8 hover:border-cyan-500/35 transition-all duration-500 hover:-translate-y-1 text-center h-full flex flex-col" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(59,130,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Highlight badges */}
          <div ref={badgesRef} className="flex flex-wrap justify-center gap-3 mb-10">
            {highlights.map((badge, i) => (
              <div key={i} className="badge-item backdrop-blur-md rounded-full px-4 py-2 text-gray-300 text-xs font-medium hover:text-cyan-300 transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.15)' }}>
                {badge}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div ref={ctaRef} className="text-center">
            <Link
              href="https://sanbayfusion.com/community/overview"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:scale-105 transition-all duration-300"
            >
              Explore Our Community
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
