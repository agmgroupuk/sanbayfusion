import { useState, useRef, useCallback } from 'react';
import { ChatMessage } from '../types';

interface UseCanvasCameraProps {
  currentAppHistory?: ChatMessage[];
}

/**
 * Hook encapsulating all camera, screenshot, and TTS logic
 * extracted from the App.tsx monolith.
 */
export function useCanvasCamera({ currentAppHistory }: UseCanvasCameraProps = {}) {
  // ── State ─────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Camera ────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    try {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setShowCameraModal(true);
        setFacingMode(facing);
      }
    } catch (err) {
      console.error('Camera error:', err);
      import('../components/shared/Toast').then(({ toast }) => toast.error('Camera Error', 'Could not access camera. Please check permissions.'));
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setShowCameraModal(false);
    setCapturedImage(null);
  }, []);

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        setCapturedImage(imageData);
      }
    }
  }, [facingMode]);

  const savePhoto = useCallback(() => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.download = `photo_${Date.now()}.png`;
      link.href = capturedImage;
      link.click();
    }
  }, [capturedImage]);

  // ── Screenshot ────────────────────────────────────────────────
  const captureScreenshot = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        stream.getTracks().forEach(track => track.stop());

        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = imageData;
        link.click();
      }
    } catch (err) {
      console.error('Screenshot error:', err);
    }
  }, []);

  // ── TTS / Voice ──────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const lastAgentMessage = currentAppHistory?.filter(m => m.role === 'model').pop();
      if (lastAgentMessage) {
        speakText(lastAgentMessage.text);
      } else {
        speakText('No agent response to read yet.');
      }
    }
  }, [isSpeaking, currentAppHistory, speakText]);

  return {
    // State
    isCameraActive,
    isVoiceActive,
    setIsVoiceActive,
    isSpeaking,
    facingMode,
    showCameraModal,
    capturedImage,
    setCapturedImage,
    // Refs
    videoRef,
    canvasRef,
    // Camera actions
    startCamera,
    stopCamera,
    switchCamera,
    takePhoto,
    savePhoto,
    captureScreenshot,
    // Voice actions
    speakText,
    toggleSpeaker,
  };
}

export default useCanvasCamera;
