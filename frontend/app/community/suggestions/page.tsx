'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { gsap, SplitText, ScrambleTextPlugin, ScrollTrigger, Flip, Observer, CustomWiggle, MotionPathPlugin, Draggable, InertiaPlugin, DrawSVGPlugin } from '@/lib/gsap';


export default function SuggestionsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium',
  });
  const [submitted, setSubmitted] = useState(false);
  const [suggestionId, setSuggestionId] = useState<string>('');

  const categories = [
    { value: 'feature', label: '💡 New Feature' },
    { value: 'improvement', label: '⚡ Improvement' },
    { value: 'integration', label: '🔗 Integration' },
    { value: 'performance', label: '🚀 Performance' },
    { value: 'security', label: '🔒 Security' },
    { value: 'ux', label: '🎨 User Experience' },
    { value: 'documentation', label: '📚 Documentation' },
    { value: 'other', label: '📝 Other' }
  ];

  const priorityLevels = [
    { value: 'low', label: '🟢 Nice to Have' },
    { value: 'medium', label: '🟡 Important' },
    { value: 'high', label: '🔴 Critical' }
  ];

  const benefits = [
    { icon: '💬', title: 'Your Voice Matters', desc: 'Every suggestion is reviewed by our team and helps prioritize future development.' },
    { icon: '👥', title: 'Community Driven', desc: 'Vote on and discuss ideas with other community members to show your support.' },
    { icon: '⚡', title: 'Quick Updates', desc: 'Receive notifications when your suggested feature is implemented or discussed.' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          userPriority: formData.priority,
          userName: `${formData.firstName} ${formData.lastName}`.trim(),
          userEmail: formData.email,
          company: formData.company,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit suggestion');
      }

      const data = await res.json();
      setSuggestionId(data.suggestionId || data.id || `SUG-${Date.now()}`);
      setSubmitted(true);

      // Animate success state
      gsap.fromTo('.success-container', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
      gsap.fromTo('.success-icon', { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.4)', delay: 0.2 });
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setFormData({ firstName: '', lastName: '', email: '', company: '', title: '', description: '', category: 'feature', priority: 'medium' });
    setSubmitted(false);
    setSuggestionId('');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. SplitText Hero Animation
      const heroTitle = new SplitText('.hero-title', { type: 'chars,words' });
      const heroSub = new SplitText('.hero-subtitle', { type: 'words' });
      gsap.set(heroTitle.chars, { y: 100, opacity: 0, rotateX: -90, scale: 0.9 });
      gsap.set(heroSub.words, { y: 40, opacity: 0 });
      gsap.set('.hero-badge', { y: 30, opacity: 0, scale: 0.8 });
      gsap.set('.hero-icon', { scale: 0, rotation: -360 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl
        .to('.hero-badge', { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' })
        .to('.hero-icon', { scale: 1, rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, '-=0.3')
        .to(heroTitle.chars, { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 0.7, stagger: 0.015 }, '-=0.8')
        .to(heroSub.words, { y: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '-=0.4');

      // 2. ScrambleText on suggestion ID after submit
      if (submitted) {
        gsap.to('.suggestion-id', {
          duration: 2,
          scrambleText: { text: suggestionId, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', speed: 0.3 },
          delay: 0.5
        });
      }

      // 3. ScrollTrigger for benefit cards
      gsap.set('.benefit-card', { y: 60, opacity: 0, scale: 0.9 });
      ScrollTrigger.batch('.benefit-card', {
        start: 'top 85%',
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.5)' }),
        onLeaveBack: (batch) => gsap.to(batch, { y: 60, opacity: 0, scale: 0.9, duration: 0.3 })
      });

      // 4. Flip for form elements
      gsap.set('.form-field', { opacity: 0, y: 30 });
      ScrollTrigger.batch('.form-field', {
        start: 'top 90%',
        onEnter: (batch) => {
          batch.forEach((el, i) => {
            const state = Flip.getState(el);
            gsap.set(el, { opacity: 1, y: 0 });
            Flip.from(state, { duration: 0.4, delay: i * 0.05, ease: 'power2.out' });
          });
        }
      });

      // 5. Observer for parallax
      Observer.create({
        target: window,
        type: 'scroll',
        onChangeY: (self) => {
          const scrollY = self.scrollY;
          gsap.to('.parallax-orb-1', { y: scrollY * 0.2, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-2', { y: scrollY * -0.15, duration: 0.4, ease: 'none' });
          gsap.to('.parallax-orb-3', { y: scrollY * 0.1, x: scrollY * 0.02, duration: 0.4, ease: 'none' });
        }
      });

      // 6. MotionPath for orbiting element
      gsap.to('.orbit-element', {
        motionPath: {
          path: [{ x: 0, y: 0 }, { x: 60, y: -30 }, { x: 120, y: 0 }, { x: 60, y: 30 }, { x: 0, y: 0 }],
          curviness: 2,
        },
        duration: 10,
        repeat: -1,
        ease: 'none'
      });

      // 7. CustomWiggle on submit button
      const submitBtn = document.querySelector('.submit-btn');
      if (submitBtn) {
        submitBtn.addEventListener('mouseenter', () => {
          gsap.to(submitBtn, { scale: 1.05, duration: 0.4, ease: 'suggestWiggle' });
          gsap.to('.submit-icon', { rotation: 15, scale: 1.2, duration: 0.3 });
        });
        submitBtn.addEventListener('mouseleave', () => {
          gsap.to(submitBtn, { scale: 1, duration: 0.3 });
          gsap.to('.submit-icon', { rotation: 0, scale: 1, duration: 0.3 });
        });
      }

      // 8. DrawSVG for decorative elements
      gsap.set('.draw-path', { drawSVG: '0%' });
      ScrollTrigger.create({
        trigger: '.form-section',
        start: 'top 70%',
        onEnter: () => gsap.to('.draw-path', { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' })
      });

      // 9. Form container reveal
      gsap.set('.form-container', { y: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: '.form-container',
        start: 'top 85%',
        onEnter: () => gsap.to('.form-container', { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' })
      });

      // 10. Floating particles
      gsap.utils.toArray<HTMLElement>('.float-particle').forEach((p, i) => {
        gsap.to(p, {
          x: `random(-70, 70)`,
          y: `random(-50, 50)`,
          rotation: `random(-120, 120)`,
          duration: `random(5, 9)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

      // 11. Category/priority select focus animation
      gsap.utils.toArray<HTMLElement>('.select-field').forEach((select) => {
        select.addEventListener('focus', () => {
          gsap.to(select, { scale: 1.02, borderColor: 'rgba(236, 72, 153, 0.5)', duration: 0.3 });
        });
        select.addEventListener('blur', () => {
          gsap.to(select, { scale: 1, borderColor: 'rgba(75, 85, 99, 0.5)', duration: 0.3 });
        });
      });

      // 12. Input field focus glow
      gsap.utils.toArray<HTMLElement>('.input-field').forEach((input) => {
        input.addEventListener('focus', () => {
          gsap.to(input, { boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)', duration: 0.3 });
        });
        input.addEventListener('blur', () => {
          gsap.to(input, { boxShadow: '0 0 0 rgba(236, 72, 153, 0)', duration: 0.3 });
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, [submitted, suggestionId]);

  const handleCardHover = (e: React.MouseEvent, entering: boolean) => {
    const card = e.currentTarget;
    gsap.to(card, { y: entering ? -6 : 0, scale: entering ? 1.02 : 1, duration: 0.3 });
    gsap.to(card.querySelector('.card-glow'), { opacity: entering ? 0.15 : 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="parallax-orb-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)' }} />
        <div className="parallax-orb-2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)' }} />
        <div className="parallax-orb-3 absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="float-particle absolute w-1.5 h-1.5 bg-cyan-400/20 rounded-full" style={{ left: `${10 + i * 8}%`, top: `${15 + (i % 4) * 18}%` }} />
        ))}
        <div className="orbit-element absolute top-32 left-1/3 w-2 h-2 bg-purple-400/40 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-full border border-cyan-500/30 mb-6">
            <span className="text-xl">💡</span>
            <span className="font-medium">Community Ideas</span>
          </div>
          <div className="hero-icon inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-sm rounded-2xl border border-cyan-500/30 mb-6">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="hero-title" style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Share Your Ideas</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto">
            Help shape the future of Sanbay Fusion. Submit your feature requests, improvements, and ideas.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-8 px-4 -mt-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b, idx) => (
              <div
                key={idx}
                className="benefit-card relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm text-center group hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
              >
                <div className="card-glow absolute inset-0 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl opacity-0" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">{b.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{b.title}</h3>
                  <p className="text-gray-500 text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="form-section relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* SVG Decorative Path */}
          <svg className="absolute left-0 right-0 top-1/4 h-1 w-full opacity-20" preserveAspectRatio="none">
            <line className="draw-path" x1="0" y1="0" x2="100%" y2="0" stroke="url(#suggestGrad)" strokeWidth="2" />
            <defs>
              <linearGradient id="suggestGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          {submitted ? (
            /* Success State */
            <div className="success-container relative p-12 rounded-3xl bg-white/[0.02] border border-green-500/30 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 70%)' }} />
              <div className="relative z-10 text-center">
                <div className="success-icon w-24 h-24 bg-gradient-to-br from-green-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-5xl">✓</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Thank You for Your Suggestion!</h2>
                <p className="text-gray-500 text-lg mb-8">Your idea has been submitted successfully. Our team will review it and get back to you soon.</p>

                {/* Suggestion Details */}
                <div className="bg-white/[0.03] rounded-xl p-6 mb-8 max-w-md mx-auto border border-white/[0.06]">
                  <p className="text-gray-500 text-sm mb-2">Suggestion ID</p>
                  <p className="suggestion-id text-2xl font-mono font-bold text-pink-400">{suggestionId}</p>
                  <p className="text-xs text-gray-500 mt-2">Save this for reference</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleSubmitAnother}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    ➕ Submit Another Idea
                  </button>
                  <Link href="/community" className="px-8 py-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                    👥 Back to Community
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Form */
            <div className="form-container relative p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">

              <form ref={formRef} onSubmit={handleSubmit} className="relative z-10 space-y-6">
                {/* Name Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email & Company */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company (optional)</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                {/* Category & Priority */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="select-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority *</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="select-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                    >
                      {priorityLevels.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Suggestion Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all"
                    placeholder="A brief title for your suggestion"
                  />
                </div>

                {/* Description */}
                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="input-field w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.15] transition-all resize-none"
                    placeholder="Describe your suggestion in detail. Include the problem you're trying to solve, your proposed solution, and any examples..."
                  />
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="form-field">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {submitError}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="form-field pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="submit-btn w-full py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="submit-icon text-xl">{submitting ? '⏳' : '🚀'}</span>
                    {submitting ? 'Submitting...' : 'Submit Suggestion'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      {!submitted && (
        <section className="relative z-10 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Need Help?</h2>
                <p className="text-gray-500 mb-6">
                  Have questions about your suggestion? Join our community to discuss with other members.
                </p>
                <Link href="/community/discord" className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] rounded-xl font-semibold text-white transition-all">
                  💬 Join Discord
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
