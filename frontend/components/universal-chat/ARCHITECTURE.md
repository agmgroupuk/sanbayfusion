# Universal Chat — Architecture & Status

> **Last updated:** February 21, 2026 — 233 Canvas tool schemas + 183 Universal Chat native tools, DB-first session persistence (NO localStorage), embedded canvas-studio with Monaco Editor + integrated terminal, real-time voice calls, multi-provider AI (Anthropic, OpenAI, Groq, Cerebras, Mistral, xAI, Gemini), native tool calling, SSE streaming
> **Location:** `frontend/components/universal-chat/` (embedded Vite SPA within Next.js)
> **Status:** Live — primary chat interface at `/chat/`
> **Storage:** NO localStorage in source code — DB API for persistent data, cookies for guest identification, in-memory cache for ephemeral session state

---

## What Is This?

Universal Chat is the **primary conversational AI interface** for Maula AI. It is a Vite SPA embedded inside the Next.js frontend at `/chat/`. It features multi-provider AI chat, real-time voice calls, session management, and an embedded Canvas Studio (web-app builder).

---

## Directory Structure

```
frontend/components/universal-chat/
├── App.tsx                      # Main app — auth, theme, sidebar, chat, canvas-studio
├── Sidebar.tsx                  # Root sidebar (session list, new chat, settings)
├── UniversalAgentChat.tsx       # Agent-specific chat wrapper
├── types.ts                     # TypeScript types (Session, ChatMessage, etc.)
├── constants.tsx                # App-wide constants
├── realtimeChatService.ts       # WebSocket real-time voice/chat service
├── index.html / index.tsx       # Vite entry point
├── metadata.json                # App metadata
├── ARCHITECTURE.md              # ⭐ THIS FILE
├── INTEGRATION-PLAN.md          # Integration planning doc
├── README.md                    # Overview readme
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite build config
│
├── components/
│   ├── ChatBox.tsx              # Core chat UI — messages, input, send, liked/disliked tracking
│   ├── Header.tsx               # Top bar — model selector, user menu
│   ├── Footer.tsx               # Bottom bar — credits, links
│   ├── Sidebar.tsx              # Inner sidebar component
│   ├── NavigationDrawer.tsx     # Navigation drawer overlay
│   ├── CanvasAppDrawer.tsx      # Canvas app list drawer
│   ├── FilePanel.tsx            # File upload/management panel
│   ├── SettingsPanel.tsx        # User settings panel
│   ├── VoiceCallModal.tsx       # Real-time voice call UI
│   └── Overlay.tsx              # Modal overlay backdrop
│
├── hooks/
│   └── useSessionSync.ts        # Session sync hook (DB ↔ in-memory)
│
├── services/
│   ├── chatService.ts           # Chat API client (POST /api/chat)
│   ├── geminiService.ts         # Gemini-specific API client
│   ├── sessionService.ts        # Session CRUD — DB-first with in-memory cache
│   └── sessionService.ts.bak   # Backup of pre-migration session service
│
├── public/
│   ├── logo.png                 # App logo (PNG)
│   ├── logo.svg                 # App logo (SVG)
│   └── onelastai-logo.jpg       # MaulaAI branding
│
└── canvas-studio/               # ⭐ Embedded Canvas Studio (see separate ARCHITECTURE.md)
    ├── App.tsx                  # Canvas Studio main app
    ├── types.ts                 # Canvas-specific types
    ├── components/              # 11 components (Monaco, Terminal, Chat, Deploy, etc.)
    ├── hooks/                   # useCanvasCamera.ts
    ├── services/                # 8 services (agent, AI, apps, S3, deploy, editor, bundler, speech)
    └── public/                  # Static assets
```

---

## Storage Strategy (Post-localStorage Elimination — Commit `9b01d81`)

**ZERO localStorage in custom source files.** All persistence uses this hierarchy:

### Session Persistence — `sessionService.ts`

| Aspect | Method | Details |
|--------|--------|---------|
| **Logged-in users** | **Database API** | `GET/POST/PUT/DELETE /api/sessions` — Prisma `ChatSession` model |
| **Guest users** | **In-memory only** | `_memSessions` Map — ephemeral, lost on page refresh |
| **Active session ID** | **In-memory** | `_memActiveId` variable |
| **Sync queue** | **In-memory** | `_memSyncQueue` array for pending DB writes |
| **Guest identification** | **Cookie** | `maula_guest` cookie (30 days) |

> **Key design:** `sessionService.ts` loads sessions from `/api/sessions` on init, caches in module-level `_memSessions` Map, and writes back to DB on save. Guest sessions exist only in memory. NO localStorage anywhere.

### Chat State — `ChatBox.tsx`

| Data | Storage | Details |
|------|---------|---------|
| Liked messages | **In-memory Set** | Loaded from DB via `useEffect` → `GET /api/chat/feedback` |
| Disliked messages | **In-memory Set** | Loaded from DB via `useEffect` → `GET /api/chat/feedback` |
| Pinned messages | **In-memory Set** | Module-level `_pinnedMessages` |
| Input text | **React state** | Component-local state |

### Auth & Preferences — `App.tsx`

