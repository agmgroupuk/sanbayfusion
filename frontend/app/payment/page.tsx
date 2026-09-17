'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, Observer, CustomWiggle, CustomEase } from '@/lib/gsap';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Wallet, Shield, Lock, CheckCircle, ArrowLeft, Zap, Clock, Sparkles } from 'lucide-react';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingName, setBillingName] = useState('');

  const agentName = searchParams.get('agent') || 'AI Agent';
  const agentSlug = searchParams.get('slug') || 'agent';
  const plan = searchParams.get('plan') || 'daily';
  const price = searchParams.get('price') || '$1';
  const period = searchParams.get('period') || 'daily';

  const getBillingDetails = () => {
    switch (period) {
      case 'daily':
        return { amount: 1, cycle: 'day', nextBilling: '24 hours', savings: '' };
      case 'weekly':
        return { amount: 5, cycle: 'week', nextBilling: '7 days', savings: 'Save 29%' };
      case 'monthly':
        return { amount: 15, cycle: 'month', nextBilling: '30 days', savings: 'Save 50%' };
      default:
        return { amount: 1, cycle: 'day', nextBilling: '24 hours', savings: '' };
    }
  };

  const billing = getBillingDetails();

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      CustomWiggle.create('payWiggle', { wiggles: 5, type: 'uniform' });

      // Hero animations
      gsap.set('.payment-hero-title', { y: 50, opacity: 0 });
      gsap.set('.payment-hero-subtitle', { y: 30, opacity: 0 });
      gsap.set('.payment-card-icon', { scale: 0, rotate: -180 });
      gsap.set('.payment-badge', { scale: 0, opacity: 0 });
      gsap.set('.order-summary', { x: 50, opacity: 0 });
      gsap.set('.payment-form', { x: -50, opacity: 0 });
      gsap.set('.floating-coin', { y: -50, opacity: 0, scale: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.to('.payment-card-icon', {
        scale: 1,
        rotate: 0,
        duration: 0.8,
        ease: 'back.out(1.7)'
      })
      .to('.payment-hero-title', {
        y: 0,
        opacity: 1,
        duration: 0.6
      }, '-=0.4')
      .to('.payment-hero-subtitle', {
        y: 0,
        opacity: 1,
        duration: 0.5
      }, '-=0.3')
      .to('.payment-badge', {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        stagger: 0.1,
        ease: 'back.out(1.5)'
      }, '-=0.2')
      .to('.floating-coin', {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.05
      }, '-=0.3')
      .to('.order-summary', {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out'
      }, '-=0.4')
      .to('.payment-form', {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out'
      }, '-=0.5');

      // Floating card icon
      gsap.to('.payment-card-icon', {
        y: -8,
        rotate: 5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1
      });

      // Floating coins
      document.querySelectorAll('.floating-coin').forEach((coin, i) => {
        gsap.to(coin, {
          y: `random(-20, 20)`,
          x: `random(-15, 15)`,
          duration: `random(3, 5)`,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.2
        });
      });

      // Payment method buttons hover
      document.querySelectorAll('.payment-method-btn').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
          gsap.to(btn, { scale: 1.02, duration: 0.2 });
        });
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, { scale: 1, duration: 0.2 });
        });
      });

      // Gradient orbs
      gsap.to('.gradient-orb-1', {
        x: 50,
        y: -30,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.gradient-orb-2', {
        x: -40,
        y: 40,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    router.push(`/payment/success?agent=${encodeURIComponent(agentName)}&session_id=demo_session`);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="gradient-orb-1 absolute top-20 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="gradient-orb-2 absolute bottom-40 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating coins */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="floating-coin absolute w-3 h-3 rounded-full bg-emerald-400/30"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <Link 
            href={`/agents/${agentSlug}`}
            className="inline-flex items-center text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {agentName}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="payment-card-icon mb-6 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <CreditCard className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="payment-hero-title text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Complete Your Purchase</span>
            </h1>
            <p className="payment-hero-subtitle text-xl text-gray-400 max-w-xl mx-auto">
              Get instant access to {agentName} with our secure payment
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <div className="payment-badge px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Secure Payment
              </div>
              <div className="payment-badge px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Instant Access
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <div className="payment-form">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/90 to-gray-950 border border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>

                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-3">Payment Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`payment-method-btn p-4 rounded-xl border transition-all flex items-center gap-3 ${
                        paymentMethod === 'card'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                          : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`payment-method-btn p-4 rounded-xl border transition-all flex items-center gap-3 ${
                        paymentMethod === 'wallet'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                          : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium">Wallet</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Expiry Date</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Billing Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name on Card</label>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg hover:shadow-2xl hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Pay ${billing.amount}
                      </>
                    )}
                  </button>

                  {/* Security Note */}
                  <p className="text-center text-xs text-gray-500 mt-4">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Secured by 256-bit SSL encryption
                  </p>
                </form>
              </div>
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/90 to-gray-950 border border-gray-800 sticky top-8">
                <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>

                {/* Agent Info */}
                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{agentName}</h3>
                      <p className="text-sm text-gray-400 capitalize">{period} Access</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Access Duration</span>
                    <span className="text-white capitalize">1 {billing.cycle}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Price</span>
                    <span className="text-white">${billing.amount}.00</span>
                  </div>
                  {billing.savings && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Savings</span>
                      <span>{billing.savings}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-800 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-emerald-400">${billing.amount}.00</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Unlimited conversations
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Instant access after payment
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    No auto-renewal
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 text-sm">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Access expires in {billing.nextBilling}
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="pt-6 border-t border-gray-800">
                  <div className="flex items-center justify-center gap-6 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      PCI Compliant
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      SSL Secured
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
