'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Video, FileText, Newspaper, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { gsap, ScrollTrigger, CustomEase, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, CustomEase, Observer);

const resources = [
  {
    id: 'blog',
    title: 'Blog',
    description: 'Explore in-depth articles on AI agents, Canvas Studio, platform updates, and the future of conversational AI.',
    icon: BookOpen,
    href: '/resources/blog',
    color: 'from-cyan-500 to-blue-500',
    glow: 'rgba(6,182,212,0.4)',
    iconBorder: 'border-cyan-400/30',
    iconBg: 'rgba(6,182,212,0.25)',
    iconBgSecondary: 'rgba(6,182,212,0.15)',
    iconColor: '#a5f3fc',
    hoverAccent: 'cyan',
  },
  {
    id: 'tutorials',
    title: 'Tutorials',
    description: 'Step-by-step guides to build with our AI agents, integrate APIs, set up Canvas apps, and master advanced features.',
    icon: Video,
    href: '/resources/tutorials',
    color: 'from-violet-500 to-fuchsia-500',
    glow: 'rgba(139,92,246,0.4)',
    iconBorder: 'border-violet-400/30',
    iconBg: 'rgba(139,92,246,0.25)',
    iconBgSecondary: 'rgba(192,38,211,0.15)',
    iconColor: '#ddd6fe',
    hoverAccent: 'violet',
  },
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Comprehensive API references, architecture guides, SDK docs, and deployment recipes for developers.',
    icon: FileText,
    href: '/resources/documentation',
    color: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.4)',
    iconBorder: 'border-emerald-400/30',
    iconBg: 'rgba(16,185,129,0.25)',
    iconBgSecondary: 'rgba(20,184,166,0.15)',
    iconColor: '#a7f3d0',
    hoverAccent: 'emerald',
  },
  {
    id: 'news',
    title: 'News',
    description: 'Latest product announcements, industry insights, community milestones, and AI breakthroughs from Sanbay Fusion.',
    icon: Newspaper,
    href: '/resources/news',
    color: 'from-amber-500 to-orange-500',
    glow: 'rgba(245,158,11,0.4)',
    iconBorder: 'border-amber-400/30',
    iconBg: 'rgba(245,158,11,0.25)',
    iconBgSecondary: 'rgba(249,115,22,0.15)',
    iconColor: '#fde68a',
    hoverAccent: 'amber',
  },
];

