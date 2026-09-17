'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Binary, ArrowLeft, Copy, Check, ArrowRightLeft, Trash2, Sparkles, FileText, Code } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, Flip, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, Flip, CustomWiggle, CustomEase);

export default function Base64Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('base64Wiggle', { wiggles: 6, type: 'easeOut' });

      // Background orbs
      gsap.to('.base64-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-base64-symbol');
      symbols.forEach((el, i) => {
        gsap.to(el, {
          y: -20 - i * 5,
          rotation: i % 2 === 0 ? 10 : -10,
          duration: 3 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // Floating binary
      const binaries = document.querySelectorAll('.floating-binary');
      binaries.forEach((el, i) => {
        gsap.to(el, {
          y: -20 - i * 5,
          opacity: 0.15,
          duration: 3 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // Title animation
      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars' });
        gsap.from(split.chars, {
          opacity: 0,
          y: 50,
          rotationX: -90,
          stagger: 0.03,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: 0.2,
        });
      }

      // Hero icon
      gsap.to('.hero-base64-icon', {
        boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Panels
      gsap.from('.base64-panel', {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Process on input change
  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      setError('');
      return;
    }

    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
        setError('');
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
        setError('');
      }
    } catch (e) {
      setError(mode === 'decode' ? 'Invalid Base64 string' : 'Failed to encode');
      setOutput('');
    }
  }, [input, mode]);

  const handleModeSwitch = () => {
    const state = Flip.getState('.mode-indicator');
    const newMode = mode === 'encode' ? 'decode' : 'encode';

    // Switch animation
    gsap.to('.switch-btn', {
      rotation: 180,
      duration: 0.4,
      ease: 'back.out(1.7)',
      onComplete: () => gsap.set('.switch-btn', { rotation: 0 }),
    });

    setMode(newMode);
    setInput(output);
    setOutput('');
    setError('');

    requestAnimationFrame(() => {
      Flip.from(state, { duration: 0.3, ease: 'power2.out' });
    });
  };

  const copyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);

    // Animation
    const btn = document.querySelector('.copy-output-btn');
    if (btn) {
      gsap.to(btn, {
        scale: 1.2,
        duration: 0.2,
        ease: 'back.out(1.7)',
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.2 }),
      });
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    gsap.to('.input-area, .output-area', {
      opacity: 0.5,
      duration: 0.2,
      onComplete: () => {
        setInput('');
        setOutput('');
        setError('');
        gsap.to('.input-area, .output-area', { opacity: 1, duration: 0.2 });
      },
    });
  };

  const loadExample = () => {
    const example = mode === 'encode'
      ? 'Hello, World! This is a test message for Base64 encoding.'
      : 'SGVsbG8sIFdvcmxkISBUaGlzIGlzIGEgdGVzdCBtZXNzYWdlIGZvciBCYXNlNjQgZW5jb2Rpbmcu';

    setInput('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < example.length) {
        setInput(example.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 10);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="base64-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-[100px]" />
        <div className="base64-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-violet-600/15 to-indigo-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['aGVs', 'bG8=', 'QkF', 'U0U2', 'NA==', 'Zg=='].map((sym, i) => (
          <div
            key={i}
            className="floating-base64-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      {/* Floating Binary */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['01101', '10010', '11001', '00110', '10101', '01010'].map((bin, i) => (
          <div
            key={i}
            className="floating-binary absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {bin}
          </div>
        ))}
      </div>

      {/* Hero */}
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
            <div className="hero-base64-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center">
              <Binary className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Base64 Encoder/Decoder</span>
              </h1>
              <p className="text-gray-400">
                Encode text to Base64 or decode Base64 strings instantly
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 p-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <button
              onClick={() => mode !== 'encode' && handleModeSwitch()}
              className={`mode-indicator px-6 py-3 rounded-xl font-semibold transition-all ${mode === 'encode'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Encode
            </button>

            <button
              onClick={handleModeSwitch}
              className="switch-btn p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => mode !== 'decode' && handleModeSwitch()}
              className={`mode-indicator px-6 py-3 rounded-xl font-semibold transition-all ${mode === 'decode'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <Code className="w-4 h-4 inline mr-2" />
              Decode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="base64-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {mode === 'encode' ? 'Text Input' : 'Base64 Input'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={loadExample}
                  className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <Sparkles className="w-3 h-3" />
                  Example
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-gray-300 hover:text-white rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
              className="input-area w-full h-[300px] bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 text-gray-300 font-mono text-sm placeholder-gray-600 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none transition-all"
            />

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {input && !error && (
              <div className="mt-4 text-sm text-gray-400">
                Input length: {input.length} characters
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="base64-panel bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
              </h2>
              <button
                onClick={copyOutput}
                disabled={!output}
                className="copy-output-btn px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="output-area w-full h-[300px] bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 overflow-auto">
              {output ? (
                <code className="text-gray-300 font-mono text-sm break-all whitespace-pre-wrap">
                  {output}
                </code>
              ) : (
                <span className="text-gray-600 font-mono text-sm">
                  {mode === 'encode' ? '/* Encoded Base64 will appear here */' : '/* Decoded text will appear here */'}
                </span>
              )}
            </div>

            {output && (
              <div className="mt-4 text-sm text-gray-400">
                Output length: {output.length} characters
                {mode === 'encode' && input && (
                  <span className="ml-4">
                    Size increase: {((output.length / input.length - 1) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-3">About Base64</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Base64 is a binary-to-text encoding scheme that represents binary data in ASCII string format.
            It&apos;s commonly used for encoding data in URLs, email attachments, and embedding images in HTML/CSS.
            The encoded output is approximately 33% larger than the original data.
          </p>
        </div>
      </div>
    </div>
  );
}
