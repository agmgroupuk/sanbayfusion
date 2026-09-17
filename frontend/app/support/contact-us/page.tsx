'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomWiggle } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function ContactUsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const contactMethods = [
    { icon: '📧', title: 'Email', value: 'support@sanbayfusion.com', color: 'from-blue-500 to-cyan-500' },
    { icon: '💬', title: 'Live Chat', value: 'Available 24/7', color: 'from-purple-500 to-pink-500' },
    { icon: '🌐', title: 'Social Media', value: '@maulaai', color: 'from-green-500 to-emerald-500' }
  ];

  const socialLinks = [
    { icon: '𝕏', name: 'Twitter/X', href: 'https://twitter.com/maulaai' },
    { icon: '📘', name: 'Facebook', href: 'https://facebook.com/maulaai' },
    { icon: '📸', name: 'Instagram', href: 'https://instagram.com/maulaai' },
    { icon: '💼', name: 'LinkedIn', href: 'https://linkedin.com/company/maulaai' },
    { icon: '🐙', name: 'GitHub', href: 'https://github.com/maulaai' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setIsSubmitting(true);

    // Animate send button
    gsap.to('.send-btn', {
      scale: 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });

        // Success animation - envelope flying away
        gsap.to('.envelope-icon', {
          y: -100,
          x: 100,
          rotation: 15,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.in',
          onComplete: () => {
            gsap.to('.envelope-icon', {
              y: 0,
              x: 0,
              rotation: 0,
              opacity: 1,
              duration: 0
            });
          }
        });

        // Success message entrance
        gsap.from('.success-message', {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          ease: 'back.out(2)'
        });
      } else {
        setSubmitStatus('error');
        // Error shake animation
        const shakeTl = gsap.timeline();
        shakeTl.to('.form-container', { x: -10, duration: 0.08 })
          .to('.form-container', { x: 10, duration: 0.08 })
          .to('.form-container', { x: -10, duration: 0.08 })
          .to('.form-container', { x: 10, duration: 0.08 })
          .to('.form-container', { x: 0, duration: 0.08 });
      }
    } catch (error) {
      setSubmitStatus('error');
      const shakeTl = gsap.timeline();
      shakeTl.to('.form-container', { x: -10, duration: 0.08 })
        .to('.form-container', { x: 10, duration: 0.08 })
        .to('.form-container', { x: -10, duration: 0.08 })
        .to('.form-container', { x: 10, duration: 0.08 })
        .to('.form-container', { x: 0, duration: 0.08 });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setAnimationsReady(true);
  }, []);

  useEffect(() => {
    if (!animationsReady || !containerRef.current) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Custom eases
        CustomWiggle.create('contactWiggle', { wiggles: 5, type: 'uniform' });

        // Hero orbs with morphing
        gsap.fromTo('.hero-orb',
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 0.4,
            duration: 2,
            ease: 'elastic.out(1, 0.5)',
            stagger: 0.3
          }
        );

        gsap.to('.hero-orb', {
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          duration: 12,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 2
        });

        // Message bubble particles floating
        const bubbles = document.querySelectorAll('.message-bubble');
        bubbles.forEach((bubble, i) => {
          gsap.set(bubble, {
            x: Math.random() * 300 - 150,
            y: Math.random() * 200 - 100,
            scale: Math.random() * 0.5 + 0.5,
            opacity: 0.3
          });

          gsap.to(bubble, {
            y: `-=${Math.random() * 100 + 50}`,
            x: `+=${Math.sin(i) * 30}`,
            rotation: Math.random() * 20 - 10,
            duration: Math.random() * 5 + 4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        });

        // Floating envelope animation
        gsap.to('.floating-envelope', {
          y: -20,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

      // Contact method cards with 3D entrance
      gsap.utils.toArray('.contact-method').forEach((card: any, i) => {
        gsap.from(card, {
          opacity: 0,
          rotationX: -60,
          y: 60,
          transformPerspective: 800,
          transformOrigin: 'top center',
          duration: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          },
          delay: i * 0.15
        });

        // Hover with icon wiggle
        const icon = card.querySelector('.method-icon');
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            y: -8,
            scale: 1.03,
            boxShadow: '0 20px 40px rgba(139, 92, 246, 0.25)',
            duration: 0.3
          });
          gsap.to(icon, {
            rotation: 15,
            scale: 1.2,
            duration: 0.4,
            ease: 'contactWiggle'
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            duration: 0.3
          });
          gsap.to(icon, {
            rotation: 0,
            scale: 1,
            duration: 0.3
          });
        });
      });

      // Social links with stagger
      gsap.utils.toArray('.social-link').forEach((link: any, i) => {
        gsap.from(link, {
          opacity: 0,
          scale: 0,
          rotation: -180,
          duration: 0.5,
          ease: 'back.out(2)',
          scrollTrigger: {
            trigger: '.social-container',
            start: 'top 80%'
          },
          delay: i * 0.1
        });

        link.addEventListener('mouseenter', () => {
          gsap.to(link, {
            scale: 1.2,
            rotation: 10,
            duration: 0.2
          });
        });

        link.addEventListener('mouseleave', () => {
          gsap.to(link, {
            scale: 1,
            rotation: 0,
            duration: 0.2
          });
        });
      });

      // Form fields entrance
      gsap.utils.toArray('.form-field').forEach((field: any, i) => {
        gsap.from(field, {
          opacity: 0,
          x: -40,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.form-container',
            start: 'top 80%'
          },
          delay: i * 0.1
        });

        // Input focus animation
        const input = field.querySelector('input, textarea');
        if (input) {
          input.addEventListener('focus', () => {
            gsap.to(field, {
              scale: 1.02,
              x: 5,
              duration: 0.2
            });
            gsap.to(field.querySelector('.field-icon'), {
              scale: 1.2,
              color: '#8b5cf6',
              duration: 0.2
            });
          });

          input.addEventListener('blur', () => {
            gsap.to(field, {
              scale: 1,
              x: 0,
              duration: 0.2
            });
            gsap.to(field.querySelector('.field-icon'), {
              scale: 1,
              color: '#9ca3af',
              duration: 0.2
            });
          });
        }
      });

      // Send button pulse
      gsap.to('.send-btn', {
        boxShadow: '0 0 0 15px rgba(139, 92, 246, 0)',
        duration: 2,
        repeat: -1,
        ease: 'power2.out'
      });

      // Rotating ring decoration
      gsap.to('.contact-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none'
      });

      // Observer for parallax on scroll
      ScrollTrigger.refresh();
    }, containerRef);

    return () => ctx.revert();
    }, 50);

    return () => clearTimeout(timer);
  }, [animationsReady]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030304] text-white overflow-hidden">
      {/* Nebula Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute top-[50%] right-[15%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] left-[40%] w-[350px] h-[350px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Message Bubble Particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="message-bubble fixed text-3xl pointer-events-none z-0"
          style={{ left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 40}%` }}
        >
          💬
        </div>
      ))}

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center py-24 px-4">
        {/* Gradient Orbs */}
        <div className="hero-orb absolute top-10 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute bottom-10 right-1/3 w-80 h-80 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />

        {/* Floating Envelope */}
        <div className="floating-envelope absolute top-24 right-24 text-7xl opacity-70">
          ✉️
        </div>

        {/* Contact Ring */}
        <div className="contact-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-dashed border-white/[0.06] rounded-full" />

        <div className="hero-content relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Contact Us</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto">
            Get in touch with our team. We're here to help you succeed with AI agents.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method, i) => (
              <div key={i} className="contact-method relative p-6 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] text-center overflow-hidden">
                {/* Corner accents */}
                <div className={`method-icon w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center text-3xl mb-4`}>
                  {method.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{method.title}</h3>
                <p className="text-gray-400">{method.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="form-container relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              <div className="flex items-center gap-3 mb-6">
                <span className="envelope-icon text-3xl">📨</span>
                <h2 className="text-2xl font-bold text-white">Send us a message</h2>
              </div>

              {submitStatus === 'success' && (
                <div className="success-message mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 font-medium flex items-center gap-2">
                    <span>✅</span>
                    Message sent successfully! We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="error-message mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 font-medium flex items-center gap-2">
                    <span>❌</span>
                    Failed to send message. Please try again.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="form-field relative">
                  <span className="field-icon absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your Name"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>

                <div className="form-field relative">
                  <span className="field-icon absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Your Email"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>

                <div className="form-field relative">
                  <span className="field-icon absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📝</span>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Subject (optional)"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>

                <div className="form-field relative">
                  <span className="field-icon absolute left-4 top-4 text-gray-400">💬</span>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Your Message"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all resize-none"
                  />
                </div>

                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} className="mb-3" />

                <button
                  type="submit"
                  disabled={isSubmitting || !turnstileToken}
                  className="send-btn w-full py-4 bg-gradient-to-r from-cyan-600 to-violet-600 rounded-xl text-lg font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <span>🚀</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Social Links & Info */}
            <div className="space-y-8">
              <div className="relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Corner accents */}
                <h3 className="text-xl font-bold text-white mb-6">Connect With Us</h3>
                <div className="social-container flex flex-wrap gap-4">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all"
                    >
                      <span className="text-2xl">{social.icon}</span>
                      <span className="text-gray-500">{social.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Corner accents */}
                <h3 className="text-xl font-bold text-white mb-4">Response Times</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">General Inquiries</span>
                    <span className="text-green-400 font-semibold">~24 hours</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Technical Support</span>
                    <span className="text-cyan-400 font-semibold">~4 hours</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-5/6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Priority Support</span>
                    <span className="text-violet-400 font-semibold">~1 hour</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[95%] bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-2xl border border-violet-500/30">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">💡</div>
                  <div>
                    <h4 className="font-bold text-white">Need faster help?</h4>
                    <p className="text-gray-400 text-sm">Try our live chat for instant support</p>
                  </div>
                </div>
                <Link
                  href="/support/live-support"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors text-sm"
                >
                  <span>Start Live Chat</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
