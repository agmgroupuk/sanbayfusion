// Language Detection and Translation Utilities
// Supports multiple detection methods and includes comprehensive language support

export interface DetectedLanguage {
  code: string
  name: string
  confidence: number
  nativeName: string
  flag: string
}

export interface LanguageConfig {
  [key: string]: {
    name: string
    nativeName: string
    flag: string
    voiceCode?: string // For TTS
  }
}

// Comprehensive language configuration
export const SUPPORTED_LANGUAGES: LanguageConfig = {
  'en': { name: 'English', nativeName: 'English', flag: '🇺🇸', voiceCode: 'en-US' },
  'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', voiceCode: 'es-ES' },
  'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷', voiceCode: 'fr-FR' },
  'de': { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', voiceCode: 'de-DE' },
  'it': { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', voiceCode: 'it-IT' },
  'pt': { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', voiceCode: 'pt-PT' },
  'ru': { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', voiceCode: 'ru-RU' },
  'ja': { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', voiceCode: 'ja-JP' },
  'ko': { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', voiceCode: 'ko-KR' },
  'zh': { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', voiceCode: 'zh-CN' },
  'ar': { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', voiceCode: 'ar-SA' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', voiceCode: 'hi-IN' },
  'th': { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', voiceCode: 'th-TH' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', voiceCode: 'vi-VN' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', voiceCode: 'tr-TR' },
  'pl': { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', voiceCode: 'pl-PL' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', voiceCode: 'nl-NL' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', voiceCode: 'sv-SE' },
  'da': { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', voiceCode: 'da-DK' },
  'no': { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', voiceCode: 'nb-NO' },
  'fi': { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', voiceCode: 'fi-FI' },
  'he': { name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', voiceCode: 'he-IL' },
  'cs': { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', voiceCode: 'cs-CZ' },
  'hu': { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', voiceCode: 'hu-HU' },
  'ro': { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', voiceCode: 'ro-RO' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', voiceCode: 'uk-UA' },
  'bg': { name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', voiceCode: 'bg-BG' },
  'hr': { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', voiceCode: 'hr-HR' },
  'sk': { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', voiceCode: 'sk-SK' },
  'sl': { name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', voiceCode: 'sl-SI' },
  'et': { name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', voiceCode: 'et-EE' },
  'lv': { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', voiceCode: 'lv-LV' },
  'lt': { name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', voiceCode: 'lt-LT' }
}

// Simple pattern-based language detection (fallback method)
const detectLanguageByPatterns = (text: string): DetectedLanguage | null => {
  const cleanText = text.toLowerCase().trim()

  // Common language patterns and keywords
  const patterns = [
    { code: 'es', patterns: ['hola', 'gracias', 'por favor', 'como estas', 'buenos dias', 'buenas tardes'], confidence: 0.8 },
    { code: 'fr', patterns: ['bonjour', 'merci', 's\'il vous plaît', 'comment allez-vous', 'bonsoir'], confidence: 0.8 },
    { code: 'de', patterns: ['hallo', 'danke', 'bitte', 'wie geht es', 'guten tag', 'guten morgen'], confidence: 0.8 },
    { code: 'it', patterns: ['ciao', 'grazie', 'prego', 'come stai', 'buongiorno', 'buonasera'], confidence: 0.8 },
    { code: 'pt', patterns: ['olá', 'obrigado', 'por favor', 'como está', 'bom dia', 'boa tarde'], confidence: 0.8 },
    { code: 'ru', patterns: ['привет', 'спасибо', 'пожалуйста', 'как дела', 'доброе утро'], confidence: 0.8 },
    { code: 'ja', patterns: ['こんにちは', 'ありがとう', 'すみません', 'おはよう', 'こんばんは'], confidence: 0.9 },
    { code: 'ko', patterns: ['안녕하세요', '감사합니다', '죄송합니다', '좋은 아침', '안녕'], confidence: 0.9 },
    { code: 'zh', patterns: ['你好', '谢谢', '对不起', '早上好', '晚上好', '请问'], confidence: 0.9 },
    { code: 'ar', patterns: ['مرحبا', 'شكرا', 'من فضلك', 'صباح الخير', 'مساء الخير'], confidence: 0.9 },
    { code: 'hi', patterns: ['नमस्ते', 'धन्यवाद', 'कृपया', 'सुप्रभात', 'शुभ संध्या'], confidence: 0.9 },
    { code: 'th', patterns: ['สวัสดี', 'ขอบคุณ', 'ขอโทษ', 'อรุณสวัสดิ์', 'สวัสดิตอนเย็น'], confidence: 0.9 }
  ]

  for (const pattern of patterns) {
    for (const keyword of pattern.patterns) {
      if (cleanText.includes(keyword)) {
        const lang = SUPPORTED_LANGUAGES[pattern.code]
        return {
          code: pattern.code,
          name: lang.name,
          nativeName: lang.nativeName,
          flag: lang.flag,
          confidence: pattern.confidence
        }
      }
    }
  }

  return null
}

// Configuration from environment variables
// ✅ SECURITY: No API keys in frontend - all calls go through secure backend
const getAPIConfig = () => {
  return {
    // ✅ REMOVED: API keys (now only on backend)
    // openaiApiKey, cohereApiKey, googleTranslateApiKey - NO LONGER EXPOSED
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    enableMultilingual: process.env.NEXT_PUBLIC_ENABLE_MULTILINGUAL !== 'false',
    confidenceThreshold: parseFloat(process.env.NEXT_PUBLIC_LANGUAGE_DETECTION_CONFIDENCE_THRESHOLD || '0.7'),
    defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
    fallbackLanguage: process.env.NEXT_PUBLIC_FALLBACK_LANGUAGE || 'en'
  }
}

// OpenAI-based language detection (primary method)
export const detectLanguageWithOpenAI = async (text: string): Promise<DetectedLanguage> => {
  const config = getAPIConfig()

  // Check if multilingual features are enabled
  if (!config.enableMultilingual) {
    return {
      code: config.defaultLanguage,
      name: SUPPORTED_LANGUAGES[config.defaultLanguage]?.name || 'English',
      nativeName: SUPPORTED_LANGUAGES[config.defaultLanguage]?.nativeName || 'English',
      flag: SUPPORTED_LANGUAGES[config.defaultLanguage]?.flag || '🇺🇸',
      confidence: 1.0
    }
  }

  try {
    // Try to call backend API for language detection if API key is available
    if (config.openaiApiKey || config.cohereApiKey) {
      const response = await callBackendLanguageDetection(text, config)
      if (response) return response
    }

    // Fallback to simulated detection for frontend demo
    const response = await simulateOpenAILanguageDetection(text)
    return response
  } catch (error) {
    console.warn('API language detection failed, falling back to pattern detection:', error)
    const fallback = detectLanguageByPatterns(text)
    if (fallback && fallback.confidence >= config.confidenceThreshold) {
      return fallback
    }

    // Default to configured fallback language
    const fallbackCode = config.fallbackLanguage
    return {
      code: fallbackCode,
      name: SUPPORTED_LANGUAGES[fallbackCode]?.name || 'English',
      nativeName: SUPPORTED_LANGUAGES[fallbackCode]?.nativeName || 'English',
      flag: SUPPORTED_LANGUAGES[fallbackCode]?.flag || '🇺🇸',
      confidence: 0.5
    }
  }
}

// Call backend API for language detection
const callBackendLanguageDetection = async (text: string, config: ReturnType<typeof getAPIConfig>): Promise<DetectedLanguage | null> => {
  try {
    const response = await fetch(`${config.apiUrl}/api/language-detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        preferredProvider: config.openaiApiKey ? 'openai' : config.cohereApiKey ? 'cohere' : 'google'
      })
    })

    if (!response.ok) {
      throw new Error(`Language detection API failed: ${response.status}`)
    }

    const result = await response.json()

    if (result.success && result.language) {
      const lang = SUPPORTED_LANGUAGES[result.language.code]
      if (lang) {
        return {
          code: result.language.code,
          name: lang.name,
          nativeName: lang.nativeName,
          flag: lang.flag,
          confidence: result.language.confidence || 0.8
        }
      }
    }

    return null
  } catch (error) {
    console.warn('Backend language detection failed:', error)
    return null
  }
}

// Simulated OpenAI language detection (for demo purposes)
const simulateOpenAILanguageDetection = async (text: string): Promise<DetectedLanguage> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200))

  // Try pattern detection first
  const patternResult = detectLanguageByPatterns(text)
  if (patternResult) {
    return patternResult
  }

  // Use character analysis for better detection
  const langCode = detectByCharacterAnalysis(text)
  const lang = SUPPORTED_LANGUAGES[langCode] || SUPPORTED_LANGUAGES['en']

  return {
    code: langCode,
    name: lang.name,
    nativeName: lang.nativeName,
    flag: lang.flag,
    confidence: 0.7
  }
}

// Character-based language detection
const detectByCharacterAnalysis = (text: string): string => {
  // Count different character types
  const counts = {
    latin: (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length,
    cyrillic: (text.match(/[а-яё]/gi) || []).length,
    arabic: (text.match(/[\u0600-\u06FF]/g) || []).length,
    chinese: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    japanese: (text.match(/[ひらがなカタカナ]/g) || []).length,
    korean: (text.match(/[가-힣]/g) || []).length,
    thai: (text.match(/[\u0E00-\u0E7F]/g) || []).length,
    hebrew: (text.match(/[\u0590-\u05FF]/g) || []).length,
    devanagari: (text.match(/[\u0900-\u097F]/g) || []).length
  }

  // Determine dominant script
  const maxCount = Math.max(...Object.values(counts))

  if (counts.chinese > 0) return 'zh'
  if (counts.japanese > 0) return 'ja'
  if (counts.korean > 0) return 'ko'
  if (counts.arabic > 0) return 'ar'
  if (counts.cyrillic > 0) return 'ru'
  if (counts.thai > 0) return 'th'
  if (counts.hebrew > 0) return 'he'
  if (counts.devanagari > 0) return 'hi'

  // For Latin scripts, default to English
  return 'en'
}

// Generate multilingual prompt for AI models
export const generateMultilingualPrompt = (detectedLanguage: DetectedLanguage, originalPrompt: string): string => {
  if (detectedLanguage.code === 'en') {
    return originalPrompt
  }

  const languageInstruction = `IMPORTANT: The user is communicating in ${detectedLanguage.name} (${detectedLanguage.nativeName}). You MUST respond in the same language - ${detectedLanguage.name}. Do not respond in English unless specifically asked to translate.`

  return `${languageInstruction}\n\n${originalPrompt}`
}

// Get language display info
export const getLanguageInfo = (code: string): DetectedLanguage => {
  const lang = SUPPORTED_LANGUAGES[code] || SUPPORTED_LANGUAGES['en']
  return {
    code,
    name: lang.name,
    nativeName: lang.nativeName,
    flag: lang.flag,
    confidence: 1.0
  }
}

// Check if language is supported
export const isLanguageSupported = (code: string): boolean => {
  return code in SUPPORTED_LANGUAGES
}

// Get popular languages for quick selection
export const getPopularLanguages = (): DetectedLanguage[] => {
  const popular = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi']
  return popular.map(code => getLanguageInfo(code))
}