| Data | Storage | Details |
|------|---------|---------|
| User auth | `secureAuthStorage.getUser()` | In-memory `_inMemoryUser` (NO localStorage) |
| Guest ID | **Cookie** | `maula_guest` (30 days, `sameSite: lax`) |
| Dark mode | **Cookie** | `theme` cookie (365 days) + `document.documentElement.classList` |
| Visitor ID | **Cookie** | `_vid` cookie (365 days) for analytics |

---

## Data Flow

```
User types message → ChatBox.tsx
  → chatService.ts POST /api/studio/chat/stream (or /api/canvas/agent-chat for Canvas)
    → Backend routes: missing-endpoints.js (Universal Chat) / canvas-routes.js (Canvas Studio)
      → AI Provider: Anthropic / OpenAI / Groq / Cerebras / Mistral / xAI / Gemini
      → If OpenAI/Anthropic: 14 native tools auto-invoked by LLM → executeStudioTool() → results streamed
      → If Canvas: 210 native tools → model.tool_use → executeCanvasTool() → results applied
      → If other provider: mode-based approach (web_search, deep_research, thinking, image_gen)
    ← SSE stream / JSON response
  ← Frontend renders message
  → sessionService.ts saves to DB via /api/sessions (in-memory cache only, NO localStorage)
```

---

## Universal Chat Native Tools — 183 Tools (`backend/routes/missing-endpoints.js`)

When using **Anthropic or OpenAI** in Universal Chat, the backend provides **183 native tools** via `STUDIO_CORE_TOOLS`. The LLM autonomously decides when to use them. Tool activity is streamed to the user with emoji indicators.

