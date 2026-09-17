'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Video, ArrowLeft, Mail, CheckCircle, Users, Calendar, Play, HelpCircle, Sparkles } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Physics2DPlugin, PhysicsPropsPlugin, DrawSVGPlugin, MorphSVGPlugin, TextPlugin, CustomWiggle, CustomEase, Draggable, Observer } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, Physics2DPlugin, PhysicsPropsPlugin, DrawSVGPlugin, MorphSVGPlugin, TextPlugin, CustomWiggle, CustomEase, Draggable, Observer);

export default function WebinarRegisterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const heroSvgRef = useRef<SVGSVGElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phoneNumber: '',
    webinarTopic: 'getting-started'
  });

  const [submitted, setSubmitted] = useState(false);

  const webinarOptions = [
    { value: 'getting-started', label: 'Getting Started with AI Agents' },
    { value: 'advanced-customization', label: 'Advanced Customization Techniques' },
    { value: 'enterprise-solutions', label: 'Building Enterprise Solutions' },
    { value: 'analytics-reporting', label: 'Real-time Analytics & Reporting' }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('webinarWiggle', { wiggles: 6, type: 'easeOut' });
      CustomEase.create('webinarBounce', 'M0,0 C0.14,0 0.27,0.428 0.32,0.66 0.366,0.862 0.455,1.076 0.54,1.076 0.636,1.076 0.71,0.884 0.782,0.884 0.858,0.884 0.912,1 1,1');

      // Floating gradient orbs
      gsap.to('.webinar-gradient-orb', {
        x: 'random(-80, 80)',
        y: 'random(-50, 50)',
        scale: 'random(0.85, 1.2)',
        duration: 7,
        ease: 'sine.inOut',
        stagger: { each: 1, repeat: -1, yoyo: true },
      });

      // Floating symbols with PhysicsProps - organic floating motion
      gsap.utils.toArray('.webinar-float-symbol').forEach((el) => {
        gsap.to(el as Element, {
          physics2D: {
            velocity: 'random(50, 100)',
            angle: 'random(0, 360)',
            gravity: 0,
            friction: 0.1,
          },
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'none',
        });
      });

      // Hero title with SplitText + ScrambleText
      if (titleRef.current) {
        const titleSplit = new SplitText(titleRef.current, { type: 'chars, words' });
        
        // Initial 3D entrance with SplitText
        const titleTl = gsap.timeline();
        titleTl.from(titleSplit.chars, {
          opacity: 0,
          y: 80,
          rotationX: -90,
          rotationY: 15,
          scale: 0.5,
          stagger: 0.04,
          duration: 0.8,
          ease: 'back.out(1.7)',
        });

        // Scramble effect on hover simulation - cycles through
        titleTl.to(titleRef.current, {
          duration: 1.5,
          scrambleText: {
            text: 'Webinar Registration',
            chars: '█▓▒░<>[]{}@#$%',
            revealDelay: 0.3,
            speed: 0.4,
            newClass: 'text-purple-400',
          },
          delay: 0.5,
        });
      }

      // Subtitle with ScrambleText typing effect
      if (subtitleRef.current) {
        gsap.from(subtitleRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          delay: 0.8,
        });
        gsap.to(subtitleRef.current, {
          duration: 2,
          scrambleText: {
            text: 'Register for our upcoming webinars and enhance your AI knowledge',
            chars: 'lowerCase',
            revealDelay: 0.5,
            speed: 0.3,
          },
          delay: 1.2,
        });
      }

      // Hero SVG with DrawSVG + MorphSVG
      if (heroSvgRef.current) {
        const paths = heroSvgRef.current.querySelectorAll('.hero-svg-path');
        const morphTarget = heroSvgRef.current.querySelector('.hero-svg-morph-target');
        
        // DrawSVG - draw the paths on load
        gsap.fromTo(paths, 
          { drawSVG: '0%' },
          { 
            drawSVG: '100%', 
            duration: 2, 
            stagger: 0.3, 
            ease: 'power2.inOut',
            delay: 0.5,
          }
        );

        // MorphSVG - morph between shapes
        if (morphTarget) {
          gsap.to('.hero-svg-circle', {
            morphSVG: morphTarget as SVGPathElement,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            delay: 2.5,
          });
        }
      }

      // Physics2D particles explosion on load
      if (particlesRef.current) {
        const particles = particlesRef.current.querySelectorAll('.physics-particle');
        gsap.to(particles, {
          physics2D: {
            velocity: 'random(200, 400)',
            angle: 'random(200, 340)',
            gravity: 300,
            friction: 0.1,
          },
          opacity: 0,
          duration: 2,
          stagger: 0.02,
          delay: 0.3,
        });
      }

      // Hero icon with PhysicsProps wobble
      gsap.to('.hero-webinar-icon', {
        physicsProps: {
          rotation: { velocity: 20, acceleration: -40, friction: 0.3 },
          scale: { velocity: 0.05, acceleration: -0.1, friction: 0.2 },
        },
        duration: 3,
        repeat: -1,
        yoyo: true,
      });

      // Pulsing glow effect
      gsap.to('.hero-webinar-icon', {
        boxShadow: '0 0 80px rgba(168, 85, 247, 0.7)',
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Form fields entrance
      gsap.from('.form-field', {
        opacity: 0,
        y: 25,
        stagger: 0.08,
        duration: 0.5,
        delay: 0.5,
        ease: 'power3.out',
      });

      // Info cards entrance with ScrollTrigger
      gsap.from('.info-card', {
        scrollTrigger: {
          trigger: '.info-section',
          start: 'top 80%',
        },
        opacity: 0,
        y: 40,
        scale: 0.95,
        stagger: 0.15,
        duration: 0.6,
        ease: 'back.out(1.4)',
      });

      // FAQ accordion animation
      gsap.from('.faq-item', {
        scrollTrigger: {
          trigger: '.faq-section',
          start: 'top 80%',
        },
        opacity: 0,
        x: -30,
        stagger: 0.1,
        duration: 0.5,
        ease: 'power2.out',
      });

      // Observer for parallax effect
      Observer.create({
        target: containerRef.current,
        type: 'scroll',
        onChangeY: (self) => {
          gsap.to('.webinar-gradient-orb', {
            y: self.deltaY * 0.3,
            duration: 0.3,
            overwrite: 'auto',
          });
        },
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (submitted && successRef.current) {
      gsap.fromTo(successRef.current,
        { opacity: 0, scale: 0.8, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
      );

      gsap.fromTo('.success-checkmark',
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', delay: 0.3 }
      );

      gsap.to('.success-particles', {
        scale: 1.5,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.5,
      });
    }
  }, [submitted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Button animation
    gsap.to('.submit-btn', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        setSubmitted(true);
      }
    });

    console.log('Form submitted:', formData);
    
    setTimeout(() => {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        jobTitle: '',
        phoneNumber: '',
        webinarTopic: 'getting-started'
      });
      setSubmitted(false);
    }, 5000);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    gsap.to(e.target, {
      borderColor: 'rgba(168, 85, 247, 0.6)',
      boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)',
      duration: 0.3,
    });
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    gsap.to(e.target, {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      boxShadow: '0 0 0 rgba(168, 85, 247, 0)',
      duration: 0.3,
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#13131a] to-[#0d0d12] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="webinar-gradient-orb absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 blur-[120px]" />
        <div className="webinar-gradient-orb absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-violet-600/15 to-indigo-600/15 blur-[100px]" />
        <div className="webinar-gradient-orb absolute top-2/3 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-pink-600/10 to-rose-600/10 blur-[80px]" />
        
        {/* Floating symbols */}
        <div className="webinar-float-symbol absolute top-[15%] left-[10%] text-4xl opacity-20">📹</div>
        <div className="webinar-float-symbol absolute top-[25%] right-[15%] text-3xl opacity-15">🎯</div>
        <div className="webinar-float-symbol absolute bottom-[30%] left-[8%] text-5xl opacity-10">✨</div>
        <div className="webinar-float-symbol absolute top-[50%] right-[8%] text-4xl opacity-20">🎓</div>
        <div className="webinar-float-symbol absolute bottom-[20%] right-[20%] text-3xl opacity-15">🚀</div>
      </div>

      {/* Hero Section */}
      <section className="relative py-16 border-b border-white/10 overflow-hidden">
        {/* Physics2D Particles */}
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="physics-particle absolute w-2 h-2 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                backgroundColor: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#f0abfc' : '#c084fc',
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4">
          <Link href="/resources/webinars" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Webinars
          </Link>

          <div className="flex items-center gap-6 mb-6">
            {/* Hero Icon with SVG for DrawSVG/MorphSVG */}
            <div className="hero-webinar-icon relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 border border-purple-500/30 flex items-center justify-center">
              <svg ref={heroSvgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                {/* DrawSVG paths */}
                <path
                  className="hero-svg-path"
                  d="M20 48 L48 20 L76 48 L48 76 Z"
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.6)"
                  strokeWidth="2"
                />
                <path
                  className="hero-svg-path"
                  d="M30 48 L48 30 L66 48 L48 66 Z"
                  fill="none"
                  stroke="rgba(192, 132, 252, 0.5)"
                  strokeWidth="1.5"
                />
                {/* MorphSVG circle that morphs */}
                <circle
                  className="hero-svg-circle"
                  cx="48"
                  cy="48"
                  r="12"
                  fill="rgba(168, 85, 247, 0.3)"
                />
                {/* Target shape for morphing */}
                <path
                  className="hero-svg-morph-target"
                  d="M36 36 L60 36 L60 60 L36 60 Z"
                  fill="none"
                  style={{ visibility: 'hidden' }}
                />
              </svg>
              <Video className="w-10 h-10 text-purple-400 z-10" />
            </div>
            
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Webinar Registration</span>
              </h1>
              <p ref={subtitleRef} className="text-xl text-gray-400">
                Register for our upcoming webinars and enhance your AI knowledge
              </p>
            </div>
          </div>

          {/* Animated decorative SVG with DrawSVG */}
          <div className="absolute top-8 right-8 w-32 h-32 opacity-30 hidden md:block">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path
                className="hero-svg-path"
                d="M10 50 Q 25 10, 50 50 T 90 50"
                fill="none"
                stroke="rgba(168, 85, 247, 0.8)"
                strokeWidth="2"
              />
              <path
                className="hero-svg-path"
                d="M10 60 Q 25 20, 50 60 T 90 60"
                fill="none"
                stroke="rgba(192, 132, 252, 0.6)"
                strokeWidth="1.5"
              />
              <circle className="hero-svg-path" cx="50" cy="50" r="30" fill="none" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </section>

      {/* Registration Form Section */}
      <section className="relative py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {submitted ? (
            <div ref={successRef} className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-10 text-center relative overflow-hidden">
              {/* Success particles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="success-particles absolute w-3 h-3 rounded-full bg-green-400"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateX(60px)`,
                  }}
                />
              ))}
              
              <div className="success-checkmark w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">Registration Successful!</h2>
              <p className="text-gray-300 mb-2">
                Thank you for registering. We&apos;ve sent a confirmation email to
              </p>
              <p className="text-purple-400 font-semibold mb-4">{formData.email}</p>
              <p className="text-gray-400 mb-8">
                You&apos;ll receive webinar details and access links shortly.
              </p>
              <Link 
                href="/resources/webinars" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold transition-all hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Webinars
              </Link>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Register for a Webinar</h2>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {/* First Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-semibold mb-2 text-gray-300">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      required
                      className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      required
                      className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-field">
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Company and Job Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                      placeholder="Your Company"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Job Title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                      placeholder="Product Manager"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="form-field">
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Webinar Selection */}
                <div className="form-field">
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Select Webinar *</label>
                  <select
                    name="webinarTopic"
                    value={formData.webinarTopic}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="w-full px-4 py-3 bg-[#0d0d12] border border-white/10 rounded-xl text-white focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {webinarOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0d0d12]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Terms */}
                <div className="form-field bg-purple-500/10 p-5 rounded-xl border border-purple-500/20">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      By registering, you agree to receive webinar updates and related communications from us.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">
                      We respect your privacy and will never share your email address with third parties.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="submit-btn w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
                >
                  Complete Registration
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </form>

              {/* Back Link */}
              <div className="mt-6 text-center">
                <Link href="/resources/webinars" className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Webinars
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="info-section relative py-16 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-10 text-center text-white">What to Expect</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="info-card bg-white/5 border border-white/10 p-8 rounded-2xl text-center hover:border-purple-500/30 transition-all hover:bg-white/[0.07] group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Confirmation Email</h3>
              <p className="text-gray-400">
                You&apos;ll receive a confirmation email with webinar details and access links.
              </p>
            </div>
            <div className="info-card bg-white/5 border border-white/10 p-8 rounded-2xl text-center hover:border-purple-500/30 transition-all hover:bg-white/[0.07] group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Live Webinar</h3>
              <p className="text-gray-400">
                Join us live for interactive sessions with Q&A and expert insights.
              </p>
            </div>
            <div className="info-card bg-white/5 border border-white/10 p-8 rounded-2xl text-center hover:border-purple-500/30 transition-all hover:bg-white/[0.07] group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-green-600/30 to-emerald-600/30 border border-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Recording Access</h3>
              <p className="text-gray-400">
                Can&apos;t attend live? Access the recorded session anytime after the webinar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section relative py-16 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <HelpCircle className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                question: 'Do I need to attend live?',
                answer: 'No, you can attend live or watch the recording later. Both registered attendees and those who can\'t make it live will have access to the recording.',
              },
              {
                question: 'Will there be a Q&A session?',
                answer: 'Yes! All our webinars include a dedicated Q&A session where you can ask questions directly to our experts.',
              },
              {
                question: 'What if I need to cancel?',
                answer: 'No problem! You can unsubscribe from webinar notifications at any time. Simply click the unsubscribe link in any email we send you.',
              },
              {
                question: 'Is there a cost?',
                answer: 'All webinars are completely free! We offer these sessions to help you get the most out of our platform.',
              },
            ].map((faq, index) => (
              <div 
                key={index} 
                className="faq-item bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all hover:bg-white/[0.07]"
              >
                <h3 className="font-bold text-lg mb-3 text-purple-400 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {faq.question}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
