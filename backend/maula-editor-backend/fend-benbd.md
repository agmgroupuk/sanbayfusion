# Maula Editor — Full Stack Documentation

> **Domain:** editor.onelastai.co  
> **Backend Port:** 3204 (PM2 id=3)  
> **Webroot:** `/var/www/editor/`  
> **SW Cache Version:** maula-editor-v2  

---

## 1. Overview

Maula Editor is a full-featured cloud IDE with AI-powered code editing, LSP intelligence, Git integration, live preview, sandbox execution, file management, project management, deployment, collaboration, debugging, extensions, remote development, and Docker support. It is the most feature-rich app in the One Last AI ecosystem.

---

## 2. Frontend

| Key | Value |
|-----|-------|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS + custom CSS |
| Entry Point | `frontend/maula-editor/index.tsx` |
| Root Component | `frontend/maula-editor/App.tsx` |
| PWA | `public/manifest.json` + `public/sw.js` |

### 2.1 Core Components

| File | Purpose |
|------|---------|
| `CodeEditor.tsx` | Main code editor (Monaco-based) |
| `Editor.tsx` | Editor layout wrapper |
| `FileExplorer.tsx` | File tree explorer |
| `FileProjectManager.tsx` | Project file management |
| `IntegratedTerminal.tsx` | Integrated terminal |
| `IntegratedTerminalAdvanced.tsx` | Advanced terminal features |
| `RealtimeTerminal.tsx` | Real-time terminal |
| `LivePreview.tsx` | Live code preview |
| `Preview.tsx` | Preview panel |
| `CloudPreview.tsx` | Cloud-hosted preview iframe |
| `Sidebar.tsx` | Left sidebar navigation |
| `Toolbar.tsx` | Top toolbar |
| `SplitPane.tsx` | Resizable split pane layout |
| `Overlay.tsx` | Landing overlay with animated CTA |
| `MaulaNavDrawer.tsx` | Navigation drawer |
| `RainCanvas.tsx` | Animated rain background effect |
| `LazyLoadFallback.tsx` | Lazy loading fallback component |

### 2.2 AI Components

| File | Purpose |
|------|---------|
| `AgenticAIChat.tsx` (root) | Top-level agentic AI chat |
| `components/AgenticAIChat.tsx` | Agentic AI chat component |
| `components/AgenticAIChat-utf8.tsx` | UTF-8 variant |
| `AIChat.tsx` | Standard AI chat panel |
| `AIExtensionPanel.tsx` | AI extension settings |
| `AIIntegrationPanel.tsx` | AI integration config |
| `AIAgentExtensionSettings.tsx` | Agent extension settings |
| `CodeIntelligencePanel.tsx` | AI code intelligence |
| `CopilotChat.tsx` | Copilot-style chat |
| `CopilotSettings.tsx` | Copilot configuration |
| `CopilotStatus.tsx` | Copilot status indicator |
| `InlineCodeSuggestion.tsx` | Inline code suggestions |

### 2.3 Editor & Development

| File | Purpose |
|------|---------|
| `SearchPanel.tsx` | Search across files |
| `SearchReplaceAdvanced.tsx` | Advanced search & replace |
| `QuickOpen.tsx` | Quick file open (Cmd+P) |
| `QuickOpenAdvanced.tsx` | Advanced quick open |
| `DebugPanel.tsx` | Debugging panel |
| `ExtensionsPanel.tsx` | Extensions marketplace |
| `ExtensionMarketplacePanel.tsx` | Extensions browser |
| `PackagingPanel.tsx` | Package management |
| `TechStackPanel.tsx` | Tech stack configuration |

### 2.4 Git & Version Control

| File | Purpose |
|------|---------|
| `GitPanel.tsx` | Git operations panel |
| `ProductionGitPanel.tsx` | Production git workflow |
| `GitIntegrationAdvanced.tsx` | Advanced git features |
| `VersionControlPanel.tsx` | Version control overview |

