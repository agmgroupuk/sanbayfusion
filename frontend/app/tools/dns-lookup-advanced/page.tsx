'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Server, ArrowLeft, Search, Loader2, Copy, Check, Globe, Mail, FileText, Shield, RefreshCw } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface DnsRecord {
  name: string;
  type: string;
  address?: string;
  value?: string;
  ttl: number;
  priority?: number;
  exchange?: string;
}

interface DnsResult {
  domain: string;
  queryTime: number;
  records: {
    A: DnsRecord[];
    AAAA: DnsRecord[];
    MX: DnsRecord[];
    NS: DnsRecord[];
    TXT: DnsRecord[];
    CNAME: DnsRecord[];
    SOA: DnsRecord[];
  };
}

const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];

const recordIcons: Record<string, any> = {
  A: Server,
  AAAA: Server,
  MX: Mail,
  NS: Globe,
  TXT: FileText,
  CNAME: Globe,
  SOA: Shield,
};

const recordColors: Record<string, string> = {
  A: 'from-blue-500 to-cyan-500',
  AAAA: 'from-purple-500 to-pink-500',
  MX: 'from-green-500 to-emerald-500',
  NS: 'from-orange-500 to-red-500',
  TXT: 'from-yellow-500 to-amber-500',
  CNAME: 'from-indigo-500 to-purple-500',
  SOA: 'from-teal-500 to-cyan-500',
};

export default function DnsLookupAdvancedPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [domain, setDomain] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['A', 'AAAA', 'MX', 'NS']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('dnsAdvWiggle', { wiggles: 6, type: 'easeOut' });

      // Background orbs
      gsap.to('.dns-adv-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-dns-adv-symbol');
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
      gsap.to('.hero-dns-adv-icon', {
        boxShadow: '0 0 50px rgba(16, 185, 129, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Type buttons
      gsap.from('.type-btn', {
        opacity: 0,
        scale: 0.8,
        stagger: 0.05,
        duration: 0.4,
        delay: 0.6,
        ease: 'back.out(1.7)',
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

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || selectedTypes.length === 0) return;

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
      const response = await fetch('/api/tools/dns-lookup-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), types: selectedTypes }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);

        // Animate results
        setTimeout(() => {
          gsap.from('.record-card', {
            opacity: 0,
            y: 30,
            stagger: 0.08,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(data.error || 'Failed to perform DNS lookup');
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

  const getRecordValue = (record: DnsRecord): string => {
    if (record.address) return record.address;
    if (record.exchange) return `${record.priority} ${record.exchange}`;
    if (record.value) return record.value;
    return JSON.stringify(record);
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="dns-adv-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-emerald-600/20 to-teal-600/20 blur-[100px]" />
        <div className="dns-adv-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-green-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['SOA', 'PTR', 'SRV', 'CAA', 'DKIM', 'SPF'].map((sym, i) => (
          <div
            key={i}
            className="floating-dns-adv-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-dns-adv-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/30 flex items-center justify-center">
              <Server className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Advanced DNS Lookup</span>
              </h1>
              <p className="text-gray-400">
                Comprehensive DNS records lookup with record type selection
              </p>
            </div>
          </div>

          {/* Record Type Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">Select Record Types</label>
            <div className="flex flex-wrap gap-2">
              {recordTypes.map((type) => {
                const IconComponent = recordIcons[type];
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`type-btn px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${isSelected
                        ? `bg-gradient-to-r ${recordColors[type]} text-white shadow-lg`
                        : 'bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:text-white'
                      }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {type}
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedTypes(recordTypes)}
                className="type-btn px-4 py-2 rounded-xl bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:text-white transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                All
              </button>
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
                disabled={loading || !domain.trim() || selectedTypes.length === 0}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Querying...
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
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Results for <span className="text-emerald-400">{result.domain}</span>
              </h2>
              {result.queryTime && (
                <span className="text-sm text-gray-400">Query time: {result.queryTime}ms</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedTypes.map((type) => {
                const records = result.records[type as keyof typeof result.records] || [];
                const IconComponent = recordIcons[type];
                const color = recordColors[type];

                return (
                  <div
                    key={type}
                    className="record-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{type}</h3>
                        <p className="text-xs text-gray-400">{records.length} records</p>
                      </div>
                    </div>

                    {records.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {records.map((record, idx) => (
                          <div
                            key={idx}
                            className="group bg-[#0d0d12] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between gap-2"
                          >
                            <code className="text-gray-300 font-mono text-xs break-all flex-1">
                              {getRecordValue(record)}
                            </code>
                            <button
                              onClick={() => copyValue(getRecordValue(record), `${type}-${idx}`)}
                              className="p-1.5 bg-white/[0.02] hover:bg-white/[0.06] rounded text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              {copied === `${type}-${idx}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No records found</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !result && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Server className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Advanced DNS Lookup</h3>
            <p className="text-gray-500">
              Select the record types you want to query and enter a domain name to get comprehensive DNS information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
