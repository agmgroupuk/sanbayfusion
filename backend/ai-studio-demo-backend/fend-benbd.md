# AI Studio Demo — Full-Stack Documentation

> **App**: AI Studio Demo  
> **Domain**: `demo.maula.ai`  
> **Backend Port**: `3500`  
> **PM2 Process**: `ai-studio-demo-backend`  
> **Database**: PostgreSQL (`ai_studio_demo`)

---

## Architecture Overview

```
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│  demo.maula.ai (Vite SPA)       │     │  ai-studio-demo-backend      │
│  frontend/ai-studio-demo/dist/  │────▶│  Port 3500                   │
│  React 19 + Vite                │     │  Express + Prisma            │
└──────────────────────────────────┘     └──────────┬───────────────────┘
                                                    │
                                         ┌──────────▼───────────────────┐
                                         │  PostgreSQL (ai_studio_demo) │
                                         │  + Auth DB (maulaai)         │
                                         └──────────────────────────────┘
```

**Nginx**: Serves static from `frontend/ai-studio-demo/dist/`, proxies `/api/` → `:3500`

---

## Frontend

| Field | Value |
|-------|-------|
| **Framework** | Vite + React 19 (SPA) |
| **Dev Port** | 3000 (Vite dev server, proxy → `:3500`) |
| **Build Output** | `frontend/ai-studio-demo/dist/` |
| **Domain** | `demo.maula.ai` |
| **Type** | Single-page AI studio demo with multi-model chat |

---

## Backend

| Field | Value |
|-------|-------|
| **Framework** | Express 4.21 (ESM) |
| **Port** | 3500 (`PORT` env) |
| **Body Limit** | 50MB JSON + URL-encoded |
| **CORS** | `CORS_ORIGIN` env (comma-separated), defaults: `localhost:5173`, `localhost:3000` |
| **CORS Credentials** | `true` |
| **Cookie Parser** | Enabled |
| **API Mount** | All routes under `/api` |
| **Graceful Shutdown** | SIGINT/SIGTERM → DB disconnect |

---

## Complete File Tree

