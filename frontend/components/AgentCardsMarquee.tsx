'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Agent {
  id: string;
  name: string;
  specialty: string;
  description: string;
  color: string;
  emoji: string;
  hoverBadge: string;
}

const agents: Agent[] = [
  {
    id: '1',
    name: 'Einstein',
    specialty: 'Physics & Science',
    description: 'Explore the mysteries of the universe',
    color: 'from-blue-500 to-indigo-600',
    emoji: '🔬',
    hoverBadge: 'E=mc²',
  },
  {
    id: '2',
    name: 'Tech Wizard',
    specialty: 'Coding & Innovation',
    description: 'Master the art of technology',
    color: 'from-purple-500 to-pink-600',
    emoji: '💻',
    hoverBadge: 'Full Stack',
  },
  {
    id: '3',
    name: 'Mrs Boss',
    specialty: 'Leadership & Strategy',
    description: 'Lead with confidence and clarity',
    color: 'from-rose-500 to-red-600',
    emoji: '👔',
    hoverBadge: 'CEO Mindset',
  },
  {
    id: '4',
    name: 'Chef Biew',
    specialty: 'Culinary Expertise',
    description: 'Create culinary masterpieces',
    color: 'from-orange-500 to-amber-600',
    emoji: '👨‍🍳',
    hoverBadge: '5-Star Chef',
  },
  {
    id: '5',
    name: 'Julie',
    specialty: 'Companionship',
    description: 'Your caring AI companion',
    color: 'from-pink-500 to-rose-600',
    emoji: '💕',
    hoverBadge: 'Always Here',
  },
  {
    id: '6',
    name: 'Emma Emotional',
    specialty: 'Empathy & Support',
    description: 'Emotional intelligence expert',
    color: 'from-teal-500 to-cyan-600',
    emoji: '💝',
    hoverBadge: 'Empathy Pro',
  },
  {
    id: '7',
    name: 'Travel Buddy',
    specialty: 'Travel Planning',
    description: 'Your ultimate travel companion',
    color: 'from-green-500 to-emerald-600',
    emoji: '✈️',
    hoverBadge: 'World Explorer',
  },
  {
    id: '8',
    name: 'Fitness Guru',
    specialty: 'Health & Fitness',
    description: 'Transform your body and mind',
    color: 'from-red-500 to-orange-600',
    emoji: '💪',
    hoverBadge: 'Get Fit',
  },
  {
    id: '9',
    name: 'Comedy King',
    specialty: 'Entertainment',
    description: 'Laughter is the best medicine',
    color: 'from-yellow-500 to-orange-600',
    emoji: '😂',
    hoverBadge: 'LOL Master',
  },
  {
    id: '10',
    name: 'Drama Queen',
    specialty: 'Creative Writing',
    description: 'Dramatic storytelling expert',
    color: 'from-violet-500 to-purple-600',
    emoji: '🎭',
    hoverBadge: 'Storyteller',
  },
  {
    id: '11',
    name: 'Professor Astrology',
    specialty: 'Astrology & Spirituality',
    description: 'Decode the stars and beyond',
    color: 'from-indigo-500 to-blue-600',
    emoji: '🔮',
    hoverBadge: 'Star Reader',
  },
  {
    id: '12',
    name: 'Nid Gaming',
    specialty: 'Gaming & Esports',
    description: 'Level up your gaming skills',
    color: 'from-cyan-500 to-blue-600',
    emoji: '🎮',
    hoverBadge: 'Pro Gamer',
  },
  {
    id: '13',
    name: 'Ben Sega',
    specialty: 'Retro Gaming',
    description: 'Classic gaming nostalgia expert',
    color: 'from-blue-500 to-purple-600',
    emoji: '🕹️',
    hoverBadge: 'Retro Master',
  },
  {
    id: '14',
    name: 'Bishop Burger',
    specialty: 'Fast Food & Recipes',
    description: 'Master of comfort food',
    color: 'from-amber-500 to-red-600',
    emoji: '🍔',
    hoverBadge: 'Burger King',
  },
  {
    id: '15',
    name: 'Knight Logic',
    specialty: 'Logic & Strategy',
    description: 'Strategic thinking expert',
    color: 'from-slate-500 to-gray-600',
    emoji: '♞',
    hoverBadge: 'Strategist',
  },
  {
    id: '16',
    name: 'Lazy Pawn',
    specialty: 'Relaxation & Chill',
    description: 'Master of taking it easy',
    color: 'from-green-400 to-teal-500',
    emoji: '😴',
    hoverBadge: 'Chill Mode',
  },
  {
    id: '17',
    name: 'Rook Jokey',
    specialty: 'Comedy & Jokes',
    description: 'Never-ending humor and fun',
    color: 'from-yellow-400 to-amber-500',
    emoji: '🃏',
    hoverBadge: 'Joke Master',
  },
  {
    id: '18',
    name: 'Chess Player',
    specialty: 'Chess & Mind Games',
    description: 'Grandmaster level chess AI',
    color: 'from-gray-600 to-black',
    emoji: '♟️',
    hoverBadge: 'Grandmaster',
  },
];

