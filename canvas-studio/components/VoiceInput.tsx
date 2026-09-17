/**
 * VoiceInput - Voice-to-text input for code generation
 * Uses Web Speech API with fallback to backend transcription
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, X } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
  placeholder?: string;
}

// Check for browser support
const SpeechRecognition = 
  typeof window !== 'undefined' 
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
    : null;

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onClose,
  isProcessing = false,
  placeholder = 'Click to speak...',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      stopVolumeAnalysis();
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      stopVolumeAnalysis();
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied');
      } else if (event.error === 'no-speech') {
        setError('No speech detected');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVolumeAnalysis();
    };
  }, [onTranscript]);

  // Volume visualization
  const startVolumeAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setVolume(average / 255);
        
        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error('Failed to start volume analysis:', err);
    }
  };

  const stopVolumeAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVolume(0);
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
        await startVolumeAnalysis();
      } catch (err) {
        setError('Failed to start voice input');
      }
    }
  };

  // Visual pulse based on volume
  const pulseScale = 1 + volume * 0.3;
  const pulseOpacity = 0.3 + volume * 0.7;

  const handleUseTranscript = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-canvas-card rounded-3xl shadow-2xl p-8 w-full max-w-md relative border border-cyan-900/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-cyan-500/10 rounded-xl transition-colors"
        >
          <X className="w-5 h-5 text-canvas-muted-deep" />
        </button>

        <h2 className="text-xl font-bold text-gray-200 mb-2">Voice Input</h2>
        <p className="text-sm text-canvas-muted-deep mb-8">Speak your app idea and we'll convert it to code</p>

        <div className="flex flex-col items-center">
          {/* Main button */}
          <button
            onClick={toggleListening}
            disabled={isProcessing || !SpeechRecognition}
            className={`relative p-6 rounded-full transition-all ${
              isListening
                ? 'bg-primary-500 hover:bg-primary-600'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600'
            } ${!SpeechRecognition ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Pulse effect */}
            {isListening && (
              <div
                className="absolute inset-0 rounded-full bg-primary-500"
                style={{
                  transform: `scale(${pulseScale})`,
                  opacity: pulseOpacity * 0.5,
                  transition: 'transform 0.1s, opacity 0.1s',
                }}
              />
            )}
            
            {/* Icon */}
            <div className="relative z-10">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : isListening ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </div>
          </button>

          {/* Status text */}
          <div className="mt-4 text-center">
            {error ? (
              <p className="text-sm text-primary-400">{error}</p>
            ) : isListening ? (
              <div className="flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 text-primary-400 animate-pulse" />
                <p className="text-sm text-primary-400 font-medium">Listening...</p>
              </div>
            ) : (
              <p className="text-sm text-canvas-muted-deep">{placeholder}</p>
            )}
          </div>

          {/* Transcript preview */}
          {transcript && (
            <div className="mt-6 w-full">
              <div className="p-4 bg-canvas-card rounded-2xl border border-cyan-900/30">
                <p className="text-sm text-canvas-text">{transcript}</p>
              </div>
              <button
                onClick={handleUseTranscript}
                className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all"
              >
                Use This Prompt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
