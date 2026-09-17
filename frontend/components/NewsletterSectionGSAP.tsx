'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Observer, CustomEase, DrawSVGPlugin, Physics2DPlugin } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function NewsletterSectionGSAP() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }
    if (!turnstileToken) {
      setStatus('error');
      setMessage('Please complete the security check');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/email/newsletter-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage('You\'re subscribed! Check your email for confirmation.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    CustomEase.create('formSpring', 'M0,0 C0.15,0.88 0.25,1.1 0.5,1 0.7,0.92 0.85,1 1,1');
    const ctx = gsap.context(() => {
      // ─── TITLE: ScrambleText glitch with pre-SplitText char intro ───
      if (titleRef.current) {
        gsap.set(titleRef.current, { opacity: 1 });
        const split = new SplitText(titleRef.current, { type: 'chars' });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
        // Chars drop in from above with blur
        tl.fromTo(split.chars,
          { opacity: 0, y: -40, scale: 0.4, filter: 'blur(6px)', rotation: () => gsap.utils.random(-20, 20) },
          { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotation: 0, duration: 0.4, stagger: { each: 0.02, from: 'random' }, ease: 'back.out(2)' }
        );
        // Then scramble after chars are visible
        tl.to(titleRef.current, {
          duration: 1.2,
          scrambleText: { text: titleRef.current.textContent || 'Stay in the Loop', chars: '!<>-_\\/[]{}—=+*^?#█', speed: 0.4, revealDelay: 0.2 },
        }, '-=0.2');
      }

      // ─── SUBTITLE: SplitText word reveal with stagger ───
      if (subtitleRef.current) {
        const subSplit = new SplitText(subtitleRef.current, { type: 'words' });
        gsap.fromTo(subSplit.words,
          { opacity: 0, y: 20, filter: 'blur(8px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 0.5, stagger: 0.03, ease: 'power3.out',
            scrollTrigger: { trigger: subtitleRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
          }
        );
      }

      // ─── FORM: Scale-in with custom spring + glow reveal ───
      if (formRef.current) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: formRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
        tl.fromTo(formRef.current,
          { opacity: 0, scale: 0.7, y: 40, filter: 'blur(6px)' },
          { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'formSpring' }
        );
        // Input glow pulse
        const input = formRef.current.querySelector('input');
        if (input) {
          tl.fromTo(input,
            { borderColor: 'rgba(255,255,255,0.1)' },
            { borderColor: 'rgba(6,182,212,0.4)', duration: 0.3, yoyo: true, repeat: 1 },
            '-=0.5'
          );
        }
      }

      // ─── GLITCH LINES: Staggered DrawSVG-style width animation ───
      const glitchLines = sectionRef.current?.querySelectorAll('.glitch-line');
      if (glitchLines?.length) {
        gsap.fromTo(glitchLines,
          { scaleX: 0, transformOrigin: 'left center' },
          {
            scaleX: 1, duration: 0.3,
            stagger: { each: 0.02, from: 'random' },
            ease: 'power2.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
          }
        );
        // Continuous random flicker
        glitchLines.forEach(line => {
          gsap.to(line, { scaleX: 0, duration: 0.15, repeat: -1, yoyo: true, repeatDelay: gsap.utils.random(2, 6), ease: 'steps(1)' });
        });
      }

      // ─── OBSERVER: Magnetic button with momentum ───
      if (btnRef.current) {
        const btn = btnRef.current;
        Observer.create({
          target: btn,
          type: 'pointer',
          onMove: (self) => {
            const rect = btn.getBoundingClientRect();
            const x = (self.x || 0) - rect.left - rect.width / 2;
            const y = (self.y || 0) - rect.top - rect.height / 2;
            gsap.to(btn, { x: x * 0.2, y: y * 0.2, scale: 1.05, boxShadow: '0 0 30px rgba(6,182,212,0.5)', duration: 0.3, ease: 'power2.out' });
          },
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { x: 0, y: 0, scale: 1, boxShadow: '0 10px 15px -3px rgba(6,182,212,0.25)', duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 md:p-12 lg:p-16 overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Decorative glitch lines */}
          <div className="absolute top-8 left-8 right-8 flex gap-1 opacity-20">
            {Array(20).fill(0).map((_, i) => (
              <div key={i} className="glitch-line h-px flex-1 bg-cyan-400" style={{ opacity: Math.random() * 0.5 + 0.2 }} />
            ))}
          </div>

          <div className="max-w-2xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 rounded-full px-4 py-2 mb-6 border border-cyan-500/20">
              <span className="text-cyan-300 text-sm font-medium">📧 Newsletter</span>
            </div>

            <h2 ref={titleRef} className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white via-cyan-100 to-blue-300/60 bg-clip-text text-transparent leading-tight mb-4" style={{ opacity: 0 }}>
              Stay in the Loop
            </h2>

            <p ref={subtitleRef} className="text-gray-400 text-lg mb-10 leading-relaxed">
              Get weekly updates on new features, AI research, and community highlights. No spam, unsubscribe anytime.
            </p>

            <div ref={formRef} className="relative">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                  placeholder="Enter your email"
                  className="flex-1 w-full sm:w-auto bg-white/[0.05] border border-white/[0.1] rounded-xl px-5 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                />
                <button
                  ref={btnRef}
                  onClick={handleSubscribe}
                  disabled={status === 'loading'}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-8 py-3.5 text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 transition-all duration-300 whitespace-nowrap disabled:opacity-60"
                >
                  {status === 'loading' ? 'Subscribing...' : status === 'success' ? '✓ Subscribed!' : 'Subscribe →'}
                </button>
              </div>
              <div className="mt-3 flex justify-center">
                <div className="overflow-hidden rounded-xl transition-all duration-300"
                  style={{ border: '1px solid rgba(147,197,253,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(186,230,253,0.05)', filter: 'brightness(0.55) contrast(1.1)' }}>
                  <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
                </div>
              </div>
              {message && (
                <p className={`text-xs mt-4 ${status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
                  {message}
                </p>
              )}
              {!message && <p className="text-gray-500 text-xs mt-4">Join 15,000+ developers. Free forever.</p>}
            </div>
          </div>

          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
