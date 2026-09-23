'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    interest: '',
    date: '',
    time: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', company: '', phone: '', interest: '', date: '', time: '', message: '' })
      } else {
        setSubmitStatus('error')
        setErrorMessage(data.message || 'Failed to submit request. Please try again.')
      }
    } catch (err) {
      setSubmitStatus('error')
      setErrorMessage('An error occurred. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container-custom section-padding-lg">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Schedule Your Personal Demo</span>
          </h1>
          <p className="text-xl text-neural-600 leading-relaxed mb-8">
            Experience Sanbay Fusion firsthand. Our product experts will show you exactly how our AI agents can transform your business.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-neural-100">
              <h2 className="text-xl font-bold text-neural-800 mb-6">What You'll Learn</h2>
              <div className="space-y-5">
                {[
                  { icon: "🤖", title: "AI Agent Capabilities", desc: "See how our 20+ AI agents can solve your specific challenges" },
                  { icon: "📊", title: "Real-time Analytics", desc: "Explore powerful dashboards and performance metrics" },
                  { icon: "🔧", title: "Easy Integration", desc: "Learn how to integrate Sanbay Fusion into your workflow" },
                  { icon: "💰", title: "ROI & Pricing", desc: "Understand pricing models and expected returns" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neural-800">{item.title}</h3>
                      <p className="text-sm text-neural-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-neural-100">
              <h3 className="text-xl font-bold text-neural-800 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-brand-50 rounded-lg">
                  <div className="text-2xl font-bold text-brand-600">500+</div>
                  <div className="text-xs text-neural-600">Demos Completed</div>
                </div>
                <div className="text-center p-4 bg-accent-50 rounded-lg">
                  <div className="text-2xl font-bold text-accent-600">98%</div>
                  <div className="text-xs text-neural-600">Satisfaction Rate</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">30min</div>
                  <div className="text-xs text-neural-600">Avg Demo Time</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">24h</div>
                  <div className="text-xs text-neural-600">Response Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-neural-100">
              <h2 className="text-2xl font-bold text-neural-800 mb-6">Book Your Demo</h2>

              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✅ Demo request submitted successfully! We'll contact you within 24 hours to confirm your session.</p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">❌ {errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neural-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neural-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-neural-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-neural-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="interest" className="block text-sm font-medium text-neural-700 mb-2">
                    What are you interested in? *
                  </label>
                  <select
                    id="interest"
                    name="interest"
                    value={formData.interest}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select an option</option>
                    <option value="ai-agents">AI Agent Marketplace</option>
                    <option value="enterprise">Enterprise Solutions</option>
                    <option value="custom-agents">Custom AI Agent Development</option>
                    <option value="integration">API Integration</option>
                    <option value="consulting">AI Strategy Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-neural-700 mb-2">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-neural-700 mb-2">
                      Preferred Time *
                    </label>
                    <select
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select a time</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-neural-700 mb-2">
                    Additional Details
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Tell us about your goals, challenges, or specific questions..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full btn-primary ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Submitting...' : 'Schedule Your Demo'}
                </button>

                <p className="text-sm text-neural-500 text-center">
                  🔒 We respect your privacy. No spam, unsubscribe anytime.
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-neural-800 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "How long does the demo take?",
                a: "Our demos typically last 30-45 minutes, depending on your specific needs and questions."
              },
              {
                q: "Do I need to prepare anything?",
                a: "No preparation needed! Just join with your questions ready. Our experts will guide you through everything."
              },
              {
                q: "What if I can't make the scheduled time?",
                a: "No problem! You can reschedule anytime. Just contact our support team with your preferred time."
              },
              {
                q: "Can multiple team members join?",
                a: "Absolutely! We encourage team members from different departments to join and see how Sanbay Fusion can help them."
              },
              {
                q: "Will I get a trial account after the demo?",
                a: "Yes! Qualified leads receive a 14-day free trial to experience Sanbay Fusion firsthand."
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-neural-100">
                <h3 className="font-semibold text-lg text-neural-800 mb-2">{item.q}</h3>
                <p className="text-neural-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-gradient-to-r from-brand-600 to-accent-500 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Not ready for a demo?</h2>
            <p className="text-lg opacity-90 mb-8">
              Explore our platform and see what our users are raving about.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="https://sanbayfusion.com/agents" className="btn-primary bg-white text-brand-600 hover:bg-neural-50">
                Explore Agents
              </Link>
              <Link href="/auth/signup" className="btn-primary border-2 border-white bg-transparent hover:bg-white hover:text-brand-600">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
