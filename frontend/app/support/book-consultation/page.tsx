'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomWiggle } from '@/lib/gsap';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function BookConsultationPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    interest: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const steps = [
    { icon: '📅', title: 'Schedule', description: 'Choose a time that works for you', color: 'from-blue-500 to-cyan-500' },
    { icon: '💬', title: 'Discuss', description: 'Talk about your AI agent needs', color: 'from-purple-500 to-pink-500' },
    { icon: '🚀', title: 'Launch', description: 'Get started with your solution', color: 'from-green-500 to-emerald-500' }
  ];

  const experts = [
    { name: 'Dr. Sarah Chen', role: 'AI Strategy Lead', avatar: '👩‍💼', specialty: 'Enterprise Solutions' },
    { name: 'Marcus Williams', role: 'Technical Architect', avatar: '👨‍💻', specialty: 'Integration & APIs' },
    { name: 'Elena Rodriguez', role: 'Solutions Engineer', avatar: '👩‍🔬', specialty: 'Custom Development' }
  ];

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setErrorMsg('Please complete the security check');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    // Animate submit button
    gsap.to('.submit-btn', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          subject: `Consultation Request - ${formData.interest || 'General'}`,
          message: `Company: ${formData.company || 'N/A'}\nInterest: ${formData.interest || 'N/A'}\n\n${formData.message}`,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setSubmitted(true);

    // Success animation
    gsap.to('.form-container', {
      opacity: 0,
      y: -20,
      duration: 0.3,
      onComplete: () => {
        gsap.to('.success-container', {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'back.out(1.7)'
        });
      }
    });

    // Confetti effect
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece fixed w-3 h-3 rounded-full pointer-events-none z-50';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = '50%';
      confetti.style.top = '50%';
      document.body.appendChild(confetti);

      gsap.to(confetti, {
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 2,
        ease: 'power2.out',
        onComplete: () => confetti.remove()
      });
    }
  };

  useEffect(() => {
    setAnimationsReady(true);
  }, []);

  useEffect(() => {
    if (!animationsReady || !containerRef.current) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Register custom effects
        CustomWiggle.create('calendarWiggle', { wiggles: 8, type: 'easeOut' });

        // Hero gradient orbs morphing
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
          borderRadius: '40% 60% 70% 30% / 60% 40% 30% 70%',
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 1.5
        });

        // Floating calendar particles
        const calendarParticles = document.querySelectorAll('.calendar-particle');
        calendarParticles.forEach((particle) => {
          gsap.set(particle, {
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            rotation: Math.random() * 360
          });

          gsap.to(particle, {
            y: `-=${Math.random() * 80 + 40}`,
            rotation: `+=${Math.random() * 180}`,
            duration: Math.random() * 4 + 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        });

        // Floating calendar animation
        gsap.to('.floating-calendar', {
          y: -20,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

      // Steps timeline animation
      const stepsTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.steps-section',
          start: 'top 80%'
        }
      });

      // Step connector lines draw in
      stepsTl.from('.step-connector', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.5,
        stagger: 0.3
      });

      // Step cards with 3D entrance
      gsap.utils.toArray('.step-card').forEach((card: any, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 60,
          rotationY: -45,
          scale: 0.8,
          transformPerspective: 1000,
          duration: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          },
          delay: i * 0.2
        });

        // Icon bounce on scroll
        const icon = card.querySelector('.step-icon');
        gsap.to(icon, {
          y: -10,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3
        });
      });

      // Expert cards with Flip-style entrance
      gsap.utils.toArray('.expert-card').forEach((card: any, i) => {
        gsap.from(card, {
          opacity: 0,
          x: i % 2 === 0 ? -100 : 100,
          rotationZ: i % 2 === 0 ? -10 : 10,
          duration: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          }
        });

        // Magnetic hover effect
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.05,
            y: -10,
            boxShadow: '0 25px 50px rgba(139, 92, 246, 0.3)',
            duration: 0.3
          });
          gsap.to(card.querySelector('.expert-avatar'), {
            rotation: 10,
            scale: 1.1,
            duration: 0.3,
            ease: 'calendarWiggle'
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            duration: 0.3
          });
          gsap.to(card.querySelector('.expert-avatar'), {
            rotation: 0,
            scale: 1,
            duration: 0.3
          });
        });
      });

      // Form inputs entrance animation
      gsap.utils.toArray('.form-field').forEach((field: any, i) => {
        gsap.from(field, {
          opacity: 0,
          x: -50,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: field,
            start: 'top 90%'
          },
          delay: i * 0.1
        });

        // Focus effects
        const input = field.querySelector('input, select, textarea');
        if (input) {
          input.addEventListener('focus', () => {
            gsap.to(field, {
              scale: 1.02,
              borderColor: '#8b5cf6',
              duration: 0.2
            });
          });

          input.addEventListener('blur', () => {
            gsap.to(field, {
              scale: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              duration: 0.2
            });
          });
        }
      });

      // Time slots with Draggable selection feel
      gsap.utils.toArray('.time-slot').forEach((slot: any, i) => {
        gsap.from(slot, {
          opacity: 0,
          scale: 0,
          duration: 0.3,
          ease: 'back.out(2)',
          scrollTrigger: {
            trigger: '.time-slots-container',
            start: 'top 80%'
          },
          delay: i * 0.05
        });

        slot.addEventListener('mouseenter', () => {
          gsap.to(slot, {
            scale: 1.1,
            backgroundColor: 'rgba(139, 92, 246, 0.3)',
            duration: 0.2
          });
        });

        slot.addEventListener('mouseleave', () => {
          gsap.to(slot, {
            scale: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            duration: 0.2
          });
        });
      });

      // Submit button pulse
      gsap.to('.submit-btn', {
        boxShadow: '0 0 0 10px rgba(139, 92, 246, 0)',
        duration: 1.5,
        repeat: -1,
        ease: 'power2.out'
      });

      // Progress ring animation
      gsap.to('.progress-ring', {
        rotation: 360,
        duration: 3,
        repeat: -1,
        ease: 'none'
      });

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

      {/* Calendar Particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="calendar-particle fixed text-2xl opacity-20 pointer-events-none z-0"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
        >
          {['📅', '⏰', '📆', '🗓️'][i % 4]}
        </div>
      ))}

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[60vh] flex items-center justify-center py-24 px-4">
        {/* Gradient Orbs */}
        <div className="hero-orb absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />

        {/* Floating Calendar */}
        <div className="floating-calendar absolute top-20 right-20 text-7xl opacity-60">
          📅
        </div>

        {/* Progress Ring */}
        <div className="progress-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-2 border-dashed border-white/[0.06] rounded-full" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Book a Consultation</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto">
            Schedule a personalized consultation with our AI experts to discuss your specific needs and goals.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="steps-section py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-4 flex-1">
                <div className="step-card relative p-6 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] text-center overflow-hidden">
                  {/* Corner accents */}
                  <div className={`step-icon w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-4xl mb-4`}>
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="step-connector hidden md:block w-20 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experts Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
            Meet Our Experts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {experts.map((expert, i) => (
              <div key={i} className="expert-card relative p-6 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] text-center overflow-hidden">
                {/* Corner accents */}
                <div className="expert-avatar w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-4xl mb-4">
                  {expert.avatar}
                </div>
                <h3 className="text-lg font-bold text-white">{expert.name}</h3>
                <p className="text-violet-400 text-sm mb-2">{expert.role}</p>
                <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs text-gray-500">
                  {expert.specialty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {!submitted ? (
            <div className="form-container relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              <h2 className="text-2xl font-bold text-white mb-8 text-center">Schedule Your Session</h2>

              {/* Time Slots */}
              <div className="time-slots-container mb-8">
                <label className="block text-sm font-medium text-gray-500 mb-4">Select a Time Slot</label>
                <div className="flex flex-wrap gap-3">
                  {timeSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      className="time-slot px-4 py-2 bg-white/5 rounded-lg text-sm text-gray-500 hover:text-white border border-white/10 transition-colors"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-500 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="John"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Acme Inc."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="interest" className="block text-sm font-medium text-gray-500 mb-2">What are you interested in?</label>
                  <select
                    id="interest"
                    name="interest"
                    value={formData.interest}
                    onChange={handleChange}
                    title="Select your interest"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="" className="bg-[#0a0a0f]">Select an option</option>
                    <option value="enterprise" className="bg-[#0a0a0f]">Enterprise Solutions</option>
                    <option value="agents" className="bg-[#0a0a0f]">AI Agent Implementation</option>
                    <option value="custom" className="bg-[#0a0a0f]">Custom Development</option>
                    <option value="consulting" className="bg-[#0a0a0f]">Strategy Consulting</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Tell us about your project</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    placeholder="Describe your needs, goals, and timeline..."
                  />
                </div>

                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} className="mb-4" />
                {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || !turnstileToken}
                  className="submit-btn w-full py-4 bg-gradient-to-r from-cyan-600 to-violet-600 rounded-xl text-lg font-semibold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <span>📅</span>
                      <span>Schedule Consultation</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="success-container relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-green-500/30 text-center opacity-0 transform translate-y-5 overflow-hidden">
              {/* Corner accents */}
              <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Consultation Scheduled!</h2>
              <p className="text-gray-400 mb-6">
                We've sent a confirmation email with your meeting details. Our expert will reach out shortly.
              </p>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors"
              >
                <span>Back to Support</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