### 2.5 Deployment & Hosting

| File | Purpose |
|------|---------|
| `DeployPanel.tsx` | Deployment configuration |
| `EnhancedDeployPanel.tsx` | Enhanced deployment features |
| `RemoteDevelopmentPanel.tsx` | Remote dev environments |

### 2.6 Project & Workspace

| File | Purpose |
|------|---------|
| `SettingsPanel.tsx` | Editor & project settings |
| `CollaborationPanel.tsx` | Real-time collaboration |
| `WorkspaceManager.tsx` | Workspace management |
| `TemplateGallery.tsx` | Template browser |
| `PrebuiltTemplatesGallery.tsx` | Prebuilt template gallery |
| `TaskRunnerPanel.tsx` | Task runner UI |
| `AnalyticsPanel.tsx` | Analytics dashboard |

### 2.7 Billing & Auth

| File | Purpose |
|------|---------|
| `BillingPanel.tsx` | Billing and credits |
| `UsageDashboard.tsx` | Usage statistics |
| `AuthModal.tsx` | Authentication modal |

### 2.8 File Management

| File | Purpose |
|------|---------|
| `components/file-management/index.ts` | File management module |

### 2.9 Data

| File | Purpose |
|------|---------|
| `data/prebuiltTemplates.ts` | Prebuilt project templates |
| `data/templates.ts` | Template definitions |

### 2.10 Utilities

| File | Purpose |
|------|---------|
| `fetchUtil.ts` | Authenticated fetch wrapper |
| `constants.tsx` | API URLs, app constants |

### 2.11 Configuration

| File | Purpose |
|------|---------|
| `vite.config.ts` (inferred) | Vite build config |
| `postcss.config.js` | PostCSS plugins |
| `package.json` | Frontend dependencies |
| `metadata.json` | App metadata |
| `index.css` | Main CSS styles |

### 2.12 Desktop (Electron)

| File | Purpose |
|------|---------|
| `desktop/main.js` | Electron main process |
| `desktop/preload.js` | Electron preload script |
| `desktop/package.json` | Desktop app config |
| `desktop/icons/icon.png` | App icon |

### 2.13 Server (NestJS — Advanced Backend)

The frontend includes a NestJS-based server for advanced features:

| Path | Purpose |
|------|---------|
| `server/nest-src/main.ts` | NestJS entry point |
| `server/nest-src/app.module.ts` | Root module |
| `server/nest-src/config/configuration.ts` | Config |
| `server/nest-src/modules/ai/` | AI controller, service, image service |
| `server/nest-src/modules/ai-core/` | AI core (RAG, embeddings, LangGraph, vector store, prompt orchestration) |
| `server/nest-src/modules/auth/` | Auth module (JWT, guards, decorators) |
| `server/nest-src/modules/collaboration/` | Collaboration (WebSocket gateway, CRDT) |
| `server/nest-src/common/prisma/` | Prisma module/service |
| `server/nest-src/common/services/` | Logger, vector service |
| `server/nest-src/common/middleware/` | Request logger middleware |
| `server/nest-src/grpc/protos/` | gRPC proto definitions (ai, file, project) |

### 2.14 Docker & Deployment (Frontend)

| File | Purpose |
|------|---------|
| `Dockerfile.frontend` | Frontend Docker build |
| `docker-compose.yml` | Docker compose config |
| `server/Dockerfile` | Server Docker build |
| `server/Dockerfile.aws` | AWS-optimized Docker build |
| `server/docker-compose.aws.yml` | AWS Docker compose |
| `server/deploy-aws.sh` | AWS deploy script |
| `server/localstack-init.sh` | LocalStack init script |
| `deploy-ec2.bat` | EC2 deploy (Windows) |
| `deploy.sh` | Deploy script |

### 2.15 Nginx Configs (Frontend)

