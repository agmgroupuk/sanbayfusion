'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DiscordPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);

  const benefits = [
    { icon: '💡', title: 'Share Ideas', desc: 'Discuss new features, improvements, and innovative use cases with the community' },
    { icon: '❓', title: 'Get Help', desc: 'Connect with experts, get quick answers, and learn from experienced community members' },
    { icon: '🎉', title: 'Events & Updates', desc: 'Participate in live events, competitions, and stay updated with latest platform news' }
  ];

  const reasons = [
    { icon: '⚡', title: 'Real-Time Support', desc: 'Get instant help from community members and the Sanbay Fusion team', color: 'from-purple-500 to-purple-600' },
    { icon: '👥', title: 'Network & Collaborate', desc: 'Build connections with fellow developers and AI enthusiasts', color: 'from-indigo-500 to-indigo-600' },
    { icon: '📈', title: 'Learn & Grow', desc: 'Access tutorials, case studies, and best practices shared by experts', color: 'from-pink-500 to-pink-600' },
    { icon: '🏆', title: 'Exclusive Opportunities', desc: 'Get early access to features, special events, and recognition programs', color: 'from-green-500 to-green-600' },
    { icon: '🔥', title: 'Active Channels', desc: 'Dedicated channels for different topics, agent types, and use cases', color: 'from-amber-500 to-orange-500' }
  ];

  const stats = [
    { value: '10K+', label: 'Active Members', color: 'purple' },
    { value: '50+', label: 'Active Channels', color: 'indigo' },
    { value: '1K+', label: 'Daily Messages', color: 'pink' },
    { value: '24/7', label: 'Community Support', color: 'green' }
  ];

  const guidelines = {
    dos: ['Be respectful and inclusive to all members', 'Share knowledge and help others learn', 'Keep conversations relevant and focused', 'Use threads for extended discussions'],
    donts: ['No spam, self-promotion, or harassment', 'No sharing of pirated or illegal content', 'No discussing inappropriate topics', 'No impersonating team members']
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 120, opacity: 0, rotateX: -90, scale: 0.8 });
      gsap.set(heroSub.words, { y: 50, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -540 });
      gsap.set('.discord-cta', { y: 50, opacity: 0, scale: 0.9 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 1.5, ease: 'elastic.out(1, 0.4)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.8, stagger: 0.015 }, '-=1')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.5')
        .to('.discord-cta', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.3');

      // 2. ScrambleText on stats
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(el, {
              duration: 2,
              scrambleText: { text: el.dataset.value || el.innerText, chars: '0123456789+K/', speed: 0.4 },
            });
          },
          once: true
        });
      });

      // 3. ScrollTrigger for benefit cards with stagger
      gsap.set('.benefit-card', { y: 80, opacity: 0, rotateY: -25 });
      ScrollTrigger.batch('.benefit-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateY: 0, duration: 0.7, stagger: 0.15, ease: 'back.out(1.5)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 80, opacity: 0, rotateY: -25, duration: 0.3 })
      });

      // 4. Flip animation for reason cards
      gsap.set('.reason-card', { opacity: 0, x: -60, scale: 0.9 });
      ScrollTrigger.batch('.reason-card', {
        start: 'top 80%',
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, x: 0, scale: 1 });
            Flip.from(state, { duration: 0.5, delay: i * 0.08, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.2, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.1, x: scrollY * -0.05, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for decorative orbit
      gsap.to('.orbit-particle', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -25 }, { x: 120, y: 0 }, { x: 60, y: 25 }, { x: 0, y: 0 }],
          curviness: 1.8,
        },
        duration: 7,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on Discord button
      const discordBtn = document.querySelector('.discord-btn');
      if (discordBtn) {
        discordBtn.addEventListener('mouseenter', () => {
          gsap.to(discordBtn, { rotation: 5, duration: 0.5, ease: 'discordWiggle' });
          gsap.to('.discord-icon', { scale: 1.2, duration: 0.3 });
        });
        discordBtn.addEventListener('mouseleave', () => {
          gsap.to(discordBtn, { rotation: 0, duration: 0.3 });
          gsap.to('.discord-icon', { scale: 1, duration: 0.3 });
        });
      }

      // 8. DrawSVG for connection lines
      gsap.set('.connect-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.guidelines-section',
        start: 'top 75%',
        onEnter: () => gsap.to('.connect-line', { drawSVG: '100%', duration: 1.2, stagger: 0.2, ease: 'power2.inOut' })
      });

      // 9. Stat cards entrance
      gsap.set('.stat-card', { y: 60, opacity: 0, scale: 0.85 });
      ScrollTrigger.batch('.stat-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.4)' })
      });

      // 10. Floating particles with random physics-like motion
      gsap.utils.toArray<HTMLElement>('.float-dot').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-70, 70)`,
          y: `random(-50, 50)`,
          rotation: `random(-180, 180)`,
          scale: `random(0.8, 1.3)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

      // 11. Guidelines cards animation
      gsap.set('.guideline-box', { y: 40, opacity: 0 });
      ScrollTrigger.batch('.guideline-box', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power3.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -6 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.card-glow'), { opacity: entering ? 0.15 : 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-1/2 right-1/5 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {[...Array(12)].map((_, i) => (
          <div key={i} className="float-dot absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${8 + i * 7}%`, top: `${12 + (i % 4) * 20}%` }} />
        ))}
        <div className="orbit-particle absolute top-40 left-1/3 w-2 h-2 bg-purple-400/40 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-3xl border border-cyan-500/30 mb-8 shadow-2xl shadow-cyan-500/20">
            <span className="text-5xl">💬</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Join Our Discord</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-500 mb-4">Connect with the Sanbay Fusion community</p>
          <p className="text-gray-600 text-lg mb-10">10,000+ members sharing knowledge and building together</p>

          {/* Main CTA */}
          <div className="discord-cta relative inline-block">
            <a
              href="https://discord.gg/EXH6w9CH"
              target="_blank"
              rel="noopener noreferrer"
              className="discord-btn inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-2xl font-bold text-lg shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
            >
              <span className="discord-icon text-2xl">💜</span>
              Join Discord Community
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section ref={benefitsRef} className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b, idx) => (
              <div
                key={idx}
                className="benefit-card relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
              >
                <div className="card-glow absolute inset-0 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl opacity-0" />
                <div className="relative z-10">
                  <span className="text-5xl mb-4 block">{b.icon}</span>
                  <h3 className="text-xl font-bold text-white mb-3">{b.title}</h3>
                  <p className="text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl mb-4 shadow-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why Join Our Discord?</h2>
          </div>

          <div className="space-y-4">
            {reasons.map((r, idx) => (
              <div
                key={idx}
                className="reason-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex gap-5 group hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
              >
                <div className="card-glow absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-2xl opacity-0" />
                <div className={`relative z-10 w-14 h-14 bg-gradient-to-br ${r.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="text-2xl">{r.icon}</span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1">{r.title}</h3>
                  <p className="text-gray-500">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Community Stats</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, idx) => (
              <div key={idx} className="stat-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
                <div className="stat-value text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent" data-value={s.value}>
                  {s.value}
                </div>
                <p className="text-gray-500 text-sm mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guidelines Section */}
      <section className="guidelines-section relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Community Guidelines</h2>
          </div>

          {/* SVG Decorative Lines */}
          <svg className="absolute left-1/2 top-0 h-full w-1 opacity-20" style={{ transform: 'translateX(-50%)' }}>
            <line className="connect-line" x1="0" y1="0" x2="0" y2="100%" stroke="url(#vLineGradient)" strokeWidth="2" />
            <defs>
              <linearGradient id="vLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Do's */}
            <div className="guideline-box relative p-8 rounded-2xl bg-white/[0.02] border border-green-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-green-400 mb-5 flex items-center gap-3">
                <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">✓</span>
                Do's
              </h3>
              <ul className="space-y-3">
                {guidelines.dos.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-gray-300">
                    <span className="text-green-400 font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="guideline-box relative p-8 rounded-2xl bg-white/[0.02] border border-red-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-red-400 mb-5 flex items-center gap-3">
                <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">✗</span>
                Don'ts
              </h3>
              <ul className="space-y-3">
                {guidelines.donts.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-gray-300">
                    <span className="text-red-400 font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="text-7xl mb-6 block animate-bounce">💜</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                Become part of our amazing community today!
              </p>
              <a
                href="https://discord.gg/EXH6w9CH"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
              >
                Join Discord Now →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
