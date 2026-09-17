import { createLogger } from './logger';
const log = createLogger('usageCredits.ts');
import { memoryStorage } from './memoryStorage';
// Usage & Credits Service - Tracks AI usage, credits, and billing
import { AIProvider } from '../types';
import { fetchWithCredentials } from '../fetchUtil';

// Types
export interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  lastUpdated: number;
}

export interface UsageRecord {
  id: string;
  timestamp: number;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsUsed: number;
  requestType: 'chat' | 'completion' | 'embedding' | 'image';
  success: boolean;
  responseTime: number; // ms
}

export interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCredits: number;
  requestCount: number;
  byProvider: Record<string, { tokens: number; credits: number; requests: number }>;
  byModel: Record<string, { tokens: number; credits: number; requests: number }>;
}

export interface UsageStats {
  today: DailyUsage;
  thisWeek: DailyUsage[];
  thisMonth: DailyUsage[];
  allTime: {
    totalTokens: number;
    totalCredits: number;
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
  };
}

export interface ModelPricing {
  provider: AIProvider;
  model: string;
  inputCostPer1K: number;  // Credits per 1K input tokens
  outputCostPer1K: number; // Credits per 1K output tokens
  displayName: string;
  description: string;
  maxTokens: number;
  capabilities: string[];
  tier: 'free' | 'standard' | 'premium' | 'enterprise';
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus: number;
  popular?: boolean;
}

// Model pricing configuration (credits per 1K tokens)
export const MODEL_PRICING: ModelPricing[] = [
  // Mistral Models (Primary)
  {
    provider: 'mistral',
    model: 'mistral-large-2501',
    inputCostPer1K: 2.0,
    outputCostPer1K: 6.0,
    displayName: 'Logic Pro',
    description: 'Most powerful logic engine',
    maxTokens: 32768,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'premium',
  },
  {
    provider: 'mistral',
    model: 'codestral-latest',
    inputCostPer1K: 0.8,
    outputCostPer1K: 2.4,
    displayName: 'Code Specialist',
    description: 'Optimized for code generation',
    maxTokens: 32768,
    capabilities: ['code'],
    tier: 'standard',
  },
  {
    provider: 'mistral',
    model: 'mistral-small-latest',
    inputCostPer1K: 0.5,
    outputCostPer1K: 1.5,
    displayName: 'Logic Lite',
    description: 'Balanced performance',
    maxTokens: 32768,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
  // xAI Models
  {
    provider: 'xai',
    model: 'grok-3',
    inputCostPer1K: 3.0,
    outputCostPer1K: 9.0,
    displayName: 'Reasoning v3',
    description: 'Most powerful reasoning engine',
    maxTokens: 131072,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'premium',
  },
  {
    provider: 'xai',
    model: 'grok-3-fast',
    inputCostPer1K: 1.5,
    outputCostPer1K: 4.5,
    displayName: 'Reasoning Fast',
    description: 'Faster reasoning responses',
    maxTokens: 131072,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
  {
    provider: 'xai',
    model: 'grok-3-mini',
    inputCostPer1K: 0.5,
    outputCostPer1K: 1.5,
    displayName: 'Reasoning Lite',
    description: 'Lightweight reasoning',
    maxTokens: 131072,
    capabilities: ['chat', 'code'],
    tier: 'free',
  },
  // OpenAI Models (Fallback)
  {
    provider: 'openai',
    model: 'gpt-4.1',
    inputCostPer1K: 2.0,
    outputCostPer1K: 8.0,
    displayName: 'Neural Pro',
    description: 'Advanced reasoning and vision',
    maxTokens: 128000,
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    tier: 'premium',
  },
  {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    inputCostPer1K: 0.4,
    outputCostPer1K: 1.6,
    displayName: 'Neural Fast',
    description: 'Fast and efficient',
    maxTokens: 128000,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPer1K: 2.5,
    outputCostPer1K: 10.0,
    displayName: 'Neural Vision',
    description: 'Multimodal with vision',
    maxTokens: 128000,
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    tier: 'premium',
  },
];

// Credit packages — $5 min / $500 max, 1 credit = $0.10, 25% margin on API cost
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 50, price: 5, currency: 'USD', bonus: 0 },
  { id: 'basic', name: 'Basic', credits: 250, price: 25, currency: 'USD', bonus: 0 },
  { id: 'pro', name: 'Pro', credits: 1000, price: 100, currency: 'USD', bonus: 0, popular: true },
  { id: 'business', name: 'Business', credits: 2500, price: 250, currency: 'USD', bonus: 0 },
  { id: 'enterprise', name: 'Enterprise', credits: 5000, price: 500, currency: 'USD', bonus: 0 },
];

// Storage keys
const STORAGE_KEYS = {
  CREDITS: 'ai_credits_balance',
  USAGE_RECORDS: 'ai_usage_records',
  DAILY_USAGE: 'ai_daily_usage',
};