```
ai-studio-demo-backend/
├── .env
├── .env.example
├── package.json
├── package-lock.json
├── server.js
├── lib/
│   ├── agent-memory-service.js          # NLP memory extraction & enhanced prompts
│   ├── agent-strict-prompts.js          # Per-agent system prompts & temperatures
│   ├── agent-tools-service.js           # Thin wrapper → demo-tools-service
│   ├── auth-prisma.js                   # Separate Prisma client for main maulaai DB
│   ├── content-safety-service.js        # Azure AI Content Safety integration
│   ├── demo-tools-service.js            # 5 actual tool implementations
│   ├── prisma.js                        # Prisma client singleton + helpers
│   ├── provider-fallback-service.js     # Multi-provider AI fallback chain
│   ├── validation-utils.js              # UUID/CUID validation
│   └── tools/
│       ├── advanced-ai-tools.js         # LLM tool schemas (980 lines)
│       ├── advanced-security-tools.js   # Security tool schemas (1756 lines)
│       ├── ai-ml-tools.js              # AI/ML tool schemas
│       ├── analytics-tools.js           # Analytics tool schemas
│       ├── api-tools.js                 # API tool schemas
│       ├── business-tools.js            # Business tool schemas
│       ├── cloud-tools.js              # Cloud infra tool schemas
│       ├── collaboration-tools.js       # Collaboration tool schemas
│       ├── core-tools.js               # Core tool schemas
│       ├── data-science-tools.js        # Data science tool schemas
│       ├── db-tools.js                  # Database tool schemas
│       ├── dev-tools.js                 # Developer tool schemas
│       ├── document-tools.js            # Document processing tool schemas
│       ├── file-tools-extended.js       # Extended file op tool schemas
│       ├── geo-tools.js                 # Geospatial tool schemas
│       ├── knowledge-graph-tools.js     # Knowledge graph tool schemas
│       ├── markdown-tools.js            # Markdown tool schemas
│       ├── security-tools.js            # Security tool schemas
│       ├── web-tools.js                 # Web scraping tool schemas
│       └── workflow-tools.js            # Workflow automation tool schemas
├── middleware/
│   └── rate-limit.js                    # In-memory sliding window rate limiter
├── models/
│   ├── AgentFile.js                     # Re-export from index.js
│   ├── AgentMemory.js                   # Re-export from index.js
│   └── index.js                         # Prisma-to-Mongoose adapters (1658 lines)
├── prisma/
│   ├── schema.prisma                    # Database schema
│   └── prisma/
│       └── dev.db                       # SQLite dev database
└── routes/
    ├── api-router.js                    # Master router (116 lines)
    ├── chat-session-routes.js           # Session CRUD + guest limiting (502 lines)
    ├── missing-endpoints.js             # AI chat, streaming, arenas, labs (5278 lines)
    ├── studio-stats-routes.js           # Session statistics (116 lines)
    └── agent-memory-routes.js           # Agent memory + tools + files (453 lines)
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic/Claude API |
| `@aws-sdk/client-cloudwatch-logs` | ^3.700.0 | AWS CloudWatch |
| `@aws-sdk/client-ec2` | ^3.700.0 | AWS EC2 |
| `@aws-sdk/client-ecs` | ^3.700.0 | AWS ECS |
| `@aws-sdk/client-elastic-load-balancing-v2` | ^3.700.0 | AWS ELB |
| `@aws-sdk/client-s3` | ^3.700.0 | AWS S3 file storage |
| `@aws-sdk/s3-request-presigner` | ^3.700.0 | S3 presigned URLs |
| `@google/genai` | ^1.0.0 | Google Gemini AI |
| `@prisma/client` | ^6.2.1 | Prisma ORM |
| `cookie-parser` | ^1.4.7 | Cookie parsing |
| `cors` | ^2.8.5 | CORS middleware |
| `dotenv` | ^16.4.7 | Environment variables |
| `express` | ^4.21.2 | Web framework |
| `express-rate-limit` | ^7.5.0 | Rate limiting |
| `express-validator` | ^7.2.0 | Input validation |
| `groq-sdk` | ^0.8.0 | Groq AI API |
| `ioredis` | ^5.4.2 | Redis client |
| `jsdom` | ^25.0.0 | HTML parsing (web scraping) |
| `jsonwebtoken` | ^9.0.2 | JWT authentication |
| `multer` | ^1.4.5-lts.1 | File uploads |
| `node-fetch` | ^3.3.2 | HTTP client |
| `openai` | ^4.77.0 | OpenAI SDK (also for Cerebras/Groq compat) |
| `stripe` | ^17.5.0 | Stripe payments |
| `uuid` | ^11.0.5 | UUID generation |
| `vm2` | ^3.10.5 | Code sandbox execution |

**Dev**: `prisma` ^6.2.1

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `node --watch server.js` |
| `start` | `node server.js` |
| `db:generate` | `npx prisma generate` |
| `db:push` | `npx prisma db push` |
| `db:migrate` | `npx prisma migrate dev` |
| `db:studio` | `npx prisma studio` |
| `db:seed` | `node prisma/seed.js` |
| `setup` | `npm install && npx prisma generate && npx prisma db push` |

---

## API Endpoints

### Health & Status

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Root health check |
| GET | `/api/health` | No | API health check |
| GET | `/api/status` | No | Platform status (uptime, CPU, memory, services) |

### Chat Sessions (`/api/sessions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sessions/active` | Yes | Get active session pointer |
| PUT | `/api/sessions/active` | Yes | Set active session pointer |
| POST | `/api/sessions/guest/check` | No | Guest rate limiting (20 msgs/24h, 40/IP) |
| POST | `/api/sessions/guest/increment` | No | Increment guest message count |
| GET | `/api/sessions/load` | Yes | Load all sessions with messages |
| POST | `/api/sessions` | Yes | Create new session |
| GET | `/api/sessions` | Yes | List sessions (paginated) |
| GET | `/api/sessions/:id` | Yes | Get session with messages |
| PUT | `/api/sessions/:id` | Yes | Update session |
| DELETE | `/api/sessions/:id` | Yes | Archive session |
| POST | `/api/sessions/:id/messages` | Yes | Add message |
| POST | `/api/sessions/:id/files` | Yes | Save virtual files |
| GET | `/api/sessions/:id/files` | Yes | Load virtual files |
| POST | `/api/sessions/sync` | Yes | Bulk sync from localStorage |

### Studio AI Chat (`/api/studio`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/studio/chat` | No | AI chat (non-streaming, provider fallback) |
| POST | `/api/studio/chat/stream` | No | AI chat (SSE streaming) |
| POST | `/api/studio/multimodal` | No | Multimodal input (limited in demo) |
| POST | `/api/studio/feedback` | No | Create/update feedback |
| GET | `/api/studio/feedback` | No | Get all feedback |
| DELETE | `/api/studio/feedback/:id` | No | Delete feedback |
| POST | `/api/studio/stats` | No | Save session statistics |
| GET | `/api/studio/stats/:sessionId` | No | Get session stats |
| GET | `/api/studio/stats` | No | List all stats |
| POST | `/api/studio/` | No | Live support endpoint |

