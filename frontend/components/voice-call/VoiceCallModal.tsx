'use client';

/**
 * VOICE CALL MODAL
 * ================
 * Beautiful full-screen voice call interface for talking with AI agents
 * 
 * Features:
 * - Agent avatar with speaking animation
 * - Real-time audio waveform visualization
 * - Emotion indicator
 * - Call controls (mute, end call)
 * - Transcript display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  agentColor?: string;
  onStartCall: () => Promise<void>;
  onEndCall: () => void;
  onMuteToggle: (muted: boolean) => void;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

type CallState = 'connecting' | 'connected' | 'speaking' | 'listening' | 'ended';

// ============================================
// AUDIO VISUALIZER COMPONENT
// ============================================

const AudioVisualizer: React.FC<{
  isActive: boolean;
  color: string;
  type: 'user' | 'agent';
}> = ({ isActive, color, type }) => {
  const bars = type === 'user' ? 12 : 16;
  
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: type === 'user' ? '3px' : '4px',
            backgroundColor: color,
          }}
          animate={{
            height: isActive 
              ? [8, Math.random() * 40 + 20, 8] 
              : [8, 12, 8],
            opacity: isActive ? 1 : 0.3,
          }}
          transition={{
            duration: isActive ? 0.3 + Math.random() * 0.2 : 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// EMOTION BADGE COMPONENT
// ============================================

const EmotionBadge: React.FC<{ emotion: string }> = ({ emotion }) => {
  const emotionConfig: Record<string, { emoji: string; color: string }> = {
    happy: { emoji: '😊', color: 'bg-yellow-500/20 text-yellow-400' },
    sad: { emoji: '😢', color: 'bg-blue-500/20 text-blue-400' },
    excited: { emoji: '🎉', color: 'bg-pink-500/20 text-pink-400' },
    calm: { emoji: '😌', color: 'bg-green-500/20 text-green-400' },
    romantic: { emoji: '❤️', color: 'bg-red-500/20 text-red-400' },
    thinking: { emoji: '🤔', color: 'bg-purple-500/20 text-purple-400' },
    curious: { emoji: '🧐', color: 'bg-indigo-500/20 text-indigo-400' },
    playful: { emoji: '😜', color: 'bg-orange-500/20 text-orange-400' },
    neutral: { emoji: '😐', color: 'bg-gray-500/20 text-gray-400' },
  };

  const config = emotionConfig[emotion] || emotionConfig.neutral;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
    >
      {config.emoji} {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  agentId,
  agentName,
  agentAvatar,
  agentColor = '#8B5CF6',
  onStartCall,
  onEndCall,
  onMuteToggle,
}) => {
  const [callState, setCallState] = useState<CallState>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Start call when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallState('connecting');
      setCallDuration(0);
      setTranscript([]);
      
      onStartCall()
        .then(() => {
          setCallState('connected');
          // Start duration timer
          timerRef.current = setInterval(() => {
            setCallDuration(d => d + 1);
          }, 1000);
        })
        .catch((error) => {
          console.error('Failed to start call:', error);
          setCallState('ended');
        });
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, onStartCall]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMuteToggle(newMuted);
  }, [isMuted, onMuteToggle]);

  // Handle end call
  const handleEndCall = useCallback(() => {
    setCallState('ended');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onEndCall();
    setTimeout(onClose, 1000);
  }, [onEndCall, onClose]);

  // Add transcript message (exposed via ref or context in real implementation)
  const addTranscriptMessage = useCallback((role: 'user' | 'agent', text: string) => {
    setTranscript(prev => [...prev, {
      id: Date.now().toString(),
      role,
      text,
      timestamp: new Date(),
    }]);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Simulate speaking/listening states (replace with real audio detection)
  useEffect(() => {
    if (callState === 'connected') {
      const interval = setInterval(() => {
        setCallState(prev => 
          prev === 'speaking' ? 'listening' : 
          prev === 'listening' ? 'speaking' : 'listening'
        );
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${agentColor}20 0%, #0a0a0f 50%, ${agentColor}10 100%)`,
          }}
        >
          {/* Background glow */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${agentColor}30 0%, transparent 50%)`,
            }}
          />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-8">
            
            {/* Call status */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8"
            >
              <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'connected' && 'In Call'}
                {callState === 'speaking' && `${agentName} is speaking`}
                {callState === 'listening' && 'Listening to you'}
                {callState === 'ended' && 'Call Ended'}
              </p>
              <p className="text-white text-lg font-medium">
                {formatDuration(callDuration)}
              </p>
            </motion.div>

            {/* Agent Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="relative mb-8"
            >
              {/* Animated ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ 
                  border: `3px solid ${agentColor}`,
                  boxShadow: `0 0 30px ${agentColor}50`,
                }}
                animate={{
                  scale: callState === 'speaking' ? [1, 1.1, 1] : 1,
                  opacity: callState === 'speaking' ? [0.5, 1, 0.5] : 0.5,
                }}
                transition={{
                  duration: 1,
                  repeat: callState === 'speaking' ? Infinity : 0,
                }}
              />
              
              {/* Avatar */}
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden"
                style={{ 
                  boxShadow: `0 0 40px ${agentColor}30`,
                }}
              >
                {agentAvatar ? (
                  <img 
                    src={agentAvatar} 
                    alt={agentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">
                    {agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Agent Name */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-white text-2xl font-bold mb-2"
            >
              {agentName}
            </motion.h2>

            {/* Emotion Badge */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <EmotionBadge emotion={currentEmotion} />
            </motion.div>

            {/* Audio Visualizer - Agent */}
            {callState !== 'connecting' && callState !== 'ended' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-8"
              >
                <AudioVisualizer 
                  isActive={callState === 'speaking'} 
                  color={agentColor}
                  type="agent"
                />
              </motion.div>
            )}

            {/* Connection animation */}
            {callState === 'connecting' && (
              <motion.div
                className="flex gap-2 mb-8"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: agentColor }}
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* User speaking indicator */}
            {callState === 'listening' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <p className="text-gray-400 text-sm mb-2">You're speaking</p>
                <AudioVisualizer 
                  isActive={true} 
                  color="#10B981"
                  type="user"
                />
              </motion.div>
            )}

            {/* Transcript Toggle */}
            <motion.button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{showTranscript ? '▼' : '▶'}</span>
              {showTranscript ? 'Hide' : 'Show'} Transcript
            </motion.button>

            {/* Transcript */}
            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  ref={transcriptRef}
                  className="w-full max-h-40 overflow-y-auto bg-black/30 rounded-xl p-4 mb-8 backdrop-blur-sm"
                >
                  {transcript.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">
                      Conversation will appear here...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((msg) => (
                        <div
                          key={msg.id}
                          className={`text-sm ${
                            msg.role === 'user' 
                              ? 'text-green-400' 
                              : 'text-white'
                          }`}
                        >
                          <span className="text-gray-500">
                            {msg.role === 'user' ? 'You: ' : `${agentName}: `}
                          </span>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Call Controls */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-6"
            >
              {/* Mute Button */}
              <motion.button
                onClick={handleMuteToggle}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isMuted 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={callState === 'connecting' || callState === 'ended'}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </motion.button>

              {/* End Call Button */}
              <motion.button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={callState === 'ended'}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                </svg>
              </motion.button>

              {/* Settings Button */}
              <motion.button
                className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </motion.button>
            </motion.div>

            {/* Hint text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-500 text-xs mt-8 text-center"
            >
              Tip: Speak naturally. {agentName} will respond when you pause.
            </motion.p>
          </div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleEndCall}
            className="absolute top-8 right-8 text-gray-400 hover:text-white"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceCallModal;
