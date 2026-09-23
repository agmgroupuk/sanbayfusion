'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, Observer, CustomEase } from '@/lib/gsap';

const reasons = [
  { icon: '🚀', title: 'Ship 10x Faster', desc: 'From idea to production in minutes, not months. AI handles the heavy lifting.' },
  { icon: '🧠', title: 'Smarter AI', desc: 'Multi-model routing automatically selects the best AI for each task.' },
  { icon: '🎨', title: 'Visual-First', desc: 'Build visually with our canvas editor. No coding required to get started.' },
  { icon: '🔒', title: 'Enterprise Ready', desc: 'SOC 2, GDPR, SSO — all the security your team needs built in.' },
  { icon: '💡', title: 'AI Insights', desc: 'Deep analytics that help you understand users and improve conversations.' },
  { icon: '🌍', title: 'Global Scale', desc: 'Edge-deployed infrastructure across 40+ regions. <50ms latency worldwide.' },
  { icon: '🤝', title: 'Amazing Support', desc: '24/7 dedicated support with <1hr response time for critical issues.' },
  { icon: '♾️', title: 'Always Evolving', desc: 'Weekly updates, new features every month. Built for the long haul.' },
];

export default function WhyChooseUsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('cardSpring', 'M0,0 C0.12,0.9 0.2,1.12 0.5,1 0.75,0.9 0.88,1 1,1');
    const ctx = gsap.context(() => {
      // ─── TITLE: Blur entrance ───
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 60, filter: 'blur(20px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── CARDS: Physics2D-inspired radial explosion with spin + elastic settle ───
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.reason-card');
        const gridRect = gridRef.current.getBoundingClientRect();
        const centerX = gridRect.width / 2;
        const centerY = gridRect.height / 2;

        cards.forEach((card, i) => {
          const el = card as HTMLElement;
          const cardCX = el.offsetLeft + el.offsetWidth / 2;
          const cardCY = el.offsetTop + el.offsetHeight / 2;
          const dx = (cardCX - centerX) * 0.6;
          const dy = (cardCY - centerY) * 0.6;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const startX = -Math.cos(angle) * (dist + 120);
          const startY = -Math.sin(angle) * (dist + 120);
          const spin = (Math.random() - 0.5) * 720; // multiple spins

          const tl = gsap.timeline({
            scrollTrigger: { trigger: gridRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });

          tl.fromTo(card,
            { opacity: 0, x: startX, y: startY, scale: 0.15, rotation: spin, filter: 'blur(8px)' },
            { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 1.1, delay: i * 0.04, ease: 'cardSpring' }
          );



          // Observer: Individual card tilt
          Observer.create({
            target: el,
            type: 'pointer',
            onMove: (self) => {
              const rect = el.getBoundingClientRect();
              const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
              const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
              gsap.to(el, { rotateY: x * 15, rotateX: -y * 10, scale: 1.08, z: 20, duration: 0.25, ease: 'power2.out' });
            },
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, z: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' });
          });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">✨ Why Sanbay Fusion</span>
            </div>
            <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4" style={{ opacity: 0 }}>
              Why Choose Us
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">The platform that grows with you. Here&apos;s why teams love building with Sanbay Fusion.</p>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reasons.map((r, i) => (
              <div key={i} className="reason-card group">
                <div className="backdrop-blur-xl rounded-2xl p-5 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-1 text-center h-full" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(59,130,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-500">{r.icon}</div>
                  <h3 className="text-white font-bold text-sm mb-2">{r.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
