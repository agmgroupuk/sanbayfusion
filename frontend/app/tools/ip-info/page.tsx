'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  MapPin,
  Shield,
  Server,
  Clock,
  Copy,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Globe2,
  Wifi,
  Navigation,
  ArrowLeft,
  ExternalLink,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import DoctorNetworkChat from '@/components/DoctorNetworkChat';
import Script from 'next/script';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';
gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

/* ─── Interfaces ──────────────────────────────────────────────── */
interface IPLocation {
  city?: string;
  region?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  postal?: string;
  timezone?: string;
}

interface IPNetwork {
  isp?: string;
  organization?: string;
  asn?: string;
  asnName?: string;
  domain?: string;
  type?: string;
}

interface IPSecurity {
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  threat: 'low' | 'medium' | 'high';
  service?: string;
}

interface IPAbuse {
  contact: string;
  network: string;
  name: string;
}

interface IPMetadata {
  hostname?: string;
  lastUpdated: string;
  source: string;
  userAgent?: string;
}

interface IPInfoData {
  ip: string;
  location: IPLocation;
  network: IPNetwork;
  security: IPSecurity;
  abuse?: IPAbuse;
  metadata: IPMetadata;
}

interface APIResponse {
  success: boolean;
  data: IPInfoData;
  raw: any;
  error?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
const getThreatColor = (threat: string) => {
  switch (threat) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    default: return 'text-green-400 bg-green-500/10 border-green-500/30';
  }
};

const getThreatIcon = (threat: string) => {
  switch (threat) {
    case 'high': return <XCircle className="w-4 h-4" />;
    case 'medium': return <AlertTriangle className="w-4 h-4" />;
    default: return <CheckCircle className="w-4 h-4" />;
  }
};

const getSecurityAnalysis = (security: IPSecurity, network: IPNetwork) => {
  const warnings: Array<{
    level: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    recommendation: string;
  }> = [];

  if (security.isTor)
    warnings.push({ level: 'high', title: 'Tor Network Detected', description: 'This IP is associated with the Tor anonymity network.', recommendation: 'Monitor for unusual activity if this is unexpected.' });
  if (security.isProxy)
    warnings.push({ level: 'medium', title: 'Proxy Server Detected', description: 'This IP appears to be using a proxy server.', recommendation: 'Verify if proxy usage is intentional.' });
  if (security.isVPN)
    warnings.push({ level: 'medium', title: 'VPN Connection Detected', description: 'This IP is likely connected through a VPN service.', recommendation: 'VPNs may affect location accuracy.' });
  if (security.isHosting)
    warnings.push({ level: 'low', title: 'Hosting Provider IP', description: 'This IP belongs to a hosting/cloud provider.', recommendation: 'Common for servers, businesses, or VPN services.' });
  if (network.type === 'hosting' || network.organization?.toLowerCase().includes('hosting'))
    warnings.push({ level: 'low', title: 'Data Center IP', description: 'This IP originates from a data center.', recommendation: 'Expected for cloud services or servers.' });

  return { warnings };
};

