import { createLogger } from '../services/logger';
const log = createLogger('MaulaNavDrawer');

import React, { useState, useEffect } from 'react';
import { fetchWithCredentials } from '../fetchUtil';
import RainCanvas from './RainCanvas';

const API_BASE = '/api';

// LLM Providers
const LLM_PROVIDERS = [
  { id: 'anthropic', name: 'Code Expert', icon: '🧠', color: 'from-violet-500 to-pink-600', models: ['Expert v4', 'Expert Pro'], status: 'active' },
  { id: 'groq', name: 'Speed Engine', icon: '⚡', color: 'from-green-500 to-emerald-600', models: ['Speed 70B'], status: 'active' },
  { id: 'xai', name: 'Reasoning Engine', icon: '🚀', color: 'from-amber-500 to-orange-600', models: ['Reasoning v3'], status: 'active' },
  { id: 'openai', name: 'Smart Engine', icon: '🤖', color: 'from-teal-500 to-cyan-600', models: ['Smart v4', 'Smart Mini'], status: 'active' },
  { id: 'gemini', name: 'Vision Engine', icon: '🔬', color: 'from-blue-400 to-violet-600', models: ['Vision Pro'], status: 'active' },
];

const CREDIT_PACKAGES = [
  { packageId: 'starter', credits: 50, price: 5.00, popular: false, savings: null },
  { packageId: 'basic', credits: 250, price: 25.00, popular: false, savings: null },
  { packageId: 'pro', credits: 1000, price: 100.00, popular: true, savings: null },
  { packageId: 'business', credits: 2500, price: 250.00, popular: false, savings: null },
  { packageId: 'enterprise', credits: 5000, price: 500.00, popular: false, savings: null },
];

interface UsageRecord {
  id: string;
  type: string;
  model: string;
  provider: string;
  credits: number;
  timestamp: number;
  description: string;
}

type DashboardTab = 'providers' | 'usage' | 'billing' | 'credits';

