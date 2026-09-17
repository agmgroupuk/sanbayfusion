/**
 * React Hook for Real-Time Collaboration Features
 * Provides collaborative editing, cursor tracking, and experiment sharing
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  initializeSocket,
  joinRoom,
  leaveRoom,
  updateCursor,
  sendContentChange,
  shareExperiment,
  startTyping,
  stopTyping,
  onRoomState,
  onUserJoined,
  onUserLeft,
  onCursorUpdate,
  onContentUpdate,
  onExperimentShared,
  onUserTyping,
  onUserStoppedTyping,
  disconnectSocket,
  isConnected,
} from '../lib/socket-client';

export interface User {
  userId: string;
  username: string;
}

export interface CursorPosition {
  userId: string;
  username: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface ContentUpdate {
  userId: string;
  username: string;
  content: string;
  position: number;
  timestamp: number;
}

export interface ExperimentShare {
  userId: string;
  username: string;
  experimentData: any;
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  username: string;
}

export function useCollaboration(
  roomId: string,
  userId: string,
  username: string
) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [contentUpdates, setContentUpdates] = useState<ContentUpdate[]>([]);
  const [sharedExperiments, setSharedExperiments] = useState<ExperimentShare[]>(
    []
  );
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize socket connection
  useEffect(() => {
    const socket = initializeSocket();
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Join/leave room
  useEffect(() => {
    if (!roomId || !userId || !username || !isConnected) return;

    joinRoom(roomId, userId, username);

    // Set up event listeners
    const unsubscribeRoomState = onRoomState((data) => {
      setRoomUsers(data.users);
    });

    const unsubscribeUserJoined = onUserJoined((data) => {
      setRoomUsers((prev) => [
        ...prev.filter((u) => u.userId !== data.userId),
        data,
      ]);
    });

    const unsubscribeUserLeft = onUserLeft((data) => {
      setRoomUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    const unsubscribeCursorUpdate = onCursorUpdate((data) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId);
        return [...filtered, data];
      });
    });

    const unsubscribeContentUpdate = onContentUpdate((data) => {
      setContentUpdates((prev) => [...prev, data]);
      setLastActivity(new Date());
    });

    const unsubscribeExperimentShared = onExperimentShared((data) => {
      setSharedExperiments((prev) => [...prev, data]);
    });

    const unsubscribeUserTyping = onUserTyping((data) => {
      setTypingUsers((prev) => [
        ...prev.filter((u) => u.userId !== data.userId),
        data,
      ]);
    });

    const unsubscribeUserStoppedTyping = onUserStoppedTyping((data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      leaveRoom(roomId);
      unsubscribeRoomState();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeCursorUpdate();
      unsubscribeContentUpdate();
      unsubscribeExperimentShared();
      unsubscribeUserTyping();
      unsubscribeUserStoppedTyping();
    };
  }, [roomId, userId, username, isConnected]);

  // Cursor tracking
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isConnected) return;

      const position = { x: event.clientX, y: event.clientY };
      updateCursor(roomId, userId, username, position);
    },
    [roomId, userId, username, isConnected]
  );

  useEffect(() => {
    if (!isConnected) return;

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, isConnected]);

  // Content editing
  const updateContent = useCallback(
    (content: string, position: number) => {
      if (!isConnected) return;

      sendContentChange(roomId, userId, username, content, position);
    },
    [roomId, userId, username, isConnected]
  );

  // Experiment sharing
  const shareExperimentData = useCallback(
    (experimentData: any) => {
      if (!isConnected) return;

      shareExperiment(roomId, userId, username, experimentData);
    },
    [roomId, userId, username, isConnected]
  );

  // Typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isConnected) return;

    startTyping(roomId, userId, username);

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId, userId);
    }, 3000);
  }, [roomId, userId, username, isConnected]);

  const handleTypingStop = useCallback(() => {
    if (!isConnected) return;

    stopTyping(roomId, userId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [roomId, userId, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      disconnectSocket();
    };
  }, []);

  return {
    isConnected,
    roomUsers,
    cursors,
    contentUpdates,
    sharedExperiments,
    typingUsers,
    lastActivity,
    updateContent,
    shareExperiment: shareExperimentData,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
  };
}
