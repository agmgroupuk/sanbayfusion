/**
 * ========================================
 * MULTI-MODAL AI AGENT HELPER
 * ========================================
 * 
 * Complete helper library for ALL OpenAI capabilities:
 * 🧠 Chat/Reasoning
 * 🧩 Embeddings
 * 🎨 Image Generation
 * 🗣️ Speech-to-Text
 * 🗣️ Text-to-Speech
 * 💻 Code Generation
 * ========================================
 */

const API_BASE_URL = ''

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: 'gpt-5' | 'gpt-4o' | 'gpt-4o-mini'
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stream?: boolean
  imageUrl?: string // For image understanding
  systemPrompt?: string
}

export interface EmbeddingOptions {
  embeddingModel?: 'text-embedding-3-small' | 'text-embedding-3-large'
}

export interface ImageOptions {
  imageModel?: 'dall-e-3' | 'dall-e-2'
  numberOfImages?: number
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export interface TranscriptionOptions {
  transcribeModel?: 'whisper-1' | 'gpt-4o-mini-transcribe'
  language?: string
  prompt?: string
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt'
  temperature?: number
}

export interface TTSOptions {
  ttsModel?: 'tts-1' | 'tts-1-hd'
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
}

// ========================================
// 1. 🧠 CHAT / REASONING
// ========================================

/**
 * Send chat message to agent with full reasoning capabilities
 */
export async function sendChatMessage(
  agentId: string,
  message: string,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = {}
): Promise<{ response: string; usage?: any }> {
  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      agentId,
      message,
      conversationHistory,
      model: options.model || 'gpt-4o-mini',
      options
    })
  })

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Send chat with image understanding
 */
export async function sendChatWithImage(
  agentId: string,
  message: string,
  imageUrl: string,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = {}
): Promise<{ response: string; usage?: any }> {
  return sendChatMessage(agentId, message, conversationHistory, {
    ...options,
    imageUrl,
    model: 'gpt-4o' // Only gpt-4o supports image understanding
  })
}

/**
 * Stream chat responses in real-time
 */
export async function* streamChatMessage(
  agentId: string,
  message: string,
  conversationHistory: ChatMessage[] = [],
  options: ChatOptions = {}
): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      agentId,
      message,
      conversationHistory,
      model: options.model || 'gpt-4o-mini',
      options: { ...options, stream: true }
    })
  })

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed: ${response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            yield parsed.content
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

// ========================================
// 2. 🧩 EMBEDDINGS
// ========================================

/**
 * Generate embedding vector for semantic search/similarity
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<{ embedding: number[]; dimensions: number; usage?: any }> {
  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'embed',
      text,
      options
    })
  })

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// ========================================
// 3. 🎨 IMAGE GENERATION
// ========================================

/**
 * Generate image from text prompt
 */
export async function generateImage(
  prompt: string,
  options: ImageOptions = {}
): Promise<{ images: Array<{ url: string; revisedPrompt?: string }> }> {
  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'image',
      imagePrompt: prompt,
      options
    })
  })

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.statusText}`)
  }

  return await response.json()
}

// ========================================
// 4. 🗣️ SPEECH-TO-TEXT
// ========================================

/**
 * Convert audio to text (transcription)
 */
export async function transcribeAudio(
  audioFile: File,
  options: TranscriptionOptions = {}
): Promise<{ text: string; model: string }> {
  // Convert file to base64
  const arrayBuffer = await audioFile.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'transcribe',
      audioData: base64,
      options
    })
  })

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Record audio and transcribe in real-time
 */
export async function recordAndTranscribe(
  options: TranscriptionOptions = {}
): Promise<string> {
  // Check if browser supports MediaRecorder
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser does not support audio recording')
  }

  // Get microphone permission
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)
  const chunks: Blob[] = []

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' })
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

      try {
        const result = await transcribeAudio(audioFile, options)
        stream.getTracks().forEach(track => track.stop())
        resolve(result.text)
      } catch (error) {
        stream.getTracks().forEach(track => track.stop())
        reject(error)
      }
    }

    mediaRecorder.start()

    // Auto-stop after 30 seconds or user can call mediaRecorder.stop() manually
    setTimeout(() => mediaRecorder.stop(), 30000)
  })
}

// ========================================
// 5. 🗣️ TEXT-TO-SPEECH
// ========================================

/**
 * Convert text to speech audio
 */
export async function textToSpeech(
  agentId: string,
  text: string,
  options: TTSOptions = {}
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/agents/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'speak',
      agentId,
      text,
      options
    })
  })

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.statusText}`)
  }

  return await response.blob()
}

/**
 * Convert text to speech and play immediately
 */
export async function speakText(
  agentId: string,
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  const audioBlob = await textToSpeech(agentId, text, options)
  const audioUrl = URL.createObjectURL(audioBlob)
  const audio = new Audio(audioUrl)

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl)
      reject(new Error('Audio playback failed'))
    }
    audio.play()
  })
}

// ========================================
// 6. 💻 COMBINED WORKFLOWS
// ========================================

/**
 * Voice conversation: User speaks → AI responds with voice
 */
export async function voiceConversation(
  agentId: string,
  options: {
    transcriptionOptions?: TranscriptionOptions
    chatOptions?: ChatOptions
    ttsOptions?: TTSOptions
  } = {}
): Promise<{ userText: string; aiText: string; audioUrl: string }> {
  // 1. Record and transcribe user's voice
  const userText = await recordAndTranscribe(options.transcriptionOptions)

  // 2. Get AI response
  const { response: aiText } = await sendChatMessage(
    agentId,
    userText,
    [],
    options.chatOptions
  )

  // 3. Convert AI response to speech
  const audioBlob = await textToSpeech(agentId, aiText, options.ttsOptions)
  const audioUrl = URL.createObjectURL(audioBlob)

  // 4. Play audio
  const audio = new Audio(audioUrl)
  audio.play()

  return { userText, aiText, audioUrl }
}

/**
 * Image + Chat: Generate image and describe it
 */
export async function generateAndDescribeImage(
  agentId: string,
  imagePrompt: string,
  descriptionPrompt: string = 'Describe this image in detail',
  options: {
    imageOptions?: ImageOptions
    chatOptions?: ChatOptions
  } = {}
): Promise<{ imageUrl: string; description: string }> {
  // 1. Generate image
  const { images } = await generateImage(imagePrompt, options.imageOptions)
  const imageUrl = images[0].url

  // 2. Get AI to describe the image
  const { response: description } = await sendChatWithImage(
    agentId,
    descriptionPrompt,
    imageUrl,
    [],
    options.chatOptions
  )

  return { imageUrl, description }
}

// ========================================
// REACT HOOKS
// ========================================

import { useState, useCallback } from 'react'

/**
 * React hook for multi-modal agent interaction
 */
export function useMultiModalAgent(agentId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const chat = useCallback(async (message: string, options?: ChatOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await sendChatMessage(agentId, message, messages, options)
      setMessages(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: result.response }
      ])
      return result.response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [agentId, messages])

  const generateImage = useCallback(async (prompt: string, options?: ImageOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      return await generateImage(prompt, options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image generation failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      await speakText(agentId, text, options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TTS failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  const transcribe = useCallback(async (audioFile: File, options?: TranscriptionOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await transcribeAudio(audioFile, options)
      return result.text
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    chat,
    generateImage,
    speak,
    transcribe,
    reset
  }
}
