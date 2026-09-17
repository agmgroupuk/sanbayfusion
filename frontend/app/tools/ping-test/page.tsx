'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Radio, ArrowLeft, Play, Loader2, Copy, Check, Globe, Zap, Clock, BarChart3 } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface PingResult {
  success: boolean;
  host: string;
  ip: string;
  results: {
    seq: number;
    time: number;
    ttl: number;
    status: 'success' | 'timeout' | 'error';
  }[];
  stats: {
    transmitted: number;
    received: number;
    lost: number;
    lossPercent: number;
    min: number;
    max: number;
    avg: number;
  };
}

export default function PingTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [host, setHost] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PingResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('pingWiggle', { wiggles: 8, type: 'easeOut' });

      gsap.to('.ping-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-25, 25)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.6, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-ping-symbol');
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

      gsap.to('.hero-ping-icon', {
        boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.test-form', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

      gsap.to('.pulse-ring', {
        scale: 2,
        opacity: 0,
        duration: 1.5,
        repeat: -1,
        ease: 'power2.out',
        stagger: 0.5,
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handlePing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;

    const btn = document.querySelector('.ping-btn');
    if (btn) {
      gsap.to(btn, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => gsap.to(btn, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' }),
      });
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/tools/ping-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host.trim(), count }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.ping-result-row', {
            opacity: 0,
            x: -20,
            stagger: 0.08,
            duration: 0.4,
            ease: 'power2.out',
          });
          gsap.from('.stats-card', {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Ping test failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getLatencyColor = (time: number) => {
    if (time < 50) return 'text-green-400';
    if (time < 100) return 'text-yellow-400';
    if (time < 200) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLatencyBg = (time: number) => {
    if (time < 50) return 'bg-green-500';
    if (time < 100) return 'bg-yellow-500';
    if (time < 200) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const copyResults = async () => {
    if (!data) return;
    const text = data.results.map(r => `seq=${r.seq} time=${r.time}ms ttl=${r.ttl}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ping-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-[100px]" />
        <div className="ping-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-teal-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['ICMP', 'TTL', 'RTT', 'ms', 'HOP', 'ECHO'].map((sym, i) => (
          <div
            key={i}
            className="floating-ping-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <div className="fixed top-1/3 right-24 pointer-events-none">
        <div className="relative w-20 h-20">
          <div className="pulse-ring absolute inset-0 border-2 border-green-500/50 rounded-full" />
          <div className="pulse-ring absolute inset-0 border-2 border-green-500/50 rounded-full" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="w-8 h-8 text-green-500/50" />
          </div>
        </div>
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-ping-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center">
              <Radio className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Ping Test</span>
              </h1>
              <p className="text-gray-400">
                Test network connectivity and measure latency to any host
              </p>
            </div>
          </div>

          <form onSubmit={handlePing} className="test-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="Enter hostname or IP address"
                    className="w-full pl-12 pr-4 py-4 bg-[#0d0d12] rounded-xl text-white placeholder-gray-500 outline-none border border-white/[0.06] focus:border-green-500/50"
                    disabled={loading}
                  />
                </div>
                <div className="w-32 relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-4 bg-[#0d0d12] rounded-xl text-white outline-none border border-white/[0.06] focus:border-green-500/50 appearance-none"
                    disabled={loading}
                  >
                    <option value={3}>3 pings</option>
                    <option value={5}>5 pings</option>
                    <option value={10}>10 pings</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="ping-btn w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {loading ? 'Pinging...' : 'Start Ping Test'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Radio className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Target Host</p>
                  <h2 className="text-2xl font-bold text-white">{data.host}</h2>
                  {data.ip && <p className="text-gray-400 font-mono text-sm mt-1">{data.ip}</p>}
                </div>
                <button
                  onClick={copyResults}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  <span className="text-gray-300 text-sm">{copied ? 'Copied!' : 'Copy Results'}</span>
                </button>
              </div>
            </div>

            {data.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stats-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <Zap className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{data.stats.avg.toFixed(1)}ms</p>
                  <p className="text-sm text-gray-400">Avg Latency</p>
                </div>
                <div className="stats-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{data.stats.min.toFixed(1)}ms</p>
                  <p className="text-sm text-gray-400">Min Latency</p>
                </div>
                <div className="stats-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{data.stats.max.toFixed(1)}ms</p>
                  <p className="text-sm text-gray-400">Max Latency</p>
                </div>
                <div className="stats-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <Radio className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{data.stats.lossPercent.toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Packet Loss</p>
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="font-semibold text-white">Ping Results</h3>
              </div>
              <div className="divide-y divide-white/5">
                {data.results.map((result, idx) => (
                  <div key={idx} className="ping-result-row flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-sm font-mono text-gray-400">
                        {result.seq}
                      </span>
                      <div>
                        <span className={`font-mono font-bold ${getLatencyColor(result.time)}`}>
                          {result.time.toFixed(2)} ms
                        </span>
                        <span className="text-gray-500 ml-3 text-sm">TTL: {result.ttl}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getLatencyBg(result.time)} transition-all`}
                          style={{ width: `${Math.min(100, (result.time / 200) * 100)}%` }}
                        />
                      </div>
                      {result.status === 'success' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-red-400 text-sm">{result.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Radio className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Network Ping Test</h3>
            <p className="text-gray-500">
              Enter a hostname or IP address to test network connectivity and measure round-trip latency.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
