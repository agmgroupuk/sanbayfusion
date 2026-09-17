'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


interface VoiceOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface GeneratedAudio {
  url: string;
  text: string;
  voice: string;
  timestamp: Date;
}

export default function VoiceCloningPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const voices: VoiceOption[] = [
    { id: 'nova', name: 'Nova', description: 'Warm and professional female voice', icon: '👩‍💼', color: 'from-pink-500 to-rose-500' },
    { id: 'orion', name: 'Orion', description: 'Deep and authoritative male voice', icon: '👨‍💼', color: 'from-blue-500 to-indigo-500' },
    { id: 'aurora', name: 'Aurora', description: 'Soft and soothing female voice', icon: '🌸', color: 'from-purple-500 to-violet-500' },
    { id: 'atlas', name: 'Atlas', description: 'Energetic and young male voice', icon: '🎤', color: 'from-cyan-500 to-teal-500' },
    { id: 'sage', name: 'Sage', description: 'Wise and calm neutral voice', icon: '🦉', color: 'from-amber-500 to-orange-500' },
    { id: 'ember', name: 'Ember', description: 'Passionate and expressive voice', icon: '🔥', color: 'from-red-500 to-rose-500' },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/lab/voice-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice })
      });
      const data = await response.json();
      if (data.success && data.audioUrl) {
        setGeneratedAudios(prev => [{
          url: data.audioUrl,
          text,
          voice: selectedVoice,
          timestamp: new Date()
        }, ...prev]);
      }
    } catch (err) {
      console.error('Voice generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      gsap.set(heroTitle.chars, { y: 80, opacity: 0, rotateY: -30 });
      gsap.set('.hero-badge', { x: -50, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' })
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateY: 0, duration: 0.55, stagger: 0.02 }, '-=0.3');

      // 2. ScrambleText on audio count
      gsap.utils.toArray<HTMLElement>('.audio-count').forEach((el) => {
        const originalText = el.textContent || '';
        gsap.to(el, { duration: 1, scrambleText: { text: originalText, chars: '0123456789', speed: 0.5 }, delay: 0.5 });
      });

      // 3. ScrollTrigger for voice cards
      gsap.set('.voice-card', { y: 40, opacity: 0, scale: 0.95 });
      ScrollTrigger.batch('.voice-card', {
        start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(1.3)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 40, opacity: 0, duration: 0.3 })
      });

      // 4. Flip for audio history
      gsap.set('.audio-item', { opacity: 0, x: -20 });

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

      // 6. MotionPath for orbiting microphone
      gsap.to('.orbit-mic', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -35 }, { x: 120, y: 0 }, { x: 60, y: 35 }, { x: 0, y: 0 }],
          curviness: 1.8,
        },
        duration: 12,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on generate button
      gsap.utils.toArray<HTMLElement>('.generate-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.06, duration: 0.5, ease: 'voiceWiggle' });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.3 });
        });
      });

      // 8. DrawSVG for sound wave
      gsap.set('.sound-wave', { drawSVG: '0%' });
      gsap.to('.sound-wave', { drawSVG: '100%', duration: 1.5, delay: 0.5, ease: 'power2.inOut' });

      // 9. Draggable voice cards
      if (window.innerWidth > 768) {
        Draggable.create('.draggable-voice', {
          type: 'x,y',
          bounds: containerRef.current,
          inertia: true,
          onDragEnd: function() {
            gsap.to(this.target, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          }
        });
      }

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.voice-particle').forEach((p, i) => {
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

      // 11. Voice icon pulse
      gsap.utils.toArray<HTMLElement>('.voice-icon').forEach((icon, i) => {
        gsap.to(icon, {
          scale: 1.2,
          duration: 0.7,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.1
        });
      });

      // 12. Waveform animation
      gsap.utils.toArray<HTMLElement>('.waveform-bar').forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: `random(0.3, 1)`,
          duration: 0.25,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.04
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (generatedAudios.length > 0) {
      gsap.to('.audio-item', { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' });
    }
  }, [generatedAudios.length]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/5 w-[520px] h-[520px] bg-purple-500/15 rounded-full blur-[140px]" />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[460px] h-[460px] bg-indigo-500/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="voice-particle absolute w-2 h-2 bg-purple-400/25 rounded-full" style={{ left: `${8 + i * 9}%`, top: `${12 + (i % 5) * 16}%` }} />
        ))}
        <div className="orbit-mic absolute top-32 right-1/4 w-4 h-4 bg-indigo-400/50 rounded-full" />
        <svg className="absolute top-24 left-1/3 w-60 h-16 opacity-30">
          <path className="sound-wave" d="M0,30 Q15,10 30,30 T60,30 T90,30 T120,30 T150,30 T180,30 T210,30 T240,30" fill="none" stroke="url(#voiceGrad)" strokeWidth="2" />
          <defs>
            <linearGradient id="voiceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
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
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-4">
            <span className="text-xl">🎙️</span>
            <span className="font-medium text-purple-300">AI Voice Synthesis</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Voice Cloning</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Generate realistic speech with AI-powered voice synthesis
          </p>
          {/* Waveform visualization */}
          <div className="flex justify-center gap-1 mt-6">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="waveform-bar w-2 h-10 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-full origin-bottom" />
            ))}
          </div>
        </div>
      </section>

      {/* Voice Selection */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold text-center text-gray-400 mb-6">Select a Voice</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`voice-card draggable-voice p-5 rounded-2xl text-left transition-all ${selectedVoice === voice.id ? `bg-gradient-to-br ${voice.color} shadow-lg shadow-purple-500/20` : 'bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30'}`}
              >
                <span className="voice-icon text-3xl block mb-2">{voice.icon}</span>
                <span className="font-bold text-white block">{voice.name}</span>
                <span className="text-xs text-gray-300 opacity-80">{voice.description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Text Input */}
      <section className="relative z-10 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-purple-500/30 backdrop-blur-sm">
            <label className="text-lg font-semibold mb-4 block">Enter text to speak</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hello! I'm an AI-generated voice. I can speak any text you provide with natural intonation and expression."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none mb-4"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">{text.length} characters</span>
              <span className="text-xs text-gray-500">Max 500 characters</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating || text.length > 500}
              className="generate-btn w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              {isGenerating ? '🎙️ Generating...' : '✨ Generate Voice'}
            </button>
          </div>
        </div>
      </section>

      {/* Generated Audios */}
      {generatedAudios.length > 0 && (
        <section className="relative z-10 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-purple-400">Your Generations</h2>
              <span className="audio-count text-gray-400">{generatedAudios.length} clips</span>
            </div>
            <div className="space-y-4">
              {generatedAudios.map((audio, idx) => (
                <div key={idx} className="audio-item p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{voices.find(v => v.id === audio.voice)?.icon}</span>
                      <span className="font-medium text-white">{voices.find(v => v.id === audio.voice)?.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{audio.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{audio.text}</p>
                  <audio src={audio.url} controls className="w-full h-10" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
