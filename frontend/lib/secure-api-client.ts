/**
 * Secure API Client - Frontend
 *
 * This client NEVER exposes API keys or secrets.
 * All sensitive operations happen on the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ChatRequest {
  message: string;
  agentId?: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  systemPrompt?: string;
}

interface ChatResponse {
  message?: string;
  response?: string;
  timestamp: string;
  error?: string;
  code?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string;
}

export class SecureAPIClient {
  private baseUrl: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
  }

  /**
   * Send a chat message to the secure backend
   * NO API KEYS REQUIRED - backend handles everything
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Try unified agent endpoint first, then simple/optimized/agents-chat/chat
      let response;
      let endpoint = '';

      // First attempt: unified agent endpoint (respects provider/model overrides)
      try {
        endpoint = `${this.baseUrl}/api/agents/unified`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: request.agentId || 'tech-wizard',
            message: request.message,
            provider: request.provider,
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            systemPrompt: request.systemPrompt,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.response || data.message || 'No response received',
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }
      } catch (error) {
        console.log('[SecureAPIClient] Unified endpoint failed, trying simple');
      }

      // Second attempt: simple agent endpoint (most reliable legacy)
      try {
        endpoint = `${this.baseUrl}/api/agents/simple`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: request.agentId || 'tech-wizard',
            message: request.message,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.response || data.message || 'No response received',
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }
      } catch (error) {
        console.log(
          '[SecureAPIClient] Simple endpoint failed, trying optimized'
        );
      }

      // Third attempt: optimized agent endpoint
      try {
        endpoint = `${this.baseUrl}/api/agents/optimized`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: request.agentId || 'tech-wizard',
            message: request.message,
            options: {
              model: request.model,
              conversationId: request.conversationId,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.response || data.message || 'No response received',
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }
      } catch (error) {
        console.log(
          '[SecureAPIClient] Optimized endpoint failed, trying agents chat'
        );
      }

      // Fourth attempt: agents chat endpoint
      try {
        endpoint = `${this.baseUrl}/api/agents/chat`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: request.agentId || 'tech-wizard',
            message: request.message,
            model: request.model || 'gpt-3.5-turbo',
            conversationHistory: [],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.message || data.response || 'No response received',
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }
      } catch (error) {
        console.log(
          '[SecureAPIClient] Agents chat endpoint failed, trying basic chat'
        );
      }

      // Fifth attempt: basic chat endpoint
      endpoint = `${this.baseUrl}/api/chat`;
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: request.message,
          agentId: request.agentId,
          model: request.model || 'gpt-3.5-turbo',
          provider: request.provider,
          conversationId: request.conversationId,
          systemPrompt: request.systemPrompt,
        }),
      });

      // Extract rate limit info from headers
      this.extractRateLimitInfo(response);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const data: ChatResponse = await response.json();
      return data;
    } catch (error: any) {
      console.error('[SecureAPIClient] Error:', error);
      throw new Error(error.message || 'Network error occurred');
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Check if rate limit is about to be exceeded
   */
  isNearRateLimit(): boolean {
    if (!this.rateLimitInfo) return false;
    return this.rateLimitInfo.remaining < 10;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('[SecureAPIClient] Health check error:', error);
      throw error;
    }
  }

  private extractRateLimitInfo(response: Response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: reset,
      };
    }
  }
}

// Export singleton instance
export const secureAPI = new SecureAPIClient();

/**
 * Helper function for backward compatibility with existing code
 */
export async function sendSecureMessage(
  message: string,
  agentId?: string,
  model?: string,
  provider?: string,
  temperature?: number,
  maxTokens?: number,
  systemPrompt?: string
): Promise<string> {
  const response = await secureAPI.sendMessage({
    message,
    agentId,
    model,
    provider,
    temperature,
    maxTokens,
    systemPrompt,
  });

  return response.message || response.response || 'No response received';
}
