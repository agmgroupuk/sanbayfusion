'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Palette, ArrowLeft, Copy, Check, RefreshCw, Pipette, Sliders } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface ColorFormat {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  hsv: { h: number; s: number; v: number };
  cmyk: { c: number; m: number; y: number; k: number };
}

export default function ColorPickerPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [color, setColor] = useState('#3B82F6');
  const [copied, setCopied] = useState<string | null>(null);
  const [colorFormats, setColorFormats] = useState<ColorFormat | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('colorWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.color-gradient-orb', {
        x: 'random(-50, 50)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 5,
        ease: 'sine.inOut',
        stagger: { each: 0.6, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-color-symbol');
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

      gsap.to('.hero-color-icon', {
        boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.color-panel', {
        opacity: 0,
        y: 30,
        stagger: 0.12,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      setColorFormats(convertColor(color));
    }
  }, [color]);

  const convertColor = (hex: string): ColorFormat => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === rNorm) h = ((gNorm - bNorm) / diff) % 6;
      else if (max === gNorm) h = (bNorm - rNorm) / diff + 2;
      else h = (rNorm - gNorm) / diff + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const l = (max + min) / 2;
    const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));

    const v = max;
    const sHsv = max === 0 ? 0 : diff / max;

    const k = 1 - max;
    const c = max === 0 ? 0 : (1 - rNorm - k) / (1 - k);
    const m = max === 0 ? 0 : (1 - gNorm - k) / (1 - k);
    const y = max === 0 ? 0 : (1 - bNorm - k) / (1 - k);

    return {
      hex,
      rgb: { r, g, b },
      hsl: { h, s: Math.round(s * 100), l: Math.round(l * 100) },
      hsv: { h, s: Math.round(sHsv * 100), v: Math.round(v * 100) },
      cmyk: { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) },
    };
  };

  const generateRandomColor = () => {
    const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setColor(hex);
    gsap.fromTo('.random-btn', { scale: 0.9, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  };

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    gsap.fromTo(`.copy-btn-${id}`, { scale: 1.2 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    setTimeout(() => setCopied(null), 2000);
  };

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const generatePalette = (baseHex: string) => {
    const colors = colorFormats;
    if (!colors) return [];

    const { h, s, l } = colors.hsl;
    const complementary = `hsl(${(h + 180) % 360}, ${s}%, ${l}%)`;
    const triadic1 = `hsl(${(h + 120) % 360}, ${s}%, ${l}%)`;
    const triadic2 = `hsl(${(h + 240) % 360}, ${s}%, ${l}%)`;
    const analogous1 = `hsl(${(h + 30) % 360}, ${s}%, ${l}%)`;
    const analogous2 = `hsl(${(h - 30 + 360) % 360}, ${s}%, ${l}%)`;

    return [
      { name: 'Complementary', value: complementary },
      { name: 'Triadic 1', value: triadic1 },
      { name: 'Triadic 2', value: triadic2 },
      { name: 'Analogous 1', value: analogous1 },
      { name: 'Analogous 2', value: analogous2 },
    ];
  };

  const generateShades = (baseHex: string) => {
    const colors = colorFormats;
    if (!colors) return [];

    const { h, s } = colors.hsl;
    return Array.from({ length: 9 }, (_, i) => {
      const lightness = 10 + i * 10;
      return `hsl(${h}, ${s}%, ${lightness}%)`;
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="color-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-[100px]" />
        <div className="color-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-blue-600/15 to-cyan-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['#FF0', '#0CF', '#F0F', '#0F0', 'RGB', 'HSL'].map((sym, i) => (
          <div
            key={i}
            className="floating-color-symbol absolute text-lg font-mono text-white/10"
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
            <div className="hero-color-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center">
              <Palette className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Color Picker</span>
              </h1>
              <p className="text-gray-400">
                Pick colors and convert between HEX, RGB, HSL, and more
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="color-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Pipette className="w-5 h-5 text-purple-400" />
                  Color Picker
                </h3>
                <button
                  onClick={generateRandomColor}
                  className="random-btn flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Random
                </button>
              </div>

              <div
                className="w-full h-48 rounded-xl mb-4 border border-white/[0.10] flex items-center justify-center transition-all duration-300"
                style={{ backgroundColor: color }}
              >
                <span className="text-2xl font-bold" style={{ color: getContrastColor(color) }}>
                  {color.toUpperCase()}
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-14 h-14 rounded-lg cursor-pointer border-2 border-white/[0.10]"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 p-3 bg-[#0d0d12] border border-white/[0.06] rounded-xl text-white font-mono uppercase focus:border-purple-500/50 outline-none"
                  placeholder="#000000"
                />
              </div>

              {colorFormats && (
                <div className="space-y-3">
                  <h4 className="text-sm text-gray-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    Sliders
                  </h4>
                  <div>
                    <label className="text-xs text-gray-500">Hue</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={colorFormats.hsl.h}
                      onChange={(e) => {
                        const h = parseInt(e.target.value);
                        const { s, l } = colorFormats.hsl;
                        const newColor = hslToHex(h, s, l);
                        setColor(newColor);
                      }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Saturation</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={colorFormats.hsl.s}
                      onChange={(e) => {
                        const s = parseInt(e.target.value);
                        const { h, l } = colorFormats.hsl;
                        const newColor = hslToHex(h, s, l);
                        setColor(newColor);
                      }}
                      className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Lightness</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={colorFormats.hsl.l}
                      onChange={(e) => {
                        const l = parseInt(e.target.value);
                        const { h, s } = colorFormats.hsl;
                        const newColor = hslToHex(h, s, l);
                        setColor(newColor);
                      }}
                      className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="color-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Color Formats</h3>
              {colorFormats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'HEX', value: colorFormats.hex.toUpperCase() },
                    { label: 'RGB', value: `rgb(${colorFormats.rgb.r}, ${colorFormats.rgb.g}, ${colorFormats.rgb.b})` },
                    { label: 'HSL', value: `hsl(${colorFormats.hsl.h}, ${colorFormats.hsl.s}%, ${colorFormats.hsl.l}%)` },
                    { label: 'HSV', value: `hsv(${colorFormats.hsv.h}, ${colorFormats.hsv.s}%, ${colorFormats.hsv.v}%)` },
                    { label: 'CMYK', value: `cmyk(${colorFormats.cmyk.c}%, ${colorFormats.cmyk.m}%, ${colorFormats.cmyk.y}%, ${colorFormats.cmyk.k}%)` },
                    { label: 'CSS Variable', value: `--color: ${colorFormats.hex};` },
                  ].map((format) => (
                    <div key={format.label} className="p-3 bg-[#0d0d12] rounded-xl flex justify-between items-center group hover:bg-white/[0.04] transition-colors">
                      <div>
                        <p className="text-gray-400 text-xs">{format.label}</p>
                        <p className="text-white text-sm font-mono">{format.value}</p>
                      </div>
                      <button
                        onClick={() => copyValue(format.value, format.label)}
                        className={`copy-btn-${format.label} opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/[0.06] rounded transition-all`}
                      >
                        {copied === format.label ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="color-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Color Harmony</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {generatePalette(color).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const hslMatch = item.value.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                      if (hslMatch) {
                        const hex = hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
                        setColor(hex);
                      }
                    }}
                    className="group"
                  >
                    <div
                      className="w-full h-16 rounded-xl border border-white/[0.10] group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: item.value }}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">{item.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="color-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Shades</h3>
              <div className="flex gap-1">
                {generateShades(color).map((shade, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const hslMatch = shade.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                      if (hslMatch) {
                        const hex = hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
                        setColor(hex);
                      }
                    }}
                    className="flex-1 h-12 rounded-lg border border-white/[0.06] hover:scale-110 transition-transform"
                    style={{ backgroundColor: shade }}
                    title={`${10 + index * 10}%`}
                  />
                ))}
              </div>
            </div>

            <div className="color-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">CSS Gradient Preview</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Linear Gradient</p>
                  <div
                    className="w-full h-16 rounded-xl"
                    style={{ background: `linear-gradient(90deg, ${color} 0%, #ffffff 100%)` }}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Radial Gradient</p>
                  <div
                    className="w-full h-16 rounded-xl"
                    style={{ background: `radial-gradient(circle, ${color} 0%, #000000 100%)` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
