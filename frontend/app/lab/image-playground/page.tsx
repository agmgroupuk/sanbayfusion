'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface GeneratedImage {
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
}

export default function ImagePlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const styles = [
    { id: 'realistic', name: 'Realistic', icon: '📷', color: 'from-gray-500 to-slate-500' },
    { id: 'artistic', name: 'Artistic', icon: '🎨', color: 'from-pink-500 to-rose-500' },
    { id: 'anime', name: 'Anime', icon: '🌸', color: 'from-purple-500 to-fuchsia-500' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆', color: 'from-cyan-500 to-blue-500' },
    { id: 'fantasy', name: 'Fantasy', icon: '🧙', color: 'from-emerald-500 to-teal-500' },
    { id: 'vintage', name: 'Vintage', icon: '📻', color: 'from-amber-500 to-orange-500' },
    { id: '3d', name: '3D Render', icon: '💎', color: 'from-blue-500 to-indigo-500' },
    { id: 'watercolor', name: 'Watercolor', icon: '🎭', color: 'from-sky-500 to-cyan-500' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: selectedStyle })
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setGeneratedImages(prev => [{
          url: data.imageUrl,
          prompt,
          style: selectedStyle,
          timestamp: new Date()
        }, ...prev]);
      }
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 70, opacity: 0, rotateZ: -15, scale: 0.85 });
      gsap.set('.hero-badge', { scale: 0.6, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateZ: 0, scale: 1, duration: 0.5, stagger: 0.02 }, '-=0.2');

      // 2. ScrambleText on generation count
      gsap.utils.toArray<HTMLElement>('.gen-count').forEach((el) => {
        const originalText = el.textContent || '';
        gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789', speed: 0.5 }, delay: 0.5 });
      });

      // 3. ScrollTrigger for style cards
      gsap.set('.style-card', { y: 30, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.style-card', {
        start: 'top 92%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.4)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 30, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for gallery images
      gsap.set('.gallery-image', { opacity: 0, scale: 0.85 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.14, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting paintbrush
      gsap.to('.orbit-brush', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -35 }, { x: 120, y: 0 }, { x: 60, y: 35 }, { x: 0, y: 0 }],
          curviness: 1.8,
        },
        duration: 14,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on generate button
      gsap.utils.toArray<HTMLElement>('.generate-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, rotation: 2, duration: 0.5, ease: 'imageWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, rotation: 0, duration: 0.3 });
        });
      });

      // 8. DrawSVG for frame decoration
      gsap.set('.frame-line', { drawSVG: '0%' });
      gsap.to('.frame-line', { drawSVG: '100%', duration: 1.2, delay: 0.6, ease: 'power2.inOut' });

      // 9. Draggable style cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-style', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.image-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-40, 40)`,
          rotation: `random(-30, 30)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Style icon animations
      gsap.utils.toArray<HTMLElement>('.style-icon').forEach((icon, i) => {
        gsap.to(icon, {
          scale: 1.2,
          rotation: 15,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.15
        });
      });

      // 12. Loading spinner
      gsap.to('.loading-spinner', {
        rotation: 360,
        duration: 1.5,
        repeat: -1,
        ease: 'none'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (generatedImages.length > 0) {
      gsap.to('.gallery-image', { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.3)' });
    }
  }, [generatedImages.length]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-pink-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[480px] h-[480px] bg-rose-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(236, 72, 153, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(236, 72, 153, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="image-particle absolute w-2 h-2 bg-pink-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-brush absolute top-32 right-1/4 w-3 h-3 bg-rose-400/50 rounded-full" />
        <svg className="absolute top-20 right-1/3 w-40 h-40 opacity-20">
          <rect className="frame-line" x="10" y="10" width="120" height="120" fill="none" stroke="url(#imageGrad)" strokeWidth="2" />
          <defs>
            <linearGradient id="imageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f43f5e" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 backdrop-blur-sm rounded-full border border-pink-500/30 mb-4">
            <span className="text-xl">🎨</span>
            <span className="font-medium text-pink-300">AI Image Generation</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Image Playground</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Create stunning AI-generated images in any style
          </p>
        </div>
      </section>

      {/* Style Selection */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-center text-gray-400">Choose a Style</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`style-card draggable-style px-5 py-3 rounded-xl flex items-center gap-2 transition-all ${selectedStyle === style.id ? `bg-gradient-to-r ${style.color} text-white shadow-lg` : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:bg-white/[0.08]'}`}
              >
                <span className="style-icon text-lg">{style.icon}</span>
                <span className="font-medium">{style.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Prompt Input */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-pink-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Describe your image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A serene mountain lake at sunset with purple clouds reflecting on crystal clear water..."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-colors resize-none mb-4"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="generate-btn w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <span className="loading-spinner inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  Generating...
                </>
              ) : (
                '✨ Generate Image'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Gallery */}
      {generatedImages.length > 0 && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-pink-400">Generated Images</h2>
              <span className="gen-count text-gray-400">{generatedImages.length} images</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((img, idx) => (
                <div key={idx} className="gallery-image rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                  <div className="aspect-square bg-white/[0.04] relative">
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs bg-gradient-to-r ${styles.find(s => s.id === img.style)?.color || 'from-gray-500 to-gray-600'} mb-1`}>
                        {styles.find(s => s.id === img.style)?.name}
                      </span>
                      <p className="text-white text-xs truncate">{img.prompt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
