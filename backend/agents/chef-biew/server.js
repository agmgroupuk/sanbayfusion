/**
 * Chef Biew — Standalone Agent Backend
 * Port: 3414 | Provider: OpenAI gpt-4o | Fallbacks: mistral → xai
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';
import apiRouter from './routes/api-router.js';
import { STRICT_AGENT_PROMPTS, AGENT_PROVIDERS, AGENT_TEMPERATURES } from './lib/agent-strict-prompts.js';

const SLUG = 'chef-biew';
const NAME = 'Chef Biew';
const PROVIDER = 'openai';
const MODEL = 'gpt-4o';
const FALLBACKS = ['mistral', 'xai'];
const TEMPERATURE = 0.85;
const PORT = parseInt(process.env.PORT) || 3414;

// Override agent identity — safe: each agent runs in its own PM2 process
const existingModes = AGENT_PROVIDERS[SLUG]?.modes;
AGENT_PROVIDERS[SLUG] = { provider: PROVIDER, model: MODEL, fallbacks: FALLBACKS, ...(existingModes ? { modes: existingModes } : {}) };
AGENT_PROVIDERS['default'] = { provider: PROVIDER, model: MODEL, fallbacks: FALLBACKS };
AGENT_TEMPERATURES[SLUG] = TEMPERATURE;

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'https://chef-biew-chat.sanbayfusion.com',
    'https://sanbayfusion.com',
  ],
  credentials: true,
}));
app.use(cookieParser());
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', apiRouter);

app.get('/', (_req, res) => res.json({
  name: 'Agent: Chef Biew',
  slug: SLUG,
  provider: PROVIDER,
  model: MODEL,
  status: 'running',
  port: PORT,
  timestamp: new Date().toISOString(),
}));

async function start() {
  await connectDatabase();
  console.log('[' + SLUG + '] Database connected');
  app.listen(PORT, () => {
    console.log('Agent "' + NAME + '" (' + SLUG + ') running on port ' + PORT);
  });
}

process.on('SIGINT', async () => { await disconnectDatabase(); process.exit(0); });
process.on('SIGTERM', async () => { await disconnectDatabase(); process.exit(0); });

start().catch(err => { console.error('[' + SLUG + '] Failed to start:', err); process.exit(1); });