class UsageCreditsService {
  private credits: CreditBalance;
  private usageRecords: UsageRecord[];
  private dailyUsage: Map<string, DailyUsage>;
  private listeners: Set<(event: string, data: any) => void>;
  private dbSynced: boolean = false;

  constructor() {
    this.credits = this.loadCreditsFromCache();
    this.usageRecords = this.loadUsageRecordsFromCache();
    this.dailyUsage = this.loadDailyUsageFromCache();
    this.listeners = new Set();
    // Kick off async DB sync
    this.syncCreditsFromDB();
  }

  // ========================================================================
  // DB-first credit loading with memoryStorage as offline cache
  // ========================================================================
  private async syncCreditsFromDB(): Promise<void> {
    try {
      const res = await fetchWithCredentials('/api/billing/credits?app=maula-editor', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const dbCredits = data.credits || 0;
        this.credits = {
          totalCredits: dbCredits,
          usedCredits: Math.max(0, (this.credits.totalCredits || dbCredits) - dbCredits),
          remainingCredits: dbCredits,
          lastUpdated: Date.now(),
        };
        this.saveCreditsToCache();
        this.dbSynced = true;
        this.emit('creditsUpdated', { balance: this.credits, source: 'db_sync' });
      }
    } catch (e) {
      log.warn('[UsageCredits] DB sync failed, using cached credits:', e);
    }
  }

