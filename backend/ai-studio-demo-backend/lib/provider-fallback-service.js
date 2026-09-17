/**
 * Provider Fallback Service
 * Implements priority-based provider fallback for free tier usage
 * Priority: Cerebras (premium) → Gemini (2nd) → Groq (fallback)
 */

import OpenAI from 'openai';

const PROVIDER_FALLBACK_ORDER = ['cerebras', 'gemini', 'groq'];

const PROVIDER_CONFIG = {
    cerebras: {
        name: 'Cerebras',
        baseURL: 'https://api.cerebras.ai/v1',
        apiKey: process.env.CEREBRAS_API_KEY,
        defaultModel: 'llama3.1-8b',
        isOpenAICompatible: true,
    },
    gemini: {
        name: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: 'gemini-2.5-flash',
        isOpenAICompatible: false,
    },
    groq: {
        name: 'Groq',
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaultModel: 'llama-3.3-70b-versatile',
        isOpenAICompatible: true,
    },
};

/**
 * Helper: Call OpenAI-compatible API (Cerebras, Groq)
 */
async function chatOpenAICompatible(providerName, config, message, conversationHistory, options) {
    const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
    });

    const messages = [];

    // Add conversation history
    if (conversationHistory?.length > 0) {
        for (const msg of conversationHistory.slice(-10)) {
            messages.push({
                role: msg.role === 'model' ? 'assistant' : msg.role,
                content: msg.content,
            });
        }
    }

    // Add user message
    messages.push({
        role: 'user',
        content: message,
    });

    const response = await client.chat.completions.create({
        model: config.defaultModel,
        messages: options.systemPrompt
            ? [{ role: 'system', content: options.systemPrompt }, ...messages]
            : messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
    });

    return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
    };
}

/**
 * Call Google Gemini API
 */
async function chatGemini(config, message, conversationHistory, options) {
    const apiKey = config.apiKey;
    const model = config.defaultModel;

    // Build request payload for Gemini API
    const contents = [];

    // Add conversation history
    if (conversationHistory?.length > 0) {
        for (const msg of conversationHistory.slice(-10)) {
            contents.push({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        }
    }

    // Add user message
    contents.push({
        role: 'user',
        parts: [{ text: message }],
    });

    const requestBody = {
        contents,
        generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxTokens,
        },
        systemInstruction: options.systemPrompt ? {
            parts: [{ text: options.systemPrompt }],
        } : undefined,
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!content) {
        throw new Error('No response content from Gemini');
    }

    return {
        content,
        model,
    };
}

/**
 * Call chat with automatic fallback
 * @param {string} message - User message
 * @param {array} conversationHistory - Previous messages
 * @param {object} options - { systemPrompt, temperature, maxTokens }
 * @returns {Promise<{success: boolean, response: string, provider: string, model: string, error?: string}>}
 */
export async function chatWithFallback(message, conversationHistory = [], options = {}) {
    const {
        systemPrompt = '',
        temperature = 0.7,
        maxTokens = 4096,
        requestedProvider = null,
    } = options;

    // Determine provider order
    let providersToTry = PROVIDER_FALLBACK_ORDER;
    if (requestedProvider && PROVIDER_CONFIG[requestedProvider]) {
        providersToTry = [requestedProvider, ...PROVIDER_FALLBACK_ORDER.filter(p => p !== requestedProvider)];
    }

    const errors = [];

    for (const provider of providersToTry) {
        const config = PROVIDER_CONFIG[provider];

        if (!config.apiKey) {
            console.warn(`[ProviderFallback] ${config.name}: API key not configured`);
            errors.push({ provider, error: 'API key not configured' });
            continue;
        }

        try {
            console.log(`[ProviderFallback] Attempting ${config.name}...`);

            if (config.isOpenAICompatible) {
                // Use OpenAI SDK for compatible providers (no tools for demo)
                const response = await chatOpenAICompatible(provider, config, message, conversationHistory, {
                    systemPrompt,
                    temperature,
                    maxTokens,
                });

                return {
                    success: true,
                    response: response.content,
                    provider,
                    model: response.model,
                };
            } else if (provider === 'gemini') {
                // Use native Gemini API (no tools for demo)
                const response = await chatGemini(config, message, conversationHistory, {
                    systemPrompt,
                    temperature,
                    maxTokens,
                });

                return {
                    success: true,
                    response: response.content,
                    provider,
                    model: response.model,
                };
            }
        } catch (error) {
            const errorMsg = error?.message || String(error);
            console.error(`[ProviderFallback] ${config.name} failed:`, errorMsg);
            errors.push({ provider, error: errorMsg });
        }
    }

    return {
        success: false,
        response: '',
        error: `All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`,
    };
}

export default {
    chatWithFallback,
    PROVIDER_FALLBACK_ORDER,
    PROVIDER_CONFIG,
};