/* ─── Component ───────────────────────────────────────────────── */
export default function IPInfoPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [ipData, setIpData] = useState<IPInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualIP, setManualIP] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [showQuickInfo, setShowQuickInfo] = useState(true);
  const [toast, setToast] = useState<null | { message: string; type?: 'success' | 'info' | 'error' }>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);

  /* ── GSAP Animations ─────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('ipWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.ip-gradient-orb', {
        x: 'random(-60, 60)', y: 'random(-30, 30)', scale: 'random(0.9, 1.1)',
        duration: 5, ease: 'sine.inOut', stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      document.querySelectorAll('.floating-ip-symbol').forEach((el, i) => {
        gsap.to(el, { y: -20 - i * 5, rotation: i % 2 === 0 ? 10 : -10, duration: 3 + i * 0.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });

      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars' });
        gsap.from(split.chars, { opacity: 0, y: 50, rotationX: -90, stagger: 0.03, duration: 0.6, ease: 'back.out(1.7)', delay: 0.2 });
      }

      gsap.to('.hero-ip-icon', {
        boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)', scale: 1.05,
        duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.from('.ip-search-form', { opacity: 0, y: 30, duration: 0.6, delay: 0.5, ease: 'power3.out' });
      gsap.from('.info-card', { opacity: 0, y: 40, stagger: 0.1, duration: 0.6, delay: 0.3, ease: 'power3.out', scrollTrigger: { trigger: '.info-cards-grid', start: 'top 80%' } });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  /* ── Google Maps helpers ─────────── */
  const getFallbackAddress = useCallback(() => {
    if (!ipData) return null;
    return [ipData.location.city, ipData.location.region, ipData.location.country]
      .filter(Boolean).join(', ') || null;
  }, [ipData]);

  /* ── Load Leaflet CSS ── */
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  /* ── fetch on mount ──────────────── */
  useEffect(() => { fetchIPInfo(); }, []);

  const fetchIPInfo = async (targetIP?: string) => {
    try {
      targetIP ? setSearchLoading(true) : setLoading(true);
      setError(null);
      const url = targetIP ? `/api/ipinfo?ip=${encodeURIComponent(targetIP)}` : `/api/ipinfo`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch IP information';
        try { errorMessage = JSON.parse(errorText).error || errorMessage; } catch { }
        throw new Error(errorMessage);
      }
      const result: APIResponse = await response.json();
      setIpData(result.data);
      setRawData(result.raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIpData(null);
      setRawData(null);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  /* ── Leaflet Map init / update ──── */
  useEffect(() => {
    if (!leafletReady || !ipData?.location?.coordinates) return;
    const L = (window as any).L;
    if (!L) return;

    const { lat, lng } = ipData.location.coordinates;
    const el = document.getElementById('leaflet-map');
    if (!el) return;

    if (!leafletMapRef.current) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(el).setView([lat, lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<b>${ipData.ip}</b><br>${ipData.location.city || 'Unknown'}, ${ipData.location.country || 'Unknown'}`).openPopup();

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 200);
    } else {
      leafletMapRef.current.setView([lat, lng], 12);
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lng]);
        leafletMarkerRef.current.setPopupContent(`<b>${ipData.ip}</b><br>${ipData.location.city || 'Unknown'}, ${ipData.location.country || 'Unknown'}`);
      }
    }
  }, [leafletReady, ipData]);

  /* ── Cleanup Leaflet on unmount ──── */
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
      }
    };
  }, []);

  /* ── Reverse geocoding (Nominatim) ─ */
  useEffect(() => {
    if (!ipData?.location?.coordinates) return;
    const { lat, lng } = ipData.location.coordinates;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then(res => res.json())
      .then(data => setFormattedAddress(data?.display_name || getFallbackAddress()))
      .catch(() => setFormattedAddress(getFallbackAddress()));
  }, [ipData?.location?.coordinates, getFallbackAddress]);

  /* ── Actions ─────────────────────── */
  const handleManualSearch = (e: React.FormEvent) => { e.preventDefault(); if (manualIP.trim()) fetchIPInfo(manualIP.trim()); };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      setToast({ message: `${field === 'rawData' ? 'Raw data' : field} copied`, type: 'success' });
    } catch { setToast({ message: 'Failed to copy', type: 'error' }); }
  };

  const downloadReport = () => {
    if (!ipData) return;
    const blob = new Blob([JSON.stringify({
      ip: ipData.ip, location: ipData.location, network: ipData.network,
      security: ipData.security, abuse: ipData.abuse, metadata: ipData.metadata,
      generatedAt: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ip-report-${ipData.ip}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInGoogleMapsUrl = (lat?: number, lng?: number) =>
    typeof lat === 'number' && typeof lng === 'number' ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '#';
  const getDirectionsUrl = (lat?: number, lng?: number) =>
    typeof lat === 'number' && typeof lng === 'number' ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : '#';

  const shareLocation = (lat?: number, lng?: number, address?: string, ip?: string) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const url = openInGoogleMapsUrl(lat, lng);
    try {
      navigator.share?.({ title: ip ? `IP ${ip} location` : 'Location', text: address || getFallbackAddress() || `${lat}, ${lng}`, url })
        .catch(() => copyToClipboard(url, 'shareUrl'));
    } catch { copyToClipboard(url, 'shareUrl'); }
  };

  /* ── Toast auto‑dismiss ──────────── */
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2000); return () => clearTimeout(id); }, [toast]);

  /* ─── Sub‑components ─────────────────────────────────────────── */
  const InfoCard = ({ title, children, icon, className = '' }: { title: string; children: React.ReactNode; icon: React.ReactNode; className?: string }) => (
    <div className={`info-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 flex items-center justify-center">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value, copyable = false }: { label: string; value?: string; copyable?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">{value}</span>
          {copyable && (
            <button onClick={() => copyToClipboard(value, label)} className="p-1 text-gray-500 hover:text-white transition-colors" title="Copy">
              {copiedField === label ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ─── Loading state ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Detecting Your IP Address</h2>
          <p className="text-gray-400">Please wait while we gather your network information...</p>
        </div>
      </div>
    );
  }

  /* ─── Main render ────────────────────────────────────────────── */
  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"
        strategy="afterInteractive"
        onLoad={() => setLeafletReady(true)}
      />

      <div ref={containerRef} className="min-h-screen text-white overflow-hidden">
        {/* ── Background orbs ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="ip-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-[100px]" />
          <div className="ip-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-purple-600/15 blur-[80px]" />
        </div>

        {/* ── Floating symbols ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {['IPv4', 'IPv6', 'ASN', 'BGP', 'CIDR', 'PTR'].map((sym, i) => (
            <div key={i} className="floating-ip-symbol absolute text-lg font-mono text-white/10" style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}>{sym}</div>
          ))}
        </div>

        {/* ── Hero / Search ── */}
        <section className="relative py-12 border-b border-white/[0.06]">
          <div className="container mx-auto px-4">
            <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Tools
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="hero-ip-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center">
                <Globe2 className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>IP Information</span></h1>
                <p className="text-gray-400 mt-1">Get detailed information about any IP address</p>
              </div>
            </div>

            <form onSubmit={handleManualSearch} className="ip-search-form">
              <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2 flex gap-2">
                <div className="flex-1 relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text" value={manualIP} onChange={(e) => setManualIP(e.target.value)}
                    placeholder="Enter IP address (e.g., 8.8.8.8)"
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 outline-none"
                  />
                </div>
                <button type="button" onClick={() => fetchIPInfo()} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white rounded-xl transition-all border border-white/[0.06]">
                  My IP
                </button>
                <button type="submit" disabled={searchLoading || !manualIP.trim()} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                  {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Lookup
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Content ── */}
        <div className="relative container mx-auto px-4 py-10">
          {/* Error Banner */}
          {error && (
            <div className="max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold">Error</p>
                <p className="text-red-400/80 text-sm">{error}</p>
              </div>
            </div>
          )}

          {ipData && (
            <div className="max-w-5xl mx-auto">
              {/* ── IP Header Card ── */}
              <div className="info-card bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      IP Address: <span className="text-blue-400">{ipData.ip}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-gray-300">
                      {ipData.location.city && ipData.location.country && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span>{ipData.location.city}, {ipData.location.country}</span>
                        </div>
                      )}
                      {ipData.network.isp && (
                        <div className="flex items-center gap-1.5">
                          <Wifi className="w-4 h-4 text-cyan-400" />
                          <span>{ipData.network.isp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(ipData.ip, 'ip')} className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all" title="Copy IP">
                      {copiedField === 'ip' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={downloadReport} className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all" title="Download report">
                      <Download className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Security Warnings ── */}
              {(() => {
                const sa = getSecurityAnalysis(ipData.security, ipData.network);
                return sa.warnings.length > 0 && (
                  <div className="mb-8 space-y-3">
                    {sa.warnings.map((w, idx) => (
                      <div key={idx} className={`rounded-xl border p-4 ${w.level === 'high' ? 'bg-red-500/10 border-red-500/30' :
                        w.level === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-blue-500/10 border-blue-500/30'
                        }`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${w.level === 'high' ? 'text-red-400' :
                            w.level === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                            {w.level === 'high' ? <XCircle className="w-5 h-5" /> : w.level === 'medium' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${w.level === 'high' ? 'text-red-300' :
                              w.level === 'medium' ? 'text-yellow-300' : 'text-blue-300'
                              }`}>{w.title}</h3>
                            <p className="text-sm text-gray-400 mb-1">{w.description}</p>
                            <p className="text-xs text-gray-500">💡 {w.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Map Section ── */}
              {ipData.location.coordinates && (
                <div className="info-card bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden mb-8">
                  <div className="p-4 border-b border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Geographic Location</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{formattedAddress || `${ipData.location.city || 'Unknown'}, ${ipData.location.country || 'Unknown'}`}</span>
                    </div>
                  </div>

                  <div id="leaflet-map" className="w-full h-[400px] z-0" style={{ minHeight: '400px' }} />

                  <div className="p-3 border-t border-white/[0.04] text-xs text-gray-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Location is approximate. Actual location may vary by several kilometers.</span>
                  </div>

                  <div className="p-4 border-t border-white/[0.04]">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <a href={openInGoogleMapsUrl(ipData.location.coordinates.lat, ipData.location.coordinates.lng)} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" /> Open in Google Maps
                      </a>
                      <a href={getDirectionsUrl(ipData.location.coordinates.lat, ipData.location.coordinates.lng)} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium rounded-lg border border-white/[0.06] transition-all flex items-center gap-2">
                        <Navigation className="w-4 h-4" /> Get Directions
                      </a>
                      <button onClick={() => shareLocation(ipData.location.coordinates!.lat, ipData.location.coordinates!.lng, formattedAddress || getFallbackAddress() || undefined, ipData.ip)} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium rounded-lg border border-white/[0.06] transition-all flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      <button onClick={() => { const addr = formattedAddress || getFallbackAddress(); if (addr) copyToClipboard(addr, 'address'); }} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium rounded-lg border border-white/[0.06] transition-all flex items-center gap-2">
                        <Copy className="w-4 h-4" /> Copy Address
                      </button>
                      <button onClick={() => setShowQuickInfo(v => !v)} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium rounded-lg border border-white/[0.06] transition-all flex items-center gap-2">
                        {showQuickInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {showQuickInfo ? 'Hide Info' : 'Show Info'}
                      </button>
                    </div>

                    {showQuickInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
                          <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                          <div className="font-semibold text-white">{ipData.location.coordinates.lat.toFixed(6)}, {ipData.location.coordinates.lng.toFixed(6)}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
                          <div className="text-xs text-gray-500 mb-1">Location</div>
                          <div className="font-semibold text-white text-sm">{formattedAddress || getFallbackAddress() || 'Unknown'}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
                          <div className="text-xs text-gray-500 mb-1">Network</div>
                          <div className="font-semibold text-white">{ipData.network.organization || ipData.network.isp || 'Unknown'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Info Cards Grid ── */}
              <div className="info-cards-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Location */}
                <InfoCard title="Location Information" icon={<MapPin className="w-5 h-5 text-blue-400" />}>
                  <div className="space-y-0">
                    <InfoRow label="Address" value={formattedAddress || getFallbackAddress() || undefined} copyable />
                    <InfoRow label="City" value={ipData.location.city} />
                    <InfoRow label="Region" value={ipData.location.region} />
                    <InfoRow label="Country" value={ipData.location.country} />
                    <InfoRow label="Postal Code" value={ipData.location.postal} />
                    <InfoRow label="Timezone" value={ipData.location.timezone} />
                    {ipData.location.coordinates && (
                      <InfoRow label="Coordinates" value={`${ipData.location.coordinates.lat}, ${ipData.location.coordinates.lng}`} copyable />
                    )}
                  </div>
                </InfoCard>

                {/* Network */}
                <InfoCard title="Network Information" icon={<Server className="w-5 h-5 text-cyan-400" />}>
                  <div className="space-y-0">
                    <InfoRow label="ISP" value={ipData.network.isp} copyable />
                    <InfoRow label="Organization" value={ipData.network.organization} />
                    <InfoRow label="ASN" value={ipData.network.asn} copyable />
                    <InfoRow label="ASN Name" value={ipData.network.asnName} />
                    <InfoRow label="Domain" value={ipData.network.domain} copyable />
                    <InfoRow label="Type" value={ipData.network.type} />
                  </div>
                </InfoCard>

                {/* Security */}
                <InfoCard title="Security Analysis" icon={<Shield className="w-5 h-5 text-green-400" />}>
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getThreatColor(ipData.security.threat)}`}>
                      {getThreatIcon(ipData.security.threat)}
                      <span className="font-medium text-sm">Threat Level: {ipData.security.threat.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { label: 'VPN', active: ipData.security.isVPN },
                        { label: 'Proxy', active: ipData.security.isProxy },
                        { label: 'Tor', active: ipData.security.isTor },
                        { label: 'Hosting', active: ipData.security.isHosting },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.active ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.3)]'}`} />
                          <span className="text-sm text-gray-300">{item.label}: {item.active ? 'Yes' : 'No'}</span>
                        </div>
                      ))}
                    </div>
                    {ipData.security.service && <InfoRow label="Service" value={ipData.security.service} />}
                  </div>
                </InfoCard>

                {/* Additional */}
                <InfoCard title="Additional Information" icon={<Clock className="w-5 h-5 text-purple-400" />}>
                  <div className="space-y-0">
                    <InfoRow label="Hostname" value={ipData.metadata.hostname} copyable />
                    <InfoRow label="Data Source" value={ipData.metadata.source} />
                    <InfoRow label="Last Updated" value={new Date(ipData.metadata.lastUpdated).toLocaleString()} />
                    {ipData.metadata.userAgent && (
                      <div className="py-2">
                        <span className="text-sm text-gray-400 block mb-1">User Agent</span>
                        <span className="text-xs text-gray-300 bg-white/[0.03] border border-white/[0.04] p-2 rounded-lg block break-all font-mono">
                          {ipData.metadata.userAgent}
                        </span>
                      </div>
                    )}
                  </div>
                </InfoCard>
              </div>

              {/* ── Abuse Contact ── */}
              {ipData.abuse && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Abuse Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="font-medium text-yellow-400/80">Contact:</span><p className="text-yellow-200">{ipData.abuse.contact}</p></div>
                    <div><span className="font-medium text-yellow-400/80">Network:</span><p className="text-yellow-200">{ipData.abuse.network}</p></div>
                    <div><span className="font-medium text-yellow-400/80">Name:</span><p className="text-yellow-200">{ipData.abuse.name}</p></div>
                  </div>
                </div>
              )}

              {/* ── Raw Data ── */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <button onClick={() => setShowRawData(!showRawData)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">{showRawData ? 'Hide' : 'Show'} Raw API Data</span>
                  {showRawData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showRawData && rawData && (
                  <div className="mt-4">
                    <div className="bg-black/40 rounded-xl p-4 overflow-auto max-h-[400px] border border-white/[0.04]">
                      <pre className="text-green-400 text-sm font-mono">{JSON.stringify(rawData, null, 2)}</pre>
                    </div>
                    <button onClick={() => copyToClipboard(JSON.stringify(rawData, null, 2), 'rawData')} className="mt-3 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm rounded-lg border border-white/[0.06] transition-all flex items-center gap-2">
                      {copiedField === 'rawData' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />} Copy Raw Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!ipData && !error && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                <Globe2 className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-400">Enter an IP address above to get started</p>
            </div>
          )}
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
            toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
              'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}>
            <div className="flex items-center gap-2 text-sm">
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {toast.message}
            </div>
          </div>
        )}

        {/* ── Doctor Chat Widget ── */}
        <DoctorNetworkChat ipContext={ipData ? { ip: ipData.ip, location: ipData.location, network: ipData.network, security: ipData.security } : undefined} />
      </div>
    </>
  );
}
