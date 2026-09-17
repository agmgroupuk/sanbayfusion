'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Search, Loader2, AlertTriangle, Check, X, Globe, FileWarning, Skull, Eye, ExternalLink, Copy } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface ThreatIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  lastSeen: string;
}

interface ThreatResult {
  indicator: string;
  type: 'ip' | 'domain' | 'hash' | 'url';
  verdict: 'clean' | 'suspicious' | 'malicious';
  riskScore: number;
  threats: ThreatIndicator[];
  reputation: {
    malware: boolean;
    phishing: boolean;
    spam: boolean;
    botnet: boolean;
    tor: boolean;
    proxy: boolean;
  };
  sources: {
    name: string;
    detected: boolean;
    category: string;
  }[];
  firstSeen: string;
  lastSeen: string;
  relatedIndicators: string[];
}

export default function ThreatIntelligencePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [indicator, setIndicator] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ThreatResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('threatWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.threat-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-threat-symbol');
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

      gsap.to('.hero-threat-icon', {
        boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)',
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicator.trim()) return;

    const btn = document.querySelector('.search-btn');
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
      const response = await fetch('/api/tools/threat-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicator: indicator.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.threat-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Threat lookup failed');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'clean':
        return 'from-green-600 to-emerald-600';
      case 'suspicious':
        return 'from-yellow-600 to-amber-600';
      case 'malicious':
        return 'from-red-600 to-rose-600';
      default:
        return 'from-gray-600 to-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 20) return 'text-green-400';
    if (score <= 50) return 'text-yellow-400';
    if (score <= 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const copyIndicator = async () => {
    await navigator.clipboard.writeText(indicator);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="threat-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-red-600/20 to-rose-600/20 blur-[100px]" />
        <div className="threat-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-orange-600/15 to-amber-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['CVE', 'IoC', 'APT', 'C2', 'TTP', 'OSINT'].map((sym, i) => (
          <div
            key={i}
            className="floating-threat-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-threat-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/30 to-rose-600/30 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Threat Intelligence</span>
              </h1>
              <p className="text-gray-400">
                Analyze IPs, domains, URLs, and file hashes for threats
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Eye className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={indicator}
                  onChange={(e) => setIndicator(e.target.value)}
                  placeholder="Enter IP, domain, URL, or file hash"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none font-mono"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !indicator.trim()}
                className="search-btn px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Supports: IP addresses, domains, URLs, MD5/SHA1/SHA256 hashes
            </p>
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
            <div className="threat-card bg-gradient-to-r from-red-600/10 to-rose-600/10 border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-white/[0.06] rounded-lg text-gray-300 text-sm uppercase">
                      {data.type}
                    </span>
                    <button onClick={copyIndicator} className="text-gray-400 hover:text-white">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white font-mono break-all">{data.indicator}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${getRiskColor(data.riskScore)}`}>
                      {data.riskScore}
                    </p>
                    <p className="text-xs text-gray-400">Risk Score</p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${getVerdictColor(data.verdict)} text-white font-bold uppercase`}>
                    {data.verdict}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {Object.entries(data.reputation).map(([key, value]) => (
                <div key={key} className={`threat-card p-3 rounded-xl border ${value ? 'bg-red-500/10 border-red-500/30' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 capitalize text-sm">{key}</span>
                    {value ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-green-400" />}
                  </div>
                </div>
              ))}
            </div>

            {data.threats && data.threats.length > 0 && (
              <div className="threat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold text-white">Detected Threats</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {data.threats.map((threat, idx) => (
                    <div key={idx} className="p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs border uppercase ${getSeverityColor(threat.severity)}`}>
                              {threat.severity}
                            </span>
                            <span className="text-gray-400 text-sm">{threat.type}</span>
                          </div>
                          <p className="text-white">{threat.description}</p>
                          <p className="text-gray-500 text-sm mt-1">Source: {threat.source}</p>
                        </div>
                        <span className="text-gray-500 text-xs whitespace-nowrap">
                          {new Date(threat.lastSeen).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="threat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-center">
                  <FileWarning className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Detection Sources</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.sources.map((source, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between ${source.detected ? 'bg-red-500/10 border-red-500/30' : 'bg-white/[0.02] border-white/[0.06]'
                    }`}>
                    <span className="text-gray-300 text-sm truncate">{source.name}</span>
                    {source.detected ? (
                      <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="threat-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">First Seen</p>
                <p className="text-white">{new Date(data.firstSeen).toLocaleString()}</p>
              </div>
              <div className="threat-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Last Seen</p>
                <p className="text-white">{new Date(data.lastSeen).toLocaleString()}</p>
              </div>
            </div>

            {data.relatedIndicators && data.relatedIndicators.length > 0 && (
              <div className="threat-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Related Indicators</h3>
                <div className="flex flex-wrap gap-2">
                  {data.relatedIndicators.map((related, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-mono text-sm">
                      {related}
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
            <h3 className="text-xl font-medium text-gray-400 mb-2">Threat Intelligence Lookup</h3>
            <p className="text-gray-500">
              Enter an IP address, domain, URL, or file hash to check for known threats, malware, and security risks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