export default function NewsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      CustomEase.create('cardBounce', 'M0,0 C0.14,0 0.27,0.9 0.5,1 0.73,1.1 0.86,1 1,1');

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
            opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out',
            scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
            delay: 0.2,
          }
        );
      }

      // ─── CARDS: 3D entrance with stagger ───
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll('.resource-card');
        cards.forEach((card, i) => {
          gsap.from(card, {
            scrollTrigger: { trigger: card, start: 'top 90%' },
            opacity: 0,
            y: 60,
            scale: 0.92,
            duration: 0.7,
            delay: i * 0.1,
            ease: 'power3.out',
          });
        });
      }

      // ─── CTA: entrance ───
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 90%', toggleActions: 'play none none reverse' },
          }
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Card hover with tilt + glow — tools page pattern
  const handleCardHover = (cardId: string, isEntering: boolean) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    if (isEntering) {
      setHoveredCard(cardId);
      gsap.to(card, { y: -10, scale: 1.03, duration: 0.4, ease: 'power2.out' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 1, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 1, duration: 0.3 });
      gsap.to(card.querySelector('.card-icon-wrap'), {
        scale: 1.15, rotate: 8, duration: 0.5, ease: 'back.out(2)',
      });
      gsap.to(card.querySelector('.card-arrow'), { x: 6, opacity: 1, duration: 0.3 });
    } else {
      setHoveredCard(null);
      gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      gsap.to(card.querySelector('.card-shine'), { opacity: 0, duration: 0.4 });
      gsap.to(card.querySelector('.card-border-glow'), { opacity: 0, duration: 0.3 });
      gsap.to(card.querySelector('.card-icon-wrap'), {
        scale: 1, rotate: 0, duration: 0.4, ease: 'power2.out',
      });
      gsap.to(card.querySelector('.card-arrow'), { x: 0, opacity: 0.3, duration: 0.3 });
    }
  };

  // 3D tilt on mouse move — tools page pattern
  const handleCardMove = (e: React.MouseEvent, cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

    gsap.to(card, {
      rotateY: x * 8,
      rotateX: -y * 8,
      duration: 0.3,
      ease: 'power2.out',
    });

    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) {
      shine.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 40%)`;
    }
  };

  const handleCardLeave = (cardId: string) => {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;
    gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden" style={{ perspective: '1200px' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 rounded-full px-4 py-2 mb-6 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
            <span className="text-violet-300 text-sm font-medium">📚 Resources</span>
          </div>
          <h2
            ref={titleRef}
            className="text-4xl md:text-6xl font-black leading-tight mb-4"
            style={{ opacity: 0 }}
          >
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Learn, Build &</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Stay Informed</span>
          </h2>
          <p ref={subtitleRef} className="text-gray-400 text-lg max-w-2xl mx-auto font-light" style={{ opacity: 0 }}>
            Discover tutorials, deep-dive articles, technical docs, and the latest news from Sanbay Fusion.
          </p>
        </div>

        {/* Resource Cards Grid — tools page card structure */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {resources.map((resource) => {
            const IconComponent = resource.icon;
            return (
              <Link
                key={resource.id}
                href={resource.href}
                data-card-id={resource.id}
                className="resource-card group relative block"
                style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
                onMouseEnter={() => handleCardHover(resource.id, true)}
                onMouseLeave={() => { handleCardHover(resource.id, false); handleCardLeave(resource.id); }}
                onMouseMove={(e) => handleCardMove(e, resource.id)}
              >
                {/* Outer glow on hover */}
                <div className="card-border-glow absolute -inset-px rounded-2xl opacity-0 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${resource.glow}, transparent 60%)`, filter: 'blur(1px)' }} />

                <div className="relative p-5 rounded-2xl backdrop-blur-sm overflow-hidden h-full transition-all duration-500 group-hover:border-white/[0.12]" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(59,130,246,0.03), rgba(0,0,0,0.28))', border: '1px solid rgba(6,182,212,0.12)', boxShadow: '0 6px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>

                  {/* Mouse-follow shine overlay */}
                  <div className="card-shine absolute inset-0 rounded-2xl opacity-0 pointer-events-none" />

                  {/* Top accent line */}
                  <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${resource.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    {/* Icon — tools page style */}
                    <div className="card-icon-wrap mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${resource.iconBorder}`}
                        style={{
                          background: `linear-gradient(135deg, ${resource.iconBg}, ${resource.iconBgSecondary})`,
                          boxShadow: `0 0 20px ${resource.glow.replace('0.4', '0.12')}, 0 0 40px ${resource.glow.replace('0.4', '0.06')}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: resource.iconColor, filter: `drop-shadow(0 0 8px ${resource.glow})` }} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-200 mb-2 group-hover:text-white transition-colors duration-300">
                      {resource.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-4 line-clamp-3 group-hover:text-gray-500 transition-colors duration-300">
                      {resource.description}
                    </p>

                    {/* Action — tools page style */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                      <span className={`text-xs font-semibold text-gray-600 group-hover:text-${resource.hoverAccent}-400 transition-colors duration-300 uppercase tracking-wider`}>
                        Explore
                      </span>
                      <ArrowRight className={`card-arrow w-4 h-4 text-gray-700 opacity-30 group-hover:text-${resource.hoverAccent}-400 transition-all duration-300`} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Button — tools page CTA footer style */}
        <div ref={ctaRef} className="text-center mt-12">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 rounded-xl text-white font-semibold text-sm shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all duration-400"
          >
            <Sparkles className="w-4 h-4" />
            Browse All Resources
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* Card noise texture — tools page global style */}
      <style jsx global>{`
        .resource-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </section>
  );
}