| File | Purpose |
|------|---------|
| `nginx/default.conf` | Default nginx config |
| `nginx/frontend.conf` | Frontend nginx config |
| `nginx/spaces-app.conf` | Spaces app nginx config |

### 2.16 Styling

- `index.css` — Main styles (+ backup files)

---

## 3. Backend

| Key | Value |
|-----|-------|
| Runtime | Node.js + Express |
| ORM | Prisma |
| Auth | JWT (jose) + Cookie-based sessions + OAuth (Google, GitHub, Yahoo, Microsoft) |
| Email | Nodemailer |
| Payments | Stripe |
| AI Providers | OpenAI, Anthropic, Google Gemini, Groq, xAI |
| File Processing | Sharp (images), Multer (uploads), pdf-parse, mammoth |
| Collaboration | Yjs + y-websocket |
| Cloud | AWS S3, ECS, DynamoDB |
| Docker | Dockerode |
| Database Direct | pg (PostgreSQL driver) |
| Entry Point | `backend/maula-editor/server.js` |

### 3.1 Server Middleware

- Helmet (security headers)
- CORS (cross-origin)
- Rate limiting (general, auth, AI)
- Cookie parser
- Content safety middleware
- JSON body parser (50MB limit)

### 3.2 Routes

| File | Mount Path | Purpose |
|------|-----------|---------|
| `routes/maulaEditorApp.js` | `/api` | Main app routes (billing, AI, canvas, secrets, LSP, media, sandbox, extensions) |
| `routes/files.js` | `/api/files` | File extraction and management |
| `routes/project.js` | `/api/project` | Project CRUD, files, env, git operations |

### 3.3 Libraries

| File | Purpose |
|------|---------|
| `lib/prisma.js` | Prisma client singleton |
| `lib/contentSafety.js` | Content safety filtering middleware |
| `lib/db.js` | Direct PostgreSQL connection |
| `lib/redis.js` | Redis client (caching) |
| `lib/repositories.js` | Database repository pattern |

---

## 4. API Endpoints

### 4.1 Authentication (server.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Register new account |
| POST | `/api/auth/verify-email` | No | Verify email with OTP |
| POST | `/api/auth/resend-code` | No | Resend verification code |
| POST | `/api/auth/login` | No | Login with credentials |
| POST | `/api/auth/verify-login-otp` | No | Verify login OTP |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/verify-reset-token` | No | Verify reset token |
| POST | `/api/auth/reset-password` | No | Set new password |
| GET | `/api/auth/me` | Yes | Get current user (SSO compatible) |
| POST | `/api/auth/logout` | No | Clear session cookies |
| POST | `/api/billing/webhook` | No | Stripe webhook handler |

### 4.2 OAuth (server.js — Maula Exclusive)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google` | No | Google OAuth redirect |
| GET | `/api/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/auth/yahoo` | No | Yahoo OAuth redirect |
| GET | `/api/auth/yahoo/callback` | No | Yahoo OAuth callback |
| GET | `/api/auth/microsoft` | No | Microsoft OAuth redirect |
| GET | `/api/auth/microsoft/callback` | No | Microsoft OAuth callback |
| GET | `/api/auth/github` | No | GitHub OAuth redirect |
| GET | `/api/auth/github/callback` | No | GitHub OAuth callback |

### 4.3 Dashboard & Stats (server.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/status` | No | App status |
| GET | `/api/admin/stats` | No | Admin statistics |
| GET | `/api/dashboard` | Yes | Dashboard data |
| GET | `/api/usage/stats` | Yes | Usage statistics |
| GET | `/api/chat/dashboard/stats` | Yes | Chat dashboard stats |
| GET | `/api/hosting/dashboard` | Yes | Hosting dashboard |

### 4.4 Billing (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | No | SSO user lookup |
| GET | `/api/billing/credits` | Yes | Get user credits |
| POST | `/api/billing/checkout/:appId` | Yes | Create checkout session |
| POST | `/api/billing/verify` | Yes | Verify payment |
| GET | `/api/billing/packages/:appId` | No | List credit packages |