| Category | Tool | What It Does |
|----------|------|-------------|
| **Core** | `web_search` | Search the web via DuckDuckGo |
| **Core** | `fetch_url` | Fetch and extract content from a URL |
| **Core** | `execute_code` | Run JavaScript in sandboxed VM |
| **Core** | `calculate` | Evaluate math expressions |
| **Core** | `get_current_time` | Current date/time with timezone |
| **Core** | `get_weather` | Real-time weather (wttr.in) |
| **Core** | `generate_video` | AI video generation (RunwayML) |
| **Document** | `parse_pdf` | Extract text from PDF files |
| **Document** | `parse_docx` | Extract text from Word docs |
| **Document** | `parse_csv` | Parse CSV to structured rows |
| **Document** | `parse_json` | Parse/validate/transform JSON |
| **Document** | `parse_markdown` | Extract headers/links/code blocks |
| **Document** | `parse_html` | Extract structured data from HTML |
| **Audio** | `transcribe_audio` | Speech-to-text (Whisper) |
| **Image** | `generate_image` | AI image generation (DALL-E 3) |
| **Image** | `image_create` | Create from scratch (blank/gradient/pattern/SVG/text) |
| **Image** | `image_transform` | Resize/crop/rotate/flip/extend/trim |
| **Image** | `image_convert` | Format conversion/compress |
| **Image** | `image_compose` | Text overlay/watermark/composite/merge/collage |
| **Image** | `image_filter` | Blur/sharpen/grayscale/sepia/etc. (24 filters) |
| **Image** | `image_analyze` | Metadata/stats/hash/colors/EXIF/similarity |
| **Image** | `image_batch` | Bulk processing pipeline |
| **Image** | `image_background` | Remove/replace/blur background |
| **Image** | `image_face` | Face detect/blur/crop/landmarks |
| **Image** | `image_ai` | AI vision (describe/analyze/OCR/classify) |
| **Image** | `image_export` | Export to ASCII/base64/data_url/raw_pixels |
| **Image** | `image_ocr` | Optical character recognition |
| **Video** | `video_transform` | Trim/split/concat/speed/resize/crop |
| **Video** | `video_convert` | Format/compress/GIF/thumbnail/responsive |
| **Video** | `video_analyze` | Metadata/scenes/silence/validate |
| **Video** | `video_overlay` | Text/subtitle/watermark/lower_third/hook |
| **Video** | `video_filter` | Color correct/cinematic/blur BG/stabilize |
| **Video** | `video_audio` | Extract/replace/volume/normalize/fade/denoise |
| **Video** | `video_ai` | Describe/transcribe/highlights/caption/moderate |
| **Video** | `video_batch` | Multi-step batch processing |
| **Archive** | `archive_core` | Create/extract/repack/compress (ZIP/TAR/GZIP) |
| **Archive** | `archive_edit` | In-place editing (add/remove/replace/patch) |
| **Archive** | `archive_structure` | Inspect/list/tree/stats |
| **Archive** | `archive_security` | Zip bomb/symlink/secrets/path traversal scan |
| **Archive** | `archive_bulk` | Batch process multiple archives |
| **Archive** | `archive_convert` | Format conversion (zip↔tar↔targz) |
| **Archive** | `archive_intelligence` | AI analysis (summarize/readme/detect/secrets) |
| **Archive** | `archive_deploy` | Dev packaging (build/deploy/env/version) |
| **Dev** | `dev_filesystem` | Project tree/file stats/diff/duplicates/disk usage |
| **Dev** | `dev_search` | Grep/find by name/content/regex/find-and-replace |
| **Dev** | `dev_intelligence` | Symbols/references/definitions/language detect/imports/framework |
| **Dev** | `dev_debug` | Error parse/stack trace/lint/dependency audit/dead code/TODOs |
| **Dev** | `dev_test` | Run/mock/coverage/report (Jest/Vitest/Pytest) |
| **Dev** | `dev_git` | Clone/commit/push/PR/branch/merge/history/blame |
| **Dev** | `dev_npm` | Install/update/audit/publish/version/script |
| **Dev** | `dev_docker` | Build/run/compose/push/registry/health check |
| **Web** | `web_analyze` | HTML validate/CSS analyze/accessibility/responsive/SEO/performance |
| **Web** | `web_scaffold` | Generate React/Next.js components/routes/forms/hooks/stores |
| **Web** | `web_optimize` | Meta tags/sitemap/robots.txt/PWA manifest/service worker |
| **Web** | `web_transform` | Tailwind config/dark mode/PWA setup/responsive/animations |
| **Web** | `web_screenshot` | Capture webpage (full page/responsive/element/PDF) |
| **Web** | `web_lighthouse` | Performance audit (speed/accessibility/SEO/best practices) |
| **Web** | `web_scrape` | Extract structured data (tables/links/text/JSON-LD) |
| **Database** | `db_query` | Execute SQL (SELECT/INSERT/UPDATE/DELETE/JOIN) |
| **Database** | `db_schema` | Inspect/create/alter tables/indexes/constraints |
| **Database** | `db_backup` | Export/import/snapshot/restore |
| **Database** | `db_migrate` | Run migrations/version control |
| **Database** | `db_analyze` | Query optimization/explain plan/statistics |
| **Database** | `db_connect` | Connect to PostgreSQL/MySQL/SQLite/MongoDB |
| **API** | `api_request` | HTTP (GET/POST/PUT/DELETE/PATCH with auth/headers) |
| **API** | `api_mock` | Create mock endpoints/responses/delays |
| **API** | `api_document` | Generate OpenAPI/Swagger docs from code |
| **API** | `api_test` | Automated API testing (assertions/load test) |
| **API** | `api_transform` | GraphQL/REST conversion/schema validation |
| **API** | `webhook_listen` | Listen for webhooks/events/log traffic |
| **API** | `sdk_generate` | Auto-generate SDK from API spec |
| **AI/ML** | `llm_chat` | Multi-turn conversations (GPT/Claude/Groq/Google) |
| **AI/ML** | `llm_embed` | Text embeddings (semantic search/clustering) |
| **AI/ML** | `llm_finetune` | Fine-tune models on custom data |
| **AI/ML** | `ml_train` | Train models (regression/classification/clustering) |
| **AI/ML** | `ml_predict` | Load/run pre-trained models (inference) |
| **AI/ML** | `llm_router` | Route queries to best LLM by cost/speed/quality |
| **AI/ML** | `llm_cost_optimize` | Analyze LLM costs, suggest cheaper alternatives |
| **AI/ML** | `llm_guardrail` | Detect prompt injection/PII/policy violations |
| **AI/ML** | `llm_evaluate` | Grade AI responses, compare outputs, fact-check |
| **AI/ML** | `feature_engineer` | Feature transforms (log/sqrt/binning/one-hot/lag) |
| **AI/ML** | `model_compare` | Evaluate/rank ML models, cross-validation |
| **Data Science** | `data_profile` | Statistical profiling, distributions, quality |
| **Data Science** | `data_clean` | Auto-clean, dedup, fill nulls, normalize |
| **Data Science** | `data_visualize` | Text/Mermaid charts (bar/scatter/heatmap/pie) |
| **Data Science** | `data_sample` | Random/stratified sampling, train-test split |
| **Data Science** | `outlier_detect` | IQR/Z-score/modified Z-score outlier detection |
| **Data Science** | `data_correlate` | Correlation matrix, pairwise, feature importance |
| **Geo & Location** | `geo_geocode` | Forward/reverse/batch geocoding (Nominatim) |
| **Geo & Location** | `geo_route` | Driving/walking/cycling directions, multi-stop, isochrone |
| **Geo & Location** | `geo_distance` | Haversine distance, matrix, radius query, midpoint |
| **Geo & Location** | `geo_fence` | Create/manage geofences, enter/exit triggers |
| **Geo & Location** | `geo_timezone` | Timezone lookup by coordinates, time conversion |
| **Geo & Location** | `geo_ip_locate` | IP geolocation — single, batch, distance between IPs |
| **Geo & Location** | `geo_poi` | Points of interest search (restaurants, ATMs, hospitals) |
| **Geo & Location** | `geo_address_validate` | Validate/parse/standardize addresses, batch validate |
| **Cloud Control** | `cloud_deploy` | Deploy to AWS/GCP/Azure/Vercel/Railway, rollback, health checks |
| **Cloud Control** | `cloud_scale` | Autoscale instances, set replicas, resize CPU/memory |
| **Cloud Control** | `cloud_logs` | View/filter/search/aggregate deployment logs |
| **Cloud Control** | `cloud_secrets` | Encrypted secret vaults (AES-256-GCM), rotate, manage |
| **Cloud Control** | `cloud_cost` | Cost estimation, spending summaries, optimization tips |
| **Cloud Control** | `cloud_domain` | DNS/domain management, SSL certs, DNS lookup |
| **Cloud Control** | `cloud_backup` | Backup/restore/schedule, full/incremental with encryption |
| **Cloud Control** | `cloud_monitor` | Health monitoring, uptime checks, metrics, alerts |
| **Cloud Control** | `cloud_network` | VPC, firewall rules, load balancer, CDN distributions |
| **Security** | `crypto_hash` | SHA/MD5/bcrypt hashing, HMAC, file checksums |
| **Security** | `crypto_encrypt` | Encrypt/decrypt (AES-256-GCM/RSA), key generation |
| **Security** | `crypto_sign` | Sign/verify cryptographic signatures (RSA/ECDSA) |
| **Security** | `scan_secrets` | Detect exposed API keys/credentials in code |
| **Security** | `scan_malware` | Scan for suspicious patterns (eval/shell/SQL injection) |
| **Security** | `auth_generate` | JWT/OAuth tokens/API keys/UUIDs/passwords |
| **Security** | `scan_vulnerabilities` | Scan URLs/code/deps for vulnerabilities + severity scoring |
| **Security** | `policy_enforce` | Create/enforce security policies (OWASP/API/data protection) |
| **Security** | `threat_model` | STRIDE threat modeling, attack trees, risk scoring |
| **Security** | `incident_response` | Incident management, timeline tracking, MTTR dashboard |
| **Security** | `security_audit` | Full security posture audit — OWASP Top 10, HTTP headers, SSL/TLS, scoring |
| **Security** | `security_compliance` | Compliance checking — SOC2, HIPAA, PCI-DSS, GDPR, ISO 27001 |
| **Security** | `security_pentest` | Automated pen-test — XSS, SQLi, CSRF, SSRF, auth bypass, command injection |
| **Security** | `security_rbac` | Role-based access control — roles, permissions, assignments, audit |
| **Security** | `security_firewall` | WAF & firewall — IP blocking, rate limiting, geo-blocking, WAF rules |
| **Security** | `security_forensics` | Digital forensics — IOC detection, log analysis, timeline, evidence, hash checks |
| **Agent** | `agent_memory` | Save/get/search persistent memory with tags |
| **Agent** | `agent_safety` | Content safety checking, rate limiting |
| **Agent** | `agent_ui` | Show messages/warnings/errors/toasts/progress |
| **Agent** | `agent_control` | Switch modes/get state/cancel tasks |
| **Editor** | `editor_select` | Get/insert/replace selection, cursor position |
| **Agent** | `agent_spawn` | Create specialized sub-agents with goals/tools |
| **Agent** | `agent_delegate` | Delegate tasks to sub-agents with tracking |
| **Agent** | `agent_reflect` | Self-evaluation, goal alignment, store learnings |
| **AI Control** | `prompt_template` | Create/render/version parameterized prompt templates |
| **AI Control** | `llm_fallback` | Configure/execute LLM fallback chains |
| **AI Control** | `agent_memory_search` | Search agent memory banks for relevant context |
| **File Mgmt** | `create_file` | Create downloadable file with content |
| **File Mgmt** | `read_file` | Read file contents |
| **File Mgmt** | `modify_file` | Edit file (replace/append modes) |
| **File Mgmt** | `write_file` | Write/overwrite with modes (write/append/prepend/insert) |
| **File Mgmt** | `list_files` | List files in directory |
| **File Mgmt** | `delete_file` | Delete a file |
| **File Mgmt** | `move_file` | Move file to new path |
| **File Mgmt** | `copy_file` | Copy file to new location |
| **File Mgmt** | `rename_file` | Rename a file |
| **File Mgmt** | `create_folder` | Create directory |
| **File Mgmt** | `list_folders` | List directories only |
| **File Mgmt** | `zip_files` | Compress to ZIP archive |
| **File Mgmt** | `unzip_files` | Extract ZIP archive |
| **File Mgmt** | `file_exists` | Check if path exists |
| **File Mgmt** | `get_project_tree` | Full directory tree with sizes |
| **File Mgmt** | `file_watch` | Watch files for change events |
| **File Mgmt** | `sync_files` | Bidirectional sync/diff/backup |
| **Markdown** | `markdown_convert` | Convert markdown to/from HTML, text, JSON |
| **Markdown** | `markdown_validate` | Lint and validate markdown documents |
| **Markdown** | `markdown_generate` | Generate README, changelog, API docs, tables |
| **Markdown** | `markdown_toc` | Auto-generate table of contents from headings |
| **Markdown** | `markdown_format` | Format/beautify markdown documents |
| **Analytics** | `analytics_track` | Log events, page views, batch metrics |
| **Analytics** | `analytics_dashboard` | Real-time stats, event lists, funnel analysis |
| **Analytics** | `log_parse` | Parse/filter/analyze log files |
| **Analytics** | `monitor_health` | Health check endpoints, uptime monitoring |
| **Analytics** | `telemetry_send` | Send/query telemetry metrics |
| **Workflow** | `workflow_create` | Create/manage multi-step pipelines with DAG validation |
| **Workflow** | `workflow_execute` | Run workflows with state tracking |
| **Workflow** | `workflow_schedule` | Cron-based or event-based scheduling |
| **Workflow** | `workflow_visualize` | DAG diagrams, timelines, performance stats |
| **Workflow** | `workflow_optimize` | Parallelization, bottleneck, cost analysis |
| **Knowledge Graph** | `kg_create` | Create/update/delete entities and relations |
| **Knowledge Graph** | `kg_query` | Search, traverse, BFS shortest path, stats |
| **Knowledge Graph** | `kg_visualize` | Mermaid graph diagrams, clusters, matrices |
| **Knowledge Graph** | `kg_merge` | Deduplicate entities (Levenshtein similarity) |
| **Knowledge Graph** | `kg_reason` | Infer relations, detect patterns, suggest connections |
| **Business** | `growth_analyze` | Funnel analysis, cohort retention, churn detection |
| **Business** | `pricing_simulate` | Revenue modeling, elasticity, LTV projections |
| **Business** | `ab_test_run` | Create/manage A/B experiments with variant assignment |
| **Business** | `ab_test_analyze` | Z-test significance, confidence intervals, sample size |
| **Business** | `lead_enrich` | Enrich leads via DNS/MX/website analysis + scoring |
| **Business** | `campaign_generate` | Ad/email/social/SMS campaign generation with ROI |
| **Collaboration** | `team_invite` | Invite/accept/remove team members |
| **Collaboration** | `role_assign` | RBAC permissions, role hierarchy |
| **Collaboration** | `comment_thread` | Discussion threads, replies, reactions |
| **Collaboration** | `task_assign` | Tasks with priority/labels/Kanban board |
| **Collaboration** | `approval_flow` | Multi-step approvals with decision tracking |
| **Collaboration** | `activity_log` | Log, query, and stats on activity events |
| **Collaboration** | `access_audit` | Audit resource access with trail & reports |
| **Collaboration** | `notify_team` | Send/list/mark-read team notifications |

