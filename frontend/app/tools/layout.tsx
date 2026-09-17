'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { gsap } from '@/lib/gsap';

const LISTING_PAGES = ['/tools'];

function ToolsBackground({ children }: { children: ReactNode }) {
  const bgRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.tools-nebula-orb', {
        x: 'random(-120, 120)',
        y: 'random(-80, 80)',
        scale: 'random(0.6, 1.4)',
        opacity: 'random(0.03, 0.08)',
        duration: 12,
        ease: 'sine.inOut',
        stagger: { each: 2, repeat: -1, yoyo: true },
      });

      gsap.utils.toArray<HTMLElement>('.tools-stardust').forEach((p, i) => {
        gsap.to(p, {
          y: '-=200',
          x: 'random(-60, 60)',
          opacity: 0,
          duration: 4 + Math.random() * 6,
          repeat: -1,
          delay: i * 0.3,
          ease: 'power1.out',
          onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); },
        });
        gsap.to(p, {
          scale: 'random(0.5, 1.5)',
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      gsap.to('.tools-scan-line', {
        y: '100vh',
        duration: 8,
        repeat: -1,
        ease: 'none',
      });
    }, bgRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={bgRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Shared atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Nebula orbs */}
        <div className="tools-nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="tools-nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="tools-nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />

        {/* Micro grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Scan line */}
        <div className="tools-scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />

        {/* Stardust particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="tools-stardust absolute rounded-full"
            style={{
              left: `${3 + i * 4.8}%`,
              top: `${60 + (i % 5) * 10}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              background: i % 3 === 0 ? 'rgba(139,92,246,0.6)' : i % 3 === 1 ? 'rgba(6,182,212,0.6)' : 'rgba(236,72,153,0.5)',
              opacity: 0.6,
            }}
          />
        ))}

        {/* Mouse-following ambient light */}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700 ease-out opacity-[0.02]"
          style={{
            left: mousePos.x - 250,
            top: mousePos.y - 250,
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Page content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
      `}</style>
    </div>
  );
}

export default function ToolsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (LISTING_PAGES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <ToolsBackground>
      <SubscriptionGuard message="Access to Network Tools and Developer Utilities requires an active subscription.">
        {children}
      </SubscriptionGuard>
    </ToolsBackground>
  );
}
