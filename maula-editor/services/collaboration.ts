import { createLogger } from './logger';
const log = createLogger('collaboration.ts');
// Real-Time Collaboration Service
// Y.js CRDT document sync via native WebSocket + local session/chat/presence
// Backend: /collaboration/{docName} — Y.js binary protocol over raw WS

import { COLLAB_WS_URL, MAIN_API_BASE } from './apiConfig';

// Types
export type UserRole = 'owner' | 'editor' | 'viewer';
export type SessionState = 'active' | 'paused' | 'ended';

export interface CollaboratorUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  role: UserRole;
  isOnline: boolean;
  lastActivity: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  isTyping?: boolean;
  isSpeaking?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export interface CursorPosition {
  filePath: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface SelectionRange {
  filePath: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CollaborationSession {
  id: string;
  name: string;
  hostId: string;
  projectId: string;
  state: SessionState;
  participants: CollaboratorUser[];
  settings: SessionSettings;
  createdAt: Date;
  inviteCode?: string;
  inviteUrl?: string;
}

export interface SessionSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  allowChat: boolean;
  allowTerminalSharing: boolean;
  allowDebugSharing: boolean;
  defaultRole: UserRole;
  maxParticipants: number;
  autoRecord: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  type: 'text' | 'code' | 'file' | 'system';
  timestamp: Date;
  reactions?: Record<string, string[]>;
  replyTo?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'code-snippet';
  name: string;
  url?: string;
  content?: string;
  language?: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  allowInput: boolean;
  participants: string[];
}

export interface DebugSession {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  breakpoints: Breakpoint[];
  currentFrame?: StackFrame;
}

export interface Breakpoint {
  id: string;
  filePath: string;
  line: number;
  condition?: string;
  hitCount?: number;
  enabled: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  filePath: string;
  line: number;
  column: number;
  scopes: DebugScope[];
}

export interface DebugScope {
  name: string;
  variables: DebugVariable[];
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  events: RecordingEvent[];
  participants: string[];
  size: number;
}

export interface RecordingEvent {
  timestamp: number;
  type: 'edit' | 'cursor' | 'selection' | 'chat' | 'terminal' | 'debug' | 'join' | 'leave' | 'voice';
  userId: string;
  data: any;
}

export interface FileOperation {
  type: 'insert' | 'delete' | 'replace';
  filePath: string;
  position: { line: number; column: number };
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

// Event types
export type CollaborationEventType =
  | 'connected'
  | 'disconnected'
  | 'session:created'
  | 'session:joined'
  | 'session:left'
  | 'session:ended'
  | 'user:joined'
  | 'user:left'
  | 'user:updated'
  | 'cursor:moved'
  | 'selection:changed'
  | 'file:changed'
  | 'chat:message'
  | 'chat:typing'
  | 'voice:started'
  | 'voice:ended'
  | 'terminal:shared'
  | 'terminal:input'
  | 'terminal:output'
  | 'debug:started'
  | 'debug:breakpoint'
  | 'debug:step'
  | 'recording:started'
  | 'recording:stopped'
  | 'permission:changed'
  | 'error';

export interface CollaborationEvent {
  type: CollaborationEventType;
  data?: any;
  error?: string;
}

// User colors for presence
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#16A085',
  '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#F39C12', '#1ABC9C', '#E91E63', '#00BCD4',
];

class CollaborationService {
  private ws: WebSocket | null = null;
  private currentUser: CollaboratorUser | null = null;
  private currentSession: CollaborationSession | null = null;
  private eventListeners: Map<CollaborationEventType, Set<(event: CollaborationEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isRecording = false;
  private recordingEvents: RecordingEvent[] = [];
  private recordingStartTime: number = 0;
  private _isConnected = false;
  private wsBaseUrl: string = '';
  private currentDocName: string = '';

  // Local state (chat, participants managed locally)
  private localMessages: ChatMessage[] = [];

  // Voice/Video (WebRTC)
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();

  // ========================================================================
  // INITIALIZATION & CONNECTION
  // ========================================================================

  async initialize(): Promise<void> {
    // COLLAB_WS_URL is already the correct base: wss://editor.onelastai.co/collaboration
    this.wsBaseUrl = COLLAB_WS_URL;
    this._isConnected = true;
    this.emit({ type: 'connected' });
    log.info('🔗 Collaboration service initialized, WS base:', this.wsBaseUrl);
  }

  private connectToDocument(docName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentDocName = docName;
      const url = `${this.wsBaseUrl}/${docName}`;
      log.info('🔗 Connecting to collaboration WS:', url);

      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this._isConnected = true;
          this.emit({ type: 'connected' });
          log.info('✅ Collaboration WebSocket connected to', docName);
          resolve();
        };

        this.ws.onmessage = (event) => {
          // Y.js binary protocol messages from backend
          try {
            const data = new Uint8Array(event.data);
            this.emit({ type: 'file:changed', data: { raw: data, docName } });
          } catch (err) {
            log.error('❌ WS message error:', err);
          }
        };

        this.ws.onclose = (event) => {
          log.info('🔌 Collaboration WS closed:', event.code, event.reason);
          // Only set disconnected if we had a session active
          if (this.currentSession) {
            this._isConnected = false;
            this.emit({ type: 'disconnected', data: { code: event.code, reason: event.reason } });

            // Auto-reconnect while session is active
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              const delay = this.reconnectDelay * this.reconnectAttempts;
              log.info(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              this.reconnectTimer = setTimeout(() => {
                this.connectToDocument(docName).then(() => {
                  this._isConnected = true;
                  this.emit({ type: 'connected' });
                }).catch(console.error);
              }, delay);
            }
          }
        };

        this.ws.onerror = () => {
          log.error('❌ Collaboration WebSocket error');
          this.emit({ type: 'error', error: 'WebSocket connection error' });
          reject(new Error('WebSocket connection failed'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  on(type: CollaborationEventType, callback: (event: CollaborationEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);

    return () => {
      this.eventListeners.get(type)?.delete(callback);
    };
  }

  private emit(event: CollaborationEvent): void {
    this.eventListeners.get(event.type)?.forEach(cb => {
      try { cb(event); } catch (e) { log.error('Event handler error:', e); }
    });
  }

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  async createSession(options: {
    name: string;
    projectId: string;
    settings?: Partial<SessionSettings>;
  }): Promise<CollaborationSession> {
    const settings: SessionSettings = {
      allowAnonymous: false,
      requireApproval: false,
      allowVoice: true,
      allowVideo: true,
      allowChat: true,
      allowTerminalSharing: true,
      allowDebugSharing: true,
      defaultRole: 'editor',
      maxParticipants: 10,
      autoRecord: false,
      ...options.settings,
    };

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const session: CollaborationSession = {
      id: sessionId,
      name: options.name,
      hostId: '',
      projectId: options.projectId,
      state: 'active',
      participants: [],
      settings,
      createdAt: new Date(),
      inviteCode,
    };

    this.currentSession = session;

    // Connect to Y.js backend for document sync
    try {
      await this.connectToDocument(options.projectId);
    } catch (error) {
      log.warn('⚠️ Could not connect to collaboration server, continuing in local mode:', error);
    }

    this.emit({ type: 'session:created', data: { session } });
    return session;
  }

  async joinSession(sessionId: string, user: { name: string; email?: string }): Promise<CollaborationSession> {
    const colorIndex = Math.floor(Math.random() * USER_COLORS.length);
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.currentUser = {
      id: userId,
      name: user.name,
      email: user.email,
      color: USER_COLORS[colorIndex],
      role: this.currentSession?.hostId ? 'editor' : 'owner',
      isOnline: true,
      lastActivity: new Date(),
    };

    if (this.currentSession) {
      if (!this.currentSession.hostId) {
        this.currentSession.hostId = userId;
        this.currentUser.role = 'owner';
      }
      this.currentSession.participants.push(this.currentUser);
    }

    // System message
    const sysMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId,
      userId: 'system',
      userName: 'System',
      userColor: '#888888',
      content: `${user.name} joined the session`,
      type: 'system',
      timestamp: new Date(),
    };
    this.localMessages.push(sysMsg);
    this.emit({ type: 'chat:message', data: { message: sysMsg } });
    this.emit({ type: 'session:joined', data: { session: this.currentSession, user: this.currentUser } });
    this.recordEvent('join', userId, { sessionId });

    return this.currentSession!;
  }

  async joinByInviteCode(inviteCode: string, user: { name: string; email?: string }): Promise<CollaborationSession> {
    // Create a local session keyed to the invite code, connect WS
    const session = await this.createSession({
      name: `Session ${inviteCode}`,
      projectId: `collab-${inviteCode.toLowerCase()}`,
    });
    return this.joinSession(session.id, user);
  }

  async leaveSession(): Promise<void> {
    if (this.currentUser && this.currentSession) {
      this.recordEvent('leave', this.currentUser.id, { sessionId: this.currentSession.id });
      const leaveMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sessionId: this.currentSession.id,
        userId: 'system',
        userName: 'System',
        userColor: '#888888',
        content: `${this.currentUser.name} left the session`,
        type: 'system',
        timestamp: new Date(),
      };
      this.localMessages.push(leaveMsg);
      this.emit({ type: 'chat:message', data: { message: leaveMsg } });
    }

    this.currentSession = null;
    this.stopRecording();
    this.closeWebSocket();
    this.emit({ type: 'session:ended' });
  }

  async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.state = 'ended';
    }
    this.currentSession = null;
    this.localMessages = [];
    this.stopRecording();
    this.closeWebSocket();
    this.emit({ type: 'session:ended' });
  }

  private closeWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }
  }

  generateInviteLink(): string | null {
    if (!this.currentSession) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/collab/${this.currentSession.inviteCode}`;
  }

  // ========================================================================
  // CURSOR & SELECTION
  // ========================================================================

  updateCursor(cursor: CursorPosition): void {
    if (!this.currentUser) return;
    this.currentUser.cursor = cursor;
    // Y.js awareness protocol would broadcast cursor positions to other peers
  }

  updateSelection(selection: SelectionRange | null): void {
    if (!this.currentUser) return;
    this.currentUser.selection = selection || undefined;
  }

  // ========================================================================
  // FILE OPERATIONS
  // ========================================================================

  sendFileOperation(operation: FileOperation): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // In Y.js, edits are applied to Y.Doc and synced via the WebSocket automatically
    this.recordEvent('edit', operation.userId, operation);
  }

  // ========================================================================
  // CHAT
  // ========================================================================

  sendChatMessage(content: string, type: ChatMessage['type'] = 'text', attachments?: ChatAttachment[]): void {
    if (!this.currentSession || !this.currentUser) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: this.currentSession.id,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userColor: this.currentUser.color,
      content,
      type,
      timestamp: new Date(),
      attachments,
    };

    this.localMessages.push(message);
    this.recordEvent('chat', this.currentUser.id, message);
    this.emit({ type: 'chat:message', data: { message } });
  }

  sendTypingIndicator(isTyping: boolean): void {
    if (!this.currentUser) return;
    this.emit({ type: 'chat:typing', data: { userId: this.currentUser.id, isTyping } });
  }

  addReaction(messageId: string, reaction: string): void {
    const msg = this.localMessages.find(m => m.id === messageId);
    if (msg && this.currentUser) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[reaction]) msg.reactions[reaction] = [];
      const idx = msg.reactions[reaction].indexOf(this.currentUser.id);
      if (idx === -1) {
        msg.reactions[reaction].push(this.currentUser.id);
      } else {
        msg.reactions[reaction].splice(idx, 1);
      }
    }
  }

  // ========================================================================
  // VOICE / VIDEO (WebRTC)
  // ========================================================================

  async startVoice(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (this.currentUser) {
        this.currentUser.audioEnabled = true;
        this.emit({ type: 'voice:started', data: { userId: this.currentUser.id } });
        this.recordEvent('voice', this.currentUser.id, { action: 'started' });
      }
    } catch (error) {
      log.error('Failed to start voice:', error);
      throw error;
    }
  }

  async stopVoice(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.currentUser) {
      this.currentUser.audioEnabled = false;
      this.emit({ type: 'voice:ended', data: { userId: this.currentUser.id } });
      this.recordEvent('voice', this.currentUser.id, { action: 'ended' });
    }
  }

  async startVideo(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      if (this.currentUser) {
        this.currentUser.videoEnabled = true;
        this.currentUser.audioEnabled = true;
      }

      return this.localStream;
    } catch (error) {
      log.error('Failed to start video:', error);
      throw error;
    }
  }

  async stopVideo(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.currentUser) {
      this.currentUser.videoEnabled = false;
    }
  }

  // ========================================================================
  // TERMINAL / DEBUG SHARING
  // ========================================================================

  shareTerminal(terminalId: string, allowInput: boolean = false): void {
    if (!this.currentSession || !this.currentUser) return;
    this.emit({ type: 'terminal:shared', data: { terminalId, userId: this.currentUser.id, allowInput } });
  }

  stopSharingTerminal(_terminalId: string): void {
    // Local mode: no-op
  }

  sendTerminalInput(terminalId: string, input: string): void {
    if (!this.currentUser) return;
    this.emit({ type: 'terminal:input', data: { terminalId, userId: this.currentUser.id, input } });
  }

  shareDebugSession(debugSessionId: string): void {
    if (!this.currentUser) return;
    this.emit({ type: 'debug:started', data: { debugSessionId, userId: this.currentUser.id } });
  }

  syncBreakpoint(breakpoint: Breakpoint): void {
    this.emit({ type: 'debug:breakpoint', data: { breakpoint } });
  }

  // ========================================================================
  // PERMISSIONS
  // ========================================================================

  updateUserRole(userId: string, role: UserRole): void {
    if (!this.currentUser || this.currentUser.role !== 'owner') {
      log.error('Only owner can change roles');
      return;
    }

    if (this.currentSession) {
      const participant = this.currentSession.participants.find(p => p.id === userId);
      if (participant) {
        participant.role = role;
        this.emit({ type: 'permission:changed', data: { userId, role } });
        this.emit({ type: 'user:updated', data: { user: participant } });
      }
    }
  }

  kickUser(userId: string): void {
    if (!this.currentUser || this.currentUser.role !== 'owner') {
      log.error('Only owner can kick users');
      return;
    }

    if (this.currentSession) {
      this.currentSession.participants = this.currentSession.participants.filter(p => p.id !== userId);
      this.emit({ type: 'user:left', data: { userId } });
    }
  }

  canEdit(): boolean {
    return this.currentUser?.role === 'owner' || this.currentUser?.role === 'editor';
  }

  canManageSession(): boolean {
    return this.currentUser?.role === 'owner';
  }

  // ========================================================================
  // SESSION RECORDING
  // ========================================================================

  startRecording(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.recordingEvents = [];
    this.recordingStartTime = Date.now();
    this.emit({ type: 'recording:started' });
  }

  stopRecording(): SessionRecording | null {
    if (!this.isRecording) return null;

    this.isRecording = false;
    const endTime = Date.now();

    const recording: SessionRecording = {
      id: `recording-${Date.now()}`,
      sessionId: this.currentSession?.id || '',
      startTime: new Date(this.recordingStartTime),
      endTime: new Date(endTime),
      duration: endTime - this.recordingStartTime,
      events: this.recordingEvents,
      participants: this.currentSession?.participants.map(p => p.id) || [],
      size: JSON.stringify(this.recordingEvents).length,
    };

    this.emit({ type: 'recording:stopped', data: { recording } });
    this.recordingEvents = [];
    return recording;
  }

  private recordEvent(type: RecordingEvent['type'], userId: string, data: any): void {
    if (!this.isRecording) return;

    this.recordingEvents.push({
      timestamp: Date.now() - this.recordingStartTime,
      type,
      userId,
      data,
    });
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  getSession(): CollaborationSession | null {
    return this.currentSession;
  }

  getCurrentUser(): CollaboratorUser | null {
    return this.currentUser;
  }

  getParticipants(): CollaboratorUser[] {
    return this.currentSession?.participants || [];
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  disconnect(): void {
    this.leaveSession();
    this.stopVoice();
    this.closeWebSocket();
    this._isConnected = false;
    this.currentUser = null;
    this.currentSession = null;
    this.localMessages = [];
    this.eventListeners.clear();
  }
}

// Singleton instance
export const collaborationService = new CollaborationService();
export default collaborationService;