> **Other providers** (Groq, Cerebras, Mistral, xAI, Gemini) use the mode-based approach: `activeTool` selects web_search, deep_research, thinking, or image_gen modes.

---

## Backend Architecture (Supporting Universal Chat)

### Route Files (39 files in `backend/routes/`)

```
backend/routes/
├── chat.js                      # Main chat endpoint (multi-provider)
├── chat-session-routes.js       # Session CRUD (/api/sessions)
├── canvas-routes.js             # Canvas IDE (114 switch cases for tool execution)
├── agent-chat-routes.js         # Agent chat with tool calling
├── agent-routes.js              # Agent management
├── agent-memory-routes.js       # Agent memory CRUD
├── agent-system-routes.js       # Agent system management
├── agents.js                    # Agent registry
├── agentSubscriptions.js        # Agent subscription billing
├── ai-core-routes.js            # AI core provider routing
├── analytics.js                 # Analytics tracking
├── api-router.js                # Central API router (mounts all sub-routers)
├── asset-routes.js              # Asset management (S3)
├── billing.js                   # Stripe billing
├── build-routes.js              # Build pipeline
├── canvas-apps-routes.js        # Canvas app CRUD
├── canvas-deploy-routes.js      # Canvas deploy to S3
├── canvas-deploy-external-routes.js  # Deploy to Vercel/Netlify/Railway/Cloudflare
├── canvas-files-routes.js       # Canvas S3 file management
├── canvas-project-routes.js     # Canvas multi-file projects
├── careers.js                   # Careers page
├── community.js                 # Community features
├── database-routes.js           # Database management
├── deploy-routes.js             # General deployment
├── email-notifications.js       # Email notifications
├── favorites.js                 # User favorites
├── gamification.js              # Gamification system
├── marketplace-routes.js        # Agent marketplace
├── media-routes.js              # Media upload/processing
├── missing-endpoints.js         # Catch-all for missing endpoints
├── monitoring-routes.js         # System monitoring
├── sandbox-routes.js            # Sandbox management (ECS)
├── sts-routes.js                # AWS STS tokens
├── studio-stats-routes.js       # Canvas Studio statistics
├── suggestions.js               # AI suggestions
├── support.js                   # Support tickets
├── uploads.js                   # File uploads
├── user.js                      # User management
└── webinars.js                  # Webinar registration
```

