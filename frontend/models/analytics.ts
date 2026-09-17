export interface AnalyticsData {
  subscription: {
    plan: string;
    status: string;
    price: number;
    period: string;
    renewalDate: string;
    daysUntilRenewal: number;
  };
  usage: {
    conversations: {
      current: number;
      limit: number;
      percentage: number;
      unit?: string;
    };
    agents: {
      current: number;
      limit: number;
      percentage: number;
      unit?: string;
    };
    apiCalls: {
      current: number;
      limit: number;
      percentage: number;
      unit?: string;
    };
    storage: {
      current: number;
      limit: number;
      percentage: number;
      unit?: string;
    };
    messages: {
      current: number;
      limit: number;
      percentage: number;
      unit?: string;
    };
  };
  dailyUsage: Array<{
    date: string;
    conversations: number;
    messages: number;
    apiCalls: number;
  }>;
  weeklyTrend: {
    conversationsChange: string;
    messagesChange: string;
    apiCallsChange: string;
    responseTimeChange: string;
  };
  agentPerformance: Array<{
    name: string;
    conversations: number;
    messages: number;
    avgResponseTime: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    timestamp: string;
    agent: string;
    action: string;
    status: string;
    type?: string;
    messages?: number;
    ip?: string;
    location?: string;
  }>;
  costAnalysis: {
    currentMonth: number;
    projectedMonth: number;
    breakdown: Array<{ category: string; cost: number; percentage: number }>;
  };
  topAgents: Array<{ 
    name: string; 
    usage: number;
    totalSpent?: number;
    subscriptions?: number;
    lastUsed?: string;
  }>;

  // Summary data
  summary?: {
    totalConversations: number;
    totalMessages: number;
    totalApiCalls: number;
    activeAgents: number;
    averageResponseTime: string;
    successRate: number;
  };

  // Real-time agent status for dashboard
  agentStatus?: string;
}
