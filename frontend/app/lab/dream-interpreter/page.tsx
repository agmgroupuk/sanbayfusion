'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface DreamAnalysis {
  symbols: { symbol: string; meaning: string }[];
  themes: string[];
  emotionalTone: string;
  interpretation: string;
  lucidityScore: number;
}

export default function DreamInterpreterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!dreamText.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/lab/dream-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream: dreamText })
      });
      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Dream analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 70, opacity: 0, rotateX: -60, scale: 0.8 });
      gsap.set('.hero-badge', { y: -30, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.5, stagger: 0.025 }, '-=0.3');

      // 2. ScrambleText on stats
      gsap.utils.toArray<HTMLElement>('.dream-stat').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '☽★✧◆●○', speed: 0.3 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger for input panel
      gsap.set('.input-panel', { y: 50, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.input-panel',
        start: 'top 90%',
        onEnter: () => gsap.to('.input-panel', { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' })
      });

      // 4. Flip for analysis cards
      gsap.set('.analysis-card', { opacity: 0, scale: 0.85 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, rotation: scrollY * 0.02, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, rotation: scrollY * -0.015, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting moon
      gsap.to('.orbit-moon', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 80, y: -40 }, { x: 160, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 20,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on analyze button
      gsap.utils.toArray<HTMLElement>('.analyze-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, duration: 0.5, ease: 'dreamWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for constellation lines
      gsap.set('.constellation-line', { drawSVG: '0%' });
      gsap.to('.constellation-line', { drawSVG: '100%', duration: 2, delay: 0.8, ease: 'power2.inOut' });

      // 9. Draggable symbols
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-symbol', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
          }
        });
      }

      // 10. Floating dream particles (stars)
      gsap.utils.toArray<HTMLElement>('.dream-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-35, 35)`,
          y: `random(-30, 30)`,
          opacity: `random(0.3, 0.8)`,
          scale: `random(0.8, 1.3)`,
          duration: `random(4, 8)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

      // 11. Symbol icon animation
      gsap.utils.toArray<HTMLElement>('.symbol-icon').forEach((icon) => {
        gsap.to(icon, {
          rotation: 360,
          duration: 12,
          repeat: -1,
          ease: 'none'
        });
      });

      // 12. Lucidity meter animation
      gsap.set('.lucidity-fill', { scaleX: 0, transformOrigin: 'left center' });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (analysis) {
      gsap.to('.analysis-card', { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.3)' });
      gsap.to('.lucidity-fill', { scaleX: analysis.lucidityScore / 100, duration: 1.5, delay: 0.5, ease: 'power2.out' });
    }
  }, [analysis]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/6 w-[480px] h-[480px] bg-violet-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/4 right-1/5 w-[420px] h-[420px] bg-purple-500/12 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(12)].map((_, i) => (
          <div key={i} className="dream-particle absolute w-1 h-1 bg-violet-400/40 rounded-full" style={{ left: `${5 + i * 8}%`, top: `${10 + (i % 6) * 14}%` }} />
        ))}
        <div className="orbit-moon absolute top-28 right-1/4 w-4 h-4 bg-purple-300/60 rounded-full shadow-lg shadow-purple-400/30" />
        <svg className="absolute top-20 left-1/4 w-80 h-60 opacity-20">
          <line className="constellation-line" x1="10" y1="30" x2="80" y2="10" stroke="#8b5cf6" strokeWidth="1" />
          <line className="constellation-line" x1="80" y1="10" x2="150" y2="50" stroke="#8b5cf6" strokeWidth="1" />
          <line className="constellation-line" x1="150" y1="50" x2="100" y2="90" stroke="#8b5cf6" strokeWidth="1" />
        </svg>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/lab" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            ← Back to AI Lab
          </Link>
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-violet-500/30 mb-4">
            <span className="text-xl">🌙</span>
            <span className="font-medium text-violet-300">Dream Analysis</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dream Interpreter</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Unlock the hidden meanings in your dreams with AI-powered analysis
          </p>
        </div>
      </section>

      {/* Input Panel */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="input-panel p-8 rounded-3xl bg-white/[0.02] border border-violet-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Describe Your Dream</label>
            <textarea
              value={dreamText}
              onChange={(e) => setDreamText(e.target.value)}
              placeholder="I was flying over a vast ocean, the waves shimmering like diamonds under a purple sky..."
              className="w-full h-40 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none mb-4"
            />
            <button
              onClick={handleAnalyze}
              disabled={!dreamText.trim() || isAnalyzing}
              className="analyze-btn w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              {isAnalyzing ? '🌙 Interpreting...' : '✨ Interpret Dream'}
            </button>
          </div>
        </div>
      </section>

      {/* Analysis Results */}
      {analysis && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Lucidity Score */}
            <div className="analysis-card p-6 rounded-3xl bg-white/[0.02] border border-violet-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-violet-400">🧠 Lucidity Score</h3>
              <div className="h-4 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="lucidity-fill h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
              </div>
              <p className="text-right text-sm text-gray-400 mt-2 dream-stat">{analysis.lucidityScore}% lucid</p>
            </div>

            {/* Emotional Tone */}
            <div className="analysis-card p-6 rounded-3xl bg-white/[0.02] border border-purple-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-3 text-purple-400">💜 Emotional Tone</h3>
              <p className="text-gray-300">{analysis.emotionalTone}</p>
            </div>

            {/* Symbols */}
            <div className="analysis-card p-6 rounded-3xl bg-white/[0.02] border border-fuchsia-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-fuchsia-400">🔮 Dream Symbols</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.symbols.map((sym, idx) => (
                  <div key={idx} className="draggable-symbol flex items-start gap-3 p-3 rounded-xl bg-white/[0.04]">
                    <span className="symbol-icon text-xl">✧</span>
                    <div>
                      <span className="font-semibold text-violet-300">{sym.symbol}</span>
                      <p className="text-gray-400 text-sm">{sym.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Themes */}
            <div className="analysis-card p-6 rounded-3xl bg-white/[0.02] border border-indigo-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-indigo-400">🌟 Themes</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((theme, idx) => (
                  <span key={idx} className="px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm">{theme}</span>
                ))}
              </div>
            </div>

            {/* Full Interpretation */}
            <div className="analysis-card p-6 rounded-3xl bg-white/[0.02] border border-violet-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-violet-400">📖 Full Interpretation</h3>
              <p className="text-gray-300 leading-relaxed">{analysis.interpretation}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
