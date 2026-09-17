/**
 * OpenAI Realtime Voice Service
 * Speech-to-speech like a phone call using WebSocket
 * Based on OpenAI's Realtime API
 */

import realtimeSessionService from '../services/realtimeSessionService';

// Realtime API events
export type RealtimeEvent =
  | 'session.created'
  | 'session.updated'
  | 'input_audio_buffer.append'
  | 'input_audio_buffer.commit'
  | 'input_audio_buffer.clear'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'input_audio_buffer.committed'
  | 'conversation.item.create'
  | 'conversation.item.created'
  | 'conversation.item.input_audio_transcription.completed'
  | 'response.create'
  | 'response.created'
  | 'response.output_item.added'
  | 'response.output_item.done'
  | 'response.content_part.added'
  | 'response.content_part.done'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.text.delta'
  | 'response.text.done'
  | 'response.done'
  | 'error';

export interface RealtimeVoiceConfig {
  voice?: 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';
  instructions?: string;
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;      // 0-1, default 0.5
    prefix_padding_ms?: number;  // default 300
    silence_duration_ms?: number; // default 500
  } | null;
  inputAudioTranscription?: {
    model: 'whisper-1';
  };
  temperature?: number;
  maxResponseOutputTokens?: number | 'inf';
}

export interface RealtimeCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onUserTranscript?: (transcript: string, isFinal: boolean) => void;
  onAgentTranscript?: (transcript: string, isFinal: boolean) => void;
  onAgentAudio?: (audioData: Int16Array) => void;
  onAgentStartSpeaking?: () => void;
  onAgentStopSpeaking?: () => void;
  onError?: (error: string) => void;
}

