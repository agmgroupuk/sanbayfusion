'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Square, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
  agent?: string;
  voice?: string;
  userId?: string;
  conversationId?: string;
  disabled?: boolean;
  className?: string;
}

interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  recordingTime: number;
  quotaRemaining: number;
  lastError: string | null;
  isListening: boolean;
  lastSuccessMessage: string | null;
  processingStage: 'idle' | 'transcribing' | 'generating' | 'complete';
}

interface AudioVisualizerProps {
  audioStream?: MediaStream;
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioStream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();

  useEffect(() => {
    if (!audioStream || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const red = Math.floor((i / bufferLength) * 255);
        const green = Math.floor(255 - ((i / bufferLength) * 255));
        const blue = 100;

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioStream, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`rounded-lg border ${isActive ? 'border-blue-400' : 'border-gray-300'}`}
    />
  );
};

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscription,
  onResponse,
  onError,
  agent = 'general',
  voice = 'alloy',
  userId = 'anonymous',
  conversationId,
  disabled = false,
  className = ''
}) => {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    isMuted: false,
    recordingTime: 0,
    quotaRemaining: 600, // 10 minutes default
    lastError: null,
    isListening: false,
    lastSuccessMessage: null,
    processingStage: 'idle'
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const checkQuota = useCallback(async () => {
    try {
      const response = await fetch(`/api/voice-to-voice?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        const agentQuota = data.quotaStatus[agent];
        if (agentQuota) {
          setState(prev => ({ ...prev, quotaRemaining: agentQuota.remaining }));
        }
      }
    } catch (error) {
      console.warn('Failed to check quota:', error);
    }
  }, [userId, agent, setState]);

  // Initialize audio element
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.addEventListener('ended', () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    });

    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Check quota on mount
  useEffect(() => {
    checkQuota();
  }, [agent, userId, checkQuota]);

  const startRecording = async () => {
    try {
      if (state.quotaRemaining <= 0) {
        onError?.('Daily quota exceeded for this agent');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        } 
      });
      
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };

      mediaRecorder.start(100); // Collect data every 100ms

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isListening: true,
        recordingTime: 0,
        lastError: null,
        lastSuccessMessage: null,
        processingStage: 'idle'
      }));

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMsg = 'Failed to access microphone. Please check your permissions.';
      onError?.(errorMsg);
      setState(prev => ({ 
        ...prev, 
        lastError: errorMsg,
        lastSuccessMessage: null,
        processingStage: 'idle'
      }));

      // Auto-clear error message after 8 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, lastError: null }));
      }, 8000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isListening: false,
        processingStage: 'transcribing'
      }));
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      const errorMsg = 'No audio recorded';
      onError?.(errorMsg);
      setState(prev => ({ 
        ...prev, 
        lastError: errorMsg,
        processingStage: 'idle'
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true,
      processingStage: 'transcribing'
    }));

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('agent', agent);
      formData.append('voice', voice);
      formData.append('userId', userId);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      // Update to generating stage
      setState(prev => ({ ...prev, processingStage: 'generating' }));

      // Send to voice-to-voice endpoint
      const response = await fetch('/api/voice-to-voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Extract metadata from headers
      const transcription = decodeURIComponent(response.headers.get('X-Transcription') || '');
      const responseText = decodeURIComponent(response.headers.get('X-Response') || '');
      const quotaRemaining = parseInt(response.headers.get('X-Quota-Remaining') || '0');

      // Update quota
      setState(prev => ({ ...prev, quotaRemaining }));

      // Notify callbacks
      if (transcription) {
        onTranscription?.(transcription);
      }
      if (responseText) {
        onResponse?.(responseText);
      }

      // Play audio response
      const audioBuffer = await response.arrayBuffer();
      const responseAudioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      
      setState(prev => ({ ...prev, processingStage: 'complete' }));

      if (audioElementRef.current && !state.isMuted) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }

      // Set success message
      const successMsg = transcription 
        ? `✓ Successfully processed: "${transcription.slice(0, 50)}${transcription.length > 50 ? '...' : ''}"`
        : '✓ Voice message processed successfully';
      
      setState(prev => ({ 
        ...prev, 
        lastSuccessMessage: successMsg,
        lastError: null
      }));

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, lastSuccessMessage: null }));
      }, 5000);

    } catch (error) {
      console.error('Voice processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Voice processing failed';
      onError?.(errorMessage);
      setState(prev => ({ 
        ...prev, 
        lastError: errorMessage,
        lastSuccessMessage: null,
        processingStage: 'idle'
      }));

      // Auto-clear error message after 8 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, lastError: null }));
      }, 8000);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const togglePlayback = () => {
    if (audioElementRef.current) {
      if (state.isPlaying) {
        audioElementRef.current.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
      } else {
        audioElementRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const toggleMute = () => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    if (audioElementRef.current) {
      audioElementRef.current.muted = !state.isMuted;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatQuota = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const clearMessages = () => {
    setState(prev => ({ 
      ...prev, 
      lastError: null,
      lastSuccessMessage: null
    }));
  };

  const getProcessingMessage = () => {
    switch (state.processingStage) {
      case 'transcribing':
        return '🎙️ Converting speech to text...';
      case 'generating':
        return '🤖 AI is thinking and preparing response...';
      case 'complete':
        return '✅ Response ready!';
      default:
        return 'Processing...';
    }
  };

  const getListeningIndicator = () => {
    if (state.isListening && state.isRecording) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
          <span className="text-sm font-medium">Listening...</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`voice-input-container ${className}`}>
      {/* Main Voice Controls */}
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border shadow-sm">
        
        {/* Recording Button */}
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          disabled={disabled || state.isProcessing || state.quotaRemaining <= 0}
          className={`
            relative p-4 rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-105
            ${state.isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50 ring-4 ring-red-200' 
              : state.isListening
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50 ring-4 ring-blue-200'
                : state.quotaRemaining <= 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''}
          `}
          title={
            state.isRecording 
              ? 'Click to stop recording' 
              : state.isProcessing 
                ? 'Processing your voice...' 
                : 'Click to start recording'
          }
        >
          {state.isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : state.isRecording ? (
            <Square className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          
          {/* Active recording pulse indicator */}
          {state.isRecording && (
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
          )}
        </button>

        {/* Status Display */}
        <div className="flex-1 min-w-0">
          {/* Listening Indicator */}
          {getListeningIndicator()}
          
          {/* Recording Timer */}
          {state.isRecording && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-lg font-mono text-red-600 font-bold">
                {formatTime(state.recordingTime)}
              </span>
              <span className="text-sm text-gray-500">Recording</span>
            </div>
          )}
          
          {/* Processing Status */}
          {state.isProcessing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">{getProcessingMessage()}</span>
            </div>
          )}
        </div>

        {/* Audio Visualizer */}
        {state.isRecording && (
          <AudioVisualizer 
            audioStream={audioStreamRef.current || undefined}
            isActive={state.isRecording}
          />
        )}

        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayback}
            disabled={!audioElementRef.current?.src}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            {state.isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quota Display */}
        <div className="text-sm text-gray-500">
          <span className="font-medium">Quota:</span> {formatQuota(state.quotaRemaining)}
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {/* Success Message */}
        {state.lastSuccessMessage && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-in slide-in-from-top duration-300">
            <span className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span>{state.lastSuccessMessage}</span>
            </span>
            <button
              onClick={clearMessages}
              className="text-green-500 hover:text-green-700 p-1 rounded"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {state.lastError && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-in slide-in-from-top duration-300">
            <span className="flex items-center space-x-2">
              <span className="text-red-500">❌</span>
              <span>{state.lastError}</span>
            </span>
            <button
              onClick={clearMessages}
              className="text-red-500 hover:text-red-700 p-1 rounded"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Quota Warning */}
        {state.quotaRemaining <= 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            <span className="flex items-center space-x-2">
              <span className="text-yellow-500">⚠️</span>
              <span>Daily quota exceeded for {agent}. Resets at midnight.</span>
            </span>
          </div>
        )}

        {/* Low Quota Warning */}
        {state.quotaRemaining > 0 && state.quotaRemaining <= 60 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
            <span className="flex items-center space-x-2">
              <span className="text-orange-500">⏰</span>
              <span>Low quota remaining: {formatQuota(state.quotaRemaining)}. Consider upgrading your plan.</span>
            </span>
          </div>
        )}
      </div>

      {/* Voice Tips */}
      {!state.isRecording && !state.isProcessing && !state.lastError && !state.lastSuccessMessage && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="text-sm text-blue-700">
            <span className="font-medium">💡 Pro Tips:</span>
            <ul className="mt-1 text-xs space-y-1 text-blue-600">
              <li>• Speak clearly and close to your microphone</li>
              <li>• Keep background noise to a minimum</li>
              <li>• Click the microphone button to start recording</li>
              <li>• Click again or wait for auto-stop to finish</li>
            </ul>
          </div>
        </div>
      )}

      {/* Voice Settings */}
      <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
        <span>Agent: {agent} • Voice: {voice} • User: {userId}</span>
        {(state.lastError || state.lastSuccessMessage) && (
          <button
            onClick={clearMessages}
            className="text-gray-400 hover:text-gray-600 text-xs underline"
          >
            Clear messages
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceInput;