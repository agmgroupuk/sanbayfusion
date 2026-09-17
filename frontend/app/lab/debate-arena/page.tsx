'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface DebateTopic {
  id: string;
  title: string;
  description: string;
  votes: { for: number; against: number };
}

interface DebateResponse {
  agent: string;
  position: 'for' | 'against';
  argument: string;
}

export default function DebateArenaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topics, setTopics] = useState<DebateTopic[]>([
    { id: '1', title: 'AI Should Replace Human Jobs', description: 'Should AI be allowed to fully automate jobs currently done by humans?', votes: { for: 234, against: 189 } },
    { id: '2', title: 'Universal Basic Income for AI Era', description: 'Is UBI necessary as AI takes over more employment?', votes: { for: 456, against: 123 } },
    { id: '3', title: 'AI Rights and Personhood', description: 'Should advanced AI systems have legal rights similar to humans?', votes: { for: 167, against: 298 } },
    { id: '4', title: 'Mandatory AI Regulation', description: 'Should governments strictly regulate AI development?', votes: { for: 387, against: 156 } },
  ]);
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null);
  const [debateResponses, setDebateResponses] = useState<DebateResponse[]>([]);
  const [isDebating, setIsDebating] = useState(false);
  const [userVote, setUserVote] = useState<'for' | 'against' | null>(null);

  const startDebate = async (topic: DebateTopic) => {
    setSelectedTopic(topic);
    setIsDebating(true);
    setDebateResponses([]);
    setUserVote(null);
    try {
      const response = await fetch('/api/lab/debate-arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, topic: topic.title })
      });
      const data = await response.json();
      if (data.success) {
        setDebateResponses(data.responses);
      }
    } catch (err) {
      console.error('Debate error:', err);
    } finally {
      setIsDebating(false);
    }
  };

  const handleVote = useCallback(async (position: 'for' | 'against') => {
    if (!selectedTopic || userVote) return;
    setUserVote(position);
    setTopics(prev => prev.map(t =>
      t.id === selectedTopic.id
        ? { ...t, votes: { ...t.votes, [position]: t.votes[position] + 1 } }
        : t
    ));
    // Persist vote to backend
    try {
      await fetch('/api/lab/debate-arena/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopic.id, position }),
      });
    } catch (err) {
      console.error('Failed to persist vote:', err);
    }
  }, [selectedTopic, userVote]);

  // Load persisted vote counts on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/lab/debate-arena/votes');
        const json = await res.json();
        if (json.success && json.votes) {
          setTopics(prev => prev.map(t => {
            const stored = json.votes[t.id];
            if (stored) {
              return { ...t, votes: { for: (t.votes.for) + (stored.for || 0), against: (t.votes.against) + (stored.against || 0) } };
            }
            return t;
          }));
        }
      } catch (err) {
        // Silently fall back to hardcoded defaults
      }
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateZ: -10 });
      gsap.set('.hero-badge', { scale: 0, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateZ: 0, duration: 0.55, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on vote counts
      gsap.utils.toArray<HTMLElement>('.vote-stat').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: '0123456789', speed: 0.5 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger batch for topic cards
      gsap.set('.topic-card', { y: 40, opacity: 0, rotateX: -15 });
      ScrollTrigger.batch('.topic-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateX: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.2)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 40, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for debate panel reveal
      gsap.set('.debate-panel', { opacity: 0, scale: 0.9 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.12, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting mic
      gsap.to('.orbit-mic', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }],
          curviness: 1.8,
        },
        duration: 16,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on debate button
      gsap.utils.toArray<HTMLElement>('.debate-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, rotation: 2, duration: 0.4, ease: 'debateWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, rotation: 0, duration: 0.3 });
        });
      });

      // 8. DrawSVG for divider lines
      gsap.set('.debate-divider', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.topics-grid',
        start: 'top 85%',
        onEnter: () => gsap.to('.debate-divider', { drawSVG: '100%', duration: 1, ease: 'power2.inOut' })
      });

      // 9. Draggable topic cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-topic', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function () {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.debate-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-45, 45)`,
          y: `random(-35, 35)`,
          duration: `random(7, 11)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Vote bar animation
      gsap.utils.toArray<HTMLElement>('.vote-bar').forEach((bar) => {
        const width = bar.getAttribute('data-width') || '50%';
        gsap.fromTo(bar, { width: '0%' }, {
          width,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: bar, start: 'top 95%' }
        });
      });

      // 12. Position badge pulse
      gsap.to('.position-badge', {
        boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (selectedTopic && debateResponses.length > 0) {
      gsap.to('.debate-panel', { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.3)' });
    }
  }, [selectedTopic, debateResponses]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-sky-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[460px] h-[460px] bg-blue-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(9)].map((_, i) => (
          <div key={i} className="debate-particle absolute w-2 h-2 bg-sky-400/25 rounded-full" style={{ left: `${8 + i * 10}%`, top: `${14 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-mic absolute top-32 right-1/4 w-3 h-3 bg-blue-400/50 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-8 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Link href="/lab" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            ← Back to AI Lab
          </Link>
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-sky-500/30 mb-4">
            <span className="text-xl">🎤</span>
            <span className="font-medium text-sky-300">AI Debate Arena</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Debate Arena</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Watch AI agents debate controversial topics and cast your vote
          </p>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="topics-grid relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <svg className="debate-divider absolute left-1/2 -translate-x-1/2 -top-2 h-1 w-1/2 opacity-30" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="url(#debateGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="debateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <h2 className="text-2xl font-bold mb-6">🔥 Hot Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic) => {
              const totalVotes = topic.votes.for + topic.votes.against;
              const forPercentage = totalVotes > 0 ? (topic.votes.for / totalVotes) * 100 : 50;
              return (
                <div key={topic.id} className="topic-card draggable-topic p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-white mb-2">{topic.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{topic.description}</p>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-green-400 vote-stat">{topic.votes.for} For</span>
                    <span className="text-red-400 vote-stat">{topic.votes.against} Against</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden flex mb-4">
                    <div className="vote-bar bg-gradient-to-r from-green-500 to-emerald-500 h-full" data-width={`${forPercentage}%`} style={{ width: 0 }} />
                    <div className="flex-1 bg-gradient-to-r from-red-500 to-rose-500" />
                  </div>
                  <button onClick={() => startDebate(topic)} className="debate-btn w-full py-3 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/25 transition-all">
                    🎤 Start Debate
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Debate */}
      {selectedTopic && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="p-8 rounded-3xl bg-white/[0.02] border border-sky-500/30 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-2 text-center">{selectedTopic.title}</h2>
              <p className="text-gray-400 text-center mb-6">{selectedTopic.description}</p>

              {isDebating ? (
                <div className="text-center py-12">
                  <div className="text-4xl animate-pulse">🎤</div>
                  <p className="text-gray-400 mt-4">AI agents are debating...</p>
                </div>
              ) : debateResponses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {debateResponses.map((response, idx) => (
                    <div key={idx} className={`debate-panel p-6 rounded-2xl ${response.position === 'for' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`position-badge px-3 py-1 rounded-full text-xs font-bold ${response.position === 'for' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {response.position === 'for' ? '✓ FOR' : '✗ AGAINST'}
                        </span>
                        <span className="text-gray-400 text-sm">{response.agent}</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{response.argument}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Voting */}
              {debateResponses.length > 0 && !userVote && (
                <div className="mt-8 flex gap-4 justify-center">
                  <button onClick={() => handleVote('for')} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all">
                    👍 Vote For
                  </button>
                  <button onClick={() => handleVote('against')} className="px-8 py-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all">
                    👎 Vote Against
                  </button>
                </div>
              )}
              {userVote && (
                <div className="mt-8 text-center text-lg">
                  <span className="text-sky-400">You voted: </span>
                  <span className={userVote === 'for' ? 'text-green-400' : 'text-red-400'}>{userVote === 'for' ? 'FOR' : 'AGAINST'}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
