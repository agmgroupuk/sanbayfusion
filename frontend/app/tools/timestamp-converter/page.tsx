'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Clock, ArrowLeft, Copy, Check, RefreshCw, Calendar, Globe, ArrowRightLeft } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

export default function TimestampConverterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [unixTimestamp, setUnixTimestamp] = useState(Math.floor(Date.now() / 1000).toString());
  const [humanDate, setHumanDate] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [copied, setCopied] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('timeWiggle', { wiggles: 5, type: 'easeOut' });

      gsap.to('.time-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 6,
        ease: 'sine.inOut',
        stagger: { each: 0.8, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-time-symbol');
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

      gsap.to('.hero-time-icon', {
        boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.converter-panel', {
        opacity: 0,
        y: 30,
        stagger: 0.15,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (unixTimestamp) {
      const timestamp = parseInt(unixTimestamp);
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp * 1000);
        setHumanDate(formatDate(date, selectedTimezone));
      }
    }
  }, [unixTimestamp, selectedTimezone]);

  const formatDate = (date: Date, timezone: string) => {
    try {
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return date.toLocaleString();
    }
  };

  const handleDateToUnix = () => {
    if (humanDate) {
      const date = new Date(humanDate);
      if (!isNaN(date.getTime())) {
        setUnixTimestamp(Math.floor(date.getTime() / 1000).toString());
      }
    }
  };

  const setNow = () => {
    const now = Math.floor(Date.now() / 1000);
    setUnixTimestamp(now.toString());
    gsap.fromTo('.now-btn', { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  };

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const timestamp = parseInt(unixTimestamp) || 0;
  const date = new Date(timestamp * 1000);

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="time-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-[100px]" />
        <div className="time-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-purple-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['UTC', 'ISO', 'UNIX', 'GMT', 'ms', 'epoch'].map((sym, i) => (
          <div
            key={i}
            className="floating-time-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-time-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Timestamp Converter</span>
              </h1>
              <p className="text-gray-400">
                Convert between Unix timestamps and human-readable dates
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="converter-panel bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Unix Timestamp</p>
              <p className="text-4xl font-bold font-mono text-white">{Math.floor(currentTime / 1000)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Current Time (UTC)</p>
              <p className="text-xl text-white">{new Date(currentTime).toUTCString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="converter-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Unix Timestamp
              </h3>
              <button
                onClick={setNow}
                className="now-btn flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Now
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={unixTimestamp}
                onChange={(e) => setUnixTimestamp(e.target.value.replace(/\D/g, ''))}
                className="w-full p-4 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono text-xl focus:border-blue-500/50 outline-none"
                placeholder="Enter Unix timestamp"
              />
              <button
                onClick={() => copyValue(unixTimestamp, 'unix')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                {copied === 'unix' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-2">Seconds since January 1, 1970 (Unix Epoch)</p>
          </div>

          <div className="converter-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Human Readable
              </h3>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="px-3 py-1.5 bg-[#0d0d12] border border-white/[0.06] rounded-lg text-gray-300 text-sm outline-none"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                value={humanDate}
                onChange={(e) => setHumanDate(e.target.value)}
                onBlur={handleDateToUnix}
                className="w-full p-4 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white text-xl focus:border-purple-500/50 outline-none"
                placeholder="MM/DD/YYYY, HH:MM:SS"
              />
              <button
                onClick={() => copyValue(humanDate, 'human')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                {copied === 'human' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-2">Press Enter or blur to convert to Unix timestamp</p>
          </div>
        </div>

        <div className="converter-panel mt-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            Converted Date in All Timezones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timezones.map((tz) => (
              <div key={tz} className="p-3 bg-[#0d0d12] rounded-xl flex justify-between items-center group hover:bg-white/[0.04] transition-colors">
                <div>
                  <p className="text-gray-400 text-xs">{tz}</p>
                  <p className="text-white text-sm font-mono">{formatDate(date, tz)}</p>
                </div>
                <button
                  onClick={() => copyValue(formatDate(date, tz), tz)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all"
                >
                  {copied === tz ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="converter-panel mt-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-orange-400" />
            Date Formats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'ISO 8601', value: date.toISOString() },
              { label: 'RFC 2822', value: date.toUTCString() },
              { label: 'Milliseconds', value: (timestamp * 1000).toString() },
              { label: 'Local Date', value: date.toLocaleDateString() },
              { label: 'Local Time', value: date.toLocaleTimeString() },
              { label: 'Relative', value: getRelativeTime(timestamp * 1000) },
            ].map((format) => (
              <div key={format.label} className="p-3 bg-[#0d0d12] rounded-xl flex justify-between items-center group hover:bg-white/[0.04] transition-colors">
                <div>
                  <p className="text-gray-400 text-xs">{format.label}</p>
                  <p className="text-white text-sm font-mono truncate max-w-xs">{format.value}</p>
                </div>
                <button
                  onClick={() => copyValue(format.value, format.label)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all"
                >
                  {copied === format.label ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.abs(Math.floor(diff / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const suffix = diff > 0 ? 'ago' : 'from now';

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ${suffix}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ${suffix}`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${suffix}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${suffix}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ${suffix}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ${suffix}`;
}