### 4.5 AI & Chat (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/send` | Yes | Send chat message |
| GET | `/api/chat/dashboard/usage` | Yes | Chat usage stats |
| POST | `/api/ai/chat` | Yes | AI chat |
| POST | `/api/ai/chat/stream` | Yes | AI chat streaming |
| GET | `/api/ai/image/status` | No | Image service status |
| POST | `/api/ai/image/generate` | Yes | AI image generation |
| POST | `/api/ai/image/edit` | Yes | AI image editing |
| POST | `/api/ai/image/variation` | Yes | AI image variation |

### 4.6 Canvas AI (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/canvas/stream` | Yes | Streaming code generation |
| POST | `/api/canvas/agent-stream` | Yes | Agent streaming response |

### 4.7 Secrets Management (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/secrets/:category/:key` | Yes | Get secret |
| GET | `/api/secrets` | Yes | List secrets |
| POST | `/api/secrets` | Yes | Create secret |
| DELETE | `/api/secrets/:category/:key` | Yes | Delete secret |
| POST | `/api/secrets/batch` | Yes | Batch create secrets |

### 4.8 Projects V1 (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/projects` | Yes | Create project |
| GET | `/api/v1/projects` | Yes | List projects |
| GET | `/api/v1/projects/:projectId` | Yes | Get project |
| POST | `/api/v1/projects/:projectId/sync` | Yes | Sync project |
| POST | `/api/v1/files` | Yes | Create file |
| DELETE | `/api/v1/files/:fileId` | Yes | Delete file |
| GET | `/api/v1/files/project/:projectId` | Yes | List project files |

### 4.9 LSP (Language Server Protocol) (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lsp/diagnostics` | Yes | Code diagnostics |
| POST | `/api/lsp/completions` | Yes | Code completions |
| POST | `/api/lsp/hover` | Yes | Hover information |
| POST | `/api/lsp/definition` | Yes | Go to definition |
| POST | `/api/lsp/references` | Yes | Find references |
| POST | `/api/lsp/signature` | Yes | Signature help |
| POST | `/api/lsp/symbols` | Yes | Document symbols |
| POST | `/api/lsp/format` | Yes | Code formatting |
| POST | `/api/lsp/refactor` | Yes | Code refactoring |
| POST | `/api/lsp/rename` | Yes | Symbol rename |
| POST | `/api/lsp/analyze` | Yes | Code analysis |

### 4.10 Media (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/media/status` | No | Media service status |
| POST | `/api/media/upload/base64` | Yes | Upload base64 media |
| POST | `/api/media/upload` | Yes | Upload media file |
| GET | `/api/media/recent` | Yes | Recently uploaded media |

### 4.11 Sandbox (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sandbox/start` | Yes | Start sandbox |
| POST | `/api/sandbox/:sessionId/stop` | Yes | Stop sandbox |
| GET | `/api/sandbox/:sessionId/status` | Yes | Sandbox status |
| GET | `/api/sandbox/sessions` | Yes | List sessions |
| POST | `/api/sandbox/:sessionId/deploy` | Yes | Deploy from sandbox |
| POST | `/api/sandbox/:sessionId/proxy/init` | Yes | Init proxy |
| POST | `/api/sandbox/:sessionId/proxy/write` | Yes | Write via proxy |
| GET | `/api/sandbox/:sessionId/proxy/read` | Yes | Read via proxy |
| GET | `/api/sandbox/:sessionId/proxy/list` | Yes | List via proxy |
| POST | `/api/sandbox/:sessionId/proxy/exec` | Yes | Exec via proxy |
| POST | `/api/sandbox/:sessionId/proxy/install` | Yes | Install via proxy |
| POST | `/api/sandbox/:sessionId/proxy/build` | Yes | Build via proxy |
| POST | `/api/sandbox/:sessionId/proxy/dev` | Yes | Dev server via proxy |
| POST | `/api/sandbox/:sessionId/proxy/stop` | Yes | Stop via proxy |
| GET | `/api/sandbox/:sessionId/proxy/output` | Yes | Get proxy output |

