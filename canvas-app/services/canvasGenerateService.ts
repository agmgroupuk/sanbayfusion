/**
 * canvasGenerateService — AI code generation for Canvas App
 * Wraps /api/canvas/generate, /api/canvas/stream, /api/canvas/chat endpoints
 * All AI calls go through backend — no API keys in frontend
 */

const API_BASE = '/api/canvas';

export interface ChatHistory {
    role: 'user' | 'model' | 'assistant';
    text: string;
}

export interface GenerateOptions {
    prompt: string;
    provider?: string;
    modelId?: string;
    isThinking?: boolean;
    currentCode?: string;
    history?: ChatHistory[];
}

export interface GenerateResult {
    success: boolean;
    code?: string;
    error?: string;
}

export interface ChatOptions {
    message: string;
    context?: string;
    history?: ChatHistory[];
    tools?: boolean;
}

export interface ChatResult {
    success: boolean;
    message?: string;
    toolResults?: Array<{ tool: string; result: unknown }>;
    error?: string;
}

/**
 * Clean generated code — remove markdown fences
 */
function cleanCode(text: string): string {
    return text
        .replace(/```html/gi, '')
        .replace(/```typescript/gi, '')
        .replace(/```javascript/gi, '')
        .replace(/```/g, '')
        .trim();
}

export const canvasGenerateService = {
    /**
     * Generate code via backend AI (non-streaming)
     */
    async generate(opts: GenerateOptions): Promise<GenerateResult> {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Canvas-Source': 'standalone',
            },
            body: JSON.stringify({
                prompt: opts.prompt,
                provider: (opts.provider || 'xai').toLowerCase(),
                modelId: opts.modelId || 'grok-3',
                isThinking: opts.isThinking || false,
                currentCode: opts.currentCode,
                history: opts.history || [],
            }),
        });

        // Return status code info for auth/plan handling
        if (res.status === 401) {
            return { success: false, error: 'AUTH_REQUIRED' };
        }
        if (res.status === 403) {
            return { success: false, error: 'PLAN_REQUIRED' };
        }

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to generate code');
        }

        return {
            success: true,
            code: cleanCode(data.code || ''),
        };
    },

    /**
     * Stream code generation via SSE
     * @param opts - Generation options
     * @param onChunk - Callback for each streamed chunk
     * @param onComplete - Callback when streaming completes
     * @param onError - Callback on error
     */
    async stream(
        opts: GenerateOptions,
        onChunk: (chunk: string) => void,
        onComplete?: (fullCode: string) => void,
        onError?: (error: Error) => void,
    ): Promise<void> {
        try {
            const res = await fetch(`${API_BASE}/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Canvas-Source': 'standalone',
                },
                body: JSON.stringify({
                    prompt: opts.prompt,
                    provider: (opts.provider || 'xai').toLowerCase(),
                    modelId: opts.modelId || 'grok-3',
                    isThinking: opts.isThinking || false,
                    currentCode: opts.currentCode,
                    history: opts.history || [],
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(data.error || `Stream failed: ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullCode = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullCode += chunk;
                onChunk(chunk);
            }

            onComplete?.(cleanCode(fullCode));
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Stream failed');
            onError?.(error);
            throw error;
        }
    },

    /**
     * Chat with AI in Canvas IDE context
     */
    async chat(opts: ChatOptions): Promise<ChatResult> {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Canvas-Source': 'standalone',
            },
            body: JSON.stringify({
                message: opts.message,
                context: opts.context,
                history: opts.history || [],
                tools: opts.tools ?? true,
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Chat failed');
        }

        return data;
    },

    /**
     * Agent chat with native tool calling (non-streaming)
     */
    async agentChat(opts: ChatOptions & { projectId?: string }): Promise<ChatResult> {
        const res = await fetch(`${API_BASE}/agent-chat`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Canvas-Source': 'standalone',
            },
            body: JSON.stringify({
                message: opts.message,
                context: opts.context,
                history: opts.history || [],
                projectId: opts.projectId,
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Agent chat failed');
        }

        return data;
    },

    /**
     * Agent chat with streaming (SSE)
     * @param opts - Chat options
     * @param onChunk - Callback for each streamed chunk
     * @param onToolCall - Callback when a tool is called
     * @param onComplete - Callback when streaming completes
     */
    async agentChatStream(
        opts: ChatOptions & { projectId?: string },
        onChunk: (chunk: string) => void,
        onToolCall?: (tool: string, result: unknown) => void,
        onComplete?: (fullMessage: string) => void,
    ): Promise<void> {
        const res = await fetch(`${API_BASE}/agent-chat-stream`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-Canvas-Source': 'standalone',
            },
            body: JSON.stringify({
                message: opts.message,
                context: opts.context,
                history: opts.history || [],
                projectId: opts.projectId,
            }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(data.error || `Agent stream failed: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'text') {
                            fullMessage += data.content;
                            onChunk(data.content);
                        } else if (data.type === 'tool_call' && onToolCall) {
                            onToolCall(data.tool, data.result);
                        }
                    } catch {
                        // Non-JSON SSE data — treat as raw text
                        const content = line.slice(6);
                        fullMessage += content;
                        onChunk(content);
                    }
                }
            }
        }

        onComplete?.(fullMessage);
    },
};

export default canvasGenerateService;
