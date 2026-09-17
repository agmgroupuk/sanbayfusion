'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap, ScrollTrigger, SplitText, Flip, ScrambleTextPlugin, Observer, CustomEase, DrawSVGPlugin, Physics2DPlugin, MorphSVGPlugin, Draggable, MotionPathPlugin, TextPlugin, InertiaPlugin, PhysicsPropsPlugin, CustomWiggle, CustomBounce } from '@/lib/gsap';

const showcaseImages = [
  { src: '/images/showcase/agent-chat.jpg', fallback: '/images/showcase/agent-chat-1.jpg', alt: 'AI Agent Chat', title: 'Chat with AI Agents', desc: 'Natural conversations with 18+ unique AI personalities' },
  { src: '/images/showcase/agent-chat-1.jpg', fallback: '/images/showcase/analytics.jpg', alt: 'Neural Config', title: 'Smart Neural Config', desc: 'Customize temperature, tokens & AI behavior' },
  { src: '/images/showcase/neural-config.jpg', fallback: '/images/showcase/editor-app.jpg', alt: 'Neural Settings', title: 'Advanced AI Settings', desc: 'Fine-tune your AI experience with precision' },
  { src: '/images/showcase/ai-canvas.jpg', fallback: '/images/showcase/canvas-app.jpg', alt: 'Canvas Builder', title: 'AI-Powered Canvas', desc: 'Build complete web apps from simple prompts' },
  { src: '/images/showcase/canvas-preview.jpg', fallback: '/images/showcase/canvas-app.jpg', alt: 'Canvas Preview', title: 'Live Preview & Export', desc: 'See your creations come to life instantly' },
];

const features = [
  { icon: '💬', title: 'Natural Conversations', desc: 'Chat with 18 unique AI personalities' },
  { icon: '🎨', title: 'Canvas Builder', desc: 'Generate complete web apps with AI' },
  { icon: '💾', title: 'Saved History', desc: 'All conversations saved & searchable' },
  { icon: '🎯', title: 'Customizable', desc: 'Adjust temperature, tokens & behavior' },
];

