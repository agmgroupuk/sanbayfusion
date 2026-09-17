'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import HeroSectionGSAP from '@/components/HeroSectionGSAP';
import AgentCardsMarquee from '@/components/AgentCardsMarquee';
import AIShowcaseSection from '@/components/AIShowcaseSection';
import AnalyticsSection from '@/components/AnalyticsSection';
import InsightsSection from '@/components/InsightsSection';
import EnvironmentSetupSection from '@/components/EnvironmentSetupSection';
import ToolsShowcaseSection from '@/components/ToolsShowcaseSection';
import AILabSection from '@/components/AILabSection';
import CanvasBuilderSection from '@/components/CanvasBuilderSection';
import DataGeneratorSection from '@/components/DataGeneratorSection';
import TestimonialSection from '@/components/TestimonialSection';
import CommunityStats from '@/components/CommunityStats';
import FAQSection from '@/components/FAQSection';
import NewsSection from '@/components/NewsSection';
import IntegrationsSection from '@/components/IntegrationsSection';
import RoadmapSection from '@/components/RoadmapSection';
import SecuritySection from '@/components/SecuritySection';
import NewsletterSectionGSAP from '@/components/NewsletterSectionGSAP';
import PricingSection from '@/components/PricingSection';
import WhyChooseUsSection from '@/components/WhyChooseUsSection';
import CTASection from '@/components/CTASection';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* ═══════════════════════════════════════════════════════
   HOMEPAGE — Bold line + "AI DIGITAL FRIEND ZONE"

   • Line travels down with scroll
   • Letters collect on the line one-by-one (bounce in)
   • Letter style: white→cyan gradient (like hero title)
   • Scrolling back UP → letters drop off in reverse
   • Fully reversible: down = collect, up = release
   • Background: #030304 — UNTOUCHED
   ═══════════════════════════════════════════════════════ */

const PHRASE = 'AI DIGITAL FRIEND ZONE';

/* Map each section (1-19) → character indices in PHRASE to reveal.
   Spaces after word-ending letters come with the letter. */
const SECTION_REVEAL: number[][] = [
  [0],        // Sec 1  → A
  [1, 2],     // Sec 2  → I + space
  [3],        // Sec 3  → D
  [4],        // Sec 4  → I
  [5],        // Sec 5  → G
  [6],        // Sec 6  → I
  [7],        // Sec 7  → T
  [8],        // Sec 8  → A
  [9, 10],    // Sec 9  → L + space
  [11],       // Sec 10 → F
  [12],       // Sec 11 → R
  [13],       // Sec 12 → I
  [14],       // Sec 13 → E
  [15],       // Sec 14 → N
  [16, 17],   // Sec 15 → D + space
  [18],       // Sec 16 → Z
  [19],       // Sec 17 → O
  [20],       // Sec 18 → N
  [21],       // Sec 19 → E
];

