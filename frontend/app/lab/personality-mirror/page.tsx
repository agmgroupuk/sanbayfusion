'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface PersonalityTrait {
  name: string;
  score: number;
  description: string;
  icon: string;
  color: string;
}

interface PersonalityResult {
  traits: PersonalityTrait[];
  dominantType: string;
  summary: string;
  suggestions: string[];
}

export default function PersonalityMirrorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [writingSample, setWritingSample] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PersonalityResult | null>(null);

  const handleAnalyze = async () => {
    if (!writingSample.trim() || writingSample.length < 50) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await fetch('/api/lab/personality-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: writingSample })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.analysis);
      }
    } catch (err) {
      console.error('Personality analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 70, opacity: 0, rotateZ: -8 });
      gsap.set('.hero-badge', { y: -30, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateZ: 0, duration: 0.5, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on trait scores
      gsap.utils.toArray<HTMLElement>('.trait-score').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 0.8, scrambleText: { text: originalText, chars: '0123456789%', speed: 0.5 }, delay: i * 0.08 });
          }
        });
      });

      // 3. ScrollTrigger for trait cards
      gsap.set('.trait-card', { y: 40, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.trait-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.3)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 40, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for result panel
      gsap.set('.result-panel', { opacity: 0, scale: 0.9 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.13, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting mirror
      gsap.to('.orbit-mirror', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }],
          curviness: 1.6,
        },
        duration: 14,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on analyze button
      gsap.utils.toArray<HTMLElement>('.analyze-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, duration: 0.5, ease: 'personalityWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for personality wheel
      gsap.set('.personality-arc', { drawSVG: '0%' });
      gsap.to('.personality-arc', { drawSVG: '100%', duration: 1.5, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable input panel
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-input', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.personality-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-45, 45)`,
          y: `random(-40, 40)`,
          duration: `random(6, 10)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Trait icon animation
      gsap.utils.toArray<HTMLElement>('.trait-icon').forEach((icon, i) => {
        gsap.to(icon, {
          scale: 1.15,
          rotation: 8,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.12
        });
      });

      // 12. Character count pulse
      gsap.to('.char-count', {
        opacity: 0.7,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (result) {
      gsap.to('.result-panel', { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' });
      // Animate trait bars
      result.traits.forEach((t, i) => {
        gsap.fromTo(`.trait-bar-${i}`, { scaleX: 0 }, { scaleX: t.score / 100, duration: 0.8, delay: 0.3 + i * 0.1, ease: 'power2.out', transformOrigin: 'left center' });
      });
    }
  }, [result]);

  const minChars = 50;
  const charCount = writingSample.length;
  const canAnalyze = charCount >= minChars;

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-cyan-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(20, 184, 166, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="personality-particle absolute w-2 h-2 bg-teal-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-mirror absolute top-32 right-1/4 w-4 h-4 bg-cyan-400/50 rounded-full" />
        <svg className="absolute top-24 left-1/4 w-40 h-40 opacity-20">
          <circle className="personality-arc" cx="80" cy="80" r="60" fill="none" stroke="url(#personalityGrad)" strokeWidth="3" />
          <defs>
            <linearGradient id="personalityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/lab" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            ← Back to AI Lab
          </Link>
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-sm rounded-full border border-teal-500/30 mb-4">
            <span className="text-xl">🪞</span>
            <span className="font-medium text-teal-300">Personality Analysis</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Personality Mirror</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover your personality traits through AI analysis of your writing style
          </p>
        </div>
      </section>

      {/* Input Section */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="draggable-input p-8 rounded-3xl bg-white/[0.02] border border-teal-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Share a writing sample</label>
            <p className="text-gray-400 text-sm mb-4">Write about anything - your day, your thoughts, a story. The more you write, the better the analysis.</p>
            <textarea
              value={writingSample}
              onChange={(e) => setWritingSample(e.target.value)}
              placeholder="Today I felt inspired to try something new. I've always been curious about how AI can understand human emotions..."
              className="w-full h-48 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors resize-none mb-3"
            />
            <div className="flex items-center justify-between mb-4">
              <span className={`char-count text-sm ${canAnalyze ? 'text-teal-400' : 'text-gray-500'}`}>
                {charCount} / {minChars} minimum characters
              </span>
              {!canAnalyze && <span className="text-xs text-gray-500">Need {minChars - charCount} more characters</span>}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || isAnalyzing}
              className="analyze-btn w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              {isAnalyzing ? '🔍 Analyzing...' : '✨ Analyze Personality'}
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="result-panel space-y-6">
              {/* Dominant Type */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-teal-500/30 backdrop-blur-sm text-center">
                <h3 className="text-sm text-gray-400 mb-2">Your Dominant Type</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">{result.dominantType}</p>
              </div>

              {/* Traits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.traits.map((trait, idx) => (
                  <div key={idx} className="trait-card p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="trait-icon text-2xl">{trait.icon}</span>
                        <span className="font-bold text-white">{trait.name}</span>
                      </div>
                      <span className="trait-score text-lg font-bold text-teal-400">{trait.score}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                      <div className={`trait-bar-${idx} h-full bg-gradient-to-r ${trait.color} rounded-full`} style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }} />
                    </div>
                    <p className="text-gray-400 text-sm">{trait.description}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-cyan-500/30 backdrop-blur-sm">
                <h3 className="font-bold text-cyan-400 mb-3">📝 Analysis Summary</h3>
                <p className="text-gray-300 leading-relaxed">{result.summary}</p>
              </div>

              {/* Suggestions */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-teal-500/30 backdrop-blur-sm">
                <h3 className="font-bold text-teal-400 mb-4">💡 Growth Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((sug, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                      <span className="text-teal-400">•</span>
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
