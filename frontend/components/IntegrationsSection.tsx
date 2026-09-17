'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { gsap, ScrollTrigger, Observer, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

const integrations = [
  { name: 'OpenAI', icon: '🤖' },
  { name: 'Slack', icon: '💬' },
  { name: 'GitHub', icon: '🐙' },
  { name: 'Stripe', icon: '💳' },
  { name: 'AWS', icon: '☁️' },
  { name: 'Vercel', icon: '▲' },
  { name: 'Notion', icon: '📝' },
  { name: 'Figma', icon: '🎨' },
  { name: 'Discord', icon: '🎮' },
  { name: 'Zapier', icon: '⚡' },
  { name: 'Twilio', icon: '📱' },
  { name: 'MongoDB', icon: '🍃' },
];

export default function IntegrationsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('orbitBurst', 'M0,0 C0.064,0.802 0.2,1.05 0.35,1.05 0.5,1.05 0.65,0.98 1,1');
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

      // ─── SUBTITLE: blur entrance ───
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 40, filter: 'blur(10px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', delay: 0.2,
            scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── CTA: entrance ───
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── ORBIT ICONS: Physics2D burst from center to positions + continuous orbital motion ───
      if (orbitRef.current) {
        const icons = orbitRef.current.querySelectorAll('.orbit-icon');
        icons.forEach((icon, i) => {
          // Burst from center with elastic
          const tl = gsap.timeline({
            scrollTrigger: { trigger: orbitRef.current, start: 'top 78%', toggleActions: 'play none none reverse' },
          });
          tl.fromTo(icon,
            { opacity: 0, scale: 0, x: '-50%', y: '-50%', rotation: gsap.utils.random(-90, 90) },
            { opacity: 1, scale: 1, x: '0%', y: '0%', rotation: 0, duration: 1, delay: i * 0.05, ease: 'elastic.out(1.2, 0.5)' }
          );

          // Hover magnetic effect per icon
          const el = icon as HTMLElement;
          el.addEventListener('mouseenter', () => {
            gsap.to(el, { scale: 1.4, zIndex: 10, boxShadow: '0 0 20px rgba(6,182,212,0.3)', duration: 0.3, ease: 'power2.out' });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { scale: 1, zIndex: 'auto', boxShadow: 'none', duration: 0.4, ease: 'elastic.out(1,0.5)' });
          });
        });

        // Continuous orbital rotation with varying speeds
        const outerRing = orbitRef.current.querySelector('.orbit-ring-outer');
        const innerRing = orbitRef.current.querySelector('.orbit-ring-inner');
        if (outerRing) {
          gsap.to(outerRing, { rotation: 360, duration: 50, repeat: -1, ease: 'none' });
        }
        if (innerRing) {
          gsap.to(innerRing, { rotation: -360, duration: 35, repeat: -1, ease: 'none' });
        }

        // Center hub pulse
        const hub = orbitRef.current.querySelector('.w-20');
        if (hub) {
          gsap.to(hub, { scale: 1.1, boxShadow: '0 0 60px rgba(6,182,212,0.3)', duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        }

        // Observer: parallax the orbit on scroll
        Observer.create({
          target: orbitRef.current,
          type: 'pointer',
          onMove: (self) => {
            const rect = orbitRef.current!.getBoundingClientRect();
            const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
            const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
            gsap.to(orbitRef.current!, { rotateY: x * 12, rotateX: -y * 8, duration: 0.5, ease: 'power2.out', transformPerspective: 1000 });
          },
        });
        orbitRef.current.addEventListener('mouseleave', () => {
          gsap.to(orbitRef.current!, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const outerIcons = integrations.slice(0, 8);
  const innerIcons = integrations.slice(8);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Orbital ring visualization */}
            <div ref={orbitRef} className="relative flex items-center justify-center" style={{ minHeight: '360px' }}>
              {/* Center hub */}
              <div className="absolute w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center z-10 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
                <span className="text-3xl opacity-70">🔌</span>
              </div>

              {/* Dotted orbit rings */}
              <div className="absolute w-56 h-56 rounded-full border border-dashed border-white/[0.04]" />
              <div className="absolute w-80 h-80 rounded-full border border-dashed border-white/[0.03]" />

              {/* Inner ring icons */}
              <div className="orbit-ring-inner absolute w-56 h-56" style={{ transformOrigin: 'center center' }}>
                {innerIcons.map((int, i) => {
                  const angle = (i / innerIcons.length) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 112;
                  return (
                    <div
                      key={i}
                      className="orbit-icon absolute group"
                      style={{
                        left: `calc(50% + ${Math.cos(rad) * radius}px - 20px)`,
                        top: `calc(50% + ${Math.sin(rad) * radius}px - 20px)`,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center text-lg hover:scale-125 cursor-pointer transition-all duration-300" title={int.name} style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(0,0,0,0.3))', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 0 12px rgba(6,182,212,0.08)' }}>
                        {int.icon}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Outer ring icons */}
              <div className="orbit-ring-outer absolute w-80 h-80" style={{ transformOrigin: 'center center' }}>
                {outerIcons.map((int, i) => {
                  const angle = (i / outerIcons.length) * 360;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 160;
                  return (
                    <div
                      key={i}
                      className="orbit-icon absolute group"
                      style={{
                        left: `calc(50% + ${Math.cos(rad) * radius}px - 22px)`,
                        top: `calc(50% + ${Math.sin(rad) * radius}px - 22px)`,
                      }}
                    >
                      <div className="w-11 h-11 rounded-xl backdrop-blur-sm flex items-center justify-center text-xl hover:scale-125 cursor-pointer transition-all duration-300" title={int.name} style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,0,0,0.3))', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 0 12px rgba(139,92,246,0.08)' }}>
                        {int.icon}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
                <span className="text-cyan-300 text-sm font-medium">🔌 Integrations</span>
              </div>
              <h2 ref={titleRef} className="text-4xl md:text-5xl font-black leading-tight mb-6" style={{ opacity: 0 }}>
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Connect</span>{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Everything</span>
              </h2>
              <p ref={subtitleRef} className="text-gray-400 text-lg mb-6 leading-relaxed font-light" style={{ opacity: 0 }}>
                Seamlessly connect Maula AI with 100+ tools and services you already use. From AI providers to deployment platforms — it all works together.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {integrations.map((int, i) => (
                  <span key={i} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-all duration-300 cursor-pointer" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(0,0,0,0.2))', border: '1px solid rgba(6,182,212,0.14)' }}>
                    {int.icon} {int.name}
                  </span>
                ))}
              </div>

              {/* CTA Button */}
              <div ref={ctaRef} style={{ opacity: 0 }}>
                <Link
                  href="/docs/agents"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400"
                >
                  Explore Agent Docs
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
