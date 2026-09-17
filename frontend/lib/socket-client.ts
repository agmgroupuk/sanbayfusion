/**
 * WebSocket Client for Real-Time Features
 * Centralized Socket.IO connection manager
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface MetricsUpdate {
  rps: number;
  avgResponseMs: number;
  errorRate: number;
  totalRequests: number;
  connectedClients: number;
  activeRooms: number;
  timestamp: string;
}

export interface ChatMessage {
  userId: string;
  agent: string;
  message: string;
  timestamp: string;
}

export interface CommunityPost {
  postId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

/**
 * Initialize WebSocket connection
 */
export function initializeSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3005';

  socket = io(socketUrl, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket?.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔴 WebSocket connection error:', error.message);
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      socket?.disconnect();
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    reconnectAttempts = 0;
  });

  // Global events
  socket.on(
    'clients-update',
    (data: { connected: number; timestamp: string }) => {
      console.log('👥 Connected clients:', data.connected);
    }
  );

  return socket;
}

/**
 * Get existing socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Join support chat room
 */
export function joinSupport(
  userId: string,
  sessionId: string,
  userName?: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('join-support', { userId, sessionId, userName });

  socket.once('joined', (data) => {
    console.log('✅ Joined support room:', data.room);
  });
}

/**
 * Join community room
 */
export function joinCommunity(userId: string, userName: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('join-community', { userId, userName });
}

/**
 * Subscribe to real-time metrics
 */
export function subscribeToMetrics(
  callback: (data: MetricsUpdate) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.emit('join-metrics');
  socket.on('metrics-update', callback);

  // Return unsubscribe function
  return () => {
    socket?.off('metrics-update', callback);
  };
}

/**
 * Subscribe to API request events
 */
export function subscribeToApiRequests(
  callback: (data: any) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('api-request', callback);

  return () => {
    socket?.off('api-request', callback);
  };
}

/**
 * Send chat message
 */
export function sendChatMessage(
  room: string,
  userId: string,
  message: string,
  agent?: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('chat-message', { room, userId, message, agent });
}

/**
 * Listen for chat messages
 */
export function onChatMessage(
  callback: (data: ChatMessage) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('message', callback);

  return () => {
    socket?.off('message', callback);
  };
}

/**
 * Listen for typing indicators
 */
export function onTyping(
  callback: (data: { userId: string; isTyping: boolean }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('typing', callback);

  return () => {
    socket?.off('typing', callback);
  };
}

/**
 * Post to community
 */
export function postToCommunity(
  userId: string,
  userName: string,
  content: string,
  postId: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('community-post', { userId, userName, content, postId });
}

/**
 * Subscribe to new community posts
 */
export function onNewPost(callback: (data: CommunityPost) => void): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('new-post', callback);

  return () => {
    socket?.off('new-post', callback);
  };
}

/**
 * Like a post
 */
export function likePost(postId: string, userId: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('post-like', { postId, userId });
}

/**
 * Subscribe to post likes
 */
export function onPostLiked(
  callback: (data: {
    postId: string;
    userId: string;
    timestamp: string;
  }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('post-liked', callback);

  return () => {
    socket?.off('post-liked', callback);
  };
}

/**
 * Comment on a post
 */
export function commentOnPost(
  postId: string,
  userId: string,
  userName: string,
  comment: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('post-comment', { postId, userId, userName, comment });
}

/**
 * Subscribe to new comments
 */
export function onNewComment(callback: (data: any) => void): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('new-comment', callback);

  return () => {
    socket?.off('new-comment', callback);
  };
}

/**
 * Join a collaboration room
 */
export function joinRoom(
  roomId: string,
  userId: string,
  username: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('join-room', { roomId, userId, username });
}

/**
 * Leave a collaboration room
 */
export function leaveRoom(roomId: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('leave-room', { roomId });
}

/**
 * Send cursor position update
 */
export function updateCursor(
  roomId: string,
  userId: string,
  username: string,
  position: { x: number; y: number }
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('cursor-move', { roomId, userId, username, position });
}

/**
 * Send content change for collaborative editing
 */
export function sendContentChange(
  roomId: string,
  userId: string,
  username: string,
  content: string,
  position: number
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('content-change', {
    roomId,
    userId,
    username,
    content,
    position,
  });
}

/**
 * Share AI Lab experiment
 */
export function shareExperiment(
  roomId: string,
  userId: string,
  username: string,
  experimentData: any
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('share-experiment', { roomId, userId, username, experimentData });
}

/**
 * Send typing indicator
 */
export function startTyping(
  roomId: string,
  userId: string,
  username: string
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('typing-start', { roomId, userId, username });
}

/**
 * Stop typing indicator
 */
export function stopTyping(roomId: string, userId: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('typing-stop', { roomId, userId });
}

/**
 * Listen for room state updates
 */
export function onRoomState(
  callback: (data: {
    users: Array<{ userId: string; username: string }>;
  }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('room-state', callback);

  return () => {
    socket?.off('room-state', callback);
  };
}

/**
 * Listen for user joined room
 */
export function onUserJoined(
  callback: (data: { userId: string; username: string }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('user-joined', callback);

  return () => {
    socket?.off('user-joined', callback);
  };
}

/**
 * Listen for user left room
 */
export function onUserLeft(
  callback: (data: { userId: string; username: string }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('user-left', callback);

  return () => {
    socket?.off('user-left', callback);
  };
}

/**
 * Listen for cursor updates
 */
export function onCursorUpdate(
  callback: (data: {
    userId: string;
    username: string;
    position: { x: number; y: number };
    timestamp: number;
  }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('cursor-update', callback);

  return () => {
    socket?.off('cursor-update', callback);
  };
}

/**
 * Listen for content updates
 */
export function onContentUpdate(
  callback: (data: {
    userId: string;
    username: string;
    content: string;
    position: number;
    timestamp: number;
  }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('content-update', callback);

  return () => {
    socket?.off('content-update', callback);
  };
}

/**
 * Listen for shared experiments
 */
export function onExperimentShared(
  callback: (data: {
    userId: string;
    username: string;
    experimentData: any;
    timestamp: number;
  }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('experiment-shared', callback);

  return () => {
    socket?.off('experiment-shared', callback);
  };
}

/**
 * Listen for typing indicators
 */
export function onUserTyping(
  callback: (data: { userId: string; username: string }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('user-typing', callback);

  return () => {
    socket?.off('user-typing', callback);
  };
}

/**
 * Listen for stopped typing
 */
export function onUserStoppedTyping(
  callback: (data: { userId: string }) => void
): () => void {
  if (!socket) {
    console.error('Socket not initialized');
    return () => { };
  }

  socket.on('user-stopped-typing', callback);

  return () => {
    socket?.off('user-stopped-typing', callback);
  };
}

/**
 * Update user activity
 */
export function updateActivity(): void {
  if (!socket?.connected) return;
  socket.emit('activity');
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}