### Lab Experiments (`/api/studio`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/studio/battle-arena` | Two AI models compete |
| POST | `/api/studio/battle-arena/vote` | Vote on winner |
| POST | `/api/studio/debate-arena` | AI debate transcript |
| POST | `/api/studio/debate-arena/vote` | Vote for/against |
| GET | `/api/studio/debate-arena/votes` | Get debate votes |
| POST | `/api/studio/dream-analysis` | AI dream analysis |
| POST | `/api/studio/emotion-analysis` | AI emotion analysis |
| POST | `/api/studio/future-prediction` | AI future predictions |
| POST | `/api/studio/personality-analysis` | AI personality analysis |
| POST | `/api/studio/story-generation` | AI story generation |

### Agent Memory (`/api/agents/memory`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/memory/:userId/:agentId` | Get memory stats |
| POST | `/api/agents/memory/:userId/:agentId/learn` | Extract learnings from conversation |
| GET | `/api/agents/memory/:userId/:agentId/context` | Get memory-enhanced system prompt |
| POST | `/api/agents/memory/:userId/:agentId/profile` | Update user profile |
| DELETE | `/api/agents/memory/:userId/:agentId` | Clear memories |
| POST | `/api/agents/memory/:userId/:agentId/add` | Manually add memory |

### Agent Tools (`/api/agents/tools`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents/tools/search` | Web search (DuckDuckGo) |
| POST | `/api/agents/tools/fetch-url` | Fetch URL content |
| POST | `/api/agents/tools/calculate` | Math calculation |
| GET | `/api/agents/tools/time` | Get current time |
| POST | `/api/agents/tools/execute` | Execute any tool by name |
| GET | `/api/agents/tools/available` | List available tools |

### Agent Files (`/api/agents/files`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/files/download` | Download from PostgreSQL or S3 |
| GET | `/api/agents/files/list` | List workspace files |
| POST | `/api/agents/files/create` | Create file |
| GET | `/api/agents/files/read` | Read file |
| PUT | `/api/agents/files/modify` | Modify file |
| DELETE | `/api/agents/files/delete` | Delete file |

---

## Database Schema (Prisma)

| Model | Table | Purpose |
|-------|-------|---------|
| **User** | `User` | Local user mirror (FK target) |
| **Agent** | `Agent` | AI agent definitions (prompts, pricing, provider) |
| **AgentSubscription** | `subscriptions` | User subscriptions to agents |
| **AgentFile** | `AgentFile` | Files stored per agent (PostgreSQL + S3) |
| **AgentMemory** | `agent_memories` | Long-term agent learning memory |
| **ChatSession** | `chat_sessions` | Chat sessions with settings |
| **ChatMessage** | `chat_messages` | Individual messages (user/assistant/system) |
| **ChatFeedback** | `chat_feedback` | Message ratings |
| **ChatSettings** | `chat_settings` | Per-user default chat settings |
| **ChatQuickAction** | `chat_quick_actions` | Quick action prompts |
| **ChatCanvasFile** | `chat_canvas_files` | Virtual project files in chat |
| **ChatCanvasHistory** | `chat_canvas_history` | Canvas edit history |
| **ChatCanvasProject** | `chat_canvas_projects` | Canvas projects |
| **Session** | `sessions` | Analytics sessions |
| **StudioSessionStats** | `studio_session_stats` | Studio session metrics |
| **GuestSession** | `guest_sessions` | Guest rate limiting |
| **LabVote** | `lab_votes` | Battle/Debate arena votes |

### Enums

- `AuthMethod`: password, google, github, yahoo, microsoft
- `UserRole`: user, admin, moderator
- `AgentStatus`: active, maintenance, deprecated
- `SubscriptionPlan`: daily, weekly, monthly, yearly, lifetime
- `SubscriptionStatus`: active, expired, cancelled
- `MessageRole`: user, assistant, system
- `FeedbackType`: helpful, not_helpful, incorrect, offensive, other