const N = agents.length;

export default function AgentCardsMarquee() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const cardWidth = 170;
  const cardHeight = 210;
  const baseAngle = 360 / N;
  const radius = useMemo(() => {
    const gap = 30;
    const angleRad = (baseAngle / 2) * (Math.PI / 180);
    return (cardWidth + gap) / (2 * Math.tan(angleRad));
  }, []);

  /* ─── Scroll-driven entrance animations ─── */
  useEffect(() => {
    if (typeof window === 'undefined' || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Header: slide up + de-blur
      if (headerRef.current) {
        gsap.fromTo(headerRef.current,
          { opacity: 0, y: 60, filter: 'blur(8px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1, ease: 'power3.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 88%',
              end: 'top 40%',
              scrub: 0.5,
            },
          },
        );
      }

      // 3D Carousel scene: scale up + rotate in from below
      if (sceneRef.current) {
        gsap.fromTo(sceneRef.current,
          { opacity: 0, y: 100, scale: 0.8, rotateX: 15, filter: 'blur(6px)' },
          {
            opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)',
            duration: 1.2, ease: 'power3.out',
            scrollTrigger: {
              trigger: sceneRef.current,
              start: 'top 90%',
              end: 'top 35%',
              scrub: 0.6,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-32 overflow-hidden relative">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-cyan-500/[0.09] rounded-full filter blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-violet-500/[0.07] rounded-full filter blur-[160px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/[0.04] rounded-full filter blur-[200px]"></div>
      </div>

      {/* Header */}
      <div ref={headerRef} className="container-custom relative z-10 mb-16 md:mb-20" style={{ opacity: 0 }}>
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-cyan-300 text-sm font-medium mb-4 border border-cyan-500/20">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.8))' }}>🤖</span>
            Meet Our AI Agents
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            <span style={{ textShadow: '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(6,182,212,0.15)' }}>18 Unique AI</span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.4))' }}> Personalities</span>
          </h2>
          <p className="text-lg text-gray-400" style={{ textShadow: '0 0 30px rgba(6,182,212,0.08)' }}>
            Each agent brings specialized expertise and a unique personality. Find your perfect AI companion.
          </p>
        </div>
      </div>

      {/* 3D Carousel Scene */}
      <div
        ref={sceneRef}
        className="scene relative"
        style={{
          perspective: '1200px',
          opacity: 0,
          height: '480px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        }}
      >
        {/* 3D Rotating Container */}
        <div
          ref={carouselRef}
          className="a3d"
          style={{
            transformStyle: 'preserve-3d',
            animation: isPaused ? 'none' : 'carouselSpin 50s linear infinite',
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
          }}
        >
          {agents.map((agent, index) => (
            <div
              key={agent.id}
              className="card-3d group cursor-pointer"
              style={{
                position: 'absolute',
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                backfaceVisibility: 'hidden',
                transform: `rotateY(${index * baseAngle}deg) translateZ(${radius}px)`,
              }}
              onMouseEnter={() => setHoveredId(agent.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* ═══ Rich Gloss Card (matching Tools page style) ═══ */}
              <div
                className={`relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500 ${hoveredId === agent.id ? 'scale-110' : ''}`}
                style={{
                  background: hoveredId === agent.id
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 50%, rgba(6,182,212,0.06) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 60%, rgba(6,182,212,0.02) 100%)',
                  border: hoveredId === agent.id
                    ? '1px solid rgba(6,182,212,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(24px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                  boxShadow: hoveredId === agent.id
                    ? '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(6,182,212,0.08)'
                    : '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                {/* Top shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Color tint overlay — each agent has its own personality color */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} transition-opacity duration-500 ${hoveredId === agent.id ? 'opacity-[0.12]' : 'opacity-[0.05]'} rounded-2xl`} />

                {/* ── Icon Area ── */}
                <div className="relative h-[86px] flex items-center justify-center">
                  {/* Radial glow bloom */}
                  <div
                    className="absolute w-20 h-20 rounded-full transition-all duration-500"
                    style={{
                      background: hoveredId === agent.id
                        ? 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                      filter: hoveredId === agent.id ? 'blur(8px)' : 'blur(4px)',
                    }}
                  />
                  {/* Icon ring — styled like Tools page icon box */}
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
                    style={{
                      background: hoveredId === agent.id
                        ? 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
                      border: hoveredId === agent.id
                        ? '1px solid rgba(6,182,212,0.45)'
                        : '1px solid rgba(255,255,255,0.14)',
                      boxShadow: hoveredId === agent.id
                        ? '0 0 20px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)'
                        : '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    <span
                      className="text-xl transition-all duration-500"
                      style={{
                        filter: hoveredId === agent.id
                          ? 'drop-shadow(0 0 8px rgba(6,182,212,1)) drop-shadow(0 0 16px rgba(6,182,212,0.6))'
                          : 'drop-shadow(0 0 4px rgba(255,255,255,0.4))',
                      }}
                    >
                      {agent.emoji}
                    </span>
                  </div>
                </div>

                {/* ── Content ── */}
                <div className="px-3.5 pb-3.5">
                  <h3
                    className="text-[13px] font-bold mb-1 truncate transition-all duration-400"
                    style={{
                      color: hoveredId === agent.id ? '#ffffff' : 'rgba(255,255,255,0.88)',
                      textShadow: hoveredId === agent.id
                        ? '0 0 12px rgba(6,182,212,0.9), 0 0 24px rgba(6,182,212,0.4)'
                        : '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {agent.name}
                  </h3>

                  <p
                    className="text-[10px] mb-2.5 line-clamp-2 leading-snug transition-all duration-400"
                    style={{
                      color: hoveredId === agent.id ? 'rgba(186,230,253,0.8)' : 'rgba(156,163,175,0.65)',
                    }}
                  >
                    {agent.description}
                  </p>

                  {/* Specialty chip */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-400"
                      style={{
                        background: hoveredId === agent.id ? '#22d3ee' : 'rgba(6,182,212,0.6)',
                        boxShadow: hoveredId === agent.id ? '0 0 6px rgba(34,211,238,1), 0 0 12px rgba(34,211,238,0.5)' : 'none',
                      }}
                    />
                    <span
                      className="text-[9px] truncate font-medium transition-all duration-400"
                      style={{
                        color: hoveredId === agent.id ? 'rgba(34,211,238,0.9)' : 'rgba(107,114,128,0.9)',
                      }}
                    >
                      {agent.specialty}
                    </span>
                  </div>
                </div>

                {/* Bottom edge accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px transition-all duration-500"
                  style={{
                    background: hoveredId === agent.id
                      ? 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#030304]/80 via-[#030304]/40 to-transparent pointer-events-none"></div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes carouselSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(-360deg); }
        }
        .card-3d {
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </section>
  );
}
