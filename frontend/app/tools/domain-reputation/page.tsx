'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Search, Loader2, AlertTriangle, Check, X, Globe, Mail, Server, Clock, Download } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface ReputationScore {
  overall: number;
  spam: number;
  malware: number;
  phishing: number;
}

interface ReputationResult {
  domain: string;
  score: ReputationScore;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  blacklists: {
    name: string;
    listed: boolean;
  }[];
  dns: {
    hasMx: boolean;
    hasSpf: boolean;
    hasDmarc: boolean;
    hasDkim: boolean;
  };
  age: {
    created: string;
    years: number;
  };
  warnings: string[];
}

export default function DomainReputationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReputationResult | null>(null);
  const [error, setError] = useState('');

  const exportResults = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domain-reputation-${data.domain}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('repWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.rep-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-25, 25)',
        scale: 'random(0.9, 1.1)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.7, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-rep-symbol');
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

      gsap.to('.hero-rep-icon', {
        boxShadow: '0 0 50px rgba(249, 115, 22, 0.5)',
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
    if (!domain.trim()) return;

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
      const response = await fetch('/api/tools/domain-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.rep-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Reputation check failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'from-green-600 to-emerald-600';
      case 'medium':
        return 'from-yellow-600 to-amber-600';
      case 'high':
        return 'from-orange-600 to-red-600';
      case 'critical':
        return 'from-red-600 to-rose-600';
      default:
        return 'from-gray-600 to-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="rep-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-orange-600/20 to-amber-600/20 blur-[100px]" />
        <div className="rep-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-yellow-600/15 to-lime-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['A+', 'SSL', 'SPF', 'DKIM', 'TLS', '100'].map((sym, i) => (
          <div
            key={i}
            className="floating-rep-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-rep-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600/30 to-amber-600/30 border border-orange-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Domain Reputation</span>
              </h1>
              <p className="text-gray-400">
                Check domain reputation, blacklist status, and security posture
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Enter domain (e.g., example.com)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="check-btn px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Checking...' : 'Check'}
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
            <div className="rep-card bg-gradient-to-r from-orange-600/10 to-amber-600/10 border border-orange-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Domain</p>
                  <h2 className="text-2xl font-bold text-white">{data.domain}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={exportResults}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-gray-300 hover:text-white text-sm transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${getScoreColor(data.score.overall)}`}>
                      {data.score.overall}
                    </p>
                    <p className="text-xs text-gray-400">Overall Score</p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${getRiskColor(data.riskLevel)} text-white font-bold uppercase`}>
                    {data.riskLevel} Risk
                  </div>
                </div>
              </div>
            </div>

            {data.warnings && data.warnings.length > 0 && (
              <div className="rep-card bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-400 mb-2">Warnings</h3>
                    <ul className="space-y-1">
                      {data.warnings.map((warning, idx) => (
                        <li key={idx} className="text-yellow-200 text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${getScoreColor(data.score.spam)}`}>{data.score.spam}</p>
                <p className="text-sm text-gray-400 mt-1">Spam Score</p>
              </div>
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${getScoreColor(data.score.malware)}`}>{data.score.malware}</p>
                <p className="text-sm text-gray-400 mt-1">Malware Score</p>
              </div>
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${getScoreColor(data.score.phishing)}`}>{data.score.phishing}</p>
                <p className="text-sm text-gray-400 mt-1">Phishing Score</p>
              </div>
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{data.age.years} yrs</p>
                <p className="text-sm text-gray-400 mt-1">Domain Age</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Email Security</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                    <span className="text-gray-400">MX Records</span>
                    {data.dns.hasMx ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                    <span className="text-gray-400">SPF</span>
                    {data.dns.hasSpf ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                    <span className="text-gray-400">DMARC</span>
                    {data.dns.hasDmarc ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                    <span className="text-gray-400">DKIM</span>
                    {data.dns.hasDkim ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                  </div>
                </div>
              </div>

              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-center">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Blacklist Status</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.blacklists.map((bl, idx) => (
                    <div key={idx} className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                      <span className="text-gray-400 text-sm">{bl.name}</span>
                      {bl.listed ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <X className="w-4 h-4" /> Listed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <Check className="w-4 h-4" /> Clean
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {data.categories && data.categories.length > 0 && (
              <div className="rep-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((cat, idx) => (
                    <span key={idx} className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Shield className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Domain Reputation Checker</h3>
            <p className="text-gray-500">
              Enter a domain to check its reputation score, blacklist status, and email security configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
