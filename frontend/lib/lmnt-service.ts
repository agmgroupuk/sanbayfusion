/**
 * LMNT TTS SERVICE
 * =================
 * Ultra-fast, ultra-realistic voice synthesis using LMNT API
 * Perfect replacement for PlayHT with even better latency
 * 
 * Features:
 * - Sub-200ms latency for real-time conversations
 * - Emotional voice control
 * - Multiple voice styles
 * - Streaming support
 */

// ============================================
// TYPES
// ============================================

export interface LMNTVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style?: string;
  description?: string;
}

export interface LMNTConfig {
  voice: string;
  text: string;
  speed?: number;           // 0.25 - 2.0
  language?: string;        // default: 'en'
  format?: 'mp3' | 'wav';
  sample_rate?: number;     // 8000, 16000, 24000
}

export interface LMNTStreamCallbacks {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

// ============================================
// LMNT VOICE LIBRARY
// Curated voices for our 18 agents
// ============================================

export const LMNT_VOICES: Record<string, LMNTVoice> = {
  // Female Voices
  'lily': { id: 'lily', name: 'Lily', gender: 'female', style: 'warm', description: 'Warm and friendly' },
  'aurora': { id: 'aurora', name: 'Aurora', gender: 'female', style: 'expressive', description: 'Expressive and dramatic' },
  'zoe': { id: 'zoe', name: 'Zoe', gender: 'female', style: 'young', description: 'Young and energetic' },
  'nova': { id: 'nova', name: 'Nova', gender: 'female', style: 'professional', description: 'Professional and confident' },
  'stella': { id: 'stella', name: 'Stella', gender: 'female', style: 'mystical', description: 'Mystical and wise' },
  'mia': { id: 'mia', name: 'Mia', gender: 'female', style: 'caring', description: 'Caring and empathetic' },
  'sophia': { id: 'sophia', name: 'Sophia', gender: 'female', style: 'passionate', description: 'Passionate and creative' },
  
  // Male Voices
  'daniel': { id: 'daniel', name: 'Daniel', gender: 'male', style: 'wise', description: 'Wise and thoughtful' },
  'marcus': { id: 'marcus', name: 'Marcus', gender: 'male', style: 'cheerful', description: 'Cheerful and witty' },
  'ryan': { id: 'ryan', name: 'Ryan', gender: 'male', style: 'energetic', description: 'Energetic and motivational' },
  'alex': { id: 'alex', name: 'Alex', gender: 'male', style: 'helpful', description: 'Helpful and knowledgeable' },
  'oliver': { id: 'oliver', name: 'Oliver', gender: 'male', style: 'calm', description: 'Calm and analytical' },
  'james': { id: 'james', name: 'James', gender: 'male', style: 'strategic', description: 'Strategic and sophisticated' },
  'max': { id: 'max', name: 'Max', gender: 'male', style: 'lazy', description: 'Laid-back and relaxed' },
  'charlie': { id: 'charlie', name: 'Charlie', gender: 'male', style: 'playful', description: 'Playful and punny' },
  'leo': { id: 'leo', name: 'Leo', gender: 'male', style: 'adventurous', description: 'Adventurous and enthusiastic' },
  'sam': { id: 'sam', name: 'Sam', gender: 'male', style: 'retro', description: 'Nostalgic and playful' },
  'william': { id: 'william', name: 'William', gender: 'male', style: 'educational', description: 'Patient and educational' },
};

// Agent to LMNT Voice mapping
export const AGENT_LMNT_VOICES: Record<string, string> = {
  'julie-girlfriend': 'lily',
  'drama-queen': 'aurora',
  'emma-emotional': 'mia',
  'mrs-boss': 'nova',
  'einstein': 'daniel',
  'comedy-king': 'marcus',
  'fitness-guru': 'ryan',
  'tech-wizard': 'alex',
  'chef-biew': 'sophia',
  'nid-gaming': 'zoe',
  'lazy-pawn': 'max',
  'knight-logic': 'oliver',
  'bishop-burger': 'james',
  'rook-jokey': 'charlie',
  'professor-astrology': 'stella',
  'travel-buddy': 'leo',
  'ben-sega': 'sam',
  'chess-player': 'william'
};

// ============================================
// LMNT SERVICE
// ============================================

class LMNTService {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;

  /**
   * Synthesize speech using LMNT (via backend proxy)
   */
  async synthesize(config: LMNTConfig): Promise<ArrayBuffer> {
    const response = await fetch('/api/tts/lmnt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LMNT synthesis failed: ${error}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Synthesize and play immediately
   */
  async speak(text: string, voiceId: string, speed: number = 1.0): Promise<void> {
    const audioData = await this.synthesize({
      voice: voiceId,
      text,
      speed,
      format: 'mp3',
      sample_rate: 24000
    });

    await this.playAudio(audioData);
  }

  /**
   * Speak for a specific agent
   */
  async speakAsAgent(agentId: string, text: string): Promise<void> {
    const voiceId = AGENT_LMNT_VOICES[agentId] || 'lily';
    await this.speak(text, voiceId);
  }

  /**
   * Stream synthesis for real-time playback
   */
  async streamSynthesize(
    config: LMNTConfig,
    callbacks: LMNTStreamCallbacks
  ): Promise<void> {
    try {
      const response = await fetch('/api/tts/lmnt/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        callbacks.onAudioChunk(value.buffer);
      }

      callbacks.onComplete();
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Stream error');
    }
  }

  /**
   * Play audio buffer
   */
  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();

    return new Promise((resolve) => {
      source.onended = () => resolve();
    });
  }

  /**
   * Queue and play audio seamlessly
   */
  async queueAndPlay(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
    this.audioQueue.push(audioBuffer);

    if (!this.isPlaying) {
      this.playQueue();
    }
  }

  private async playQueue(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();

    source.onended = () => {
      this.playQueue();
    };
  }

  /**
   * Stop all playback
   */
  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Get voice info for an agent
   */
  getVoiceForAgent(agentId: string): LMNTVoice | null {
    const voiceId = AGENT_LMNT_VOICES[agentId];
    return voiceId ? LMNT_VOICES[voiceId] : null;
  }
}

// ============================================
// EXPORTS
// ============================================

export const lmntService = new LMNTService();
export default lmntService;
