import { NextRequest, NextResponse } from 'next/server';

interface FeedbackData {
  messageId: string;
  feedback: 'positive' | 'negative';
  timestamp: string;
  agent: string;
  userId?: string;
  sessionId?: string;
  additionalData?: any;
}

interface FeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
  feedbackId?: string;
}

// In-memory storage for demo purposes (in production, use a database)
const feedbackStorage = new Map<string, FeedbackData & { id: string; createdAt: string }>();

// Feedback analytics storage
const feedbackAnalytics = {
  totalFeedback: 0,
  positiveFeedback: 0,
  negativeFeedback: 0,
  agentFeedback: new Map<string, { positive: number; negative: number }>(),
  dailyFeedback: new Map<string, { positive: number; negative: number }>()
};

export async function POST(request: NextRequest) {
  try {
    const feedbackData: FeedbackData = await request.json();

    // Validate required fields
    const { messageId, feedback, timestamp, agent } = feedbackData;
    
    if (!messageId || !feedback || !timestamp || !agent) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: messageId, feedback, timestamp, agent'
      } as FeedbackResponse, { status: 400 });
    }

    // Validate feedback value
    if (!['positive', 'negative'].includes(feedback)) {
      return NextResponse.json({
        success: false,
        error: 'Feedback must be either "positive" or "negative"'
      } as FeedbackResponse, { status: 400 });
    }

    // Generate unique feedback ID
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store feedback
    const feedbackRecord = {
      ...feedbackData,
      id: feedbackId,
      createdAt: new Date().toISOString()
    };
    
    feedbackStorage.set(feedbackId, feedbackRecord);

    // Update analytics
    updateFeedbackAnalytics(feedbackData);

    // Log feedback for monitoring (in production, send to analytics service)
    console.log(`Feedback received: ${feedback} for agent ${agent} (message: ${messageId})`);

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedbackId
    } as FeedbackResponse);

  } catch (error) {
    console.error('Feedback submission error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to record feedback'
    } as FeedbackResponse, { status: 500 });
  }
}

// GET endpoint for feedback analytics (admin use)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const agent = url.searchParams.get('agent');
    const days = parseInt(url.searchParams.get('days') || '7');
    const format = url.searchParams.get('format') || 'summary';

    if (format === 'detailed') {
      // Return detailed feedback records
      const allFeedback = Array.from(feedbackStorage.values());
      const filteredFeedback = agent 
        ? allFeedback.filter(f => f.agent === agent)
        : allFeedback;

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentFeedback = filteredFeedback.filter(f => 
        new Date(f.createdAt) >= cutoffDate
      );

      return NextResponse.json({
        success: true,
        data: {
          feedback: recentFeedback,
          total: recentFeedback.length,
          dateRange: {
            from: cutoffDate.toISOString(),
            to: new Date().toISOString()
          }
        }
      });
    }

    // Return analytics summary
    const analytics = {
      total: feedbackAnalytics.totalFeedback,
      positive: feedbackAnalytics.positiveFeedback,
      negative: feedbackAnalytics.negativeFeedback,
      positiveRate: feedbackAnalytics.totalFeedback > 0 
        ? (feedbackAnalytics.positiveFeedback / feedbackAnalytics.totalFeedback * 100).toFixed(1)
        : 0,
      agents: Object.fromEntries(feedbackAnalytics.agentFeedback),
      lastUpdated: new Date().toISOString()
    };

    if (agent) {
      // Return specific agent analytics
      const agentStats = feedbackAnalytics.agentFeedback.get(agent) || { positive: 0, negative: 0 };
      const agentTotal = agentStats.positive + agentStats.negative;
      
      return NextResponse.json({
        success: true,
        data: {
          agent,
          ...agentStats,
          total: agentTotal,
          positiveRate: agentTotal > 0 ? (agentStats.positive / agentTotal * 100).toFixed(1) : 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Feedback analytics error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve feedback analytics'
    }, { status: 500 });
  }
}

function updateFeedbackAnalytics(feedbackData: FeedbackData) {
  // Update total counts
  feedbackAnalytics.totalFeedback++;
  
  if (feedbackData.feedback === 'positive') {
    feedbackAnalytics.positiveFeedback++;
  } else {
    feedbackAnalytics.negativeFeedback++;
  }

  // Update agent-specific feedback
  const agentStats = feedbackAnalytics.agentFeedback.get(feedbackData.agent) || { positive: 0, negative: 0 };
  
  if (feedbackData.feedback === 'positive') {
    agentStats.positive++;
  } else {
    agentStats.negative++;
  }
  
  feedbackAnalytics.agentFeedback.set(feedbackData.agent, agentStats);

  // Update daily feedback
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = feedbackAnalytics.dailyFeedback.get(today) || { positive: 0, negative: 0 };
  
  if (feedbackData.feedback === 'positive') {
    dailyStats.positive++;
  } else {
    dailyStats.negative++;
  }
  
  feedbackAnalytics.dailyFeedback.set(today, dailyStats);
}