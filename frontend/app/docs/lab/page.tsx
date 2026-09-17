'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin } from '@/lib/gsap';
import { FlaskConical, Sparkles, Mic, Music, Palette, BookOpen, Brain, Heart, Swords, Eye, MessageSquare, Rocket, Zap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin, TextPlugin);

export default function LabDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  const experiments = [
    { name: 'AI Battle Arena', emoji: '⚔️', icon: Swords, desc: 'Pit two AI models head-to-head on any prompt. Compare responses side-by-side with voting, speed metrics, and quality scores.', color: 'from-red-500 to-orange-500', badge: 'VS Mode' },
    { name: 'Image Playground', emoji: '🎨', icon: Palette, desc: 'Generate stunning images from text prompts. Experiment with styles, aspect ratios, and AI artistic techniques.', color: 'from-pink-500 to-rose-500', badge: 'Creative' },
    { name: 'Voice Cloning Studio', emoji: '🎤', icon: Mic, desc: 'Clone any voice with a short audio sample. Generate speech in cloned voices for content creation and experimentation.', color: 'from-violet-500 to-purple-500', badge: 'Audio' },
    { name: 'Music Generator', emoji: '🎵', icon: Music, desc: 'Compose original music from text descriptions. Choose genres, instruments, moods, and generate full tracks.', color: 'from-cyan-500 to-blue-500', badge: 'Audio' },
    { name: 'Neural Art Studio', emoji: '🖼️', icon: Sparkles, desc: 'Transform photos into artistic styles using neural style transfer. Apply Van Gogh, Monet, or abstract styles to any image.', color: 'from-amber-500 to-yellow-500', badge: 'Creative' },
    { name: 'Dream Interpreter', emoji: '🌙', icon: Eye, desc: 'Describe your dream and let AI analyze its symbolism, psychology, and potential meanings.', color: 'from-indigo-500 to-violet-500', badge: 'Fun' },
    { name: 'Story Weaver', emoji: '📖', icon: BookOpen, desc: 'Collaborate with AI to write branching interactive stories. Choose your path and let the narrative unfold.', color: 'from-emerald-500 to-green-500', badge: 'Creative' },
    { name: 'Personality Mirror', emoji: '🪞', icon: Brain, desc: 'Have a conversation with AI and receive a personality analysis based on your communication patterns.', color: 'from-teal-500 to-cyan-500', badge: 'Fun' },
    { name: 'Future Predictor', emoji: '🔮', icon: Zap, desc: 'Input trends and data points. AI generates entertaining (not financial!) predictions about future possibilities.', color: 'from-fuchsia-500 to-pink-500', badge: 'Fun' },
    { name: 'Emotion Visualizer', emoji: '💖', icon: Heart, desc: 'Paste text and watch AI map the emotional journey — sentiments, intensity curves, and mood visualizations.', color: 'from-rose-500 to-red-500', badge: 'Analysis' },
    { name: 'Debate Arena', emoji: '🗣️', icon: MessageSquare, desc: 'Pick any topic and watch two AI personas argue opposing sides. Vote for the most persuasive argument.', color: 'from-orange-500 to-amber-500', badge: 'VS Mode' },
  ];

  const stats = [
    { value: '11', label: 'Experiments' },
    { value: '6', label: 'Categories' },
    { value: '2', label: 'VS Modes' },
    { value: '∞', label: 'Creativity' },
  ];

  /* ── Stars canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#f0abfc', '#fde68a', '#86efac', '#93c5fd'];
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── GSAP ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-title-wrap', { y: 50, opacity: 0 });
      gsap.set('.hero-icon', { scale: 0, rotation: -180 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
        .to('.hero-title-wrap', { y: 0, opacity: 1, duration: 0.8 }, '-=0.4')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4')
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.3');

      if (typewriterRef.current) {
        const phrases = ['Battle AI models live', 'Clone any voice instantly', 'Generate music from text', 'Create neural art styles', 'Interpret your dreams', 'Visualize emotions in text'];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({ trigger: el, start: 'top 85%', onEnter: () => { gsap.to(el, { duration: 1.5, scrambleText: { text: originalText, chars: '0123456789∞+', speed: 0.4 }, delay: i * 0.1 }); } });
      });

      gsap.set('.experiment-card', { y: 50, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.experiment-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.06, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 50, opacity: 0, scale: 0.9, duration: 0.3 })
      });

      Observer.create({
        target: window, type: 'scroll',
        onChangeY: (self) => {
          gsap.to('.parallax-orb-1', { y: self.scrollY * 0.12, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: self.scrollY * -0.08, duration: 0.4, ease: 'none' });
        }
      });

      gsap.to('.orbit-element', {
        motionPath: { path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }], curviness: 2 },
        duration: 14, repeat: -1, ease: 'none'
      });

      gsap.set('.draw-line', { drawSVG: '0%' });
      ScrollTrigger.create({ trigger: '.stats-section', start: 'top 80%', onEnter: () => gsap.to('.draw-line', { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut' }) });

      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, { x: `random(-60, 60)`, y: `random(-40, 40)`, rotation: `random(-100, 100)`, duration: `random(5, 8)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.15 });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="parallax-orb-1 absolute top-[10%] left-[25%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-[15%] right-[20%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.03) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {[...Array(14)].map((_, i) => (<div key={i} className="float-particle absolute w-1.5 h-1.5 bg-violet-400/20 rounded-full" style={{ left: `${6 + i * 6}%`, top: `${10 + (i % 6) * 14}%` }} />))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-fuchsia-400/40 rounded-full" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm rounded-2xl border border-violet-500/30 mb-6">
            <span className="text-4xl">🧪</span>
          </div>
          <div className="hero-title-wrap">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #c4b5fd, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Lab</span>
            </h1>
          </div>
          <p className="hero-subtitle text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-6 leading-relaxed font-light">
            11 experimental AI playgrounds — battle AI models, generate music, clone voices, create art, interpret dreams, and explore the frontier of AI creativity
          </p>
          <div className="hero-badge flex justify-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                <FlaskConical className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="text-sm text-gray-300 font-mono">
                <span ref={typewriterRef} className="text-gray-200"></span>
                <span className="inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <svg className="absolute left-1/2 -translate-x-1/2 top-0 h-1 w-1/2 opacity-20" preserveAspectRatio="none">
            <line className="draw-line" x1="0" y1="0" x2="100%" y2="0" stroke="url(#labGrad)" strokeWidth="2" />
            <defs><linearGradient id="labGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
          </svg>
          <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="stat-value text-2xl font-bold text-violet-400">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Experiments */}
      <section className="relative z-10 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            <span style={{ background: 'linear-gradient(to right, #c4b5fd, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>All Experiments</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {experiments.map((exp, idx) => {
              const Icon = exp.icon;
              return (
                <div key={idx} className="experiment-card group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden hover:border-violet-500/40 transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${exp.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exp.color} flex items-center justify-center text-white text-xl`}>
                          {exp.emoji}
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-violet-300 transition-colors">{exp.name}</h3>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r ${exp.color} text-white mt-1`}>{exp.badge}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{exp.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How AI Lab Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Pick an Experiment', desc: 'Browse 11 AI experiments and choose one that interests you.', emoji: '🧪' },
              { step: '02', title: 'Provide Input', desc: 'Enter text, upload images or audio, or set parameters for the experiment.', emoji: '✍️' },
              { step: '03', title: 'See AI Results', desc: 'Watch AI generate results in real time — compare, vote, share, or iterate.', emoji: '✨' },
            ].map((item, idx) => (
              <div key={idx} className="experiment-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <div className="text-xs text-violet-400 font-mono mb-2">Step {item.step}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 border border-violet-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Experimenting</h2>
              <p className="text-gray-400 mb-6">11 AI experiments ready to explore. Push the boundaries of creativity.</p>
              <Link href="/lab" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                <Rocket className="w-5 h-5" />
                Open AI Lab
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
      `}</style>
    </div>
  );
}