interface MaulaNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MaulaNavDrawer: React.FC<MaulaNavDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('providers');
  const [credits, setCredits] = useState({ available: 0, used: 0, total: 500 });
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCredits();
      loadUsageData();
      loadBillingHistory();
    }
  }, [isOpen]);

  const fetchCredits = async () => {
    setIsLoadingCredits(true);
    try {
      const res = await fetchWithCredentials(`${API_BASE}/billing/credits?app=maula-editor`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        setIsLoadingCredits(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const raw = data.credits;
        let available = 0;
        if (typeof raw === 'object' && raw !== null) {
          available = Number(raw.balance ?? raw.available ?? 0);
        } else {
          available = Number(raw ?? 0);
        }
        if (!Number.isFinite(available)) available = 0;
        setCredits({ available, used: Math.max(0, 500 - available), total: 500 });
        setIsAuthenticated(true);
      }
    } catch (error) {
      log.error('Failed to fetch credits:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  const loadUsageData = async () => {
    try {
      const res = await fetchWithCredentials(`${API_BASE}/chat/dashboard/usage?limit=30&sourceApp=maula-editor`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.usage && Array.isArray(data.usage)) {
          setUsageHistory(data.usage.map((u: any) => ({
            id: u.id || String(u.timestamp),
            type: u.type || 'chat',
            model: u.model || 'unknown',
            provider: u.provider || 'unknown',
            credits: u.creditsUsed || u.credits || 0,
            timestamp: new Date(u.createdAt || u.timestamp).getTime(),
            description: u.description || `${u.model || 'AI'} request`,
          })));
        }
      }
    } catch (error) {
      log.error('Failed to load usage data:', error);
    }
  };

  const loadBillingHistory = async () => {
    setIsLoadingBilling(true);
    try {
      const res = await fetchWithCredentials(`${API_BASE}/billing/history`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          setBillingHistory(data.history);
        }
      }
    } catch (error) {
      log.error('Failed to load billing history:', error);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    setPurchaseLoading(pkg.credits);
    try {
      const res = await fetchWithCredentials(`${API_BASE}/billing/checkout/maula-editor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId: pkg.packageId, credits: pkg.credits, price: pkg.price }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        alert('Failed to initiate checkout. Please try again.');
      }
    } catch (error) {
      log.error('Checkout error:', error);
      alert('Failed to connect to payment service.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const tabs: { id: DashboardTab; label: string; icon: string }[] = [
    { id: 'providers', label: 'Providers', icon: '🔧' },
    { id: 'usage', label: 'Usage', icon: '📊' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'credits', label: 'Buy Credits', icon: '🪙' },
  ];

  return (
    <div
      className={`fixed inset-0 bg-[#050505] z-[200] transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] flex flex-col ${isOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
    >
      {/* Rain Effect */}
      <RainCanvas isActive={isOpen} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 relative z-10 border-b border-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            <span className="text-2xl sm:text-3xl">💻</span>
          </div>
          <div>
            <h3 className="text-orange-400 font-bold text-lg sm:text-2xl tracking-[0.15em] font-mono leading-none">
              MAULA_DASHBOARD
            </h3>
            <p className="text-[9px] sm:text-xs text-orange-600/60 uppercase font-mono tracking-[0.2em] mt-1 font-bold flex items-center gap-2 sm:gap-4">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
              <span className="text-gray-800">|</span>
              PLAN: <span className="text-orange-400">PRO</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Credit Balance */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-500/30 rounded-lg">
            <span className="text-xl">🪙</span>
            <div>
              <div className="text-[8px] text-orange-400/60 uppercase tracking-widest font-bold">Credits</div>
              <div className="text-lg font-black text-orange-400">
                {isLoadingCredits ? <span className="animate-pulse">...</span> : credits.available.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/50 text-gray-400 hover:text-white hover:border-orange-500/30 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-800/50 relative z-10 overflow-x-auto">
        <div className="flex gap-1 sm:gap-2 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative px-3 sm:px-5 py-2 sm:py-3 rounded-lg transition-all flex items-center gap-2 border ${activeTab === tab.id
                ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                : 'border-transparent hover:border-orange-500/30 hover:bg-orange-500/5'
                }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${activeTab === tab.id ? 'text-orange-400' : 'text-gray-400 group-hover:text-orange-400'} transition-colors`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 sm:py-6 relative z-10">
        {/* Sign-in prompt when not authenticated */}
        {isAuthenticated === false && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
              <span className="text-4xl">💻</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Maula Editor</h3>
            <p className="text-sm text-gray-400 text-center mb-8 max-w-md">
              Sign in to access your dashboard, track usage, manage credits, and view analytics.
            </p>
            <div className="flex gap-3 mb-8">
              <a href="https://maula.ai/auth/login" className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-lg transition-all">
                Sign In
              </a>
              <a href="https://maula.ai/auth/signup" className="px-6 py-3 border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-bold text-sm rounded-lg transition-all">
                Create Account
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-sm">
              {[
                { icon: '🤖', label: 'AI Engines', desc: 'Multiple providers' },
                { icon: '📊', label: 'Real-time Analytics', desc: 'Track usage' },
                { icon: '🪙', label: 'Pay-as-you-go', desc: 'Flexible credits' },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-gray-800/50">
                  <span className="text-2xl mb-2">{f.icon}</span>
                  <span className="text-[10px] font-bold text-gray-300 text-center">{f.label}</span>
                  <span className="text-[9px] text-gray-600 text-center mt-0.5">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {isAuthenticated !== false && activeTab === 'providers' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg">🔧</span>
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider">AI Providers</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LLM_PROVIDERS.map((provider) => (
                <div key={provider.id} className="group relative bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-xl shadow-lg`}>
                      {provider.icon}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-200">{provider.name}</h5>
                      <span className="text-[9px] text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {provider.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {provider.models.map((model) => (
                      <div key={model} className="text-[11px] text-gray-400 bg-black/30 px-2.5 py-1.5 rounded-lg border border-gray-800/40 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                        {model}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-orange-400">{credits.available}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">Credits Left</div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-amber-400">{LLM_PROVIDERS.length}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">Providers</div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-emerald-400">{LLM_PROVIDERS.reduce((sum, p) => sum + p.models.length, 0)}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">Models</div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-cyan-400">{usageHistory.length}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">Requests</div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {isAuthenticated !== false && activeTab === 'usage' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg">📊</span>
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Usage History</h4>
            </div>
            {usageHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500 text-sm">No usage recorded yet</p>
                <p className="text-gray-600 text-xs mt-1">Start coding with AI to see usage data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {usageHistory.slice(0, 30).map((record) => (
                  <div key={record.id} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 flex items-center justify-between hover:border-orange-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{record.type === 'chat' ? '💬' : record.type === 'generation' ? '🚀' : '⚡'}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-200">{record.description}</p>
                        <p className="text-[10px] text-gray-500">{record.model} • {record.provider}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-orange-400">{record.credits} credits</p>
                      <p className="text-[10px] text-gray-600">{formatDate(record.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {isAuthenticated !== false && activeTab === 'billing' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg">💳</span>
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Billing History</h4>
            </div>
            {isLoadingBilling ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4 animate-pulse">💳</div>
                <p className="text-gray-500 text-sm">Loading billing history...</p>
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">💳</div>
                <p className="text-gray-500 text-sm">No billing transactions yet</p>
                <p className="text-gray-600 text-xs mt-1">Purchase credits to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {billingHistory.map((tx) => (
                  <div key={tx.id} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 flex items-center justify-between hover:border-orange-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{tx.status === 'COMPLETED' ? '✅' : tx.status === 'PENDING' ? '⏳' : '❌'}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-200">{tx.description || `${tx.creditsAdded} credits purchased`}</p>
                        <p className="text-[10px] text-gray-500">{new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-orange-400">${Number(tx.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-400">+{tx.creditsAdded} credits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buy Credits Tab */}
        {isAuthenticated !== false && activeTab === 'credits' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg">🪙</span>
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Buy Credits</h4>
            </div>

            {/* Current Balance */}
            <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-500/30 rounded-xl p-6 flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] text-orange-400/60 uppercase tracking-widest font-bold">Current Balance</div>
                <div className="text-3xl font-black text-orange-400 mt-1">
                  {isLoadingCredits ? <span className="animate-pulse">...</span> : credits.available.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">credits available</div>
              </div>
              <span className="text-5xl">🪙</span>
            </div>

            {/* Packages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.credits}
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchaseLoading !== null}
                  className={`relative flex flex-col items-center gap-2 p-5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${pkg.popular
                    ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                    : 'bg-gray-900/60 border-gray-800/60 hover:border-orange-500/30'
                    }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 right-2 px-2 py-0.5 bg-orange-500 text-white text-[9px] font-bold rounded uppercase">
                      Popular
                    </div>
                  )}
                  {purchaseLoading === pkg.credits ? (
                    <div className="text-orange-400 animate-spin text-xl">⟳</div>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-white">{pkg.credits}</div>
                      <div className="text-[10px] text-gray-500 font-mono uppercase">Credits</div>
                      <div className="mt-2 text-lg font-bold text-orange-400">${pkg.price.toFixed(2)}</div>
                      {pkg.savings && (
                        <div className="text-[9px] text-emerald-400 mt-1">{pkg.savings}</div>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-[#080808]/80 border-t border-gray-800/50 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-orange-600 animate-pulse">📡</span>
          <span className="text-[10px] text-orange-500/70 font-mono uppercase tracking-widest hidden sm:block">
            MAULA_EDITOR_v2.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <span className="text-orange-500">🪙</span>
            <span>{credits.available} credits</span>
          </div>

          {/* Back Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 hover:from-orange-600/40 hover:to-amber-600/40 border border-orange-500/50 hover:border-orange-400 rounded-lg flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
          </button>

          <button
            onClick={() => { window.location.href = 'https://maula.ai/home'; }}
            className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/40 hover:to-orange-600/40 border border-red-500/50 hover:border-red-400 rounded-lg flex items-center gap-2 text-red-400 hover:text-red-300 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(249, 115, 22, 0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(249, 115, 22, 0.4); }
      `}</style>
    </div>
  );
};

export default MaulaNavDrawer;