### Core Libraries (16 files in `backend/lib/`)

```
backend/lib/
├── canvas-ide-tools.js          # ⭐ 210 tool schemas (Anthropic/OpenAI native tool calling)
├── image-tools.js               # 9 image tools (Sharp, 100+ actions)
├── video-tools.js               # 11 video tools (FFmpeg, 55+ actions)
├── archive-tools.js             # 10 archive tools (ZIP/TAR, 60+ actions)
├── data-tools.js                # 8 data tools (xlsx/cheerio, 51 actions)
├── azure-vision-service.js      # Azure Computer Vision 4.0
├── agent-memory-service.js      # Agent memory persistence
├── agent-tools-service.js       # Agent tool execution engine
├── analytics-tracker.js         # Analytics tracking middleware
├── smart-ai-router.js           # Smart AI provider routing
├── cache.js                     # Redis cache wrapper
├── db.js                        # MongoDB connection
├── prisma.js                    # Prisma client singleton
├── account-lockout.js           # Account lockout protection
├── tracking-middleware.js        # Request tracking
└── validation-utils.js          # Input validation utilities
```

### Extended Tool Categories (20 files in `backend/lib/tools/`)

```
backend/lib/tools/
├── core-tools.js                # Core utilities
├── file-tools-extended.js       # Extended file operations
├── markdown-tools.js            # Markdown parsing/generation
├── analytics-tools.js           # Session analytics
├── workflow-tools.js            # Workflow automation
├── knowledge-graph-tools.js     # Knowledge Graph CRUD
├── business-tools.js            # Business/Growth tools
├── collaboration-tools.js       # Team/Collaboration
├── ai-ml-tools.js               # AI/ML operations
├── security-tools.js            # Security scans
├── advanced-security-tools.js   # Advanced security
├── dev-tools.js                 # DevOps/CI-CD
├── web-tools.js                 # Web/HTTP tools
├── db-tools.js                  # Database tools
├── api-tools.js                 # API mock/webhooks
├── geo-tools.js                 # Geospatial tools
├── data-science-tools.js        # Data Science
├── document-tools.js            # Document generation
├── cloud-tools.js               # Cloud deployment
└── advanced-ai-tools.js         # Advanced AI tools
```

