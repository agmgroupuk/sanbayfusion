'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, Observer, CustomEase } from '@/lib/gsap';

const securityFeatures = [
  { icon: '🔒', title: 'End-to-End Encryption', desc: 'AES-256 encryption at rest and TLS 1.3 in transit for all data' },
  { icon: '🛡️', title: 'SOC 2 Type II', desc: 'Independently audited security controls and operational processes' },
  { icon: '🌐', title: 'GDPR & CCPA', desc: 'Full compliance with global data privacy regulations' },
  { icon: '🔑', title: 'SSO & SAML', desc: 'Enterprise single sign-on with SAML 2.0 and OAuth 2.0' },
  { icon: '📋', title: 'Audit Logging', desc: 'Complete audit trail for all user actions and API calls' },
  { icon: '🏥', title: 'HIPAA Ready', desc: 'BAA available for healthcare organizations handling PHI' },
];

export default function SecuritySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shieldRef = useRef<SVGSVGElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('shieldReveal', 'M0,0 C0.084,0.61 0.316,0.978 0.5,0.978 0.715,0.978 0.818,1 1,1');
    const ctx = gsap.context(() => {
      // ─── TITLE: whole-element blur entrance ───
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 40, filter: 'blur(16px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' }
          }
        );
      }

      // ─── SHIELD SVG: fade-in + glow + tilt ───
      if (shieldRef.current) {
        const paths = shieldRef.current.querySelectorAll('.shield-path');
        const shieldTl = gsap.timeline({
          scrollTrigger: { trigger: shieldRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        });

        // Fade in paths sequentially
        paths.forEach((path, i) => {
          shieldTl.fromTo(path,
            { opacity: 0, strokeDashoffset: 600, strokeDasharray: 600 },
            { opacity: 1, strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' },
            i * 0.4
          );
        });

        // Shield glow
        const glow = shieldRef.current.querySelector('.shield-glow');
        if (glow) {
          shieldTl.fromTo(glow,
            { opacity: 0, scale: 0.5 },
            { opacity: 1, scale: 1.2, duration: 0.8, ease: 'elastic.out(1, 0.5)' },
            '-=0.5'
          );
          gsap.to(glow, { opacity: 0.2, scale: 1.3, repeat: -1, yoyo: true, duration: 2.5, ease: 'sine.inOut', delay: 3 });
        }

        // Observer: parallax tilt on mouse over shield
        Observer.create({
          target: shieldRef.current.parentElement!,
          type: 'pointer',
          onMove: (self) => {
            const rect = shieldRef.current!.parentElement!.getBoundingClientRect();
            const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
            const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
            gsap.to(shieldRef.current!, { rotateY: x * 20, rotateX: -y * 15, duration: 0.5, ease: 'power2.out', transformOrigin: 'center center' });
          },
        });
        shieldRef.current.parentElement!.addEventListener('mouseleave', () => {
          gsap.to(shieldRef.current!, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
        });
      }

      // ─── FEATURE GRID: Physics2D-style staggered burst + ScrambleText titles ───
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.security-card');
        cards.forEach((card, i) => {
          const row = Math.floor(i / 2);
          const col = i % 2;
          const tl = gsap.timeline({
            scrollTrigger: { trigger: gridRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });

          tl.fromTo(card,
            { opacity: 0, y: 50, x: (col - 0.5) * -60, scale: 0.7, rotation: (col - 0.5) * 10, filter: 'blur(4px)' },
            { opacity: 1, y: 0, x: 0, scale: 1, rotation: 0, filter: 'blur(0px)', duration: 0.8, delay: i * 0.07, ease: 'elastic.out(1, 0.6)' }
          );

          // Hover
          const el = card as HTMLElement;
          el.addEventListener('mouseenter', () => gsap.to(el, { x: 6, scale: 1.03, borderColor: 'rgba(6,182,212,0.3)', duration: 0.25, ease: 'power2.out' }));
          el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, scale: 1, borderColor: 'rgba(255,255,255,0.05)', duration: 0.4, ease: 'elastic.out(1,0.5)' }));
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Animated shield SVG */}
            <div className="flex items-center justify-center">
              <svg ref={shieldRef} viewBox="0 0 200 240" className="w-48 h-56 md:w-64 md:h-72" fill="none">
                {/* Shield glow background */}
                <ellipse className="shield-glow" cx="100" cy="120" rx="80" ry="90" fill="url(#shieldGlow)" opacity="0" />
                {/* Shield outline */}
                <path
                  className="shield-path"
                  d="M100 10 L180 50 L180 130 C180 180 140 220 100 235 C60 220 20 180 20 130 L20 50 Z"
                  stroke="url(#shieldStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Inner shield */}
                <path
                  className="shield-path"
                  d="M100 35 L160 65 L160 125 C160 165 130 195 100 208 C70 195 40 165 40 125 L40 65 Z"
                  stroke="url(#shieldStroke2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"
                />
                {/* Checkmark */}
                <path
                  className="shield-path"
                  d="M70 120 L92 145 L135 95"
                  stroke="#06b6d4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                />
                <defs>
                  <radialGradient id="shieldGlow"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" /><stop offset="100%" stopColor="transparent" /></radialGradient>
                  <linearGradient id="shieldStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                  <linearGradient id="shieldStroke2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" /></linearGradient>
                </defs>
              </svg>
            </div>

            {/* Right: Content + grid */}
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
                <span className="text-cyan-300 text-sm font-medium">🔐 Security</span>
              </div>
              <h2 ref={titleRef} className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-6">
                Enterprise-Grade Security
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Your data&apos;s safety is our top priority. Built with defense-in-depth security architecture trusted by Fortune 500 companies.
              </p>

              <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {securityFeatures.map((f, i) => (
                  <div key={i} className="security-card flex items-start gap-3 rounded-xl p-3 hover:border-cyan-500/30 transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(0,0,0,0.22))', border: '1px solid rgba(6,182,212,0.13)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                    <span className="text-xl mt-0.5 shrink-0">{f.icon}</span>
                    <div>
                      <h4 className="text-white font-semibold text-xs mb-0.5">{f.title}</h4>
                      <p className="text-gray-400 text-xs">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
