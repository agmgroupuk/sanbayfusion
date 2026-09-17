/**
 * Chat Service - Secure Backend API Integration
 * 
 * This service replaces direct SDK calls with secure backend API calls.
 * All API keys are kept server-side, never exposed to browser.
 * 
 * Supports: Anthropic, Mistral, xAI, Cerebras, Groq, OpenAI, Gemini
 * Now with multimodal vision support and real-time streaming! 🔥
 */

import { SettingsState } from '../types';

// API Base URL - uses Next.js API routes
const API_BASE = '/api';

// Message format for conversation history
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Image data for vision requests
export interface ImageData {
  base64: string;        // Base64 encoded image data (without prefix)
  mimeType: string;      // e.g., "image/png", "image/jpeg"
  fileName?: string;     // Original filename
}

// Document data for PDF/text extraction
export interface DocumentData {
  content: string;       // Extracted text content
  fileName: string;
  fileType: string;      // pdf, doc, txt, etc.
  pageCount?: number;
}

// Response from backend
export interface ChatResponse {
  text: string;
  provider: string;
  durationMs: number;
  remaining?: number;  // Rate limit remaining
  error?: string;
}

// Streaming callbacks
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string, provider: string) => void;
  onError: (error: Error) => void;
  onFileOperation?: (op: FileOperation) => void;
  onAgentUI?: (event: AgentUIEvent) => void;
}

// File operation event from server
export interface FileOperation {
  type: 'file_operation';
  action: string;
  path?: string;
  content?: string;
  oldPath?: string;
  newPath?: string;
  sourcePath?: string;
  destinationPath?: string;
  description?: string;
}

// Agent UI event pushed from backend in real-time
export interface AgentUIEvent {
  type: 'agent_ui';
  uiAction: string;
  text?: string;
  title?: string;
  level?: 'info' | 'warning' | 'error';
  question?: string;
  options?: string[];
  percent?: number;
  label?: string;
  mode?: string;
  workflow_id?: string;
  workflow?: unknown;
  step_index?: number;
  step?: unknown;
  workflowStatus?: string;
  data?: unknown;
}

// No artificial delay — stream at network speed for fast responses

// Regex to detect tool-calling status lines sent by backend (e.g. "🔍 *Using web_search...*")
// These are internal tool execution indicators that should not be shown to the user
const TOOL_STATUS_RE = /^\s*(?:🔍|🌐|⚡|🧮|🕐|🌤️|🎬|🔧)\s*\*Using \w+\.\.\.\*\s*$/;

/**
 * Filter out tool-calling status tokens from streaming output.
 * The backend sends the entire status as one SSE chunk like "\n\n🔍 *Using web_search...*\n\n"
 * so we can simply check each token content against the pattern.
 */
function isToolStatusToken(token: string): boolean {
  // Strip surrounding whitespace/newlines and check against the tool status pattern
  const trimmed = token.trim();
  if (!trimmed) return false;
  return TOOL_STATUS_RE.test(trimmed);
}

/**
 * Send a message with streaming response (real-time token-by-token)
 */
