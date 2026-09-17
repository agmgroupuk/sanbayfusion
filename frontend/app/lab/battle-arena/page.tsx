'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface ModelOption {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function BattleArenaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [model1, setModel1] = useState('gpt-4');
  const [model2, setModel2] = useState('claude-3');
  const [isBattling, setIsBattling] = useState(false);
  const [responses, setResponses] = useState<{ model1: string; model2: string } | null>(null);
  const [votes, setVotes] = useState({ model1: 0, model2: 0 });

  const models: ModelOption[] = [
    { id: 'gpt-4', name: 'GPT-4', color: 'from-green-500 to-emerald-500', icon: '🟢' },
    { id: 'claude-3', name: 'Claude 3', color: 'from-orange-500 to-amber-500', icon: '🟠' },
    { id: 'gemini', name: 'Gemini Pro', color: 'from-blue-500 to-cyan-500', icon: '🔵' },
    { id: 'llama', name: 'Llama 3', color: 'from-purple-500 to-pink-500', icon: '🟣' },
  ];

  const handleBattle = async () => {
    if (!prompt.trim()) return;
    setIsBattling(true);
    setResponses(null);
    try {
      const response = await fetch('/api/lab/battle-arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model1, model2 })
      });
      const data = await response.json();
      if (data.success) {
        setResponses({ model1: data.response1, model2: data.response2 });
      }
    } catch (err) {
      console.error('Battle error:', err);
    } finally {
      setIsBattling(false);
    }
  };

  const handleVote = async (winner: 'model1' | 'model2') => {
    setVotes(prev => ({ ...prev, [winner]: prev[winner] + 1 }));
    // Persist vote to backend
    try {
      const battleKey = `${model1}-${model2}-${prompt.slice(0, 50)}`;
      await fetch('/api/lab/battle-arena/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleKey, winner }),
      });
    } catch (err) {
      console.error('Failed to persist vote:', err);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateY: -45 });
      gsap.set('.hero-badge', { x: -50, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateY: 0, duration: 0.6, stagger: 0.025 }, '-=0.2');

      // 2. ScrambleText on vote counts
      gsap.utils.toArray<HTMLElement>('.vote-count').forEach((el) => {
        const originalText = el.textContent || '';
        gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: '0123456789', speed: 0.6 } });
      });

      // 3. ScrollTrigger for model cards
      gsap.set('.model-card', { y: 50, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.model-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.3)' })
      });

      // 4. Flip for response panels
      gsap.set('.response-panel', { opacity: 0, rotateX: -30 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting sword
      gsap.to('.orbit-sword', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 70, y: -35 }, { x: 140, y: 0 }, { x: 70, y: 35 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 14,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on battle button
      gsap.utils.toArray<HTMLElement>('.battle-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.08, duration: 0.4, ease: 'battleWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for VS line
      gsap.set('.vs-line', { drawSVG: '0%' });
      gsap.to('.vs-line', { drawSVG: '100%', duration: 1, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable model selectors
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-model', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function () {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.battle-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-40, 40)`,
          rotation: `random(-180, 180)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Model icon pulse
      gsap.utils.toArray<HTMLElement>('.model-icon').forEach((icon) => {
        gsap.to(icon, {
          scale: 1.15,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });

      // 12. Vote button effects
      gsap.utils.toArray<HTMLElement>('.vote-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.3)', duration: 0.2 });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { y: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', duration: 0.2 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (responses) {
      gsap.to('.response-panel', { opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.15, ease: 'back.out(1.3)' });
    }
  }, [responses]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[550px] h-[550px] bg-yellow-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[480px] h-[480px] bg-red-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(234, 179, 8, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 179, 8, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="battle-particle absolute w-2 h-2 bg-yellow-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-sword absolute top-36 right-1/3 w-4 h-4 bg-red-400/50 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-8 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Link href="/lab" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            ← Back to AI Lab
          </Link>
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-500/20 to-red-500/20 backdrop-blur-sm rounded-full border border-yellow-500/30 mb-4">
            <span className="text-xl">⚔️</span>
            <span className="font-medium text-yellow-300">AI vs AI Competition</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Battle Arena</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Pit AI models against each other and vote for the best response
          </p>
        </div>
      </section>

      {/* Model Selection */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Model 1 */}
            <div className="model-card draggable-model p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-yellow-400">⚔️ Challenger 1</h3>
              <div className="grid grid-cols-2 gap-2">
                {models.map((m) => (
                  <button key={m.id} onClick={() => setModel1(m.id)} className={`p-3 rounded-xl text-sm font-medium transition-all ${model1 === m.id ? `bg-gradient-to-r ${m.color} text-white` : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'}`}>
                    <span className="model-icon inline-block mr-1">{m.icon}</span> {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* VS */}
            <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <div className="text-4xl font-bold text-gray-600">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <line className="vs-line" x1="30" y1="0" x2="30" y2="60" stroke="url(#vsGrad)" strokeWidth="3" />
                  <defs>
                    <linearGradient id="vsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Model 2 */}
            <div className="model-card draggable-model p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-red-400">⚔️ Challenger 2</h3>
              <div className="grid grid-cols-2 gap-2">
                {models.map((m) => (
                  <button key={m.id} onClick={() => setModel2(m.id)} className={`p-3 rounded-xl text-sm font-medium transition-all ${model2 === m.id ? `bg-gradient-to-r ${m.color} text-white` : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'}`}>
                    <span className="model-icon inline-block mr-1">{m.icon}</span> {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prompt Input */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Battle Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt for both AI models to respond to..."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none mb-4"
            />
            <button
              onClick={handleBattle}
              disabled={!prompt.trim() || isBattling}
              className="battle-btn w-full py-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 transition-all"
            >
              {isBattling ? '⚔️ Battling...' : '⚔️ Start Battle'}
            </button>
          </div>
        </div>
      </section>

      {/* Responses */}
      {responses && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="response-panel p-6 rounded-3xl bg-white/[0.02] border border-yellow-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-yellow-400">{models.find(m => m.id === model1)?.name}</h3>
                <span className="vote-count text-sm text-gray-400">{votes.model1} votes</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{responses.model1}</p>
              <button onClick={() => handleVote('model1')} className="vote-btn w-full py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 font-medium hover:bg-yellow-500/30 transition-all">
                👍 Vote for this response
              </button>
            </div>
            <div className="response-panel p-6 rounded-3xl bg-white/[0.02] border border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-red-400">{models.find(m => m.id === model2)?.name}</h3>
                <span className="vote-count text-sm text-gray-400">{votes.model2} votes</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{responses.model2}</p>
              <button onClick={() => handleVote('model2')} className="vote-btn w-full py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-all">
                👍 Vote for this response
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
