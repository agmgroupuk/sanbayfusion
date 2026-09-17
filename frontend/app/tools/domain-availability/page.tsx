'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Globe, ArrowLeft, Search, Loader2, Check, X, ShoppingCart, Shield, Star } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface DomainCheck {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: string;
  registrar?: string;
}

interface DomainResult {
  query: string;
  results: DomainCheck[];
  suggestions: DomainCheck[];
}

const tlds = ['.com', '.net', '.org', '.io', '.co', '.ai', '.dev', '.app', '.xyz', '.tech'];

export default function DomainAvailabilityPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [domain, setDomain] = useState('');
  const [selectedTlds, setSelectedTlds] = useState<string[]>(['.com', '.net', '.org', '.io']);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DomainResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('domainWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.domain-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-domain-symbol');
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

      gsap.to('.hero-domain-icon', {
        boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)',
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

      gsap.from('.tld-chip', {
        opacity: 0,
        scale: 0.8,
        stagger: 0.05,
        duration: 0.4,
        delay: 0.7,
        ease: 'back.out(1.7)',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggleTld = (tld: string) => {
    setSelectedTlds(prev =>
      prev.includes(tld) ? prev.filter(t => t !== tld) : [...prev, tld]
    );
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || selectedTlds.length === 0) return;

    const btn = document.querySelector('.check-btn');
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
      const response = await fetch('/api/tools/domain-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), tlds: selectedTlds }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.domain-result', {
            opacity: 0,
            x: -20,
            stagger: 0.08,
            duration: 0.4,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Domain check failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="domain-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[100px]" />
        <div className="domain-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-600/15 to-teal-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['.com', '.io', '.ai', '.dev', '.net', '.org'].map((sym, i) => (
          <div
            key={i}
            className="floating-domain-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-domain-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/30 flex items-center justify-center">
              <Globe className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Domain Availability</span>
              </h1>
              <p className="text-gray-400">
                Check if your desired domain name is available for registration
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="search-form max-w-3xl space-y-4">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="Enter domain name (without extension)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !domain.trim() || selectedTlds.length === 0}
                className="check-btn px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Checking...' : 'Check'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {tlds.map((tld) => (
                <button
                  key={tld}
                  type="button"
                  onClick={() => toggleTld(tld)}
                  className={`tld-chip px-4 py-2 rounded-xl border transition-all ${selectedTlds.includes(tld)
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/[0.15]'
                    }`}
                >
                  {tld}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Globe className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <h3 className="font-semibold text-white">Search Results for "{data.query}"</h3>
              </div>
              <div className="divide-y divide-white/5">
                {data.results.map((result, idx) => (
                  <div key={idx} className="domain-result flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${result.available ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                        {result.available ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">{result.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {result.premium && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                              <Star className="w-3 h-3" /> Premium
                            </span>
                          )}
                          {!result.available && result.registrar && (
                            <span className="text-xs text-gray-500">via {result.registrar}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {result.available && result.price && (
                        <span className="text-green-400 font-semibold">{result.price}</span>
                      )}
                      {result.available ? (
                        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all">
                          <ShoppingCart className="w-4 h-4" />
                          Register
                        </button>
                      ) : (
                        <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
                          Taken
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.suggestions && data.suggestions.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Suggested Alternatives</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {data.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="domain-result flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-white font-medium">{suggestion.domain}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {suggestion.price && (
                          <span className="text-green-400 font-semibold">{suggestion.price}</span>
                        )}
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] text-white rounded-lg transition-all">
                          <ShoppingCart className="w-4 h-4" />
                          Register
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Globe className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Domain Availability Checker</h3>
            <p className="text-gray-500">
              Enter a domain name and select extensions to check availability. Find the perfect domain for your project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
