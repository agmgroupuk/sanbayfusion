/**
 * LIVE SUPPORT BACKEND — Standalone Express Server with Socket.io
 * Port: 3900
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase, prisma } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3900;

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// ── CORS Origins ─────────────────────────────────────
const CORS_ORIGINS = [
  'https://sanbayfusion.com',
  'https://www.sanbayfusion.com',
  'http://localhost:3000',
  'http://localhost:3005',
];

// ── Socket.io Setup ──────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Track connected users
const connectedUsers = new Map(); // socketId -> { userId, sessionId, userInfo }

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins with their info
  socket.on('user:join', async (data) => {
    const { userId, sessionId, userInfo } = data;
    if (!userId) return;

    connectedUsers.set(socket.id, { userId, sessionId, userInfo });
    socket.join(`user:${userId}`);

    // Create or resume chat session
    try {
      const existingSession = await prisma.liveChatSession.findFirst({
        where: { userId, status: 'active' },
        orderBy: { startedAt: 'desc' },
      });

      if (existingSession) {
        socket.emit('session:restored', {
          sessionId: existingSession.sessionId,
          messages: existingSession.messages || [],
        });
      } else {
        const newSession = await prisma.liveChatSession.create({
          data: {
            sessionId: `session_${userId}_${Date.now()}`,
            userId,
            messages: [],
            status: 'active',
            startedAt: new Date(),
          },
        });
        socket.emit('session:created', { sessionId: newSession.sessionId });
      }
    } catch (err) {
      console.error('Session error:', err);
    }

    socket.emit('user:joined', { connected: true });
  });

  // Save message to database
  socket.on('message:save', async (data) => {
    const { sessionId, message, role } = data;
    if (!sessionId || !message) return;

    try {
      const session = await prisma.liveChatSession.findUnique({
        where: { sessionId },
      });

      if (session) {
        const messages = Array.isArray(session.messages) ? session.messages : [];
        messages.push({
          role,
          content: message,
          timestamp: new Date().toISOString(),
        });

        await prisma.liveChatSession.update({
          where: { sessionId },
          data: { messages },
        });
      }
    } catch (err) {
      console.error('Message save error:', err);
    }
  });

  // Typing indicator
  socket.on('user:typing', (data) => {
    const { userId } = data;
    // Broadcast to admin dashboard (future feature)
    socket.broadcast.emit('user:typing', { userId });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// ── Middleware ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Routes ────────────────────────────────────────────
app.use('/api', apiRouter);

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'live-support-backend',
    status: 'running',
    port: PORT,
    socketio: 'enabled',
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────
connectDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🎧 Live Support Backend running on port ${PORT}`);
      console.log(`🔌 Socket.io enabled for real-time chat`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start live-support-backend:', err);
    process.exit(1);
  });

export { io };
export default app;
