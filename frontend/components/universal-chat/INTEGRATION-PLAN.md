# 🧠 NEURAL-LINK → UNIVERSAL-CHAT INTEGRATION PLAN

## Document Created: January 2025
## Status: ✅ MIGRATION COMPLETE (June 2025)

### Migration Summary
- **`geminiService.ts`** → replaced with re-exports from `chatService.ts` (backward-compat shim)
- **`realtimeChatService.ts`** → deprecated, redirects to `chatService.ts`
- **`canvas-studio/services/geminiService.ts`** → rewritten as `canvasAIService.ts` (multi-provider, typed)
- **`chatService.ts`** → active service handling all 7 providers via `/api/studio/chat`

---

# PART 1: COMPARISON MATRIX

## 📊 WHAT NEW UNIVERSAL-CHAT EXPECTS vs WHAT WE HAVE

| Feature | NEW Universal-Chat (Expects) | WE HAVE (Backend/Frontend) | GAP | Priority |
|---------|------------------------------|---------------------------|-----|----------|
| **AI Provider Call** | Direct Gemini SDK (`@google/genai`) with client-side `process.env.API_KEY` | Backend API route `/api/studio/chat` with server-side keys | ✅ DONE — `chatService.ts` replaces `geminiService.ts` | ✅ DONE |
| **Multi-Provider Support** | Only Gemini (UI shows 7 providers but code only uses Gemini) | 7 Providers: OpenAI, Anthropic, Mistral, Gemini, xAI, Cerebras, Groq | ✅ DONE — All 7 providers wired through backend | ✅ DONE |
| **Provider Selection** | `settings.provider` + `settings.model` in NavigationDrawer | `/api/studio/chat` accepts `provider` param | ✅ HAVE IT - Need to wire it | 🔴 HIGH |
| **System Prompt** | `settings.customPrompt` | `/api/studio/chat` accepts `systemPrompt` param | ✅ HAVE IT | 🟡 MEDIUM |
| **Temperature** | `settings.temperature` | Backend uses fixed 0.7 | ⚠️ PARTIAL - Need to pass param | 🟡 MEDIUM |
| **Max Tokens** | `settings.maxTokens` | Backend uses fixed 4096 | ⚠️ PARTIAL - Need to pass param | 🟡 MEDIUM |
| **Conversation History** | `messages[]` in ChatSession (localStorage) | `/api/studio/chat` accepts `conversationHistory[]` | ✅ HAVE IT - Need to wire it | 🔴 HIGH |
| **Session Persistence** | localStorage only | Prisma DB `ChatSession` + `ChatMessage` tables | ✅ HAVE IT - Optional upgrade | 🟢 LOW |
| **Rate Limiting** | None | 100 msg/30min per IP | ✅ HAVE IT | ✅ READY |
| **Gemini Live (Voice)** | Direct SDK `Modality.AUDIO` | Not in backend | ❌ GAP - Keep client-side or create endpoint | 🟡 MEDIUM |
| **Speech-to-Text** | Browser `SpeechRecognition` API | Client-side only | ✅ READY (client-side) | ✅ READY |
| **Text-to-Speech** | Browser `speechSynthesis` API | Client-side only | ✅ READY (client-side) | ✅ READY |
| **File Upload** | `handleFileUpload` (converts to base64) | Need `/api/studio/chat` to accept files | ⚠️ PARTIAL | 🟡 MEDIUM |
| **Function Calling** | `navigate_portal`, `update_canvas` tools | Not in backend | ❌ GAP - Keep client-side logic | 🟢 LOW |
| **Grounding/Search** | Gemini `googleSearch` tool | Not in backend | ❌ GAP - Keep client-side or add | 🟢 LOW |
| **Canvas Modes** | CHAT, PORTAL, CANVAS | Client-side only | ✅ READY (client-side) | ✅ READY |
| **Presets** | NEURAL_PRESETS (4 presets) | Client-side only | ✅ READY (client-side) | ✅ READY |

---

# PART 2: ARCHITECTURE COMPARISON

