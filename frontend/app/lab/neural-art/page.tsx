'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface ArtistStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

interface GeneratedArt {
  url: string;
  style: string;
  timestamp: Date;
}

export default function NeuralArtPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('vangogh');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArt, setGeneratedArt] = useState<GeneratedArt[]>([]);

  const artistStyles: ArtistStyle[] = [
    { id: 'vangogh', name: 'Van Gogh', icon: '🌻', description: 'Swirling brushstrokes and vibrant colors', color: 'from-yellow-500 to-orange-500' },
    { id: 'picasso', name: 'Picasso', icon: '🎭', description: 'Cubist fragmentation and bold forms', color: 'from-blue-500 to-purple-500' },
    { id: 'monet', name: 'Monet', icon: '🌸', description: 'Impressionist light and water lilies', color: 'from-pink-500 to-rose-500' },
    { id: 'dali', name: 'Dalí', icon: '🕰️', description: 'Surrealist dreamscapes and melting forms', color: 'from-amber-500 to-red-500' },
    { id: 'hokusai', name: 'Hokusai', icon: '🌊', description: 'Japanese woodblock waves', color: 'from-cyan-500 to-blue-500' },
    { id: 'klimt', name: 'Klimt', icon: '✨', description: 'Golden patterns and ornate designs', color: 'from-yellow-500 to-amber-500' },
    { id: 'warhol', name: 'Warhol', icon: '🎨', description: 'Pop art colors and repetition', color: 'from-pink-500 to-cyan-500' },
    { id: 'munch', name: 'Munch', icon: '😱', description: 'Expressionist emotion and distortion', color: 'from-red-500 to-orange-500' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/neural-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage, style: selectedStyle })
      });
      const data = await response.json();
      if (data.success && data.artUrl) {
        setGeneratedArt(prev => [{
          url: data.artUrl,
          style: selectedStyle,
          timestamp: new Date()
        }, ...prev]);
      }
    } catch (err) {
      console.error('Neural art error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateX: -60 });
      gsap.set('.hero-badge', { scale: 0.5, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, duration: 0.55, stagger: 0.022 }, '-=0.3');

      // 2. ScrambleText on artist names
      gsap.utils.toArray<HTMLElement>('.artist-name').forEach((el, i) => {
        const originalText = el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          onEnter: () => {
            gsap.to(el, { duration: 0.6, scrambleText: { text: originalText, chars: 'ARTGOLDEN', speed: 0.5 }, delay: i * 0.05 });
          }
        });
      });

      // 3. ScrollTrigger for style cards
      gsap.set('.style-card', { y: 40, opacity: 0, rotateY: -15 });
      ScrollTrigger.batch('.style-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, rotateY: 0, duration: 0.5, stagger: 0.07, ease: 'back.out(1.3)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 40, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for gallery
      gsap.set('.art-piece', { opacity: 0, scale: 0.85 });

      // 5. Observer parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.14, rotation: scrollY * 0.01, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.1, rotation: scrollY * -0.008, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting palette
      gsap.to('.orbit-palette', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 65, y: -35 }, { x: 130, y: 0 }, { x: 65, y: 35 }, { x: 0, y: 0 }],
          curviness: 1.8,
        },
        duration: 16,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on transform button
      gsap.utils.toArray<HTMLElement>('.transform-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, rotation: 3, duration: 0.5, ease: 'artWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, rotation: 0, duration: 0.3 });
        });
      });

      // 8. DrawSVG for frame decoration
      gsap.set('.art-frame', { drawSVG: '0%' });
      gsap.to('.art-frame', { drawSVG: '100%', duration: 1.5, delay: 0.6, ease: 'power2.inOut' });

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
      gsap.utils.toArray<HTMLElement>('.art-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-50, 50)`,
          y: `random(-45, 45)`,
          rotation: `random(-45, 45)`,
          duration: `random(6, 10)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });

      // 11. Style icon hover
      gsap.utils.toArray<HTMLElement>('.style-icon').forEach((icon) => {
        gsap.to(icon, {
          scale: 1.2,
          rotation: 10,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      });

      // 12. Upload zone pulse
      gsap.to('.upload-zone', {
        boxShadow: '0 0 30px rgba(249, 115, 22, 0.2)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (generatedArt.length > 0) {
      gsap.to('.art-piece', { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.3)' });
    }
  }, [generatedArt.length]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-orange-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[460px] h-[460px] bg-amber-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(249, 115, 22, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="art-particle absolute w-2 h-2 bg-orange-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-palette absolute top-32 right-1/4 w-4 h-4 bg-amber-400/50 rounded-full" />
        <svg className="absolute top-20 right-1/3 w-32 h-32 opacity-20">
          <rect className="art-frame" x="5" y="5" width="110" height="110" fill="none" stroke="url(#artGrad)" strokeWidth="3" />
          <defs>
            <linearGradient id="artGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-4">
            <span className="text-xl">🖼️</span>
            <span className="font-medium text-orange-300">AI Style Transfer</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Neural Art</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transform your photos into masterpieces in the style of famous artists
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <label className="upload-zone block cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className={`p-8 rounded-3xl border-2 border-dashed transition-all text-center ${uploadedImage ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-orange-500/30'}`}>
              {uploadedImage ? (
                <div className="relative">
                  <img src={uploadedImage} alt="Uploaded" className="max-h-64 mx-auto rounded-xl" />
                  <p className="text-gray-400 text-sm mt-3">Click to change image</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📤</div>
                  <p className="text-white font-semibold mb-2">Upload an image</p>
                  <p className="text-gray-400 text-sm">Click or drag and drop your photo here</p>
                </>
              )}
            </div>
          </label>
        </div>
      </section>

      {/* Artist Styles */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold text-center text-gray-400 mb-6">Choose an Artist Style</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {artistStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`style-card draggable-style p-4 rounded-2xl text-left transition-all ${selectedStyle === style.id ? `bg-gradient-to-br ${style.color} shadow-lg` : 'bg-white/[0.02] border border-white/[0.06] hover:border-orange-500/30'}`}
              >
                <span className="style-icon text-3xl block mb-2">{style.icon}</span>
                <span className="artist-name font-bold text-white block">{style.name}</span>
                <span className="text-xs text-gray-300 opacity-80">{style.description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Generate Button */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleGenerate}
            disabled={!uploadedImage || isGenerating}
            className="transform-btn w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            {isGenerating ? '🎨 Transforming...' : '✨ Create Art'}
          </button>
        </div>
      </section>

      {/* Gallery */}
      {generatedArt.length > 0 && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-orange-400 mb-6">Your Creations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedArt.map((art, idx) => (
                <div key={idx} className="art-piece rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                  <div className="aspect-square bg-white/[0.04] relative">
                    <img src={art.url} alt="Generated art" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs bg-gradient-to-r ${artistStyles.find(s => s.id === art.style)?.color || 'from-gray-500 to-gray-600'}`}>
                        {artistStyles.find(s => s.id === art.style)?.icon} {artistStyles.find(s => s.id === art.style)?.name}
                      </span>
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
