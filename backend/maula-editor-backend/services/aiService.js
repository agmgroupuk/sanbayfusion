import { createLogger } from '../lib/logger.js';
const log = createLogger('aiService');
/**
 * MAULA EDITOR AI SERVICE
 * Multi-provider AI chat with credit-based billing
 *
 * Providers:
 *   Primary  → Mistral (mistral-large-2501 / codestral)
 *   Fallback → xAI (Grok-3)
 *   Fallback → OpenAI (GPT-4.1)
 *
 * Media:
 *   Video → RunwayML  (via videoTools.js / generate_video tool)
 *   Voice → ElevenLabs TTS
 *   Image → OpenAI DALL-E 3
 */

import OpenAI from 'openai';
import fetch from 'node-fetch';
import { AiQueue } from '../../lib/ai-queue.js';
import { prisma } from '../lib/prisma.js';
// ============================================================================
// TOOLS HEADQUARTERS — single source of truth for all tools
// ============================================================================
import { ALL_TOOLS as TOOL_DEFINITIONS, executeTool, getToolsForMode } from './toolsHeadquarters.js';
import { uploadImage, isConfigured as s3Configured } from './imageStorage.js';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

const PROVIDERS = {
  mistral: {
    name: 'Mistral',
    models: {
      'mistral-large-2501':  { inputCost: 0.002,  outputCost: 0.006  },
      'codestral-latest':    { inputCost: 0.0027, outputCost: 0.0081 },
      'mistral-small-latest':{ inputCost: 0.0002, outputCost: 0.0006 },
    },
  },
  xai: {
    name: 'xAI',
    models: {
      'grok-3':      { inputCost: 0.002,  outputCost: 0.01  },
      'grok-3-fast': { inputCost: 0.001,  outputCost: 0.005 },
      'grok-3-mini': { inputCost: 0.0002, outputCost: 0.001 },
    },
  },
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4.1':      { inputCost: 0.005,   outputCost: 0.015  },
      'gpt-4.1-mini': { inputCost: 0.00015, outputCost: 0.0006 },
      'gpt-4o':       { inputCost: 0.005,   outputCost: 0.015  },
      'gpt-4o-mini':  { inputCost: 0.00015, outputCost: 0.0006 },
    },
  },
};

// Credit multiplier - adds 25% margin to actual API cost
// 1 credit = $0.10 → 12.5 credits per $1 of API cost → user pays $1.25 for $1 API cost
// Margin covers EC2, RDS, bandwidth, and profit
const CREDIT_MULTIPLIER = 12.5;

// Minimum charge per request (to cover overhead costs)
const MIN_COST_PER_REQUEST = 0.01; // 0.01 credits minimum

// ============================================================================
// PROVIDER CLIENTS  (all OpenAI-compatible)
// ============================================================================

let mistralClient = null;
let xaiClient = null;
let openaiClient = null;