export default function AIShowcaseSection() {
  const [idx, setIdx] = useState(0);
  const [srcs, setSrcs] = useState(showcaseImages.map(i => i.src));
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const svgUnderlineRef = useRef<SVGPathElement>(null);
  const orbsContainerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);
  const morphBlobRef = useRef<SVGPathElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  // Auto-rotate images
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % showcaseImages.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleImgError = useCallback((i: number) => {
    setSrcs(p => { const n = [...p]; n[i] = showcaseImages[i].fallback; return n; });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    gsap.registerPlugin(SplitText, Flip, ScrambleTextPlugin, Observer, DrawSVGPlugin, Physics2DPlugin, MorphSVGPlugin, Draggable, MotionPathPlugin, TextPlugin, InertiaPlugin, PhysicsPropsPlugin, CustomWiggle, CustomBounce);

    // ─── Custom Eases ───
    CustomEase.create('cinematicReveal', 'M0,0 C0.11,0.494 0.192,0.726 0.318,0.852 0.45,0.984 0.504,1 1,1');
    CustomBounce.create('gentleBounce', { strength: 0.4, squash: 2, endAtStart: false });
    CustomWiggle.create('cardWiggle', { wiggles: 4, type: 'easeOut' });

    const ctx = gsap.context(() => {
      // ═══════════════════════════════════════════════════════════
      // 1. CLIP-PATH DIAMOND REVEAL — geometric unfold (DrawSVG-style)
      // ═══════════════════════════════════════════════════════════
      if (revealRef.current) {
        gsap.set(revealRef.current, { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)' });
        gsap.to(revealRef.current, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          ease: 'cinematicReveal',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 20%',
            scrub: 1,
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 3. SVG UNDERLINE — DrawSVGPlugin strokes under title
      // ═══════════════════════════════════════════════════════════
      if (svgUnderlineRef.current) {
        gsap.set(svgUnderlineRef.current, { drawSVG: '0%' });
        gsap.to(svgUnderlineRef.current, {
          drawSVG: '100%',
          duration: 1.5,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 4. MORPHING BLOB — MorphSVGPlugin background shape morphing
      // ═══════════════════════════════════════════════════════════
      if (morphBlobRef.current) {
        const shapes = [
          'M400,300 C400,160 310,80 200,80 C90,80 0,160 0,300 C0,440 90,520 200,520 C310,520 400,440 400,300Z',
          'M420,280 C420,140 340,50 200,50 C60,50 -20,140 -20,280 C-20,420 60,550 200,550 C340,550 420,420 420,280Z',
          'M380,320 C380,170 290,100 200,100 C110,100 20,170 20,320 C20,470 110,500 200,500 C290,500 380,470 380,320Z',
        ];
        const morphTl = gsap.timeline({ repeat: -1, yoyo: true });
        shapes.forEach((shape, i) => {
          morphTl.to(morphBlobRef.current, {
            morphSVG: shape,
            duration: 4,
            ease: 'sine.inOut',
          }, i > 0 ? '>' : 0);
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 5. OBSERVER MOUSE PARALLAX — tilt the whole section
      // ═══════════════════════════════════════════════════════════
      if (sectionRef.current) {
        const section = sectionRef.current;
        Observer.create({
          target: section,
          type: 'pointer',
          onMove: (self) => {
            const rect = section.getBoundingClientRect();
            const x = ((self.x || 0) - rect.left) / rect.width - 0.5;
            const y = ((self.y || 0) - rect.top) / rect.height - 0.5;
            gsap.to(section, { rotateY: x * 3, rotateX: -y * 3, duration: 0.6, ease: 'power2.out', transformPerspective: 1200 });
          },
        });
        section.addEventListener('mouseleave', () => {
          gsap.to(section, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'elastic.out(1,0.5)' });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 6. BROWSER MOCKUP — slides in from left with 3D flip, scrub-driven
      // ═══════════════════════════════════════════════════════════
      if (imageRef.current) {
        gsap.set(imageRef.current, {
          opacity: 0,
          x: -300,
          rotateY: 35,
          scale: 0.7,
          filter: 'blur(10px)',
          transformPerspective: 1200,
          transformOrigin: 'left center',
        });

        gsap.to(imageRef.current, {
          opacity: 1,
          x: 0,
          rotateY: 0,
          scale: 1,
          filter: 'blur(0px)',
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            end: 'top 30%',
            scrub: 0.8,
          },
        });

        // Gentle parallax float while visible
        gsap.to(imageRef.current, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 7. BADGE — ScrambleTextPlugin hacker-style text reveal
      // ═══════════════════════════════════════════════════════════
      if (badgeTextRef.current) {
        gsap.from(badgeTextRef.current, {
          duration: 1.5,
          scrambleText: {
            text: '{original}',
            chars: '01!<>{}[]#@$%^&*',
            revealDelay: 0.3,
            speed: 0.4,
          },
          scrollTrigger: {
            trigger: badgeTextRef.current,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 8. TITLE — scrub-driven scale+fade entrance from below
      // ═══════════════════════════════════════════════════════════
      if (titleRef.current) {
        gsap.set(titleRef.current, { opacity: 0, y: 80, scale: 0.85, rotateX: -20, filter: 'blur(12px)' });
        gsap.to(titleRef.current, {
          opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)',
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 95%',
            end: 'top 55%',
            scrub: 0.8,
          },
        });
        // Continuous subtle float after entrance
        gsap.to(titleRef.current, {
          y: -6, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5,
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 9. SUBTITLE — TextPlugin typing effect
      // ═══════════════════════════════════════════════════════════
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
            scrollTrigger: {
              trigger: subtitleRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
        gsap.from(subtitleRef.current, {
          duration: 2,
          text: { value: '', delimiter: '' },
          ease: 'none',
          delay: 0.8,
          scrollTrigger: {
            trigger: subtitleRef.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 10. FLOATING ORBS — MotionPathPlugin orbital paths
      // ═══════════════════════════════════════════════════════════
      if (orbsContainerRef.current) {
        const orbs = orbsContainerRef.current.querySelectorAll('.floating-orb');
        orbs.forEach((orb, i) => {
          const radius = 120 + i * 60;
          const duration = 6 + i * 3;
          gsap.set(orb, { opacity: 0 });
          gsap.to(orb, {
            opacity: 0.6 + i * 0.1,
            duration: 1,
            scrollTrigger: {
              trigger: orbsContainerRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          });
          gsap.to(orb, {
            motionPath: {
              path: [
                { x: radius, y: 0 },
                { x: 0, y: radius * 0.7 },
                { x: -radius, y: 0 },
                { x: 0, y: -radius * 0.7 },
                { x: radius, y: 0 },
              ],
              curviness: 1.5,
            },
            duration,
            repeat: -1,
            ease: 'none',
          });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 11. PARTICLE BURST — Physics2DPlugin behind title
      // ═══════════════════════════════════════════════════════════
      if (particlesRef.current) {
        const dots = particlesRef.current.querySelectorAll('.phys-particle');
        dots.forEach((dot) => {
          gsap.set(dot, { x: 0, y: 0, opacity: 0 });
        });

        ScrollTrigger.create({
          trigger: titleRef.current,
          start: 'top 88%',
          onEnter: () => {
            dots.forEach((dot) => {
              gsap.to(dot, {
                physics2D: {
                  velocity: 150 + Math.random() * 200,
                  angle: Math.random() * 360,
                  gravity: 80,
                },
                opacity: 0.8,
                duration: 0.1,
              });
              gsap.to(dot, { opacity: 0, duration: 1.5, delay: 0.5, ease: 'power2.in' });
            });
          },
          onLeaveBack: () => {
            dots.forEach((dot) => {
              gsap.set(dot, { x: 0, y: 0, opacity: 0 });
            });
          },
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 12. FEATURE CARDS — scrub-driven fly-in from 4 corners + flip
      //     Scroll down → cards assemble; scroll up → cards disperse
      // ═══════════════════════════════════════════════════════════
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.feat-card');
        const icons = cardsRef.current.querySelectorAll('.feat-icon');

        // Each card flies in from a unique direction:
        // [0] top-left → bottom-right entry    [1] top-right → bottom-left entry
        // [2] bottom-left → top-right entry    [3] bottom-right → top-left entry
        const flyPositions = [
          { x: -280, y: -180, rotateX: 45, rotateY: -35, r: -20 },   // card 0: from top-left
          { x: 280, y: -180, rotateX: 45, rotateY: 35, r: 20 },      // card 1: from top-right
          { x: -280, y: 200, rotateX: -35, rotateY: -25, r: 15 },    // card 2: from bottom-left
          { x: 280, y: 200, rotateX: -35, rotateY: 25, r: -15 },     // card 3: from bottom-right
        ];

        cards.forEach((card, i) => {
          const pos = flyPositions[i] || { x: 0, y: 200, rotateX: 0, rotateY: 0, r: 0 };

          // Set initial off-screen state
          gsap.set(card, {
            opacity: 0,
            x: pos.x,
            y: pos.y,
            rotation: pos.r,
            rotateX: pos.rotateX,
            rotateY: pos.rotateY,
            scale: 0.3,
            filter: 'blur(12px)',
            transformPerspective: 800,
          });

          // Scrub-driven fly-in — fully reversible on scroll
          gsap.to(card, {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 90%',
              end: 'top 35%',
              scrub: 0.8,
            },
          });

          // Hover → 3D flip tilt + glow
          card.addEventListener('mouseenter', () => {
            gsap.to(card, {
              y: -14,
              scale: 1.06,
              rotateX: -5,
              rotateY: i % 2 === 0 ? 8 : -8,
              boxShadow: '0 25px 80px rgba(6,182,212,0.3), 0 10px 30px rgba(59,130,246,0.2)',
              duration: 0.5,
              ease: 'power2.out',
            });
          });
          card.addEventListener('mouseleave', () => {
            gsap.to(card, {
              y: 0,
              scale: 1,
              rotateX: 0,
              rotateY: 0,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 2px 15px rgba(0,0,0,0.3)',
              duration: 0.7,
              ease: 'elastic.out(1->0.4)',
            });
          });
        });

        // CustomWiggle on icons — continuous wiggle
        icons.forEach((icon, i) => {
          gsap.to(icon, {
            rotation: 10,
            duration: 0.8,
            ease: 'cardWiggle',
            repeat: -1,
            repeatDelay: 3 + i * 0.5,
            yoyo: true,
          });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 13. CTA BUTTONS — fly up from below, scrub-driven + magnetic hover
      // ═══════════════════════════════════════════════════════════
      if (ctaRef.current) {
        const links = ctaRef.current.querySelectorAll('a');

        // Each button slides up from below
        links.forEach((link, i) => {
          gsap.set(link, {
            opacity: 0,
            y: 80,
            scale: 0.7,
            filter: 'blur(8px)',
          });
          gsap.to(link, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaRef.current,
              start: 'top 95%',
              end: 'top 65%',
              scrub: 0.6,
            },
          });
        });

        // Magnetic hover on CTA links
        links.forEach(link => {
          link.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = link.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(link, { x: x * 0.3, y: y * 0.3, scale: 1.05, duration: 0.3, ease: 'power2.out' });
          });
          link.addEventListener('mouseleave', () => {
            gsap.to(link, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
          });
        });
      }

      // ═══════════════════════════════════════════════════════════
      // 14. IMAGE CAROUSEL — Flip transitions on index change
      // ═══════════════════════════════════════════════════════════
      if (imageRef.current) {
        const carouselDotsEl = imageRef.current.querySelectorAll('.carousel-dot');
        carouselDotsEl.forEach((dot) => {
          dot.addEventListener('click', () => {
            const state = Flip.getState(carouselDotsEl);
            Flip.from(state, {
              duration: 0.4,
              ease: 'power2.inOut',
              stagger: 0.02,
            });
          });
        });
      }

    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden" style={{ perspective: '1200px' }}>
      {/* ═══ Morphing SVG Blob Background ═══ */}
      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04] pointer-events-none -z-10" viewBox="0 0 400 600">
        <path
          ref={morphBlobRef}
          d="M400,300 C400,160 310,80 200,80 C90,80 0,160 0,300 C0,440 90,520 200,520 C310,520 400,440 400,300Z"
          fill="url(#blobGrad)"
        />
        <defs>
          <radialGradient id="blobGrad">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>
        </defs>
      </svg>

      {/* ═══ Physics2D Particle Burst (behind title) ═══ */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none z-0 flex items-start justify-center pt-48">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`p-${i}`}
            className="phys-particle absolute"
            style={{
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#3b82f6' : '#8b5cf6',
              boxShadow: `0 0 ${6 + i}px ${i % 3 === 0 ? 'rgba(6,182,212,0.8)' : 'rgba(59,130,246,0.8)'}`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div ref={revealRef} className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative p-8 md:p-12 lg:p-16">

          {/* Header */}
          <div className="text-center mb-12">
            <span
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(6,182,212,0.03))',
                border: '1px solid rgba(6,182,212,0.15)',
                boxShadow: '0 0 20px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.8), 0 0 16px rgba(6,182,212,0.4)' }}
              />
              <span ref={badgeTextRef} className="text-sm font-medium tracking-wide" style={{ color: 'rgba(6,182,212,0.9)', textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>AI Platform</span>
            </span>
            <h2
              ref={titleRef}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
              style={{
                opacity: 1,
                background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(186,230,253,0.9), rgba(6,182,212,0.6))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(6,182,212,0.2))',
              }}
            >
              Experience AI<br />Like Never Before
            </h2>

            {/* ═══ Animated SVG Underline — DrawSVGPlugin ═══ */}
            <svg className="mx-auto mt-4 w-64 md:w-80 h-3" viewBox="0 0 320 12" fill="none">
              <path
                ref={svgUnderlineRef}
                d="M0,6 C40,2 80,10 120,6 C160,2 200,10 240,6 C280,2 310,8 320,6"
                stroke="url(#underlineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' }}
              />
              <defs>
                <linearGradient id="underlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>

            {/* ═══ Subtitle with TextPlugin typing effect ═══ */}
            <p
              ref={subtitleRef}
              className="mt-4 text-base md:text-lg max-w-xl mx-auto"
              style={{ color: 'rgba(186,230,253,0.6)', textShadow: '0 0 8px rgba(6,182,212,0.15)', opacity: 0 }}
            >
              Powered by 18+ AI models with real-time chat, canvas builder &amp; more
            </p>
          </div>

          {/* 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left: browser mockup */}
            <div ref={imageRef} className="relative" style={{ perspective: '1200px' }}>
              {/* ═══ Floating Orbs — MotionPathPlugin ═══ */}
              <div ref={orbsContainerRef} className="absolute inset-0 pointer-events-none z-30">
                {[
                  { size: 8, color: '#06b6d4', glow: 'rgba(6,182,212,0.8)' },
                  { size: 6, color: '#3b82f6', glow: 'rgba(59,130,246,0.8)' },
                  { size: 10, color: '#8b5cf6', glow: 'rgba(139,92,246,0.8)' },
                  { size: 5, color: '#06b6d4', glow: 'rgba(6,182,212,0.6)' },
                ].map((orb, i) => (
                  <div
                    key={`orb-${i}`}
                    className="floating-orb absolute top-1/2 left-1/2"
                    style={{
                      width: orb.size,
                      height: orb.size,
                      borderRadius: '50%',
                      background: orb.color,
                      boxShadow: `0 0 ${orb.size * 2}px ${orb.glow}, 0 0 ${orb.size * 4}px ${orb.glow}`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.3))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* Browser chrome */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.7)', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.7)', boxShadow: '0 0 6px rgba(234,179,8,0.4)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.7)', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-6 rounded-md flex items-center px-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-[10px]" style={{ color: 'rgba(156,163,175,0.5)', textShadow: '0 0 6px rgba(6,182,212,0.2)' }}>maula.ai/agents</span>
                    </div>
                  </div>
                </div>
                {/* Image carousel */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  {showcaseImages.map((img, i) => (
                    <div key={i} className={`absolute inset-0 transition-all duration-700 ${i === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
                      <Image src={srcs[i]} alt={img.alt} fill className="object-cover" onError={() => handleImgError(i)} sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="font-semibold text-lg" style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 0 12px rgba(255,255,255,0.3), 0 0 30px rgba(6,182,212,0.15)' }}>{showcaseImages[idx].title}</p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(186,230,253,0.6)', textShadow: '0 0 8px rgba(6,182,212,0.2)' }}>{showcaseImages[idx].desc}</p>
                  </div>
                </div>
                {/* Dots */}
                <div className="flex justify-center gap-2 py-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {showcaseImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className="carousel-dot rounded-full transition-all duration-300"
                      style={{
                        height: '6px',
                        width: i === idx ? '32px' : '6px',
                        background: i === idx ? '#06b6d4' : 'rgba(255,255,255,0.15)',
                        boxShadow: i === idx ? '0 0 10px rgba(6,182,212,0.6), 0 0 20px rgba(6,182,212,0.3)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Deep glow behind */}
              <div className="absolute -inset-6 rounded-3xl -z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06), transparent 70%)' }} />
            </div>

            {/* Right: Crystal ice feature cards */}
            <div ref={cardsRef} className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="feat-card group relative rounded-2xl p-6 overflow-hidden transition-all duration-700 hover:-translate-y-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.09) 0%, rgba(59,130,246,0.05) 50%, rgba(0,0,0,0.28) 100%)',
                    border: '1px solid rgba(6,182,212,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.07), inset 0 1px 0 rgba(255,255,255,0.09)',
                    perspective: '600px',
                  }}
                >
                  {/* Top frost line */}
                  <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Hover glow overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06), transparent 60%, rgba(59,130,246,0.04))' }}
                  />

                  <div className="relative z-10">
                    {/* Light-wire glowing emoji */}
                    <div
                      className="feat-icon text-3xl mb-4 group-hover:scale-110 transition-transform duration-500"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.5)) drop-shadow(0 0 12px rgba(6,182,212,0.25))' }}
                    >
                      {f.icon}
                    </div>
                    {/* Light-wire title */}
                    <h3
                      className="font-semibold mb-2 text-sm transition-all duration-500"
                      style={{
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 0 8px rgba(255,255,255,0.15), 0 0 20px rgba(6,182,212,0.1)',
                      }}
                    >
                      {f.title}
                    </h3>
                    {/* Light-wire description */}
                    <p
                      className="text-xs leading-relaxed transition-all duration-500"
                      style={{
                        color: 'rgba(156,163,175,0.7)',
                        textShadow: '0 0 10px rgba(6,182,212,0.05)',
                      }}
                    >
                      {f.desc}
                    </p>
                  </div>

                  {/* Bottom frost edge */}
                  <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />

                  {/* Corner glow on hover */}
                  <div
                    className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ background: 'radial-gradient(circle at bottom right, rgba(6,182,212,0.1), transparent 70%)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <Link
              href="https://maula.ai/agents"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 group"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                boxShadow: '0 0 30px rgba(6,182,212,0.25), 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                textShadow: '0 0 10px rgba(255,255,255,0.3)',
              }}
            >
              Explore All Agents
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a
              href="https://canvas.maula.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-1 group"
              style={{
                color: 'rgba(209,213,219,0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                textShadow: '0 0 8px rgba(6,182,212,0.2)',
              }}
            >
              Try Canvas Builder
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