### 4.12 Extensions (routes/maulaEditorApp.js → /api)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/extensions` | Yes | List extensions |
| GET | `/api/extensions/:extensionId` | Yes | Get extension detail |

### 4.13 Files (routes/files.js → /api/files)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files/extract` | Yes | Extract uploaded archive |
| GET | `/api/files/supported-types` | No | List supported file types |

### 4.14 Projects (routes/project.js → /api/project)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/project/templates` | Yes | List project templates |
| POST | `/api/project/` | Yes | Create project |
| GET | `/api/project/` | Yes | List projects |
| GET | `/api/project/list` | Yes | List projects (alt) |
| GET | `/api/project/:id` | Yes | Get project |
| PUT | `/api/project/:id` | Yes | Update project |
| DELETE | `/api/project/:id` | Yes | Delete project |
| GET | `/api/project/:id/files` | Yes | List project files |
| POST | `/api/project/:id/files` | Yes | Add project files |
| DELETE | `/api/project/:id/files` | Yes | Delete project files |
| GET | `/api/project/:id/env` | Yes | Get environment vars |
| PUT | `/api/project/:id/env` | Yes | Update environment vars |
| GET | `/api/project/:id/git` | Yes | Git status |
| POST | `/api/project/:id/git/commit` | Yes | Git commit |
| GET | `/api/project/:id/git/branches` | Yes | List branches |
| POST | `/api/project/:id/git/branches` | Yes | Create branch |
| POST | `/api/project/:id/git/push` | Yes | Git push |
| POST | `/api/project/:id/git/pull` | Yes | Git pull |
| POST | `/api/project/:id/git/webhook` | No | Git webhook handler |

---

## 5. AI Tool Services

All tools are in `backend/maula-editor/services/`:

### 5.1 Core AI & Orchestration

| File | Purpose |
|------|---------|
| `aiService.js` | Main AI service (OpenAI, Anthropic, Gemini, Groq, xAI) |
| `agentOrchestrator.js` | Multi-step agent orchestration |
| `toolsHeadquarters.js` | Tool registry and dispatch |
| `tools.js` | Base tool definitions |
| `ai-agent.js` | Standalone AI agent service |

### 5.2 Engine Services

| File | Purpose |
|------|---------|
| `codeEngine.js` | Code generation and execution |
| `imageEngine.js` | AI image generation |
| `videoEngine.js` | AI video generation |
| `backendEngine.js` | Backend code generation |
| `archiveEngine.js` | Archive/zip operations |

### 5.3 Tool Modules (same as other apps)

`codeTools.js`, `imageTools.js`, `videoTools.js`, `backendTools.js`, `archiveTools.js`, `canvasTools.js`, `editorTools.js`, `webFrontendTools.js`, `contentMarkdownTools.js`, `dataScienceTools.js`, `databaseTools.js`, `fileSystemTools.js`, `apiTools.js`

### 5.4 Cloud & Infrastructure

`cloudInfraTools.js`, `cloudControlTools.js`, `deploymentDockerTools.js`, `geoLocationTools.js`

### 5.5 Collaboration & Communication

`collaborationTools.js`, `teamCollaborationTools.js`, `communicationTools.js`, `emailService.js`

### 5.6 Agent System

`agentMemoryTools.js`, `agentControlTools.js`, `agentSafetyTools.js`, `agentUITools.js`

### 5.7 Advanced Tools

`advancedAITools.js`, `aiMlTools.js`, `securityTools.js`, `advancedSecurityTools.js`, `analyticsTools.js`, `testingQATools.js`, `devTools.js`, `documentParsingTools.js`, `dataProcessingTools.js`, `knowledgeGraphTools.js`, `businessGrowthTools.js`, `workflowAutomationTools.js`, `workflowOrchestratorTools.js`

