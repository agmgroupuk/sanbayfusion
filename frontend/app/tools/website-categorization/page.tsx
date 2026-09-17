'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Tags, ArrowLeft, Search, Loader2, Globe, Shield, AlertTriangle, Check, ExternalLink, Eye, Lock, Users } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface CategoryResult {
  url: string;
  domain: string;
  categories: {
    name: string;
    confidence: number;
    source: string;
  }[];
  primaryCategory: string;
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
  flags: {
    adult: boolean;
    gambling: boolean;
    malware: boolean;
    phishing: boolean;
    ads: boolean;
    tracking: boolean;
    social: boolean;
    streaming: boolean;
  };
  metadata: {
    title: string;
    description: string;
    language: string;
    contentType: string;
  };
  recommendations: string[];
}

export default function WebsiteCategorizationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CategoryResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('catWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.cat-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-cat-symbol');
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

      gsap.to('.hero-cat-icon', {
        boxShadow: '0 0 50px rgba(99, 102, 241, 0.5)',
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

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

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
      const response = await fetch('/api/tools/website-categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.cat-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Categorization failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'safe':
        return 'from-green-600 to-emerald-600';
      case 'low':
        return 'from-blue-600 to-cyan-600';
      case 'medium':
        return 'from-yellow-600 to-amber-600';
      case 'high':
        return 'from-red-600 to-rose-600';
      default:
        return 'from-gray-600 to-gray-600';
    }
  };

  const getFlagIcon = (flag: string) => {
    switch (flag) {
      case 'adult':
        return <Eye className="w-4 h-4" />;
      case 'gambling':
        return <Tags className="w-4 h-4" />;
      case 'malware':
        return <AlertTriangle className="w-4 h-4" />;
      case 'phishing':
        return <Shield className="w-4 h-4" />;
      case 'ads':
        return <Tags className="w-4 h-4" />;
      case 'tracking':
        return <Eye className="w-4 h-4" />;
      case 'social':
        return <Users className="w-4 h-4" />;
      case 'streaming':
        return <Globe className="w-4 h-4" />;
      default:
        return <Tags className="w-4 h-4" />;
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="cat-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 blur-[100px]" />
        <div className="cat-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-violet-600/15 to-fuchsia-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['Tech', 'Biz', 'News', 'Shop', 'SaaS', 'Blog'].map((sym, i) => (
          <div
            key={i}
            className="floating-cat-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-cat-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center">
              <Tags className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Website Categorization</span>
              </h1>
              <p className="text-gray-400">
                Analyze and categorize any website by content type
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL or domain (e.g., example.com)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="check-btn px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Analyzing...' : 'Categorize'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="cat-card bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Website</p>
                  <h2 className="text-2xl font-bold text-white">{data.domain}</h2>
                  <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-sm hover:underline flex items-center gap-1 mt-1">
                    {data.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className="text-lg font-bold text-indigo-400">{data.primaryCategory}</p>
                    <p className="text-xs text-gray-400">Primary Category</p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${getRiskColor(data.riskLevel)} text-white font-bold uppercase`}>
                    {data.riskLevel} Risk
                  </div>
                </div>
              </div>
            </div>

            <div className="cat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">Categories</h3>
              <div className="space-y-3">
                {data.categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#0d0d12] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Tags className="w-5 h-5 text-indigo-400" />
                      <span className="text-white">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${cat.confidence}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-12 text-right">{cat.confidence}%</span>
                      <span className="text-gray-500 text-xs">{cat.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">Content Flags</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(data.flags).map(([flag, value]) => (
                  <div key={flag} className={`p-3 rounded-xl border flex items-center justify-between ${value ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/[0.06]'
                    }`}>
                    <div className="flex items-center gap-2">
                      {getFlagIcon(flag)}
                      <span className="text-gray-300 capitalize text-sm">{flag}</span>
                    </div>
                    {value ? (
                      <Check className="w-4 h-4 text-orange-400" />
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {data.metadata && (
              <div className="cat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Page Metadata</h3>
                <div className="space-y-3 text-sm">
                  {data.metadata.title && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Title</p>
                      <p className="text-white">{data.metadata.title}</p>
                    </div>
                  )}
                  {data.metadata.description && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Description</p>
                      <p className="text-white">{data.metadata.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {data.metadata.language && (
                      <div className="p-3 bg-[#0d0d12] rounded-lg">
                        <p className="text-gray-400 mb-1">Language</p>
                        <p className="text-white uppercase">{data.metadata.language}</p>
                      </div>
                    )}
                    {data.metadata.contentType && (
                      <div className="p-3 bg-[#0d0d12] rounded-lg">
                        <p className="text-gray-400 mb-1">Content Type</p>
                        <p className="text-white">{data.metadata.contentType}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {data.recommendations && data.recommendations.length > 0 && (
              <div className="cat-card bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Tags className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Website Categorization</h3>
            <p className="text-gray-500">
              Enter a URL or domain to analyze its content and determine categories, risk level, and content flags.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
