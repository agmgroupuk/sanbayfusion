
/**
 * Gemini Service — Routes through backend API (no direct SDK)
 * Previously used @google/genai SDK with client-side API key (security risk).
 * Now all AI calls go through /api/chat/send with server-managed keys.
 */

import { MAIN_API_BASE } from './apiConfig';
import { fetchWithCredentials } from '../fetchUtil';

interface AppConfig {
  model: string;
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface Detection {
  label: string;
  box_2d: number[];
}

export const generateAppResponse = async (
  config: AppConfig,
  history: ChatMessage[],
  userMessage: string,
  _imageData?: { data: string; mimeType: string },
) => {
  try {
    const response = await fetchWithCredentials(`${MAIN_API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: userMessage,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        systemPrompt: config.systemInstruction || 'You are a helpful AI assistant.',
      }),
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('AUTH_ERROR');
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.response || data.content || '',
      functionCalls: null,
    };
  } catch (error: any) {
    if (error.message === 'AUTH_ERROR') throw error;
    throw error;
  }
};

export const detectObjects = async (_imageData: { data: string; mimeType: string }): Promise<Detection[]> => {
  // Object detection requires vision model — not supported via backend text API
  return [];
};

export const architectApp = async (prompt: string, currentConfig?: AppConfig): Promise<Partial<AppConfig>> => {
  try {
    const response = await fetchWithCredentials(`${MAIN_API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: `Design an AI micro-app: ${prompt}. Current: ${JSON.stringify(currentConfig || {})}. Return JSON with: name, description, systemInstruction, icon.`,
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        systemPrompt: 'Return valid JSON only: {"name":"...","description":"...","systemInstruction":"...","icon":"emoji"}',
      }),
    });

    if (!response.ok) return {};
    const data = await response.json();
    try {
      return JSON.parse(data.response || '{}');
    } catch {
      return {};
    }
  } catch {
    return {};
  }
};
