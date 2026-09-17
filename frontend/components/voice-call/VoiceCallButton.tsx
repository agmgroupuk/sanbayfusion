'use client';

/**
 * VOICE CALL BUTTON
 * =================
 * A beautiful animated button to start voice calls with agents
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceCallModal } from './VoiceCallModal';
import { agentSTSService, AGENT_VOICE_PROFILES } from '@/lib/agent-sts-service';

interface VoiceCallButtonProps {
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  className?: string;
  variant?: 'icon' | 'full' | 'mini';
}

export const VoiceCallButton: React.FC<VoiceCallButtonProps> = ({
  agentId,
  agentName,
  agentAvatar,
  className = '',
  variant = 'icon',
}) => {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get agent color from profile
  const agentProfile = AGENT_VOICE_PROFILES[agentId];
  const agentColor = agentProfile?.voiceCharacteristics?.warmth 
    ? `hsl(${Math.floor(agentProfile.voiceCharacteristics.warmth * 270)}, 70%, 60%)`
    : '#8B5CF6';

  const handleStartCall = async () => {
    await agentSTSService.startCall(agentId);
  };

  const handleEndCall = () => {
    agentSTSService.endCall();
  };

  const handleMuteToggle = (muted: boolean) => {
    // Toggle mute in the STS service
    console.log('Mute toggled:', muted);
  };

  const openCall = () => {
    setIsCallOpen(true);
  };

  // Mini variant - just a small floating button
  if (variant === 'mini') {
    return (
      <>
        <motion.button
          onClick={openCall}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={`
            w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 
            text-white shadow-lg shadow-purple-500/30
            flex items-center justify-center
            ${className}
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={`Call ${agentName}`}
        >
          <PhoneIcon className="w-5 h-5" />
        </motion.button>

        <VoiceCallModal
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          agentId={agentId}
          agentName={agentName}
          agentAvatar={agentAvatar}
          agentColor={agentColor}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onMuteToggle={handleMuteToggle}
        />
      </>
    );
  }

  // Full variant - with text
  if (variant === 'full') {
    return (
      <>
        <motion.button
          onClick={openCall}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={`
            px-6 py-3 rounded-full
            bg-gradient-to-r from-purple-500 via-pink-500 to-red-500
            text-white font-medium
            shadow-lg shadow-purple-500/30
            flex items-center gap-3
            ${className}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={isHovered ? { rotate: [0, 15, -15, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <PhoneIcon className="w-5 h-5" />
          </motion.div>
          <span>Call {agentName}</span>
          
          {/* Pulse animation */}
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 rounded-full bg-white/20"
                style={{ zIndex: -1 }}
              />
            )}
          </AnimatePresence>
        </motion.button>

        <VoiceCallModal
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          agentId={agentId}
          agentName={agentName}
          agentAvatar={agentAvatar}
          agentColor={agentColor}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onMuteToggle={handleMuteToggle}
        />
      </>
    );
  }

  // Icon variant (default) - icon with hover effect
  return (
    <>
      <motion.button
        onClick={openCall}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`
          relative w-12 h-12 rounded-full
          bg-gradient-to-r from-purple-500/20 to-pink-500/20
          hover:from-purple-500 hover:to-pink-500
          text-purple-400 hover:text-white
          flex items-center justify-center
          transition-colors duration-300
          ${className}
        `}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={`Voice call with ${agentName}`}
      >
        <PhoneIcon className="w-6 h-6" />
        
        {/* Animated ring on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-purple-500"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <VoiceCallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        agentId={agentId}
        agentName={agentName}
        agentAvatar={agentAvatar}
        agentColor={agentColor}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onMuteToggle={handleMuteToggle}
      />
    </>
  );
};

// Phone Icon Component
const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

export default VoiceCallButton;