class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private callbacks: RealtimeCallbacks = {};
  private isConnected = false;
  private isResponseActive = false;
  private playbackQueue: Int16Array[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;

  /**
   * Start a realtime voice session
   */
  async connect(config: RealtimeVoiceConfig = {}): Promise<void> {
    try {
      // Get ephemeral token from backend
      const { client_secret } = await realtimeSessionService.create({ ...config } as Record<string, unknown>);

      // Connect to OpenAI Realtime API
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      this.ws = new WebSocket(wsUrl, [
        'realtime',
        `openai-insecure-api-key.${client_secret.value}`,
        'openai-beta.realtime-v1'
      ]);

      this.ws.onopen = () => {
        console.log('Realtime WebSocket connected');
        this.isConnected = true;
        this.sendSessionUpdate(config);
        this.callbacks.onConnected?.();
      };

      this.ws.onclose = () => {
        console.log('Realtime WebSocket disconnected');
        this.isConnected = false;
        this.callbacks.onDisconnected?.();
        this.cleanup();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.('Connection error');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      // Initialize audio
      await this.initializeAudio();

    } catch (error) {
      console.error('Failed to connect:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Connection failed');
      throw error;
    }
  }

  /**
   * Send session configuration update
   */
  private sendSessionUpdate(config: RealtimeVoiceConfig): void {
    if (!this.ws || !this.isConnected) return;

    const sessionConfig: any = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: config.voice || 'alloy',
        instructions: config.instructions ||
          'You are a helpful AI assistant. Be conversational and natural, like talking on a phone call. Keep responses concise but helpful.',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: config.turnDetection ?? {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700
        },
        input_audio_transcription: config.inputAudioTranscription ?? {
          model: 'whisper-1'
        },
        temperature: config.temperature ?? 0.8,
        max_response_output_tokens: config.maxResponseOutputTokens ?? 4096
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    const eventType = data.type as RealtimeEvent;

    switch (eventType) {
      case 'session.created':
      case 'session.updated':
        console.log('Session ready:', data);
        break;

      case 'input_audio_buffer.speech_started':
        this.callbacks.onSpeechStarted?.();
        // Interrupt any playing audio when user starts speaking
        this.interruptPlayback();
        break;

      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onSpeechStopped?.();
        break;

      case 'response.created':
        this.isResponseActive = true;
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.callbacks.onUserTranscript?.(data.transcript, true);
        break;

      case 'response.audio.delta':
        // Decode and queue audio for playback
        if (data.delta) {
          const audioData = this.decodeAudioDelta(data.delta);
          this.queueAudioPlayback(audioData);
        }
        break;

      case 'response.audio.done':
        // Audio response complete
        break;

      case 'response.audio_transcript.delta':
        this.callbacks.onAgentTranscript?.(data.delta, false);
        break;

      case 'response.audio_transcript.done':
        this.callbacks.onAgentTranscript?.(data.transcript, true);
        break;

      case 'response.output_item.added':
        this.isResponseActive = true;
        this.callbacks.onAgentStartSpeaking?.();
        break;

      case 'response.output_item.done':
      case 'response.done':
        this.isResponseActive = false;
        this.callbacks.onAgentStopSpeaking?.();
        break;

      case 'error':
        // Ignore harmless "no active response" errors from cancel attempts
        if (data.error?.code === 'response_cancel_not_active') {
          // This is expected when cancelling with no active response - ignore
          return;
        }
        console.error('Realtime API error:', data.error);
        this.callbacks.onError?.(data.error?.message || 'Unknown error');
        break;
    }
  }

  /**
   * Initialize audio capture and playback
   */
  private async initializeAudio(): Promise<void> {
    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000
      }
    });

    // Create audio context for capture (24kHz for OpenAI)
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Use ScriptProcessor to capture audio chunks
    // Buffer size 4096 at 24kHz = ~170ms chunks
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      // Ensure WebSocket is fully OPEN before sending
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to Int16
      const pcm16 = this.float32ToInt16(inputData);
      // Convert to base64
      const base64 = this.int16ToBase64(pcm16);

      // Send to OpenAI
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
      }));
    };

    this.audioSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Convert Float32Array to Int16Array
   */
  private float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  /**
   * Convert Int16Array to base64
   */
  private int16ToBase64(int16: Int16Array): string {
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }

  /**
   * Decode base64 audio delta to Int16Array
   */
  private decodeAudioDelta(base64: string): Int16Array {
    const binary = atob(base64);
    const uint8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8[i] = binary.charCodeAt(i);
    }
    return new Int16Array(uint8.buffer);
  }

  /**
   * Queue audio for seamless playback
   */
  private queueAudioPlayback(audioData: Int16Array): void {
    this.playbackQueue.push(audioData);
    this.callbacks.onAgentAudio?.(audioData);

    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  /**
   * Play queued audio chunks seamlessly
   */
  private async playNextChunk(): Promise<void> {
    if (!this.audioContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.playbackQueue.shift()!;

    // Convert Int16 to Float32 for Web Audio
    const float32 = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32[i] = audioData[i] / (audioData[i] < 0 ? 0x8000 : 0x7FFF);
    }

    // Create audio buffer
    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    // Create source and play
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Schedule playback for seamless audio
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    source.start(startTime);

    this.nextPlayTime = startTime + buffer.duration;
    this.currentSource = source;

    source.onended = () => {
      if (this.playbackQueue.length > 0) {
        this.playNextChunk();
      } else {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Interrupt current playback (when user starts speaking)
   */
  private interruptPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.playbackQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;

    // Only send response cancel if a response is actually active
    if (this.ws && this.isConnected && this.isResponseActive && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'response.cancel' }));
      this.isResponseActive = false;
    }
  }

  /**
   * Send a text message (for hybrid text/voice)
   */
  sendTextMessage(text: string): void {
    if (!this.ws || !this.isConnected) return;

    // Create conversation item
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }));

    // Request response
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.interruptPlayback();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isConnected = false;
  }
}

// Singleton instance
export const realtimeVoice = new RealtimeVoiceService();
export default realtimeVoice;
