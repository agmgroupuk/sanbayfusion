'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, Flip, Observer, CustomEase, DrawSVGPlugin, ScrambleTextPlugin, Physics2DPlugin } from '@/lib/gsap';

const tools = [
  { icon: '🎨', title: 'Visual Editor', desc: 'Drag-and-drop canvas with AI-assisted component generation', stat: '10x', statLabel: 'faster' },
  { icon: '🧩', title: 'Smart Blocks', desc: 'Pre-built intelligent components that adapt to your data', stat: '200+', statLabel: 'blocks' },
  { icon: '⚡', title: 'Live Preview', desc: 'See changes instantly with hot-reload and real-time AI suggestions', stat: '<50ms', statLabel: 'latency' },
  { icon: '🔗', title: 'API Connect', desc: 'Connect any API in seconds with our visual integration builder', stat: '100+', statLabel: 'integrations' },
  { icon: '📱', title: 'Responsive', desc: 'Automatically adapts across all devices and screen sizes', stat: '3', statLabel: 'breakpoints' },
  { icon: '🚀', title: 'One-Click Ship', desc: 'Deploy to edge servers worldwide with zero-config CI/CD', stat: '40+', statLabel: 'regions' },
];

export default function CanvasBuilderSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('cardSpring', 'M0,0 C0.075,0.82 0.165,1 0.3,1 0.428,1 0.435,0.965 0.5,0.965 0.586,0.965 0.62,1 1,1');
    const ctx = gsap.context(() => {
      // ─── TITLE: Words 3D flip from behind with stagger + scramble flash ───
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 50, scale: 0.92, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── CARDS: Physics2D burst from grid center with 3D perspective + Observer tilt ───
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.builder-card');
        const total = cards.length;
        cards.forEach((card, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const offsetX = (col - 1) * 200;
          const offsetY = (row - 0.5) * 180;
          const rot = (col - 1) * 25;

          const tl = gsap.timeline({
            scrollTrigger: { trigger: gridRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });

          // Physics2D-inspired scatter entrance
          tl.fromTo(card,
            {
              opacity: 0,
              x: -offsetX * 1.5,
              y: -offsetY * 1.5,
              rotation: rot,
              scale: 0.2,
              filter: 'blur(8px)',
              transformOrigin: 'center center',
            },
            {
              opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)',
              duration: 1.1, delay: i * 0.08, ease: 'elastic.out(1, 0.55)',
            }
          );

          // Stat counter animation with bounce
          const statEl = card.querySelector('.stat-number');
          if (statEl) {
            const text = statEl.textContent || '';
            const num = parseInt(text.replace(/[^0-9]/g, ''));
            if (!isNaN(num) && num > 0) {
              const prefix = text.match(/^[^0-9]*/)?.[0] || '';
              const suffix = text.match(/[^0-9]*$/)?.[0] || '';
              gsap.fromTo(statEl,
                { innerText: `${prefix}0${suffix}` },
                {
                  innerText: num,
                  duration: 2,
                  delay: 0.5 + i * 0.1,
                  ease: 'cardSpring',
                  snap: { innerText: 1 },
                  scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' },
                  onUpdate: function () {
                    if (statEl) {
                      const v = Math.round(parseFloat((statEl as HTMLElement).innerText || '0'));
                      (statEl as HTMLElement).innerText = `${prefix}${v}${suffix}`;
                    }
                  },
                }
              );
            }
          }

          // Observer: 3D tilt per card on hover
          const el = card as HTMLElement;
          el.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(el, {
              rotateY: x * 20, rotateX: -y * 15, scale: 1.06, z: 30,
              boxShadow: `${x * 25}px ${y * 25}px 50px rgba(6,182,212,0.1)`,
              duration: 0.3, ease: 'power2.out', transformPerspective: 600,
            });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, z: 0, boxShadow: 'none', duration: 0.6, ease: 'elastic.out(1,0.5)' });
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
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">🎨 Visual Builder</span>
            </div>
            <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4" style={{ opacity: 0 }}>
              Build Without Limits
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The most powerful visual canvas builder. Drag, drop, connect — let AI handle the rest.
            </p>
          </div>

          {/* 3D Perspective Card Grid */}
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ transformStyle: 'preserve-3d' }}>
            {tools.map((tool, i) => (
              <div key={i} className="builder-card group" style={{ transformStyle: 'preserve-3d' }}>
                <div className="relative backdrop-blur-xl rounded-2xl p-6 hover:border-cyan-500/35 transition-all duration-500 hover:-translate-y-2 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.16)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 20px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] to-blue-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">{tool.icon}</span>
                      <div className="text-right">
                        <span className="stat-number text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{tool.stat}</span>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{tool.statLabel}</p>
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{tool.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{tool.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <a href="https://canvas.sanbayfusion.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-8 py-4 text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:-translate-y-1 transition-all duration-300 group">
              Open Canvas Builder
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
