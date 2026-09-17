'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Globe, ArrowLeft, Search, CheckCircle, XCircle, Loader2, Copy, Check, Server, Mail, FileText } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface DnsRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
}

interface DnsResult {
  domain: string;
  records: {
    A?: DnsRecord[];
    AAAA?: DnsRecord[];
    MX?: DnsRecord[];
    NS?: DnsRecord[];
    TXT?: DnsRecord[];
    CNAME?: DnsRecord[];
    SOA?: any;
  };
}

const recordTypeInfo: Record<string, { icon: any; color: string; description: string }> = {
  A: { icon: Server, color: 'from-blue-500 to-cyan-500', description: 'IPv4 Address' },
  AAAA: { icon: Server, color: 'from-purple-500 to-pink-500', description: 'IPv6 Address' },
  MX: { icon: Mail, color: 'from-green-500 to-emerald-500', description: 'Mail Exchange' },
  NS: { icon: Globe, color: 'from-orange-500 to-red-500', description: 'Name Server' },
  TXT: { icon: FileText, color: 'from-yellow-500 to-amber-500', description: 'Text Record' },
  CNAME: { icon: Globe, color: 'from-indigo-500 to-purple-500', description: 'Canonical Name' },
};

export default function DnsLookupPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('dnsWiggle', { wiggles: 6, type: 'easeOut' });

      // Background orbs
      gsap.to('.dns-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-dns-symbol');
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

      // Title
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

      // Hero icon
      gsap.to('.hero-dns-icon', {
        boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Search form
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
    if (!domain.trim()) return;

    // Button animation
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
    setResult(null);

    try {
      const response = await fetch('/api/tools/dns-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        
        // Animate results
        setTimeout(() => {
          gsap.from('.record-section', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(data.error || 'Failed to perform DNS lookup');
        // Error shake
        const tl = gsap.timeline();
        tl.to('.search-form', { x: -10, duration: 0.1 })
          .to('.search-form', { x: 10, duration: 0.1 })
          .to('.search-form', { x: -5, duration: 0.1 })
          .to('.search-form', { x: 0, duration: 0.1 });
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

  const RecordSection = ({ title, records, type }: { title: string; records?: DnsRecord[]; type: string }) => {
    if (!records || records.length === 0) return null;

    const info = recordTypeInfo[type] || { icon: Globe, color: 'from-gray-500 to-slate-500', description: type };
    const IconComponent = info.icon;

    return (
      <div className="record-section bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:border-purple-500/30 transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${info.color} flex items-center justify-center`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title} Records</h3>
            <p className="text-sm text-gray-400">{info.description}</p>
          </div>
          <div className="ml-auto px-3 py-1 bg-white/[0.06] rounded-full text-sm text-gray-300">
            {records.length} found
          </div>
        </div>

        <div className="space-y-3">
          {records.map((record, idx) => (
            <div key={idx} className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <code className="text-gray-300 font-mono text-sm break-all">{record.value}</code>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {record.ttl && (
                    <span className="text-sm text-gray-500">TTL: {record.ttl}s</span>
                  )}
                  {record.priority !== undefined && (
                    <span className="text-sm text-purple-400">Priority: {record.priority}</span>
                  )}
                  <button
                    onClick={() => copyValue(record.value, `${type}-${idx}`)}
                    className="p-2 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    {copied === `${type}-${idx}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="dns-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-[100px]" />
        <div className="dns-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-violet-600/15 to-indigo-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['DNS', 'MX', 'NS', 'A', 'AAAA', 'TXT'].map((sym, i) => (
          <div
            key={i}
            className="floating-dns-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      {/* Hero */}
      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-dns-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center">
              <Globe className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>DNS Lookup</span>
              </h1>
              <p className="text-gray-400">
                Perform DNS queries and check domain name system records
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleLookup} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Enter domain name (e.g., example.com)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Lookup
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">
                DNS Records for <span className="text-purple-400">{result.domain}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecordSection title="A" records={result.records.A} type="A" />
              <RecordSection title="AAAA" records={result.records.AAAA} type="AAAA" />
              <RecordSection title="MX" records={result.records.MX} type="MX" />
              <RecordSection title="NS" records={result.records.NS} type="NS" />
              <RecordSection title="TXT" records={result.records.TXT} type="TXT" />
              <RecordSection title="CNAME" records={result.records.CNAME} type="CNAME" />
            </div>

            {result.records.SOA && (
              <div className="record-section bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">SOA Record</h3>
                <pre className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4 overflow-auto">
                  <code className="text-gray-300 font-mono text-sm">
                    {JSON.stringify(result.records.SOA, null, 2)}
                  </code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !result && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Globe className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Enter a Domain</h3>
            <p className="text-gray-500">
              Type a domain name above to lookup its DNS records including A, AAAA, MX, NS, TXT, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
