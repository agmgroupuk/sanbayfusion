'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { realtimeVoice, RealtimeVoiceConfig, RealtimeCallbacks } from '@/lib/openai-realtime-voice';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  agentName?: string;
  agentAvatar?: string;
  voice?: 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';
  onSaveTranscript?: (transcript: { role: 'user' | 'agent'; text: string }[]) => void;
}

// Agent voice mapping based on gender/personality/character
const AGENT_VOICE_MAP: Record<string, 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse'> = {
  'julie-girlfriend': 'shimmer',
  'drama-queen': 'coral',
  'emma-emotional': 'shimmer',
  'mrs-boss': 'sage',
  'chef-biew': 'shimmer',
  'nid-gaming': 'coral',
  'professor-astrology': 'sage',
  'einstein': 'echo',
  'comedy-king': 'verse',
  'fitness-guru': 'ballad',
  'tech-wizard': 'echo',
  'lazy-pawn': 'ash',
  'knight-logic': 'echo',
  'bishop-burger': 'sage',
  'rook-jokey': 'verse',
  'travel-buddy': 'verse',
  'ben-sega': 'echo',
  'chess-player': 'echo',
};

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  agentId,
  agentName = 'AI Assistant',
  agentAvatar,
  voice = 'alloy',
  onSaveTranscript
}) => {
  const agentVoice = agentId ? (AGENT_VOICE_MAP[agentId] || voice) : voice;

  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAgentText, setCurrentAgentText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, currentUserText, currentAgentText]);

  useEffect(() => {
    if (callState === 'active') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = useCallback(async () => {
    setCallState('connecting');
    setErrorMessage('');
    setCallDuration(0);
    setTranscript([]);
    setCurrentUserText('');
    setCurrentAgentText('');

    const callbacks: RealtimeCallbacks = {
      onConnected: () => setCallState('active'),
      onDisconnected: () => setCallState('idle'),
      onSpeechStarted: () => {
        setIsUserSpeaking(true);
        if (currentAgentText) {
          setTranscript(prev => [...prev, { role: 'agent', text: currentAgentText }]);
          setCurrentAgentText('');
        }
      },
      onSpeechStopped: () => setIsUserSpeaking(false),
      onUserTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(prev => [...prev, { role: 'user', text }]);
          setCurrentUserText('');
        } else {
          setCurrentUserText(text);
        }
      },
      onAgentTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(prev => [...prev, { role: 'agent', text }]);
          setCurrentAgentText('');
        } else {
          setCurrentAgentText(prev => prev + text);
        }
      },
      onAgentStartSpeaking: () => setIsAgentSpeaking(true),
      onAgentStopSpeaking: () => setIsAgentSpeaking(false),
      onError: (error) => {
        console.error('Voice call error:', error);
        setErrorMessage(error);
        setCallState('error');
      }
    };

    realtimeVoice.setCallbacks(callbacks);

    const config: RealtimeVoiceConfig = {
      voice: agentVoice,
      turnDetection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600 },
      inputAudioTranscription: { model: 'whisper-1' },
      temperature: 0.8
    };

    try {
      await realtimeVoice.connect(config);
    } catch (error) {
      console.error('Failed to start call:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect');
      setCallState('error');
    }
  }, [agentVoice, agentName, currentAgentText]);

  const endCall = useCallback(() => {
    realtimeVoice.disconnect();
    setCallState('idle');
    setIsUserSpeaking(false);
    setIsAgentSpeaking(false);
  }, []);

  const handleClose = useCallback(() => {
    if (callState === 'active' || callState === 'connecting') endCall();
    // Save transcript to chat before closing
    if (onSaveTranscript && transcript.length > 0) {
      onSaveTranscript(transcript);
    }
    onClose();
  }, [callState, endCall, onClose, onSaveTranscript, transcript]);

  if (!isOpen) return null;

  // Audio Wave Animation Component
  const AudioWave = ({ active, color }: { active: boolean; color: string }) => (
    <div className="flex items-center justify-center gap-1 h-16">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-150"
          style={{
            backgroundColor: color,
            height: active ? `${Math.random() * 40 + 10}px` : '8px',
            opacity: active ? 1 : 0.3,
            animationDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Background Gradient Layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

      {/* Animated Background Circles */}
      {isAgentSpeaking && (
        <>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/5 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
        </>
      )}

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors z-10"
        title="Back to Chat"
      >
        <X size={24} className="text-white/80" />
      </button>

      {/* Main Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">

        {/* Call Status */}
        <div className="text-center mb-2">
          {callState === 'idle' && <p className="text-white/40 text-sm tracking-wide">TAP TO CALL</p>}
          {callState === 'connecting' && <p className="text-yellow-400 text-sm tracking-wide animate-pulse">CONNECTING...</p>}
          {callState === 'active' && <p className="text-green-400 text-sm tracking-wide">CONNECTED</p>}
          {callState === 'error' && <p className="text-red-400 text-sm tracking-wide">CONNECTION FAILED</p>}
        </div>

        {/* Agent Avatar */}
        <div className="relative mb-4">
          {/* Outer Ring Animation */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isAgentSpeaking ? 'scale-125 opacity-100' : 'scale-100 opacity-0'
            }`}>
            <div className="w-full h-full rounded-full border-2 border-purple-400/30 animate-pulse" />
          </div>
          <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isAgentSpeaking ? 'scale-150 opacity-100' : 'scale-100 opacity-0'
            }`}>
            <div className="w-full h-full rounded-full border border-purple-400/20" />
          </div>

          {/* Avatar */}
          <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-300 ${isAgentSpeaking ? 'scale-110' : ''
            }`}>
            {agentAvatar ? (
              <img src={agentAvatar} alt={agentName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <img src="/images/logos/company-logo.png" alt="Maula AI" className="w-16 h-16 object-contain" />
            )}
          </div>
        </div>

        {/* Agent Name & Duration */}
        <h2 className="text-2xl font-bold text-white mb-1">{agentName}</h2>
        {callState === 'active' && (
          <p className="text-lg text-green-400 font-mono mb-6">{formatDuration(callDuration)}</p>
        )}
        {callState !== 'active' && <div className="h-8" />}

        {/* Audio Visualization */}
        {callState === 'active' && (
          <div className="mb-8">
            <AudioWave active={isAgentSpeaking || isUserSpeaking} color={isUserSpeaking ? '#22c55e' : '#a855f7'} />
            <p className="text-center text-white/40 text-xs mt-2">
              {isUserSpeaking ? 'You are speaking...' : isAgentSpeaking ? `${agentName} is speaking...` : 'Listening...'}
            </p>
          </div>
        )}

        {/* Live Transcript Toggle */}
        {callState === 'active' && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${showTranscript ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
          >
            <MessageSquare size={16} />
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>
        )}

        {/* Transcript Panel */}
        {showTranscript && callState === 'active' && (
          <div
            ref={transcriptRef}
            className="w-full max-w-md h-48 mb-6 overflow-y-auto bg-black/50 backdrop-blur-sm rounded-2xl p-4 space-y-3 border border-white/5"
          >
            {transcript.length === 0 && !currentUserText && !currentAgentText ? (
              <p className="text-white/30 text-center text-sm">Conversation will appear here...</p>
            ) : (
              <>
                {transcript.map((t, i) => (
                  <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${t.role === 'user'
                      ? 'bg-green-500/20 text-green-200 rounded-br-sm'
                      : 'bg-purple-500/20 text-purple-200 rounded-bl-sm'
                      }`}>
                      {t.text}
                    </div>
                  </div>
                ))}
                {currentUserText && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm bg-green-500/10 text-green-300/70 text-sm italic">
                      {currentUserText}...
                    </div>
                  </div>
                )}
                {currentAgentText && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm bg-purple-500/10 text-purple-300/70 text-sm italic">
                      {currentAgentText}...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Error Message */}
        {callState === 'error' && errorMessage && (
          <p className="text-red-400 text-sm mb-6">{errorMessage}</p>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-8">
          {/* Mute Button */}
          {callState === 'active' && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-5 rounded-full transition-all ${isMuted
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
          )}

          {/* Main Call Button */}
          {callState === 'idle' || callState === 'error' ? (
            <button
              onClick={startCall}
              className="p-8 rounded-full bg-green-500 hover:bg-green-400 text-white shadow-2xl shadow-green-500/40 transition-all hover:scale-105 active:scale-95"
            >
              <Phone size={40} />
            </button>
          ) : callState === 'connecting' ? (
            <button
              disabled
              className="p-8 rounded-full bg-yellow-500/80 text-white shadow-2xl shadow-yellow-500/30"
            >
              <Loader2 size={40} className="animate-spin" />
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="p-8 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-2xl shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff size={40} />
            </button>
          )}

          {/* Speaker Button */}
          {callState === 'active' && (
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-5 rounded-full transition-all ${!isSpeakerOn
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              {isSpeakerOn ? <Volume2 size={28} /> : <VolumeX size={28} />}
            </button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-white/30 text-xs mt-8 text-center max-w-xs">
          {callState === 'idle' && 'Tap the green button to start your voice conversation'}
          {callState === 'active' && 'Speak naturally — AI will respond when you pause'}
        </p>

        {/* Back to Chat Button — visible on idle, error, and active states */}
        <button
          onClick={handleClose}
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/70 hover:text-white text-sm font-medium transition-all"
        >
          <MessageSquare size={16} />
          Back to Chat
        </button>
      </div>
    </div>
  );
};

export default VoiceCallModal;
