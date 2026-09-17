/**
 * SMART AI ROUTER
 * xAI (primary) → Mistral → OpenAI fallback chain
 * All three use OpenAI-compatible API format
 */

// Provider capabilities — xAI primary, Mistral second, OpenAI third
const PROVIDER_CAPABILITIES = {
  xai: {
    name: 'xAI',
    displayName: 'Grok',
    models: ['grok-3', 'grok-3-mini'],
    capabilities: ['chat', 'code', 'reasoning', 'planning', 'function-calling'],
    priority: 1,
    icon: '⚡',
  },
  mistral: {
    name: 'Mistral',
    displayName: 'Mistral Large',
    models: ['mistral-large-latest', 'codestral-latest', 'mistral-medium-latest'],
    capabilities: ['chat', 'code', 'writing', 'multilingual', 'function-calling'],
    priority: 2,
    icon: '🔮',
  },
  openai: {
    name: 'OpenAI',
    displayName: 'GPT-4o',
    models: ['gpt-4o', 'gpt-4o-mini'],
    capabilities: ['chat', 'code', 'vision', 'function-calling'],
    priority: 3,
    icon: '🤖',
  },
};

// Friendly error messages
const FRIENDLY_ERRORS = {
  rate_limit: {
    title: '⏱️ High Demand',
    message: 'This AI agent is super busy right now! Let me try another one for you...',
    action: 'auto_switch',
  },
  token_limit: {
    title: '📝 Request Too Large',
    message: 'Your request is a bit too long for this agent. Switching to a more powerful one...',
    action: 'auto_switch',
  },
  timeout: {
    title: '⌛ Taking Too Long',
    message: 'This agent is taking a coffee break. Let me connect you with another...',
    action: 'auto_switch',
  },
  auth_error: {
    title: '🔑 Configuration Issue',
    message: 'There\'s a temporary issue with this agent. Trying an alternative...',
    action: 'auto_switch',
  },
  not_available: {
    title: '😴 Agent Offline',
    message: 'This agent is currently unavailable. Connecting you with a backup...',
    action: 'auto_switch',
  },
  capability_missing: {
    title: '🎯 Different Skill Needed',
    message: 'This agent doesn\'t have that skill. Let me find one that does...',
    action: 'auto_switch',
  },
  all_failed: {
    title: '🔧 Service Issue',
    message: 'All our AI agents are busy. Please try again in a moment.',
    action: 'retry_later',
  },
  unknown: {
    title: '🤔 Unexpected Issue',
    message: 'Something went wrong. Let me try a different approach...',
    action: 'auto_switch',
  },
};

// Detect error type from error message/code
function detectErrorType(error) {
  const message = (error.message || '').toLowerCase();
  const code = error.code || error.status || '';

  if (code === 429 || message.includes('rate') || message.includes('quota') || message.includes('limit')) {
    return 'rate_limit';
  }
  if (message.includes('token') || message.includes('too large') || message.includes('context')) {
    return 'token_limit';
  }
  if (message.includes('timeout') || message.includes('timed out') || code === 'ETIMEDOUT') {
    return 'timeout';
  }
  if (code === 401 || code === 403 || message.includes('auth') || message.includes('api key')) {
    return 'auth_error';
  }
  if (code === 503 || message.includes('unavailable') || message.includes('overloaded')) {
    return 'not_available';
  }

  return 'unknown';
}

// Get friendly error response
function getFriendlyError(error, switchedTo = null) {
  const errorType = detectErrorType(error);
  const friendlyError = FRIENDLY_ERRORS[errorType] || FRIENDLY_ERRORS.unknown;

  let response = {
    ...friendlyError,
    originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };

  if (switchedTo) {
    const provider = PROVIDER_CAPABILITIES[switchedTo];
    response.switchedTo = {
      provider: switchedTo,
      name: provider?.displayName || provider?.name || switchedTo,
      icon: provider?.icon || '🤖',
    };
    response.message = `${friendlyError.message}\n\n✅ Switched to **${provider?.displayName || switchedTo}** ${provider?.icon || ''}`;
  }

  return response;
}

// Find best fallback provider
function findFallbackProvider(failedProvider, requiredCapability = null, excludeProviders = []) {
  const excluded = new Set([failedProvider, ...excludeProviders]);

  // Get available providers sorted by priority
  const available = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([id]) => !excluded.has(id))
    .filter(([id]) => {
      // Check if provider has API key configured
      const envKey = `${id.toUpperCase()}_API_KEY`;
      return !!process.env[envKey];
    })
    .filter(([, config]) => {
      // Check capability if required
      if (requiredCapability) {
        return config.capabilities.includes(requiredCapability);
      }
      return true;
    })
    .sort((a, b) => a[1].priority - b[1].priority);

  return available.length > 0 ? available[0][0] : null;
}

