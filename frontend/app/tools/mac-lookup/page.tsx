'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Cpu, ArrowLeft, Search, Loader2, Copy, Check, Building, Globe, Shield } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface MacInfo {
  macAddress: string;
  vendor: {
    name: string;
    address: string;
    country: string;
    type: string;
  };
  oui: string;
  isPrivate: boolean;
}

export default function MacLookupPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [macAddress, setMacAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MacInfo | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('macWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.mac-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-25, 25)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.7, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-mac-symbol');
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

      gsap.to('.hero-mac-icon', {
        boxShadow: '0 0 50px rgba(236, 72, 153, 0.5)',
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

      gsap.from('.floating-hex', {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.7,
      });

      gsap.to('.floating-hex', {
        y: -15,
        duration: 2,
        stagger: 0.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const formatMacAddress = (value: string) => {
    const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    const chunks = cleaned.match(/.{1,2}/g) || [];
    return chunks.slice(0, 6).join(':');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMacAddress(formatMacAddress(e.target.value));
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macAddress.trim()) return;

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
      const response = await fetch('/api/tools/mac-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: macAddress.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.mac-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Failed to fetch MAC address information');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const copyMac = async () => {
    await navigator.clipboard.writeText(macAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="mac-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-pink-600/20 to-rose-600/20 blur-[100px]" />
        <div className="mac-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-fuchsia-600/15 to-purple-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['AA:BB', 'CC:DD', 'OUI', 'NIC', 'MAC', 'IEEE'].map((sym, i) => (
          <div
            key={i}
            className="floating-mac-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <div className="fixed top-32 right-20 flex gap-3 pointer-events-none">
        {['A', 'B', 'C', 'D', 'E', 'F'].map((hex, i) => (
          <span key={i} className="floating-hex text-2xl font-mono text-pink-500/30 font-bold">{hex}</span>
        ))}
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-mac-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600/30 to-rose-600/30 border border-pink-500/30 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-pink-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MAC Address Lookup</span>
              </h1>
              <p className="text-gray-400">
                Identify the manufacturer of any network device by its MAC address
              </p>
            </div>
          </div>

          <form onSubmit={handleLookup} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={macAddress}
                  onChange={handleInputChange}
                  placeholder="Enter MAC address (e.g., 00:1A:2B:3C:4D:5E)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white font-mono placeholder-gray-500 outline-none tracking-wider"
                  maxLength={17}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || macAddress.length < 8}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Formats accepted: XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, or XXXXXXXXXXXX
            </p>
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
            <div className="mac-card bg-gradient-to-r from-pink-600/10 to-rose-600/10 border border-pink-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">MAC Address</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white font-mono tracking-wider">{data.macAddress}</h2>
                    <button onClick={copyMac} className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {data.isPrivate && (
                    <span className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                      Private/Local
                    </span>
                  )}
                  {data.oui && (
                    <div className="px-4 py-2 bg-pink-500/20 border border-pink-500/30 rounded-xl">
                      <p className="text-sm text-gray-400">OUI</p>
                      <p className="text-pink-400 font-mono font-semibold">{data.oui}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {data.vendor && (
              <div className="mac-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Vendor Information</h3>
                    <p className="text-gray-400 text-sm">Device manufacturer details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.vendor.name && (
                    <div className="p-4 bg-[#0d0d12] rounded-xl">
                      <p className="text-sm text-gray-400 mb-1">Company Name</p>
                      <p className="text-white text-lg font-medium">{data.vendor.name}</p>
                    </div>
                  )}
                  {data.vendor.country && (
                    <div className="p-4 bg-[#0d0d12] rounded-xl flex items-center gap-3">
                      <Globe className="w-5 h-5 text-pink-400" />
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Country</p>
                        <p className="text-white">{data.vendor.country}</p>
                      </div>
                    </div>
                  )}
                  {data.vendor.address && (
                    <div className="md:col-span-2 p-4 bg-[#0d0d12] rounded-xl">
                      <p className="text-sm text-gray-400 mb-1">Address</p>
                      <p className="text-white">{data.vendor.address}</p>
                    </div>
                  )}
                  {data.vendor.type && (
                    <div className="p-4 bg-[#0d0d12] rounded-xl">
                      <p className="text-sm text-gray-400 mb-1">Type</p>
                      <span className="inline-block px-3 py-1 bg-pink-500/20 text-pink-400 rounded-lg text-sm">
                        {data.vendor.type}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Cpu className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">MAC Address Lookup</h3>
            <p className="text-gray-500">
              Enter a MAC address to identify the device manufacturer. The OUI (Organizationally Unique Identifier) identifies the vendor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
