/**
 * Canvas AI Service — Multi-Provider Code Generation
 *
 * Routes requests through the secure backend API:
 * Mistral (primary), xAI (fallback), OpenAI (fallback)
 *
 * Endpoints consumed:
 *   POST /api/canvas/chat      — conversational agent (chat + optional code)
 *   POST /api/canvas/generate  — direct code generation (no conversation)
 *
 * No API keys are exposed to the browser — everything goes through the backend.
 */

import { ChatMessage, ModelOption } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasChatRequest {
  message: string;
  provider: string;
  modelId: string;
  currentCode?: string;
  conversationHistory?: ChatMessage[];
  editorContext?: string | Record<string, unknown> | null;
  useSurgicalEdits?: boolean;
  surgicalEditPrompt?: string | null;
  chatMode?: 'agent' | 'chat';
}

export interface CanvasChatResponse {
  success: boolean;
  message: string;
  code?: string;
  shouldBuild?: boolean;
  action?: 'build' | 'modify' | 'chat';
  surgicalCommands?: unknown[];
  toolResults?: AgentToolResult[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Agent Streaming Types
// ---------------------------------------------------------------------------

export interface AgentToolResult {
  name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AgentStreamEvent {
  type: 'thinking' | 'tool_start' | 'tool_result' | 'text_delta' | 'round' | 'done' | 'error';
  message?: string;
  text?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  round?: number;
  maxRounds?: string;
  toolResults?: AgentToolResult[];
  provider?: string;
  modelId?: string;
}

export interface AgentChatRequest {
  message: string;
  provider: string;
  modelId: string;
  currentFiles?: Record<string, string>;
  conversationHistory?: ChatMessage[];
  editorContext?: string | Record<string, unknown> | null;
  fileData?: { name: string; type: string; base64: string } | null;
}

export interface CanvasGenerateRequest {
  prompt: string;
  provider: string;
  modelId: string;
  isThinking?: boolean;
  currentCode?: string;
  history?: ChatMessage[];
}

export interface CanvasGenerateResponse {
  success: boolean;
  code: string;
  error?: string;
}

// Provider mapping — 3 valid backend providers
const PROVIDER_MAP: Record<string, string> = {
  // User-facing model names
  'Nova': 'mistral',
  'Architect': 'xai',
  'Vision Pro': 'openai',
  // Raw backend IDs pass-through
  mistral: 'mistral',
  xai: 'xai',
  openai: 'openai',
};

/**
 * Resolve the backend provider ID from a model name or provider string.
 * Falls back to 'mistral' (primary) if unrecognized.
 */
function resolveProvider(frontendProvider: string, _modelId: string): string {
  return PROVIDER_MAP[frontendProvider] ?? PROVIDER_MAP[frontendProvider.toLowerCase()] ?? 'mistral';
}

// ---------------------------------------------------------------------------
// Friendly error messages
// ---------------------------------------------------------------------------

export function getFriendlyErrorMessage(rawError: string): string {
  const e = rawError.toLowerCase();

  if (e.includes('401') || e.includes('unauthorized') || e.includes('not logged in'))
    return '🔐 Please sign in to use this feature.';
  if (e.includes('subscription') || e.includes('upgrade') || e.includes('premium'))
    return '💎 This feature requires an active subscription.';
  if (e.includes('rate limit') || e.includes('429') || e.includes('too many') || e.includes('quota'))
    return '⏱️ Too many requests — please wait a moment and try again.';
  if (e.includes('timeout') || e.includes('etimedout'))
    return '⌛ Request timed out. Try again with a simpler prompt.';
  if (e.includes('network') || e.includes('fetch') || e.includes('econnrefused') || e.includes('failed to fetch'))
    return '🌐 Network error — check your connection and try again.';
  if (e.includes('not configured') || e.includes('api_key') || e.includes('model not'))
    return '🔧 This AI model is temporarily unavailable. Try a different one.';
  if (e.includes('content policy') || e.includes('safety'))
    return '⚠️ Request blocked by content policy. Please rephrase your prompt.';
  if (e.includes('500') || e.includes('internal server'))
    return '🛠️ Server error — please try again in a moment.';

  return '😕 Something went wrong. Please try again or switch models.';
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Send a conversational message to the Canvas AI agent.
 * The agent decides whether to chat, build, or modify code.
 */
export async function sendCanvasChat(
  req: CanvasChatRequest,
  signal?: AbortSignal,
): Promise<CanvasChatResponse> {
  const provider = resolveProvider(req.provider, req.modelId);

  const response = await fetch('/api/canvas/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
    credentials: 'include',
    body: JSON.stringify({
      message: req.message,
      provider,
      modelId: req.modelId,
      currentCode: req.currentCode,
      conversationHistory: req.conversationHistory?.slice(-10) ?? [],
      editorContext: req.editorContext,
      useSurgicalEdits: req.useSurgicalEdits,
      surgicalEditPrompt: req.surgicalEditPrompt,
      chatMode: req.chatMode,
    }),
    signal,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Chat request failed (${response.status})`);
  }

  return data as CanvasChatResponse;
}

/**
 * Generate (or modify) code directly — no conversation.
 * Used by the workspace panel, templates, and quick actions.
 */
export async function generateCode(
  req: CanvasGenerateRequest,
  signal?: AbortSignal,
): Promise<string> {
  const provider = resolveProvider(req.provider, req.modelId);

  const response = await fetch('/api/canvas/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
    credentials: 'include',
    body: JSON.stringify({
      prompt: req.prompt,
      provider,
      modelId: req.modelId,
      isThinking: req.isThinking ?? false,
      currentCode: req.currentCode,
      history: req.history,
    }),
    signal,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Code generation failed (${response.status})`);
  }

  return data.code;
}

// ---------------------------------------------------------------------------
// Agentic Streaming Chat — tool-calling loop via SSE
// ---------------------------------------------------------------------------

/**
 * Send a message to the agentic streaming endpoint.
 * Nova gets real tools (file ops, web search, code exec, etc.) and calls them in a loop.
 * 
 * @param onEvent - callback for each SSE event (progress updates, tool calls)
 * @returns final CanvasChatResponse when the agent is done
 */
export async function sendAgentChatStream(
  req: AgentChatRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<CanvasChatResponse> {
  const provider = resolveProvider(req.provider, req.modelId);

  const response = await fetch('/api/canvas/agent-chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-canvas-source': 'standalone' },
    credentials: 'include',
    body: JSON.stringify({
      message: req.message,
      provider,
      modelId: req.modelId,
      currentFiles: req.currentFiles ?? {},
      conversationHistory: req.conversationHistory?.slice(-10) ?? [],
      editorContext: req.editorContext,
      fileData: req.fileData,
    }),
    signal,
  });

  if (!response.ok) {
    // Non-SSE error response
    const data = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    throw new Error(data.error || `Agent chat failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: CanvasChatResponse = { success: false, message: '' };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event: AgentStreamEvent = JSON.parse(line.slice(6));
          onEvent(event);

          if (event.type === 'done') {
            finalResponse = {
              success: true,
              message: event.message || '',
              toolResults: event.toolResults,
            };
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Agent encountered an error');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue; // skip malformed SSE lines
          throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return finalResponse;
}

export default { sendCanvasChat, sendAgentChatStream, generateCode, getFriendlyErrorMessage };
