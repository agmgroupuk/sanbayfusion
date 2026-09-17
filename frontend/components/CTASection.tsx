'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, Observer, CustomEase } from '@/lib/gsap';

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('cinematic', 'M0,0 C0.084,0.61 0.214,1.04 0.5,1 0.786,0.96 0.916,1 1,1');
    const ctx = gsap.context(() => {
      // ─── PARTICLES ───
      if (particlesRef.current) {
        const particles = particlesRef.current.querySelectorAll('.cta-particle');
        particles.forEach((p, i) => {
          const angle = (i / particles.length) * Math.PI * 2 + gsap.utils.random(-0.3, 0.3);
          const burstDist = gsap.utils.random(80, 280);
          const finalX = Math.cos(angle) * burstDist;
          const finalY = Math.sin(angle) * burstDist;

          gsap.set(p, { x: 0, y: 0, scale: 0, opacity: 0 });

          gsap.timeline({
            scrollTrigger: { trigger: particlesRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          })
            .to(p, {
              x: finalX, y: finalY, scale: gsap.utils.random(0.4, 1),
              opacity: gsap.utils.random(0.15, 0.45),
              duration: 1.2, delay: i * 0.03, ease: 'expo.out',
            })
            .to(p, {
              y: `+=${gsap.utils.random(-30, 30)}`,
              x: `+=${gsap.utils.random(-30, 30)}`,
              duration: gsap.utils.random(3, 6),
              repeat: -1, yoyo: true, ease: 'sine.inOut',
            });
        });
      }

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

      // ─── BUTTONS: Elastic pop entrance + Observer magnetic effect ───
      if (btnsRef.current) {
        const buttons = btnsRef.current.querySelectorAll('.cta-btn');
        gsap.fromTo(buttons,
          { opacity: 0, scale: 0.3, y: 30, filter: 'blur(6px)' },
          {
            opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
            duration: 0.8, stagger: 0.15, delay: 0.3, ease: 'cinematic',
            scrollTrigger: { trigger: btnsRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
          }
        );

        // Observer magnetic effect on each button
        buttons.forEach((btn) => {
          const el = btn as HTMLElement;
          Observer.create({
            target: el,
            type: 'pointer',
            onMove: (self) => {
              const rect = el.getBoundingClientRect();
              const x = (self.x || 0) - rect.left - rect.width / 2;
              const y = (self.y || 0) - rect.top - rect.height / 2;
              gsap.to(el, { x: x * 0.25, y: y * 0.25, scale: 1.06, duration: 0.3, ease: 'power2.out' });
            },
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
          });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-cyan-500/[0.12] backdrop-blur-2xl p-8 md:p-16 lg:p-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(139,92,246,0.05), rgba(0,0,0,0.35))', boxShadow: '0 0 100px rgba(0,0,0,0.6), 0 0 60px rgba(6,182,212,0.08), 0 0 80px rgba(139,92,246,0.05), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Floating particles */}
          <div ref={particlesRef} className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array(15).fill(0).map((_, i) => (
              <div
                key={i}
                className="cta-particle absolute w-1.5 h-1.5 rounded-full left-1/2 top-1/2"
                style={{ background: i % 2 === 0 ? 'rgba(6,182,212,0.4)' : 'rgba(59,130,246,0.4)' }}
              />
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 ref={titleRef} className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6" style={{ opacity: 0 }}>
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">We&apos;d Love to</span>{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Hear From You</span>
            </h2>

            <p ref={subtitleRef} className="text-gray-400 text-lg md:text-xl mb-10 leading-relaxed max-w-xl mx-auto" style={{ opacity: 0 }}>
              Have an idea for a new feature? Want to request something special? Share your suggestions with us — or explore our docs and tutorials to get the most out of Maula AI.
            </p>

            <div ref={btnsRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/community/suggestions" className="cta-btn bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-8 py-4 text-base font-semibold shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] transition-all duration-300">
                💡 Suggest an Idea
              </Link>
              <Link href="/docs/tutorials" className="cta-btn bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white border border-violet-500/30 rounded-xl px-8 py-4 text-base font-semibold shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_50px_rgba(139,92,246,0.4)] transition-all duration-300">
                📖 Read Documentation
              </Link>
              <Link href="/resources/tutorials" className="cta-btn bg-white/[0.06] text-gray-200 border border-white/[0.1] rounded-xl px-8 py-4 text-base font-semibold hover:bg-white/[0.1] hover:border-emerald-500/30 hover:text-white transition-all duration-300">
                🎓 Browse Tutorials
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
