import { createLogger } from '../services/logger';
const log = createLogger('BillingPanel');
import React, { useState, useEffect } from 'react';
import { fetchWithCredentials } from '../fetchUtil';

// Maula Editor Pricing Tiers — unified credit system ($5 min / $500 max)
const PRICING_TIERS = [
  { id: 'starter', name: 'Starter', price: 5, credits: 50, unit: 'credits', popular: false },
  { id: 'basic', name: 'Basic', price: 25, credits: 250, unit: 'credits', popular: false },
  { id: 'pro', name: 'Pro', price: 100, credits: 1000, unit: 'credits', popular: true },
  { id: 'business', name: 'Business', price: 250, credits: 2500, unit: 'credits', popular: false },
  { id: 'enterprise', name: 'Enterprise', price: 500, credits: 5000, unit: 'credits', popular: false },
];

const FEATURES = [
  'AI Code Completion',
  'Multi-file Editing',
  'Git Integration',
  'Terminal & Debug',
  '50+ Languages'
];

interface BillingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://editor.maula.ai/api' : 'http://localhost:3204/api');
const APP_ID = 'maula-editor';

export const BillingPanel: React.FC<BillingPanelProps> = ({ isOpen, onClose, userId }) => {
  const [credits, setCredits] = useState<number>(0);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCredits();
    }
  }, [isOpen]);

  const fetchCredits = async () => {
    try {
      const res = await fetchWithCredentials(`${API_BASE}/billing/credits?app=${APP_ID}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const raw = data.credits;
        const value = typeof raw === 'object' && raw !== null ? Number(raw.balance) : Number(raw);
        setCredits(Number.isFinite(value) ? value : 0);
      }
    } catch (error) {
      log.error('Failed to fetch credits:', error);
    }
  };

  const handlePurchase = async (tier: typeof PRICING_TIERS[0]) => {
    if (!userId) {
      alert('Please sign in to purchase credits');
      return;
    }

    setProcessing(tier.id);
    try {
      const res = await fetchWithCredentials(`${API_BASE}/billing/checkout/${APP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          packageId: tier.id,
          credits: tier.credits,
          price: tier.price
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      log.error('Checkout error:', error);
      alert('Failed to process checkout');
    } finally {
      setProcessing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-green-500/30 shadow-2xl shadow-green-500/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Maula Editor</h2>
              <p className="text-gray-400 text-sm">AI Code Editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Balance */}
        {userId && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 mb-6 border border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="text-gray-400 text-sm">Current Balance:</div>
              <div className="text-xl font-bold text-white">{credits.toLocaleString()} <span className="text-green-400">comps</span></div>
            </div>
          </div>
        )}

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-xl p-5 border transition-all duration-300 hover:translate-y-[-2px] ${tier.popular
                ? 'bg-gradient-to-b from-green-500/15 to-emerald-500/10 border-green-500/40 shadow-lg shadow-green-500/10'
                : 'bg-gray-800/30 border-gray-700/50 hover:border-green-500/30'
                }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                  <span className={`text-sm ${tier.popular ? 'text-green-300' : 'text-gray-400'}`}>{tier.name}</span>
                  <span className="font-bold text-white">${tier.price} <span className="text-xs text-gray-500">/ {tier.credits} {tier.unit}</span></span>
                </div>
              </div>

              <button
                onClick={() => handlePurchase(tier)}
                disabled={processing === tier.id}
                className={`mt-4 w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm ${processing === tier.id
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/25'
                  }`}
              >
                {processing === tier.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Included Features</h4>
          <div className="grid grid-cols-2 gap-2">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPanel;
