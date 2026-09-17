'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface PredictionScenario {
  title: string;
  probability: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeline: string;
}

interface PredictionResult {
  topic: string;
  timeframe: string;
  scenarios: PredictionScenario[];
  confidence: number;
  keyFactors: string[];
}

export default function FuturePredictorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topic, setTopic] = useState('');
  const [timeframe, setTimeframe] = useState('5years');
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const timeframes = [
    { id: '1year', label: '1 Year' },
    { id: '5years', label: '5 Years' },
    { id: '10years', label: '10 Years' },
    { id: '25years', label: '25 Years' },
  ];

  const handlePredict = async () => {
    if (!topic.trim()) return;
    setIsPredicting(true);
    setPrediction(null);
    try {
      const response = await fetch('/api/lab/future-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, timeframe })
      });
      const data = await response.json();
      if (data.success) {
        setPrediction(data.prediction);
      }
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateX: -45 });
      gsap.set('.hero-badge', { y: -40, opacity: 0, scale: 0.8 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.55, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on confidence/probability
      gsap.utils.toArray<HTMLElement>('.probability-text').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789%', speed: 0.4 }, delay: i * 0.1 });
          }
        });
      });

      // 3. ScrollTrigger batch for scenario cards
      gsap.set('.scenario-card', { y: 50, opacity: 0, rotateY: -10 });
      ScrollTrigger.batch('.scenario-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateY: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for results panel
      gsap.set('.prediction-panel', { opacity: 0, scale: 0.92 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.12, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.08, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting crystal ball
      gsap.to('.orbit-crystal', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 70, y: -40 }, { x: 140, y: 0 }, { x: 70, y: 40 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 18,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on predict button
      gsap.utils.toArray<HTMLElement>('.predict-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, duration: 0.5, ease: 'futureWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for timeline lines
      gsap.set('.timeline-line', { drawSVG: '0%' });
      gsap.to('.timeline-line', { drawSVG: '100%', duration: 1.5, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable input card
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-form', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.future-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-45, 45)`,
          y: `random(-40, 40)`,
          duration: `random(6, 10)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.15
        });
      });

      // 11. Timeframe button hover
      gsap.utils.toArray<HTMLElement>('.timeframe-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { y: -3, boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)', duration: 0.2 });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { y: 0, boxShadow: 'none', duration: 0.2 });
        });
      });

      // 12. Impact badge pulse
      gsap.to('.impact-high', {
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (prediction) {
      gsap.to('.prediction-panel', { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' });
      // Animate probability bars
      prediction.scenarios.forEach((s, i) => {
        gsap.fromTo(`.prob-bar-${i}`, { scaleX: 0 }, { scaleX: s.probability / 100, duration: 0.8, delay: 0.3 + i * 0.1, ease: 'power2.out', transformOrigin: 'left center' });
      });
    }
  }, [prediction]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30 impact-high';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-indigo-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/4 right-1/5 w-[460px] h-[460px] bg-blue-500/12 rounded-full blur-[120px]" />
        <div className="parallax-orb-3 absolute top-1/2 left-1/3 w-[320px] h-[320px] bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="future-particle absolute w-2 h-2 bg-indigo-400/25 rounded-full" style={{ left: `${7 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-crystal absolute top-28 right-1/4 w-4 h-4 bg-blue-400/50 rounded-full shadow-lg shadow-indigo-400/30" />
        <svg className="absolute top-40 left-1/4 w-80 h-8 opacity-30">
          <line className="timeline-line" x1="0" y1="15" x2="100%" y2="15" stroke="url(#futureGrad)" strokeWidth="2" strokeDasharray="8 4" />
          <defs>
            <linearGradient id="futureGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 backdrop-blur-sm rounded-full border border-indigo-500/30 mb-4">
            <span className="text-xl">🔮</span>
            <span className="font-medium text-indigo-300">Trend Forecasting</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Future Predictor</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            AI-powered predictions for technology, society, and more
          </p>
        </div>
      </section>

      {/* Input Form */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="draggable-form p-8 rounded-3xl bg-white/[0.02] border border-indigo-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">What would you like to predict?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Artificial Intelligence, Space Travel, Climate Change..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors mb-4"
            />
            
            <label className="text-sm font-semibold mb-3 block text-gray-400">Timeframe</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={`timeframe-btn px-5 py-2 rounded-xl text-sm font-medium transition-all ${timeframe === tf.id ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08]'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <button
              onClick={handlePredict}
              disabled={!topic.trim() || isPredicting}
              className="predict-btn w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              {isPredicting ? '🔮 Predicting...' : '✨ Generate Prediction'}
            </button>
          </div>
        </div>
      </section>

      {/* Prediction Results */}
      {prediction && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="prediction-panel space-y-6">
              {/* Confidence Header */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-indigo-500/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-indigo-400">{prediction.topic}</h3>
                  <span className="probability-text text-lg font-bold text-white">{prediction.confidence}% confidence</span>
                </div>
                <p className="text-gray-400">Timeframe: {timeframes.find(t => t.id === prediction.timeframe)?.label}</p>
              </div>

              {/* Scenarios */}
              {prediction.scenarios.map((scenario, idx) => (
                <div key={idx} className="scenario-card p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-white text-lg">{scenario.title}</h4>
                      <span className="text-gray-500 text-sm">{scenario.timeline}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getImpactColor(scenario.impact)}`}>
                      {scenario.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4 leading-relaxed">{scenario.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Probability:</span>
                    <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`prob-bar-${idx} h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full`} style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }} />
                    </div>
                    <span className="probability-text text-sm text-indigo-400 font-bold w-12 text-right">{scenario.probability}%</span>
                  </div>
                </div>
              ))}

              {/* Key Factors */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-blue-500/30 backdrop-blur-sm">
                <h4 className="font-bold text-blue-400 mb-4">🔑 Key Factors</h4>
                <div className="flex flex-wrap gap-2">
                  {prediction.keyFactors.map((factor, idx) => (
                    <span key={idx} className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">{factor}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
