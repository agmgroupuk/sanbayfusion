/**
 * Canvas Studio Pricing Paywall
 * Shows 3 plans fetched from /api/canvas/studio-plans.
 * Falls back to defaults if the API is unreachable.
 */

import React, { useState, useEffect } from 'react';
import { Zap, Crown, Infinity, Check, Loader2, ArrowRight, X, Shield, Clock, Sparkles } from 'lucide-react';
import billingService from '../services/billingService';

interface PricingPlan {
  id: 'weekly' | 'monthly' | 'yearly';
  name: string;
  price: number;
  originalPrice: number;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  badge?: string;
  popular?: boolean;
  color: string;
  gradient: string;
  discount?: string;
}

// Static plan metadata (UI-only fields that don't come from the API)
const PLAN_META: Record<string, Omit<PricingPlan, 'id' | 'name' | 'price' | 'originalPrice'>> = {
  weekly: {
    period: '7 days',
    discount: '50% OFF',
    description: 'Try it out for a week',
    icon: <Zap className="w-6 h-6" />,
    features: [
      'Unlimited AI generations',
      'All AI models access',
      'Multi-page site builder',
      'One-click deploy to Maula.ai',
      'Export & download code',
    ],
    color: '#3B82F6',
    gradient: 'from-blue-500 to-cyan-500',
  },
  monthly: {
    period: '30 days',
    discount: '50% OFF',
    description: 'Best value for regular use',
    icon: <Crown className="w-6 h-6" />,
    features: [
      'Everything in Weekly',
      'Deploy to Vercel, Railway & more',
      'Custom subdomain hosting',
      'Priority AI model access',
      'Image-to-code conversion',
      'Voice input support',
    ],
    badge: 'Most Popular',
    popular: true,
    color: '#EF4444',
    gradient: 'from-primary-500 to-primary-600',
  },
  yearly: {
    period: '1 year',
    discount: '50% OFF',
    description: 'Best value — full year access',
    icon: <Infinity className="w-6 h-6" />,
    features: [
      'Everything in Monthly',
      '365 days of full access',
      'All updates during the year',
      'Priority support',
      'Early access to new features',
      'Save 47% vs monthly',
    ],
    badge: 'Best Deal',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
  },
};

// Defaults used while the API response loads (or if it fails)
const DEFAULT_PRICES: Record<string, { price: number; originalPrice: number }> = {
  weekly: { price: 7, originalPrice: 14 },
  monthly: { price: 19, originalPrice: 38 },
  yearly: { price: 120, originalPrice: 240 },
};

function buildPlans(prices: Record<string, { price: number; originalPrice: number }>): PricingPlan[] {
  return ['weekly', 'monthly', 'yearly'].map((id) => ({
    id: id as PricingPlan['id'],
    name: id.charAt(0).toUpperCase() + id.slice(1),
    price: prices[id].price,
    originalPrice: prices[id].originalPrice,
    ...PLAN_META[id],
  }));
}

interface PricingPaywallProps {
  userId: string | null;
  userEmail: string | null;
  onClose?: () => void;
  isOverlay?: boolean;
}

const PricingPaywall: React.FC<PricingPaywallProps> = ({ userId, userEmail, onClose, isOverlay = true }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>(buildPlans(DEFAULT_PRICES));

  // Fetch live prices from backend on mount
  useEffect(() => {
    fetch('/api/canvas/studio-plans')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.plans?.length) {
          const priceMap: Record<string, { price: number; originalPrice: number }> = {};
          for (const p of data.plans) {
            priceMap[p.id] = { price: p.price, originalPrice: p.originalPrice };
          }
          setPlans(buildPlans({ ...DEFAULT_PRICES, ...priceMap }));
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const handlePurchase = async (planId: string) => {
    if (!userId || !userEmail) {
      // Redirect to centralized login at maula.ai
      window.location.href = 'https://maula.ai/auth/login?redirect=' + encodeURIComponent('https://canvas.maula.ai');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await billingService.redirectToCheckout(userEmail, planId);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-8">
      {/* Close button for overlay mode */}
      {isOverlay && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/20 text-primary-300 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          GenCraft Pro
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Build Websites with AI
        </h2>
        <p className="text-white/60 text-lg max-w-xl mx-auto">
          Choose your plan. No auto-renewal — buy once, use for the full duration.
          Cancel anytime, purchase again when ready.
        </p>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>No Auto-Renewal</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <Check className="w-3.5 h-3.5" />
          <span>Instant Access</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedPlan === plan.id
              ? 'border-primary-500 ring-2 ring-primary-500/30 scale-[1.02]'
              : 'border-canvas-border hover:border-canvas-border'
              } ${plan.popular ? 'md:-translate-y-2' : ''}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {/* Popular badge */}
            {plan.badge && (
              <div className={`absolute top-0 left-0 right-0 py-1.5 text-center text-xs font-bold text-white bg-gradient-to-r ${plan.gradient}`}>
                {plan.badge}
              </div>
            )}

            <div className={`p-6 ${plan.badge ? 'pt-10' : ''}`} style={{ background: 'rgba(15, 15, 25, 0.8)' }}>
              {/* Plan icon & name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                  <p className="text-white/40 text-xs">{plan.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  {plan.discount && (
                    <span className="text-lg font-bold text-white/40 line-through">${plan.originalPrice}</span>
                  )}
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-white/40 text-sm">/ {plan.period}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {plan.id !== 'yearly' && (
                    <p className="text-white/30 text-xs">One-time payment • No auto-renew</p>
                  )}
                  {plan.id === 'yearly' && (
                    <p className="text-amber-400/70 text-xs">One-time payment • 365 days access</p>
                  )}
                </div>
                {plan.discount && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    🎉 {plan.discount} Welcome Gift
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                    <span className="text-white/70">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Buy button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(plan.id);
                }}
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedPlan === plan.id
                  ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl`
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {!userId ? 'Sign in to Purchase' : `Get ${plan.name} Access`}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="text-center">
        <p className="text-white/30 text-xs">
          Powered by Stripe • SSL encrypted • No auto-renewal • GenCraft Pro by Maula AI
        </p>
      </div>
    </div>
  );

  if (!isOverlay) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-4">
      {content}
    </div>
  );
};

export default PricingPaywall;