### 5.8 Maula-Editor Exclusive Services

| File | Purpose |
|------|---------|
| `analyticsService.js` | Analytics data collection |
| `build-cache.js` | Build caching system |
| `build-logger.js` | Build log collection |
| `build-orchestrator.js` | Build pipeline orchestration |
| `cliToolsService.js` | CLI tool integration |
| `db-backup.js` | Database backup service |
| `db-migrator.js` | Database migration service |
| `db-provisioner.js` | Database provisioning |
| `db-scaler.js` | Database scaling service |
| `debuggingService.js` | Debugging utilities |
| `deploy-domain.js` | Domain management for deploys |
| `deploy-orchestrator.js` | Deployment orchestration |
| `deploy-rollback.js` | Deployment rollback |
| `deploymentServiceExtended.js` | Extended deployment features |
| `extensionService.js` | Extension management |
| `git-service.js` | Git operations |
| `git-webhook.js` | Git webhook handling |
| `gitServiceExtended.js` | Extended git features |
| `mediaService.js` | Media file handling |
| `remoteDevelopmentService.js` | Remote development support |
| `sandbox-manager.js` | Sandbox lifecycle management |
| `sandbox-templates.js` | Sandbox project templates |
| `sandboxIntegrationService.js` | Sandbox integrations |
| `taskRunnerService.js` | Task runner service |
| `workspaceService.js` | Workspace management |

### 5.9 Storage

| File | Purpose |
|------|---------|
| `imageStorage.js` | Image storage (S3) |
| `azureVision.js` | Azure Computer Vision integration |

---

## 6. Database

**ORM:** Prisma  
**Provider:** PostgreSQL  
**Schema:** `backend/maula-editor/database/prisma/schema.prisma`

### Models

Same schema as Canvas Studio — see Canvas Studio documentation for full model list (75+ models).

---

## 7. Backend Dependencies

Same as Canvas Studio with additions:

| Package | Purpose |
|---------|---------|
| `pg` | Direct PostgreSQL driver |

All other dependencies identical to Canvas Studio (express, prisma, openai, anthropic, google-ai, groq, stripe, jose, bcryptjs, nodemailer, helmet, cors, rate-limit, multer, sharp, pdf-parse, mammoth, axios, dockerode, isomorphic-git, AWS SDKs, adm-zip, archiver, ws, yjs, dotenv, etc.)

---

## 8. Deployment Configuration

| Key | Value |
|-----|-------|
| EC2 Instance | c6i.xlarge, Ubuntu 24.04 |
| Elastic IP | 52.202.100.112 |
| PM2 Process | maula-editor (id=3, port=3204) |
| Nginx Webroot | `/var/www/editor/` |
| Domain | editor.onelastai.co |
| SSL | Let's Encrypt (Certbot) |
| Build Command | `cd frontend/maula-editor && npm run build` |
| Deploy Path | SCP dist → `/var/www/editor/` |

---

## 9. Complete File Tree