export const sendMessageStream = async (
  prompt: string,
  settings: SettingsState,
  conversationHistory: ChatMessage[] = [],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  projectFiles?: Record<string, string>,
  sessionId?: string,
  userId?: string,
): Promise<void> => {
  let fullText = '';
  let provider = settings.provider;
  try {
    const response = await fetch(`${API_BASE}/studio/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationHistory,
        provider: settings.provider,
        model: settings.model,
        systemPrompt: settings.customPrompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        activeTool: settings.activeTool || 'none',
        agentId: settings.agentId || undefined,
        projectFiles: projectFiles || undefined,
        sessionId: sessionId || undefined,
        userId: userId || undefined,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    provider = response.headers.get('X-Provider') || settings.provider;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullText, provider);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            // Handle file operation events
            if (parsed.type === 'file_operation' && callbacks.onFileOperation) {
              callbacks.onFileOperation(parsed as FileOperation);
              continue;
            }
            // Handle agent UI events (toasts, progress, warnings, workflow updates)
            if (parsed.type === 'agent_ui' && callbacks.onAgentUI) {
              callbacks.onAgentUI(parsed as AgentUIEvent);
              continue;
            }
            if (parsed.content) {
              // Filter out tool status lines (e.g. "🔍 *Using web_search...*")
              if (isToolStatusToken(parsed.content)) {
                continue;
              }
              fullText += parsed.content;
              callbacks.onToken(parsed.content);
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    callbacks.onComplete(fullText, provider);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      callbacks.onComplete(fullText || '⏹️ Generation stopped.', 'system');
      return;
    }
    // For mid-stream network failures (e.g. QUIC protocol error), preserve partial text
    if (fullText) {
      callbacks.onComplete(
        fullText + '\n\n⚠️ *Connection interrupted — response may be incomplete. Please try again.*',
        provider,
      );
      return;
    }
    callbacks.onError(error);
  }
};

/**
 * Send a message to the AI backend
 * 
 * @param prompt - User's message
 * @param settings - Current settings (provider, model, temperature, etc.)
 * @param conversationHistory - Previous messages for context
 * @param imageData - Optional image for vision analysis
 * @param signal - Optional AbortController signal for cancellation
 * @returns AI response with metadata
 */
export const sendMessage = async (
  prompt: string,
  settings: SettingsState,
  conversationHistory: ChatMessage[] = [],
  imageData?: ImageData,
  signal?: AbortSignal,
  sessionId?: string,
  userId?: string,
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${API_BASE}/studio/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        conversationHistory,
        provider: settings.provider,           // anthropic, gemini, openai, etc.
        model: settings.model,                 // User's selected model
        systemPrompt: settings.customPrompt,   // Custom system instructions
        imageData,                             // Vision support for images
        temperature: settings.temperature,     // User's temperature setting
        maxTokens: settings.maxTokens,         // User's max tokens setting
        activeTool: settings.activeTool || 'none', // Mode: none, web_search, deep_research, thinking, image_gen
        agentId: settings.agentId || undefined, // Agent ID for strict personality lookup
        sessionId: sessionId || undefined,
        userId: userId || undefined,
      }),
      signal,  // Pass abort signal for cancellation
    });

    // Handle rate limit
    if (response.status === 429) {
      const error = await response.json();
      return {
        text: `⏱️ **High Demand**\n\n${error.title || 'This AI agent is super busy right now!'}\n\n${error.message || 'Please wait a moment and try again.'}\n\n💡 **Tip:** Try switching to another agent from the settings!`,
        provider: 'system',
        durationMs: 0,
        remaining: 0,
        error: 'rate_limit',
      };
    }

    // Handle other errors with friendly messages
    if (!response.ok) {
      const error = await response.json();
      const friendlyTitle = error.title || '🤔 Something Went Wrong';
      const friendlyMessage = error.message || error.error || `Server error: ${response.status}`;
      const suggestion = error.suggestion || '💡 Try selecting a different AI agent or simplify your request.';

      // Check if auto-switch happened
      if (error.switchedTo) {
        return {
          text: `${friendlyTitle}\n\n${friendlyMessage}\n\n✅ Switched to **${error.switchedTo.name}** ${error.switchedTo.icon || '🤖'}`,
          provider: error.switchedTo.provider || 'system',
          durationMs: 0,
          error: 'auto_switched',
        };
      }

      throw new Error(`${friendlyTitle}\n\n${friendlyMessage}\n\n${suggestion}`);
    }

    // Success
    const data = await response.json();

    return {
      text: data.response || 'No response received.',
      provider: data.provider || settings.provider,
      durationMs: data.durationMs || 0,
      remaining: data.remaining,
    };

  } catch (error: any) {
    // Handle abort (user cancelled)
    if (error.name === 'AbortError') {
      return {
        text: '⏹️ Generation stopped by user.',
        provider: 'system',
        durationMs: 0,
        error: 'aborted',
      };
    }

    console.error('Chat Service Error:', error);

    // Parse friendly error if it's formatted
    const errorMessage = error.message || 'Unable to reach server';
    const hasFormatting = errorMessage.includes('\n\n');

    return {
      text: hasFormatting
        ? `❌ ${errorMessage}`
        : `❌ **Connection Issue**\n\n${errorMessage}\n\n💡 **Tips:**\n• Check your internet connection\n• Try a different AI agent\n• Refresh the page and try again`,
      provider: 'error',
      durationMs: 0,
      error: error.message,
    };
  }
};

/**
 * Convert internal message format to API format
 * 
 * @param messages - Messages from the chat session
 * @returns Formatted conversation history for API
 */
export const formatConversationHistory = (
  messages: { sender: string; text: string }[]
): ChatMessage[] => {
  return messages
    .filter(msg => msg.sender !== 'SYSTEM')  // Skip system messages
    .map(msg => {
      // Remove base64 image data from message content to prevent token explosion
      let content = msg.text;

      // Remove inline base64 images (data:image/...;base64,...)
      content = content.replace(/!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/g, '[Image uploaded]');

      // Remove any remaining base64 data blocks
      content = content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, '[Image data removed]');

      return {
        role: msg.sender === 'YOU' ? 'user' as const : 'assistant' as const,
        content,
      };
    });
};

/**
 * Check if a provider is available
 * (Backend handles this, but we can show status in UI)
 */
export const getAvailableProviders = (): string[] => {
  // All providers supported by backend
  return [
    'anthropic',
    'mistral',
    'xai',
    'cerebras',
    'groq',
    'openai',
    'gemini',
  ];
};

/**
 * Extract text from documents using server-side API
 * Supports PDF, DOCX, DOC, and plain text files
 */
export const extractDocumentText = async (file: File): Promise<DocumentData> => {
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';

  // For plain text files, extract directly on client
  const textTypes = ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'html', 'js', 'ts', 'jsx', 'tsx', 'py', 'css', 'scss', 'sql', 'sh', 'bash', 'zsh'];
  if (textTypes.includes(fileType)) {
    const text = await file.text();
    return {
      content: text,
      fileName: file.name,
      fileType,
    };
  }

  // For PDF and DOCX, use server-side extraction
  if (['pdf', 'doc', 'docx'].includes(fileType)) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract-document', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract document text');
    }

    const data = await response.json();
    return {
      content: data.content,
      fileName: data.fileName,
      fileType: data.fileType,
      pageCount: data.pageCount,
    };
  }

  // For unsupported types
  return {
    content: `[Document: ${file.name}]\nFile type "${fileType}" is not supported for text extraction.`,
    fileName: file.name,
    fileType,
  };
};

// Alias for backwards compatibility
export const extractPDFText = extractDocumentText;

export default {
  sendMessage,
  sendMessageStream,
  formatConversationHistory,
  getAvailableProviders,
  extractPDFText,
  extractDocumentText,
};