### Services (18 directories/files in `backend/services/`)

```
backend/services/
├── agent/                       # Agent service layer
├── agent-system/                # Agent system (agents/ subdirectory)
├── ai-core/                     # AI core service
├── assets/                      # Asset pipeline
├── build/                       # Build service
├── canvas/                      # Canvas app service
├── database/                    # Database service
├── deploy/                      # Deploy orchestrator
├── git/                         # Git operations
├── marketplace/                 # Marketplace service
├── monitoring/                  # Monitoring service
├── sandbox/                     # Sandbox management (ECS)
├── agentCollectionHub.js        # Agent collection manager
├── aiProviderService.js         # AI provider abstraction
├── email.js                     # Email service (SES)
├── media-service.js             # Media processing
├── runway-video-service.js      # Runway ML video generation
└── subscription-cron.js         # Subscription cron jobs
```

### MongoDB Models (29 files in `backend/models/`)

```
backend/models/
├── User.js                      # User model (legacy)
├── ChatSession.js               # Chat sessions (legacy)
├── ChatCanvasFile.js            # Canvas files
├── ChatCanvasHistory.js         # Canvas history
├── ChatCanvasProject.js         # Canvas projects
├── ChatFeedback.js              # Chat feedback (like/dislike)
├── ChatQuickAction.js           # Quick action buttons
├── ChatSettings.js              # Chat settings
├── AgentFile.js                 # Agent uploaded files
├── AgentMemory.js               # Agent memory entries
├── Analytics.js                 # Analytics events
├── CommunityComment.js          # Community comments
├── CommunityEvent.js            # Community events
├── CommunityGroup.js            # Community groups
├── CommunityLike.js             # Community likes
├── CommunityMembership.js       # Community memberships
├── CommunityMetrics.js          # Community metrics
├── CommunityModeration.js       # Community moderation
├── CommunityPost.js             # Community posts
├── CommunitySuggestion.js       # Community suggestions
├── Consultation.js              # Consultations
├── ContactMessage.js            # Contact form
├── JobApplication.js            # Job applications
├── LabExperiment.js             # Lab experiments
├── SupportTicket.js             # Support tickets
├── Transaction.js               # Billing transactions
├── UserFavorites.js             # User favorites
├── WebinarRegistration.js       # Webinar registrations
└── index.js                     # Model index (exports all)
```

### Prisma Schema — 2,277 lines, 81 models

Located at `backend/prisma/schema.prisma`. Key models for Universal Chat:

| Model | Purpose |
|-------|---------|
| `User` | User accounts, preferences, subscription status |
| `ChatSession` | Chat sessions (title, messages JSON, userId) |
| `ChatMessage` | Individual chat messages |
| `ChatFeedback` | Message likes/dislikes |
| `CanvasApp` | Canvas app definitions |
| `CanvasDeployCredential` | Encrypted deploy credentials (AES-256-GCM) |
| `CanvasDeployHistory` | Deploy history log |
| `Agent` | AI agent definitions |
| `AgentMemory` | Agent persistent memory (KV) |
| `GamificationProfile` | User gamification metrics |
| `AnalyticsEvent` | Analytics tracking |
| `StudioPlan` | Canvas Studio subscription plans |
| ... | 69 more models for other features |

---

## Key Architecture Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Session Storage** | DB-first via `/api/sessions` + in-memory cache — **NO localStorage** | Persistence across devices, server-side backup, privacy compliance |
| **Guest Sessions** | In-memory only (ephemeral) | No tracking without consent, clean on refresh |
| **Auth Storage** | In-memory `_inMemoryUser` via `secureAuthStorage` | XSS protection — never in localStorage or cookies |
| **Theme Persistence** | Cookie (`theme`, 365d) | Fastest possible load (no flash of wrong theme) |
| **AI Multi-provider** | 7 providers via backend routing | Redundancy, cost optimization, capability diversity |
| **Tool Calling** | 233 Canvas tools + 183 Universal Chat tools (Anthropic/OpenAI native) + legacy prompt injection | Best-of-both — structured for capable models, fallback for others |
| **Embedded Canvas** | Separate Vite SPA in `canvas-studio/` subdirectory | Independent build, no Next.js overhead for heavy IDE |
| **Voice Calls** | WebSocket via `realtimeChatService.ts` | Low-latency real-time communication |

