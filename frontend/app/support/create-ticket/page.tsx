'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, CustomWiggle } from '@/lib/gsap';

export default function CreateTicketPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phoneNumber: '',
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general',
    attachments: [] as File[]
  });

  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string>('');
  const [ticketNumber, setTicketNumber] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const categories = [
    { value: 'general', label: 'General Support', icon: '💬', color: 'from-blue-500 to-cyan-500' },
    { value: 'billing', label: 'Billing & Payment', icon: '💳', color: 'from-green-500 to-emerald-500' },
    { value: 'technical', label: 'Technical Issue', icon: '🔧', color: 'from-orange-500 to-amber-500' },
    { value: 'bug', label: 'Bug Report', icon: '🐛', color: 'from-red-500 to-pink-500' },
    { value: 'feature', label: 'Feature Request', icon: '✨', color: 'from-purple-500 to-violet-500' },
    { value: 'account', label: 'Account Issue', icon: '👤', color: 'from-indigo-500 to-blue-500' },
    { value: 'integration', label: 'Integration Help', icon: '🔌', color: 'from-teal-500 to-cyan-500' },
    { value: 'studio', label: 'Studio & Canvas', icon: '🎨', color: 'from-pink-500 to-rose-500' },
    { value: 'agents', label: 'AI Agents', icon: '🤖', color: 'from-cyan-500 to-violet-500' },
    { value: 'other', label: 'Other', icon: '📋', color: 'from-gray-500 to-slate-500' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', sublabel: 'Can wait', icon: '🟢', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    { value: 'medium', label: 'Medium', sublabel: 'Normal', icon: '🟡', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    { value: 'high', label: 'High', sublabel: 'Urgent', icon: '🟠', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    { value: 'critical', label: 'Critical', sublabel: 'Emergency', icon: '🔴', color: 'text-red-400', bgColor: 'bg-red-500/20' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));

    // Animate progress bar
    setUploadProgress(0);
    gsap.to({ val: 0 }, {
      val: 100,
      duration: 1,
      ease: 'power2.out',
      onUpdate: function() {
        setUploadProgress(Math.round(this.targets()[0].val));
      }
    });
  };

  const removeAttachment = (index: number) => {
    // Animate removal
    const attachment = document.querySelectorAll('.attachment-item')[index];
    gsap.to(attachment, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        setFormData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Submit animation
    gsap.to('.submit-btn', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    try {
      const guestUserId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: guestUserId,
          userEmail: formData.email,
          userName: `${formData.firstName} ${formData.lastName}`,
          userPhone: formData.phoneNumber,
          username: formData.username,
          subject: formData.subject,
          description: formData.description,
          category: formData.category,
          priority: formData.priority
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      if (data.success && data.ticket) {
        setTicketId(data.ticket.ticketId);
        setTicketNumber(data.ticket.ticketNumber || 0);
        setSubmitted(true);

        // Success animation
        gsap.to('.form-container', {
          opacity: 0,
          y: -30,
          scale: 0.95,
          duration: 0.4,
          onComplete: () => {
            gsap.to('.success-container', {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.7)'
            });
          }
        });

        // Ticket flying animation
        for (let i = 0; i < 30; i++) {
          const ticket = document.createElement('div');
          ticket.className = 'fixed w-6 h-6 pointer-events-none z-50 text-xl';
          ticket.textContent = '🎫';
          ticket.style.left = '50%';
          ticket.style.top = '40%';
          document.body.appendChild(ticket);

          gsap.to(ticket, {
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500,
            rotation: Math.random() * 720,
            opacity: 0,
            duration: 1.5,
            ease: 'power2.out',
            delay: i * 0.02,
            onComplete: () => ticket.remove()
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
      // Error shake
      const shakeTl = gsap.timeline();
      shakeTl.to('.form-container', { x: -15, duration: 0.07 })
        .to('.form-container', { x: 15, duration: 0.07 })
        .to('.form-container', { x: -10, duration: 0.07 })
        .to('.form-container', { x: 10, duration: 0.07 })
        .to('.form-container', { x: -5, duration: 0.07 })
        .to('.form-container', { x: 5, duration: 0.07 })
        .to('.form-container', { x: 0, duration: 0.07 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setFormData({
      firstName: '', lastName: '', email: '', username: '', phoneNumber: '',
      subject: '', description: '', priority: 'medium', category: 'general', attachments: []
    });
    setSubmitted(false);
    setTicketId('');
    setTicketNumber(0);
    setError('');

    gsap.to('.success-container', {
      opacity: 0,
      scale: 0.95,
      duration: 0.3,
      onComplete: () => {
        gsap.to('.form-container', {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4
        });
      }
    });
  };

  useEffect(() => {
    setAnimationsReady(true);
  }, []);

  useEffect(() => {
    if (!animationsReady || !containerRef.current) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // Custom effects
        CustomWiggle.create('ticketWiggle', { wiggles: 6, type: 'uniform' });

        // Hero orbs
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
          borderRadius: '60% 40% 30% 70% / 40% 50% 60% 50%',
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 1
        });

        // Floating ticket particles
        const tickets = document.querySelectorAll('.ticket-particle');
        tickets.forEach((ticket) => {
          gsap.set(ticket, {
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            rotation: Math.random() * 30 - 15
          });

          gsap.to(ticket, {
            y: `-=${Math.random() * 60 + 30}`,
            rotation: `+=${Math.random() * 20 - 10}`,
            duration: Math.random() * 4 + 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        });

        // Floating ticket animation
        gsap.to('.floating-ticket', {
          y: -20,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });

      // Category cards with 3D flip entrance
      gsap.utils.toArray('.category-card').forEach((card: any, i) => {
        gsap.from(card, {
          opacity: 0,
          rotationY: 90,
          scale: 0.8,
          transformPerspective: 1000,
          duration: 0.6,
          ease: 'back.out(1.5)',
          scrollTrigger: { trigger: '.categories-grid', start: 'top 85%' },
          delay: i * 0.05
        });

        // Hover effect
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            scale: 1.08,
            y: -5,
            boxShadow: '0 15px 30px rgba(139, 92, 246, 0.3)',
            duration: 0.2
          });
          gsap.to(card.querySelector('.category-icon'), {
            rotation: 15,
            scale: 1.2,
            duration: 0.3,
            ease: 'ticketWiggle'
          });
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            boxShadow: 'none',
            duration: 0.2
          });
          gsap.to(card.querySelector('.category-icon'), {
            rotation: 0,
            scale: 1,
            duration: 0.2
          });
        });
      });

      // Priority buttons animation
      gsap.utils.toArray('.priority-btn').forEach((btn: any, i) => {
        gsap.from(btn, {
          opacity: 0,
          x: -30,
          duration: 0.4,
          scrollTrigger: { trigger: '.priority-section', start: 'top 85%' },
          delay: i * 0.1
        });
      });

      // Form fields stagger
      gsap.utils.toArray('.form-field').forEach((field: any, i) => {
        gsap.from(field, {
          opacity: 0,
          y: 30,
          duration: 0.5,
          scrollTrigger: { trigger: '.form-container', start: 'top 80%' },
          delay: i * 0.08
        });
      });

      // Submit button pulse
      gsap.to('.submit-btn', {
        boxShadow: '0 0 0 15px rgba(139, 92, 246, 0)',
        duration: 2,
        repeat: -1,
        ease: 'power2.out'
      });

      // Progress indicator animation
      gsap.to('.progress-indicator', {
        width: '100%',
        duration: 3,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true
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

      {/* Ticket Particles */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="ticket-particle fixed text-2xl opacity-20 pointer-events-none z-0"
          style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 60}%` }}
        >
          🎫
        </div>
      ))}

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[50vh] flex items-center justify-center py-20 px-4">
        {/* Gradient Orbs */}
        <div className="hero-orb absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
        <div className="hero-orb absolute bottom-10 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />

        {/* Floating Ticket */}
        <div className="floating-ticket absolute top-20 right-24 text-6xl opacity-70">
          🎫
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Create Support Ticket</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Get help from our expert support team. We typically respond within 2-4 hours.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {!submitted ? (
            <div className="form-container relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Corner accents */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 font-medium flex items-center gap-2">
                    <span>❌</span> {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Category Selection */}
                <div>
                  <label className="block text-lg font-semibold text-white mb-4">Select Category</label>
                  <div className="categories-grid grid grid-cols-2 md:grid-cols-5 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                        className={`category-card p-4 rounded-xl border text-center transition-all ${
                          formData.category === cat.value
                            ? 'bg-violet-500/20 border-violet-500'
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className={`category-icon text-2xl mb-2`}>{cat.icon}</div>
                        <div className="text-xs text-gray-500">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="priority-section">
                  <label className="block text-lg font-semibold text-white mb-4">Priority Level</label>
                  <div className="flex flex-wrap gap-3">
                    {priorityLevels.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                        className={`priority-btn flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                          formData.priority === p.value
                            ? `${p.bgColor} border-current ${p.color}`
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <div className="text-left">
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs opacity-70">{p.sublabel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-500 mb-2">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="John"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    placeholder="Please describe your issue in detail..."
                  />
                </div>

                {/* File Upload */}
                <div className="form-field">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Attachments (optional)</label>
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-white/[0.1] transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-4xl mb-2">📎</div>
                      <p className="text-gray-400">Drop files here or click to upload</p>
                    </label>
                  </div>
                  
                  {formData.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.attachments.map((file, i) => (
                        <div key={i} className="attachment-item flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-sm text-gray-500">📄 {file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="submit-btn w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-lg font-semibold hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Ticket...</span>
                    </>
                  ) : (
                    <>
                      <span>🎫</span>
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="success-container relative p-8 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-green-500/30 opacity-0 transform scale-95 overflow-hidden">
              {/* Corner accents */}
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-5xl">✅</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Ticket Created Successfully!</h2>
                <p className="text-gray-400">Our support team will review your ticket shortly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-gray-400 text-sm mb-1">Ticket ID</p>
                  <p className="text-2xl font-mono font-bold text-blue-400">{ticketId}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
                  <p className="text-gray-400 text-sm mb-1">Ticket Number</p>
                  <p className="text-2xl font-bold text-violet-400">#{ticketNumber}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCreateAnother}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                >
                  Create Another Ticket
                </button>
                <Link
                  href="/support"
                  className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium text-center transition-colors"
                >
                  Back to Support
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
