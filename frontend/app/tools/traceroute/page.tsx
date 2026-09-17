'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Route, ArrowLeft, Play, Loader2, Copy, Check, Globe, Zap, MapPin, Clock } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface Hop {
  hop: number;
  ip: string;
  hostname: string;
  rtt1: number;
  rtt2: number;
  rtt3: number;
  avgRtt: number;
  location?: string;
  asn?: string;
}

interface TracerouteResult {
  target: string;
  targetIp: string;
  hops: Hop[];
  totalTime: number;
}

export default function TraceroutePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TracerouteResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('routeWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.route-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.7, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-trace-symbol');
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

      gsap.to('.hero-route-icon', {
        boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.trace-form', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

      gsap.to('.path-dot', {
        y: -10,
        duration: 0.5,
        stagger: { each: 0.1, repeat: -1, yoyo: true },
        ease: 'sine.inOut',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;

    const btn = document.querySelector('.trace-btn');
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
      const response = await fetch('/api/tools/traceroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.hop-row', {
            opacity: 0,
            x: -30,
            stagger: 0.08,
            duration: 0.4,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Traceroute failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getLatencyColor = (rtt: number) => {
    if (rtt < 30) return 'text-green-400';
    if (rtt < 100) return 'text-yellow-400';
    if (rtt < 200) return 'text-orange-400';
    return 'text-red-400';
  };

  const copyResults = async () => {
    if (!data) return;
    const text = data.hops.map(h => `${h.hop}. ${h.hostname || h.ip} (${h.avgRtt.toFixed(2)}ms)`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="route-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-violet-600/20 blur-[100px]" />
        <div className="route-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-fuchsia-600/15 to-pink-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['HOP', 'TTL', 'RTT', 'ICMP', 'AS#', 'ms'].map((sym, i) => (
          <div
            key={i}
            className="floating-trace-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <div className="fixed top-1/3 right-24 flex gap-2 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="path-dot w-3 h-3 rounded-full bg-purple-500/50" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-route-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-violet-600/30 border border-purple-500/30 flex items-center justify-center">
              <Route className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Traceroute</span>
              </h1>
              <p className="text-gray-400">
                Trace the network path to any destination
              </p>
            </div>
          </div>

          <form onSubmit={handleTrace} className="trace-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Enter hostname or IP address"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="trace-btn px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {loading ? 'Tracing...' : 'Trace Route'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Route className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600/10 to-violet-600/10 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Target</p>
                  <h2 className="text-2xl font-bold text-white">{data.target}</h2>
                  {data.targetIp && <p className="text-gray-400 font-mono text-sm mt-1">{data.targetIp}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-2xl font-bold text-purple-400">{data.hops.length}</p>
                    <p className="text-xs text-gray-400">Hops</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-2xl font-bold text-white">{data.totalTime.toFixed(0)}ms</p>
                    <p className="text-xs text-gray-400">Total Time</p>
                  </div>
                  <button
                    onClick={copyResults}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="font-semibold text-white">Route Hops</h3>
              </div>
              <div className="divide-y divide-white/5">
                {data.hops.map((hop, idx) => (
                  <div key={idx} className="hop-row relative p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <span className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold">
                          {hop.hop}
                        </span>
                        {idx < data.hops.length - 1 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 bg-purple-500/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium truncate">
                            {hop.hostname || hop.ip}
                          </p>
                          {hop.hostname && (
                            <span className="text-gray-500 font-mono text-sm">({hop.ip})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          {hop.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {hop.location}
                            </span>
                          )}
                          {hop.asn && (
                            <span className="text-gray-500">{hop.asn}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            RTT
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className={getLatencyColor(hop.rtt1)}>{hop.rtt1.toFixed(1)}</span>
                            <span className={getLatencyColor(hop.rtt2)}>{hop.rtt2.toFixed(1)}</span>
                            <span className={getLatencyColor(hop.rtt3)}>{hop.rtt3.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Zap className="w-4 h-4" />
                            Avg
                          </div>
                          <p className={`font-bold mt-1 ${getLatencyColor(hop.avgRtt)}`}>
                            {hop.avgRtt.toFixed(1)}ms
                          </p>
                        </div>
                      </div>
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
              <Route className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Network Traceroute</h3>
            <p className="text-gray-500">
              Enter a hostname or IP address to trace the network path and see all the hops between your device and the destination.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
