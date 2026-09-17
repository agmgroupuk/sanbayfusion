'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsAgentsConfigurationPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const configSections = [
    { title: 'Basic Settings', description: 'Agent name, description, and avatar configuration', icon: '📝', items: ['Agent Name', 'Description', 'Avatar Image', 'Public/Private Toggle'] },
    { title: 'Personality', description: 'Define how your agent communicates and responds', icon: '🎭', items: ['Tone of Voice', 'Response Length', 'Formality Level', 'Emoji Usage'] },
    { title: 'Knowledge Base', description: 'Add custom data for your agent to reference', icon: '📚', items: ['File Uploads', 'URL Imports', 'Manual Entries', 'Sync Settings'] },
    { title: 'Tools & Actions', description: 'Enable capabilities for external integrations', icon: '🔧', items: ['API Connections', 'Webhooks', 'Custom Functions', 'Rate Limits'] },
    { title: 'Security', description: 'Access controls and authentication settings', icon: '🔒', items: ['API Keys', 'Rate Limiting', 'IP Allowlist', 'Encryption'] },
    { title: 'Analytics', description: 'Tracking and monitoring configuration', icon: '📊', items: ['Conversation Logs', 'Performance Metrics', 'User Tracking', 'Alerts'] }
  ];

  const codeExample = `{
  "name": "Customer Support Agent",
  "description": "Helpful assistant for customer inquiries",
  "personality": {
    "tone": "friendly",
    "formality": "professional",
    "responseLength": "concise"
  },
  "knowledge": {
    "sources": ["docs", "faq", "products"],
    "updateFrequency": "daily"
  },
  "tools": {
    "ticketCreation": true,
    "orderLookup": true,
    "liveChatHandoff": true
  }
}`;

  const advancedOptions = [
    { title: 'Custom Prompts', description: 'Override default system prompts with your own', icon: '✏️' },
    { title: 'Model Selection', description: 'Choose between different AI models for your agent', icon: '🧠' },
    { title: 'Context Window', description: 'Configure how much conversation history to retain', icon: '📜' },
    { title: 'Temperature', description: 'Adjust creativity vs consistency in responses', icon: '🌡️' }
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

      // 2. ScrambleText on section titles
      gsap.utils.toArray<HTMLElement>('.config-title').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for config cards
      gsap.set('.config-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.config-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for advanced option cards
      gsap.set('.advanced-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.advanced-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.advanced-card').forEach((el, i) => {
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
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'configWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.config-section',
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

      // 11. Code block animation
      gsap.set('.code-block', { y: 30, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.code-section',
        start: 'top 85%',
        onEnter: () => gsap.to('.code-block', { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' })
      });

      // 12. Config items stagger
      gsap.set('.config-item', { x: -10, opacity: 0 });
      ScrollTrigger.batch('.config-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-orange-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-amber-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-orange-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-full border border-amber-500/30 mb-6">
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Agent Settings</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Configuration</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Fine-tune every aspect of your AI agent to match your exact requirements
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#settings" className="action-btn px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all">
              View Settings
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Config Sections */}
      <section id="settings" className="config-section relative z-10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#configGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="configGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Configuration Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configSections.map((section, idx) => (
              <div key={idx} className="config-card draggable-card group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-amber-500/50 transition-colors">
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-500/30 rounded-tr-lg" />
                <div className="text-3xl mb-3">{section.icon}</div>
                <h3 className="config-title text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">{section.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{section.description}</p>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="config-item text-gray-500 text-sm flex items-center gap-2">
                      <span className="text-amber-400 text-xs">▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="code-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">Example Configuration</h2>
          <div className="code-block relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-white/[0.04] px-2 py-1 rounded">JSON</span>
              <button onClick={handleCopy} className="action-btn text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
                Copy
              </button>
            </div>
            <pre className="bg-white/[0.03] p-4 rounded-lg overflow-x-auto mt-6">
              <code className="text-gray-300 font-mono text-sm whitespace-pre">{codeExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Advanced Options */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Advanced Options</h2>
          <div className="advanced-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {advancedOptions.map((option, idx) => (
              <div key={idx} className="advanced-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center hover:border-amber-500/50 transition-colors">
                <div className="text-3xl mb-3">{option.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1">{option.title}</h3>
                <p className="text-gray-400 text-xs">{option.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need More Customization?</h2>
              <p className="text-gray-400 mb-6">Check out our API reference for programmatic configuration options.</p>
              <Link href="/docs/agents/api-reference" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                📚 View API Reference
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