---

## AI Providers

| Provider | Models | Tool Calling | Endpoint |
|----------|--------|-------------|----------|
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku | ✅ Native (233 Canvas / 183 Universal Chat tools) | `/api/canvas/agent-chat` + `/api/studio/chat/stream` |
| **OpenAI** | GPT-4o, GPT-4o-mini | ✅ Native (233 Canvas / 183 Universal Chat tools) | `/api/canvas/agent-chat` + `/api/studio/chat/stream` |
| **Groq** | Llama 3.1, Mixtral | ❌ Prompt injection | `/api/chat` |
| **Cerebras** | Llama 3.1 | ❌ Prompt injection | `/api/chat` |
| **Mistral** | Mistral Large, Codestral | ❌ Prompt injection | `/api/chat` |
| **xAI** | Grok-2 | ❌ Prompt injection | `/api/chat` |
| **Google** | Gemini 1.5 Pro, Gemini Flash | ❌ Client-side SDK | `geminiService.ts` |

---

## Key State

| State | Location | Scope |
|-------|----------|-------|
| `sessions` | `sessionService.ts` `_memSessions` Map | Module-level (in-memory cache of DB data) |
| `activeSessionId` | `sessionService.ts` `_memActiveId` | Module-level |
| `messages` | `App.tsx` React state (loaded from session) | Component |
| `likedMessages` / `dislikedMessages` | `ChatBox.tsx` in-memory Sets | Component |
| `pinnedMessages` | `ChatBox.tsx` `_pinnedMessages` Set | Module-level |
| `isDarkMode` | `App.tsx` React state (from cookie) | Component |
| `currentUser` | `App.tsx` React state (from `secureAuthStorage`) | Component |
| `guestId` | `App.tsx` (from `maula_guest` cookie) | Component |
| Canvas editor state | `editorBridge.ts` Zustand store | Zustand (via canvas-studio) |

---

## Features

| Feature | Status | Details |
|---------|--------|---------|
| Multi-provider AI chat | ✅ Live | 7 providers, auto-routing |
| Native tool calling | ✅ Live | 233 Canvas tools + 183 Universal Chat tools via Anthropic/OpenAI |
| SSE streaming | ✅ Live | Real-time token streaming |
| Session management | ✅ Live | DB-first, in-memory cache, NO localStorage |
| Real-time voice calls | ✅ Live | WebSocket, `VoiceCallModal.tsx` |
| Canvas Studio (embedded) | ✅ Live | Monaco Editor, terminal, deploy, tools |
| Image processing | ✅ Live | 9 tools, 100+ actions (Sharp + Azure) |
| Video processing | ✅ Live | 11 tools, 55+ actions (FFmpeg) |
| Archive processing | ✅ Live | 10 tools, 60+ actions (ZIP/TAR) |
| Data processing | ✅ Live | 8 tools, 51 actions (xlsx/cheerio) |
| Extended tools | ✅ Live | 20 categories (markdown, analytics, workflow, etc.) |
| File panel | ✅ Live | `FilePanel.tsx` — file upload/management |
| Dark mode | ✅ Live | Cookie-persisted theme toggle |
| Guest support | ✅ Live | Cookie ID, in-memory sessions |
| Gamification | ✅ Live | XP, streaks, badges (DB-backed) |

---

## Changelog (Recent)

