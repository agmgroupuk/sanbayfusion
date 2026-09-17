'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, Observer, CustomEase, ScrambleTextPlugin, Flip } from '@/lib/gsap';

const testimonials = [
  { name: 'Sarah Chen', role: 'CTO, TechFlow', avatar: '👩‍💻', quote: 'Maula AI reduced our development time by 60%. The canvas builder is a game-changer for our team.', rating: 5 },
  { name: 'Marcus Webb', role: 'Lead Dev, NovaSoft', avatar: '👨‍💻', quote: 'The AI agent system is incredibly intuitive. We went from concept to production in just 2 weeks.', rating: 5 },
  { name: 'Priya Patel', role: 'Founder, DataVerse', avatar: '👩‍🔬', quote: 'Best-in-class data generation tools. Our ML pipeline quality improved dramatically.', rating: 5 },
  { name: 'Alex Rivera', role: 'VP Eng, CloudScale', avatar: '🧑‍💼', quote: 'The analytics dashboard gives us insights we never had before. Absolutely essential tool.', rating: 5 },
  { name: 'Yuki Tanaka', role: 'AI Lead, FutureStack', avatar: '👨‍🔬', quote: 'Multi-modal AI capabilities are unmatched. Voice, text, and vision — all in one platform.', rating: 5 },
  { name: 'Emma Phillips', role: 'Product, InnovateLab', avatar: '👩‍🎨', quote: 'The design-to-code workflow is seamless. Our designers can now ship production code directly.', rating: 5 },
];

export default function TestimonialSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('marqueeSmooth', 'M0,0 C0.25,0 0.25,1 0.5,1 0.75,1 0.75,0 1,0');
    const ctx = gsap.context(() => {
      // ─── TITLE: whole-element entrance (no SplitText to preserve gradient) ───
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 50, scale: 0.92, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── MARQUEE: Infinite scroll ───
      const createMarquee = (ref: HTMLDivElement | null, direction: number) => {
        if (!ref) return;
        const inner = ref.querySelector('.marquee-inner') as HTMLElement;
        if (!inner) return;

        const clone = inner.cloneNode(true) as HTMLElement;
        ref.appendChild(clone);

        const totalWidth = inner.scrollWidth;
        gsap.set([inner, clone], { display: 'inline-flex' });

        // direction 1 = right-to-left (0 → -totalWidth)
        // direction -1 = left-to-right (-totalWidth → 0)
        const startX = direction > 0 ? 0 : -totalWidth;
        const endX = direction > 0 ? -totalWidth : 0;

        gsap.set(ref, { x: startX });
        gsap.fromTo(ref,
          { x: startX },
          { x: endX, ease: 'none', duration: 35, repeat: -1 }
        );
      };

      createMarquee(marqueeRef.current, 1);
      createMarquee(marqueeRef2.current, -1);

      // ─── CARDS: 3D flip + elastic entrance with stagger ───
      const allCards = sectionRef.current?.querySelectorAll('.testimonial-card');
      allCards?.forEach((card, i) => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
        });
        tl.fromTo(card,
          { opacity: 0, rotateY: 120, scale: 0.5, filter: 'blur(8px)', transformOrigin: 'center center' },
          { opacity: 1, rotateY: 0, scale: 1, filter: 'blur(0px)', duration: 1, delay: i * 0.05, ease: 'elastic.out(1, 0.6)' }
        );

        // Hover 3D tilt
        const el = card as HTMLElement;
        el.addEventListener('mousemove', (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(el, { rotateY: x * 15, rotateX: -y * 10, scale: 1.05, duration: 0.3, ease: 'power2.out', transformPerspective: 600 });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' });
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const firstRow = testimonials.slice(0, 3);
  const secondRow = testimonials.slice(3);

  const renderCard = (t: typeof testimonials[0], i: number) => (
    <div key={i} className="testimonial-card shrink-0 w-[340px] mx-3 whitespace-normal" style={{ perspective: '800px' }}>
      <div className="backdrop-blur-xl rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-500 h-full" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(139,92,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 0 18px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-lg border border-white/10">{t.avatar}</div>
          <div>
            <h4 className="text-white font-semibold text-sm">{t.name}</h4>
            <p className="text-gray-500 text-xs">{t.role}</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            {Array(t.rating).fill(0).map((_, j) => (
              <span key={j} className="text-amber-400 text-xs">★</span>
            ))}
          </div>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">💬 Testimonials</span>
            </div>
            <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4" style={{ opacity: 0 }}>
              Loved by Builders
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Join thousands of developers and teams already building the future with Maula AI.</p>
          </div>

          {/* Marquee row 1 → */}
          <div className="overflow-hidden mb-4">
            <div ref={marqueeRef} className="whitespace-nowrap">
              <div className="marquee-inner inline-flex">
                {[...firstRow, ...firstRow, ...firstRow].map((t, i) => renderCard(t, i))}
              </div>
            </div>
          </div>

          {/* Marquee row 2 ← */}
          <div className="overflow-hidden">
            <div ref={marqueeRef2} className="whitespace-nowrap">
              <div className="marquee-inner inline-flex">
                {[...secondRow, ...secondRow, ...secondRow].map((t, i) => renderCard(t, i))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
