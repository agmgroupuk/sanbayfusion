'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsIntegrationsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const integrations = [
    { title: 'Slack Integration', description: 'Connect your agents to Slack and respond to messages directly', category: 'Communication', href: '#slack', icon: '💬' },
    { title: 'Discord Integration', description: 'Build Discord bots powered by your AI agents', category: 'Gaming & Community', href: '#discord', icon: '🎮' },
    { title: 'Teams Integration', description: 'Deploy agents to Microsoft Teams for enterprise collaboration', category: 'Enterprise', href: '#teams', icon: '💼' },
    { title: 'Webhooks', description: 'Send real-time data and trigger actions with webhooks', category: 'Integration', href: '#webhooks', icon: '🔗' },
    { title: 'Email Integration', description: 'Connect your agents to handle incoming emails automatically', category: 'Communication', href: '#email', icon: '📧' },
    { title: 'Custom APIs', description: 'Build custom integrations with any third-party service', category: 'Advanced', href: '#custom', icon: '⚙️' }
  ];

  const overviewCards = [
    { icon: '🚀', title: 'Easy Setup', desc: 'Most integrations can be set up in minutes with step-by-step guides' },
    { icon: '🔄', title: 'Real-time Sync', desc: 'Keep your data synchronized across all platforms instantly' },
    { icon: '🛡️', title: 'Secure', desc: 'Enterprise-grade security with encrypted credentials and tokens' }
  ];

  const slackFeatures = [
    'Respond to channel messages automatically',
    'Handle direct messages from team members',
    'Create slash commands for quick agent access',
    'Thread conversations for organized discussions',
    'Use rich formatting and reactions'
  ];

  const discordFeatures = [
    'Build powerful Discord bots with AI capabilities',
    'Handle commands with custom prefixes',
    'Support for voice channel features',
    'Role-based access control',
    'Multi-server deployment'
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.02 }, '-=0.3')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on integration titles
      gsap.utils.toArray<HTMLElement>('.integration-title').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for integration cards
      gsap.set('.integration-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.integration-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for overview cards
      gsap.set('.overview-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.overview-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.overview-card').forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -25 }, { x: 100, y: 0 }, { x: 50, y: 25 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on action buttons
      gsap.utils.toArray<HTMLElement>('.action-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'integrationsWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.integrations-section',
        start: 'top 80%',
        onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' })
      });

      // 9. Draggable cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-card', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-40, 40)`,
          rotation: `random(-90, 90)`,
          duration: `random(5, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Featured integration sections reveal
      gsap.set('.featured-section', { y: 40, opacity: 0 });
      ScrollTrigger.batch('.featured-section', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out' })
      });

      // 12. Feature list items stagger
      gsap.set('.feature-item', { x: -20, opacity: 0 });
      ScrollTrigger.batch('.feature-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-green-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-emerald-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-full border border-green-500/30 mb-6">
            <span className="text-xl">🔗</span>
            <span className="font-medium">Platform Connections</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Integrations</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Connect your AI agents to the tools and platforms you already use
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#integrations" className="action-btn px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all">
              Get Started
            </a>
            <a href="#available" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              Browse Integrations
            </a>
          </div>
        </div>
      </section>

      {/* Overview Cards */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="overview-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {overviewCards.map((card, idx) => (
              <div key={idx} className="overview-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Integrations */}
      <section id="available" className="integrations-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#integrationsGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="integrationsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration, idx) => (
              <a key={idx} href={integration.href} className="integration-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-green-500/50 transition-colors block">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-green-500/30 rounded-tr-lg" />
                <div className="text-3xl mb-4">{integration.icon}</div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 mb-4 inline-block">
                  {integration.category}
                </span>
                <h3 className="integration-title text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">{integration.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{integration.description}</p>
                <span className="text-green-400 text-sm font-medium">Learn more →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured: Slack */}
      <section id="slack" className="featured-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-green-500/30 rounded-tr-lg" />
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl">💬</div>
              <div>
                <h3 className="text-2xl font-bold text-white">Slack</h3>
                <p className="text-gray-400">Connect agents directly to Slack channels and DMs</p>
              </div>
            </div>
            <ul className="space-y-2 mb-6">
              {slackFeatures.map((feature, idx) => (
                <li key={idx} className="feature-item flex items-center gap-3 text-gray-300">
                  <span className="text-green-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="bg-white/[0.03] p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Example Slash Command:</p>
              <code className="text-green-400 font-mono">/agent ask Help me debug this error in my code</code>
            </div>
          </div>
        </div>
      </section>

      {/* Featured: Discord */}
      <section id="discord" className="featured-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-purple-500/30 rounded-tr-lg" />
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl">🎮</div>
              <div>
                <h3 className="text-2xl font-bold text-white">Discord</h3>
                <p className="text-gray-400">Deploy AI agents as Discord bots for your community</p>
              </div>
            </div>
            <ul className="space-y-2 mb-6">
              {discordFeatures.map((feature, idx) => (
                <li key={idx} className="feature-item flex items-center gap-3 text-gray-300">
                  <span className="text-purple-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/docs/agents" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
              View Discord Setup Guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need a Custom Integration?</h2>
              <p className="text-gray-400 mb-6">Our API supports building custom integrations with any third-party service.</p>
              <Link href="/docs/api" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all">
                📚 View API Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
