/**
 * Configuration utilities for managing environment variables
 * Centralized configuration management for the application
 */

export interface AIConfig {
  // AI Service Providers
  openai: {
    apiKey: string | undefined
    model: string
    enabled: boolean
  }
  anthropic: {
    apiKey: string | undefined
    model: string
    enabled: boolean
  }
  gemini: {
    apiKey: string | undefined
    model: string
    enabled: boolean
  }
  cohere: {
    apiKey: string | undefined
    model: string
    enabled: boolean
  }
}

export interface VoiceConfig {
  // Voice Services
  elevenlabs: {
    apiKey: string | undefined
    voiceId: string
    enabled: boolean
  }
  azure: {
    speechKey: string | undefined
    speechRegion: string
    enabled: boolean
  }
  // Speech Recognition
  speechRecognition: {
    enabled: boolean
    language: string
    continuous: boolean
  }
}

export interface TranslationConfig {
  // Translation Services
  googleTranslate: {
    apiKey: string | undefined
    enabled: boolean
  }
  deepl: {
    apiKey: string | undefined
    enabled: boolean
  }
  azure: {
    translatorKey: string | undefined
    region: string
    enabled: boolean
  }
}

export interface AppConfig {
  // Application Settings
  api: {
    url: string
    timeout: number
  }
  multilingual: {
    enabled: boolean
    defaultLanguage: string
    fallbackLanguage: string
    confidenceThreshold: number
    autoDetect: boolean
  }
  features: {
    voiceEnabled: boolean
    translationEnabled: boolean
    realTimeTranslation: boolean
    languageIndicator: boolean
  }
  security: {
    enableCors: boolean
    allowedOrigins: string[]
    rateLimitEnabled: boolean
  }
}

/**
 * Get AI service configuration from environment variables
 * ✅ SECURITY: API keys removed - all AI calls go through secure backend
 */
export const getAIConfig = (): AIConfig => {
  return {
    openai: {
      apiKey: '', // ✅ REMOVED: API key now only on backend
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
      enabled: true // Backend handles availability
    },
    anthropic: {
      apiKey: '', // ✅ REMOVED: API key now only on backend
      model: process.env.NEXT_PUBLIC_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      enabled: true // Backend handles availability
    },
    gemini: {
      apiKey: '', // ✅ REMOVED: API key now only on backend
      model: process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-pro',
      enabled: true // Backend handles availability
    },
    cohere: {
      apiKey: '', // ✅ REMOVED: API key now only on backend
      model: process.env.NEXT_PUBLIC_COHERE_MODEL || 'command-r-plus',
      enabled: true // Backend handles availability
    }
  }
}


/**
 * Get voice service configuration from environment variables
 */
export const getVoiceConfig = (): VoiceConfig => {
  return {
    elevenlabs: {
      apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY,
      voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
      enabled: !!(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY)
    },
    azure: {
      speechKey: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_KEY,
      speechRegion: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus',
      enabled: !!(process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_KEY)
    },
    speechRecognition: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_SPEECH_RECOGNITION !== 'false',
      language: process.env.NEXT_PUBLIC_SPEECH_RECOGNITION_LANGUAGE || 'en-US',
      continuous: process.env.NEXT_PUBLIC_SPEECH_RECOGNITION_CONTINUOUS === 'true'
    }
  }
}

/**
 * Get translation service configuration from environment variables
 */
export const getTranslationConfig = (): TranslationConfig => {
  return {
    googleTranslate: {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY,
      enabled: !!(process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY)
    },
    deepl: {
      apiKey: process.env.NEXT_PUBLIC_DEEPL_API_KEY || process.env.DEEPL_API_KEY,
      enabled: !!(process.env.NEXT_PUBLIC_DEEPL_API_KEY || process.env.DEEPL_API_KEY)
    },
    azure: {
      translatorKey: process.env.NEXT_PUBLIC_AZURE_TRANSLATOR_KEY || process.env.AZURE_TRANSLATOR_KEY,
      region: process.env.NEXT_PUBLIC_AZURE_TRANSLATOR_REGION || 'global',
      enabled: !!(process.env.NEXT_PUBLIC_AZURE_TRANSLATOR_KEY || process.env.AZURE_TRANSLATOR_KEY)
    }
  }
}

/**
 * Get application configuration from environment variables
 */