/* Section wrapper */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="gs-section relative">
      <div className="gs-inner">
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);
  const pipeRef = useRef<HTMLDivElement>(null);
  const pipeTipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.defaults({ ease: 'power3.out', duration: 0.8 });
    ScrollTrigger.config({ ignoreMobileResize: true });

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: '(prefers-reduced-motion: reduce)',
        full: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduced } = context.conditions as Record<string, boolean>;

        const ctx = gsap.context(() => {
          const sections = gsap.utils.toArray<HTMLElement>('.gs-section');

          sections.forEach((section, sIdx) => {
            const inner = section.querySelector('.gs-inner') as HTMLElement;
            if (!inner) return;

            if (reduced) {
              gsap.fromTo(inner, { opacity: 0 }, {
                opacity: 1, duration: 0.4,
                scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none reverse' },
              });
              return;
            }

            /* Entrance — light fade-in, no blur (GPU-heavy) */
            gsap.fromTo(inner,
              { opacity: 0, y: 60 },
              {
                opacity: 1, y: 0, ease: 'power2.out',
                scrollTrigger: { trigger: section, start: 'top 90%', toggleActions: 'play none none reverse', duration: 0.6 },
              },
            );

            /* Stagger children */
            const staggerEls = inner.querySelectorAll('.gs-stagger');
            if (staggerEls.length > 0) {
              gsap.fromTo(staggerEls,
                { opacity: 0, y: 30 },
                {
                  opacity: 1, y: 0, stagger: 0.06, ease: 'power2.out',
                  scrollTrigger: { trigger: section, start: 'top 75%', toggleActions: 'play none none reverse' },
                },
              );
            }
          });
        }, pageRef);

        return () => ctx.revert();
      },
    );

    /* ─── Pipe + Traveling Letters ─── */
    const timelineCtx = gsap.context(() => {

      const train = trainRef.current;
      const pipe = pipeRef.current;
      const pipeTip = pipeTipRef.current;
      if (!train || !pipe || !pipeTip) return;

      const trainItems = gsap.utils.toArray<HTMLElement>('.gs-train-item');
      const sections = gsap.utils.toArray<HTMLElement>('.gs-section');

      /* Hide everything initially */
      trainItems.forEach(item => {
        item.style.display = 'none';
        item.style.opacity = '0';
      });
      train.style.visibility = 'hidden';
      pipe.style.height = '0px';

      const visible = new Set<number>();
      let cachedH = 0;
      const refreshH = () => { cachedH = train.offsetHeight; };

      /* ═══ PIPE: grows proportionally with scroll ═══
         - Pipe max height = 50vh (middle of screen)
         - At last section (~95% scroll): pipe stops, tip hides
         - Letters detach and travel down to the bottom of the footer
         ═══════════════════════════════════════════════ */
      const PIPE_MAX_VH = 0.50;  /* pipe grows to 50% of viewport */
      const DROP_START = 0.93;   /* letters detach at ~93% scroll (last section) */
      const DROP_END = 1.0;

      ScrollTrigger.create({
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const p = self.progress;
          const vh = window.innerHeight;
          const maxPipeH = vh * PIPE_MAX_VH;

          if (p < 0.005) {
            pipe.style.opacity = '0';
            pipeTip.style.opacity = '0';
            train.style.visibility = 'hidden';
            return;
          }

          pipe.style.opacity = '1';
          train.style.visibility = 'visible';

          /* Pipe grows from 0 → maxPipeH as scroll goes 0 → DROP_START */
          const growProgress = Math.min(p / DROP_START, 1);
          const pipeH = growProgress * maxPipeH;
          pipe.style.height = `${pipeH}px`;

          /* ── Letter train tracking ── */
          if (p < DROP_START) {
            /* Normal: letters ride the pipe tip */
            const trainTop = Math.max(4, pipeH - cachedH - 8);
            train.style.top = `${trainTop}px`;
            train.style.transform = 'translateY(0px)';
            train.style.opacity = '1';
          } else {
            /* DROP ZONE: letters detach from pipe and travel to bottom of viewport.
               They go from their pipe position (maxPipeH area) all the way down
               to the bottom of the screen (vh - trainHeight) */
            const dropProgress = (p - DROP_START) / (DROP_END - DROP_START); /* 0→1 */
            const pipeBottom = maxPipeH - cachedH - 8;
            const targetBottom = vh - cachedH - 10; /* stack at very bottom of viewport */
            const travelDistance = targetBottom - pipeBottom;

            const currentTop = pipeBottom + (dropProgress * travelDistance);
            train.style.top = `${currentTop}px`;
            train.style.transform = 'translateY(0px)';
            train.style.opacity = '1'; /* stay fully visible */
          }
        },
      });

      /* Helper: reveal letters for a section */
      const revealLetters = (charIndices: number[]) => {
        charIndices.forEach((ci, delay) => {
          if (visible.has(ci)) return;
          visible.add(ci);
          const item = trainItems[ci];
          if (!item) return;

          if (item.classList.contains('gs-train-gap')) {
            gsap.set(item, { display: 'block', opacity: 1 });
          } else {
            gsap.set(item, { display: 'flex' });
            gsap.fromTo(item,
              { opacity: 0, scale: 0, y: -14 },
              {
                opacity: 1, scale: 1, y: 0,
                duration: 0.7, ease: 'bounce.out', delay: delay * 0.08,
                onComplete: refreshH,
              },
            );
          }
        });
        requestAnimationFrame(refreshH);
      };

      /* Helper: hide letters for a section (reverse) */
      const hideLetters = (charIndices: number[]) => {
        const reversed = [...charIndices].reverse();
        reversed.forEach((ci, delay) => {
          if (!visible.has(ci)) return;
          visible.delete(ci);
          const item = trainItems[ci];
          if (!item) return;

          if (item.classList.contains('gs-train-gap')) {
            gsap.to(item, {
              opacity: 0, duration: 0.2, delay: delay * 0.06,
              onComplete: () => { item.style.display = 'none'; refreshH(); },
            });
          } else {
            gsap.to(item, {
              opacity: 0, scale: 0, y: 14,
              duration: 0.35, ease: 'power2.in', delay: delay * 0.06,
              onComplete: () => { item.style.display = 'none'; refreshH(); },
            });
          }
        });
        requestAnimationFrame(refreshH);
      };

      /* Wire up each section — onEnter: reveal, onLeaveBack: hide */
      sections.forEach((section, sIdx) => {
        if (sIdx === 0) return;
        const revealIdx = sIdx - 1;
        if (revealIdx >= SECTION_REVEAL.length) return;

        const charIndices = SECTION_REVEAL[revealIdx];

        ScrollTrigger.create({
          trigger: section,
          start: 'top 80%',
          onEnter: () => revealLetters(charIndices),
          onLeaveBack: () => hideLetters(charIndices),
        });
      });

    }, pageRef);

    const timeout = setTimeout(() => ScrollTrigger.refresh(), 600);

    return () => {
      clearTimeout(timeout);
      mm.revert();
      timelineCtx.revert();
    };
  }, []);

  /* Line width — bold vertical line */
  const LINE_W = 3;

  return (
    <div ref={pageRef} style={{ background: '#030304', position: 'relative' }}>
      <HeroSectionGSAP />

      {/* ── Bold vertical line (fixed, left side) ── */}
      <div
        ref={pipeRef}
        className="fixed z-40 pointer-events-none"
        style={{
          left: '6px',
          top: 0,
          width: `${LINE_W}px`,
          height: '0px',
          opacity: 0,
          borderRadius: '2px',
          transition: 'opacity 0.3s',
          background: 'linear-gradient(180deg, rgba(165,243,252,0.9) 0%, rgba(14,165,233,0.7) 50%, rgba(165,243,252,0.5) 100%)',
          boxShadow: '0 0 6px rgba(14,165,233,0.4), 0 0 12px rgba(165,243,252,0.2)',
        }}
      />

      {/* Hidden ref — no longer used but kept to avoid null ref errors */}
      <div ref={pipeTipRef} style={{ display: 'none' }} />

      {/* ── Letter Train (rides on the line) ── */}
      <div
        ref={trainRef}
        className="gs-letter-train fixed z-50 pointer-events-none"
        style={{
          left: '0px',
          visibility: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0px',
        }}
      >
        {PHRASE.split('').map((char, i) => {
          if (char === ' ') {
            return (
              <div
                key={i}
                className="gs-train-item gs-train-gap"
                style={{ display: 'none', height: '6px' }}
              />
            );
          }
          return (
            <div
              key={i}
              className="gs-train-item"
              style={{
                display: 'none',
                opacity: 0,
                width: '14px',
                height: '14px',
                marginTop: i === 0 ? '0px' : '-1px',
                borderRadius: '50%',
                border: '1.5px solid rgba(165,243,252,0.4)',
                background: 'radial-gradient(circle at 40% 35%, #0a1628 0%, #080f1e 60%, #060b18 100%)',
                boxShadow: 'inset 0 0 6px rgba(165,243,252,0.08), 0 0 4px rgba(165,243,252,0.1)',
                position: 'relative' as const,
                zIndex: 22 - i,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: '9px',
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                background: 'linear-gradient(180deg, #ffffff 0%, #a5f3fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{char}</span>
            </div>
          );
        })}
      </div>

      <main className="relative" style={{ zIndex: 5, background: '#030304' }}>

        {/* ── Sections: "AI DIGITAL FRIEND ZONE" ── */}
        <Section><AgentCardsMarquee /></Section>
        <Section><AIShowcaseSection /></Section>
        <Section><AnalyticsSection /></Section>
        <Section><InsightsSection /></Section>
        <Section><EnvironmentSetupSection /></Section>
        <Section><ToolsShowcaseSection /></Section>
        <Section><AILabSection /></Section>
        <Section><CanvasBuilderSection /></Section>
        <Section><DataGeneratorSection /></Section>
        <Section><TestimonialSection /></Section>
        <Section><CommunityStats /></Section>
        <Section><FAQSection /></Section>
        <Section><NewsSection /></Section>
        <Section><IntegrationsSection /></Section>
        <Section><RoadmapSection /></Section>
        <Section><SecuritySection /></Section>
        <Section><NewsletterSectionGSAP /></Section>
        <Section><PricingSection /></Section>
        <Section><WhyChooseUsSection /></Section>
        <Section><CTASection /></Section>
      </main>
    </div>
  );
}
