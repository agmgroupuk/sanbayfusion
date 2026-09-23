'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function ContributingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [likedContributions, setLikedContributions] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    const newLiked = new Set(likedContributions);
    if (newLiked.has(id)) { newLiked.delete(id); } else { newLiked.add(id); }
    setLikedContributions(newLiked);
  };

  const stats = [
    { value: '15K+', label: 'Active Contributors' },
    { value: '2.5K+', label: 'Discussions' },
    { value: '5.2K+', label: 'Posts This Month' },
    { value: '89%', label: 'Community Satisfaction' }
  ];

  const contributionTypes = [
    { id: 'ideas', title: '💡 Share Ideas & Feedback', description: 'Have suggestions for new features or improvements? Share your ideas.', details: ['Propose new agent features', 'Suggest platform improvements', 'Vote on community ideas', 'Discuss feasibility and impact'], impact: 'High', color: 'from-amber-500 to-orange-500' },
    { id: 'help', title: '🤝 Help Other Members', description: 'Answer questions and help fellow users in the community.', details: ['Share solutions to problems', 'Provide tips and workarounds', 'Share your best practices', 'Mentor newer members'], impact: 'High', color: 'from-green-500 to-emerald-500' },
    { id: 'success', title: '🎯 Share Success Stories', description: 'Post about your successful agent implementations and use cases.', details: ['Share project outcomes', 'Discuss integration experiences', 'Showcase innovative apps', 'Inspire other members'], impact: 'Medium', color: 'from-blue-500 to-cyan-500' },
    { id: 'engage', title: '💬 Engage in Discussions', description: 'Participate in discussions about AI, agents, and technology trends.', details: ['Share industry insights', 'Discuss emerging technologies', 'Network with members', 'Knowledge sharing'], impact: 'Medium', color: 'from-purple-500 to-pink-500' },
    { id: 'create', title: '✍️ Create Content', description: 'Write guides, tutorials, or case studies based on your experience.', details: ['Write how-to guides', 'Document best practices', 'Create case studies', 'Share learnings'], impact: 'Very High', color: 'from-pink-500 to-rose-500' },
    { id: 'report', title: '🐛 Report Issues & Bugs', description: 'Help improve the platform by reporting bugs and technical issues.', details: ['Document bugs clearly', 'Provide reproduction steps', 'Suggest improvements', 'Help troubleshooting'], impact: 'High', color: 'from-red-500 to-orange-500' }
  ];

  const recognitionLevels = [
    { level: 'Bronze', icon: '🥉', requirement: '10+ contributions', perks: ['Community badge', 'Discord role'] },
    { level: 'Silver', icon: '🥈', requirement: '50+ contributions', perks: ['Featured profile', 'Early access'] },
    { level: 'Gold', icon: '🥇', requirement: '100+ contributions', perks: ['Direct team access', 'Special events'] },
    { level: 'Diamond', icon: '💎', requirement: '500+ contributions', perks: ['Advisory board', 'Exclusive swag'] }
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90, scale: 0.9 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -360 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 1.3, ease: 'elastic.out(1, 0.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.7, stagger: 0.015 }, '-=0.9')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4');

      // 2. ScrambleText on stats
      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(el, {
              duration: 1.5,
              scrambleText: { text: el.dataset.value || el.innerText, chars: '0123456789+%K.', speed: 0.5 },
            });
          },
          once: true
        });
      });

      // 3. ScrollTrigger for stat cards
      gsap.set('.stat-card', { y: 60, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.stat-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.5)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 60, opacity: 0, scale: 0.9, duration: 0.3 })
      });

      // 4. Flip animation for contribution cards
      gsap.set('.contrib-card', { opacity: 0, y: 80, rotateY: -20 });
      ScrollTrigger.batch('.contrib-card', {
        start: 'top 80%',
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0, rotateY: 0 });
            Flip.from(state, { duration: 0.6, delay: i * 0.08, ease: 'power2.out' });
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
          gsap.to('.parallax-orb-2', { y: scrollY * -0.18, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.12, x: scrollY * 0.05, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -30 }, { x: 100, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 9,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on like buttons
      gsap.utils.toArray<HTMLElement>('.like-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          gsap.to(btn, { scale: 1.3, rotation: 15, duration: 0.3, ease: 'contribWiggle' });
          gsap.to(btn, { scale: 1, rotation: 0, duration: 0.3, delay: 0.3 });
        });
      });

      // 8. DrawSVG for timeline connector
      gsap.set('.timeline-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.recognition-section',
        start: 'top 70%',
        onEnter: () => gsap.to('.timeline-line', { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' })
      });

      // 9. Recognition cards stagger
      gsap.set('.recognition-card', { y: 50, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.recognition-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)' })
      });

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-60, 60)`,
          y: `random(-50, 50)`,
          rotation: `random(-120, 120)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

      // 11. Impact badges pulse animation
      gsap.utils.toArray<HTMLElement>('.impact-badge').forEach((badge, i) => {
        gsap.to(badge, {
          scale: 1.1,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -8 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.card-glow'), { opacity: entering ? 0.15 : 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-1/2 right-1/5 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 right-1/3 w-2 h-2 bg-purple-400/40 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-3xl border border-cyan-500/30 mb-8 shadow-2xl shadow-cyan-500/20">
            <span className="text-5xl">❤️</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Contributing to Sanbay Fusion</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-500 mb-4">Help us build a thriving community of AI enthusiasts and innovators</p>
          <p className="text-gray-600 text-lg">Every contribution matters. Help shape the future of Sanbay Fusion.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
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

      {/* Contribution Types */}
      <section ref={cardsContainerRef} className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl mb-4 shadow-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ways to Contribute</h2>
            <p className="text-gray-500 text-lg">Choose how you'd like to contribute to Sanbay Fusion</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {contributionTypes.map((contrib) => (
              <div
                key={contrib.id}
                className="contrib-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm group hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
              >
                <div className={`card-glow absolute inset-0 bg-gradient-to-br ${contrib.color} rounded-2xl opacity-0`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{contrib.title}</h3>
                      <p className="text-gray-500 text-sm">{contrib.description}</p>
                    </div>
                    <button
                      onClick={() => toggleLike(contrib.id)}
                      className={`like-btn text-2xl transition-colors ${likedContributions.has(contrib.id) ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'}`}
                    >
                      {likedContributions.has(contrib.id) ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    {contrib.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-500 text-sm">
                        <span className="text-cyan-400">✓</span>
                        {detail}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <span className={`impact-badge inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r ${contrib.color} rounded-full text-xs font-medium text-white`}>
                      ⚡ Impact: {contrib.impact}
                    </span>
                    <Link href="/community" className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Start Contributing →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="recognition-section relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl mb-4 shadow-lg">
              <span className="text-2xl">🏆</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Recognition Levels</h2>
            <p className="text-gray-500 text-lg">Earn badges and perks as you contribute</p>
          </div>

          {/* SVG Timeline Line */}
          <svg className="absolute left-1/2 h-full w-1 opacity-30 hidden md:block" style={{ transform: 'translateX(-50%)', top: 0 }}>
            <line className="timeline-line" x1="0" y1="0" x2="0" y2="100%" stroke="url(#timelineGrad)" strokeWidth="3" />
            <defs>
              <linearGradient id="timelineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {recognitionLevels.map((level, idx) => (
              <div key={idx} className="recognition-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:border-white/[0.1] hover:bg-white/[0.04] transition-all">
                <span className="text-5xl mb-4 block">{level.icon}</span>
                <h3 className="text-xl font-bold text-white mb-2">{level.level}</h3>
                <p className="text-gray-500 text-sm mb-4">{level.requirement}</p>
                <ul className="space-y-2">
                  {level.perks.map((perk, pIdx) => (
                    <li key={pIdx} className="text-gray-500 text-sm flex items-center justify-center gap-2">
                      <span className="text-cyan-400">•</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="text-6xl mb-6 block">🚀</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Contribute?</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                Start making an impact today. Every contribution helps shape the future of AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/community" className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all">
                  Start Contributing →
                </Link>
                <Link href="/community/discord" className="px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                  Join Discord
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
