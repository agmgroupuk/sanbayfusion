'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Observer, CustomWiggle, CustomEase, TextPlugin } from '@/lib/gsap';
import { Briefcase, User, Mail, Phone, MapPin, FileText, Upload, ChevronRight, ChevronLeft, Check, Sparkles, Star, Building, Calendar, DollarSign, Send, Loader2, Terminal } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, CustomWiggle, TextPlugin);

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Experience', icon: Briefcase },
  { id: 3, title: 'Work History', icon: Building },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Additional', icon: Star },
];

function ApplyJobContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLSpanElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const position = searchParams.get('position') || 'General Application';
  const jobId = searchParams.get('id') || 'general';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    yearsExperience: '',
    currentRole: '',
    currentCompany: '',
    skills: '',
    workHistory: [
      { company: '', role: '', duration: '', description: '' }
    ],
    resume: null as File | null,
    coverLetter: null as File | null,
    whyJoin: '',
    salary: '',
    startDate: '',
    referral: '',
  });

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = document.documentElement.scrollHeight; };
    resize(); window.addEventListener('resize', resize);
    const colors = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fca5a5', '#fde68a'];
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random(), speed: Math.random() * 0.008 + 0.003,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed; if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.7;
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1) { ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha)) * 0.15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill(); }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('formWiggle', { wiggles: 6, type: 'uniform' });

      gsap.set('.hero-title-wrap', { y: 60, opacity: 0, filter: 'blur(20px)' });
      gsap.set('.hero-subtitle', { y: 40, opacity: 0, filter: 'blur(10px)' });
      gsap.set('.step-indicator', { scale: 0.5, opacity: 0 });
      gsap.set('.form-container', { y: 40, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl
        .to('.hero-title-wrap', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.4, delay: 0.2 })
        .to('.hero-subtitle', { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2 }, '-=0.9')
        .to('.step-indicator', { scale: 1, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.6')
        .to('.form-container', { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.2');

      gsap.to('.hero-icon-container', {
        boxShadow: '0 0 80px rgba(139,92,246,0.5), 0 0 160px rgba(139,92,246,0.2), inset 0 0 30px rgba(139,92,246,0.1)',
        scale: 1.08, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.to('.hero-ring', { rotation: 360, duration: 20, repeat: -1, ease: 'none' });

      if (typewriterRef.current) {
        const phrases = [
          'Join Our Team',
          'Build the Future of AI',
          'Shape Tomorrow\'s Tech',
          'Make an Impact',
          'Grow With Us',
        ];
        const tw = gsap.timeline({ repeat: -1, delay: 1.2 });
        phrases.forEach((phrase) => {
          tw.to(typewriterRef.current, { duration: 0.6, text: { value: phrase, delimiter: '' }, ease: 'none' });
          tw.to({}, { duration: 2 });
          tw.to(typewriterRef.current, { duration: 0.3, text: { value: '', delimiter: '' }, ease: 'none' });
        });
      }

      gsap.utils.toArray<HTMLElement>('.floating-icon').forEach((icon, i) => {
        gsap.fromTo(icon,
          { y: 30, opacity: 0, scale: 0 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, delay: 0.3 + i * 0.1, ease: 'back.out(2)' }
        );
        gsap.to(icon, {
          y: `random(-12, 12)`, x: `random(-8, 8)`, rotation: `random(-8, 8)`,
          duration: `random(3, 4.5)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.2
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Step transition animation
  useEffect(() => {
    gsap.fromTo('.step-content',
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, [currentStep]);

  const updateField = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateWorkHistory = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const updated = [...prev.workHistory];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workHistory: updated };
    });
  };

  const addWorkHistory = () => {
    setFormData(prev => ({
      ...prev,
      workHistory: [...prev.workHistory, { company: '', role: '', duration: '', description: '' }]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSubmitted(true);

    gsap.fromTo('.success-container',
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' }
    );
  };

  if (isSubmitted) {
    return (
      <div ref={containerRef} className="min-h-screen text-white flex items-center justify-center p-6" style={{ background: '#030304' }}>
        <div className="fixed inset-0 pointer-events-none z-[1]">
          <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        </div>
        <div className="success-container max-w-lg w-full text-center relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 30px rgba(16,185,129,0.15)' }}>
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight"><span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Application Submitted!</span></h1>
          <p className="text-gray-400 mb-8">
            Thank you for applying for <span className="text-cyan-400">{position}</span>.
            We&apos;ll review your application and get back to you within 5-7 business days.
          </p>
          <Link
            href="/resources/careers"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white font-medium hover:bg-white/[0.06] hover:border-white/[0.15] transition-all"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Careers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-screen text-white overflow-x-hidden" style={{ background: '#030304' }}>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
        <div className="absolute top-[55%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.025) 0%, transparent 70%)' }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139,92,246,0.015) 2px, rgba(139,92,246,0.015) 4px)' }} />
      <div className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="fixed inset-0 pointer-events-none z-[3]">
        <div className="floating-icon absolute top-24 left-[8%]">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-violet-500/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-violet-400" />
          </div>
        </div>
        <div className="floating-icon absolute top-36 right-[10%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-cyan-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-40 left-[10%]">
          <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="floating-icon absolute bottom-32 right-[8%]">
          <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-amber-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-28 pb-8 px-4">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="relative inline-block mb-10">
              <div className="hero-ring absolute -inset-6 rounded-full border-2 border-dashed border-violet-500/30" />
              <div className="hero-ring absolute -inset-12 rounded-full border border-violet-400/15" style={{ animationDirection: 'reverse' }} />
              <div className="hero-icon-container relative inline-flex items-center justify-center w-28 h-28 rounded-3xl border border-violet-400/40 shadow-2xl shadow-violet-600/30"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.25) 50%, rgba(139,92,246,0.3) 100%)' }}>
                <Briefcase className="w-14 h-14 relative z-10" style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.8)) drop-shadow(0 0 40px rgba(139,92,246,0.5))' }} />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400/60 animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>

            <div className="hero-title-wrap">
              <h1 className="text-4xl md:text-5xl font-bold mb-2 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Apply for</span>
              </h1>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-violet-300">{position}</span>
              </h2>
            </div>

            <p className="hero-subtitle text-lg text-gray-400 mb-8">
              Complete the form below to submit your application.
            </p>

            <div className="flex justify-center items-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 via-cyan-600/10 to-violet-600/15 border border-violet-500/25 backdrop-blur-sm shadow-lg shadow-violet-900/20">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30">
                  <Terminal className="w-3.5 h-3.5 text-violet-300" />
                </div>
                <span className="text-sm text-gray-300 font-mono">
                  <span className="text-violet-400 font-semibold">Career</span>{' '}
                  <span ref={typewriterRef} className="text-gray-200"></span>
                  <span className="typewriter-cursor inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="pb-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              {steps.map((step, i) => (
                <div key={step.id} className="step-indicator flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > step.id
                        ? 'bg-gradient-to-br from-emerald-600/90 to-cyan-600/90 shadow-lg shadow-emerald-600/15'
                        : currentStep === step.id
                          ? 'bg-gradient-to-br from-violet-600/90 to-cyan-600/90 shadow-lg shadow-violet-600/15'
                          : 'bg-white/[0.03] border border-white/[0.08]'
                      }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${currentStep === step.id ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`hidden md:block w-16 lg:w-24 h-1 mx-2 rounded ${currentStep > step.id ? 'bg-gradient-to-r from-emerald-600/80 to-cyan-600/80' : 'bg-white/[0.06]'
                      }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="hidden md:flex items-center justify-between mt-2">
              {steps.map((step) => (
                <span key={step.id} className={`text-xs ${currentStep === step.id ? 'text-cyan-400' : 'text-gray-600'}`}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="pb-20 px-4">
          <div className="form-container max-w-2xl mx-auto">
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <div className="step-content">
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Personal Information</h2>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">First Name *</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => updateField('firstName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Last Name *</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => updateField('lastName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => updateField('location', e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">LinkedIn Profile</label>
                        <input
                          type="url"
                          value={formData.linkedin}
                          onChange={(e) => updateField('linkedin', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="linkedin.com/in/username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Portfolio/Website</label>
                        <input
                          type="url"
                          value={formData.portfolio}
                          onChange={(e) => updateField('portfolio', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          placeholder="yourwebsite.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Experience */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Professional Experience</h2>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Years of Experience *</label>
                      <select
                        value={formData.yearsExperience}
                        onChange={(e) => updateField('yearsExperience', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                      >
                        <option value="">Select years</option>
                        <option value="0-1">0-1 years</option>
                        <option value="1-3">1-3 years</option>
                        <option value="3-5">3-5 years</option>
                        <option value="5-10">5-10 years</option>
                        <option value="10+">10+ years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Current/Most Recent Role</label>
                      <input
                        type="text"
                        value={formData.currentRole}
                        onChange={(e) => updateField('currentRole', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                        placeholder="Senior Software Engineer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Current/Most Recent Company</label>
                      <input
                        type="text"
                        value={formData.currentCompany}
                        onChange={(e) => updateField('currentCompany', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                        placeholder="Tech Company Inc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Key Skills</label>
                      <textarea
                        value={formData.skills}
                        onChange={(e) => updateField('skills', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors resize-none"
                        placeholder="List your key skills relevant to this role..."
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Work History */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Work History</h2>

                    {formData.workHistory.map((work, index) => (
                      <div key={index} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-cyan-400">Position {index + 1}</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Company</label>
                            <input
                              type="text"
                              value={work.company}
                              onChange={(e) => updateWorkHistory(index, 'company', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                              placeholder="Company name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Role/Title</label>
                            <input
                              type="text"
                              value={work.role}
                              onChange={(e) => updateWorkHistory(index, 'role', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                              placeholder="Your role"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Duration</label>
                          <input
                            type="text"
                            value={work.duration}
                            onChange={(e) => updateWorkHistory(index, 'duration', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                            placeholder="Jan 2020 - Present"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Description</label>
                          <textarea
                            value={work.description}
                            onChange={(e) => updateWorkHistory(index, 'description', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors resize-none"
                            placeholder="Key responsibilities and achievements..."
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addWorkHistory}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-white/[0.1] text-gray-400 hover:border-cyan-500/60 hover:text-cyan-400 transition-colors"
                    >
                      + Add Another Position
                    </button>
                  </div>
                )}

                {/* Step 4: Documents */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Upload Documents</h2>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Resume/CV *</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => updateField('resume', e.target.files?.[0] || null)}
                          className="hidden"
                          id="resume-upload"
                        />
                        <label
                          htmlFor="resume-upload"
                          className="flex items-center justify-center gap-3 w-full py-8 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-cyan-500/60 cursor-pointer transition-colors"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-gray-400">
                            {formData.resume ? formData.resume.name : 'Click to upload resume (PDF, DOC)'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Cover Letter (Optional)</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => updateField('coverLetter', e.target.files?.[0] || null)}
                          className="hidden"
                          id="cover-letter-upload"
                        />
                        <label
                          htmlFor="cover-letter-upload"
                          className="flex items-center justify-center gap-3 w-full py-8 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-cyan-500/60 cursor-pointer transition-colors"
                        >
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-gray-400">
                            {formData.coverLetter ? formData.coverLetter.name : 'Click to upload cover letter (PDF, DOC)'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Additional */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">Additional Information</h2>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Why do you want to join Sanbay Fusion?</label>
                      <textarea
                        value={formData.whyJoin}
                        onChange={(e) => updateField('whyJoin', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors resize-none"
                        placeholder="Tell us what excites you about this opportunity..."
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Salary Expectations</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            value={formData.salary}
                            onChange={(e) => updateField('salary', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                            placeholder="e.g., $80,000 - $100,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Earliest Start Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => updateField('startDate', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">How did you hear about us?</label>
                      <select
                        value={formData.referral}
                        onChange={(e) => updateField('referral', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/60 focus:outline-none transition-colors"
                      >
                        <option value="">Select an option</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="job-board">Job Board</option>
                        <option value="referral">Employee Referral</option>
                        <option value="website">Company Website</option>
                        <option value="social">Social Media</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${currentStep === 1
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentStep < 5 ? (
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600/90 to-cyan-600/90 text-white font-medium shadow-lg shadow-violet-600/15 hover:shadow-violet-600/30 transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 text-white font-bold shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030304; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        .typewriter-cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default function ApplyJobPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030304' }}>
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    }>
      <ApplyJobContent />
    </Suspense>
  );
}
