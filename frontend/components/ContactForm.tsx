'use client'

import { useState } from 'react'
import TurnstileWidget from '@/components/TurnstileWidget'

interface ContactFormProps {
  agentName?: string
  className?: string
  showTitle?: boolean
}

export default function ContactForm({ agentName, className = '', showTitle = true }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: agentName ? `Inquiry about ${agentName} Agent` : '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!turnstileToken) return
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          agentName,
          turnstileToken
        }),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ 
          name: '', 
          email: '', 
          subject: agentName ? `Inquiry about ${agentName} Agent` : '', 
          message: '' 
        })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-neural-100 ${className}`}>
      {showTitle && (
        <h3 className="text-2xl font-bold text-neural-800 mb-6">
          {agentName ? `Contact about ${agentName}` : 'Contact Us'}
        </h3>
      )}
      
      {submitStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ Message sent successfully! We'll get back to you soon.
          </p>
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">
            ❌ Failed to send message. Please try again.
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neural-700 mb-2">Name *</label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neural-700 mb-2">Email *</label>
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neural-700 mb-2">Subject</label>
          <input 
            type="text" 
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neural-700 mb-2">Message *</label>
          <textarea 
            rows={5} 
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder={agentName ? `Tell us about your interest in the ${agentName} agent...` : 'How can we help you?'}
            className="w-full px-4 py-3 border border-neural-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          ></textarea>
        </div>
        
        <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} className="mb-2" />

        <button 
          type="submit" 
          disabled={isSubmitting || !turnstileToken}
          className={`w-full btn-primary ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  )
}