## CURRENT (Neural-Link Standalone - INSECURE)

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │             App.tsx                              │ │
│  │  ┌───────────┐    ┌─────────────────────────┐   │ │
│  │  │ ChatBox   │ → │ geminiService.ts        │   │ │
│  │  └───────────┘    │ ┌─────────────────────┐ │   │ │
│  │                   │ │ process.env.API_KEY │ │   │ │  ← ❌ EXPOSED!
│  │                   │ │ (client-side!)      │ │   │ │
│  │                   │ └─────────────────────┘ │   │ │
│  │                   │           ↓             │   │ │
│  │                   │   Direct SDK Call       │   │ │
│  │                   └─────────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
│                          ↓                           │
└──────────────────────────|───────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │   Gemini API Only      │
              │   (Direct SDK Call)    │
              └────────────────────────┘
```

## TARGET (Integrated with Backend - SECURE)

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │             App.tsx                              │ │
│  │  ┌───────────┐    ┌─────────────────────────┐   │ │
│  │  │ ChatBox   │ → │ chatService.ts (NEW)    │   │ │
│  │  └───────────┘    │                         │   │ │
│  │                   │  fetch('/api/studio/    │   │ │
│  │                   │        chat', {...})    │   │ │
│  │                   └─────────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
│                          ↓                           │
└──────────────────────────|───────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────┐
│               NEXT.JS API ROUTE                       │
│  /api/studio/chat/route.ts                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  Server-side API Keys (SECURE)                 │  │
│  │  OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.       │  │
│  └────────────────────────────────────────────────┘  │
│                          ↓                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  Provider Router                               │  │
│  │  anthropic → mistral → xai → cerebras →       │  │
│  │  groq → openai → gemini                        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

# PART 3: FILES TO MODIFY

## 3.1 NEW FILE: `services/chatService.ts` (Replace geminiService.ts)

```typescript
// NEW SERVICE - Calls backend API instead of direct SDK
const API_BASE = '/api';

