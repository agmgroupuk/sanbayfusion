'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FileJson, Check, Copy, Trash2, Wand2, Minimize2, SplitSquareHorizontal, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, MotionPathPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, MotionPathPlugin, CustomWiggle, CustomEase);

export default function JsonFormatterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMinified, setCopiedMinified] = useState(false);
  const [indent, setIndent] = useState(2);
  const [applied, setApplied] = useState(false);

  const formatted = useMemo(() => {
    if (!input.trim()) {
      setError(null);
      return '';
    }
    try {
      const parsed = JSON.parse(input);
      setError(null);
      return JSON.stringify(parsed, null, indent);
    } catch (e: any) {
      setError(e.message);
      return '';
    }
  }, [input, indent]);

  const minified = useMemo(() => {
    try {
      if (!input.trim()) return '';
      return JSON.stringify(JSON.parse(input));
    } catch {
      return '';
    }
  }, [input]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('jsonWiggle', { wiggles: 6, type: 'easeOut' });
      CustomEase.create('jsonBounce', 'M0,0 C0.14,0 0.27,0.9 0.5,1 0.73,1.1 0.86,1 1,1');

      // Background orbs
      gsap.to('.json-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating JSON symbols
      const symbols = document.querySelectorAll('.floating-json-symbol');
      symbols.forEach((symbol, i) => {
        gsap.to(symbol, {
          y: -25 - i * 5,
          rotation: i % 2 === 0 ? 10 : -10,
          duration: 3 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // SplitText title
      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars' });
        gsap.from(split.chars, {
          opacity: 0,
          y: 50,
          rotationX: -90,
          scale: 0.5,
          stagger: 0.03,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: 0.2,
        });
      }

      // Hero icon pulse
      gsap.to('.hero-json-icon', {
        boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Input/output panels
      gsap.from('.json-panel', {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

      // Action buttons
      gsap.from('.action-btn', {
        opacity: 0,
        scale: 0.8,
        stagger: 0.08,
        duration: 0.4,
        delay: 0.8,
        ease: 'back.out(1.7)',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const copy = async (text: string, type: 'formatted' | 'minified') => {
    await navigator.clipboard.writeText(text);
    
    const setFn = type === 'formatted' ? setCopied : setCopiedMinified;
    setFn(true);

    // Success animation
    const btn = document.querySelector(`.copy-btn-${type}`);
    if (btn) {
      gsap.to(btn, {
        scale: 1.2,
        duration: 0.2,
        ease: 'back.out(1.7)',
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.2 }),
      });

      // Confetti effect
      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-2 h-2 rounded-full pointer-events-none';
        particle.style.backgroundColor = ['#60a5fa', '#34d399', '#a78bfa', '#f472b6'][i % 4];
        btn.appendChild(particle);
        
        gsap.fromTo(particle,
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: (Math.random() - 0.5) * 100,
            y: -50 - Math.random() * 50,
            opacity: 0,
            scale: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => particle.remove(),
          }
        );
      }
    }

    setTimeout(() => setFn(false), 2000);
  };

  const applyFormatted = () => {
    if (!formatted || error) return;

    // Apply animation
    const inputArea = document.querySelector('.input-textarea');
    if (inputArea) {
      gsap.to(inputArea, {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        duration: 0.2,
        onComplete: () => {
          setInput(formatted);
          setApplied(true);
          gsap.to(inputArea, { backgroundColor: 'transparent', duration: 0.5, delay: 0.3 });
        },
      });
    } else {
      setInput(formatted);
      setApplied(true);
    }

    setTimeout(() => setApplied(false), 2000);
  };

  const loadExample = () => {
    const example = JSON.stringify({
      user: { id: 123, name: 'Jane Doe', email: 'jane@example.com' },
      roles: ['admin', 'editor', 'viewer'],
      active: true,
      preferences: { theme: 'dark', notifications: true },
      meta: { createdAt: new Date().toISOString(), version: '1.0.0' },
    }, null, 2);

    // Typewriter effect for example
    setInput('');
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < example.length) {
        setInput(example.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 5);
  };

  const clearInput = () => {
    // Fade out animation
    const textarea = document.querySelector('.input-textarea');
    if (textarea) {
      gsap.to(textarea, {
        opacity: 0.5,
        duration: 0.2,
        onComplete: () => {
          setInput('');
          gsap.to(textarea, { opacity: 1, duration: 0.2 });
        },
      });
    } else {
      setInput('');
    }
  };

  // Error shake animation
  useEffect(() => {
    if (error) {
      const errorBox = document.querySelector('.error-box');
      if (errorBox) {
        gsap.from(errorBox, {
          x: -10,
          duration: 0.1,
          repeat: 5,
          yoyo: true,
          ease: 'power2.inOut',
        });
      }
    }
  }, [error]);

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="json-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-[100px]" />
        <div className="json-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-purple-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['{ }', '[ ]', '" "', ': ,', 'true', 'null'].map((symbol, i) => (
          <div
            key={i}
            className="floating-json-symbol absolute text-xl font-mono text-white/10"
            style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
          >
            {symbol}
          </div>
        ))}
      </div>

      {/* Hero Header */}
      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6">
            <div className="hero-json-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center">
              <FileJson className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>JSON Formatter</span>
              </h1>
              <p className="text-gray-400">
                Format, validate, minify, and beautify JSON in real-time
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="json-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Input JSON</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadExample}
                  className="action-btn px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  Example
                </button>
                <button
                  onClick={clearInput}
                  className="action-btn px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='{"key": "value"}'
              className="input-textarea w-full h-[420px] bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 text-gray-300 font-mono text-sm placeholder-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
            />

            {error && (
              <div className="error-box mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Invalid JSON</p>
                  <p className="text-red-300/70 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="json-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Formatted Output</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Indent</span>
                <select
                  value={indent}
                  onChange={(e) => setIndent(parseInt(e.target.value))}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-1.5 text-white text-sm focus:border-blue-500/50 outline-none"
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => copy(formatted, 'formatted')}
                disabled={!formatted}
                className="copy-btn-formatted action-btn relative px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-visible"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
              <button
                onClick={() => copy(minified, 'minified')}
                disabled={!minified}
                className="copy-btn-minified action-btn relative px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-visible"
              >
                {copiedMinified ? <Check className="w-4 h-4 text-green-400" /> : <Minimize2 className="w-4 h-4" />}
                Minified
              </button>
              <button
                onClick={applyFormatted}
                disabled={!input.trim() || !!error}
                className="action-btn px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applied ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                Apply
              </button>
            </div>

            <pre className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 overflow-auto h-[380px] text-sm">
              <code className="text-gray-300 font-mono whitespace-pre">
                {formatted || (
                  <span className="text-gray-600">/* Valid JSON will appear here */</span>
                )}
              </code>
            </pre>

            {/* Stats */}
            {formatted && (
              <div className="flex gap-4 mt-4 text-sm text-gray-400">
                <span>Characters: {formatted.length}</span>
                <span>Lines: {formatted.split('\n').length}</span>
                {minified && <span>Minified: {minified.length} chars</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
