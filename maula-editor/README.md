<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Maula Editor — Cloud IDE

A full-stack AI-powered Web IDE that allows users to create, edit, and deploy code projects directly in the browser with deep AI integration.

**Version:** 2.2.0 | **Last Updated:** February 20, 2026 | **Status:** Production Ready 🚀 · Phase 8 Agentic IDE ✅ · Multi-Language 14 Languages ✅  
**Live:** [maula.onelastai.co/maula-editor/](https://maula.onelastai.co/maula-editor/)

## ✨ Features

- **SSE Streaming AI** - Real-time streaming via `/api/canvas/stream` with Anthropic Claude Sonnet 4 native tool calling
- **Live Tool Events** - ToolEventBubble rendering for file writes, deletes, command output during generation
- **Browser-Based IDE** - Monaco Editor (VS Code's editor), file explorer, integrated terminal
- **Agentic AI** - Backend defines 7 tools (write_file, read_file, delete_file, list_files, search_in_files, run_command, deploy_project)
- **Live Preview** - WebContainer-powered in-browser Node.js runtime
- **Real-time Collaboration** - Yjs + CRDTs for conflict-free editing
- **Project Templates** - React, Vue, Next.js, Node.js, Python, HTML/CSS starters
- **Git Integration** - Built-in version control with isomorphic-git
- **Deployment** - Docker containerization and EC2 deployment support

## Phase 8 — Agentic IDE Architecture

```
User prompt → POST /api/canvas/stream
  → Anthropic Claude Sonnet 4 with native tool_use
  → Backend defines tools → Model chooses → Backend executes
  → Results stream back via SSE events
  → Frontend applies file changes to Zustand store in real-time
  → Tool events render live in AgenticAIChat
  → Monaco Editor reflects changes immediately
```

**SSE Event Types:** `status`, `text`, `tool_start`, `tool_result`, `file_write`, `file_delete`, `command_output`, `done`, `error`

## Multi-Language Programming Support

**14 languages** fully supported across three layers:

| Language | Extensions | Monaco Language ID | Run Commands |
|----------|-----------|-------------------|--------------|
| JavaScript | .js, .jsx, .mjs | javascript | node, npx, npm, yarn, pnpm, bun |
| TypeScript | .ts, .tsx | typescript | tsc, tsx, npx |
| Python | .py | python | python3, pip, pipenv, poetry |
| PHP | .php | php | php, composer |
| Go | .go | go | go |
| Java | .java | java | java, javac, mvn, gradle |
| C/C++ | .c, .h, .cpp, .cc, .cxx, .hpp | c, cpp | gcc, g++, clang, make, cmake |
| C# | .cs | csharp | dotnet, csc |
| Kotlin | .kt, .kts | kotlin | kotlinc, kotlin |
| Rust | .rs | rust | rustc, cargo |
| SQL | .sql | sql | sqlite3, psql, mysql |
| Shell/Bash | .sh, .bash, .zsh | shellscript | bash, sh, zsh |
| Ruby | .rb | ruby | ruby, gem, bundle, rails |
| Swift | .swift | swift | swift, swiftc |

**Architecture:** Backend defines tools → Model chooses → Backend executes (50+ whitelisted commands)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| State | Zustand (persisted) |
| Editor | Monaco Editor (14 languages, 40+ file extensions), xterm.js |
| Backend | NestJS, Express, Prisma, PostgreSQL |
| Real-time | Socket.IO, WebSockets, Yjs |
| AI | LangChain, LangGraph, Multi-provider support |
| Runtime | WebContainer API |

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and set your API key:
   ```bash
   cp .env.local.example .env.local
   ```
   Then set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## 📦 Backend Server (Optional)

For full functionality including database persistence and collaboration:

```bash
cd server
npm install
npm run db:generate
npm run start:dev
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

## 📁 Project Structure

```
├── App.tsx              # Main application
├── components/          # React components
│   ├── AgenticAIChat    # AI chat with agent orchestration
│   ├── CodeEditor       # Monaco-based editor
│   ├── FileExplorer     # Project file tree
│   └── LivePreview      # WebContainer preview
├── services/            # Client-side services
├── server/              # NestJS backend
│   ├── nest-src/        # NestJS modules
│   └── prisma/          # Database schema
└── spaces/              # Collaborative spaces app
```

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key (optional) |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) |
| `DATABASE_URL` | PostgreSQL connection string (for backend) |

## 📄 License

MIT

---

*Part of the [OneLast AI Platform](https://maula.onelastai.co)*