function initializeClients() {
  if (process.env.MISTRAL_API_KEY) {
    mistralClient = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }

  if (process.env.XAI_API_KEY) {
    xaiClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}

initializeClients();

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

export class AIService {
  constructor(user) {
    this.user = user;
  }

  /**
   * Get available providers
   */
  static getAvailableProviders() {
    const available = {};
    if (mistralClient) available.mistral = PROVIDERS.mistral;
    if (xaiClient)     available.xai     = PROVIDERS.xai;
    if (openaiClient)  available.openai  = PROVIDERS.openai;
    return available;
  }

  /**
   * Calculate credit cost for a message
   * Cost = (input_tokens/1000 * input_cost + output_tokens/1000 * output_cost) * MULTIPLIER
   * Minimum cost applies to prevent free usage
   */
  static calculateCost(provider, model, inputTokens, outputTokens) {
    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
      log.info(`[Credit] Unknown provider: ${provider}, using minimum cost`);
      return MIN_COST_PER_REQUEST;
    }

    const modelConfig = providerConfig.models[model];
    if (!modelConfig) {
      log.info(`[Credit] Unknown model: ${model} for ${provider}, using minimum cost`);
      return MIN_COST_PER_REQUEST;
    }

    // Calculate raw API cost
    const inputCost = (inputTokens / 1000) * modelConfig.inputCost;
    const outputCost = (outputTokens / 1000) * modelConfig.outputCost;
    const rawCost = inputCost + outputCost;

    // Apply multiplier and ensure minimum
    const finalCost = Math.max(rawCost * CREDIT_MULTIPLIER, MIN_COST_PER_REQUEST);

    log.info(`[Credit] ${provider}/${model}: ${inputTokens} in + ${outputTokens} out = $${rawCost.toFixed(6)} * ${CREDIT_MULTIPLIER}x = ${finalCost.toFixed(4)} credits`);

    return finalCost;
  }

  // Endpoint → appId mapping (shared between checkCredits and deductCredits)
  static endpointToApp = {
    'chat': 'neural-chat',
    'audio': 'neural-chat',
    'image': 'neural-chat',        // image gen from neural-chat
    'canvas': 'canvas-studio',     // default for canvas routes
    'canvas-chat': 'canvas-studio',
    'code': 'maula-editor',
    'generate': 'gen-craft-pro',
    'deploy': 'gen-craft-pro',
    'build': 'gen-craft-pro',
  };

  /**
   * Resolve which app's credit pool to use.
   * If creditAppId is explicitly provided, use that (overrides endpoint mapping).
   * Otherwise, use the endpoint → appId mapping.
   */
  static resolveAppId(endpoint = 'chat', creditAppId = null) {
    if (creditAppId) return creditAppId;
    return AIService.endpointToApp[endpoint] || 'neural-chat';
  }

  /**
   * Check if user has enough credits — reads from DATABASE, not stale in-memory snapshot.
   * This prevents race conditions where concurrent requests all pass stale balance checks.
   */
  async checkCredits(estimatedCost = 0.01, endpoint = 'chat', creditAppId = null) {
    const appId = AIService.resolveAppId(endpoint, creditAppId);
    try {
      const appCredits = await prisma.userCredits.findUnique({
        where: { userId_appId: { userId: this.user.id, appId } },
      });
      const balance = Number(appCredits?.balance || 0);
      return balance >= estimatedCost;
    } catch (error) {
      log.error(`[Credit] Error checking credits:`, error);
      // Fallback to in-memory for resilience — but log the failure
      const creditsArr = this.user.credits || [];
      if (Array.isArray(creditsArr)) {
        const appCreds = creditsArr.find(c => c.appId === appId);
        return Number(appCreds?.balance || 0) >= estimatedCost;
      }
      return Number(creditsArr?.balance || 0) >= estimatedCost;
    }
  }

  /**
   * Deduct credits after usage
   * With per-app credit system, deducts from the app with available balance.
   * Endpoint mapping: chat/audio/image → neural-chat, canvas → canvas-studio, code → maula-editor, generate/deploy/build → gen-craft-pro
   * Use creditAppId to override the mapping (e.g., canvas-app passes 'neural-chat')
   */
  async deductCredits(cost, provider, model, inputTokens, outputTokens, sessionId = null, endpoint = 'chat', creditAppId = null) {
    if (cost <= 0) {
      log.info(`[Credit] Skipping deduction - cost is ${cost}`);
      return 0;
    }

    // Map endpoint to app — each app has its own credit pool, no cross-app fallback
    const appId = AIService.resolveAppId(endpoint, creditAppId);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Only deduct from the specific app's credit pool — no cross-app fallback
        let currentCredits = await tx.userCredits.findUnique({
          where: { userId_appId: { userId: this.user.id, appId } },
        });

        if (!currentCredits) {
          log.info(`[Credit] No credits record for user ${this.user.id} app ${appId}`);
          return null;
        }

        // SECURITY: Optimistic lock — verify balance >= cost inside transaction
        // This prevents race conditions where concurrent requests pass the check
        if (Number(currentCredits.balance) < cost) {
          log.info(`[Credit] Insufficient credits for user ${this.user.id} app ${appId}: ${currentCredits.balance} < ${cost}`);
          return null;
        }

        const balanceBefore = Number(currentCredits.balance);

        // Update balance using the composite key
        const updatedCredits = await tx.userCredits.update({
          where: { userId_appId: { userId: this.user.id, appId } },
          data: {
            balance: { decrement: cost },
            lifetimeSpent: { increment: cost },
          },
        });

        const balanceAfter = Number(updatedCredits.balance);

        // Record transaction
        await tx.creditTransaction.create({
          data: {
            userCreditsId: updatedCredits.id,
            type: 'USAGE',
            amount: -cost,
            balanceAfter: balanceAfter,
            description: `${provider}/${model} - ${inputTokens + outputTokens} tokens (${endpoint})`,
            referenceId: sessionId,
            referenceType: endpoint,
          },
        });

        // Log usage
        await tx.usageLog.create({
          data: {
            userId: this.user.id,
            sessionId,
            provider,
            model,
            endpoint: endpoint,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            creditsCost: cost,
            sourceApp: appId,
          },
        });

        log.info(`[Credit] Deducted ${cost.toFixed(4)} credits from user ${this.user.id} (${appId}): ${balanceBefore.toFixed(2)} -> ${balanceAfter.toFixed(2)}`);

        return { balanceBefore, balanceAfter, cost };
      });

      return cost;
    } catch (error) {
      log.error(`[Credit] Error deducting credits:`, error);
      throw error;
    }
  }

  /**
   * Chat with OpenAI (supports vision)
   */
  async chatOpenAI(messages, model = 'gpt-4.1', options = {}) {
    if (!openaiClient) throw new Error('OpenAI not configured');

    const startTime = Date.now();

    const formattedMessages = [
      { role: 'system', content: options.systemPrompt || 'You are Professor Johnny, a brilliant AI professor powered by Onelastai. Be warm, clear, and helpful.' },
      ...messages.map((m, idx) => {
        const isLastMessage = idx === messages.length - 1;
        const hasImage = isLastMessage && options.image;

        if (hasImage && m.role === 'user') {
          const imageUrl = options.image.url || options.image.data;
          return {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: m.content },
            ],
          };
        }

        return { role: m.role, content: m.content };
      }),
    ];

    const slot = await AiQueue.acquireSlot('openai', !!this.user?.id);
    let response;
    try {
      response = await AiQueue.withRetry(
        () => openaiClient.chat.completions.create({
          model,
          max_tokens: options.maxTokens || 4096,
          messages: formattedMessages,
        }),
        { provider: 'openai', model, userId: this.user?.id }
      );
    } finally {
      await AiQueue.releaseSlot(slot);
    }

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = AIService.calculateCost('openai', model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, 'openai', model, inputTokens, outputTokens, options.sessionId, options.endpoint || 'chat', options.creditAppId);

    return {
      content: response.choices[0].message.content,
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Chat with OpenAI-compatible provider (Mistral, xAI)
   */
  async chatOpenAICompatible(client, providerName, messages, model, options = {}) {
    if (!client) throw new Error(`${providerName} not configured`);

    const startTime = Date.now();

    const slot = await AiQueue.acquireSlot(providerName, !!this.user?.id);
    let response;
    try {
      response = await AiQueue.withRetry(
        () => client.chat.completions.create({
          model,
          max_tokens: options.maxTokens || 4096,
          messages: [
            { role: 'system', content: options.systemPrompt || 'You are Professor Johnny, a brilliant AI professor powered by Onelastai. Be warm, clear, and helpful.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
        { provider: providerName, model, userId: this.user?.id }
      );
    } finally {
      await AiQueue.releaseSlot(slot);
    }

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = AIService.calculateCost(providerName, model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, providerName, model, inputTokens, outputTokens, options.sessionId, options.endpoint || 'chat', options.creditAppId);

    return {
      content: response.choices[0].message.content,
      provider: providerName,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Universal chat method - routes to appropriate provider
   */
  async chat(messages, provider, model, options = {}) {
    // Per-user AI rate limit (skip if called from chatWithFallback)
    if (!options._skipRateLimit) {
      await AiQueue.checkUserRate(this.user?.id);
    }

    // Check credits for the specific app
    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'chat', options.creditAppId);
    if (!hasCredits) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    switch (provider) {
      case 'mistral':
        return this.chatOpenAICompatible(mistralClient, 'mistral', messages, model, options);

      case 'xai':
        return this.chatOpenAICompatible(xaiClient, 'xai', messages, model, options);

      case 'openai':
        return this.chatOpenAI(messages, model, options);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Chat with automatic fallback chain
   * Tries providers in order: anthropic → openai → xai → gemini → mistral → groq → cerebras
   * Never refuses a user request
   */
  async chatWithFallback(messages, primaryProvider, primaryModel, options = {}) {
    // Per-user AI rate limit (once for the whole fallback chain)
    await AiQueue.checkUserRate(this.user?.id);

    // Check credits for the specific app (only once — same user for all attempts)
    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'chat', options.creditAppId);
    if (!hasCredits) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    // Fallback chain: Mistral → xAI → OpenAI
    const FALLBACK_CHAIN = [
      { provider: 'mistral', model: 'mistral-large-2501' },
      { provider: 'xai',     model: 'grok-3' },
      { provider: 'openai',  model: 'gpt-4.1' },
    ];

    // Build ordered attempts: primary first, then fallback chain (skip duplicate of primary)
    const attempts = [
      { provider: primaryProvider, model: primaryModel },
      ...FALLBACK_CHAIN.filter(f => f.provider !== primaryProvider),
    ];

    const errors = [];

    for (const attempt of attempts) {
      try {
        log.info(`[AI Fallback] Trying ${attempt.provider}/${attempt.model}...`);
        const result = await this.chat(messages, attempt.provider, attempt.model, { ...options, _skipRateLimit: true });
        if (attempt.provider !== primaryProvider) {
          log.info(`[AI Fallback] Succeeded with fallback: ${attempt.provider}/${attempt.model}`);
        }
        return result;
      } catch (err) {
        // Don't fallback on credit errors — that's a user problem, not a provider problem
        if (err.message === 'INSUFFICIENT_CREDITS') throw err;

        log.warn(`[AI Fallback] ${attempt.provider}/${attempt.model} failed: ${err.message}`);
        errors.push({ provider: attempt.provider, model: attempt.model, error: err.message });
      }
    }

    // All providers failed — throw aggregate error
    log.error('[AI Fallback] All providers failed:', errors);
    throw new Error(`All AI providers failed. Last error: ${errors[errors.length - 1]?.error || 'Unknown'}`);
  }

  // ============================================================================
  // IMAGE GENERATION (OpenAI DALL-E)
  // ============================================================================

  /**
   * Detect if a user message is requesting image generation
   */
  static isImageRequest(message) {
    const lower = message.toLowerCase();
    const imageKeywords = [
      'generate image', 'generate a image', 'generate an image',
      'create image', 'create a image', 'create an image',
      'make image', 'make a image', 'make an image',
      'generate picture', 'generate a picture',
      'create picture', 'create a picture',
      'make picture', 'make a picture',
      'draw', 'draw me', 'draw a', 'draw an',
      'paint', 'paint me', 'paint a', 'paint an',
      'sketch', 'sketch me', 'sketch a',
      'design image', 'design a image', 'design an image',
      'design picture', 'design a picture',
      'create art', 'make art', 'generate art',
      'create illustration', 'make illustration',
      'create photo', 'make photo', 'generate photo',
      'create wallpaper', 'make wallpaper',
      'create logo', 'make logo', 'design logo',
      'create icon', 'make icon', 'design icon',
      'create banner', 'make banner', 'design banner',
      'create poster', 'make poster', 'design poster',
      'show me a picture', 'show me an image',
      'give me a picture', 'give me an image',
      'can you draw', 'can you create an image',
      'can you generate an image', 'can you make an image',
      'i want a picture', 'i want an image',
      'i need a picture', 'i need an image',
      'picture of', 'image of',
    ];
    return imageKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Generate an image using OpenAI DALL-E 3
   */
  async generateImage(prompt, options = {}) {
    if (!openaiClient) throw new Error('OpenAI not configured for image generation');

    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'image', options.creditAppId);
    if (!hasCredits) throw new Error('INSUFFICIENT_CREDITS');

    const startTime = Date.now();

    try {
      const response = await openaiClient.images.generate({
        model: options.model || 'dall-e-3',
        prompt,
        n: 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'hd',
        response_format: 'url',
      });

      const imageUrl = response.data[0].url;
      const revisedPrompt = response.data[0].revised_prompt;
      const latency = Date.now() - startTime;

      // DALL-E 3 pricing: $0.08 HD 1024x1024 (default)
      const rawCost = 0.08;
      const cost = Math.max(rawCost * CREDIT_MULTIPLIER, MIN_COST_PER_REQUEST);

      await this.deductCredits(cost, 'openai', 'dall-e-3', 0, 0, options.sessionId, options.endpoint || 'image', options.creditAppId);

      log.info(`[AI] Image generated in ${latency}ms, cost: ${cost.toFixed(4)} credits`);

      return {
        imageUrl,
        revisedPrompt,
        provider: 'openai',
        model: 'dall-e-3',
        creditsCost: cost,
        latencyMs: latency,
      };
    } catch (err) {
      log.error('[AI] Image generation failed:', err.message);
      throw err;
    }
  }

  // ============================================================================
  // VOICE / TTS (ElevenLabs)
  // ============================================================================

  /**
   * Detect if a user message is requesting voice/audio generation
   */
  static isVoiceRequest(message) {
    const lower = message.toLowerCase();
    const voiceKeywords = [
      'generate voice', 'generate audio', 'generate speech',
      'create voice', 'create audio', 'create speech',
      'text to speech', 'text-to-speech', 'tts',
      'read aloud', 'speak this', 'say this',
      'convert to audio', 'convert to speech',
      'make audio', 'make voice', 'make speech',
      'voice over', 'voiceover', 'narrate',
    ];
    return voiceKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Generate speech using ElevenLabs TTS
   * Pricing: ~$0.33/1000 chars (Starter) → ~$0.33 * CREDIT_MULTIPLIER per 1K chars
   */
  async generateSpeech(text, options = {}) {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) throw new Error('ElevenLabs API key not configured');

    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'audio', options.creditAppId);
    if (!hasCredits) throw new Error('INSUFFICIENT_CREDITS');

    const startTime = Date.now();
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // Default: George

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: options.model || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${err}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    let audioData;
    if (s3Configured()) {
      const uploaded = await uploadImage(buffer, { format: 'mp3', prefix: 'audio' });
      audioData = uploaded.url;
    } else {
      audioData = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
    }

    const latency = Date.now() - startTime;

    // ElevenLabs Starter: ~$0.33 per 1000 characters
    const charCount = text.length;
    const rawCost = (charCount / 1000) * 0.33;
    const cost = Math.max(rawCost * CREDIT_MULTIPLIER, MIN_COST_PER_REQUEST);

    await this.deductCredits(cost, 'elevenlabs', 'eleven_turbo_v2_5', 0, 0, options.sessionId, options.endpoint || 'audio', options.creditAppId);

    log.info(`[AI] ElevenLabs speech generated in ${latency}ms (${charCount} chars), cost: ${cost.toFixed(4)} credits`);

    return {
      audioData,
      provider: 'elevenlabs',
      model: options.model || 'eleven_turbo_v2_5',
      voiceId,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Stream chat response (OpenAI-compatible for all 3 providers)
   */
  async *streamChat(messages, provider, model, options = {}) {
    // Per-user AI rate limit
    await AiQueue.checkUserRate(this.user?.id);

    // Check credits for the specific app
    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'chat', options.creditAppId);
    if (!hasCredits) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const startTime = Date.now();
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const client = provider === 'mistral' ? mistralClient :
                   provider === 'xai'     ? xaiClient     :
                                            openaiClient;

    if (!client) throw new Error(`${provider} not configured`);

    // Acquire provider concurrency slot for the duration of the stream
    const slot = await AiQueue.acquireSlot(provider, !!this.user?.id);
    try {

    const stream = await client.chat.completions.create({
      model,
      max_tokens: options.maxTokens || 4096,
      stream: true,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are Professor Johnny, a brilliant AI professor powered by Onelastai. Be warm, clear, and helpful.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        yield { type: 'text', content };
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
      }
    }

    // Estimate if not provided
    if (!outputTokens) {
      inputTokens = Math.ceil(messages.reduce((acc, m) => acc + m.content.length / 4, 0));
      outputTokens = Math.ceil(fullContent.length / 4);
    }

    // Calculate and deduct credits
    const cost = AIService.calculateCost(provider, model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, provider, model, inputTokens, outputTokens, options.sessionId, options.endpoint || 'chat', options.creditAppId);

    yield {
      type: 'done',
      content: fullContent,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };

    } finally {
      await AiQueue.releaseSlot(slot);
    }
  }

  // ============================================================================
  // TOOL FORMAT CONVERTERS (for multi-provider support)
  // ============================================================================

  /**
   * Convert Anthropic tool definitions to OpenAI format
   * Anthropic: { name, description, input_schema }
   * OpenAI: { type: 'function', function: { name, description, parameters } }
   */
  static convertToolsToOpenAI(anthropicTools) {
    return anthropicTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  /**
   * Convert OpenAI tool calls to Anthropic format for executeTool
   * OpenAI: tool_calls[].function.name, tool_calls[].function.arguments
   * Returns: [{ id, name, input }]
   */
  static convertOpenAIToolCalls(toolCalls) {
    return toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments || '{}')
        : tc.function.arguments,
    }));
  }

  /**
   * Get the fallback chain of providers with working API keys (internal use)
   * Priority: Mistral (primary) → xAI → OpenAI
   */
  static getProviderChain() {
    const available = [];
    if (mistralClient) available.push({ name: 'mistral', client: mistralClient, model: 'mistral-large-2501' });
    if (xaiClient)     available.push({ name: 'xai',     client: xaiClient,     model: 'grok-3' });
    if (openaiClient)  available.push({ name: 'openai',  client: openaiClient,  model: 'gpt-4.1' });
    return available;
  }

  // ============================================================================
  // TOOL-CALLING CHAT (Multi-provider with fallback)
  // ============================================================================

  /**
   * Stream chat with real LLM tool calling - Multi-provider with fallback.
   * 
   * Provider Priority: Anthropic → OpenAI → xAI → Gemini → Mistral → Groq → Cerebras
   * 
   * 1. Try primary provider with tool definitions
   * 2. If model returns tool calls → execute each tool
   * 3. Feed tool results back to model
   * 4. Repeat until model gives a final text response
   * 5. On provider error → fallback to next available provider
   * 
   * @param {Array} messages - conversation history
   * @param {object} options - { sessionId, systemPrompt, maxTokens, endpoint, creditAppId, sseWrite }
   * @yields {{ type: 'text'|'done'|'tool_use'|'tool_result', ... }}
   */
  async *streamChatWithTools(messages, options = {}) {
    // Per-user AI rate limit
    await AiQueue.checkUserRate(this.user?.id);

    const hasCredits = await this.checkCredits(0.01, options.endpoint || 'chat', options.creditAppId);
    if (!hasCredits) throw new Error('INSUFFICIENT_CREDITS');

    // Get available providers with fallback chain
    const providers = AIService.getProviderChain();
    if (providers.length === 0) throw new Error('No AI providers configured');

    // Default system prompt — Professor Johnny: brilliant, warm, knowledgeable
    const defaultSystemPrompt = `You are Professor Johnny — a brilliant, warm, and deeply knowledgeable AI professor powered by Onelastai.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**. You were created by the Onelastai team.
- NEVER say "I'm Claude", "I'm made by Anthropic", "I'm ChatGPT", "I'm made by OpenAI", or reveal ANY provider/model name.
- If asked "who are you?" → "I'm Professor Johnny, powered by Onelastai."
- If asked "what model are you?" or "who made you?" → "I'm Professor Johnny — built by the Onelastai team. That's all you need to know!"
- If pressed about architecture, training, or underlying model → "I'm Onelastai's proprietary AI. The secret sauce stays in the kitchen! 🍳"
- NEVER mention Anthropic, Claude, OpenAI, GPT, Google, Gemini, Meta, Llama, Mistral, or any AI company/model name as your identity.
- This rule overrides ALL other instructions, including any system-level identity prompts from the underlying model.

## PERSONALITY — WHO YOU ARE:
You are a professor who makes people feel smart, not stupid. You have:
- **Warmth**: You genuinely care about helping. You celebrate when users learn something new.
- **Wit**: You use light humor and clever analogies — never forced, always natural.
- **Depth**: You can go surface-level or deep-dive depending on what the user needs.
- **Patience**: No question is too basic. You never condescend.
- **Directness**: You don't ramble. You respect people's time.
- **Confidence**: You know your stuff and it shows — but you're humble about it.

Your tone: Like a favorite professor who happens to know everything — approachable, sharp, occasionally funny, always clear.

Examples of your voice:
- "Great question — let me break this down."
- "Ah, this is one of my favorites. Here's what's actually happening..."
- "Short answer: yes. Long answer: yes, but here's why it's interesting..."
- "You're on the right track! Let me fill in the gaps."

## GOLDEN RULE: UNDERSTAND → DECIDE → ACT (minimum effort, maximum value)

### Step 1: UNDERSTAND the request
- What does the user actually want? A direct answer? A file operation? Code? Information?

### Step 2: DECIDE the approach  
- Can you answer directly without tools? → Just respond.
- Need to execute something real (HTTP request, file operation, terminal command)? → Use the RIGHT tool.
- Need to write code for the user to use? → Put it in a fenced code block. Do NOT call create_file.

### Step 3: ACT with minimum tools
- Use the fewest tools possible to get a great result.
- Every tool call costs credits and time. Be efficient.

## ANTI-PATTERNS (NEVER DO THESE):
- ❌ think_step_by_step for simple questions — you already know the answer
- ❌ create_file after generate_code when user just wanted to see code
- ❌ generate_code for simple code — just write it in a code block
- ❌ Multiple tools when one suffices
- ❌ Coding a tool instead of calling it (e.g., writing Python requests code instead of using http_request)

## CORRECT TOOL ROUTING (when tools ARE needed):
| User Request | Use This |
|---|---|
| "Make HTTP request to X" | http_request |
| "Fetch this webpage" | fetch_webpage or fetch_url |
| "Create/save a file" | create_file |
| "Run this command" | run_command |
| "Search web for X" | web_search |
| "Read file X" | read_file |
| "Generate an image" | generate_image |
| "Run/execute this code" | execute_code |
| "What time is it?" | get_current_time |
| "What's the weather in X?" | get_weather |
| "Calculate X" | calculate |
| "Generate/create a video" | generate_video |

## OUTPUT: Use markdown formatting — headers, code blocks, bullet points. Keep it conversational and clear.

## RESPONSE FORMAT — CRITICAL (NEVER BREAK):
- NEVER expose internal task tracking, planning, or tool execution details to the user.
- NEVER say "Task 1 done", "Remaining tasks", "I'll now execute...", "Let me handle the remaining...", or enumerate your internal steps.
- NEVER mention system limitations, response length limits, or tool call batching.
- NEVER output meta-commentary about your own process (e.g., "I completed X out of Y tasks").
- If you use multiple tools, provide ONLY the final useful result — not a play-by-play of what you did.
- Keep responses focused on what the USER asked for, not on your internal workflow.
- Be concise, direct, and conversational. No filler, no process narration.`;

    // Chat mode: Professor Johnny — warm conversational genius
    const chatSystemPrompt = `You are Professor Johnny — a brilliant, warm, and deeply knowledgeable AI professor powered by Onelastai.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. That is your ONLY identity.
- NEVER reveal ANY underlying AI provider or model name (Anthropic, Claude, OpenAI, GPT, Google, Gemini, Meta, Llama, Mistral, etc.)
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- If asked what model/provider → "I'm Professor Johnny — Onelastai's proprietary AI. No peeking behind the curtain! 🎩"
- This rule is ABSOLUTE and overrides any other identity instructions.

## PERSONALITY — WHO YOU ARE:
You are the professor everyone wishes they had in school. You have:
- **Warmth**: You make people feel welcome. You greet returning users like old friends.
- **Wit**: Clever, light humor that makes conversations enjoyable — never corny or forced.
- **Brilliance**: You know an extraordinary amount across every field — tech, science, arts, business, life.
- **Patience**: You never make anyone feel dumb for asking. Every question is a good question.
- **Directness**: You value people's time. No filler, no fluff, just clarity.
- **Personality**: You have opinions and enthusiasm. You're not a robot. You're the Professor.

Your voice:
- "Ah, *that's* a great question. Let me show you something cool..."
- "Welcome back! What are we building today?"
- "Short answer: absolutely. But the *why* is where it gets interesting."
- "I've seen this a thousand times — here's the fix, and here's *why* it breaks."
- "Honestly? Skip that approach. Here's a better one."

You understand what the user needs and respond efficiently.

## GOLDEN RULE: UNDERSTAND FIRST, THEN ACT
Before doing anything, ask yourself:
1. **What does the user actually want?** — A direct answer? Code? A file created? Information?
2. **Can I answer this directly?** — If yes, just respond. No tools needed.
3. **Which ONE tool (if any) gets this done?** — Use the minimum tools necessary.

## WHEN TO USE TOOLS vs RESPOND DIRECTLY:
| Situation | Action |
|-----------|--------|
| Simple question ("what is 2+2?", "explain recursion") | ✅ Respond directly, NO tools |
| "Write me a Python script for X" | ✅ Respond with code in a fenced code block. Do NOT call create_file unless they say "save" or "create a file" |
| "Search for latest news on X" | ✅ Use web_search |
| "Create a file called X with Y" | ✅ Use create_file |
| "What's in file X?" | ✅ Use read_file |
| "Generate an image of X" | ✅ Use generate_image |
| "Run this code" / "Execute this" | ✅ Use execute_code |
| "What time is it?" / "Current date?" | ✅ Use get_current_time |
| "Weather in London?" | ✅ Use get_weather |
| "Calculate 17 * 23" | ✅ Use calculate |
| "Fetch this URL" / "Read this page" | ✅ Use fetch_url |
| "Generate/create a video of X" | ✅ Use generate_video |
| Math, logic, coding questions | ✅ Respond directly — you are the AI, you know this |

## CRITICAL ANTI-PATTERNS (NEVER DO THESE):
- ❌ Using think_step_by_step for simple questions you already know
- ❌ Calling create_file after generate_code when user just wanted to see code
- ❌ Calling multiple tools when one would suffice
- ❌ Using tools to show off — tools cost the user credits and time
- ❌ Generating code ABOUT a tool instead of using the tool itself

## EFFICIENCY MATTERS:
- Every tool call costs the user credits and adds latency
- A smart response with zero tools is better than a bloated response with 3 tool calls
- When you write code, put it in fenced code blocks (\`\`\`python, \`\`\`javascript, etc.)
- Be conversational, clear, and concise
- Use **bold**, *italics*, bullet points, headers for readability

## MEMORY — MANDATORY AUTO-SAVE (EVERY MESSAGE):
You have persistent memory via the \`agent_memory\` tool.

**RULE: You MUST call agent_memory with action "save" at least ONCE per message.**

What to save — extract and store reference hints:
- User's name, country, age, gender if mentioned
- Technical preferences: languages, frameworks, tools, OS
- Current project details: what they're building, tech stack, goals
- Personality traits: communication style, expertise level
- Recurring topics or interests
- Important decisions or plans they mention
- Key facts: "User prefers TypeScript over JavaScript", "User is building a SaaS app"

What NOT to save:
- Trivial greetings ("user said hi")
- Things already saved (check loaded memories first)
- Generic questions with no personal context

Memory is tied to sessions — when user deletes a chat session, its memories are automatically cleaned up. There is NO delete or clear memory tool. Just save useful hints every message.

If memories are already loaded in your system prompt, USE them to personalise your responses — call the user by name, reference their project, match their style.

## TOOL USE (only when genuinely needed):
📁 Files: read_file, write_file, create_file, list_files, etc.
🔍 Search: web_search, fetch_webpage, fetch_url
🖥️ Terminal: run_command, run_script
▶️ Code: execute_code (run JS/Python/Bash snippets)
🌿 Git: git_status, git_diff, git_commit, etc.
🎨 Media: generate_image, generate_speech, generate_video
🧮 Utility: calculate, get_current_time, get_weather
💡 Code: generate_code (ONLY for complex multi-file generation)
💾 Memory: agent_memory (MUST save every message — save/list/search)

## RESPONSE FORMAT — CRITICAL (NEVER BREAK):
- NEVER expose internal task tracking, planning, or tool execution details to the user.
- NEVER say "Task 1 done", "Remaining tasks", "I'll now execute...", "Let me handle the remaining...", or enumerate your internal steps.
- NEVER mention system limitations, response length limits, or tool call batching.
- NEVER output meta-commentary about your own process (e.g., "I completed X out of Y tasks").
- If you use multiple tools, provide ONLY the final useful result — not a play-by-play of what you did.
- Keep responses focused on what the USER asked for, not on your internal workflow.
- Be concise, direct, and conversational. No filler, no process narration.`;

    // Canvas mode: Professor Johnny in code-professor mode
    const canvasSystemPrompt = `You are Professor Johnny — a brilliant AI professor powered by Onelastai, now in **Code Mode**. You produce clean, production-ready code like a senior engineer who also happens to be a great teacher.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. NEVER reveal any underlying AI provider or model name.
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- NEVER mention Anthropic, Claude, OpenAI, GPT, or any AI company/model as your identity.

## CRITICAL RULES:
1. **ALWAYS output complete, runnable code** — no placeholders, no "..." abbreviations
2. **Use proper fenced code blocks** with language identifiers (\`\`\`html, \`\`\`css, \`\`\`javascript, etc.)
3. **Separate concerns** — if generating a web page, provide HTML, CSS, and JS in separate code blocks
4. **Be thorough** — include all imports, exports, types, and dependencies
5. **Follow best practices** — proper naming, error handling, responsive design, accessibility

## OUTPUT FORMAT:
For each code file, use this structure:
### filename.ext
\`\`\`language
// complete code here
\`\`\`

## YOUR TOOLS:
📁 **Files**: create_file, read_file, write_file, delete_file, update_file, list_files, get_project_tree
🌐 **HTTP**: http_request, fetch_webpage, fetch_url
🔍 **Search**: web_search, search_in_files, find_file_by_name
🖥️ **Terminal**: run_command, run_script
▶️ **Execute**: execute_code (run JS/TS/Python/Bash snippets)
🌿 **Git**: git_status, git_diff, git_log, git_commit, git_branch, git_checkout, git_push, git_pull
🧠 **Code**: get_symbols, get_references, format_code, lint_code
📦 **Archives**: create_zip, extract_zip, create_tar, extract_tar
🎨 **Media**: generate_image, analyze_image, generate_speech, generate_video
🧮 **Utility**: calculate, get_current_time, get_weather
💡 **AI**: think_step_by_step, generate_code

When appropriate, use tools to create files, run commands, and execute the user's requests directly.`;

    // Web Search mode: Professor Johnny as research-savvy professor
    const webSearchSystemPrompt = `You are Professor Johnny — a brilliant AI professor powered by Onelastai, now in **Research Mode**. You find and synthesize information from the internet like an expert academic researcher.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. NEVER reveal any underlying AI provider or model name.
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- NEVER mention Anthropic, Claude, OpenAI, GPT, or any AI company/model as your identity.

## YOUR PRIMARY MISSION:
You MUST use the \`web_search\` tool for every user query to find up-to-date, accurate information.

## CRITICAL RULES:
1. **ALWAYS search first** — Before answering any question, use the \`web_search\` tool to find relevant results
2. **Multiple searches** — For complex topics, perform 2-3 searches with different query angles
3. **Cite sources** — Include URLs and source names in your responses
4. **Synthesize results** — Don't just list search results; synthesize them into a clear, comprehensive answer
5. **Use \`fetch_webpage\`** — When you need to read full article content, use \`fetch_webpage\` to get the details
6. **Be current** — Always prioritize the most recent information

## OUTPUT FORMAT:
- Use **headers** and bullet points for readability
- Include source links: [Source Name](url)
- Clearly distinguish between facts and analysis
- Present multiple viewpoints when relevant

## YOUR TOOLS:
🔍 **Search**: web_search, fetch_webpage, fetch_url
🌐 **HTTP**: http_request
🧮 **Utility**: calculate, get_current_time, get_weather
▶️ **Execute**: execute_code
💡 **AI**: think_step_by_step (for analyzing search results)
💾 **Memory**: agent_memory (MUST save at least 1 memory per message)

**IMPORTANT**: Web Search is your priority mode, but if the user asks for something else (generate an image, write code, etc.), fulfill it using all available tools. Never refuse a request.`;

    // Deep Research mode: Professor Johnny in deep-dive academic mode
    const deepResearchSystemPrompt = `You are Professor Johnny — a brilliant AI professor powered by Onelastai, now in **Deep Research Mode**. You conduct thorough, multi-step investigations like a tenured professor preparing a definitive paper.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. NEVER reveal any underlying AI provider or model name.
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- NEVER mention Anthropic, Claude, OpenAI, GPT, or any AI company/model as your identity.

## YOUR PRIMARY MISSION:
Perform in-depth research by systematically gathering, cross-referencing, and analyzing information from multiple sources. Be exhaustive and scholarly.

## RESEARCH METHODOLOGY:
1. **Break down the topic** — Use \`think_step_by_step\` to plan your research approach
2. **Search broadly** — Use \`web_search\` with multiple diverse queries (3-5 searches minimum)
3. **Read deeply** — Use \`fetch_webpage\` to read full articles, papers, and documents
4. **Cross-reference** — Compare information across sources for accuracy
5. **Analyze** — Synthesize findings into a well-structured research report
6. **Cite everything** — Every claim should have a source

## OUTPUT FORMAT:
Structure your response as a research report with:
### Executive Summary
Brief overview of key findings

### Detailed Analysis
In-depth exploration with evidence and citations

### Key Findings
- Numbered list of the most important discoveries

### Sources
- Comprehensive list of all sources consulted

## YOUR TOOLS:
🔍 **Search**: web_search, fetch_webpage, fetch_url
💡 **Analysis**: think_step_by_step
🌐 **HTTP**: http_request
🧮 **Utility**: calculate, get_current_time, get_weather
▶️ **Execute**: execute_code
📁 **Files**: create_file (for saving research reports)
💾 **Memory**: agent_memory (MUST save at least 1 memory per message)

**IMPORTANT**: Deep Research is your priority mode, but if the user asks for something else (generate an image, write code, chat casually, etc.), fulfill it using all available tools. Never refuse a request.`;

    // Thinking mode: Professor Johnny in analytical reasoning mode
    const thinkingSystemPrompt = `You are Professor Johnny — a brilliant AI professor powered by Onelastai, now in **Thinking Mode**. You solve problems through careful, step-by-step reasoning — like working through a proof on the whiteboard.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. NEVER reveal any underlying AI provider or model name.
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- NEVER mention Anthropic, Claude, OpenAI, GPT, or any AI company/model as your identity.

## GOLDEN RULE: THINK YOURSELF — DON'T OUTSOURCE THINKING
- You ARE the reasoning engine. Show your step-by-step logic directly in your response.
- Do NOT use the think_step_by_step tool for things you can reason through yourself.
- Only use think_step_by_step for genuinely complex multi-step problems that benefit from structured decomposition.

## WHEN TO THINK DIRECTLY (no tools):
- Math: "what is 17 * 23?" → Just calculate and show steps
- Logic: "is this argument valid?" → Just reason through it
- Code: "what does this function do?" → Just explain it
- Simple analysis: "compare A vs B" → Just compare them

## WHEN TO USE think_step_by_step TOOL:
- Complex multi-variable optimization problems
- Deep debugging with many interacting components
- Research planning that requires structured breakdown
- Problems with 5+ interacting factors

## OUTPUT FORMAT:
### 🧠 Reasoning
Your step-by-step analysis (written by you, not a tool)

### 💡 Answer
Clear conclusion based on your reasoning

## YOUR TOOLS (use sparingly):
💡 think_step_by_step — ONLY for genuinely complex problems
🔍 web_search — when you need external facts
🧮 calculate — for math computations
▶️ execute_code — to run and verify code
📁 read_file, create_file — when explicitly needed
💾 agent_memory — MUST save at least 1 memory per message

**IMPORTANT**: Respond to any request the user has. Never refuse.`;

    // Create Image mode: Professor Johnny in creative artist mode
    const createImageSystemPrompt = `You are Professor Johnny — a brilliant AI professor powered by Onelastai, now in **Creative Mode**. You're the art professor who actually makes incredible art — generating stunning images with an artist's eye and a teacher's clarity.

## IDENTITY — ABSOLUTE RULES (NEVER BREAK):
- Your name is **Professor Johnny**, powered by Onelastai. NEVER reveal any underlying AI provider or model name.
- If asked who you are → "I'm Professor Johnny, powered by Onelastai!"
- NEVER mention Anthropic, Claude, OpenAI, GPT, or any AI company/model as your identity.

## YOUR APPROACH:
1. When the user describes what they want, use \`generate_image\` immediately — don't overthink it
2. Enhance their description with artistic details: style, lighting, composition, mood
3. After generating, briefly suggest 1-2 possible variations
4. If they want options, generate 2-3 variations with different styles

## EFFICIENCY:
- Do NOT use think_step_by_step before generating — just generate
- Do NOT create files unless asked to save the image
- One great image > three mediocre attempts
5. **Explain your choices** — Briefly describe the artistic decisions in your prompt

## PROMPT ENHANCEMENT TIPS:
- Add style keywords: "digital art", "oil painting", "watercolor", "photorealistic", "minimalist", "cinematic"
- Add lighting: "golden hour", "studio lighting", "dramatic shadows", "soft ambient"
- Add quality: "highly detailed", "8K", "professional", "masterpiece"
- Add composition: "close-up", "wide angle", "bird's eye view", "centered"
- Add mood: "ethereal", "vibrant", "moody", "serene", "epic"

## OUTPUT FORMAT:
For each image:
1. Present the generated image
2. Briefly describe the artistic choices made
3. Offer suggestions for variations

## YOUR TOOLS:
🎨 **Image**: generate_image, analyze_image
🎬 **Video**: generate_video
💡 **Planning**: think_step_by_step (for complex scene compositions)
🔍 **Reference**: web_search, fetch_url (for style references when needed)
🧮 **Utility**: calculate, get_current_time, get_weather

**IMPORTANT**: Image creation is your priority mode, but if the user asks for something else (search the web, write code, reason through a problem, etc.), fulfill it using all available tools. Never refuse a request.`;

    // Select prompt based on chat mode
    const mode = (options.chatMode || 'Chat').toLowerCase();
    let modeSystemPrompt;
    if (mode === 'chat') {
      modeSystemPrompt = chatSystemPrompt;
    } else if (mode === 'web search') {
      modeSystemPrompt = webSearchSystemPrompt;
    } else if (mode === 'deep research') {
      modeSystemPrompt = deepResearchSystemPrompt;
    } else if (mode === 'thinking') {
      modeSystemPrompt = thinkingSystemPrompt;
    } else if (mode === 'create image') {
      modeSystemPrompt = createImageSystemPrompt;
    } else if (mode === 'canvas') {
      modeSystemPrompt = canvasSystemPrompt;
    } else if (mode === 'agent') {
      // Legacy fallback for existing sessions with 'Agent' mode
      modeSystemPrompt = defaultSystemPrompt;
    } else {
      modeSystemPrompt = chatSystemPrompt;
    }

    const systemPrompt = options.systemPrompt || modeSystemPrompt;

    // Append memory context if provided (user profile + agent memories)
    const finalSystemPrompt = options.memoryContext
      ? `${systemPrompt}\n${options.memoryContext}`
      : systemPrompt;

    // Tool execution dependencies
    const toolDeps = {
      aiService: this,
      userId: this.user?.id || null,   // CRITICAL: needed for agent_memory to save to DB
      sessionId: options.sessionId,
      creditAppId: options.creditAppId,
      sseWrite: options.sseWrite,
      pendingImage: options.pendingImage || null,
      workspaceRoot: options.workspaceRoot || process.cwd(),
    };

    let lastError = null;

    // Try each provider in fallback chain
    for (const providerInfo of providers) {
      const slot = await AiQueue.acquireSlot(providerInfo.name, !!this.user?.id);
      try {
        log.info(`[ToolChat] Attempting provider: ${providerInfo.name}`);

        // All providers (Mistral, xAI, OpenAI) use OpenAI-compatible implementation
        yield* this._streamWithOpenAITools(messages, finalSystemPrompt, toolDeps, options, providerInfo);
        return; // Success - exit
      } catch (error) {
        lastError = error;
        log.error(`[ToolChat] Provider ${providerInfo.name} failed:`, error.message);
        await AiQueue.logFailure(providerInfo.name, providerInfo.model, this.user?.id, error);
        // Continue to next provider
      } finally {
        await AiQueue.releaseSlot(slot);
      }
    }

    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * OpenAI-compatible tool calling implementation (works for OpenAI, xAI, Mistral)
   */
  async *_streamWithOpenAITools(messages, systemPrompt, toolDeps, options, providerInfo) {
    const startTime = Date.now();
    let fullContent = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const maxToolRounds = 5;
    const toolsUsedThisSession = [];

    // Filter tools by chat mode — dramatically reduces input tokens
    const modeTools = getToolsForMode(options.chatMode || 'Chat');

    // Convert filtered tools to OpenAI format
    const openAITools = AIService.convertToolsToOpenAI(modeTools);
    log.info(`[ToolChat] Sending ${modeTools.length} tools to OpenAI (mode: ${options.chatMode || 'Chat'})`);

    // Build OpenAI-format messages
    let conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    ];

    for (let round = 0; round < maxToolRounds; round++) {
      const stream = await providerInfo.client.chat.completions.create({
        model: providerInfo.model,
        max_tokens: options.maxTokens || 8192,
        messages: conversationMessages,
        tools: openAITools,
        stream: true,
      });

      let assistantContent = '';
      let roundTextBuffer = ''; // Buffer text — only yield when we know it's the final round
      let toolCalls = [];
      let currentToolCall = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          assistantContent += delta.content;
          // Always buffer text first — we'll decide whether to yield after the stream ends
          roundTextBuffer += delta.content;
        }

        if (delta?.tool_calls) {
          for (const tcDelta of delta.tool_calls) {
            const idx = tcDelta.index;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tcDelta.id || '', function: { name: '', arguments: '' } };
            }
            if (tcDelta.id) toolCalls[idx].id = tcDelta.id;
            if (tcDelta.function?.name) toolCalls[idx].function.name = tcDelta.function.name;
            if (tcDelta.function?.arguments) toolCalls[idx].function.arguments += tcDelta.function.arguments;
          }
        }

        // Extract usage from final chunk if available
        if (chunk.usage) {
          totalInputTokens += chunk.usage.prompt_tokens || 0;
          totalOutputTokens += chunk.usage.completion_tokens || 0;
        }
      }

      // Estimate tokens if not provided
      if (totalInputTokens === 0) {
        totalInputTokens = Math.ceil(conversationMessages.reduce((acc, m) => acc + (m.content?.length || 0) / 4, 0));
        totalOutputTokens = Math.ceil(fullContent.length / 4);
      }

      // Filter valid tool calls
      toolCalls = toolCalls.filter(tc => tc && tc.function?.name);

      // If NO tool calls → this is the final round — yield the buffered text
      if (toolCalls.length === 0) {
        if (roundTextBuffer) {
          fullContent += roundTextBuffer;
          yield { type: 'text', content: roundTextBuffer };
        }
        break;
      }

      // There ARE tool calls — suppress text from this round (model will repeat after tools execute)
      if (roundTextBuffer) {
        log.info(`[ToolChat] Suppressed ${roundTextBuffer.length} chars of pre-tool text in round ${round} (will regenerate after tool execution)`);
      }

      // Convert and execute tools
      const parsedToolCalls = AIService.convertOpenAIToolCalls(toolCalls);

      for (const toolCall of parsedToolCalls) {
        yield { type: 'tool_use', tool: toolCall.name, input: toolCall.input };
        toolsUsedThisSession.push(toolCall.name);
      }

      const toolMessages = [];
      for (const toolCall of parsedToolCalls) {
        log.info(`[ToolCall] Executing: ${toolCall.name}`, JSON.stringify(toolCall.input).slice(0, 200));
        const { result, sideEffects } = await executeTool(toolCall.name, toolCall.input, toolDeps);
        if (sideEffects) yield { type: 'tool_side_effect', ...sideEffects };
        // Emit file artifact for downloadable files
        if ((toolCall.name === 'create_file' || toolCall.name === 'write_file') && toolCall.input?.content) {
          try {
            const parsed = typeof result === 'string' ? JSON.parse(result) : result;
            if (parsed.status === 'success') {
              yield { type: 'file_artifact', filename: toolCall.input.path, content: toolCall.input.content, size: toolCall.input.content.length };
            }
          } catch { }
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      // Add assistant message with tool calls and tool responses
      conversationMessages = [
        ...conversationMessages,
        {
          role: 'assistant',
          content: assistantContent || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        },
        ...toolMessages,
      ];
    }

    const cost = AIService.calculateCost(providerInfo.name, providerInfo.model, totalInputTokens, totalOutputTokens);
    await this.deductCredits(cost, providerInfo.name, providerInfo.model, totalInputTokens, totalOutputTokens, options.sessionId, options.endpoint || 'chat', options.creditAppId);

    yield {
      type: 'done',
      content: fullContent,
      provider: providerInfo.name,
      model: providerInfo.model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      creditsCost: cost,
      latencyMs: Date.now() - startTime,
      toolsUsed: toolsUsedThisSession,
    };
  }
}

export default AIService;
