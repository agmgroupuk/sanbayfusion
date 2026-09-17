# Maula Editor — Documentation

> Full cloud IDE with Monaco Editor, terminal, git, AI copilot, extensions, and deployment.

**Version:** 2.2.0  
**Last Updated:** February 20, 2026  
**Status:** Phase 8 Agentic IDE ✅ · Multi-Language 14 Languages ✅ · Cloud Sandbox (AWS ECS Fargate) ✅ · Production Ready 🚀

---

## Table of Contents

- [What It Is](#what-it-is)
- [Architecture](#architecture)
- [Components](#components)
- [Tech Stack](#tech-stack)
- [AI Engine](#ai-engine)
- [Multi-Language Support](#multi-language-support)
- [Key Features](#key-features)
- [File Structure](#file-structure)
- [What's Done](#whats-done)
- [What's Next](#whats-next)

---

## What It Is

Maula Editor is the **most comprehensive app** in the platform — a full cloud IDE comparable to VS Code in the browser. It has everything:

- **Monaco Editor** — VS Code's actual editor engine (14 languages, 40+ extensions)
- **WebContainer** — In-browser Node.js runtime (no server needed for preview)
- **Integrated Terminal** — xterm.js with full shell capabilities
- **Git** — isomorphic-git for in-browser version control
- **AI Copilot** — Inline code suggestions, agentic AI chat
- **Extension Marketplace** — Install/manage editor extensions
- **Collaboration** — Socket.io real-time editing
- **Media Processing** — FFmpeg for video/audio in the browser
- **55+ components** — The biggest component library in the platform

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Maula Editor (Cloud IDE)                   │
│  ├── Monaco Editor (code editing)           │
│  ├── WebContainer (Node.js runtime)         │
│  ├── Terminal (xterm.js)                    │
│  ├── File Explorer (project tree)           │
│  ├── Git Panel (isomorphic-git)             │
│  ├── AgenticAIChat (SSE streaming)          │
│  ├── AI Copilot (inline suggestions)        │
│  ├── Live Preview (WebContainer output)     │
│  ├── Extension Marketplace                  │
│  ├── Deploy Panel (Docker + EC2)            │
│  └── 40+ more panels...                     │
└─────────────────────────────────────────────┘
```

**Agentic IDE Flow:**
```
User prompt → POST /api/canvas/stream (SSE)
  → Anthropic Claude Sonnet 4 with native tool_use
  → Backend defines tools → Model chooses → Backend executes
  → SSE events stream to frontend
  → Zustand store updates files/state
  → Monaco Editor reflects changes immediately
  → WebContainer preview auto-refreshes
```

**State Management:** Zustand (persisted) via `useStore`. The largest Zustand store in the platform.

---

## Components

### Core Editor (10)
| Component | Purpose |
|-----------|---------|
| CodeEditor | Monaco Editor (14 languages, 40+ extensions) |
| Editor | Config/prompt editor |
| FileExplorer | Project file tree |
| FileProjectManager | Project-level file ops |
| IntegratedTerminal | xterm.js terminal |
| IntegratedTerminalAdvanced | Enhanced terminal |
| RealtimeTerminal | Real-time terminal |
| LivePreview | WebContainer preview |
| Preview | Alternate preview mode |
| SplitPane | Resizable split panels |

### AI (7)
| Component | Purpose |
|-----------|---------|
| AgenticAIChat | SSE streaming chat with tool events |
| AIChat | General AI chat |
| CopilotChat | Copilot conversation |
| CopilotSettings | Copilot configuration |
| CopilotStatus | Copilot status indicator |
| InlineCodeSuggestion | Ghost text suggestions |
| AIIntegrationPanel | AI provider settings |

### Version Control (4)
| Component | Purpose |
|-----------|---------|
| GitPanel | Basic git operations |
| ProductionGitPanel | Production git workflow |
| GitIntegrationAdvanced | Advanced git features |
| VersionControlPanel | Version history |

### Deploy & Infra (4)
| Component | Purpose |
|-----------|---------|
| DeployPanel | Cloud deployment |
| EnhancedDeployPanel | Advanced deployment |
| PackagingPanel | App packaging |
| RemoteDevelopmentPanel | Remote dev environments |

### Extensions & Search (5)
| Component | Purpose |
|-----------|---------|
| ExtensionMarketplacePanel | Extension marketplace |
| ExtensionsPanel | Installed extensions |
| SearchPanel | File/code search |
| SearchReplaceAdvanced | Advanced find & replace |
| QuickOpen / QuickOpenAdvanced | File quick open (Cmd+P) |

### Analytics & Settings (5)
| Component | Purpose |
|-----------|---------|
| AnalyticsPanel | Usage analytics |
| UsageDashboard | Resource usage |
| SettingsPanel | Editor settings |
| TechStackPanel | Tech stack overview |
| DebugPanel | Debugger interface |

### Workspace (5)
| Component | Purpose |
|-----------|---------|
| WorkspaceManager | Multi-workspace management |
| TaskRunnerPanel | Task runner (npm scripts) |
| CodeIntelligencePanel | Code intelligence |
| CollaborationPanel | Real-time collab |
| TemplateGallery / PrebuiltTemplatesGallery | Project templates |

### Navigation (5)
| Component | Purpose |
|-----------|---------|
| MaulaNavDrawer | Main navigation |
| Sidebar | Side panel |
| Toolbar | Top toolbar |
| Overlay | Splash/onboarding |
| AuthModal | Authentication |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI framework |
| **State** | Zustand (persisted) | Global state management |
| **Bundler** | Vite 6 | Dev server & build |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Code Editor** | Monaco Editor (@monaco-editor/react) | 14 languages, 40+ file extensions |
| **Runtime** | WebContainer API | In-browser Node.js |
| **Terminal** | xterm.js + 5 addons | Full terminal emulation |
| **Git** | isomorphic-git + lightning-fs | In-browser version control |
| **AI** | Anthropic Claude (via backend) | Code generation |
| **AI (secondary)** | @google/genai, @huggingface/inference | Multi-provider |
| **Real-time** | Socket.io | Collaboration |
| **Media** | FFmpeg (WASM) | Video/audio processing |
| **Animation** | Framer Motion | UI animations |
| **Markdown** | react-markdown + remark-gfm | Markdown rendering |

---

## AI Engine

**Backend Route:** `/api/canvas/stream` (SSE)  
**Model:** Anthropic Claude Sonnet 4 with native `tool_use`  
**Copilot:** Inline ghost text suggestions via `InlineCodeSuggestion` component

**7 Backend Tools:**
1. `write_file` — Create/update project files
2. `read_file` — Read file contents
3. `delete_file` — Remove files
4. `list_files` — List project files
5. `search_in_files` — Search across files
6. `run_command` — Execute commands (50+ whitelisted)
7. `deploy_project` — Deploy to cloud

**Code Intelligence:** `codeIntelligence.ts` service (911 lines) — language detection, LSP-like analysis, completion providers for TypeScript, JavaScript, and Python.

---

## Multi-Language Support

**14 languages** with full Monaco Editor syntax highlighting (Monaco natively supports 50+ languages):

| Language | Monaco ID | Extensions | Run Commands |
|----------|----------|------------|--------------|
| JavaScript | javascript | .js, .jsx, .mjs | node, npx, npm, yarn, pnpm, bun |
| TypeScript | typescript | .ts, .tsx | tsc, tsx, npx |
| Python | python | .py | python3, pip, pipenv, poetry |
| PHP | php | .php | php, composer |
| Go | go | .go | go |
| Java | java | .java | java, javac, mvn, gradle |
| C/C++ | c, cpp | .c, .h, .cpp, .cc, .cxx, .hpp | gcc, g++, clang, make, cmake |
| C# | csharp | .cs | dotnet, csc |
| Kotlin | kotlin | .kt, .kts | kotlinc, kotlin |
| Rust | rust | .rs | rustc, cargo |
| SQL | sql | .sql | sqlite3, psql, mysql |
| Shell/Bash | shellscript | .sh, .bash, .zsh | bash, sh, zsh |
| Ruby | ruby | .rb | ruby, gem, bundle, rails |
| Swift | swift | .swift | swift, swiftc |

**File Icons:** 45+ file extension → icon + color mappings in `FILE_ICONS` record.  
**Language Mapping:** 40+ extension → Monaco language ID mappings in `codeIntelligence.ts`.  
**Backend:** 50+ whitelisted commands across all 14 languages.

---

## Key Features

- **Monaco Editor** — VS Code's editor engine in the browser
- **WebContainer** — Full Node.js runtime (no server needed)
- **Integrated Terminal** — xterm.js with search, web-links, unicode, serialize addons
- **In-Browser Git** — isomorphic-git for commits, branches, push/pull
- **AI Copilot** — Inline ghost text suggestions
- **Agentic AI Chat** — SSE streaming with native tool calling
- **Extension Marketplace** — Install/manage editor extensions
- **Collaboration** — Socket.io real-time multi-user editing
- **Media Processing** — FFmpeg WASM for video/audio
- **Code Intelligence** — LSP-like completions, diagnostics, hover info
- **Quick Open** — Cmd+P file finder
- **Search & Replace** — Advanced find/replace across files
- **Task Runner** — npm script execution panel
- **Debug Panel** — Breakpoints, watches, call stack
- **Remote Development** — Remote environment management
- **Packaging** — App bundling and export
- **Templates** — Prebuilt project templates gallery
- **Auth** — User authentication modal
- **Billing** — Usage dashboard and billing management

---

## File Structure

```
maula-editor/
├── App.tsx                  # Main app (55+ components)
├── AgenticAIChat.tsx        # Agentic AI chat component
├── index.tsx                # Entry point
├── index.html               # HTML template
├── index.css                # Global styles
├── useStore.ts              # Zustand store (largest in platform)
├── types.ts                 # TypeScript types
├── constants.tsx            # App constants
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── package.json             # Dependencies
├── Dockerfile.frontend      # Docker build
├── docker-compose.yml       # Docker compose
├── components/
│   ├── CodeEditor.tsx       # Monaco Editor (14 langs, 45+ icons)
│   ├── Editor.tsx           # Config/prompt editor
│   ├── FileExplorer.tsx     # File tree
│   ├── IntegratedTerminal.tsx  # xterm.js terminal
│   ├── LivePreview.tsx      # WebContainer preview
│   ├── GitPanel.tsx         # Git operations
│   ├── AgenticAIChat.tsx    # AI chat (duplicate ref)
│   ├── CopilotChat.tsx      # Copilot conversation
│   ├── InlineCodeSuggestion.tsx # Ghost text
│   ├── ExtensionMarketplacePanel.tsx
│   ├── SearchPanel.tsx      # File search
│   ├── DeployPanel.tsx      # Deployment
│   ├── DebugPanel.tsx       # Debugger
│   ├── TaskRunnerPanel.tsx  # Task runner
│   ├── WorkspaceManager.tsx # Workspace management
│   ├── file-management/     # File management subfolder
│   └── ... (40+ more)
├── services/
│   ├── codeIntelligence.ts  # Language detection & completion (911 lines)
│   └── ...
├── server/                  # NestJS backend
│   ├── nest-src/            # NestJS modules
│   └── prisma/              # Database schema
├── store/                   # Additional stores
├── utils/                   # Utility functions
├── spaces/                  # Collaborative spaces sub-app
├── data/                    # Data files
├── nginx/                   # Nginx configs
├── public/                  # Static assets
├── DOCS.md                  # This file
├── README.md                # Quick start + multi-language
├── DEPLOYMENT.md            # Deployment guide
└── EC2-DEPLOY.md            # EC2 deployment guide
```

---

## What's Done

| Phase | Status | Description |
|-------|--------|-------------|
| Core IDE | ✅ Done | Monaco Editor, file explorer, terminal, preview |
| WebContainer | ✅ Done | In-browser Node.js runtime |
| Git | ✅ Done | isomorphic-git in-browser |
| Extensions | ✅ Done | Marketplace + installed panel |
| AI Copilot | ✅ Done | Inline suggestions + copilot chat |
| Phase 8 — Agentic IDE | ✅ Done | SSE streaming, native tool calling, 15 backend tools |
| File Operations | 🔶 Partial | User file CRUD is local (correct for IDE); AI file ops use XML tags instead of structured tools |
| Multi-Language | ✅ Done | 14 languages, 45+ file icons, 40+ extension mappings |
| Collaboration | ✅ Done | Socket.io real-time editing |
| Media | ✅ Done | FFmpeg WASM processing |
| Code Intelligence | ✅ Done | LSP-like completions & diagnostics |
| Deploy | ✅ Done | Docker + EC2 deployment |
| Auth & Billing | ✅ Done | Authentication + usage dashboard |
| Cloud Sandbox | ✅ Done | AWS ECS Fargate sandboxes — real npm install, full build pipelines (via shared backend /api/sandbox/*) |

---

## What's Next

- [ ] Migrate AI file ops from XML tags to /api/canvas/stream SSE agent tools
- [ ] Connect terminal to sandbox container via WebSocket
- [ ] Advanced debugging (conditional breakpoints, watch expressions)
- [ ] LSP server integration (full language server protocol)
- [ ] Plugin API (custom extension development)
- [ ] Remote container support (dev containers)
- [ ] Multi-workspace improvements
- [ ] Performance profiling panel
- [ ] Database GUI panel
- [ ] CI/CD pipeline visualization

---

## Related Docs

- **[README.md](README.md)** — Quick start, features overview, multi-language table
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Full deployment guide
- **[EC2-DEPLOY.md](EC2-DEPLOY.md)** — AWS EC2 step-by-step
- **[server/AWS-DEPLOYMENT.md](server/AWS-DEPLOYMENT.md)** — Backend AWS deployment
- **[spaces/README.md](spaces/README.md)** — Collaborative spaces sub-app

---

## Git Info

**Repository:** `https://github.com/aidigitalfriend/copy-of-generated.git`  
**This is a git submodule** — changes must be committed inside `maula-editor/` first, then the parent repo updated.

```bash
# Commit inside submodule
cd maula-editor/
git add . && git commit -m "your message" && git push

# Update parent repo reference
cd ..
git add maula-editor && git commit -m "update maula-editor submodule" && git push
```

---

> **Maula Editor — A full IDE in your browser.** 🚀
