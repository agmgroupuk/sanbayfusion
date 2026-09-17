'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Search, Loader2, Copy, Check, Globe, Lock, Unlock, AlertTriangle, Calendar, Server } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface SSLCertificate {
  subject: {
    commonName: string;
    organization: string;
    country: string;
  };
  issuer: {
    commonName: string;
    organization: string;
    country: string;
  };
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  serialNumber: string;
  signatureAlgorithm: string;
  keySize: number;
  fingerprint: string;
  subjectAltNames: string[];
  isValid: boolean;
  chainValid: boolean;
  protocol: string;
  cipher: string;
}

interface SSLResult {
  host: string;
  port: number;
  certificate: SSLCertificate;
  warnings: string[];
  grade: string;
}

export default function SSLCheckerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SSLResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('sslWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.ssl-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-25, 25)',
        scale: 'random(0.9, 1.1)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-ssl-symbol');
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

      gsap.to('.hero-ssl-icon', {
        boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.check-form', {
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
    if (!host.trim()) return;

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
      const response = await fetch('/api/tools/ssl-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: host.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTimeout(() => {
          gsap.from('.ssl-card', {
            opacity: 0,
            y: 30,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out',
          });
        }, 50);
      } else {
        setError(result.error || 'SSL check failed');
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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'from-green-600 to-emerald-600 text-white';
      case 'B':
        return 'from-yellow-600 to-amber-600 text-white';
      case 'C':
        return 'from-orange-600 to-red-600 text-white';
      default:
        return 'from-red-600 to-rose-600 text-white';
    }
  };

  const getDaysColor = (days: number) => {
    if (days > 60) return 'text-green-400';
    if (days > 30) return 'text-yellow-400';
    if (days > 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="ssl-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-[100px]" />
        <div className="ssl-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-teal-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['TLS', 'HTTPS', 'X.509', 'SHA2', 'RSA', 'CA'].map((sym, i) => (
          <div
            key={i}
            className="floating-ssl-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-ssl-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>SSL Checker</span>
              </h1>
              <p className="text-gray-400">
                Analyze SSL/TLS certificates and security configuration
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="check-form max-w-3xl">
            <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Enter domain (e.g., google.com)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="check-btn px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Checking...' : 'Check SSL'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="ssl-card bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {data.certificate.isValid ? (
                    <Lock className="w-10 h-10 text-green-400" />
                  ) : (
                    <Unlock className="w-10 h-10 text-red-400" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">{data.host}</h2>
                    <p className="text-gray-400">Port {data.port}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${getGradeColor(data.grade)} font-bold text-2xl`}>
                    {data.grade}
                  </div>
                  <div className="text-center px-4 py-2 bg-white/[0.02] rounded-xl">
                    <p className={`text-2xl font-bold ${getDaysColor(data.certificate.daysRemaining)}`}>
                      {data.certificate.daysRemaining}
                    </p>
                    <p className="text-xs text-gray-400">Days Left</p>
                  </div>
                </div>
              </div>
            </div>

            {data.warnings && data.warnings.length > 0 && (
              <div className="ssl-card bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="ssl-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Certificate Subject</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Common Name</p>
                    <p className="text-white font-medium">{data.certificate.subject.commonName}</p>
                  </div>
                  {data.certificate.subject.organization && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Organization</p>
                      <p className="text-white">{data.certificate.subject.organization}</p>
                    </div>
                  )}
                  {data.certificate.subject.country && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Country</p>
                      <p className="text-white">{data.certificate.subject.country}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="ssl-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Issuer</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-[#0d0d12] rounded-lg">
                    <p className="text-gray-400 mb-1">Common Name</p>
                    <p className="text-white font-medium">{data.certificate.issuer.commonName}</p>
                  </div>
                  {data.certificate.issuer.organization && (
                    <div className="p-3 bg-[#0d0d12] rounded-lg">
                      <p className="text-gray-400 mb-1">Organization</p>
                      <p className="text-white">{data.certificate.issuer.organization}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ssl-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Validity Period</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0d0d12] rounded-xl">
                  <p className="text-gray-400 mb-1">Valid From</p>
                  <p className="text-white font-medium">{new Date(data.certificate.validFrom).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-[#0d0d12] rounded-xl">
                  <p className="text-gray-400 mb-1">Valid To</p>
                  <p className={`font-medium ${getDaysColor(data.certificate.daysRemaining)}`}>
                    {new Date(data.certificate.validTo).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="ssl-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">Technical Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Protocol</span>
                  <span className="text-green-400">{data.certificate.protocol}</span>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Cipher</span>
                  <span className="text-white text-xs">{data.certificate.cipher}</span>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Key Size</span>
                  <span className="text-white">{data.certificate.keySize} bits</span>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Signature</span>
                  <span className="text-white text-xs">{data.certificate.signatureAlgorithm}</span>
                </div>
                <div className="p-3 bg-[#0d0d12] rounded-lg flex justify-between items-center">
                  <span className="text-gray-400">Chain Valid</span>
                  <span className={data.certificate.chainValid ? 'text-green-400' : 'text-red-400'}>
                    {data.certificate.chainValid ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-[#0d0d12] rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fingerprint (SHA-256)</span>
                  <button onClick={() => copyValue(data.certificate.fingerprint, 'fingerprint')} className="text-gray-400 hover:text-white">
                    {copied === 'fingerprint' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-white font-mono text-xs mt-2 break-all">{data.certificate.fingerprint}</p>
              </div>
            </div>

            {data.certificate.subjectAltNames && data.certificate.subjectAltNames.length > 0 && (
              <div className="ssl-card bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Subject Alternative Names</h3>
                <div className="flex flex-wrap gap-2">
                  {data.certificate.subjectAltNames.map((name, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      {name}
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
              <ShieldCheck className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">SSL Certificate Checker</h3>
            <p className="text-gray-500">
              Enter a domain to analyze its SSL/TLS certificate, check expiration dates, and verify security configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