export const getAppConfig = (): AppConfig => {
  return {
    api: {
      url: process.env.NEXT_PUBLIC_API_URL || '',
      timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000')
    },
    multilingual: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_MULTILINGUAL !== 'false',
      defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
      fallbackLanguage: process.env.NEXT_PUBLIC_FALLBACK_LANGUAGE || 'en',
      confidenceThreshold: parseFloat(process.env.NEXT_PUBLIC_LANGUAGE_DETECTION_CONFIDENCE_THRESHOLD || '0.7'),
      autoDetect: process.env.NEXT_PUBLIC_AUTO_DETECT_LANGUAGE !== 'false'
    },
    features: {
      voiceEnabled: process.env.NEXT_PUBLIC_ENABLE_VOICE !== 'false',
      translationEnabled: process.env.NEXT_PUBLIC_ENABLE_TRANSLATION !== 'false',
      realTimeTranslation: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_TRANSLATION === 'true',
      languageIndicator: process.env.NEXT_PUBLIC_SHOW_LANGUAGE_INDICATOR !== 'false'
    },
    security: {
      enableCors: process.env.NEXT_PUBLIC_ENABLE_CORS !== 'false',
      allowedOrigins: (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
      rateLimitEnabled: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMIT !== 'false'
    }
  }
}

/**
 * Validate required environment variables
 */
export const validateConfig = (): { valid: boolean; missing: string[]; warnings: string[] } => {
  const missing: string[] = []
  const warnings: string[] = []

  const aiConfig = getAIConfig()
  const voiceConfig = getVoiceConfig()
  const translationConfig = getTranslationConfig()
  const appConfig = getAppConfig()

  // Check if at least one AI service is configured
  const hasAIService = aiConfig.openai.enabled || aiConfig.anthropic.enabled ||
    aiConfig.gemini.enabled || aiConfig.cohere.enabled

  if (!hasAIService) {
    warnings.push('No AI service configured. At least one AI API key is recommended.')
  }

  // Check voice services if voice is enabled
  if (appConfig.features.voiceEnabled) {
    const hasVoiceService = voiceConfig.elevenlabs.enabled || voiceConfig.azure.enabled
    if (!hasVoiceService) {
      warnings.push('Voice features enabled but no voice service configured.')
    }
  }

  // Check translation services if translation is enabled
  if (appConfig.features.translationEnabled) {
    const hasTranslationService = translationConfig.googleTranslate.enabled ||
      translationConfig.deepl.enabled ||
      translationConfig.azure.enabled
    if (!hasTranslationService) {
      warnings.push('Translation features enabled but no translation service configured.')
    }
  }

  // Check API URL
  if (!appConfig.api.url || appConfig.api.url === 'http://localhost:3002') {
    warnings.push('Using default API URL. Consider setting NEXT_PUBLIC_API_URL for production.')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Get environment information for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    nextEnv: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  }
}

/**
 * Check if running in development mode
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in production mode
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production'
}

/**
 * Get the preferred AI provider based on available configuration
 */
export const getPreferredAIProvider = (): string => {
  const aiConfig = getAIConfig()

  // Priority order: OpenAI -> Anthropic -> Gemini -> Cohere
  if (aiConfig.openai.enabled) return 'openai'
  if (aiConfig.anthropic.enabled) return 'anthropic'
  if (aiConfig.gemini.enabled) return 'gemini'
  if (aiConfig.cohere.enabled) return 'cohere'

  // Fallback to OpenAI even if not configured (for demo mode)
  return 'openai'
}

/**
 * Get the preferred voice provider based on available configuration
 */
export const getPreferredVoiceProvider = (): string => {
  const voiceConfig = getVoiceConfig()

  // Priority order: ElevenLabs -> Azure
  if (voiceConfig.elevenlabs.enabled) return 'elevenlabs'
  if (voiceConfig.azure.enabled) return 'azure'

  // Fallback to browser built-in speech synthesis
  return 'browser'
}

/**
 * Get the preferred translation provider based on available configuration
 */
export const getPreferredTranslationProvider = (): string => {
  const translationConfig = getTranslationConfig()

  // Priority order: Google Translate -> DeepL -> Azure
  if (translationConfig.googleTranslate.enabled) return 'google'
  if (translationConfig.deepl.enabled) return 'deepl'
  if (translationConfig.azure.enabled) return 'azure'

  // Fallback to browser built-in (basic)
  return 'browser'
}