export const sendMessage = async (
  prompt: string,
  settings: SettingsState,
  conversationHistory: { role: string; content: string }[]
): Promise<{
  text: string;
  provider: string;
  durationMs: number;
}> => {
  const response = await fetch(`${API_BASE}/studio/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      conversationHistory,
      provider: settings.provider,       // anthropic, gemini, openai, etc.
      systemPrompt: settings.customPrompt,
      // Future: temperature, maxTokens when backend supports
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get response');
  }

  const data = await response.json();
  return {
    text: data.response,
    provider: data.provider,
    durationMs: data.durationMs,
  };
};
```

## 3.2 MODIFY: `App.tsx` - handleSend function

Current (line ~100):
```typescript
const result = await callGemini(text, activeSession.settings);
```

Change to:
```typescript
import { sendMessage } from './services/chatService';

// Build conversation history for API
const history = activeSession.messages
  .filter(m => m.sender !== 'SYSTEM')
  .map(m => ({
    role: m.sender === 'YOU' ? 'user' : 'assistant',
    content: m.text,
  }));

const result = await sendMessage(text, activeSession.settings, history);
```

## 3.3 MODIFY: `constants.tsx` - PROVIDER_CONFIG

Current (only Gemini/OpenAI configured):
```typescript
export const PROVIDER_CONFIG = {
  gemini: { apiKey: 'API_KEY', models: [...] },
  openai: { apiKey: 'OPENAI_API_KEY', models: [...] },
};
```

Change to (all providers, no API keys needed):
```typescript
export const PROVIDER_CONFIG = {
  anthropic: { models: ['claude-sonnet-4-20250514', 'claude-3-opus', 'claude-3-haiku'] },
  mistral: { models: ['mistral-large-2411', 'mistral-medium', 'mixtral-8x7b'] },
  xai: { models: ['grok-3', 'grok-2-mini'] },
  cerebras: { models: ['llama-3.3-70b'] },
  groq: { models: ['llama-3.3-70b-specdec', 'mixtral-8x7b', 'gemma-7b'] },
  openai: { models: ['gpt-4.1', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  gemini: { models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-ultra'] },
};
```

## 3.4 MODIFY: `types.ts` - SettingsState

Current:
```typescript
export interface SettingsState {
  model: string;
  provider: string;  // ← Already exists!
  // ...
}
```

Verify: Already has `provider` field. ✅ READY

## 3.5 KEEP AS-IS (Client-side features)

These work fine as client-side only:
- ✅ `toggleLive` (Gemini Live audio) - Keep direct SDK for now
- ✅ `toggleSTT` (Speech-to-Text) - Browser API
- ✅ Browser TTS - speechSynthesis
- ✅ Canvas modes (CHAT/PORTAL/CANVAS)
- ✅ Session management (localStorage)
- ✅ File upload (convert to base64, send with message)

---

# PART 4: IMPLEMENTATION STEPS

## Step 1: Create New Chat Service (CRITICAL)
- [x] Create `services/chatService.ts`
- [x] Export `sendMessage()` function
- [x] Handle errors gracefully

## Step 2: Wire App.tsx to Use New Service
- [x] Import `sendMessage` from chatService
- [x] Modify `handleSend` to use backend API
- [x] Convert messages to history format
- [x] Remove `callGemini` import

## Step 3: Update Provider Constants
- [x] Update `constants.tsx` with all 7 providers
- [x] Remove API key references (not needed)
- [x] Match model names to backend

## Step 4: Keep Gemini Live Separate (Optional)
- [x] Keep `geminiService.ts` ONLY for Gemini Live audio feature → deprecated, now a shim
- [x] This requires client-side SDK for real-time audio streaming
- [ ] Future: Create WebSocket endpoint for voice

## Step 5: Test Each Provider
- [x] Test Anthropic (Claude)
- [x] Test OpenAI (GPT-4)
- [x] Test Mistral
- [x] Test Gemini
- [x] Test xAI (Grok)
- [x] Test Cerebras
- [x] Test Groq

---

# PART 5: FUTURE ENHANCEMENTS (NOT NOW)

| Feature | Current | Future Enhancement |
|---------|---------|-------------------|
| Session Sync | localStorage | Database sync with userId |
| Temperature/MaxTokens | Fixed in backend | Pass as API params |
| Streaming | Not implemented | SSE/WebSocket streaming |
| Function Calling | Client-side only | Backend tool execution |
| Search/Grounding | Gemini only | Backend search integration |
| Voice Chat | Gemini Live SDK | Backend WebSocket audio |

---

# PART 6: SUMMARY

## � CRITICAL CHANGES — DONE
1. ~~Replace `geminiService.ts` with `chatService.ts` that calls `/api/studio/chat`~~ ✅
2. ~~Wire `App.tsx` to use new service~~ ✅
3. ~~Secure - NO API keys in browser!~~ ✅
4. Canvas-studio `geminiService.ts` rewritten as typed `canvasAIService.ts` ✅
5. `realtimeChatService.ts` deprecated → redirects to chatService ✅

## 🟡 NICE TO HAVE (Later)
1. Database session persistence
2. Streaming responses
3. Pass temperature/maxTokens to backend

## 🟢 ALREADY WORKING (No Changes Needed)
1. Provider selection UI (NavigationDrawer)
2. Settings panel (temperature, tokens, prompts)
3. Canvas modes (CHAT/PORTAL/CANVAS)
4. Speech-to-Text (browser API)
5. Text-to-Speech (browser API)
6. Session management (localStorage)

---

## 📝 NOTES FOR DEVELOPER

1. **DO NOT** expose API keys to browser
2. The UI already supports 7 providers - just need to wire to backend
3. Keep Gemini Live as separate feature (requires client SDK)
4. Test each provider after wiring
5. The backend already has rate limiting (100 msg/30min)

---

## ✅ APPROVAL NEEDED

Ready to implement? Say "GO" and I will:
1. Create `chatService.ts`
2. Modify `App.tsx` to use backend
3. Update `constants.tsx` with all providers
4. Test the integration

---

*Document created by analyzing both neural-link source code and existing backend infrastructure.*
