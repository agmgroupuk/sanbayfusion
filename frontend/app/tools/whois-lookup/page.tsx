'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, Loader2, Copy, Check, Globe, User, Calendar, Server, Mail, Shield, Building, Network, Download, MapPin } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

type TabType = 'domain' | 'dns' | 'ip';

interface WhoisResult {
  domain: string;
  registrar: {
    name: string;
    url: string;
    whoisServer: string;
    abuseContact: string;
  };
  dates: {
    created: string;
    updated: string;
    expires: string;
  };
  registrant: {
    name: string;
    organization: string;
    email: string;
    country: string;
    state: string;
    city: string;
  };
  admin: {
    name: string;
    email: string;
  };
  tech: {
    name: string;
    email: string;
  };
  nameservers: string[];
  status: string[];
  dnssec: boolean;
  rawData: string;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
}

interface DNSResult {
  domain: string;
  records: DNSRecord[];
  nameservers: string[];
  security: { spf: string | null; dmarc: string | null; dkim: string[] };
  totalRecords: number;
}

interface IPResult {
  ip: string;
  hostname: string;
  location: { country: string; countryCode: string; region: string; city: string; zip: string; latitude: number; longitude: number; timezone: string };
  isp: { name: string; organization: string; as: string; asName: string };
  security: { isProxy: boolean; isMobile: boolean; isHosting: boolean };
}

