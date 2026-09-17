'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function DocsAgentsTroubleshootingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const commonIssues = [
    {
      title: 'Agent Not Responding',
      symptoms: ['Messages timeout', 'No response received', 'Loading indicator stuck'],
      causes: ['API key invalid or expired', 'Rate limit exceeded', 'Agent is paused'],
      solutions: [
        'Verify your API key is correct and active',
        'Check your rate limit status in the dashboard',
        'Ensure the agent is in "active" status',
        'Try refreshing your connection'
      ]
    },
    {
      title: 'Slow Response Times',
      symptoms: ['Responses take > 5 seconds', 'Timeouts on complex queries', 'Inconsistent latency'],
      causes: ['Large context window', 'Complex prompts', 'High traffic periods'],
      solutions: [
        'Reduce conversation history length',
        'Optimize your system prompts',
        'Enable response streaming',
        'Consider upgrading your plan for priority processing'
      ]
    },
    {
      title: 'Incorrect Responses',
      symptoms: ['Off-topic answers', 'Hallucinations', 'Ignoring instructions'],
      causes: ['Vague prompts', 'Conflicting instructions', 'Missing context'],
      solutions: [
        'Review and clarify your system prompt',
        'Add specific examples to your knowledge base',
        'Use temperature setting 0.3-0.5 for factual tasks',
        'Implement validation checks on responses'
      ]
    },
    {
      title: 'Integration Errors',
      symptoms: ['Webhook failures', '4xx/5xx errors', 'Connection refused'],
      causes: ['Invalid endpoint URLs', 'Authentication failures', 'Network issues'],
      solutions: [
        'Verify webhook URLs are publicly accessible',
        'Check authentication headers are correct',
        'Review firewall and CORS settings',
        'Test with our API playground first'
      ]
    },
    {
      title: 'Knowledge Base Issues',
      symptoms: ['Agent doesn\'t use uploaded docs', 'Outdated information', 'Missing context'],
      causes: ['Indexing not complete', 'Document format issues', 'Search threshold too high'],
      solutions: [
        'Wait for indexing to complete (check status)',
        'Convert documents to supported formats (PDF, MD, TXT)',
        'Adjust retrieval sensitivity settings',
        'Manually add key facts to the prompt'
      ]
    },
    {
      title: 'Rate Limit Exceeded',
      symptoms: ['429 errors', 'Requests blocked', 'Quota warnings'],
      causes: ['Too many requests', 'Burst traffic', 'Plan limits reached'],
      solutions: [
        'Implement exponential backoff',
        'Cache frequent queries',
        'Upgrade to a higher tier',
        'Spread requests over time'
      ]
    }
  ];

  const quickFixes = [
    { action: 'Clear Cache', description: 'Reset conversation cache to fix stale data issues' },
    { action: 'Regenerate API Key', description: 'Create a new API key if authentication fails' },
    { action: 'Restart Agent', description: 'Toggle agent off and on to reset state' },
    { action: 'Check Status Page', description: 'View system status for outages' }
  ];

  const errorCodes = [
    { code: '400', meaning: 'Bad Request', fix: 'Check request body format' },
    { code: '401', meaning: 'Unauthorized', fix: 'Verify API key' },
    { code: '403', meaning: 'Forbidden', fix: 'Check permissions' },
    { code: '404', meaning: 'Not Found', fix: 'Verify agent ID' },
    { code: '429', meaning: 'Rate Limited', fix: 'Implement backoff' },
    { code: '500', meaning: 'Server Error', fix: 'Contact support' }
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

      // 2. ScrambleText on issue titles
      gsap.utils.toArray<HTMLElement>('.issue-title').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for issue cards
      gsap.set('.issue-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.issue-card', {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.95, duration: 0.3 })
      });

      // 4. Flip for quick fix cards
      gsap.set('.quickfix-card', { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: '.quickfix-grid',
        start: 'top 80%',
        onEnter: () => {
          gsap.utils.toArray<HTMLElement>('.quickfix-card').forEach((el, i) => {
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
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'troubleshootWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for decorative lines
      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.issues-section',
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

      // 11. Error code cards animation
      gsap.set('.error-card', { y: 20, opacity: 0 });
      ScrollTrigger.batch('.error-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' })
      });

      // 12. Solution items stagger
      gsap.set('.solution-item', { x: -15, opacity: 0 });
      ScrollTrigger.batch('.solution-item', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out' })
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[150px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-yellow-500/15 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.1) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-amber-400/30 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-yellow-400/60 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm rounded-full border border-amber-500/30 mb-6">
            <span className="text-xl">🔧</span>
            <span className="font-medium">Problem Solving</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Troubleshooting</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
            Find solutions to common issues and get your agents back on track
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#issues" className="action-btn px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all">
              View Issues
            </a>
            <Link href="/docs/agents" className="action-btn px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
              ← Back to Agents Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Fixes */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Quick Fixes</h2>
          <div className="quickfix-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickFixes.map((fix, idx) => (
              <button key={idx} className="quickfix-card relative p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center hover:border-amber-500/50 transition-colors">
                <h3 className="text-sm font-bold text-amber-400 mb-1">{fix.action}</h3>
                <p className="text-gray-400 text-xs">{fix.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Common Issues */}
      <section id="issues" className="issues-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* SVG Decorative Line */}
          <svg className="absolute left-1/2 -translate-x-1/2 -top-4 h-1 w-1/3 opacity-30" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#troubleGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="troubleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-3xl font-bold text-center mb-8">Common Issues</h2>
          <div className="space-y-4">
            {commonIssues.map((issue, idx) => (
              <div key={idx} className="issue-card draggable-card relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
                <button onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)} className="w-full flex items-center justify-between p-5 text-left">
                  <h3 className="issue-title text-lg font-bold text-white flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    {issue.title}
                  </h3>
                  <span className={`text-amber-400 transform transition-transform ${expandedIssue === idx ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedIssue === idx && (
                  <div className="px-5 pb-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Symptoms:</h4>
                      <ul className="flex flex-wrap gap-2">
                        {issue.symptoms.map((s, i) => (
                          <li key={i} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-lg">{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Possible Causes:</h4>
                      <ul className="flex flex-wrap gap-2">
                        {issue.causes.map((c, i) => (
                          <li key={i} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Solutions:</h4>
                      <ul className="space-y-1">
                        {issue.solutions.map((sol, i) => (
                          <li key={i} className="solution-item flex items-center gap-2 text-gray-300 text-sm">
                            <span className="text-green-400">✓</span>
                            {sol}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">HTTP Error Codes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {errorCodes.map((err, idx) => (
              <div key={idx} className="error-card relative p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                <div className="text-2xl font-bold text-amber-400 mb-1">{err.code}</div>
                <div className="text-white text-sm font-medium">{err.meaning}</div>
                <div className="text-gray-400 text-xs mt-1">{err.fix}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-amber-900/30 to-yellow-900/30 border border-amber-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-gray-400 mb-6">Our support team is available 24/7 to assist you with any issues.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/community/support" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                  💬 Contact Support
                </Link>
                <Link href="/docs/agents/best-practices" className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.04] border border-white/[0.08] rounded-xl font-semibold hover:bg-white/[0.08] transition-all">
                  📖 Best Practices
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