// Find provider by capability
function findProviderByCapability(capability) {
  const providers = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([id]) => {
      const envKey = `${id.toUpperCase()}_API_KEY`;
      return !!process.env[envKey];
    })
    .filter(([, config]) => config.capabilities.includes(capability))
    .sort((a, b) => a[1].priority - b[1].priority);

  return providers.length > 0 ? providers[0][0] : null;
}

// Detect required capability from user message
function detectRequiredCapability(message) {
  const lowerMessage = message.toLowerCase();

  // Image generation keywords
  if (lowerMessage.match(/generate.*image|create.*image|draw|make.*picture|image of|picture of|illustration/)) {
    return 'image-generation';
  }

  // Vision/image analysis keywords
  if (lowerMessage.match(/look at|analyze.*image|what.*image|describe.*image|in this image|this picture/)) {
    return 'vision';
  }

  // Code generation keywords
  if (lowerMessage.match(/write.*code|create.*code|build.*app|code.*for|program|function|script/)) {
    return 'code';
  }

  return 'chat'; // Default capability
}

// Smart request with automatic fallback
async function smartRequest(requestFn, options = {}) {
  const {
    provider: initialProvider = 'mistral',
    model: initialModel,
    message = '',
    maxRetries = 3,
    onSwitch = null,
    onError = null,
  } = options;

  // Detect required capability
  const requiredCapability = detectRequiredCapability(message);

  // Check if initial provider has required capability
  let provider = initialProvider;
  let model = initialModel;

  const initialConfig = PROVIDER_CAPABILITIES[provider];
  if (requiredCapability && initialConfig && !initialConfig.capabilities.includes(requiredCapability)) {
    // Find better provider for this capability
    const betterProvider = findProviderByCapability(requiredCapability);
    if (betterProvider) {
      const betterConfig = PROVIDER_CAPABILITIES[betterProvider];
      console.log(`[SmartRouter] Capability routing: ${requiredCapability} → ${betterProvider} (${betterConfig.displayName})`);

      if (onSwitch) {
        onSwitch({
          from: provider,
          to: betterProvider,
          reason: `capability_${requiredCapability}`,
          message: `Routing to ${betterConfig.displayName} ${betterConfig.icon} for ${requiredCapability}`,
        });
      }

      provider = betterProvider;
      model = betterConfig.models[0];
    }
  }

  const triedProviders = [];
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[SmartRouter] Attempt ${attempt + 1}/${maxRetries} with ${provider}/${model}`);

      const result = await requestFn(provider, model);

      // Success!
      return {
        success: true,
        result,
        provider,
        model,
        attempts: attempt + 1,
        switched: triedProviders.length > 0,
        switchHistory: triedProviders,
      };

    } catch (error) {
      console.error(`[SmartRouter] Error with ${provider}:`, error.message);
      lastError = error;
      triedProviders.push({ provider, model, error: error.message });

      // Notify about error
      if (onError) {
        const friendlyError = getFriendlyError(error);
        onError({ provider, error: friendlyError });
      }

      // Find fallback
      const fallbackProvider = findFallbackProvider(
        provider,
        requiredCapability !== 'chat' ? requiredCapability : null,
        triedProviders.map(t => t.provider)
      );

      if (!fallbackProvider) {
        console.log('[SmartRouter] No more fallback providers available');
        break;
      }

      const fallbackConfig = PROVIDER_CAPABILITIES[fallbackProvider];
      console.log(`[SmartRouter] Switching to fallback: ${fallbackProvider} (${fallbackConfig.displayName})`);

      // Notify about switch
      if (onSwitch) {
        onSwitch({
          from: provider,
          to: fallbackProvider,
          reason: detectErrorType(error),
          message: getFriendlyError(error, fallbackProvider).message,
        });
      }

      provider = fallbackProvider;
      model = fallbackConfig.models[0];
    }
  }

  // All attempts failed
  return {
    success: false,
    error: getFriendlyError(lastError || new Error('All providers failed')),
    attempts: maxRetries,
    switchHistory: triedProviders,
  };
}

// Export utilities
export {
  PROVIDER_CAPABILITIES,
  FRIENDLY_ERRORS,
  detectErrorType,
  getFriendlyError,
  findFallbackProvider,
  findProviderByCapability,
  detectRequiredCapability,
  smartRequest,
};

export default {
  PROVIDER_CAPABILITIES,
  FRIENDLY_ERRORS,
  detectErrorType,
  getFriendlyError,
  findFallbackProvider,
  findProviderByCapability,
  detectRequiredCapability,
  smartRequest,
};