export default function WhoisLookupPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('domain');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);
  const [dnsData, setDnsData] = useState<DNSResult | null>(null);
  const [ipData, setIpData] = useState<IPResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('whoisWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.whois-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      const symbols = document.querySelectorAll('.floating-whois-symbol');
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

      gsap.to('.hero-whois-icon', {
        boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)',
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
    if (!query.trim()) return;

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
    setWhoisData(null);
    setDnsData(null);
    setIpData(null);
    setShowRaw(false);

    try {
      let endpoint = '/api/tools/whois-lookup';
      let body: any = { domain: query.trim() };

      if (activeTab === 'dns') {
        endpoint = '/api/tools/whois-lookup/dns';
        body = { domain: query.trim() };
      } else if (activeTab === 'ip') {
        endpoint = '/api/tools/whois-lookup/ip';
        body = { ip: query.trim() };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        if (activeTab === 'domain') setWhoisData(result.data);
        else if (activeTab === 'dns') setDnsData(result.data);
        else setIpData(result.data);

        setTimeout(() => {
          gsap.from('.whois-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'Lookup failed');
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

  const exportResults = () => {
    const data = whoisData || dnsData || ipData;
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whois-${activeTab}-${query.trim()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPlaceholder = () => {
    if (activeTab === 'ip') return 'Enter IP address (e.g., 8.8.8.8)';
    return 'Enter domain (e.g., example.com)';
  };

  const getButtonLabel = () => {
    if (activeTab === 'dns') return loading ? 'Looking up...' : 'DNS Lookup';
    if (activeTab === 'ip') return loading ? 'Looking up...' : 'IP Lookup';
    return loading ? 'Looking up...' : 'WHOIS Lookup';
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="whois-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-[100px]" />
        <div className="whois-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-teal-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['WHOIS', 'IANA', 'REG', 'DNS', 'TLD', 'NIC'].map((sym, i) => (
          <div
            key={i}
            className="floating-whois-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-whois-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center">
              <Search className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>WHOIS Lookup</span>
              </h1>
              <p className="text-gray-400">
                Domain registration, DNS records, and IP intelligence
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {([
              { key: 'domain' as TabType, label: 'Domain WHOIS', icon: Globe },
              { key: 'dns' as TabType, label: 'DNS Records', icon: Network },
              { key: 'ip' as TabType, label: 'IP Lookup', icon: MapPin },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setError(''); }}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === key
                    ? 'bg-green-600/20 border border-green-500/40 text-green-400'
                    : 'bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLookup} className="search-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {getButtonLabel()}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <Search className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Export button */}
        {(whoisData || dnsData || ipData) && (
          <div className="flex justify-end mb-4">
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-gray-300 hover:text-white text-sm transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        )}

        {/* ── Domain WHOIS Results ── */}
        {whoisData && activeTab === 'domain' && (
          <div className="space-y-6">
            <div className="whois-card bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{whoisData.domain}</h2>
                  <p className="text-gray-400 mt-1">Registrar: {whoisData.registrar.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {whoisData.dnssec && (
                    <span className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-1">
                      <Shield className="w-4 h-4" /> DNSSEC
                    </span>
                  )}
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-gray-300 text-sm transition-colors"
                  >
                    {showRaw ? 'Hide Raw' : 'Show Raw'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="text-white font-medium">{whoisData.dates.created ? new Date(whoisData.dates.created).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Expires</span>
                </div>
                <p className="text-white font-medium">{whoisData.dates.expires ? new Date(whoisData.dates.expires).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Updated</span>
                </div>
                <p className="text-white font-medium">{whoisData.dates.updated ? new Date(whoisData.dates.updated).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Registrant</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {whoisData.registrant.name && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Name</p>
                      <p className="text-white">{whoisData.registrant.name}</p>
                    </div>
                  )}
                  {whoisData.registrant.organization && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Organization</p>
                      <p className="text-white">{whoisData.registrant.organization}</p>
                    </div>
                  )}
                  {whoisData.registrant.email && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 mb-1">Email</p>
                        <p className="text-white">{whoisData.registrant.email}</p>
                      </div>
                      <button onClick={() => copyValue(whoisData.registrant.email, 'email')} className="text-gray-400 hover:text-white">
                        {copied === 'email' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  {whoisData.registrant.country && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Location</p>
                      <p className="text-white">
                        {[whoisData.registrant.city, whoisData.registrant.state, whoisData.registrant.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  {!whoisData.registrant.name && !whoisData.registrant.organization && !whoisData.registrant.email && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400">Privacy protected or data redacted</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Registrar Info</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Name</p>
                    <p className="text-white">{whoisData.registrar.name}</p>
                  </div>
                  {whoisData.registrar.url && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">URL</p>
                      <a href={whoisData.registrar.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                        {whoisData.registrar.url}
                      </a>
                    </div>
                  )}
                  {whoisData.registrar.whoisServer && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">WHOIS Server</p>
                      <p className="text-white font-mono text-xs">{whoisData.registrar.whoisServer}</p>
                    </div>
                  )}
                  {whoisData.registrar.abuseContact && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 mb-1">Abuse Contact</p>
                        <p className="text-white text-xs">{whoisData.registrar.abuseContact}</p>
                      </div>
                      <button onClick={() => copyValue(whoisData.registrar.abuseContact, 'abuse')} className="text-gray-400 hover:text-white">
                        {copied === 'abuse' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Nameservers</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {whoisData.nameservers.map((ns, idx) => (
                  <span key={idx} className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-mono text-sm">
                    {ns}
                  </span>
                ))}
                {whoisData.nameservers.length === 0 && (
                  <p className="text-gray-500">No nameservers found</p>
                )}
              </div>
            </div>

            {whoisData.status && whoisData.status.length > 0 && (
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Domain Status</h3>
                <div className="flex flex-wrap gap-2">
                  {whoisData.status.map((status, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 text-xs">
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showRaw && whoisData.rawData && (
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Raw WHOIS Data</h3>
                  <button
                    onClick={() => copyValue(whoisData.rawData, 'raw')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-gray-300 text-sm transition-colors"
                  >
                    {copied === 'raw' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </button>
                </div>
                <pre className="p-4 bg-[#0d0d12] rounded-xl text-gray-300 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {whoisData.rawData}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── DNS Records Results ── */}
        {dnsData && activeTab === 'dns' && (
          <div className="space-y-6">
            <div className="whois-card bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{dnsData.domain}</h2>
                  <p className="text-gray-400 mt-1">{dnsData.totalRecords} DNS records found</p>
                </div>
              </div>
            </div>

            {/* Email Security */}
            <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Email Security</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                  <span className="text-gray-400">SPF</span>
                  {dnsData.security.spf ? <Check className="w-5 h-5 text-green-400" /> : <span className="text-red-400 text-xs">Not found</span>}
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                  <span className="text-gray-400">DMARC</span>
                  {dnsData.security.dmarc ? <Check className="w-5 h-5 text-green-400" /> : <span className="text-red-400 text-xs">Not found</span>}
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex items-center justify-between">
                  <span className="text-gray-400">DKIM</span>
                  {dnsData.security.dkim.length > 0 ? <Check className="w-5 h-5 text-green-400" /> : <span className="text-red-400 text-xs">Not found</span>}
                </div>
              </div>
              {dnsData.security.spf && (
                <div className="mt-3 p-3 bg-[#0d0d12] rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">SPF Record</p>
                  <p className="text-green-400 font-mono text-xs break-all">{dnsData.security.spf}</p>
                </div>
              )}
              {dnsData.security.dmarc && (
                <div className="mt-2 p-3 bg-[#0d0d12] rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">DMARC Record</p>
                  <p className="text-green-400 font-mono text-xs break-all">{dnsData.security.dmarc}</p>
                </div>
              )}
            </div>

            {/* DNS Records Table */}
            <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">DNS Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Value</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnsData.records.map((record, idx) => (
                      <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-mono">
                            {record.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-mono text-xs">{record.name}</td>
                        <td className="py-3 px-4 text-white font-mono text-xs max-w-md break-all">{record.value}</td>
                        <td className="py-3 px-4 text-gray-400">{record.priority ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── IP Lookup Results ── */}
        {ipData && activeTab === 'ip' && (
          <div className="space-y-6">
            <div className="whois-card bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{ipData.ip}</h2>
                  {ipData.hostname && <p className="text-gray-400 mt-1">{ipData.hostname}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {ipData.security.isProxy && (
                    <span className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs">Proxy</span>
                  )}
                  {ipData.security.isHosting && (
                    <span className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs">Hosting</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Location</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Country</p>
                    <p className="text-white">{ipData.location.country} ({ipData.location.countryCode})</p>
                  </div>
                  {ipData.location.region && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Region</p>
                      <p className="text-white">{ipData.location.region}</p>
                    </div>
                  )}
                  {ipData.location.city && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">City</p>
                      <p className="text-white">{ipData.location.city}</p>
                    </div>
                  )}
                  {ipData.location.timezone && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Timezone</p>
                      <p className="text-white">{ipData.location.timezone}</p>
                    </div>
                  )}
                  {ipData.location.latitude && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Coordinates</p>
                      <p className="text-white font-mono text-xs">{ipData.location.latitude}, {ipData.location.longitude}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="whois-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Network className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Network</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">ISP</p>
                    <p className="text-white">{ipData.isp.name}</p>
                  </div>
                  {ipData.isp.organization && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Organization</p>
                      <p className="text-white">{ipData.isp.organization}</p>
                    </div>
                  )}
                  {ipData.isp.as && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">AS Number</p>
                      <p className="text-white font-mono text-xs">{ipData.isp.as}</p>
                    </div>
                  )}
                  {ipData.isp.asName && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">AS Name</p>
                      <p className="text-white">{ipData.isp.asName}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !whoisData && !dnsData && !ipData && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              {activeTab === 'domain' ? 'WHOIS Lookup' : activeTab === 'dns' ? 'DNS Records' : 'IP Lookup'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'domain'
                ? 'Enter a domain name to retrieve registration information, ownership details, and nameserver configuration.'
                : activeTab === 'dns'
                  ? 'Enter a domain to look up DNS records including A, AAAA, MX, NS, TXT, SOA, and email security checks.'
                  : 'Enter an IP address to find geolocation, ISP, ASN, and security information.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
