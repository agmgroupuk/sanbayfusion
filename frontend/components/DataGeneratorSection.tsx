'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, DrawSVGPlugin, CustomEase, Observer, ScrambleTextPlugin, Physics2DPlugin } from '@/lib/gsap';

const dataTypes = [
  { icon: '📝', label: 'Text', count: '50K+' },
  { icon: '🖼️', label: 'Images', count: '25K+' },
  { icon: '🎵', label: 'Audio', count: '10K+' },
  { icon: '📊', label: 'Tables', count: '15K+' },
  { icon: '🔗', label: 'JSON', count: '40K+' },
  { icon: '📄', label: 'PDFs', count: '8K+' },
];

const features = [
  { title: 'AI-Powered Generation', desc: 'Generate realistic synthetic data using our fine-tuned AI models' },
  { title: 'Schema Detection', desc: 'Auto-detect data schemas and relationships from samples' },
  { title: 'Export Anywhere', desc: 'CSV, JSON, SQL, Parquet — export in any format you need' },
];

export default function DataGeneratorSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const featRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('dataBurst', 'M0,0 C0.064,0.802 0.142,1 0.236,1 0.377,1 0.402,0.95 0.488,0.95 0.596,0.95 0.672,1 1,1');
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

      // ─── DATA GRID: Physics2D-style scatter from random angles + elastic settle ───
      if (gridRef.current) {
        const tiles = gridRef.current.querySelectorAll('.data-tile');
        tiles.forEach((tile, i) => {
          const angle = (i / tiles.length) * Math.PI * 2 + gsap.utils.random(-0.5, 0.5);
          const distance = 180 + gsap.utils.random(0, 150);
          const startX = Math.cos(angle) * distance;
          const startY = Math.sin(angle) * distance;
          const rotate = gsap.utils.random(-120, 120);

          const tl = gsap.timeline({
            scrollTrigger: { trigger: gridRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          });
          tl.fromTo(tile,
            { opacity: 0, x: startX, y: startY, rotation: rotate, scale: 0.15, filter: 'blur(10px)' },
            { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)', duration: 1.2, delay: i * 0.07, ease: 'elastic.out(1, 0.5)' }
          );

          // Observer: 3D tilt per tile on hover
          const el = tile as HTMLElement;
          el.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(el, { rotateY: x * 20, rotateX: -y * 15, scale: 1.1, duration: 0.3, ease: 'power2.out', transformPerspective: 500 });
          });
          el.addEventListener('mouseleave', () => {
            gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1,0.5)' });
          });

          // Continuous subtle hover float
          gsap.to(tile, {
            y: gsap.utils.random(-6, 6),
            rotation: gsap.utils.random(-2, 2),
            duration: gsap.utils.random(2, 4),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.3,
          });
        });
      }

      // ─── FEATURES: DrawSVG-style wipe reveal with content slide ───
      if (featRef.current) {
        const items = featRef.current.querySelectorAll('.feat-item');
        items.forEach((item, i) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: featRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
          });
          // Clip-path wipe + scale
          tl.fromTo(item,
            { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', scale: 0.9, x: -30 },
            { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', scale: 1, x: 0, duration: 0.9, delay: i * 0.15, ease: 'dataBurst' }
          );
          // ScrambleText for feature title
          const title = item.querySelector('h4');
          if (title) {
            const text = title.textContent || '';
            tl.to(title, {
              duration: 0.5,
              scrambleText: { text, chars: '!<>{}[]#$@&*', speed: 0.7 },
            }, `-=${0.5}`);
          }
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
            {/* Left: Data tiles scatter grid */}
            <div ref={gridRef} className="grid grid-cols-3 gap-3 sm:gap-4">
              {dataTypes.map((d, i) => (
                <div key={i} className="data-tile group">
                  <div className="backdrop-blur-2xl rounded-2xl p-4 sm:p-5 hover:border-cyan-500/35 transition-all duration-500 hover:-translate-y-1 text-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.16)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), 0 0 14px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <div className="text-3xl sm:text-4xl mb-2">{d.icon}</div>
                    <p className="text-white font-bold text-lg">{d.count}</p>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">{d.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
                <span className="text-cyan-300 text-sm font-medium">📊 Data Engine</span>
              </div>
              <h2 ref={titleRef} className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-6" style={{ opacity: 0 }}>
                Generate Any Data
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Create unlimited synthetic datasets for training, testing, and development. AI-powered data generation that understands schema relationships.
              </p>

              <div ref={featRef} className="space-y-4 mb-8">
                {features.map((f, i) => (
                  <div key={i} className="feat-item rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(0,0,0,0.22))', border: '1px solid rgba(6,182,212,0.13)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                    <h4 className="text-white font-semibold text-sm mb-1">{f.title}</h4>
                    <p className="text-gray-400 text-sm">{f.desc}</p>
                  </div>
                ))}
              </div>

              <a href="https://sanbayfusion.com/tools/data-generator" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-8 py-4 text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:-translate-y-1 transition-all duration-300 group">
                Try Data Generator
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </a>
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