  // Load/Save methods — memoryStorage as offline cache only
  private loadCreditsFromCache(): CreditBalance {
    try {
      const stored = memoryStorage.getItem(STORAGE_KEYS.CREDITS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      log.error('Failed to load credits cache:', e);
    }
    return {
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      lastUpdated: Date.now(),
    };
  }

  private saveCreditsToCache(): void {
    try {
      memoryStorage.setItem(STORAGE_KEYS.CREDITS, JSON.stringify(this.credits));
    } catch (e) {
      log.error('Failed to save credits cache:', e);
    }
  }

  private loadUsageRecordsFromCache(): UsageRecord[] {
    try {
      const stored = memoryStorage.getItem(STORAGE_KEYS.USAGE_RECORDS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      log.error('Failed to load usage records:', e);
    }
    return [];
  }

  private saveUsageRecordsToCache(): void {
    try {
      const toSave = this.usageRecords.slice(-1000);
      memoryStorage.setItem(STORAGE_KEYS.USAGE_RECORDS, JSON.stringify(toSave));
    } catch (e) {
      log.error('Failed to save usage records:', e);
    }
  }

  private loadDailyUsageFromCache(): Map<string, DailyUsage> {
    try {
      const stored = memoryStorage.getItem(STORAGE_KEYS.DAILY_USAGE);
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data));
      }
    } catch (e) {
      log.error('Failed to load daily usage:', e);
    }
    return new Map();
  }

  private saveDailyUsageToCache(): void {
    try {
      const obj: Record<string, DailyUsage> = {};
      this.dailyUsage.forEach((value, key) => {
        obj[key] = value;
      });
      memoryStorage.setItem(STORAGE_KEYS.DAILY_USAGE, JSON.stringify(obj));
    } catch (e) {
      log.error('Failed to save daily usage:', e);
    }
  }

  // Event system
  subscribe(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach(cb => cb(event, data));
  }

  // Credit operations
  getCredits(): CreditBalance {
    return { ...this.credits };
  }

  addCredits(amount: number, source: string = 'purchase'): void {
    this.credits.totalCredits += amount;
    this.credits.remainingCredits += amount;
    this.credits.lastUpdated = Date.now();
    this.saveCreditsToCache();
    this.emit('creditsUpdated', { balance: this.credits, added: amount, source });
  }

  useCredits(amount: number): boolean {
    if (this.credits.remainingCredits < amount) {
      this.emit('insufficientCredits', { required: amount, available: this.credits.remainingCredits });
      return false;
    }
    this.credits.usedCredits += amount;
    this.credits.remainingCredits -= amount;
    this.credits.lastUpdated = Date.now();
    this.saveCreditsToCache();
    this.emit('creditsUsed', { amount, balance: this.credits });
    return true;
  }

  hasEnoughCredits(amount: number): boolean {
    return this.credits.remainingCredits >= amount;
  }

  // Calculate cost for a request
  calculateCost(provider: AIProvider, model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING.find(p => p.provider === provider && p.model === model);
    if (!pricing) {
      // Default pricing if model not found
      return (promptTokens / 1000) * 1 + (completionTokens / 1000) * 3;
    }
    const inputCost = (promptTokens / 1000) * pricing.inputCostPer1K;
    const outputCost = (completionTokens / 1000) * pricing.outputCostPer1K;
    return Math.ceil(inputCost + outputCost);
  }

  // Record usage
  recordUsage(
    provider: AIProvider,
    model: string,
    promptTokens: number,
    completionTokens: number,
    success: boolean,
    responseTime: number,
    requestType: UsageRecord['requestType'] = 'chat'
  ): UsageRecord {
    const creditsUsed = this.calculateCost(provider, model, promptTokens, completionTokens);

    const record: UsageRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      creditsUsed,
      requestType,
      success,
      responseTime,
    };

    this.usageRecords.push(record);
    this.saveUsageRecordsToCache();

    // Update daily usage
    this.updateDailyUsage(record);

    // Deduct credits
    if (success) {
      this.useCredits(creditsUsed);
    }

    this.emit('usageRecorded', record);
    return record;
  }

  private updateDailyUsage(record: UsageRecord): void {
    const dateKey = new Date(record.timestamp).toISOString().split('T')[0];

    let daily = this.dailyUsage.get(dateKey);
    if (!daily) {
      daily = {
        date: dateKey,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      };
    }

    daily.totalTokens += record.totalTokens;
    daily.totalCredits += record.creditsUsed;
    daily.requestCount += 1;

    // By provider
    if (!daily.byProvider[record.provider]) {
      daily.byProvider[record.provider] = { tokens: 0, credits: 0, requests: 0 };
    }
    daily.byProvider[record.provider].tokens += record.totalTokens;
    daily.byProvider[record.provider].credits += record.creditsUsed;
    daily.byProvider[record.provider].requests += 1;

    // By model
    if (!daily.byModel[record.model]) {
      daily.byModel[record.model] = { tokens: 0, credits: 0, requests: 0 };
    }
    daily.byModel[record.model].tokens += record.totalTokens;
    daily.byModel[record.model].credits += record.creditsUsed;
    daily.byModel[record.model].requests += 1;

    this.dailyUsage.set(dateKey, daily);
    this.saveDailyUsageToCache();
  }

  // Get usage statistics
  getUsageStats(): UsageStats {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    // Today
    const today = this.dailyUsage.get(todayKey) || {
      date: todayKey,
      totalTokens: 0,
      totalCredits: 0,
      requestCount: 0,
      byProvider: {},
      byModel: {},
    };

    // This week (last 7 days)
    const thisWeek: DailyUsage[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      thisWeek.push(this.dailyUsage.get(key) || {
        date: key,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      });
    }

    // This month (last 30 days)
    const thisMonth: DailyUsage[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      thisMonth.push(this.dailyUsage.get(key) || {
        date: key,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      });
    }

    // All time
    const allTimeTokens = this.usageRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const allTimeCredits = this.usageRecords.reduce((sum, r) => sum + r.creditsUsed, 0);
    const allTimeRequests = this.usageRecords.length;
    const avgResponseTime = allTimeRequests > 0
      ? this.usageRecords.reduce((sum, r) => sum + r.responseTime, 0) / allTimeRequests
      : 0;
    const successCount = this.usageRecords.filter(r => r.success).length;
    const successRate = allTimeRequests > 0 ? (successCount / allTimeRequests) * 100 : 100;

    return {
      today,
      thisWeek,
      thisMonth,
      allTime: {
        totalTokens: allTimeTokens,
        totalCredits: allTimeCredits,
        totalRequests: allTimeRequests,
        averageResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 10) / 10,
      },
    };
  }

  // Get recent usage records
  getRecentUsage(limit: number = 50): UsageRecord[] {
    return this.usageRecords.slice(-limit).reverse();
  }

  // Get usage by provider
  getUsageByProvider(): Record<string, { tokens: number; credits: number; requests: number }> {
    const result: Record<string, { tokens: number; credits: number; requests: number }> = {};

    this.usageRecords.forEach(record => {
      if (!result[record.provider]) {
        result[record.provider] = { tokens: 0, credits: 0, requests: 0 };
      }
      result[record.provider].tokens += record.totalTokens;
      result[record.provider].credits += record.creditsUsed;
      result[record.provider].requests += 1;
    });

    return result;
  }

  // Get usage by model
  getUsageByModel(): Record<string, { tokens: number; credits: number; requests: number; provider: string }> {
    const result: Record<string, { tokens: number; credits: number; requests: number; provider: string }> = {};

    this.usageRecords.forEach(record => {
      if (!result[record.model]) {
        result[record.model] = { tokens: 0, credits: 0, requests: 0, provider: record.provider };
      }
      result[record.model].tokens += record.totalTokens;
      result[record.model].credits += record.creditsUsed;
      result[record.model].requests += 1;
    });

    return result;
  }

  // Get model info
  getModelInfo(provider: AIProvider, model: string): ModelPricing | undefined {
    return MODEL_PRICING.find(p => p.provider === provider && p.model === model);
  }

  // Get all available models
  getAvailableModels(): ModelPricing[] {
    return [...MODEL_PRICING];
  }

  // Get models by tier
  getModelsByTier(tier: ModelPricing['tier']): ModelPricing[] {
    return MODEL_PRICING.filter(m => m.tier === tier);
  }

  // Get credit packages
  getCreditPackages(): CreditPackage[] {
    return [...CREDIT_PACKAGES];
  }


}

// Singleton instance
export const usageCreditsService = new UsageCreditsService();
export default usageCreditsService;
