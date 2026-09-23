'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin } from '@/lib/gsap';
import Link from 'next/link';


export default function AboutOverviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const missionPoints = [
    { icon: '🧩', title: 'Modular', desc: 'Easily integrated and customized' },
    { icon: '✨', title: 'Intuitive', desc: 'Seamless user experience across skill levels' },
    { icon: '🧠', title: 'Intelligent', desc: 'Advanced frameworks for real-time learning' },
    { icon: '💜', title: 'Companionable', desc: 'Engages with empathy, not just efficiency' }
  ];

  const whyPoints = [
    { icon: '👋', title: 'Approachable', desc: 'Friendly and natural interactions' },
    { icon: '🔄', title: 'Adaptive', desc: 'Continuously learning from user behavior' },
    { icon: '🔒', title: 'Secure', desc: 'Built with privacy and ethical safeguards' },
    { icon: '📈', title: 'Scalable', desc: 'Enterprise-ready, global expansion possible' }
  ];

  const platforms = [
    { 
      name: 'OneManArmy.ai', 
      icon: '🛡️', 
      desc: 'Tactical platform for ethical hacking education',
      gradient: 'from-orange-500 to-red-500',
      features: ['Real-world labs & AI-powered mentors', 'Certification pathways', 'Youth-focused, premium, secure, invite-only']
    },
    { 
      name: 'Sanbay Fusion',
      icon: '🌌', 
      desc: 'Cinematic AI multiverse with 50+ modular agents',
      gradient: 'from-purple-500 to-pink-500',
      features: ['Memory, emotion, voice, and personality', 'Terminal, web, and mobile deployment', 'Enterprise-ready, scalable, customizable']
    }
  ];

  const values = [
    { icon: '❤️', title: 'Innovation', desc: "Continuously pushing the boundaries of what's possible with AI technology." },
    { icon: '🛡️', title: 'Trust', desc: 'Building secure, reliable, and transparent AI solutions you can depend on.' },
    { icon: '⚡', title: 'Excellence', desc: 'Delivering exceptional experiences that exceed expectations every time.' }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Hero animations
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSubtitle = new SplitText('.hero-subtitle', { type: 'words' });

      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90 });
      gsap.set(heroSubtitle.words, { y: 40, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });
      gsap.set('.hero-badge', { scale: 0, opacity: 0 });

      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      heroTl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.4')
        .to(heroSubtitle.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03 }, '-=0.4')
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(1.7)' }, '-=0.3');

      // Recognition card - special golden animation
      gsap.set('.recognition-card', { y: 80, opacity: 0, scale: 0.95 });
      ScrollTrigger.create({
        trigger: '.recognition-card',
        start: 'top 85%',
        onEnter: () => {
          gsap.to('.recognition-card', { 
            y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out',
            onComplete: () => {
              gsap.to('.recognition-icon', { 
                scale: 1.2,
                duration: 0.3, 
                ease: 'power2.inOut',
                repeat: 3,
                yoyo: true
              });
            }
          });
        }
      });

      // Initiative section
      gsap.set('.initiative-card', { y: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.initiative-card',
        start: 'top 85%',
        onEnter: () => {
          gsap.to('.initiative-card', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
        }
      });

      // Mission/Why cards
      gsap.utils.toArray<HTMLElement>('.info-card').forEach((card, i) => {
        gsap.set(card, { y: 80, opacity: 0, scale: 0.95 });
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(card, { y: 0, opacity: 1, scale: 1, duration: 0.7, delay: i * 0.1, ease: 'power3.out' });
            // Stagger points
            gsap.to(card.querySelectorAll('.point-item'), { 
              y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.3 + i * 0.1, ease: 'power3.out'
            });
          }
        });
        gsap.set(card.querySelectorAll('.point-item'), { y: 30, opacity: 0 });
      });

      // Royal AI section - scramble text
      gsap.set('.royal-section', { y: 80, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.royal-section',
        start: 'top 80%',
        onEnter: () => {
          gsap.to('.royal-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
          gsap.to('.royal-title', { 
            duration: 1.5, 
            scrambleText: { text: 'The Road Ahead: Royal AI™', chars: 'ROYALAI', speed: 0.6 },
            delay: 0.4
          });
        }
      });

      // Platform cards
      gsap.utils.toArray<HTMLElement>('.platform-card').forEach((card, i) => {
        gsap.set(card, { x: i % 2 === 0 ? -80 : 80, opacity: 0 });
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(card, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
          }
        });
      });

      // Vision, Manifesto, Acknowledgments sections
      gsap.utils.toArray<HTMLElement>('.content-section').forEach((section, i) => {
        gsap.set(section, { y: 60, opacity: 0 });
        ScrollTrigger.create({
          trigger: section,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(section, { y: 0, opacity: 1, duration: 0.7, delay: i * 0.05, ease: 'power3.out' });
          }
        });
      });

      // Values section
      gsap.set('.values-section', { y: 80, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.values-section',
        start: 'top 80%',
        onEnter: () => {
          gsap.to('.values-section', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
          gsap.to('.value-card', { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.15, delay: 0.3, ease: 'back.out(1.7)' });
        }
      });
      gsap.set('.value-card', { y: 50, opacity: 0, scale: 0.9 });

      // Background animations
      gsap.to('.nebula-orb', { x: 'random(-120, 120)', y: 'random(-80, 80)', scale: 'random(0.6, 1.4)', opacity: 'random(0.03, 0.08)', duration: 12, ease: 'sine.inOut', stagger: { each: 2, repeat: -1, yoyo: true } });
      gsap.utils.toArray<HTMLElement>('.stardust').forEach((p, i) => {
        gsap.to(p, { y: '-=200', x: 'random(-60, 60)', opacity: 0, duration: 4 + Math.random() * 6, repeat: -1, delay: i * 0.3, ease: 'power1.out', onRepeat() { gsap.set(p, { y: '+=200', opacity: 0.6 }); } });
      });
      gsap.to('.scan-line', { y: '100vh', duration: 8, repeat: -1, ease: 'none' });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Hover effects
  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -8 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    const glow = card.querySelector('.card-glow');
    if (glow) gsap.to(glow, { opacity: entering ? 1 : 0, duration: 0.3 });
  };

  const handleValueHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -10 : 0, scale: entering ? 1.05 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.value-icon'), { scale: entering ? 1.4 : 1, rotate: entering ? 20 : 0, duration: 0.4, ease: 'back.out(2)' });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* ═══ DEEP DARK BACKGROUND LAYER ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="nebula-orb absolute top-[10%] left-[15%] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }} />
        <div className="nebula-orb absolute bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" style={{ top: '-2px' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="stardust absolute rounded-full" style={{ left: `${3 + i * 4.8}%`, top: `${60 + (i % 5) * 10}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, background: i % 3 === 0 ? 'rgba(6,182,212,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(236,72,153,0.5)', opacity: 0.6 }} />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden z-10">

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto py-20">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 mb-6">
            <span className="text-4xl">👥</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>About Sanbay Fusion</span>
          </h1>
          <p className="hero-subtitle text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6">
            Transforming businesses with emotionally intelligent, human-centric AI agents
          </p>
          <div className="flex justify-center gap-3">
            <span className="hero-badge px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-mono">AI_DIGITAL_FRIEND</span>
            <span className="hero-badge px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-mono">GRAND_PA_UNITED™</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030304] to-transparent" />
      </section>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Special Recognition */}
        <div className="recognition-card relative mb-16 p-8 md:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-amber-500 to-orange-500 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5" />
          
          <div className="relative flex flex-col md:flex-row items-start gap-6">
            <div className="recognition-icon w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
              <span className="text-3xl">🙏</span>
            </div>
            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-4">SPECIAL_RECOGNITION</span>
              <h3 className="text-2xl font-bold text-amber-200 mb-4">Special Recognition</h3>
              <p className="text-lg text-amber-100/90 mb-4">
                We extend our heartfelt gratitude to <span className="font-bold text-amber-300">Miss Chuttra Dilokkanwong (TH)</span>, Owner &amp; Founder, for her exceptional and invaluable contributions to Sanbay Fusion.
              </p>
              <ul className="space-y-3 text-amber-100/80">
                {['Significant improvements to our core services and platform architecture', 
                  'Development and provision of essential tools that accelerate innovation',
                  'Financial support that enabled critical growth and expansion',
                  'Unwavering overall support across all aspects of our mission'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-amber-200 font-semibold mt-6 pt-4 border-t border-amber-500/30">
                Miss Chuttra Dilokkanwong&apos;s vision, generosity, and commitment to excellence have been instrumental in bringing Sanbay Fusion to life.
              </p>
            </div>
          </div>
        </div>

        {/* The Initiative */}
        <div className="initiative-card relative mb-12 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 hover:opacity-40 transition-opacity duration-500" />
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-4">THE_INITIATIVE</span>
          <h3 className="text-2xl font-bold text-white mb-4">AI Digital Friend</h3>
          <p className="text-gray-300 mb-4 leading-relaxed">
            <span className="font-semibold text-cyan-300">AI Digital Friend</span> is a product of <span className="font-semibold text-purple-300">Grand Pa United™</span>, a global alliance of innovators from the UAE, UK, and USA, united by a shared mission: to build emotionally intelligent, human-centric AI systems that redefine digital companionship.
          </p>
          <p className="text-gray-400 mb-4 leading-relaxed">
            This initiative is led by the visionary ownership of <span className="font-semibold text-amber-300">Miss Chuttra Dilokkanwong (TH)</span> and managed by <span className="font-semibold text-cyan-300">Shahbaz Chaudhary (TH)</span>, whose commitment to innovation, community empowerment, and ethical technology has shaped the foundation of the platform.
          </p>
          <p className="text-gray-400 leading-relaxed">
            The focus is not just on tools, but on creating intelligent allies designed to support, understand, and evolve with users across cultures and contexts.
          </p>
        </div>

        {/* Mission & Why Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="info-card group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]"
               onMouseEnter={(e) => handleCardHover(e, true)}
               onMouseLeave={(e) => handleCardHover(e, false)}>
            <div className="card-glow absolute inset-0 bg-purple-500/10 opacity-0" />
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Our Mission</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                To develop modular, adaptive, and emotionally aware AI agents that enhance human life through intuitive interaction.
              </p>
              <div className="space-y-4">
                {missionPoints.map((p, i) => (
                  <div key={i} className="point-item flex gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <span className="font-semibold text-white">{p.title}</span>
                      <p className="text-sm text-gray-500">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="info-card group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]"
               onMouseEnter={(e) => handleCardHover(e, true)}
               onMouseLeave={(e) => handleCardHover(e, false)}>
            <div className="card-glow absolute inset-0 bg-green-500/10 opacity-0" />
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Why AI Digital Friend?</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                In a world full of automation, the future belongs to human-aware AI — systems that understand context, emotion, and intent.
              </p>
              <div className="space-y-4">
                {whyPoints.map((p, i) => (
                  <div key={i} className="point-item flex gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <span className="font-semibold text-white">{p.title}</span>
                      <p className="text-sm text-gray-500">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Royal AI Section */}
        <div className="royal-section relative mb-12 p-8 md:p-10 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.15'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2.5L25 18l-5 2.5z'/%3E%3C/g%3E%3C/svg%3E\")"
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="royal-title text-2xl md:text-3xl font-bold text-white">The Road Ahead: Royal AI™</h3>
            </div>
            <p className="text-lg text-white/90 mb-8">
              Long-term vision: Royal AI™, a next-generation ecosystem to push the boundaries of AI–human collaboration.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {platforms.map((platform, i) => (
                <div key={i} className={`platform-card bg-white/15 rounded-xl p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${platform.gradient} rounded-xl flex items-center justify-center`}>
                      <span className="text-lg">{platform.icon}</span>
                    </div>
                    <h4 className="text-xl font-bold text-white">{platform.name}</h4>
                  </div>
                  <p className="text-white/80 text-sm mb-4">{platform.desc}</p>
                  <ul className="space-y-2 text-sm text-white/70">
                    {platform.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full bg-gradient-to-r ${platform.gradient}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vision */}
        <div className="content-section group relative mb-8 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🌍</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Our Vision</h3>
          </div>
          <p className="text-lg text-gray-300 mb-4 leading-relaxed">
            A future where AI and humanity co-create solutions, govern systems, and elevate global well-being.
          </p>
          <p className="text-gray-400 leading-relaxed">
            AI Digital Friend will be a trusted ally as AI becomes part of daily life. One day, AI could play a role in governance, education, and diplomacy — and this platform is preparing that infrastructure now.
          </p>
        </div>

        {/* Public Manifesto */}
        <div className="content-section group relative mb-8 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-pink-500 to-rose-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">❤️</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Public Manifesto</h3>
          </div>
          <p className="text-gray-300 mb-6 font-semibold">This is built for the public — the real stakeholders.</p>
          <ul className="space-y-3 mb-6">
            {['Every learner cracking their first exploit', 'Every creator launching with an AI co-pilot', 'Every dreamer who sees tech as a story, not just a tool'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-300">
                <span className="text-pink-400 font-bold text-lg">→</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="bg-pink-500/10 rounded-xl p-6 border border-pink-500/20">
            <p className="text-gray-300 font-semibold mb-3">Our Belief:</p>
            <ul className="space-y-2">
              {['Platforms should feel personal', 'Agents should feel alive', 'Every launch should feel cinematic'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-400">
                  <span className="text-pink-400">◆</span>
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white font-bold mt-6 text-lg">
            Royal AI™: Every limitation becomes a legend. Every user becomes a collaborator.
          </p>
        </div>

        {/* Acknowledgments */}
        <div className="content-section group relative mb-12 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-amber-500 to-yellow-500 opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏆</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Acknowledgments</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Special thanks to <span className="font-semibold text-amber-300">Professor Johnny Benz (UK)</span>, whose technical brilliance, creative direction, and strategic insight shaped the platform&apos;s security, architecture, branding, and strategy.
          </p>
          <p className="text-gray-500 mt-4 italic">
            His work embodies guerrilla-grade innovation — turning constraints into creativity, and ideas into impact.
          </p>
        </div>

        {/* Core Values */}
        <section className="values-section relative p-10 rounded-3xl overflow-hidden mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.1'%3E%3Cpath d='M36 34h-2v-4h2v4zm0-8h-2v-4h2v4zm-8 8h-2v-4h2v4zm0-8h-2v-4h2v4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
          }} />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
              <span className="text-3xl">⭐</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {values.map((v, i) => (
                <div 
                  key={i} 
                  className="value-card text-center p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 cursor-pointer"
                  onMouseEnter={(e) => handleValueHover(e, true)}
                  onMouseLeave={(e) => handleValueHover(e, false)}
                >
                  <div className="value-icon text-4xl mb-4 inline-block">{v.icon}</div>
                  <h3 className="text-xl font-bold mb-3 text-white">{v.title}</h3>
                  <p className="text-white/80">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join Team CTA */}
        <div className="content-section text-center p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.1] hover:bg-white/[0.04]">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">👥</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Join Our Growing Team</h2>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            We're hiring talented people who share our passion for AI innovation and human-centric technology.
          </p>
          <Link 
            href="/resources/careers" 
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105"
          >
            View Careers →
          </Link>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
