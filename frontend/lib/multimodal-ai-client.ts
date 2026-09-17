/**
 * Frontend Multi-Modal AI Client
 * Easy-to-use interface for all AI capabilities
 */

// ============================================
// TYPES
// ============================================

export interface ChatOptions {
  provider?: 'openai' | 'anthropic' | 'gemini'
  model?: string
  temperature?: number
}

export interface EmbeddingOptions {
  provider?: 'openai' | 'gemini'
  model?: 'text-embedding-3-small' | 'text-embedding-3-large'
}

export interface ImageOptions {
  provider?: 'openai'
  model?: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export interface TranscribeOptions {
  provider?: 'openai'
  model?: 'whisper-1' | 'gpt-4o-mini-transcribe'
  language?: string
}

export interface SpeakOptions {
  provider?: 'openai'
  model?: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts' | 'gpt-4o-mini-tts-hd'
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
}

// ============================================
// MULTIMODAL AI CLIENT CLASS
// ============================================

export class MultiModalAIClient {
  private apiUrl: string

  constructor(apiUrl = '/api/multimodal') {
    this.apiUrl = apiUrl
  }

  // ============================================
  // 1. CHAT / REASONING
  // ============================================

  /**
   * Send chat message to AI with agent personality
   * @param message User message
   * @param agentId Agent ID for personality
   * @param options Chat configuration
   */
  async chat(
    message: string,
    agentId: string,
    options?: ChatOptions
  ): Promise<{
    text: string
    provider: string
    model: string
    tokensUsed?: number
    latency: number
  }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        message,
        agentId,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Chat request failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Quick chat with default settings
   */
  async quickChat(message: string, agentId: string): Promise<string> {
    const response = await this.chat(message, agentId)
    return response.text
  }

  // ============================================
  // 2. EMBEDDINGS
  // ============================================

  /**
   * Get embedding vector for text
   * @param text Text to embed
   * @param options Embedding configuration
   */
  async getEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<{
    embedding: number[]
    provider: string
    model: string
    dimensions: number
  }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'embedding',
        text,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Embedding request failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Get embeddings for multiple texts
   */
  async getBatchEmbeddings(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<Array<{
    embedding: number[]
    provider: string
    model: string
    dimensions: number
  }>> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'embedding',
        texts,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Batch embedding request failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Calculate similarity between two texts
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await this.getBatchEmbeddings([text1, text2])
    
    // Cosine similarity
    const dotProduct = embedding1.embedding.reduce(
      (sum, val, i) => sum + val * embedding2.embedding[i],
      0
    )
    
    const magnitude1 = Math.sqrt(
      embedding1.embedding.reduce((sum, val) => sum + val * val, 0)
    )
    
    const magnitude2 = Math.sqrt(
      embedding2.embedding.reduce((sum, val) => sum + val * val, 0)
    )
    
    return dotProduct / (magnitude1 * magnitude2)
  }

  // ============================================
  // 3. IMAGE GENERATION
  // ============================================

  /**
   * Generate image from text prompt
   * @param prompt Image description
   * @param options Image generation configuration
   */
  async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<{
    url?: string
    base64?: string
    provider: string
    model: string
    revisedPrompt?: string
  }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'image',
        prompt,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Image generation failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Generate image and return URL
   */
  async quickImage(prompt: string): Promise<string> {
    const response = await this.generateImage(prompt)
    return response.url || ''
  }

  // ============================================
  // 4. SPEECH-TO-TEXT
  // ============================================

  /**
   * Transcribe audio to text
   * @param audioBlob Audio file or blob
   * @param options Transcription configuration
   */
  async transcribe(
    audioBlob: Blob | File,
    options?: TranscribeOptions
  ): Promise<{
    text: string
    provider: string
    model: string
    language?: string
  }> {
    // Convert to base64
    const audioData = await this.blobToBase64(audioBlob)

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transcribe',
        audioData,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Transcription failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Quick transcribe audio to text string
   */
  async quickTranscribe(audioBlob: Blob | File): Promise<string> {
    const response = await this.transcribe(audioBlob)
    return response.text
  }

  // ============================================
  // 5. TEXT-TO-SPEECH
  // ============================================

  /**
   * Convert text to speech with agent's voice
   * @param text Text to speak
   * @param agentId Agent ID for voice selection
   * @param options TTS configuration
   */
  async speak(
    text: string,
    agentId: string,
    options?: SpeakOptions
  ): Promise<{
    audio: string
    provider: string
    model: string
    voice: string
  }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'speak',
        text,
        agentId,
        ...options
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'TTS failed')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Quick speak and return audio blob
   */
  async quickSpeak(text: string, agentId: string): Promise<Blob> {
    const response = await this.speak(text, agentId)
    const audioBuffer = this.base64ToArrayBuffer(response.audio)
    return new Blob([audioBuffer], { type: 'audio/mpeg' })
  }

  /**
   * Speak and play audio immediately
   */
  async speakAndPlay(text: string, agentId: string): Promise<void> {
    const audioBlob = await this.quickSpeak(text, agentId)
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    await audio.play()
  }

  // ============================================
  // COMBO FEATURES
  // ============================================

  /**
   * Voice-to-voice conversation
   * User speaks → Transcribe → Chat → Speak response
   */
  async voiceConversation(
    audioBlob: Blob | File,
    agentId: string
  ): Promise<{
    userText: string
    responseText: string
    responseAudio: Blob
  }> {
    // 1. Transcribe user audio
    const userText = await this.quickTranscribe(audioBlob)

    // 2. Get chat response
    const responseText = await this.quickChat(userText, agentId)

    // 3. Convert response to speech
    const responseAudio = await this.quickSpeak(responseText, agentId)

    return {
      userText,
      responseText,
      responseAudio
    }
  }

  /**
   * Image-based chat
   * Describe image → Generate → Chat about it
   */
  async imageChat(
    imagePrompt: string,
    chatMessage: string,
    agentId: string
  ): Promise<{
    imageUrl: string
    chatResponse: string
  }> {
    // 1. Generate image
    const imageUrl = await this.quickImage(imagePrompt)

    // 2. Chat about the image
    const chatResponse = await this.quickChat(
      `${chatMessage}\n\nContext: We just generated an image with prompt: "${imagePrompt}"`,
      agentId
    )

    return {
      imageUrl,
      chatResponse
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const multiModalAI = new MultiModalAIClient()

// ============================================
// REACT HOOKS (OPTIONAL)
// ============================================

import { useState, useCallback } from 'react'

export function useChat(agentId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chat = useCallback(async (message: string, options?: ChatOptions) => {
    setLoading(true)
    setError(null)
    try {
      return await multiModalAI.chat(message, agentId, options)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [agentId])

  return { chat, loading, error }
}

export function useTTS(agentId: string) {
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const speak = useCallback(async (text: string) => {
    setSpeaking(true)
    setError(null)
    try {
      await multiModalAI.speakAndPlay(text, agentId)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setSpeaking(false)
    }
  }, [agentId])

  return { speak, speaking, error }
}

export function useSTT() {
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribe = useCallback(async (audioBlob: Blob | File) => {
    setTranscribing(true)
    setError(null)
    try {
      return await multiModalAI.quickTranscribe(audioBlob)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setTranscribing(false)
    }
  }, [])

  return { transcribe, transcribing, error }
}
