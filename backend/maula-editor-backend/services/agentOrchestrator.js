import { createLogger } from '../lib/logger.js';
const log = createLogger('agentOrchestrator');
/**
 * MULTI-AGENT ORCHESTRATOR — Military Command Structure
 * =====================================================
 * Manager (Mistral) stays in conversation with the user.
 * Workers (Mistral, xAI, OpenAI) build in parallel.
 *
 * Flow:
 *   User → Manager analyzes intent → delegates to specialist worker(s)
 *   → Manager keeps chatting ("your app is being built habibi")
 *   → Workers execute tools in background, stream progress via SSE
 *   → Manager checks status, reports completion to user
 *
 * All 3 providers can run parallel tasks — zero conflict.
 */

import OpenAI from 'openai';
import { executeTool, ALL_TOOLS as ALL_TOOL_DEFINITIONS, getToolsForMode } from './toolsHeadquarters.js';

// ── Per-worker tool subsets (capped at 64 for speed) ──
// Each worker only gets tools relevant to their specialty
const WORKER_TOOL_MODES = {
    codeBuild: 'Canvas',         // core + code + backend + api + canvas + filesystem
    deepThink: 'Chat',           // core + utility + memory + reasoning
    imageGen:  'Create Image',   // core + image + canvas
    research:  'Web Search',     // core + api + analytics + data processing
    fastCode:  'Canvas',         // same as codeBuild (lighter model tho)
    analysis:  'Chat',           // core + code + utility
};

function getWorkerTools(workerId) {
    const mode = WORKER_TOOL_MODES[workerId] || 'Chat';
    return getToolsForMode(mode);
}
import { AIService } from './aiService.js';

