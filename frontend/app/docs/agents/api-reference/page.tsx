'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsAgentsApiReferencePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const endpoints = [
    { method: 'POST', path: '/agents', description: 'Create a new agent', color: 'green' },
    { method: 'GET', path: '/agents', description: 'List all agents', color: 'blue' },
    { method: 'GET', path: '/agents/:id', description: 'Get agent details', color: 'blue' },
    { method: 'PATCH', path: '/agents/:id', description: 'Update an agent', color: 'yellow' },
    { method: 'DELETE', path: '/agents/:id', description: 'Delete an agent', color: 'red' },
    { method: 'POST', path: '/agents/:id/chat', description: 'Send message to agent', color: 'green' },
    { method: 'GET', path: '/agents/:id/conversations', description: 'List conversations', color: 'blue' },
    { method: 'POST', path: '/agents/:id/knowledge', description: 'Add to knowledge base', color: 'green' }
  ];

  const methodColors: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const codeExamples = {
    create: `curl -X POST https://api.sanbayfusion.com/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Agent",
    "description": "A helpful assistant",
    "personality": "friendly"
  }'`,
    chat: `curl -X POST https://api.sanbayfusion.com/v1/agents/agent_123/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, how can you help me?",
    "stream": true
  }'`,
    list: `curl https://api.sanbayfusion.com/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  };

  const responseExample = `{
  "id": "agent_abc123",
  "name": "My Agent",
  "description": "A helpful assistant",
  "personality": "friendly",
  "created_at": "2024-01-15T10:30:00Z",
  "status": "active",
  "stats": {
    "total_conversations": 1250,
    "avg_response_time": "1.2s"
  }
}`;

  const authInfo = [
    { title: 'API Key', description: 'Use Bearer token authentication in the Authorization header' },
    { title: 'Rate Limiting', description: '1000 requests per minute for standard plans' },
    { title: 'Versioning', description: 'Current version is v1. Include in the URL path' }
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

      // 2. ScrambleText on endpoint paths
      gsap.utils.toArray<HTMLElement>('.endpoint-path').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.6, scrambleText: { text: originalText, chars: '/agenits:_dchk', speed: 0.5 }, delay: i * 0.03 });
          }
        });
      });

      // 3. ScrollTrigger for endpoint cards
      gsap.set('.endpoint-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.endpoint-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.05, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for auth info cards
      gsap.set('.auth-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.auth-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.auth-card').forEach((el, i) => {
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
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'apiRefWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.endpoints-section',
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
      ScrollTrigger.batch('.code-block', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' })
      });

      // 12. Base URL reveal
      gsap.set('.base-url', { scaleX: 0 });
      gsap.to('.base-url', { scaleX: 1, duration: 0.8, delay: 0.5, ease: 'power2.out', transformOrigin: 'left' });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-rose-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-pink-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(244, 63, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 63, 94, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-rose-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-pink-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-rose-500/30 mb-6">
            <span className="text-xl">📡</span>
            <span className="font-medium">REST API</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>API Reference</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Complete reference for the Agents API with examples and response formats
          </p>
          <div className="base-url inline-block px-6 py-3 bg-white/[0.02] rounded-xl border border-white/[0.06] mb-6">
            <code className="text-rose-400 font-mono">https://api.sanbayfusion.com/v1</code>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#endpoints" className="action-btn px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all">
              View Endpoints
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Authentication Info */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Authentication</h2>
          <div className="auth-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            {authInfo.map((info, idx) => (
              <div key={idx} className="auth-card relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                <h3 className="text-sm font-bold text-rose-400 mb-2">{info.title}</h3>
                <p className="text-gray-400 text-sm">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="endpoints-section relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#apiRefGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="apiRefGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Endpoints</h2>
          <div className="space-y-3">
            {endpoints.map((endpoint, idx) => (
              <div key={idx} className="endpoint-card draggable-card group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-rose-500/50 transition-colors">
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${methodColors[endpoint.color]}`}>
                  {endpoint.method}
                </span>
                <code className="endpoint-path text-gray-300 font-mono flex-grow">{endpoint.path}</code>
                <span className="text-gray-400 text-sm hidden md:block">{endpoint.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Examples</h2>
          
          <div className="space-y-6">
            {/* Create Agent */}
            <div className="code-block relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-rose-400">Create Agent</span>
                <button onClick={() => handleCopy(codeExamples.create, 'create')} className="action-btn text-xs px-3 py-1 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors">
                  {copiedEndpoint === 'create' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-white/[0.03] p-4 rounded-lg overflow-x-auto">
                <code className="text-gray-300 font-mono text-sm whitespace-pre">{codeExamples.create}</code>
              </pre>
            </div>

            {/* Send Message */}
            <div className="code-block relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-rose-400">Chat with Agent</span>
                <button onClick={() => handleCopy(codeExamples.chat, 'chat')} className="action-btn text-xs px-3 py-1 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors">
                  {copiedEndpoint === 'chat' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-white/[0.03] p-4 rounded-lg overflow-x-auto">
                <code className="text-gray-300 font-mono text-sm whitespace-pre">{codeExamples.chat}</code>
              </pre>
            </div>

            {/* Response Example */}
            <div className="code-block relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-green-400">Response Example</span>
              </div>
              <pre className="bg-white/[0.03] p-4 rounded-lg overflow-x-auto">
                <code className="text-gray-300 font-mono text-sm whitespace-pre">{responseExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-rose-900/30 to-pink-900/30 border border-rose-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Need SDK Integration?</h2>
              <p className="text-gray-400 mb-6">Check out our official SDKs for easier integration in your preferred language.</p>
              <Link href="/docs/sdks" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all">
                📦 View SDKs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
