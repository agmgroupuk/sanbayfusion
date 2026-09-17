'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Network, ArrowLeft, Search, Loader2, Copy, Check, Globe, Shield, Server } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface NetblockInfo {
  ip: string;
  netblock: {
    startAddress: string;
    endAddress: string;
    cidr: string;
    name: string;
    handle: string;
    type: string;
    country: string;
  };
  organization: {
    name: string;
    handle: string;
    address: string;
  };
}

export default function IpNetblocksPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NetblockInfo | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('netblockWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.netblock-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-net-symbol');
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

      gsap.to('.hero-netblock-icon', {
        boxShadow: '0 0 50px rgba(132, 204, 22, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.search-form', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    const btn = document.querySelector('.lookup-btn');
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
      const response = await fetch('/api/tools/ip-netblocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipAddress.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.netblock-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Failed to fetch netblock information');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="netblock-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-lime-600/20 to-green-600/20 blur-[100px]" />
        <div className="netblock-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-emerald-600/15 to-teal-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['/24', '/16', '/8', 'CIDR', 'BGP', 'ASN'].map((sym, i) => (
          <div
            key={i}
            className="floating-net-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-netblock-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-600/30 to-green-600/30 border border-lime-500/30 flex items-center justify-center">
              <Network className="w-8 h-8 text-lime-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>IP Netblocks Lookup</span>
              </h1>
              <p className="text-gray-400">
                Get IP range and network block information for any IP address
              </p>
            </div>
          </div>

          <form onSubmit={handleLookup} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address (e.g., 8.8.8.8)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !ipAddress.trim()}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-lime-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="netblock-card bg-gradient-to-r from-lime-600/10 to-green-600/10 border border-lime-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">IP Address</p>
                  <h2 className="text-3xl font-bold text-white font-mono">{data.ip}</h2>
                </div>
                {data.netblock?.cidr && (
                  <div className="px-4 py-2 bg-lime-500/20 border border-lime-500/30 rounded-xl">
                    <p className="text-sm text-gray-400">CIDR</p>
                    <p className="text-lime-400 font-mono font-semibold">{data.netblock.cidr}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.netblock && (
                <div className="netblock-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-lime-600 to-green-600 flex items-center justify-center">
                      <Network className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white">Network Block</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-[#0d0d12] rounded-lg">
                      <span className="text-gray-400">Start Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono">{data.netblock.startAddress}</code>
                        <button onClick={() => copyValue(data.netblock.startAddress, 'start')} className="text-gray-400 hover:text-white">
                          {copied === 'start' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#0d0d12] rounded-lg">
                      <span className="text-gray-400">End Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono">{data.netblock.endAddress}</code>
                        <button onClick={() => copyValue(data.netblock.endAddress, 'end')} className="text-gray-400 hover:text-white">
                          {copied === 'end' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {data.netblock.name && (
                      <div className="flex justify-between p-3 bg-[#0d0d12] rounded-lg">
                        <span className="text-gray-400">Name</span>
                        <span className="text-white">{data.netblock.name}</span>
                      </div>
                    )}
                    {data.netblock.type && (
                      <div className="flex justify-between p-3 bg-[#0d0d12] rounded-lg">
                        <span className="text-gray-400">Type</span>
                        <span className="text-lime-400">{data.netblock.type}</span>
                      </div>
                    )}
                    {data.netblock.country && (
                      <div className="flex justify-between p-3 bg-[#0d0d12] rounded-lg">
                        <span className="text-gray-400">Country</span>
                        <span className="text-white">{data.netblock.country}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {data.organization && (
                <div className="netblock-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                      <Server className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white">Organization</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    {data.organization.name && (
                      <div className="p-3 bg-[#0d0d12] rounded-lg">
                        <p className="text-gray-400 mb-1">Name</p>
                        <p className="text-white">{data.organization.name}</p>
                      </div>
                    )}
                    {data.organization.handle && (
                      <div className="p-3 bg-[#0d0d12] rounded-lg">
                        <p className="text-gray-400 mb-1">Handle</p>
                        <p className="text-white font-mono">{data.organization.handle}</p>
                      </div>
                    )}
                    {data.organization.address && (
                      <div className="p-3 bg-[#0d0d12] rounded-lg">
                        <p className="text-gray-400 mb-1">Address</p>
                        <p className="text-white">{data.organization.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Network className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">IP Netblocks Lookup</h3>
            <p className="text-gray-500">
              Enter an IP address to get network block information including CIDR, address range, and organization details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
