'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Globe, ArrowLeft, Search, Loader2, Copy, Check, MapPin, Building, Wifi, Shield, Clock, Map } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface GeolocationData {
  ip: string;
  location: {
    country: string;
    region: string;
    city: string;
    lat: number;
    lng: number;
    postalCode: string;
    timezone: string;
  };
  isp: string;
  connectionType: string;
  organization: string;
  asn: {
    asn: string;
    name: string;
    route: string;
  };
}

export default function IPGeolocationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GeolocationData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('geoWiggle', { wiggles: 6, type: 'easeOut' });

      // Background orbs
      gsap.to('.geo-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.1)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-geo-symbol');
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

      // Hero icon with globe rotation
      gsap.to('.hero-geo-icon', {
        boxShadow: '0 0 50px rgba(6, 182, 212, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.rotating-globe', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
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

    if (!ipAddress.trim()) {
      setError('Please enter an IP address');
      return;
    }

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
    setData(null);

    try {
      const response = await fetch('/api/tools/ip-geolocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipAddress.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch IP geolocation data');
        return;
      }

      setData(result.data);

      // Animate results
      setTimeout(() => {
        gsap.from('.geo-card', {
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.5,
          ease: 'power2.out',
        });
      }, 50);
    } catch (err: any) {
      setError('An error occurred while fetching geolocation data');
      console.error('Geolocation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetMyIP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const result = await response.json();
      setIpAddress(result.ip);
    } catch (err) {
      setError('Failed to detect your IP address');
    } finally {
      setLoading(false);
    }
  };

  const copyCoordinates = async () => {
    if (data?.location) {
      await navigator.clipboard.writeText(`${data.location.lat}, ${data.location.lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="geo-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-[100px]" />
        <div className="geo-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-teal-600/15 to-emerald-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['LAT', 'LON', 'GEO', 'MAP', 'IP4', 'ASN'].map((sym, i) => (
          <div
            key={i}
            className="floating-geo-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-geo-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center overflow-hidden">
              <Globe className="rotating-globe w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>IP Geolocation</span>
              </h1>
              <p className="text-gray-400">
                Get detailed location and ISP information for any IP address
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
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address (e.g., 8.8.8.8)"
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={handleGetMyIP}
                disabled={loading}
                className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.06] text-gray-300 hover:text-white rounded-xl transition-all"
              >
                My IP
              </button>
              <button
                type="submit"
                disabled={loading || !ipAddress.trim()}
                className="lookup-btn px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
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
        {data && (
          <div className="space-y-6">
            {/* Main IP Card */}
            <div className="geo-card bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-cyan-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">IP Address</p>
                  <h2 className="text-3xl font-bold text-white font-mono">{data.ip}</h2>
                </div>
                {data.location && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Location</p>
                      <p className="text-lg font-semibold text-white">
                        {data.location.city}, {data.location.country}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center">
                      <Map className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Location Details */}
              {data.location && (
                <div className="geo-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white">Location Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">City:</span> {data.location.city}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Region:</span> {data.location.region}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Country:</span> {data.location.country}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Postal Code:</span> {data.location.postalCode}</p>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              {data.location && (
                <div className="geo-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                        <Map className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-white">Coordinates</h3>
                    </div>
                    <button
                      onClick={copyCoordinates}
                      className="p-2 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg text-gray-400 hover:text-white transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">Latitude:</span> {data.location.lat}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Longitude:</span> {data.location.lng}</p>
                    <p className="text-gray-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Timezone:</span> {data.location.timezone}
                    </p>
                  </div>
                </div>
              )}

              {/* ISP & Organization */}
              <div className="geo-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Network</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {data.isp && <p className="text-gray-300"><span className="text-gray-500">ISP:</span> {data.isp}</p>}
                  {data.organization && <p className="text-gray-300"><span className="text-gray-500">Organization:</span> {data.organization}</p>}
                  {data.connectionType && <p className="text-gray-300"><span className="text-gray-500">Connection:</span> {data.connectionType}</p>}
                </div>
              </div>

              {/* ASN Info */}
              {data.asn && (
                <div className="geo-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white">ASN Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4">
                      <p className="text-gray-500 mb-1">ASN</p>
                      <p className="text-white font-mono">{data.asn.asn}</p>
                    </div>
                    <div className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4">
                      <p className="text-gray-500 mb-1">Name</p>
                      <p className="text-white">{data.asn.name}</p>
                    </div>
                    {data.asn.route && (
                      <div className="bg-[#0d0d12] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-gray-500 mb-1">Route</p>
                        <p className="text-white font-mono">{data.asn.route}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !data && (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <Globe className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">IP Geolocation Lookup</h3>
            <p className="text-gray-500">
              Enter an IP address or click &quot;My IP&quot; to get detailed geolocation data including coordinates, ISP, and network information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
