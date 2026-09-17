'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface EmotionResult {
  emotion: string;
  score: number;
  color: string;
  icon: string;
}

interface AnalysisResult {
  emotions: EmotionResult[];
  dominant: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  summary: string;
}

export default function EmotionVisualizerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const emotions = [
    { emotion: 'Joy', color: 'from-yellow-500 to-amber-500', icon: '😊' },
    { emotion: 'Trust', color: 'from-green-500 to-emerald-500', icon: '🤝' },
    { emotion: 'Anticipation', color: 'from-orange-500 to-amber-500', icon: '🔮' },
    { emotion: 'Surprise', color: 'from-cyan-500 to-teal-500', icon: '😮' },
    { emotion: 'Sadness', color: 'from-blue-500 to-indigo-500', icon: '😢' },
    { emotion: 'Fear', color: 'from-purple-500 to-violet-500', icon: '😨' },
    { emotion: 'Anger', color: 'from-red-500 to-rose-500', icon: '😠' },
    { emotion: 'Disgust', color: 'from-lime-500 to-green-500', icon: '🤢' },
  ];

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await fetch('/api/lab/emotion-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.analysis);
      }
    } catch (err) {
      console.error('Emotion analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 60, opacity: 0, scale: 0.7 });
      gsap.set('.hero-badge', { scale: 0.5, opacity: 0, rotation: -10 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.02 }, '-=0.2');

      // 2. ScrambleText on emotion labels
      gsap.utils.toArray<HTMLElement>('.emotion-label').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 0.7, scrambleText: { text: originalText, chars: 'EMOTION', speed: 0.4 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for emotion tiles
      gsap.set('.emotion-tile', { y: 30, opacity: 0, rotateY: -20 });
      ScrollTrigger.batch('.emotion-tile', {
        start: 'top 92%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateY: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(1.3)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 30, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for result panel
      gsap.set('.result-panel', { opacity: 0, scale: 0.9 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.12, x: scrollY * 0.02, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, x: scrollY * -0.015, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting heart
      gsap.to('.orbit-heart', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 50, y: -30 }, { x: 100, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 0 }],
          curviness: 1.5,
        },
        duration: 10,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on analyze button
      gsap.utils.toArray<HTMLElement>('.analyze-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.08, duration: 0.4, ease: 'emotionWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for emotional wave
      gsap.set('.emotion-wave', { drawSVG: '0%' });
      gsap.to('.emotion-wave', { drawSVG: '100%', duration: 1.5, delay: 0.5, ease: 'power2.inOut' });

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

      // 10. Floating emotion particles
      gsap.utils.toArray<HTMLElement>('.emotion-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-40, 40)`,
          y: `random(-35, 35)`,
          scale: `random(0.7, 1.4)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Emotion icon bounce
      gsap.utils.toArray<HTMLElement>('.emotion-icon').forEach((icon, i) => {
        gsap.to(icon, {
          y: -8,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.1
        });
      });

      // 12. Sentiment indicator pulse
      gsap.to('.sentiment-indicator', {
        scale: 1.15,
        opacity: 0.7,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (result) {
      gsap.to('.result-panel', { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.3)' });
      // Animate emotion bars
      result.emotions.forEach((em, i) => {
        gsap.fromTo(`.bar-${i}`, { scaleX: 0 }, { scaleX: em.score / 100, duration: 0.8, delay: 0.2 + i * 0.08, ease: 'power2.out', transformOrigin: 'left center' });
      });
    }
  }, [result]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      case 'mixed': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-rose-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-pink-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(244, 63, 94, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 63, 94, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="emotion-particle absolute w-2 h-2 bg-rose-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-heart absolute top-32 right-1/3 w-3 h-3 bg-pink-400/60 rounded-full" />
        <svg className="absolute top-24 left-1/3 w-60 h-20 opacity-30">
          <path className="emotion-wave" d="M0,40 Q30,10 60,40 T120,40 T180,40 T240,40" fill="none" stroke="url(#emotionGrad)" strokeWidth="2" />
          <defs>
            <linearGradient id="emotionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#a855f7" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-rose-500/30 mb-4">
            <span className="text-xl">💖</span>
            <span className="font-medium text-rose-300">Sentiment Analysis</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Emotion Visualizer</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover the emotional landscape hidden in your text
          </p>
        </div>
      </section>

      {/* Emotion Tiles Preview */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {emotions.map((em, idx) => (
              <div key={idx} className="emotion-tile px-4 py-2 rounded-full bg-gradient-to-r bg-white/[0.04] border border-white/[0.06] flex items-center gap-2">
                <span className="emotion-icon text-lg">{em.icon}</span>
                <span className="emotion-label text-sm text-gray-300">{em.emotion}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Input Panel */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="draggable-input p-8 rounded-3xl bg-white/[0.02] border border-rose-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Enter Text to Analyze</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste any text to analyze its emotional content..."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 transition-colors resize-none mb-4"
            />
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || isAnalyzing}
              className="analyze-btn w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rose-500/25 transition-all"
            >
              {isAnalyzing ? '💭 Analyzing...' : '🔍 Analyze Emotions'}
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="result-panel p-8 rounded-3xl bg-white/[0.02] border border-pink-500/30 backdrop-blur-sm">
              {/* Sentiment Summary */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-pink-400">Emotional Analysis</h3>
                  <p className="text-gray-400 text-sm mt-1">Dominant: <span className="text-white font-semibold">{result.dominant}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`sentiment-indicator w-3 h-3 rounded-full ${getSentimentColor(result.sentiment)}`} />
                  <span className="capitalize text-gray-300">{result.sentiment}</span>
                </div>
              </div>

              {/* Emotion Bars */}
              <div className="space-y-4 mb-6">
                {result.emotions.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-8 text-center text-xl">{em.icon}</span>
                    <span className="w-24 text-sm text-gray-400">{em.emotion}</span>
                    <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`bar-${idx} h-full bg-gradient-to-r ${em.color} rounded-full`} style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }} />
                    </div>
                    <span className="w-12 text-right text-sm text-gray-400">{em.score}%</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-gray-300 leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
