'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Gauge, ArrowLeft, Play, Loader2, Download, Upload, Zap, Wifi, BarChart3 } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface SpeedResult {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  server: {
    name: string;
    location: string;
    country: string;
  };
  isp: string;
  ip: string;
}

export default function SpeedTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const [testing, setTesting] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
  const [data, setData] = useState<SpeedResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('speedWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.speed-gradient-orb', {
        x: 'random(-70, 70)',
        y: 'random(-35, 35)',
        scale: 'random(0.85, 1.2)',
        duration: 7,
        ease: 'sine.inOut',
        stagger: { each: 0.9, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-speed-symbol');
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

      gsap.to('.hero-speed-icon', {
        boxShadow: '0 0 60px rgba(59, 130, 246, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.speed-gauge', {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        delay: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });

      gsap.to('.gauge-needle', {
        rotation: -90,
        transformOrigin: 'bottom center',
        duration: 0,
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const runSpeedTest = async () => {
    const btn = document.querySelector('.start-btn');
    if (btn) {
      gsap.to(btn, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' }),
      });
    }

    setTesting(true);
    setError('');
    setData(null);
    setProgress(0);
    setCurrentSpeed(0);

    try {
      // Ping phase — show gauge activity while API runs
      setPhase('ping');
      setProgress(0);

      // Animate progress during API call
      let animProgress = 0;
      const progressInterval = setInterval(() => {
        animProgress = Math.min(animProgress + 2, 90);
        setProgress(animProgress);
        const simSpeed = animProgress * 1.5;
        setCurrentSpeed(simSpeed);
        gsap.to('.gauge-needle', {
          rotation: -90 + (Math.min(simSpeed, 200) / 200) * 180,
          duration: 0.3,
          ease: 'power2.out',
        });

        // Cycle through phases based on progress
        if (animProgress > 30 && animProgress <= 65) setPhase('download');
        else if (animProgress > 65) setPhase('upload');
      }, 150);

      // Call real speed test API
      const response = await fetch('/api/tools/speed-test', { method: 'POST' });
      const json = await response.json();

      clearInterval(progressInterval);

      if (!json.success) {
        throw new Error('Speed test API returned an error');
      }

      const apiData = json.data;

      // Finish progress animation
      setProgress(100);
      setPhase('complete');

      const result: SpeedResult = {
        download: Math.round(apiData.downloadSpeed * 100) / 100,
        upload: Math.round(apiData.uploadSpeed * 100) / 100,
        ping: Math.round(apiData.latency * 100) / 100,
        jitter: Math.round(apiData.jitter * 100) / 100,
        server: {
          name: apiData.server || 'Cloudflare',
          location: 'Edge',
          country: 'Global',
        },
        isp: 'Detected',
        ip: '',
      };

      setData(result);
      setCurrentSpeed(result.download);

      gsap.to('.gauge-needle', {
        rotation: -90 + (Math.min(result.download, 200) / 200) * 180,
        duration: 0.6,
        ease: 'power2.out',
      });

      // Animate results
      setTimeout(() => {
        gsap.from('.result-card', {
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power2.out',
        });
      }, 100);

    } catch (err) {
      setError('Speed test failed. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 100) return 'text-green-400';
    if (speed >= 50) return 'text-yellow-400';
    if (speed >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="speed-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-[100px]" />
        <div className="speed-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-purple-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['Mbps', 'ms', 'Ping', 'DL', 'UL', 'Jitter'].map((sym, i) => (
          <div
            key={i}
            className="floating-speed-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-speed-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center">
              <Gauge className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Speed Test</span>
              </h1>
              <p className="text-gray-400">
                Measure your internet connection speed
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Wifi className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="speed-gauge relative bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 mb-8">
            <div className="flex flex-col items-center">
              {/* Speed Gauge */}
              <div className="relative w-64 h-32 mb-6">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 90 A 80 80 0 0 1 180 90"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 20 90 A 80 80 0 0 1 180 90"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="251"
                    strokeDashoffset={251 - (251 * Math.min(currentSpeed, 200)) / 200}
                  />
                </svg>
                <div className="gauge-needle absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-20 bg-white rounded-full origin-bottom" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full" />
              </div>

              <div className="text-center mb-6">
                <p className={`text-5xl font-bold ${getSpeedColor(currentSpeed)}`}>
                  {currentSpeed.toFixed(1)}
                </p>
                <p className="text-gray-400">Mbps</p>
              </div>

              {testing && (
                <div className="w-full max-w-md mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 capitalize flex items-center gap-2">
                      {phase === 'ping' && <Zap className="w-4 h-4 text-yellow-400" />}
                      {phase === 'download' && <Download className="w-4 h-4 text-blue-400" />}
                      {phase === 'upload' && <Upload className="w-4 h-4 text-purple-400" />}
                      {phase}...
                    </span>
                    <span className="text-gray-400">{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${phase === 'download' ? 'bg-blue-500' : phase === 'upload' ? 'bg-purple-500' : 'bg-yellow-500'
                        }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={runSpeedTest}
                disabled={testing}
                className="start-btn px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {testing ? 'Testing...' : 'Start Test'}
              </button>
            </div>
          </div>

          {data && phase === 'complete' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="result-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center">
                <Download className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <p className={`text-3xl font-bold ${getSpeedColor(data.download)}`}>
                  {data.download.toFixed(1)}
                </p>
                <p className="text-sm text-gray-400">Download Mbps</p>
              </div>
              <div className="result-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center">
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <p className={`text-3xl font-bold ${getSpeedColor(data.upload)}`}>
                  {data.upload.toFixed(1)}
                </p>
                <p className="text-sm text-gray-400">Upload Mbps</p>
              </div>
              <div className="result-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center">
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <p className="text-3xl font-bold text-white">{data.ping.toFixed(0)}</p>
                <p className="text-sm text-gray-400">Ping ms</p>
              </div>
              <div className="result-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center">
                <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <p className="text-3xl font-bold text-white">{data.jitter.toFixed(1)}</p>
                <p className="text-sm text-gray-400">Jitter ms</p>
              </div>
            </div>
          )}

          {data && phase === 'complete' && (
            <div className="result-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">Connection Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-[#0d0d12] rounded-lg">
                  <p className="text-gray-400">Server</p>
                  <p className="text-white">{data.server.name}</p>
                  <p className="text-gray-500">{data.server.location}, {data.server.country}</p>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg">
                  <p className="text-gray-400">ISP</p>
                  <p className="text-white">{data.isp}</p>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg">
                  <p className="text-gray-400">Your IP</p>
                  <p className="text-white font-mono">{data.ip}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
