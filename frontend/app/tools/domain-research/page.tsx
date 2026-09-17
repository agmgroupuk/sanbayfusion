'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FileSearch, ArrowLeft, Search, Loader2, Copy, Check, Globe, Server, Mail, Shield, ExternalLink, Calendar } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface DomainResearchResult {
  domain: string;
  registrar: string;
  created: string;
  expires: string;
  updated: string;
  status: string[];
  nameservers: string[];
  dnssec: boolean;
  hosting: {
    ip: string;
    provider: string;
    country: string;
  };
  mx: {
    host: string;
    priority: number;
  }[];
  technologies: string[];
  ssl: {
    issuer: string;
    validTo: string;
    daysRemaining: number;
  };
  social: {
    platform: string;
    url: string;
  }[];
}

export default function DomainResearchPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DomainResearchResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('researchWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.research-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-research-symbol');
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

      gsap.to('.hero-research-icon', {
        boxShadow: '0 0 50px rgba(139, 92, 246, 0.5)',
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

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    const btn = document.querySelector('.research-btn');
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
      const response = await fetch('/api/tools/domain-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.research-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Research failed');
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
        <div className="research-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-violet-600/20 blur-[100px]" />
        <div className="research-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-blue-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['WHOIS', 'DNS', 'NS', 'MX', 'SOA', 'TLD'].map((sym, i) => (
          <div
            key={i}
            className="floating-research-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-research-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-violet-600/30 border border-purple-500/30 flex items-center justify-center">
              <FileSearch className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Domain Research</span>
              </h1>
              <p className="text-gray-400">
                Comprehensive domain intelligence and technology analysis
              </p>
            </div>
          </div>

          <form onSubmit={handleResearch} className="search-form max-w-3xl">
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
                className="research-btn px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Researching...' : 'Research'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <FileSearch className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="research-card bg-gradient-to-r from-purple-600/10 to-violet-600/10 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{data.domain}</h2>
                  <p className="text-gray-400 mt-1">Registrar: {data.registrar}</p>
                </div>
                <div className="flex items-center gap-4">
                  {data.dnssec && (
                    <span className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-1">
                      <Shield className="w-4 h-4" /> DNSSEC
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="text-white font-medium">{new Date(data.created).toLocaleDateString()}</p>
              </div>
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Expires</span>
                </div>
                <p className="text-white font-medium">{new Date(data.expires).toLocaleDateString()}</p>
              </div>
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Updated</span>
                </div>
                <p className="text-white font-medium">{new Date(data.updated).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 flex items-center justify-center">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Hosting Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-[#0d0d12] rounded-lg">
                    <span className="text-gray-400">IP Address</span>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono">{data.hosting.ip}</code>
                      <button onClick={() => copyValue(data.hosting.ip, 'ip')} className="text-gray-400 hover:text-white">
                        {copied === 'ip' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between p-3 bg-[#0d0d12] rounded-lg">
                    <span className="text-gray-400">Provider</span>
                    <span className="text-white">{data.hosting.provider}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#0d0d12] rounded-lg">
                    <span className="text-gray-400">Country</span>
                    <span className="text-white">{data.hosting.country}</span>
                  </div>
                </div>
              </div>

              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Mail Servers</h3>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.mx.map((mx, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#0d0d12] rounded-lg">
                      <span className="text-white text-sm truncate">{mx.host}</span>
                      <span className="text-gray-500 text-xs">Priority: {mx.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">Nameservers</h3>
              <div className="flex flex-wrap gap-2">
                {data.nameservers.map((ns, idx) => (
                  <span key={idx} className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-mono text-sm">
                    {ns}
                  </span>
                ))}
              </div>
            </div>

            {data.technologies && data.technologies.length > 0 && (
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Detected Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {data.technologies.map((tech, idx) => (
                    <span key={idx} className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.ssl && (
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">SSL Certificate</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Issuer</p>
                    <p className="text-white">{data.ssl.issuer}</p>
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Valid Until</p>
                    <p className="text-white">{new Date(data.ssl.validTo).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Days Remaining</p>
                    <p className={`font-bold ${data.ssl.daysRemaining > 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {data.ssl.daysRemaining} days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {data.social && data.social.length > 0 && (
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Social Profiles</h3>
                <div className="flex flex-wrap gap-3">
                  {data.social.map((social, idx) => (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-white transition-colors"
                    >
                      {social.platform}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {data.status && data.status.length > 0 && (
              <div className="research-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Domain Status</h3>
                <div className="flex flex-wrap gap-2">
                  {data.status.map((status, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 text-xs">
                      {status}
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
              <FileSearch className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Domain Research Tool</h3>
            <p className="text-gray-500">
              Enter a domain to get comprehensive information including hosting, DNS, technologies, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