| Date | Commit | Change |
|------|--------|--------|
| Feb 21, 2026 | `d3667b3` | **Core tools audit** — Added 7 native tools to Universal Chat (web_search, fetch_url, execute_code, calculate, get_current_time, get_weather, generate_video) via STUDIO_CORE_TOOLS in missing-endpoints.js |
| Feb 21, 2026 | — | **Document/audio tools audit** — Added 7 more native tools to Universal Chat (parse_pdf, parse_docx, parse_csv, parse_json, parse_markdown, parse_html, transcribe_audio) — 14 total |
| Feb 21, 2026 | — | **Image tools audit** — Added 13 image tools to Universal Chat (generate_image, image_create, image_transform, image_convert, image_compose, image_filter, image_analyze, image_batch, image_background, image_face, image_ai, image_export, image_ocr) — 27 total |
| Feb 21, 2026 | — | **Video tools audit** — Added 8 video tools to Universal Chat (video_transform, video_convert, video_analyze, video_overlay, video_filter, video_audio, video_ai, video_batch) — 35 total |
| Feb 21, 2026 | — | **Archive tools audit** — Added 8 archive tools to Universal Chat (archive_core, archive_edit, archive_structure, archive_security, archive_bulk, archive_convert, archive_intelligence, archive_deploy) — 43 total |
| Feb 21, 2026 | — | **Dev tools audit** — Added 8 dev tools to Universal Chat (dev_filesystem, dev_search, dev_intelligence, dev_debug, dev_test, dev_git, dev_npm, dev_docker) — 51 total |
| Feb 21, 2026 | — | **Web tools audit** — Added 7 web tools to Universal Chat (web_analyze, web_scaffold, web_optimize, web_transform, web_screenshot, web_lighthouse, web_scrape) — 58 total |
| Feb 21, 2026 | — | **Database tools audit** — Added 6 database tools to Universal Chat (db_query, db_schema, db_backup, db_migrate, db_analyze, db_connect) — 64 total |
| Feb 21, 2026 | — | **API tools audit** — Added 7 API tools to Universal Chat (api_request, api_mock, api_document, api_test, api_transform, webhook_listen, sdk_generate) — 71 total |
| Feb 21, 2026 | — | **AI/ML tools audit** — Added 11 AI/ML tools to Universal Chat (llm_chat, llm_embed, llm_finetune, ml_train, ml_predict, llm_router, llm_cost_optimize, llm_guardrail, llm_evaluate, feature_engineer, model_compare) — 82 total |
| Feb 21, 2026 | — | **Security tools audit** — Added 10 security tools to Universal Chat (crypto_hash, crypto_encrypt, crypto_sign, scan_secrets, scan_malware, auth_generate, scan_vulnerabilities, policy_enforce, threat_model, incident_response) — 92 total |
| Feb 21, 2026 | — | **Agent/Editor tools audit** — Added 8 agent/editor tools to Universal Chat (agent_memory, agent_safety, agent_ui, agent_control, editor_select, agent_spawn, agent_delegate, agent_reflect) — 100 total |
| Feb 21, 2026 | — | **File Management tools audit** — Added 17 file tools to UC (create_file, read_file, modify_file, write_file, list_files, delete_file, move_file, copy_file, rename_file, create_folder, list_folders, zip_files, unzip_files, file_exists, get_project_tree, file_watch, sync_files) + 6 Canvas schemas — 117 UC / 210 Canvas |
| Feb 21, 2026 | — | **Markdown/Content tools audit** — Added 5 markdown tools to UC (markdown_convert, markdown_validate, markdown_generate, markdown_toc, markdown_format) — 122 UC total |
| Feb 21, 2026 | — | **Analytics/Monitoring tools audit** — Added 5 analytics tools to UC (analytics_track, analytics_dashboard, log_parse, monitor_health, telemetry_send) — 127 UC total |
| Feb 21, 2026 | — | **Workflow Engine tools audit** — Added 5 workflow tools to UC (workflow_create, workflow_execute, workflow_schedule, workflow_visualize, workflow_optimize) — 132 UC total |
| Feb 21, 2026 | — | **Knowledge Graph tools audit** — Added 5 KG tools to UC (kg_create, kg_query, kg_visualize, kg_merge, kg_reason) — 137 UC total |
| Feb 21, 2026 | — | **Business & Growth tools audit** — Added 6 business tools to UC (growth_analyze, pricing_simulate, ab_test_run, ab_test_analyze, lead_enrich, campaign_generate) — 143 UC total |
| Feb 21, 2026 | — | **Advanced Security extras** — Added 6 NEW full-stack security tools (security_audit, security_compliance, security_pentest, security_rbac, security_firewall, security_forensics) to all layers — 183 UC / 233 Canvas total |
| Feb 21, 2026 | — | **Cloud Control tools audit** — Added 5 missing (cloud_deploy, cloud_scale, cloud_logs, cloud_secrets, cloud_cost) + 4 NEW extras (cloud_domain, cloud_backup, cloud_monitor, cloud_network) to all layers — 177 UC / 227 Canvas total |
| Feb 21, 2026 | — | **Geo & Location tools audit** — Added 4 missing (geo_geocode, geo_route, geo_distance, geo_fence) + 4 NEW extras (geo_timezone, geo_ip_locate, geo_poi, geo_address_validate) to all layers — 168 UC / 223 Canvas total |
| Feb 21, 2026 | — | **Data Science tools audit** — Added 3 missing (data_profile, data_clean, data_visualize) + 3 NEW extras (data_sample, outlier_detect, data_correlate) to all layers — 160 UC / 219 Canvas total |
| Feb 21, 2026 | — | **Advanced AI Control extras** — Added 3 NEW tools (prompt_template, llm_fallback, agent_memory_search) to all layers — 154 UC / 216 Canvas total |
| Feb 21, 2026 | — | **Collaboration extras** — Added 3 NEW collaboration tools (activity_log, access_audit, notify_team) to all layers (backend, Canvas, UC) — 151 UC / 213 Canvas total |
| Feb 21, 2026 | — | **Collaboration tools audit** — Added 5 collaboration tools to UC (team_invite, role_assign, comment_thread, task_assign, approval_flow) — 148 UC total |
| Feb 18, 2026 | `9b01d81` | **localStorage elimination** — all 13 source files migrated to DB/cookie/in-memory |
| Feb 17, 2026 | `178499c` | **V3.0 Tool Ecosystem** — 46 new tools, 9 categories, 15 Prisma models |
| Feb 16, 2026 | Multiple | V2.0 Tool Ecosystem, audit & fixes |
| Feb 12, 2026 | — | Initial architecture document |