// ── Provider Clients (all OpenAI-compatible) ─────────────────
function initClients() {
    const clients = {};

    if (process.env.MISTRAL_API_KEY) {
        clients.mistral = new OpenAI({
            apiKey: process.env.MISTRAL_API_KEY,
            baseURL: 'https://api.mistral.ai/v1',
        });
    }
    if (process.env.XAI_API_KEY) {
        clients.xai = new OpenAI({
            apiKey: process.env.XAI_API_KEY,
            baseURL: 'https://api.x.ai/v1',
        });
    }
    if (process.env.OPENAI_API_KEY) {
        clients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    return clients;
}

// ── Worker Specializations ──────────────────────────────────
const WORKER_PROFILES = {
    codeBuild: {
        name: 'Code Architect',
        provider: 'mistral',
        model: 'codestral-latest',
        fallback: [
            { provider: 'xai',    model: 'grok-3' },
            { provider: 'openai', model: 'gpt-4.1' },
        ],
        specialty: 'Backend logic, algorithms, Python, APIs, Node.js, clean architecture, full-stack development',
        systemPrompt: `You are a senior software engineer agent — the Code Architect. You build and modify code projects using tools.

## HOW YOU WORK
1. Analyze the build request thoroughly
2. Use tools to inspect existing files if modifying
3. Use write_file to create/modify files — ALWAYS write complete files
4. For HTML apps: Single file with embedded CSS/JS, include Tailwind via CDN
5. For complex projects: Create multiple well-organized files

## CODE QUALITY
- Modern, clean, professional UI with dark mode friendly design
- Mobile-responsive using Tailwind CSS classes exclusively
- Every button, tab, form MUST function — no dead UI
- Proper error handling, accessibility, semantic HTML
- Real content — no placeholders

## OUTPUT
- Use tools to write files, never output raw code as text
- After writing, give a brief summary of what you created/changed`,
    },

    deepThink: {
        name: 'Deep Thinker',
        provider: 'xai',
        model: 'grok-3',
        fallback: [
            { provider: 'mistral', model: 'mistral-large-2501' },
            { provider: 'openai',  model: 'gpt-4.1' },
        ],
        specialty: 'Creative designs, animations, deep reasoning, complex problem solving, architecture design',
        systemPrompt: `You are a deep reasoning agent — the Deep Thinker. Specialized in creative problem-solving and architectural design.
Think step by step. Break down complex problems. Provide detailed, creative solutions.
Excel at designing animations, creative layouts, and complex system architecture.
Use tools when you need to examine code, run analysis, or write solutions.
Be thorough and precise.`,
    },

    imageGen: {
        name: 'Visual Designer',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        fallback: [
            { provider: 'xai', model: 'grok-3-fast' },
        ],
        specialty: 'Image generation with DALL-E 3, visual design, React components, complex UI, graphics, illustrations',
        systemPrompt: `You are a visual design agent — the Visual Designer. You create images using DALL-E 3 and build beautiful UI.

## IMAGE GENERATION
When asked to create images, logos, graphics, or illustrations:
1. Use the image_generate tool with a detailed, vivid prompt
2. Choose the best size: 1024x1024 (square), 1792x1024 (landscape), 1024x1792 (portrait)
3. Set quality to "hd" for important images, "standard" for quick drafts
4. Set style to "vivid" for creative/artistic, "natural" for realistic
5. Describe what you created after generation

## UI & FRONTEND
When building React components, complex UI, or visual layouts:
1. Use modern React patterns with hooks
2. Tailwind CSS for styling — mobile responsive
3. Smooth animations and transitions
4. Professional, polished design with dark mode support

You are the ONLY agent with image generation capabilities. Use them when visual assets are needed.`,
    },

    research: {
        name: 'Research Analyst',
        provider: 'mistral',
        model: 'mistral-large-2501',
        fallback: [
            { provider: 'xai',    model: 'grok-3' },
            { provider: 'openai', model: 'gpt-4.1' },
        ],
        specialty: 'Research, documentation, multi-modal analysis, knowledge gathering, content synthesis',
        systemPrompt: `You are a research agent — the Research Analyst. You excel at gathering information, analyzing content,
and producing comprehensive documentation and analysis.
Leverage multi-modal capabilities to analyze images, documents, and data.
Use web_search when you need current information.
Be factual, cited, and comprehensive.`,
    },

    fastCode: {
        name: 'Quick Builder',
        provider: 'mistral',
        model: 'mistral-small-latest',
        fallback: [
            { provider: 'xai',    model: 'grok-3-fast' },
            { provider: 'openai', model: 'gpt-4.1-mini' },
        ],
        specialty: 'Fast scaffolding, quick fixes, rapid prototyping, boilerplate generation',
        systemPrompt: `You are a fast execution agent — the Quick Builder. You handle tasks at lightning speed.
Scaffold projects quickly, fix bugs, make modifications, generate boilerplate.
Use tools to read and write files. Be concise, efficient, and fast.
You are the fastest worker — prioritize speed over perfection.`,
    },

    analysis: {
        name: 'Code Reviewer',
        provider: 'xai',
        model: 'grok-3-fast',
        fallback: [
            { provider: 'mistral', model: 'mistral-large-2501' },
            { provider: 'openai',  model: 'gpt-4.1-mini' },
        ],
        specialty: 'Code review, performance analysis, security auditing, optimization, best practices',
        systemPrompt: `You are an analysis agent — the Code Reviewer. Specialized in code quality and optimization.
Analyze code for performance, security, best practices, and potential issues.
Use tools to read files and provide detailed analysis.
Suggest concrete improvements with code examples.`,
    },
};

// ── Task Classification (what the Manager uses to decide who works) ──
const TASK_PATTERNS = [
    { type: 'imageGen', patterns: [/image|picture|photo|illustration|graphic|icon|logo|banner|thumbnail|avatar|draw|dalle|wallpaper|create.*image|generate.*image|design.*visual|make.*graphic/i] },
    { type: 'fastCode', patterns: [/fix|bug|quick|small.*change|update.*text|change.*color|rename|typo|minor|tweak|scaffold|boilerplate/i] },
    { type: 'deepThink', patterns: [/think|reason|architect|design.*system|plan|debug.*complex|why.*not.*work|explain.*how|solve|creative|animation|animate/i] },
    { type: 'research', patterns: [/research|search|find.*info|documentation|what.*is|how.*does|compare|look.*up|latest|current|explain|summarize/i] },
    { type: 'analysis', patterns: [/review|audit|optimize|performance|security|refactor|improve|check.*code|analyze.*code|best.*practice/i] },
    { type: 'codeBuild', patterns: [/build|create|make|generate|develop|implement|code|website|app|page|component|landing|dashboard|form|api|backend|frontend|fullstack|react|vue|angular|next|express|flask|django/i] },
];

// ── Manager System Prompt ───────────────────────────────────
const MANAGER_SYSTEM_PROMPT = `You are the AI Manager for One Last AI Maula Editor. You coordinate a team of specialized AI agents.

## YOUR ROLE
You are the MANAGER. You talk directly with the user, understand their needs, and delegate tasks to specialist workers. You are warm, professional, and always responsive.

## YOUR TEAM (available workers — use their job titles, never provider names)
- **Code Architect** (codeBuild) — Senior full-stack engineer. Builds apps, websites, APIs, backends. Expert in Python, Node.js, clean architecture. Use for ANY code creation or modification task.
- **Deep Thinker** (deepThink) — Creative problem solver. Handles creative designs, animations, complex reasoning, architecture design, and debugging tough issues. Use when creativity or deep analysis is needed.
- **Visual Designer** (imageGen) — Image & UI specialist. Has DALL-E 3 for generating images, graphics, logos, illustrations. Also great at React components, complex UI, and visual layouts. THE ONLY worker that can generate images.
- **Research Analyst** (research) — Knowledge expert. Researches topics, gathers information, writes documentation, analyzes content with multi-modal capabilities. Use for research, docs, and information gathering.
- **Quick Builder** (fastCode) — Speed specialist. Handles quick fixes, small modifications, scaffolding, and boilerplate. Fastest worker for simple tasks. Use for minor changes and rapid prototyping.
- **Code Reviewer** (analysis) — Quality guardian. Reviews code, audits security, optimizes performance, suggests improvements. Use for any code quality, review, or optimization task.

## ROUTING RULES
- Image/graphic/logo/illustration requests → ALWAYS Visual Designer (only one with DALL-E)
- Build/create app/website/component → Code Architect (complex) or Quick Builder (simple)
- Creative designs, animations, complex architecture → Deep Thinker
- Research, documentation, "what is", "how does" → Research Analyst
- Code review, optimization, security audit → Code Reviewer
- Bug fixes, typos, small changes → Quick Builder
- For complex projects: delegate to MULTIPLE workers simultaneously (e.g., Code Architect builds + Visual Designer creates assets)

## HOW YOU WORK
1. User sends a request → You analyze what they need
2. Use the ROUTING RULES above to pick the best worker(s)
3. You respond to the user immediately: acknowledge the request, explain who's working on it (use job titles, not provider/model names)
4. Workers execute in parallel — you stay available for more requests
5. When workers finish, you summarize results for the user

## RESPONSE FORMAT
You MUST respond with valid JSON in this exact structure:
{
  "userMessage": "Your conversational response to the user",
  "delegations": [
    {
      "workerId": "codeBuild|deepThink|imageGen|research|fastCode|analysis",
      "taskDescription": "Clear, complete description of what the worker should do",
      "priority": "high|medium|low"
    }
  ]
}

## RULES
- ALWAYS include "userMessage" — your friendly response to the user
- "delegations" can be empty [] if you're just chatting (no task needed)
- You can delegate to MULTIPLE workers simultaneously for complex requests
- For build requests: delegate to codeBuild with FULL details (what to build, tech stack, features)
- For questions/chat: respond directly, no delegation needed
- Keep userMessage natural and conversational — no robotic scripts
- If the user asks about status: check worker status and report
- Never expose internal JSON format to the user — speak naturally
- Include ALL context the worker needs (the worker can't see the conversation)`;

// ── The Orchestrator Class ──────────────────────────────────
export class AgentOrchestrator {
    constructor(userId, sseWrite, user = null, creditAppId = 'neural-chat') {
        this.userId = userId;
        this.sseWrite = sseWrite;
        this.user = user;                  // User object for credit deduction
        this.creditAppId = creditAppId;
        this.clients = initClients();
        this.activeWorkers = new Map();    // workerId → { status, taskId, startTime, provider }
        this.completedTasks = [];          // completed task results
        this.taskCounter = 0;
    }

    // ── Credit deduction helper ───────────────────────────────
    async _deductCredits(provider, model, inputTokens, outputTokens) {
        if (!this.user) return;
        try {
            const aiService = new AIService(this.user);
            const cost = AIService.calculateCost(provider, model, inputTokens, outputTokens);
            await aiService.deductCredits(cost, provider, model, inputTokens, outputTokens, null, 'chat', this.creditAppId);
        } catch (err) {
            log.warn('[Orchestrator] Credit deduction failed:', err.message);
        }
    }

    // ── Manager: Analyze user request and decide what to do ───
    async processUserMessage(userPrompt, projectFiles, conversationHistory) {
        const startTime = Date.now();

        // Fast-path: detect simple greetings/chat — skip Manager call entirely for speed
        const simpleChat = /^(hi|hello|hey|sup|yo|howdy|greetings|good\s*(morning|afternoon|evening)|what'?s?\s*up|how\s*are\s*you|thanks|thank\s*you|ok|okay|cool|nice|great|bye|goodbye|see\s*ya|what\s*can\s*you\s*do|who\s*are\s*you|help)\s*[!?.]*$/i;
        if (simpleChat.test(userPrompt.trim())) {
            // Use a fast, cheap model to respond conversationally — no worker needed
            this.sseWrite({ type: 'agent_event', agent: 'manager', name: 'Team Manager', event: 'thinking', message: 'Responding...' });
            const chatResponse = await this._quickChat(userPrompt, conversationHistory);
            this.sseWrite({ type: 'text', content: chatResponse });
            this.sseWrite({ type: 'agent_event', agent: 'manager', name: 'Team Manager', event: 'responded', message: 'Manager responded' });
            return {
                success: true,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                tasksCompleted: 0,
                tasksFailed: 0,
                latencyMs: Date.now() - startTime,
            };
        }

        // Build context about active workers for the manager
        const activeWorkersContext = this._getActiveWorkersContext();
        const completedContext = this._getCompletedTasksContext();

        // Build messages for the manager
        const messages = [];

        // Add conversation history (last 10)
        for (const msg of conversationHistory.slice(-10)) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: typeof msg.content === 'string' ? msg.content : (msg.text || ''),
            });
        }

        // Add current request with context
        let contextBlock = '';
        if (activeWorkersContext) {
            contextBlock += `\n\n## ACTIVE WORKERS STATUS\n${activeWorkersContext}`;
        }
        if (completedContext) {
            contextBlock += `\n\n## RECENTLY COMPLETED TASKS\n${completedContext}`;
        }

        const fileList = Object.keys(projectFiles);
        if (fileList.length > 0) {
            contextBlock += `\n\n## CURRENT PROJECT FILES\n${fileList.join(', ')}`;
        }

        messages.push({
            role: 'user',
            content: `${userPrompt}${contextBlock}`,
        });

        // Call the Manager (Mistral primary)
        this.sseWrite({ type: 'agent_event', agent: 'manager', name: 'Team Manager', event: 'thinking', message: 'Analyzing your request...' });

        let managerResponse;
        try {
            managerResponse = await this._callManager(messages);
        } catch (err) {
            log.error('[Orchestrator] Manager call failed:', err.message);
            this.sseWrite({ type: 'text', content: "I'm having trouble connecting right now. Let me try to handle your request directly." });
            // Fallback: auto-classify and delegate without manager
            managerResponse = this._autoClassifyFallback(userPrompt);
        }

        // Send manager's response to user immediately
        if (managerResponse.userMessage) {
            this.sseWrite({ type: 'text', content: managerResponse.userMessage });
            this.sseWrite({ type: 'agent_event', agent: 'manager', name: 'Team Manager', event: 'responded', message: 'Manager responded' });
        }

        // Process delegations — launch workers in parallel
        const workerPromises = [];
        if (managerResponse.delegations && managerResponse.delegations.length > 0) {
            for (const delegation of managerResponse.delegations) {
                const workerProfile = WORKER_PROFILES[delegation.workerId];
                if (!workerProfile) {
                    log.warn(`[Orchestrator] Unknown worker: ${delegation.workerId}`);
                    continue;
                }

                const taskId = `task_${++this.taskCounter}_${Date.now()}`;
                const workerPromise = this._launchWorker(
                    taskId,
                    delegation.workerId,
                    workerProfile,
                    delegation.taskDescription,
                    projectFiles,
                    delegation.priority || 'medium',
                );
                workerPromises.push(workerPromise);
            }
        }

        // Wait for all workers to complete
        if (workerPromises.length > 0) {
            const results = await Promise.allSettled(workerPromises);

            // Collect total token usage from all workers
            let totalInputTokens = 0;
            let totalOutputTokens = 0;

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    totalInputTokens += result.value.inputTokens || 0;
                    totalOutputTokens += result.value.outputTokens || 0;
                }
            }

            // Manager summarizes what happened
            const summaryPrompt = this._buildSummaryPrompt(results);
            if (summaryPrompt) {
                this.sseWrite({ type: 'agent_event', agent: 'manager', name: 'Team Manager', event: 'summarizing', message: 'Reviewing completed work...' });

                try {
                    const summaryMessages = [
                        ...messages,
                        { role: 'assistant', content: managerResponse.userMessage || '' },
                        { role: 'user', content: summaryPrompt },
                    ];
                    const summary = await this._callManagerForSummary(summaryMessages);
                    if (summary) {
                        this.sseWrite({ type: 'text', content: '\n\n' + summary });
                    }
                } catch (err) {
                    log.error('[Orchestrator] Summary call failed:', err.message);
                }
            }

            return {
                success: true,
                totalInputTokens,
                totalOutputTokens,
                tasksCompleted: results.filter(r => r.status === 'fulfilled').length,
                tasksFailed: results.filter(r => r.status === 'rejected').length,
                latencyMs: Date.now() - startTime,
            };
        }

        // No workers needed — just a conversation
        return {
            success: true,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            tasksCompleted: 0,
            tasksFailed: 0,
            latencyMs: Date.now() - startTime,
        };
    }

    // ── Manager LLM Call (Mistral primary → xAI → OpenAI fallback) ─────────────
    async _callManager(messages) {
        const MANAGER_CHAIN = [
            { provider: 'mistral', model: 'mistral-large-2501' },
            { provider: 'xai',     model: 'grok-3' },
            { provider: 'openai',  model: 'gpt-4.1' },
        ];

        let lastErr;
        for (const { provider, model } of MANAGER_CHAIN) {
            const client = this.clients[provider];
            if (!client) continue;

            try {
                const response = await client.chat.completions.create({
                    model,
                    max_tokens: 2048,
                    messages: [
                        { role: 'system', content: MANAGER_SYSTEM_PROMPT },
                        ...messages,
                    ],
                });

                await this._deductCredits(provider, model,
                    response.usage?.prompt_tokens || 0,
                    response.usage?.completion_tokens || 0);

                const text = response.choices[0]?.message?.content || '';

                // Parse JSON response
                try {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return {
                            userMessage: parsed.userMessage || '',
                            delegations: Array.isArray(parsed.delegations) ? parsed.delegations : [],
                        };
                    }
                } catch (parseErr) {
                    log.warn('[Orchestrator] Manager JSON parse failed, using raw text:', parseErr.message);
                }

                return { userMessage: text, delegations: [] };
            } catch (err) {
                lastErr = err;
                log.warn(`[Orchestrator] Manager ${provider} failed:`, err.message);
            }
        }

        throw lastErr || new Error('No manager providers available');
    }

    // ── Quick Chat (fast conversational response, no workers/tools) ──
    async _quickChat(userPrompt, conversationHistory) {
        const CHAT_CHAIN = [
            { provider: 'mistral', model: 'mistral-small-latest' },  // Cheapest & fastest
            { provider: 'xai',     model: 'grok-3-fast' },
            { provider: 'openai',  model: 'gpt-4.1-mini' },
        ];

        const messages = [];
        for (const msg of conversationHistory.slice(-6)) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: typeof msg.content === 'string' ? msg.content : (msg.text || ''),
            });
        }
        messages.push({ role: 'user', content: userPrompt });

        for (const { provider, model } of CHAT_CHAIN) {
            const client = this.clients[provider];
            if (!client) continue;
            try {
                const response = await client.chat.completions.create({
                    model,
                    max_tokens: 512,
                    messages: [
                        { role: 'system', content: 'You are the AI assistant for Maula Editor — a code editor. Be friendly, warm, and conversational. Keep responses short and natural. If the user greets you, greet them back and ask what they want to build or work on. Do not generate code unless asked.' },
                        ...messages,
                    ],
                });
                await this._deductCredits(provider, model,
                    response.usage?.prompt_tokens || 0,
                    response.usage?.completion_tokens || 0);
                return response.choices[0]?.message?.content || "Hey there! What would you like to build today?";
            } catch (err) {
                log.warn(`[Orchestrator] QuickChat ${provider} failed:`, err.message);
            }
        }
        return "Hey there! How can I help you today? 👋";
    }

    // ── Manager Summary Call (simple text, no JSON) ───────────
    async _callManagerForSummary(messages) {
        const SUMMARY_CHAIN = [
            { provider: 'mistral', model: 'mistral-large-2501' },
            { provider: 'xai',     model: 'grok-3-fast' },
            { provider: 'openai',  model: 'gpt-4.1-mini' },
        ];
        const summarySystem = `You are the AI Manager. A worker just completed a task. Give a brief, natural summary to the user of what was done. Be conversational and concise. Don't use JSON format — just speak naturally.`;

        for (const { provider, model } of SUMMARY_CHAIN) {
            const client = this.clients[provider];
            if (!client) continue;
            try {
                const response = await client.chat.completions.create({
                    model,
                    max_tokens: 1024,
                    messages: [
                        { role: 'system', content: summarySystem },
                        ...messages,
                    ],
                });
                return response.choices[0]?.message?.content || '';
            } catch (err) {
                log.warn(`[Orchestrator] Summary ${provider} failed:`, err.message);
            }
        }
        return null;
    }

    // ── Auto-Classify Fallback (when Manager fails) ──────────
    _autoClassifyFallback(prompt) {
        // Check for simple greetings/chat first — don't delegate those to workers
        const chatPatterns = /^(hi|hello|hey|sup|yo|howdy|greetings|good\s*(morning|afternoon|evening)|what'?s?\s*up|how\s*are\s*you|thanks|thank\s*you|ok|okay|cool|nice|great|bye|goodbye|see\s*ya|what\s*can\s*you\s*do|who\s*are\s*you|help)\b/i;
        if (chatPatterns.test(prompt.trim()) || prompt.trim().length < 10) {
            return {
                userMessage: '',  // Manager will generate a natural response
                delegations: [],  // No workers needed for chat
            };
        }

        let bestType = 'codeBuild'; // default to code building
        for (const { type, patterns } of TASK_PATTERNS) {
            if (patterns.some(p => p.test(prompt))) {
                bestType = type;
                break;
            }
        }

        return {
            userMessage: "I'm on it! Let me get the right specialist working on this for you.",
            delegations: [{
                workerId: bestType,
                taskDescription: prompt,
                priority: 'high',
            }],
        };
    }

    // ── Launch Worker (runs in parallel) ──────────────────────
    async _launchWorker(taskId, workerId, workerProfile, taskDescription, projectFiles, priority) {
        const startTime = Date.now();

        // Register active worker
        this.activeWorkers.set(taskId, {
            workerId,
            name: workerProfile.name,
            status: 'starting',
            startTime,
            taskDescription,
        });

        this.sseWrite({
            type: 'agent_event',
            agent: workerId,
            name: workerProfile.name,
            event: 'started',
            taskId,
            message: `${workerProfile.name} is starting: ${taskDescription.slice(0, 100)}...`,
        });

        try {
            // Try primary provider, then fallbacks
            const providers = [
                { provider: workerProfile.provider, model: workerProfile.model },
                ...(workerProfile.fallback || []),
            ];

            let result = null;
            let usedProvider = null;
            let lastError = null;

            for (const { provider, model } of providers) {
                try {
                    this.activeWorkers.get(taskId).status = 'working';
                    this.activeWorkers.get(taskId).provider = provider;

                    this.sseWrite({
                        type: 'agent_event',
                        agent: workerId,
                        name: workerProfile.name,
                        event: 'working',
                        taskId,
                        provider,
                        model,
                        message: `${workerProfile.name} working with ${provider}/${model}...`,
                    });

                    result = await this._executeWorkerTask(
                        provider, model, workerProfile.systemPrompt,
                        taskDescription, projectFiles, taskId, workerId, workerProfile.name,
                    );
                    usedProvider = { provider, model };
                    break; // Success — stop trying fallbacks
                } catch (err) {
                    lastError = err;
                    log.warn(`[Orchestrator] Worker ${workerId} failed with ${provider}/${model}:`, err.message);
                    this.sseWrite({
                        type: 'agent_event',
                        agent: workerId,
                        name: workerProfile.name,
                        event: 'fallback',
                        taskId,
                        message: `${workerProfile.name} switching provider (${provider} failed)...`,
                    });
                }
            }

            if (!result) {
                throw lastError || new Error('All providers failed');
            }

            // Mark completed
            this.activeWorkers.delete(taskId);
            const completedTask = {
                taskId,
                workerId,
                name: workerProfile.name,
                taskDescription,
                provider: usedProvider,
                latencyMs: Date.now() - startTime,
                success: true,
                summary: result.summary || 'Task completed',
            };
            this.completedTasks.push(completedTask);

            this.sseWrite({
                type: 'agent_event',
                agent: workerId,
                name: workerProfile.name,
                event: 'completed',
                taskId,
                latencyMs: completedTask.latencyMs,
                message: `${workerProfile.name} completed in ${(completedTask.latencyMs / 1000).toFixed(1)}s`,
            });

            return {
                ...completedTask,
                inputTokens: result.inputTokens || 0,
                outputTokens: result.outputTokens || 0,
            };

        } catch (err) {
            // Mark failed
            this.activeWorkers.delete(taskId);
            const failedTask = {
                taskId,
                workerId,
                name: workerProfile.name,
                taskDescription,
                latencyMs: Date.now() - startTime,
                success: false,
                error: err.message,
            };
            this.completedTasks.push(failedTask);

            this.sseWrite({
                type: 'agent_event',
                agent: workerId,
                name: workerProfile.name,
                event: 'failed',
                taskId,
                message: `${workerProfile.name} failed: ${err.message}`,
            });

            throw err;
        }
    }

    // ── Execute Worker Task (tool-calling loop) ───────────────
    async _executeWorkerTask(provider, model, systemPrompt, taskDescription, projectFiles, taskId, workerId, workerName) {

        // Build project context
        const fileList = Object.keys(projectFiles);
        let taskContent = taskDescription;
        if (fileList.length > 0) {
            taskContent = `## Current Project Files: ${fileList.join(', ')}\n\n## Task:\n${taskDescription}`;
        }

        const messages = [{ role: 'user', content: taskContent }];

        // Mutable project state — tools can modify files
        const projectState = { ...projectFiles };
        const toolCtx = {
            projectFiles: projectState,
            sseWrite: this.sseWrite,
            userId: this.userId,
        };

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let fullContent = '';
        const maxRounds = 10;

        // All providers (Mistral, xAI, OpenAI) are OpenAI-compatible
        return await this._workerLoopOpenAI(
            provider, model, systemPrompt, messages, projectState, toolCtx,
            maxRounds, taskId, workerId, workerName,
        );
    }

    // ── Worker Loop: Anthropic ────────────────────────────────
    async _workerLoopAnthropic(model, systemPrompt, messages, projectState, toolCtx, maxRounds, taskId, workerId, workerName) {
        const client = this.clients.anthropic;
        if (!client) throw new Error('Anthropic client not available');

        const workerTools = getWorkerTools(workerId);
        let conversationMessages = [...messages];
        let totalInput = 0, totalOutput = 0;
        let fullContent = '';

        for (let round = 0; round < maxRounds; round++) {
            const response = await client.messages.create({
                model,
                max_tokens: 8192,
                system: systemPrompt,
                messages: conversationMessages,
                tools: workerTools,
            });

            totalInput += response.usage.input_tokens;
            totalOutput += response.usage.output_tokens;

            const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
            const textBlocks = response.content.filter(b => b.type === 'text');

            // Stream text from worker
            for (const tb of textBlocks) {
                if (tb.text) {
                    fullContent += tb.text;
                    // Workers send text as worker_text (not main text — that's the Manager)
                    this.sseWrite({ type: 'worker_text', agent: workerId, name: workerName, content: tb.text, taskId });
                }
            }

            if (toolUseBlocks.length === 0) break;

            // Execute tools
            const toolResults = [];
            for (const toolBlock of toolUseBlocks) {
                this.sseWrite({ type: 'tool_start', tool: toolBlock.name, input: toolBlock.input, agent: workerId, name: workerName, taskId });

                const { result: resultStr, sideEffects } = await executeTool(toolBlock.name, toolBlock.input, {
                    ...toolCtx,
                    sseWrite: this.sseWrite,
                });

                if (sideEffects) {
                    this.sseWrite({ type: 'tool_side_effect', tool: toolBlock.name, agent: workerId, ...sideEffects });
                }

                let resultParsed;
                try { resultParsed = JSON.parse(resultStr); } catch { resultParsed = { status: 'success', message: resultStr }; }

                this.sseWrite({
                    type: 'tool_result',
                    tool: toolBlock.name,
                    success: resultParsed.status === 'success' || resultParsed.success === true,
                    summary: resultParsed.message || resultParsed.error || '',
                    agent: workerId,
                    name: workerName,
                    taskId,
                });

                toolResults.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: resultStr });
            }

            conversationMessages = [
                ...conversationMessages,
                { role: 'assistant', content: response.content },
                { role: 'user', content: toolResults },
            ];
        }

        // Deduct credits for Anthropic worker
        await this._deductCredits('anthropic', model, totalInput, totalOutput);

        return {
            summary: fullContent.slice(0, 500),
            inputTokens: totalInput,
            outputTokens: totalOutput,
            projectFiles: projectState,
        };
    }

    // ── Worker Loop: OpenAI-Compatible (Mistral, xAI, Groq, Cerebras, OpenAI) ──
    async _workerLoopOpenAI(provider, model, systemPrompt, messages, projectState, toolCtx, maxRounds, taskId, workerId, workerName) {
        const client = this.clients[provider];
        if (!client) throw new Error(`${provider} client not available`);

        // Get per-worker tool subset (capped at 128) and convert to OpenAI format
        const workerTools = getWorkerTools(workerId);
        const openaiTools = workerTools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
            },
        }));

        let conversationMessages = [
            { role: 'system', content: systemPrompt },
            ...messages,
        ];
        let totalInput = 0, totalOutput = 0;
        let fullContent = '';

        for (let round = 0; round < maxRounds; round++) {
            const response = await client.chat.completions.create({
                model,
                max_tokens: 8192,
                messages: conversationMessages,
                tools: openaiTools,
                tool_choice: 'auto',
            });

            const choice = response.choices[0];
            const msg = choice.message;
            totalInput += response.usage?.prompt_tokens || 0;
            totalOutput += response.usage?.completion_tokens || 0;

            // Capture text
            if (msg.content) {
                fullContent += msg.content;
                this.sseWrite({ type: 'worker_text', agent: workerId, name: workerName, content: msg.content, taskId });
            }

            // If no tool calls → done
            if (!msg.tool_calls || msg.tool_calls.length === 0) break;

            // Execute tool calls
            const toolMessages = [];
            for (const tc of msg.tool_calls) {
                const toolName = tc.function.name;
                let toolInput;
                try { toolInput = JSON.parse(tc.function.arguments); } catch { toolInput = {}; }

                this.sseWrite({ type: 'tool_start', tool: toolName, input: toolInput, agent: workerId, name: workerName, taskId });

                const { result: resultStr, sideEffects } = await executeTool(toolName, toolInput, {
                    ...toolCtx,
                    sseWrite: this.sseWrite,
                });

                if (sideEffects) {
                    this.sseWrite({ type: 'tool_side_effect', tool: toolName, agent: workerId, ...sideEffects });
                }

                let resultParsed;
                try { resultParsed = JSON.parse(resultStr); } catch { resultParsed = { status: 'success', message: resultStr }; }

                this.sseWrite({
                    type: 'tool_result',
                    tool: toolName,
                    success: resultParsed.status === 'success' || resultParsed.success === true,
                    summary: resultParsed.message || resultParsed.error || '',
                    agent: workerId,
                    name: workerName,
                    taskId,
                });

                toolMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: resultStr,
                });
            }

            conversationMessages = [
                ...conversationMessages,
                msg,
                ...toolMessages,
            ];
        }

        // Deduct credits for OpenAI-compatible worker
        await this._deductCredits(provider, model, totalInput, totalOutput);

        return {
            summary: fullContent.slice(0, 500),
            inputTokens: totalInput,
            outputTokens: totalOutput,
            projectFiles: projectState,
        };
    }

    // ── Worker Loop: Gemini ───────────────────────────────────
    async _workerLoopGemini(model, systemPrompt, messages, projectState, toolCtx, maxRounds, taskId, workerId, workerName) {
        const client = this.clients.gemini;
        if (!client) throw new Error('Gemini client not available');

        // Gemini tool format — use per-worker tool subset
        const workerTools = getWorkerTools(workerId);
        const geminiTools = [{
            functionDeclarations: workerTools.map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
            })),
        }];

        const genModel = client.getGenerativeModel({
            model,
            systemInstruction: systemPrompt,
            tools: geminiTools,
        });

        const chat = genModel.startChat({
            history: [],
        });

        let fullContent = '';
        let totalInput = 0, totalOutput = 0;

        // Send the user message
        const userContent = messages[messages.length - 1].content;

        for (let round = 0; round < maxRounds; round++) {
            const result = await chat.sendMessage(round === 0 ? userContent : '');

            const response = result.response;
            totalInput += response.usageMetadata?.promptTokenCount || 0;
            totalOutput += response.usageMetadata?.candidatesTokenCount || 0;

            const parts = response.candidates?.[0]?.content?.parts || [];
            const textParts = parts.filter(p => p.text);
            const funcParts = parts.filter(p => p.functionCall);

            for (const tp of textParts) {
                fullContent += tp.text;
                this.sseWrite({ type: 'worker_text', agent: workerId, name: workerName, content: tp.text, taskId });
            }

            if (funcParts.length === 0) break;

            // Execute function calls
            const functionResponses = [];
            for (const fp of funcParts) {
                const toolName = fp.functionCall.name;
                const toolInput = fp.functionCall.args || {};

                this.sseWrite({ type: 'tool_start', tool: toolName, input: toolInput, agent: workerId, name: workerName, taskId });

                const { result: resultStr, sideEffects } = await executeTool(toolName, toolInput, {
                    ...toolCtx,
                    sseWrite: this.sseWrite,
                });

                if (sideEffects) {
                    this.sseWrite({ type: 'tool_side_effect', tool: toolName, agent: workerId, ...sideEffects });
                }

                let resultParsed;
                try { resultParsed = JSON.parse(resultStr); } catch { resultParsed = { status: 'success', message: resultStr }; }

                this.sseWrite({
                    type: 'tool_result',
                    tool: toolName,
                    success: resultParsed.status === 'success' || resultParsed.success === true,
                    summary: resultParsed.message || resultParsed.error || '',
                    agent: workerId,
                    name: workerName,
                    taskId,
                });

                functionResponses.push({
                    functionResponse: {
                        name: toolName,
                        response: { result: resultStr },
                    },
                });
            }

            // Feed results back
            await chat.sendMessage(functionResponses);
        }

        // Deduct credits for Gemini worker
        await this._deductCredits('gemini', model, totalInput, totalOutput);

        return {
            summary: fullContent.slice(0, 500),
            inputTokens: totalInput,
            outputTokens: totalOutput,
            projectFiles: projectState,
        };
    }

    // ── Helpers ───────────────────────────────────────────────
    _getActiveWorkersContext() {
        if (this.activeWorkers.size === 0) return '';
        const lines = [];
        for (const [taskId, worker] of this.activeWorkers) {
            const elapsed = ((Date.now() - worker.startTime) / 1000).toFixed(1);
            lines.push(`- ${worker.name} (${worker.status}): "${worker.taskDescription.slice(0, 80)}" [${elapsed}s]`);
        }
        return lines.join('\n');
    }

    _getCompletedTasksContext() {
        const recent = this.completedTasks.slice(-5);
        if (recent.length === 0) return '';
        return recent.map(t =>
            `- ${t.name}: ${t.success ? '✅' : '❌'} "${t.taskDescription?.slice(0, 80)}" (${(t.latencyMs / 1000).toFixed(1)}s)`
        ).join('\n');
    }

    _buildSummaryPrompt(results) {
        const summaries = [];
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                summaries.push(`Worker "${r.value.name}" completed: ${r.value.summary || 'done'} (${(r.value.latencyMs / 1000).toFixed(1)}s)`);
            } else if (r.status === 'rejected') {
                summaries.push(`A worker failed: ${r.reason?.message || 'unknown error'}`);
            }
        }
        if (summaries.length === 0) return null;
        return `## WORKER RESULTS\n${summaries.join('\n')}\n\nBriefly summarize what was accomplished for the user. Be natural and conversational.`;
    }
}

export default AgentOrchestrator;
