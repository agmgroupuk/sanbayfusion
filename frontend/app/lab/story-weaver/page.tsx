'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface StoryMetrics {
  words: number;
  chapters: number;
  characters: number;
  readTime: string;
}

interface StoryGenre {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function StoryWeaverPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [storyPrompt, setStoryPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('fantasy');
  const [story, setStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState<StoryMetrics>({ words: 0, chapters: 0, characters: 0, readTime: '0 min' });

  const genres: StoryGenre[] = [
    { id: 'fantasy', name: 'Fantasy', icon: '🐉', color: 'from-purple-500 to-violet-500' },
    { id: 'scifi', name: 'Sci-Fi', icon: '🚀', color: 'from-cyan-500 to-blue-500' },
    { id: 'romance', name: 'Romance', icon: '💕', color: 'from-pink-500 to-rose-500' },
    { id: 'mystery', name: 'Mystery', icon: '🔍', color: 'from-amber-500 to-orange-500' },
    { id: 'horror', name: 'Horror', icon: '👻', color: 'from-red-500 to-rose-500' },
    { id: 'adventure', name: 'Adventure', icon: '⚔️', color: 'from-emerald-500 to-teal-500' },
  ];

  const calculateMetrics = useCallback((text: string): StoryMetrics => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chapters = (text.match(/chapter/gi) || []).length || 1;
    const characters = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chapters, characters, readTime: `${readTime} min` };
  }, []);

  const handleGenerate = async () => {
    if (!storyPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/story-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: storyPrompt, genre: selectedGenre })
      });
      const data = await response.json();
      if (data.success && data.story) {
        setStory(data.story);
        setMetrics(calculateMetrics(data.story));
      }
    } catch (err) {
      console.error('Story generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!story.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/story-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: storyPrompt, genre: selectedGenre, continuation: story })
      });
      const data = await response.json();
      if (data.success && data.story) {
        setStory(prev => prev + '\n\n' + data.story);
        setMetrics(calculateMetrics(story + '\n\n' + data.story));
      }
    } catch (err) {
      console.error('Story continuation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 70, opacity: 0, rotateX: -50 });
      gsap.set('.hero-badge', { scale: 0.5, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.55, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on metrics
      gsap.utils.toArray<HTMLElement>('.metric-value').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 0.7, scrambleText: { text: originalText, chars: '0123456789', speed: 0.5 }, delay: i * 0.08 });
          }
        });
      });

      // 3. ScrollTrigger for genre buttons
      gsap.set('.genre-btn', { y: 25, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.genre-btn', {
        start: 'top 95%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.4)' })
      });

      // 4. Flip for story panel
      gsap.set('.story-panel', { opacity: 0, y: 30 });

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

      // 6. MotionPath for orbiting quill
      gsap.to('.orbit-quill', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 55, y: -30 }, { x: 110, y: 0 }, { x: 55, y: 30 }, { x: 0, y: 0 }],
          curviness: 1.6,
        },
        rotation: 30,
        duration: 14,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on generate button
      gsap.utils.toArray<HTMLElement>('.generate-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.05, duration: 0.5, ease: 'storyWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for book decoration
      gsap.set('.book-line', { drawSVG: '0%' });
      gsap.to('.book-line', { drawSVG: '100%', duration: 1.2, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable prompt panel
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-prompt', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.story-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-45, 45)`,
          duration: `random(6, 10)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Genre icon animations
      gsap.utils.toArray<HTMLElement>('.genre-icon').forEach((icon, i) => {
        gsap.to(icon, {
          scale: 1.25,
          rotation: 10,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.1
        });
      });

      // 12. Typing cursor blink
      gsap.to('.typing-cursor', {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (story) {
      gsap.to('.story-panel', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)' });
    }
  }, [story]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-emerald-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[460px] h-[460px] bg-teal-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="story-particle absolute w-2 h-2 bg-emerald-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-quill absolute top-32 right-1/4 w-3 h-3 bg-teal-400/50 rounded-full" />
        <svg className="absolute top-24 left-1/4 w-32 h-40 opacity-20">
          <path className="book-line" d="M10,10 L10,120 M10,10 C40,15 60,15 90,10 M10,120 C40,125 60,125 90,120" fill="none" stroke="url(#storyGrad)" strokeWidth="2" />
          <defs>
            <linearGradient id="storyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0d9488" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-4">
            <span className="text-xl">📖</span>
            <span className="font-medium text-emerald-300">AI Story Generation</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Story Weaver</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Create interactive stories with AI as your co-author
          </p>
        </div>
      </section>

      {/* Genre Selection */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 text-center">Choose a Genre</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`genre-btn px-5 py-2 rounded-xl flex items-center gap-2 transition-all ${selectedGenre === genre.id ? `bg-gradient-to-r ${genre.color} text-white` : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.08]'}`}
              >
                <span className="genre-icon">{genre.icon}</span>
                <span className="font-medium">{genre.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Prompt Input */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="draggable-prompt p-8 rounded-3xl bg-white/[0.02] border border-emerald-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Start your story</label>
            <textarea
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              placeholder="In a world where magic flows through ancient rivers, a young apprentice discovers..."
              className="w-full h-28 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none mb-4"
            />
            <button
              onClick={handleGenerate}
              disabled={!storyPrompt.trim() || isGenerating}
              className="generate-btn w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              {isGenerating ? '✍️ Writing...' : '✨ Generate Story'}
            </button>
          </div>
        </div>
      </section>

      {/* Story Output */}
      {story && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <span className="metric-value text-xl font-bold text-emerald-400">{metrics.words}</span>
                <p className="text-xs text-gray-400">Words</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <span className="metric-value text-xl font-bold text-teal-400">{metrics.chapters}</span>
                <p className="text-xs text-gray-400">Chapters</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <span className="metric-value text-xl font-bold text-cyan-400">{metrics.characters}</span>
                <p className="text-xs text-gray-400">Characters</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <span className="metric-value text-xl font-bold text-sky-400">{metrics.readTime}</span>
                <p className="text-xs text-gray-400">Read Time</p>
              </div>
            </div>

            {/* Story Panel */}
            <div className="story-panel p-8 rounded-3xl bg-white/[0.02] border border-emerald-500/30 backdrop-blur-sm">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">{story}<span className="typing-cursor text-emerald-400">|</span></div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleContinue}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                >
                  ➡️ Continue Story
                </button>
                <button
                  onClick={() => { setStory(''); setMetrics({ words: 0, chapters: 0, characters: 0, readTime: '0 min' }); }}
                  className="px-6 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-gray-400 font-medium hover:bg-white/[0.08] transition-all"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
