'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface GeneratedTrack {
  url: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
}

export default function MusicGeneratorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('electronic');
  const [mood, setMood] = useState('energetic');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const genres = [
    { id: 'electronic', name: 'Electronic', icon: '🎹' },
    { id: 'orchestral', name: 'Orchestral', icon: '🎻' },
    { id: 'ambient', name: 'Ambient', icon: '🌊' },
    { id: 'rock', name: 'Rock', icon: '🎸' },
    { id: 'jazz', name: 'Jazz', icon: '🎷' },
    { id: 'lofi', name: 'Lo-Fi', icon: '☕' },
  ];

  const moods = [
    { id: 'energetic', name: 'Energetic', color: 'from-orange-500 to-red-500' },
    { id: 'calm', name: 'Calm', color: 'from-blue-500 to-cyan-500' },
    { id: 'dark', name: 'Dark', color: 'from-purple-500 to-violet-500' },
    { id: 'uplifting', name: 'Uplifting', color: 'from-yellow-500 to-amber-500' },
    { id: 'melancholic', name: 'Melancholic', color: 'from-indigo-500 to-blue-500' },
    { id: 'epic', name: 'Epic', color: 'from-rose-500 to-pink-500' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/music-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre, mood, duration })
      });
      const data = await response.json();
      if (data.success && data.audioUrl) {
        setGeneratedTracks(prev => [{
          url: data.audioUrl,
          prompt,
          genre,
          mood,
          duration
        }, ...prev]);
      }
    } catch (err) {
      console.error('Music generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 60, opacity: 0, rotateY: -30 });
      gsap.set('.hero-badge', { x: -40, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateY: 0, duration: 0.55, stagger: 0.025 }, '-=0.3');

      // 2. ScrambleText on track count
      gsap.utils.toArray<HTMLElement>('.track-count').forEach((el) => {
        const originalText = el.textContent || '';
        gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789', speed: 0.5 }, delay: 0.5 });
      });

      // 3. ScrollTrigger for genre/mood buttons
      gsap.set('.option-btn', { y: 20, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.option-btn', {
        start: 'top 95%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.04, ease: 'back.out(1.3)' })
      });

      // 4. Flip for track cards
      gsap.set('.track-card', { opacity: 0, y: 30 });

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

      // 6. MotionPath for orbiting note
      gsap.to('.orbit-note', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 55, y: -30 }, { x: 110, y: 0 }, { x: 55, y: 30 }, { x: 0, y: 0 }],
          curviness: 1.6,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on generate button
      gsap.utils.toArray<HTMLElement>('.generate-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.4, ease: 'musicWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for waveform
      gsap.set('.waveform-line', { drawSVG: '0%' });
      gsap.to('.waveform-line', { drawSVG: '100%', duration: 1.5, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable duration slider
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
      gsap.utils.toArray<HTMLElement>('.music-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-45, 45)`,
          y: `random(-40, 40)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Genre icon pulse
      gsap.utils.toArray<HTMLElement>('.genre-icon').forEach((icon, i) => {
        gsap.to(icon, {
          scale: 1.3,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.1
        });
      });

      // 12. Sound wave animation
      gsap.utils.toArray<HTMLElement>('.sound-bar').forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: `random(0.3, 1)`,
          duration: 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.05
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (generatedTracks.length > 0) {
      gsap.to('.track-card', { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)' });
    }
  }, [generatedTracks.length]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] bg-cyan-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="music-particle absolute w-2 h-2 bg-blue-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-note absolute top-32 right-1/4 w-3 h-3 bg-cyan-400/50 rounded-full" />
        <svg className="absolute top-24 left-1/3 w-60 h-16 opacity-30">
          <path className="waveform-line" d="M0,30 Q15,10 30,30 T60,30 T90,30 T120,30 T150,30 T180,30 T210,30 T240,30" fill="none" stroke="url(#musicGrad)" strokeWidth="2" />
          <defs>
            <linearGradient id="musicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#06b6d4" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-full border border-blue-500/30 mb-4">
            <span className="text-xl">🎵</span>
            <span className="font-medium text-blue-300">AI Music Composition</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Music Generator</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Create unique AI-generated music in seconds
          </p>
          {/* Sound bars visualization */}
          <div className="flex justify-center gap-1 mt-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="sound-bar w-2 h-8 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-full origin-bottom" />
            ))}
          </div>
        </div>
      </section>

      {/* Genre Selection */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center">Genre</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                className={`option-btn px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${genre === g.id ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.08]'}`}
              >
                <span className="genre-icon">{g.icon}</span>
                <span className="text-sm font-medium">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Mood Selection */}
      <section className="relative z-10 py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center">Mood</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`option-btn px-4 py-2 rounded-xl text-sm font-medium transition-all ${mood === m.id ? `bg-gradient-to-r ${m.color} text-white` : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.08]'}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Prompt Input */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="draggable-form p-8 rounded-3xl bg-white/[0.02] border border-blue-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Describe your music</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A dreamy synth melody with pulsing bass and atmospheric pads..."
              className="w-full h-28 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none mb-4"
            />
            
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Duration: {duration}s</label>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="generate-btn w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              {isGenerating ? '🎵 Composing...' : '✨ Generate Music'}
            </button>
          </div>
        </div>
      </section>

      {/* Generated Tracks */}
      {generatedTracks.length > 0 && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-400">Your Tracks</h2>
              <span className="track-count text-gray-400">{generatedTracks.length} tracks</span>
            </div>
            <div className="space-y-4">
              {generatedTracks.map((track, idx) => (
                <div key={idx} className="track-card p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs text-gray-500">{genres.find(g => g.id === track.genre)?.icon} {genres.find(g => g.id === track.genre)?.name} • {moods.find(m => m.id === track.mood)?.name}</span>
                      <p className="text-white font-medium truncate">{track.prompt}</p>
                    </div>
                    <span className="text-sm text-gray-400">{track.duration}s</span>
                  </div>
                  <audio src={track.url} controls className="w-full h-10" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