---

## Services & Libraries

| Service | File | Description |
|---------|------|-------------|
| **Prisma Client** | `lib/prisma.js` | PostgreSQL singleton with health check, pagination, graceful shutdown |
| **Auth Prisma** | `lib/auth-prisma.js` | Separate Prisma client → main `maulaai` DB for user auth |
| **Provider Fallback** | `lib/provider-fallback-service.js` | Priority: **Cerebras → Gemini → Groq**. OpenAI-compat + native Gemini |
| **Content Safety** | `lib/content-safety-service.js` | Azure AI Content Safety (4 harm categories, severity 0–6, threshold 4) |
| **Agent Memory** | `lib/agent-memory-service.js` | Regex-based learning extraction (name, prefs, goals, emotions, corrections) |
| **Strict Prompts** | `lib/agent-strict-prompts.js` | Agent personalities: `default` (Maula AI), `ai-studio-assistant` (Comedy King) |
| **Demo Tools** | `lib/demo-tools-service.js` | 5 tools: `web_search`, `fetch_url`, `run_code`, `calculate`, `get_current_time` |
| **Validation** | `lib/validation-utils.js` | UUID/CUID/string ID validation |
| **Tool Schemas** | `lib/tools/` (20 files) | 100+ OpenAI function-calling tool schemas for LLMs (not executed in demo) |

### Middleware

| Middleware | Description |
|------------|-------------|
| `rate-limit.js` | In-memory rate limiter (configurable max/window, keyed by userId or IP) |
| Content Safety | Azure Content Safety middleware — blocks at medium+ severity (HTTP 451) |
| CORS | Origin whitelist from env, credentials enabled |
| `cookie-parser` | Standard cookie parsing |
| `express.json(50mb)` | JSON body parser |

---

## AI Providers & Chat Modes

| Provider | Model | Role |
|----------|-------|------|
| **Cerebras** (primary) | `llama3.1-8b` | Free-tier LLM via OpenAI-compat API |
| **Google Gemini** (2nd) | `gemini-2.5-flash` | Native Gemini API |
| **Groq** (fallback) | `llama-3.3-70b-versatile` | OpenAI-compat API |

### Chat Modes

| Mode | Behavior |
|------|----------|
| **Chat** | Standard conversation |
| **Thinking** | Step-by-step reasoning with explicit thought process |
| **Web Search** | DuckDuckGo search, inject results into context |
| **Deep Research** | Multi-source research synthesis with citations |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default 3500) |
| `NODE_ENV` | Environment mode |
| `DATABASE_URL` | PostgreSQL (ai_studio_demo DB) |
| `AUTH_DATABASE_URL` | PostgreSQL (main maulaai DB for auth) |
| `CORS_ORIGIN` | Allowed origins |
| `CEREBRAS_API_KEY` | Cerebras AI (primary) |
| `GEMINI_API_KEY` | Google Gemini (secondary) |
| `GROQ_API_KEY` | Groq AI (fallback) |
| `OPENAI_API_KEY` | OpenAI (in env, disabled in demo) |
| `ANTHROPIC_API_KEY` | Anthropic (referenced, not active in demo) |
| `AWS_ACCESS_KEY_ID` | AWS credentials (S3) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (S3) |
| `AWS_REGION` | AWS region (default: ap-southeast-1) |
| `S3_BUCKET` | S3 bucket (default: maula-ai-bucket) |
| `AZURE_CONTENT_SAFETY_ENDPOINT` | Azure Content Safety API |
| `AZURE_CONTENT_SAFETY_KEY` | Azure Content Safety key |
| `JWT_SECRET` | JWT signing secret |
| `SECRETS_ENCRYPTION_KEY` | Encryption key for secrets |

---

## Key Architecture Notes

- **Dual Database**: Own `ai_studio_demo` DB for sessions/messages + auth against main `maulaai` DB via separate Prisma client
- **Demo Mode**: Tool calling (native LLM function calling) is disabled — uses simple text-to-text chat with provider fallback
- **100+ Tool Definitions**: Massive tool schema library in `lib/tools/` but only 5 tools actually execute
- **Streaming**: SSE-based streaming with `res.write` interception for DB persistence
- **Guest Rate Limiting**: 20 msgs/24h per guest ID, 40 msgs/24h per IP
- **Models Layer**: Prisma-to-Mongoose adapter providing `.findById()`, `.findOne()`, `.find()`, `.save()` methods