```
backend/maula-editor/
├── .env
├── package.json
├── package-lock.json
├── server.js
├── database/
│   └── prisma/
│       └── schema.prisma
├── lib/
│   ├── contentSafety.js
│   ├── db.js
│   ├── prisma.js
│   ├── redis.js
│   └── repositories.js
├── routes/
│   ├── files.js
│   ├── maulaEditorApp.js
│   └── project.js
└── services/
    ├── advancedAITools.js
    ├── advancedSecurityTools.js
    ├── agentControlTools.js
    ├── agentMemoryTools.js
    ├── agentOrchestrator.js
    ├── agentSafetyTools.js
    ├── agentUITools.js
    ├── ai-agent.js
    ├── aiMlTools.js
    ├── aiService.js
    ├── analyticsService.js
    ├── analyticsTools.js
    ├── apiTools.js
    ├── archiveEngine.js
    ├── archiveTools.js
    ├── azureVision.js
    ├── backendEngine.js
    ├── backendTools.js
    ├── build-cache.js
    ├── build-logger.js
    ├── build-orchestrator.js
    ├── businessGrowthTools.js
    ├── canvasTools.js
    ├── cliToolsService.js
    ├── cloudControlTools.js
    ├── cloudInfraTools.js
    ├── codeEngine.js
    ├── codeTools.js
    ├── collaborationTools.js
    ├── communicationTools.js
    ├── contentMarkdownTools.js
    ├── coreUtilityTools.js
    ├── dataProcessingTools.js
    ├── dataScienceTools.js
    ├── databaseTools.js
    ├── db-backup.js
    ├── db-migrator.js
    ├── db-provisioner.js
    ├── db-scaler.js
    ├── debuggingService.js
    ├── deploy-domain.js
    ├── deploy-orchestrator.js
    ├── deploy-rollback.js
    ├── deploymentDockerTools.js
    ├── deploymentServiceExtended.js
    ├── devTools.js
    ├── documentParsingTools.js
    ├── editorTools.js
    ├── emailService.js
    ├── extensionService.js
    ├── fileSystemTools.js
    ├── geoLocationTools.js
    ├── git-service.js
    ├── git-webhook.js
    ├── gitServiceExtended.js
    ├── imageEngine.js
    ├── imageStorage.js
    ├── imageTools.js
    ├── knowledgeGraphTools.js
    ├── mediaService.js
    ├── remoteDevelopmentService.js
    ├── sandbox-manager.js
    ├── sandbox-templates.js
    ├── sandboxIntegrationService.js
    ├── securityTools.js
    ├── taskRunnerService.js
    ├── teamCollaborationTools.js
    ├── testingQATools.js
    ├── tools.js
    ├── toolsHeadquarters.js
    ├── videoEngine.js
    ├── videoTools.js
    ├── webFrontendTools.js
    ├── workflowAutomationTools.js
    ├── workflowOrchestratorTools.js
    └── workspaceService.js

frontend/maula-editor/
├── AgenticAIChat.tsx
├── App.tsx
├── DOCS.md
├── Dockerfile.frontend
├── README.md
├── constants.tsx
├── deploy-ec2.bat
├── deploy.sh
├── docker-compose.yml
├── fetchUtil.ts
├── index.css
├── index.html
├── index.tsx
├── metadata.json
├── package.json
├── package-lock.json
├── postcss.config.js
├── server-auth.ts
├── server-index.ts
├── server-routes-auth.ts
├── components/
│   ├── AIAgentExtensionSettings.tsx
│   ├── AIChat.tsx
│   ├── AIExtensionPanel.tsx
│   ├── AIIntegrationPanel.tsx
│   ├── AgenticAIChat.tsx
│   ├── AgenticAIChat-utf8.tsx
│   ├── AnalyticsPanel.tsx
│   ├── AuthModal.tsx
│   ├── BillingPanel.tsx
│   ├── CloudPreview.tsx
│   ├── CodeEditor.tsx
│   ├── CodeIntelligencePanel.tsx
│   ├── CollaborationPanel.tsx
│   ├── CopilotChat.tsx
│   ├── CopilotSettings.tsx
│   ├── CopilotStatus.tsx
│   ├── DebugPanel.tsx
│   ├── DeployPanel.tsx
│   ├── Editor.tsx
│   ├── EnhancedDeployPanel.tsx
│   ├── ExtensionMarketplacePanel.tsx
│   ├── ExtensionsPanel.tsx
│   ├── FileExplorer.tsx
│   ├── FileProjectManager.tsx
│   ├── GitIntegrationAdvanced.tsx
│   ├── GitPanel.tsx
│   ├── InlineCodeSuggestion.tsx
│   ├── IntegratedTerminal.tsx
│   ├── IntegratedTerminalAdvanced.tsx
│   ├── LazyLoadFallback.tsx
│   ├── LivePreview.tsx
│   ├── MaulaNavDrawer.tsx
│   ├── Overlay.tsx
│   ├── PackagingPanel.tsx
│   ├── PrebuiltTemplatesGallery.tsx
│   ├── Preview.tsx
│   ├── ProductionGitPanel.tsx
│   ├── QuickOpen.tsx
│   ├── QuickOpenAdvanced.tsx
│   ├── RainCanvas.tsx
│   ├── RealtimeTerminal.tsx
│   ├── RemoteDevelopmentPanel.tsx
│   ├── SearchPanel.tsx
│   ├── SearchReplaceAdvanced.tsx
│   ├── SettingsPanel.tsx
│   ├── Sidebar.tsx
│   ├── SplitPane.tsx
│   ├── TaskRunnerPanel.tsx
│   ├── TechStackPanel.tsx
│   ├── TemplateGallery.tsx
│   ├── Toolbar.tsx
│   ├── UsageDashboard.tsx
│   ├── VersionControlPanel.tsx
│   ├── WorkspaceManager.tsx
│   └── file-management/
│       └── index.ts
├── data/
│   ├── prebuiltTemplates.ts
│   └── templates.ts
├── desktop/
│   ├── icons/
│   │   └── icon.png
│   ├── main.js
│   ├── package.json
│   └── preload.js
├── nginx/
│   ├── default.conf
│   ├── frontend.conf
│   └── spaces-app.conf
├── public/
│   ├── favicon.svg
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── logo.png
│   ├── manifest.json
│   ├── storm-bg.jpg
│   └── sw.js
└── server/
    ├── .env.example
    ├── Dockerfile
    ├── Dockerfile.aws
    ├── debug-server.js
    ├── deploy-aws.sh
    ├── docker-compose.aws.yml
    ├── ec2_index.ts
    ├── extension-server.js
    ├── localstack-init.sh
    ├── nest-cli.json
    └── nest-src/
        ├── app.module.ts
        ├── main.ts
        ├── config/
        │   └── configuration.ts
        ├── common/
        │   ├── middleware/
        │   │   └── request-logger.middleware.ts
        │   ├── prisma/
        │   │   ├── prisma.module.ts
        │   │   └── prisma.service.ts
        │   └── services/
        │       ├── logger.module.ts
        │       ├── logger.service.ts
        │       └── vector.service.ts
        ├── grpc/
        │   └── protos/
        │       ├── ai.proto
        │       ├── file.proto
        │       └── project.proto
        └── modules/
            ├── ai/
            │   ├── ai-image.controller.ts
            │   ├── ai-image.service.ts
            │   ├── ai.controller.ts
            │   ├── ai.module.ts
            │   ├── ai.service.ts
            │   └── dto/
            │       └── chat.dto.ts
            ├── ai-core/
            │   ├── ai-agent.service.ts
            │   ├── ai-core.module.ts
            │   ├── embeddings.service.ts
            │   ├── langgraph.service.ts
            │   ├── prompt-orchestration.service.ts
            │   ├── rag.service.ts
            │   └── vector-store.service.ts
            ├── auth/
            │   ├── auth.controller.ts
            │   ├── auth.module.ts
            │   ├── auth.service.ts
            │   ├── decorators/
            │   │   ├── current-user.decorator.ts
            │   │   └── public.decorator.ts
            │   ├── dto/
            │   │   ├── login.dto.ts
            │   │   └── register.dto.ts
            │   ├── guards/
            │   │   └── jwt-auth.guard.ts
            │   └── strategies/
            │       └── jwt.strategy.ts
            └── collaboration/
                ├── collaboration.gateway.ts
                ├── collaboration.module.ts
                ├── collaboration.service.ts
                └── crdt.service.ts
```

---

*Last updated: July 2025*
