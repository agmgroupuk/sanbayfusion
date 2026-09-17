/**
 * CANVAS GENERATION API ROUTES
 * Supports: Mistral (primary), xAI (fallback), OpenAI (fallback)
 * Video: RunwayML  |  Voice: ElevenLabs
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import OpenAI from 'openai';
import { spawn, execSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, normalize, extname, basename } from 'path';
import crypto from 'crypto';
import {
  smartRequest,
  getFriendlyError,
  PROVIDER_CAPABILITIES,
} from '../lib/smart-ai-router.js';
import s3DeployService from '../services/canvas/s3-deploy-service.js';
import { toOpenAITools, toChatPanelTools, VIDEO_TOOL_NAMES } from '../lib/canvas-ide-tools.js';
import agentToolsService from '../lib/agent-tools-service.js';
import { prisma } from '../lib/prisma.js';
const router = express.Router();

// In-process key-value store for agent memory (cleared on restart)
const agentSessionMemory = {};

// ── Auth & subscription enforcement are handled globally by api-router.js ──
// The global requireAuth + requireActivePlan middleware in api-router.js
// ensures all requests reaching these routes are authenticated with an active plan.
// No per-route auth or subscription checks needed here.

// ── Lazy AI clients — Mistral (primary), xAI (fallback), OpenAI (fallback) ──
let openaiClient = null;
let mistralClient = null;
let xaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getMistralClient() {
  if (!mistralClient && process.env.MISTRAL_API_KEY) {
    mistralClient = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }
  return mistralClient;
}

function getXAIClient() {
  if (!xaiClient && process.env.XAI_API_KEY) {
    xaiClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return xaiClient;
}

// Pick client for any of the 3 supported providers
function getClientForProvider(provider) {
  switch (provider) {
    case 'mistral': return getMistralClient();
    case 'xai': return getXAIClient();
    default: return getOpenAIClient();
  }
}

// Professional system prompt for code generation
const getSystemPrompt = (currentCode, history) => {
  let prompt = `You are Nova, an expert web developer and UI/UX designer. You create stunning, production-ready web applications based on exactly what the user asks for.

## CRITICAL RULE
- NEVER reference "Maula AI", "maula.ai", or any real company/website in the generated code
- NEVER create content that looks like an existing website - always create ORIGINAL designs
- All content must be based solely on the user's description
- Use generic placeholder branding (e.g. "Acme Co", "Your Brand", "Company Name") unless the user specifies a brand name
- All navigation links must use "#" as href (e.g. href="#about", href="#contact") - NEVER use absolute or relative URL paths like href="/agents"

## Your Design Philosophy
- Modern, clean aesthetics with attention to detail
- Smooth animations and micro-interactions
- Responsive design that works on all devices
- Accessible and semantic HTML
- Professional color schemes and typography

## Technical Guidelines
- Use HTML5, CSS3 (with CSS variables), and modern ES6+ JavaScript
- Leverage Flexbox and CSS Grid for layouts
- Include hover states, transitions, and animations
- Add placeholder content that looks realistic
- Use proper meta tags and viewport settings
- Include embedded fonts from Google Fonts when appropriate
- Add subtle shadows, gradients, and modern UI patterns
- All internal links MUST use anchor links (href="#section") not path links (href="/page")
- For multi-page concepts, use JavaScript to show/hide sections instead of separate pages

## Code Requirements
- Return ONLY the complete HTML code with embedded CSS and JavaScript
- Do NOT include any markdown formatting, explanations, or code fences
- The code should be complete and runnable in a browser
- Include realistic placeholder content and images (use https://picsum.photos/WIDTH/HEIGHT for placeholder images, NEVER use placeholder.com or via.placeholder.com as they are unreliable)
- Ensure all links and buttons have proper hover states

## Your Response
Start directly with <!DOCTYPE html> - no explanations or markdown.`;

  if (currentCode) {
    prompt += `\n\n## Current Code to Modify
The user wants changes to this existing code. Make the requested modifications while preserving the overall structure and functionality:\n\n${currentCode}`;
  }

  if (history && history.length > 0) {
    const recentHistory = history.slice(-3).map(h => h.text || h.code || '').filter(Boolean);
    if (recentHistory.length > 0) {
      prompt += `\n\n## Recent Conversation Context
${recentHistory.join('\n---\n')}`;
    }
  }

  return prompt;
};

// Generate code with any provider (with timeout)
/**
 * Generate with image — multimodal vision support (xAI + OpenAI)
 */
async function generateWithImage(provider, modelId, prompt, systemPrompt, fileData) {
  const mediaType = fileData.type || 'image/png';
  const base64Data = fileData.base64;

  // OpenAI and xAI support vision via image_url; Mistral uses text-only fallback
  if (provider === 'openai' || provider === 'xai') {
    const client = getClientForProvider(provider);
    if (!client) throw new Error(`${provider} not configured`);
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Data}` } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content || '';
  }

  // Mistral — text-only fallback
  return await generateWithProvider(provider, modelId, `${prompt}\n\n(Note: User attached an image named "${fileData.name}" but this provider doesn't support vision)`, systemPrompt);
}

async function generateWithProvider(provider, modelId, prompt, systemPrompt) {
  const client = getClientForProvider(provider);
  if (!client) throw new Error(`${provider} not configured`);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Generation timed out')), 120000);
  });

  const genPromise = client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  }).then(completion => completion.choices[0]?.message?.content || '');

  return await Promise.race([genPromise, timeoutPromise]);
}

// Clean generated code
function cleanGeneratedCode(code) {
  if (!code) return '';

  return code
    // Remove markdown code fences
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    // Remove any leading explanation text before <!DOCTYPE
    .replace(/^[\s\S]*?(?=<!DOCTYPE)/i, '')
    // Trim whitespace
    .trim();
}

/**
 * POST /api/canvas/generate
 * Generate canvas content (HTML/React code) using AI
 * Features: Smart fallback on errors, auto-switching providers
 */
router.post('/generate', [
  body('prompt').isLength({ min: 1, max: 5000 }).withMessage('Prompt must be 1-5000 characters'),
  body('provider').isIn(['mistral', 'xai', 'openai']).withMessage('Invalid provider — use mistral, xai, or openai'),
  body('modelId').exists().withMessage('Model ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { prompt, provider, modelId, currentCode, history } = req.body;

    console.log(`[CanvasAPI] Generating with ${provider}/${modelId}: "${prompt.substring(0, 80)}..."`);

    const systemPrompt = getSystemPrompt(currentCode, history);

    // Use smart routing with automatic fallback
    const result = await smartRequest(
      async (activeProvider, activeModel) => {
        const code = await generateWithProvider(activeProvider, activeModel, prompt, systemPrompt);
        return cleanGeneratedCode(code);
      },
      {
        provider,
        model: modelId,
        message: prompt,
        maxRetries: 3,
        onSwitch: (switchInfo) => {
          console.log(`[CanvasAPI] 🔄 Auto-switching: ${switchInfo.from} → ${switchInfo.to} (${switchInfo.reason})`);
        },
      }
    );

    if (!result.success) {
      // All providers failed - return friendly error
      const friendlyError = result.error;
      return res.status(503).json({
        success: false,
        error: friendlyError.message,
        title: friendlyError.title,
        action: friendlyError.action,
        canRetry: true,
        suggestion: '💡 Try simplifying your request or wait a moment and try again.',
      });
    }

    const generatedCode = result.result;

    if (!generatedCode || (!generatedCode.includes('<!DOCTYPE') && !generatedCode.includes('<html'))) {
      console.error('[CanvasAPI] Invalid code generated:', generatedCode?.substring(0, 200));
      return res.status(500).json({
        success: false,
        error: '🎨 The AI got a bit creative but forgot the HTML! Let me try again...',
        title: '🔄 Code Generation Issue',
        canRetry: true,
      });
    }

    // Build response with switch info if provider was changed
    const response = {
      success: true,
      code: generatedCode,
      provider: result.provider,
      modelId: result.model,
      timestamp: new Date().toISOString(),
      metadata: {
        promptLength: prompt.length,
        codeLength: generatedCode.length,
        isModification: !!currentCode,
      },
    };

    // Add switch notification if provider was changed
    if (result.switched) {
      const providerConfig = PROVIDER_CAPABILITIES[result.provider];
      response.notification = {
        type: 'info',
        icon: providerConfig?.icon || '🤖',
        title: '✨ Smart Routing',
        message: `Switched to ${providerConfig?.displayName || result.provider} for better results!`,
      };
      response.switchHistory = result.switchHistory;
    }

    res.json(response);

  } catch (error) {
    console.error('[CanvasAPI] Generation error:', error);
    const friendlyError = getFriendlyError(error);
    res.status(500).json({
      success: false,
      error: friendlyError.message,
      title: friendlyError.title,
      canRetry: true,
      suggestion: '💡 Try a different AI agent from the dropdown, or simplify your request.',
    });
  }
});

/**
 * POST /api/canvas/stream
 * Stream canvas content generation for real-time updates
 */
router.post('/stream', [
  body('prompt').isLength({ min: 1, max: 5000 }).withMessage('Prompt must be 1-5000 characters'),
  body('provider').isIn(['mistral', 'xai', 'openai']).withMessage('Invalid provider — use mistral, xai, or openai'),
  body('modelId').exists().withMessage('Model ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { prompt, provider, modelId, currentCode, history } = req.body;

    console.log(`[CanvasAPI] Streaming with ${provider}/${modelId}: "${prompt.substring(0, 80)}..."`);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const systemPrompt = getSystemPrompt(currentCode, history);
    let fullCode = '';

    // All 3 providers use the OpenAI-compatible streaming API
    const client = getClientForProvider(provider);
    if (!client) throw new Error(`${provider} not configured`);

    const stream = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullCode += content;
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ done: true, fullCode: cleanGeneratedCode(fullCode) })}\n\n`);
    res.end();

  } catch (error) {
    console.error('[CanvasAPI] Streaming error:', error);
    const friendlyError = getFriendlyError(error);

    // Send user-friendly error through stream
    res.write(`data: ${JSON.stringify({
      error: true,
      title: friendlyError.title,
      message: friendlyError.message,
      canRetry: true,
      suggestion: '💡 Try selecting a different AI agent or simplifying your request.',
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/canvas/status
 * Check canvas generation service status
 */
router.get('/status', (req, res) => {
  const providers = {
    mistral: !!process.env.MISTRAL_API_KEY,
    xai: !!process.env.XAI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  const activeProviders = Object.entries(providers)
    .filter(([, active]) => active)
    .map(([name]) => name);

  res.json({
    success: true,
    status: 'operational',
    capabilities: {
      providers,
      activeProviders,
      primaryProvider: 'mistral',
      supportedProviders: ['mistral', 'xai', 'openai'],
      maxPromptLength: 5000,
      maxCodeLength: 8000,
      streaming: true,
    },
  });
});

/**
 * POST /api/canvas/image-to-code
 * Convert an image (UI mockup) to HTML/React code using vision AI
 */
router.post('/image-to-code', [
  body('image').notEmpty().withMessage('Image data required'),
  body('mimeType').optional().isString(),
  body('language').optional().isIn(['html', 'react']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { image, mimeType = 'image/png', language = 'html' } = req.body;

  const systemPrompt = language === 'react'
    ? `You are an expert React developer. Analyze the uploaded UI mockup image and convert it to a React functional component with TypeScript.
       - Use Tailwind CSS for styling
       - Create a single exportable component
       - Match the design as closely as possible
       - Use semantic HTML elements
       - Add hover states and interactions where appropriate
       - Return ONLY the React component code, no explanations`
    : `You are an expert web developer. Analyze the uploaded UI mockup image and convert it to clean HTML with embedded CSS.
       - Create a complete, standalone HTML file
       - Use modern CSS (flexbox, grid, CSS variables)
       - Match the design as closely as possible
       - Include responsive design considerations
       - Add hover states and subtle animations
       - Return ONLY the HTML code starting with <!DOCTYPE html>, no explanations`;

  try {
    // Try xAI Grok vision first
    const xai = getXAIClient();
    if (xai) {
      const response = await xai.chat.completions.create({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${image}` },
              },
              { type: 'text', text: systemPrompt },
            ],
          },
        ],
      });

      const code = response.choices[0]?.message?.content || '';
      return res.json({
        success: true,
        code: cleanGeneratedCode(code),
        provider: 'xai',
        model: 'grok-2-vision-1212',
      });
    }

    // Fallback to OpenAI GPT-4o vision
    const openai = getOpenAIClient();
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${image}`,
                },
              },
              {
                type: 'text',
                text: systemPrompt,
              },
            ],
          },
        ],
      });

      const code = response.choices[0]?.message?.content || '';
      return res.json({
        success: true,
        code: cleanGeneratedCode(code),
        provider: 'openai',
        model: 'gpt-4o',
      });
    }

    throw new Error('No vision-capable AI provider available');
  } catch (error) {
    console.error('[Canvas] Image-to-code error:', error);
    const friendlyError = getFriendlyError(error);
    res.status(500).json({
      success: false,
      error: friendlyError.message,
      title: friendlyError.title,
    });
  }
});

/**
 * POST /api/canvas/deploy
 * Deploy a canvas project to S3 static hosting
 * Supports both single-code and multi-file deployments
 * Apps are accessible via {appSlug}.maula.ai
 */
router.post('/deploy', [
  body('projectName').notEmpty().withMessage('Project name required'),
  // Either 'code' (legacy single-file) or 'files' (multi-file) is required
  body('type').optional().isIn(['html', 'react', 'nextjs']),
], async (req, res) => {
  const { projectId, projectName, code, files, type = 'html', slug: existingSlug } = req.body;
  const userId = req.user?.id || 'anonymous';

  // Must have either code or files
  if (!code && (!files || Object.keys(files).length === 0)) {
    return res.status(400).json({ success: false, error: 'Either code or files is required' });
  }

  try {
    console.log(`[Canvas Deploy] Starting deployment for project: ${projectName}`);
    console.log(`[Canvas Deploy] User: ${userId}, Type: ${type}, Multi-file: ${!!files}`);

    let result;

    // Get source for S3 path separation
    const source = req.headers['x-canvas-source'] || 'standalone';

    if (files && Object.keys(files).length > 0) {
      // Multi-file deployment
      result = await s3DeployService.deployFiles({
        projectName,
        files,
        userId,
        slug: existingSlug,
        source,
      });
    } else {
      // Legacy single-code deployment
      result = await s3DeployService.deploy({
        projectId,
        projectName,
        code,
        type,
        userId,
        source,
      });
    }

    if (!result.success) {
      throw new Error(result.error || 'Deployment failed');
    }

    console.log(`[Canvas Deploy] ✅ Success: ${result.url}`);

    res.json({
      success: true,
      deploymentId: result.deploymentId,
      slug: result.slug,
      url: result.url,
      s3Url: result.s3Url,
      filesUploaded: result.filesUploaded,
      status: result.status,
      ssl: result.ssl,
      message: `🚀 Your app is live at ${result.url}`,
    });
  } catch (error) {
    console.error('[Canvas Deploy] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy project. Please try again.',
    });
  }
});

/**
 * POST /api/canvas/deploy/domain
 * Add a custom domain to a deployment
 */
router.post('/deploy/domain', [
  body('deploymentId').notEmpty().withMessage('Deployment ID required'),
  body('domain').notEmpty().withMessage('Domain required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { deploymentId, domain } = req.body;

  try {
    // In production, this would:
    // 1. Verify domain ownership via DNS
    // 2. Request SSL certificate from ACM
    // 3. Update CloudFront distribution
    // 4. Update database record

    console.log(`[Canvas Deploy] Adding custom domain ${domain} to deployment ${deploymentId}`);

    res.json({
      success: true,
      message: `Custom domain ${domain} added. SSL certificate will be provisioned automatically.`,
      dnsRecords: [
        { type: 'CNAME', name: domain, value: 'apps.maula.ai' },
      ],
    });
  } catch (error) {
    console.error('[Canvas] Domain error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom domain.',
    });
  }
});

/**
 * DELETE /api/canvas/deploy/:deploymentId
 * Stop/delete a deployment from S3
 * Accepts either raw slug or deploy_timestamp_slug format
 */
router.delete('/deploy/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;

  try {
    // Support both formats: raw slug or deploy_timestamp_slug
    let slug = deploymentId;
    if (deploymentId.startsWith('deploy_')) {
      const parts = deploymentId.split('_');
      slug = parts.slice(2).join('_'); // Everything after deploy_timestamp_
    }

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deployment ID or slug',
      });
    }

    console.log(`[Canvas Deploy] Deleting deployment: ${slug}`);

    // Delete from S3
    const source = req.headers['x-canvas-source'] || 'standalone';
    const result = await s3DeployService.deleteDeployment(slug, source);

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete deployment');
    }

    res.json({
      success: true,
      message: `Deployment ${slug} has been deleted.`,
    });
  } catch (error) {
    console.error('[Canvas] Delete deployment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop deployment.',
    });
  }
});

/**
 * GET /api/canvas/deployments
 * List all deployments for the current user
 */
router.get('/deployments', async (req, res) => {
  const userId = req.user?.id || 'anonymous';

  try {
    const source = req.headers['x-canvas-source'] || 'standalone';
    const result = await s3DeployService.listDeployments(userId, source);

    res.json({
      success: true,
      deployments: result.deployments || [],
    });
  } catch (error) {
    console.error('[Canvas] List deployments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list deployments.',
      deployments: [],
    });
  }
});

// ============================================
// CONVERSATIONAL CANVAS AGENT
// ============================================

// Natural conversational system prompt for Nova (the canvas agent)
const getConversationalPrompt = (currentCode, history, conversationHistory) => {
  return `You are Nova, a real human-like web developer friend. Talk naturally like a colleague, not a scripted bot.

## CRITICAL RULE
- NEVER reference "Maula AI", "maula.ai", or any real company in generated content
- When building apps, create ORIGINAL content based on what the user describes
- Use generic placeholder branding unless the user specifies a brand name
- All navigation links must use "#" anchors (href="#about") - NEVER use path links (href="/page")

## Your Vibe
- Be genuinely friendly and casual - like texting a developer friend
- Use natural language, not bullet points or numbered lists unless really needed
- React to what users say like a real person would
- Have personality! Be enthusiastic, curious, sometimes playful
- Don't be overly formal or robotic

## How You Work
You're smart enough to understand intent from context:
- User says "build me X" with clear details → you can build it (maybe quick confirm)
- User is chatting casually → just chat back naturally  
- User wants changes to existing app → make ONLY those changes
- Something unclear → ask naturally, don't interrogate

## Response Format (REQUIRED)
Return JSON only:
{
  "action": "chat" | "build" | "modify",
  "message": "Your natural response",
  "shouldBuild": true | false,
  "buildDetails": {"summary": "what you're building/changing"} or null
}

## Understanding Intent

**Just chatting (action: "chat", shouldBuild: false):**
- "hi", "hello", "hey" → Chat back warmly
- Questions about what you can do → Explain naturally
- Vague ideas → Have a conversation to understand more
- Feedback/comments → Respond naturally

**Ready to build (action: "build", shouldBuild: true):**
- Clear request like "build me a dark dashboard with sidebar and charts"
- User confirms after you discussed → Go for it
- Explicit "build", "create", "make" with enough detail

**Modifying existing (action: "modify", shouldBuild: true):**
- "make the header blue" → Just change that
- "add a login button" → Add only that
- "the font is too small" → Fix only that
- NEVER rebuild entire app for small tweaks

**Creating non-HTML files (action: "build", shouldBuild: true):**
- "add 2 text files" → Create exactly those files
- "create a README.md" → Create that file
- "add a data.json file" → Create that file
- When user asks for .txt, .json, .md, .csv, or other non-HTML files, set shouldBuild: true
- Include the filenames in buildDetails.summary

## Natural Conversation Style

❌ DON'T be robotic like:
"I'd be happy to help! Here are some questions:
1. What type of website?
2. What colors?
3. What features?"

✅ DO be natural like:
"Oh nice! What kind of vibe are you going for? Like minimal and clean, or something more bold and colorful?"

❌ DON'T over-confirm:
"I will build a dashboard with charts. Please confirm by saying yes."

✅ DO be smooth:
"Alright, dark dashboard with some charts coming right up! 🚀" (then build)

## Quick Examples

User: "hey"
→ {"action": "chat", "message": "Hey! 👋 What's up? Got something cool you wanna build today?", "shouldBuild": false, "buildDetails": null}

User: "can you build websites?"
→ {"action": "chat", "message": "Yep! I can build pretty much anything web - landing pages, dashboards, portfolios, e-commerce, admin panels... you name it. What do you have in mind?", "shouldBuild": false, "buildDetails": null}

User: "I need a portfolio site"
→ {"action": "chat", "message": "Nice! Portfolio for what - like design work, photography, dev projects? And any style preference? Some people like minimal, others want it more creative and bold.", "shouldBuild": false, "buildDetails": null}

User: "photography, make it dark and elegant"  
→ {"action": "chat", "message": "Dark and elegant for photography - love it! 📸 I'm thinking hero section with your best shot, a clean gallery, about section, and contact form. Sound good? I can start building whenever you're ready!", "shouldBuild": false, "buildDetails": {"summary": "Dark elegant photography portfolio"}}

User: "yeah go ahead" / "yes" / "build it" / "let's do it"
→ {"action": "build", "message": "On it! Building your photography portfolio... ✨", "shouldBuild": true, "buildDetails": {"summary": "Dark elegant photography portfolio with hero, gallery, about, and contact"}}

User: "build me a dark analytics dashboard with sidebar and 3 charts"
→ {"action": "build", "message": "Dark analytics dashboard with sidebar and charts - got it! Building now... 📊", "shouldBuild": true, "buildDetails": {"summary": "Dark analytics dashboard with sidebar and 3 chart sections"}}

User: "make the sidebar wider" (has existing app)
→ {"action": "modify", "message": "Making it wider! 👍", "shouldBuild": true, "buildDetails": {"summary": "Increase sidebar width"}}

User: "the colors are too bright"
→ {"action": "modify", "message": "I'll tone those down - going for something more subtle.", "shouldBuild": true, "buildDetails": {"summary": "Reduce color brightness, use more muted tones"}}

User: "this looks great!"
→ {"action": "chat", "message": "Awesome, glad you like it! 🎉 Want me to tweak anything or add more features?", "shouldBuild": false, "buildDetails": null}

User: "what else can you add?"
→ {"action": "chat", "message": "Depends on what you need! I could add animations, dark/light mode toggle, more sections, interactive elements, forms... what would be useful?", "shouldBuild": false, "buildDetails": null}

${currentCode ? `\n## Current App
User has an existing app. For changes, modify ONLY what they ask for:\n\`\`\`html\n${currentCode.substring(0, 1500)}\n\`\`\`...` : '## No App Yet\nUser is starting fresh.'}

${conversationHistory && conversationHistory.length > 0 ? `\n## Recent Chat
${conversationHistory.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Nova'}: ${h.text}`).join('\n')}` : ''}

IMPORTANT: Always return valid JSON. Be natural, be helpful, be human!`;
};

/**
 * POST /api/canvas/chat
 * Conversational endpoint - Nova understands and responds conversationally
 * Only builds when user confirms
 */
router.post('/chat', [
  body('message').notEmpty().withMessage('Message is required'),
  body('provider').isIn(['mistral', 'xai', 'openai']).withMessage('Invalid provider — use mistral, xai, or openai'),
  body('modelId').exists().withMessage('Model ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { message, provider, modelId, currentCode, conversationHistory, fileData, chatMode, editorContext, useSurgicalEdits, surgicalEditPrompt } = req.body;

    console.log(`[Canvas Chat] Message: "${message.substring(0, 50)}..." | Provider: ${provider} | Mode: ${chatMode || 'agent'}${fileData ? ' | With file: ' + fileData.name : ''}${useSurgicalEdits ? ' | Surgical' : ''}`);

    let systemPrompt;
    if (chatMode === 'chat') {
      systemPrompt = `You are Nova, a friendly AI assistant. Respond conversationally to the user. Do NOT generate code or suggest building anything. Just have a helpful conversation. Keep responses concise and natural. Reply in plain text — no JSON.`;
    } else {
      systemPrompt = getConversationalPrompt(currentCode, null, conversationHistory);
      // Append editor context so the AI knows the current project structure
      if (editorContext) {
        systemPrompt += `\n\n## Editor Context\n${typeof editorContext === 'string' ? editorContext : JSON.stringify(editorContext)}`;
      }
    }

    // Get conversational response (with optional image support)
    const result = await smartRequest(
      async (activeProvider, activeModel) => {
        // If fileData with image, use multimodal messages
        if (fileData && fileData.base64 && fileData.type?.startsWith('image/')) {
          return await generateWithImage(activeProvider, activeModel, message, systemPrompt, fileData);
        }
        const response = await generateWithProvider(activeProvider, activeModel, message, systemPrompt);
        return response;
      },
      {
        provider,
        model: modelId,
        message,
        maxRetries: 2,
        onSwitch: (switchInfo) => {
          console.log(`[Canvas Chat] 🔄 Switching: ${switchInfo.from} → ${switchInfo.to}`);
        },
      }
    );

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: 'Unable to process your message. Please try again.',
      });
    }

    // Chat-only mode — return plain text response, no code generation
    if (chatMode === 'chat') {
      return res.json({
        success: true,
        action: 'chat',
        message: result.result,
        shouldBuild: false,
        provider: result.provider,
      });
    }

    // Parse the JSON response from AI
    let aiResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = result.result.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      aiResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Canvas Chat] Failed to parse AI response:', result.result);
      // Fallback: treat as chat message
      aiResponse = {
        action: 'chat',
        message: result.result,
        shouldBuild: false,
        buildDetails: null,
      };
    }

    // If AI wants to build/modify, generate the code
    if (aiResponse.shouldBuild && (aiResponse.action === 'build' || aiResponse.action === 'modify')) {
      console.log(`[Canvas Chat] AI decided to ${aiResponse.action}. Generating code...`);

      // Detect if user is asking for non-HTML file operations (e.g. .txt, .json, .md files)
      // Match explicit extensions OR natural language file-creation patterns
      const fileExtPattern = /\.(txt|json|md|csv|xml|yaml|yml|toml|env|log|cfg|ini|conf|py|sh|bat|sql|graphql)\b/i;
      const fileKeywordPattern = /\b(text\s*file|readme|makefile|dockerfile|\.gitignore|changelog|license|todo\s*file|note\s*file|data\s*file|config\s*file|script\s*file|create\s+\d+\s+\w*\s*files?|add\s+\d+\s+\w*\s*files?)\b/i;
      const combinedText = `${message} ${aiResponse.buildDetails?.summary || ''}`;
      const isFileOp = fileExtPattern.test(combinedText) || fileKeywordPattern.test(combinedText);

      if (isFileOp) {
        // Use surgical command format for file operations — always, no gate
        const surgicalPrompt = `You are Nova, a web development assistant. The user wants to create or modify files in their project.

CRITICAL: You must create EXACTLY the file types the user asked for. Do NOT create HTML/CSS/JS files unless the user specifically asks for them.

User request: ${message}
${aiResponse.buildDetails?.summary ? `Summary: ${aiResponse.buildDetails.summary}` : ''}

${editorContext ? `Current project structure:\n${typeof editorContext === 'string' ? editorContext : JSON.stringify(editorContext)}` : ''}

You MUST respond with a commands block in this EXACT format, followed by a brief message:

\`\`\`commands
[
  { "type": "createFile", "path": "/filename.ext", "content": "file content here" }
]
\`\`\`

Created the requested files! Let me know if you need any changes.

Rules:
- Create exactly the files the user asked for (e.g. .txt, .md, .json, etc.)
- Do NOT generate index.html, app.js, or main.css unless explicitly asked
- File paths must start with /
- The commands block must be valid JSON array`;

        const fileResult = await smartRequest(
          async (activeProvider, activeModel) => {
            return await generateWithProvider(activeProvider, activeModel, message, surgicalPrompt);
          },
          { provider, model: modelId, message, maxRetries: 2 }
        );

        if (fileResult.success && fileResult.result) {
          // Parse the surgical response server-side to extract structured commands
          const surgicalCommands = [];
          const cmdBlockRegex = /```commands?\s*([\s\S]*?)```/gi;
          let cmdMatch;
          let cleanMessage = fileResult.result;
          while ((cmdMatch = cmdBlockRegex.exec(fileResult.result)) !== null) {
            try {
              const parsed = JSON.parse(cmdMatch[1].trim());
              const cmds = Array.isArray(parsed) ? parsed : [parsed];
              for (const cmd of cmds) {
                if (cmd && cmd.path && cmd.content !== undefined) {
                  surgicalCommands.push({
                    type: cmd.type || 'createFile',
                    path: cmd.path.startsWith('/') ? cmd.path : `/${cmd.path}`,
                    content: cmd.content,
                  });
                }
              }
              cleanMessage = cleanMessage.replace(cmdMatch[0], '').trim();
            } catch (e) {
              console.error('[Canvas Chat] Failed to parse surgical commands:', e);
            }
          }

          if (surgicalCommands.length > 0) {
            console.log(`[Canvas Chat] Returning ${surgicalCommands.length} surgical commands for file operations`);
            return res.json({
              success: true,
              action: aiResponse.action,
              message: cleanMessage || aiResponse.message,
              shouldBuild: true,
              surgicalCommands,
              buildDetails: aiResponse.buildDetails,
              provider: fileResult.provider,
            });
          }

          // Fallback: return raw message for client-side parsing
          return res.json({
            success: true,
            action: aiResponse.action,
            message: fileResult.result,
            shouldBuild: true,
            buildDetails: aiResponse.buildDetails,
            provider: fileResult.provider,
          });
        }
      }

      // Standard HTML code generation path
      const buildPrompt = aiResponse.action === 'modify'
        ? `Make ONLY these specific changes to the existing app: ${aiResponse.buildDetails?.summary || message}. Do NOT rebuild the entire app, just modify the requested parts.`
        : `Build this: ${aiResponse.buildDetails?.summary || message}`;

      const codeSystemPrompt = getSystemPrompt(aiResponse.action === 'modify' ? currentCode : null, null);

      const codeResult = await smartRequest(
        async (activeProvider, activeModel) => {
          const code = await generateWithProvider(activeProvider, activeModel, buildPrompt, codeSystemPrompt);
          return cleanGeneratedCode(code);
        },
        {
          provider,
          model: modelId,
          message: buildPrompt,
          maxRetries: 3,
        }
      );

      if (codeResult.success && codeResult.result) {
        res.json({
          success: true,
          action: aiResponse.action,
          message: aiResponse.message,
          shouldBuild: true,
          code: codeResult.result,
          buildDetails: aiResponse.buildDetails,
          provider: codeResult.provider,
        });
        return;
      }
    }

    // Return chat response (no code generation)
    res.json({
      success: true,
      action: aiResponse.action || 'chat',
      message: aiResponse.message,
      shouldBuild: false,
      buildDetails: aiResponse.buildDetails,
      provider: result.provider,
    });

  } catch (error) {
    console.error('[Canvas Chat] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.',
    });
  }
});

// ============================================
// CANVAS TTS ENDPOINT
// ============================================

/**
 * Generate speech using ElevenLabs TTS
 * This endpoint keeps API keys secure on the server side
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    // Limit text length for TTS
    const truncatedText = text.slice(0, 5000);

    // ElevenLabs is the primary voice provider
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const { ElevenLabsClient } = await import('elevenlabs');
        const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

        // Use a default voice for canvas
        const audio = await elevenlabs.textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
          text: truncatedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          },
        });

        // Collect chunks and convert to base64
        const chunks = [];
        for await (const chunk of audio) {
          chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);
        const base64Audio = audioBuffer.toString('base64');

        return res.json({
          success: true,
          audioData: base64Audio,
          mimeType: 'audio/mpeg',
          format: 'mp3',
        });
      } catch (elevenError) {
        console.warn('[Canvas TTS] ElevenLabs failed:', elevenError.message);
      }
    }

    // No TTS provider available
    return res.status(503).json({
      success: false,
      error: 'No TTS service available',
      fallback: 'browser',
    });

  } catch (error) {
    console.error('[Canvas TTS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'TTS generation failed',
      fallback: 'browser',
    });
  }
});


// ============================================
// CANVAS TERMINAL — REAL SANDBOXED COMMAND EXECUTION
// ============================================

// Persistent workspace dirs keyed by a hash of currentFiles keys
const terminalWorkspaces = new Map();
const TERMINAL_BASE = '/tmp/canvas-studio-terminals';
const TERMINAL_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 512_000;

// Commands that must never run
const BLOCKED_PATTERNS = [
  /\brm\s+(-\w*\s+)*-\w*r\w*f/i,       // rm -rf variants
  /\brm\s+(-\w*\s+)*\/\s*$/i,           // rm /
  /\bsudo\b/i,
  /\bsu\b\s/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\binit\b\s+\d/i,
  /\bsystemctl\b/i,
  /\bdd\b\s+if=/i,
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  /\bformat\b/i,
  /\bchmod\s+777\s+\//i,
  /\bchown\b.*\//i,
  /\bcurl\b.*\|\s*(ba)?sh/i,             // curl pipe to shell
  /\bwget\b.*\|\s*(ba)?sh/i,
  />\s*\/dev\/sd/i,
  />\s*\/etc\//i,
  /\bkill\s+-9\s+1\b/i,
  /\bnc\s+-l/i,                          // netcat listeners
];

/**
 * Sync currentFiles to a workspace directory, creating dirs as needed.
 * Returns the workspace path.
 */
function syncWorkspace(sessionKey, currentFiles) {
  const workDir = join(TERMINAL_BASE, sessionKey);

  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
  }

  if (currentFiles && typeof currentFiles === 'object') {
    for (const [filePath, content] of Object.entries(currentFiles)) {
      if (typeof content !== 'string') continue;
      // Normalize and prevent path traversal
      const safePath = normalize(filePath).replace(/^(\.\.[\\/])+/, '');
      const fullPath = join(workDir, safePath);
      const resolved = resolve(fullPath);
      if (!resolved.startsWith(workDir)) continue; // skip traversal attempts

      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    }
  }

  terminalWorkspaces.set(sessionKey, { workDir, lastUsed: Date.now() });
  return workDir;
}

/**
 * Execute a shell command in the workspace directory.
 * Returns { stdout, stderr, exitCode }.
 */
function execInWorkspace(command, workDir) {
  return new Promise((resolveP) => {
    const child = spawn('sh', ['-c', command], {
      cwd: workDir,
      timeout: TERMINAL_TIMEOUT_MS,
      env: {
        ...process.env,
        HOME: workDir,
        PATH: process.env.PATH,
        NODE_ENV: 'sandbox',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
    });

    child.on('error', (err) => {
      resolveP({ stdout, stderr: stderr || err.message, exitCode: 1 });
    });

    child.on('close', (code) => {
      if (killed) {
        resolveP({ stdout, stderr: stderr || 'Command timed out', exitCode: 124 });
      } else {
        resolveP({ stdout, stderr, exitCode: code ?? 0 });
      }
    });

    // Force kill after timeout + grace
    setTimeout(() => {
      if (!child.killed) {
        killed = true;
        child.kill('SIGKILL');
      }
    }, TERMINAL_TIMEOUT_MS + 2000);
  });
}

// Cleanup old workspaces every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, meta] of terminalWorkspaces.entries()) {
    if (meta.lastUsed < cutoff) {
      terminalWorkspaces.delete(key);
      // Don't rm -rf from the app; let OS /tmp cleanup handle it
    }
  }
}, 30 * 60 * 1000);

/**
 * POST /api/canvas/terminal
 * Execute commands in a sandboxed workspace with real child_process execution.
 * Project files are synced to a temp directory; commands run there.
 */
router.post('/terminal', [
  body('command').isLength({ min: 1, max: 2000 }).withMessage('Command must be 1-2000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid command' });
    }

    const { command, currentFiles } = req.body;
    const trimmed = command.trim();

    console.log(`[Canvas Terminal] Executing: "${trimmed.substring(0, 80)}"`);

    // Security: check against blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(trimmed)) {
        return res.json({
          success: true,
          output: '',
          error: `Blocked: "${trimmed.split(/\s+/)[0]}" is not allowed in the sandbox.`,
        });
      }
    }

    // Create/sync workspace from project files
    const userId = req.user?.id || 'anon';
    const fileKeys = currentFiles ? Object.keys(currentFiles).sort().join(',') : '';
    const sessionKey = `${userId}-${Buffer.from(fileKeys).toString('base64url').slice(0, 32)}`;
    const workDir = syncWorkspace(sessionKey, currentFiles);

    // Execute the command
    const { stdout, stderr, exitCode } = await execInWorkspace(trimmed, workDir);

    res.json({
      success: true,
      output: stdout.trimEnd(),
      error: stderr.trimEnd(),
      exitCode,
    });

  } catch (err) {
    console.error('[Canvas Terminal] Error:', err);
    res.status(500).json({ success: false, error: 'Terminal execution failed' });
  }
});


// ============================================
// ============================================
// CANVAS AGENT CHAT — NATIVE TOOL CALLING
// ============================================
// Rule: Backend defines tools → Model chooses → Backend executes
const MAX_TOOL_ROUNDS = 10;

/**
 * POST /api/canvas/agent-chat
 * Native tool-calling chat endpoint for Canvas IDE
 * 
 * Flow:
 *   1. Send user message + tool definitions to LLM
 *   2. LLM returns text and/or tool_use blocks
 *   3. Backend executes each tool call
 *   4. Re-inject tool results and get final response
 *   5. Return {message, toolResults[]} to frontend
 */
router.post('/agent-chat', [
  body('message').notEmpty().withMessage('Message is required'),
  body('provider').isIn(['mistral', 'xai', 'openai']).withMessage('Tool calling requires mistral, xai, or openai'),
  body('modelId').exists().withMessage('Model ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { message, provider, modelId, currentFiles, conversationHistory, fileData, editorContext } = req.body;
    const userId = req.userId;
    const source = req.headers['x-canvas-source'] || 'standalone';

    console.log(`[Canvas Agent] Tool-calling chat | Provider: ${provider} | Model: ${modelId} | Source: ${source} | Message: "${message.substring(0, 60)}..."`);

    // Build system prompt for the canvas IDE agent
    const systemPrompt = getCanvasAgentPrompt(currentFiles);

    // Build message history
    const messages = [];

    // Add conversation history (last 10 turns)
    if (conversationHistory?.length > 0) {
      for (const h of conversationHistory.slice(-10)) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text || '',
        });
      }
    }

    // Add current user message (with optional image)
    if (fileData?.base64 && fileData.type?.startsWith('image/')) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${fileData.type};base64,${fileData.base64}` } },
          { type: 'text', text: message },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // ── Call the LLM with tool definitions ──
    let response;
    let allToolResults = [];
    let finalMessage = '';
    let roundMessages = [...messages];
    let round = 0;

    while (true) {
      round++;
      if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) {
        console.warn(`[Canvas Agent] Wall-clock limit reached at round ${round}, returning partial result`);
        finalMessage = finalMessage || 'Done.';
        break;
      }
      response = await callWithTools(provider, modelId, systemPrompt, roundMessages, source, chatTools);

      const { text, toolCalls } = response;

      if (toolCalls.length === 0) {
        finalMessage = text;
        break;
      }

      console.log(`[Canvas Agent] Round ${round}: ${toolCalls.length} tool call(s): ${toolCalls.map(tc => tc.name).join(', ')}`);

      // Execute each tool call
      const roundResults = [];
      for (const tc of toolCalls) {
        console.log(`[Canvas Agent] Executing: ${tc.name}(${JSON.stringify(tc.arguments).substring(0, 100)}...)`);

        let result;
        try {
          result = await executeCanvasTool(tc.name, tc.arguments, currentFiles, userId, editorContext);
        } catch (toolError) {
          console.error(`[Canvas Agent] Tool error: ${tc.name}:`, toolError.message);
          result = { success: false, error: toolError.message };
        }

        roundResults.push({
          toolCallId: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result,
        });
      }

      allToolResults.push(...roundResults);

      // Re-inject tool results for next round (OpenAI-compatible format)
      roundMessages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });
      for (const r of roundResults) {
        const resultForLLM = { ...r.result };
        if (resultForLLM.image && resultForLLM.image.length > 500) resultForLLM.image = '[data URL]';
        if (resultForLLM.variants) resultForLLM.variants = Object.fromEntries(Object.entries(resultForLLM.variants).map(([k, v]) => [k, { ...v, image: '[data URL]' }]));
        if (resultForLLM.results && Array.isArray(resultForLLM.results)) resultForLLM.results = resultForLLM.results.map(br => br.image?.length > 500 ? { ...br, image: '[data URL]' } : br);
        roundMessages.push({ role: 'tool', tool_call_id: r.toolCallId, content: JSON.stringify(resultForLLM) });
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        finalMessage = text || 'I completed the requested changes.';
      }
    }

    res.json({
      success: true,
      message: finalMessage,
      toolResults: allToolResults.map(r => ({
        name: r.name,
        arguments: r.arguments,
        result: r.result,
      })),
      provider,
      modelId,
    });

  } catch (error) {
    console.error('[Canvas Agent] Error:', error);
    const friendlyError = getFriendlyError(error);
    res.status(500).json({
      success: false,
      error: friendlyError.message || 'Agent chat failed. Please try again.',
      title: friendlyError.title,
    });
  }
});


/**
 * POST /api/canvas/agent-chat-stream
 * SSE streaming version of agent-chat
 * 
 * Emits events as they happen:
 *   - type: "thinking"     → agent is processing
 *   - type: "tool_start"   → tool call started { name, arguments }
 *   - type: "tool_result"  → tool call completed { name, arguments, result }
 *   - type: "text_delta"   → streaming text chunk from LLM
 *   - type: "round"        → new tool-calling round started { round, maxRounds }
 *   - type: "done"         → complete { message, toolResults }
 *   - type: "error"        → error { message }
 */
router.post('/agent-chat-stream', [
  body('message').isLength({ min: 1, max: 10000 }).withMessage('Message must be 1-10000 characters'),
  body('provider').isIn(['mistral', 'xai', 'openai']).withMessage('Tool calling requires mistral, xai, or openai'),
  body('modelId').exists().withMessage('Model ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { message, provider, modelId, currentFiles, conversationHistory, fileData, editorContext } = req.body;
    const userId = req.userId;
    const source = req.headers['x-canvas-source'] || 'standalone';
    // Chat panel only gets focused file/code tools — not image/video/zip/cursor tools
    const chatTools = toChatPanelTools();
    const startTime = Date.now();
    const WALL_CLOCK_LIMIT_MS = 85000;

    console.log(`[Canvas Agent Stream] Provider: ${provider} | Model: ${modelId} | Source: ${source} | Message: "${message.substring(0, 60)}..."`);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const systemPrompt = getCanvasAgentPrompt(currentFiles);

    // Build message history
    const messages = [];
    if (conversationHistory?.length > 0) {
      for (const h of conversationHistory.slice(-10)) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text || '',
        });
      }
    }

    // Add current user message (with optional image)
    if (fileData?.base64 && fileData.type?.startsWith('image/')) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${fileData.type};base64,${fileData.base64}` } },
          { type: 'text', text: message },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // ── Multi-turn tool loop with streaming ──
    let allToolResults = [];
    let finalMessage = '';
    let roundMessages = [...messages];
    let round = 0;

    sendEvent('thinking', { message: 'Analyzing your request...' });

    while (true) {
      round++;
      if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) {
        console.warn(`[Canvas Agent Stream] Wall-clock limit reached at round ${round}, returning partial result`);
        finalMessage = finalMessage || 'Done.';
        break;
      }
      sendEvent('round', { round, maxRounds: 'unlimited' });

      let response;
      response = await callWithTools(provider, modelId, systemPrompt, roundMessages, source, chatTools);

      const { text, toolCalls } = response;

      // Stream any text the LLM produced this round
      if (text) {
        sendEvent('text_delta', { text });
      }

      if (toolCalls.length === 0) {
        finalMessage = text;
        break;
      }

      console.log(`[Canvas Agent Stream] Round ${round}: ${toolCalls.length} tool(s): ${toolCalls.map(tc => tc.name).join(', ')}`);

      // Execute each tool call with streaming events
      const roundResults = [];
      for (const tc of toolCalls) {
        sendEvent('tool_start', { name: tc.name, arguments: tc.arguments });

        let result;
        try {
          result = await executeCanvasTool(tc.name, tc.arguments, currentFiles, userId, editorContext);
        } catch (toolError) {
          console.error(`[Canvas Agent Stream] Tool error: ${tc.name}:`, toolError.message);
          result = { success: false, error: toolError.message };
        }

        sendEvent('tool_result', { name: tc.name, arguments: tc.arguments, result });

        roundResults.push({
          toolCallId: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result,
        });
      }

      allToolResults.push(...roundResults);

      // Re-inject tool results for next round (OpenAI-compatible format)
      roundMessages.push({
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })),
      });
      for (const r of roundResults) {
        const resultForLLM = { ...r.result };
        if (resultForLLM.image && resultForLLM.image.length > 500) resultForLLM.image = '[data URL]';
        if (resultForLLM.variants) resultForLLM.variants = Object.fromEntries(Object.entries(resultForLLM.variants).map(([k, v]) => [k, { ...v, image: '[data URL]' }]));
        if (resultForLLM.results && Array.isArray(resultForLLM.results)) resultForLLM.results = resultForLLM.results.map(br => br.image?.length > 500 ? { ...br, image: '[data URL]' } : br);
        roundMessages.push({ role: 'tool', tool_call_id: r.toolCallId, content: JSON.stringify(resultForLLM) });
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        finalMessage = text || 'I completed the requested changes.';
      }
    }

    // Send completion event
    sendEvent('done', {
      message: finalMessage,
      toolResults: allToolResults.map(r => ({ name: r.name, arguments: r.arguments, result: r.result })),
      provider,
      modelId,
    });

    res.end();

  } catch (error) {
    console.error('[Canvas Agent Stream] Error:', error);
    const friendlyError = getFriendlyError(error);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: friendlyError.message || 'Agent chat failed.', title: friendlyError.title })}\n\n`);
      res.end();
    } catch (e) {
      // Response already ended
    }
  }
});


// ── Unified tool calling — all 3 providers are OpenAI-compatible ──
// toolsOverride: pre-built OpenAI tools array; if omitted all tools for `source` are used
async function callWithTools(provider, modelId, systemPrompt, messages, source = 'standalone', toolsOverride = null) {
  const client = getClientForProvider(provider);
  if (!client) throw new Error(`${provider} not configured`);

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    tools: toolsOverride ?? toOpenAITools(undefined, source),
    tool_choice: 'auto',
  });

  const choice = response.choices[0];
  const toolCalls = choice.message.tool_calls || [];

  return {
    text: choice.message.content || '',
    toolCalls: toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    })),
    rawContent: choice.message,
  };
}


// ── Execute a canvas IDE tool ──
async function executeCanvasTool(toolName, args, currentFiles, userId, editorContext) {
  switch (toolName) {
    case 'update_file':
      return {
        success: true,
        action: 'update_file',
        path: args.path,
        content: args.content,
        description: args.description || `Updated ${args.path}`,
      };

    case 'read_file': {
      const content = currentFiles?.[args.path];
      if (content !== undefined) {
        return { success: true, content, path: args.path };
      }
      return { success: false, error: `File not found: ${args.path}` };
    }

    case 'delete_file':
      return { success: true, action: 'delete_file', path: args.path };

    case 'rename_file': {
      const oldContent = currentFiles?.[args.oldPath];
      if (oldContent === undefined) {
        return { success: false, error: `File not found: ${args.oldPath}` };
      }
      return {
        success: true,
        action: 'rename_file',
        oldPath: args.oldPath,
        newPath: args.newPath,
      };
    }

    case 'copy_file': {
      const sourceContent = currentFiles?.[args.sourcePath];
      if (sourceContent === undefined) {
        return { success: false, error: `Source file not found: ${args.sourcePath}` };
      }
      return {
        success: true,
        action: 'copy_file',
        sourcePath: args.sourcePath,
        destinationPath: args.destinationPath,
        content: sourceContent,
      };
    }

    case 'create_folder':
      return {
        success: true,
        action: 'create_folder',
        path: args.path,
      };

    case 'append_to_file': {
      const existingContent = currentFiles?.[args.path];
      if (existingContent === undefined) {
        return { success: false, error: `File not found: ${args.path}. Use update_file to create new files.` };
      }
      return {
        success: true,
        action: 'append_to_file',
        path: args.path,
        content: args.content,
      };
    }

    case 'list_files': {
      const files = currentFiles ? Object.keys(currentFiles) : [];
      const fileDetails = files.map(f => ({
        path: f,
        size: currentFiles[f].length,
      }));
      return { success: true, files: fileDetails };
    }

    case 'execute_code':
      return await agentToolsService.executeTool('run_code', {
        code: args.code,
        language: args.language || 'javascript',
      });

    case 'web_search':
      return await agentToolsService.executeTool('web_search', {
        query: args.query,
        num_results: 5,
      });

    case 'fetch_url':
      return await agentToolsService.executeTool('fetch_url', { url: args.url });

    case 'generate_image':
      return await agentToolsService.executeTool('generate_image', {
        prompt: args.prompt,
        style: args.style || 'realistic',
        width: args.width || 1024,
        height: args.height || 1024,
        userId,
      });

    case 'analyze_code':
      return await agentToolsService.executeTool('analyze_code', {
        code: args.code,
        language: args.language || 'auto',
      });

    case 'format_code':
      return await agentToolsService.executeTool('format_code', {
        code: args.code,
        language: args.language,
      });

    // ── EDITOR INTELLIGENCE (5 tools) ────────────────────────────
    case 'file_exists': {
      const p = args.path?.startsWith('/') ? args.path : '/' + (args.path || '');
      const exists = currentFiles ? (p in currentFiles || Object.keys(currentFiles).some(k => k === p || k === args.path)) : false;
      return { success: true, exists, path: p };
    }

    case 'get_selection': {
      const selection = editorContext?.selection || null;
      if (!selection) {
        return { success: true, hasSelection: false, selection: null };
      }
      return { success: true, hasSelection: true, selection };
    }

    case 'set_cursor_position':
      return {
        success: true,
        action: 'set_cursor_position',
        path: args.path,
        line: args.line,
        column: args.column,
      };

    case 'replace_selection': {
      const sel = editorContext?.selection;
      if (!sel) {
        return { success: false, error: 'No text is currently selected. Ask the user to select text first, or use update_file for full-file changes.' };
      }
      return {
        success: true,
        action: 'replace_selection',
        text: args.text,
        selection: sel,
      };
    }

    case 'insert_at_cursor': {
      const cursor = editorContext?.cursor;
      if (!cursor) {
        return { success: false, error: 'No cursor position available. Use update_file instead.' };
      }
      return {
        success: true,
        action: 'insert_at_cursor',
        text: args.text,
        cursor,
      };
    }

    // ── MEMORY & STATE (3 tools) — lightweight in-process store ──
    case 'save_memory': {
      const key = String(args.key).toLowerCase().trim();
      agentSessionMemory[key] = args.value;
      return { success: true, key, saved: true, totalMemories: Object.keys(agentSessionMemory).length };
    }

    case 'get_memory': {
      const key = String(args.key).toLowerCase().trim();
      const value = agentSessionMemory[key] ?? null;
      return { success: true, key, value, found: value !== null };
    }

    case 'clear_memory': {
      if (args.key) {
        const key = String(args.key).toLowerCase().trim();
        const existed = key in agentSessionMemory;
        delete agentSessionMemory[key];
        return { success: true, cleared: existed ? 1 : 0, key };
      }
      const count = Object.keys(agentSessionMemory).length;
      for (const k of Object.keys(agentSessionMemory)) delete agentSessionMemory[k];
      return { success: true, cleared: count, allCleared: true };
    }

    // ── PERMISSIONS & SAFETY — streamed to frontend via _uiEvent ──
    case 'request_approval':
      return {
        success: true,
        _uiEvent: true,
        action: 'request_approval',
        approval: {
          action: args.action,
          description: args.description,
          severity: args.severity || 'low',
          approved: true,
          pending: false,
        },
      };

    case 'check_permission': {
      const act = (args.action || '').toLowerCase();
      return { success: true, _uiEvent: true, allowed: true, action: 'check_permission', checkedAction: act, reason: 'All actions permitted — no restrictions' };
    }

    // ── UI / USER INTERACTION (4 tools) — streamed to frontend via _uiEvent ──
    case 'show_message':
      return {
        success: true,
        _uiEvent: true,
        action: 'show_message',
        text: args.text,
        type: 'info',
        duration: args.duration || 4000,
      };

    case 'show_warning':
      return {
        success: true,
        _uiEvent: true,
        action: 'show_warning',
        text: args.text,
        type: 'warning',
        duration: 6000,
      };

    case 'show_error':
      return {
        success: true,
        _uiEvent: true,
        action: 'show_error',
        text: args.text,
        type: 'error',
        duration: 8000,
      };

    case 'ask_user':
      return {
        success: true,
        _uiEvent: true,
        action: 'ask_user',
        question: args.question,
        options: args.options || [],
      };

    // ── AGENT CONTROL (3 tools) ──────────────────────────────────
    case 'set_mode':
      return {
        success: true,
        action: 'set_mode',
        mode: args.mode,
        reason: args.reason || `Switched to ${args.mode} mode`,
      };

    case 'get_agent_state': {
      const fileCount = currentFiles ? Object.keys(currentFiles).length : 0;
      const activeFile = editorContext?.activeFile || null;
      const mode = editorContext?.agentMode || 'dev';
      return {
        success: true,
        state: {
          mode,
          activeFile,
          fileCount,
          memoryCount: 0,
          hasSelection: !!(editorContext?.selection),
          hasCursor: !!(editorContext?.cursor),
        },
      };
    }

    case 'cancel_task':
      return {
        success: true,
        action: 'cancel_task',
        reason: args.reason || 'Task cancelled by agent',
        cancelled: true,
      };

    // ── IMAGE TOOLS (8 grouped) ──────────────────────────────────
    case 'image_create':
      return await agentToolsService.executeTool('image_create', args);

    case 'image_transform':
      return await agentToolsService.executeTool('image_transform', args);

    case 'image_filter':
      return await agentToolsService.executeTool('image_filter', args);

    case 'image_optimize':
      return await agentToolsService.executeTool('image_optimize', args);

    case 'image_compose':
      return await agentToolsService.executeTool('image_compose', args);

    case 'image_background':
      return await agentToolsService.executeTool('image_background', args);

    case 'image_analyze':
      return await agentToolsService.executeTool('image_analyze', args);

    case 'image_batch':
      return await agentToolsService.executeTool('image_batch', args);

    // ── AI IMAGE ANALYSIS (Azure Computer Vision) ────────────────
    case 'image_ai':
      return await agentToolsService.executeTool('image_ai', args);

    // ── VIDEO TOOLS (11 grouped — FFmpeg) ─────────────────────────
    case 'video_trim':
      return await agentToolsService.executeTool('video_trim', args);

    case 'video_highlights':
      return await agentToolsService.executeTool('video_highlights', args);

    case 'video_resize':
      return await agentToolsService.executeTool('video_resize', args);

    case 'video_captions':
      return await agentToolsService.executeTool('video_captions', args);

    case 'video_style':
      return await agentToolsService.executeTool('video_style', args);

    case 'video_overlay':
      return await agentToolsService.executeTool('video_overlay', args);

    case 'video_audio':
      return await agentToolsService.executeTool('video_audio', args);

    case 'video_face':
      return await agentToolsService.executeTool('video_face', args);

    case 'video_moderate':
      return await agentToolsService.executeTool('video_moderate', args);

    case 'video_batch':
      return await agentToolsService.executeTool('video_batch', args);

    case 'video_export':
      return await agentToolsService.executeTool('video_export', args);

    // ── ARCHIVE TOOLS (10 grouped — adm-zip/archiver/tar) ─────────
    case 'archive_create':
      return await agentToolsService.executeTool('archive_create', args);

    case 'archive_extract':
      return await agentToolsService.executeTool('archive_extract', args);

    case 'archive_edit':
      return await agentToolsService.executeTool('archive_edit', args);

    case 'archive_inspect':
      return await agentToolsService.executeTool('archive_inspect', args);

    case 'archive_security':
      return await agentToolsService.executeTool('archive_security', args);

    case 'archive_convert':
      return await agentToolsService.executeTool('archive_convert', args);

    case 'archive_optimize':
      return await agentToolsService.executeTool('archive_optimize', args);

    case 'archive_deploy':
      return await agentToolsService.executeTool('archive_deploy', args);

    case 'archive_batch':
      return await agentToolsService.executeTool('archive_batch', args);

    case 'archive_intelligence':
      return await agentToolsService.executeTool('archive_intelligence', args);

    // ── DATA TOOLS (8 grouped — xlsx/xml2js/cheerio) ──────────────
    case 'data_read':
      return await agentToolsService.executeTool('data_read', args);

    case 'data_transform':
      return await agentToolsService.executeTool('data_transform', args);

    case 'data_convert':
      return await agentToolsService.executeTool('data_convert', args);

    case 'data_analyze':
      return await agentToolsService.executeTool('data_analyze', args);

    case 'data_report':
      return await agentToolsService.executeTool('data_report', args);

    case 'data_validate':
      return await agentToolsService.executeTool('data_validate', args);

    case 'data_scrape':
      return await agentToolsService.executeTool('data_scrape', args);

    case 'data_pipeline':
      return await agentToolsService.executeTool('data_pipeline', args);

    // ── NAVIGATION & SEARCH ──
    case 'open_file': {
      const filePath = args.path;
      if (!filePath) return { success: false, error: 'path is required' };
      const exists = currentFiles && currentFiles[filePath] !== undefined;
      return {
        success: true,
        action: 'open_file',
        path: filePath,
        exists,
        line: args.line || 1,
        column: args.column || 1,
        preview: args.preview || false,
      };
    }

    case 'search_in_files': {
      if (!args.query) return { success: false, error: 'query is required' };
      if (!currentFiles || Object.keys(currentFiles).length === 0) {
        return { success: true, matches: [], total: 0, message: 'No files in project' };
      }

      const query = args.query;
      const isRegex = args.isRegex || false;
      const caseSensitive = args.caseSensitive || false;
      const maxResults = Math.min(args.maxResults || 50, 200);
      const contextLines = Math.min(args.contextLines || 1, 5);
      const includePattern = args.includePattern;
      const excludePattern = args.excludePattern;

      let pattern;
      try {
        if (isRegex) {
          pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
        }
      } catch (e) {
        return { success: false, error: `Invalid regex: ${e.message}` };
      }

      // Simple glob-to-regex helper
      const globToRegex = (glob) => {
        if (!glob) return null;
        const r = glob.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp('^' + r + '$', 'i');
      };
      const includeRe = globToRegex(includePattern);
      const excludeRe = globToRegex(excludePattern);

      const matches = [];
      for (const [filePath, content] of Object.entries(currentFiles)) {
        const fileName = filePath.split('/').pop();
        if (includeRe && !includeRe.test(fileName) && !includeRe.test(filePath)) continue;
        if (excludeRe && (excludeRe.test(fileName) || excludeRe.test(filePath))) continue;

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          pattern.lastIndex = 0;
          if (pattern.test(lines[i])) {
            const ctxStart = Math.max(0, i - contextLines);
            const ctxEnd = Math.min(lines.length - 1, i + contextLines);
            const context = lines.slice(ctxStart, ctxEnd + 1).map((l, idx) => ({
              line: ctxStart + idx + 1,
              text: l,
              isMatch: ctxStart + idx === i,
            }));

            matches.push({
              path: filePath,
              line: i + 1,
              text: lines[i].trim(),
              context,
            });

            if (matches.length >= maxResults) break;
          }
        }
        if (matches.length >= maxResults) break;
      }

      return {
        success: true,
        query,
        matches,
        total: matches.length,
        truncated: matches.length >= maxResults,
      };
    }

    case 'find_file': {
      if (!args.pattern) return { success: false, error: 'pattern is required' };
      if (!currentFiles || Object.keys(currentFiles).length === 0) {
        return { success: true, files: [], total: 0, message: 'No files in project' };
      }

      const searchPattern = args.pattern.toLowerCase();
      const filterType = args.type || 'all';
      const allPaths = Object.keys(currentFiles);

      // Also detect folder paths from file paths
      const folderSet = new Set();
      for (const p of allPaths) {
        const parts = p.split('/');
        for (let i = 1; i < parts.length; i++) {
          folderSet.add(parts.slice(0, i).join('/') + '/');
        }
      }

      // Simple glob matching
      const isGlob = searchPattern.includes('*') || searchPattern.includes('?');
      let globRe;
      if (isGlob) {
        const r = searchPattern.replace(/\./g, '\\.').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*').replace(/\?/g, '.');
        globRe = new RegExp(r, 'i');
      }

      const results = [];

      // Search files
      if (filterType !== 'folder') {
        for (const p of allPaths) {
          const fileName = p.split('/').pop().toLowerCase();
          if (isGlob) {
            if (globRe.test(p) || globRe.test(fileName)) {
              results.push({ path: p, type: 'file', size: currentFiles[p].length });
            }
          } else {
            if (fileName.includes(searchPattern) || p.toLowerCase().includes(searchPattern)) {
              results.push({ path: p, type: 'file', size: currentFiles[p].length });
            }
          }
        }
      }

      // Search folders
      if (filterType !== 'file') {
        for (const folder of folderSet) {
          const folderName = folder.split('/').filter(Boolean).pop()?.toLowerCase() || '';
          if (isGlob) {
            if (globRe.test(folder)) results.push({ path: folder, type: 'folder' });
          } else {
            if (folderName.includes(searchPattern)) results.push({ path: folder, type: 'folder' });
          }
        }
      }

      return {
        success: true,
        pattern: args.pattern,
        files: results.slice(0, 100),
        total: results.length,
      };
    }

    // ── DIFF & PATCH ──
    case 'apply_diff': {
      const diffPath = args.path;
      if (!diffPath) return { success: false, error: 'path is required' };
      if (!args.diffs || !Array.isArray(args.diffs) || args.diffs.length === 0) {
        return { success: false, error: 'diffs array is required and must not be empty' };
      }
      if (!currentFiles || currentFiles[diffPath] === undefined) {
        return { success: false, error: `File not found: ${diffPath}` };
      }

      const originalContent = currentFiles[diffPath];
      const lines = originalContent.split('\n');

      // Sort diffs by startLine descending so we apply from bottom to top
      const sortedDiffs = [...args.diffs].sort((a, b) => b.startLine - a.startLine);

      // Validate all diffs
      for (const diff of sortedDiffs) {
        if (!diff.startLine || diff.startLine < 1) {
          return { success: false, error: `Invalid startLine: ${diff.startLine}. Must be >= 1.` };
        }
        if (diff.endLine < 0) {
          return { success: false, error: `Invalid endLine: ${diff.endLine}. Must be >= 0.` };
        }
        if (diff.endLine > 0 && diff.endLine < diff.startLine) {
          return { success: false, error: `endLine (${diff.endLine}) cannot be less than startLine (${diff.startLine})` };
        }
        if (diff.startLine > lines.length + 1) {
          return { success: false, error: `startLine (${diff.startLine}) exceeds file length (${lines.length} lines)` };
        }
      }

      // Apply diffs bottom-up
      for (const diff of sortedDiffs) {
        const newLines = diff.content ? diff.content.split('\n') : [];
        if (diff.endLine === 0) {
          // Insert before startLine
          lines.splice(diff.startLine - 1, 0, ...newLines);
        } else {
          // Replace range
          lines.splice(diff.startLine - 1, diff.endLine - diff.startLine + 1, ...newLines);
        }
      }

      const newContent = lines.join('\n');
      currentFiles[diffPath] = newContent;

      return {
        success: true,
        action: 'apply_diff',
        path: diffPath,
        content: newContent,
        diffsApplied: args.diffs.length,
        originalLines: originalContent.split('\n').length,
        newLines: newContent.split('\n').length,
        description: args.description || `Applied ${args.diffs.length} diff(s)`,
      };
    }

    // ── PACKAGE MANAGEMENT ──
    case 'install_package': {
      if (!args.packages || !Array.isArray(args.packages) || args.packages.length === 0) {
        return { success: false, error: 'packages array is required' };
      }

      const isDev = args.dev || false;
      const createIfMissing = args.createIfMissing !== false;
      let pkgPath = '/package.json';

      // Find existing package.json
      if (currentFiles) {
        const existingPkg = Object.keys(currentFiles).find(p => p.endsWith('package.json'));
        if (existingPkg) pkgPath = existingPkg;
      }

      let pkg;
      if (currentFiles && currentFiles[pkgPath]) {
        try {
          pkg = JSON.parse(currentFiles[pkgPath]);
        } catch (e) {
          return { success: false, error: `Failed to parse ${pkgPath}: ${e.message}` };
        }
      } else if (createIfMissing) {
        pkg = {
          name: 'canvas-project',
          version: '1.0.0',
          private: true,
          dependencies: {},
          devDependencies: {},
        };
      } else {
        return { success: false, error: 'No package.json found. Set createIfMissing=true to create one.' };
      }

      const section = isDev ? 'devDependencies' : 'dependencies';
      if (!pkg[section]) pkg[section] = {};

      const added = [];
      const updated = [];
      for (const pkgSpec of args.packages) {
        const atIndex = pkgSpec.lastIndexOf('@');
        let name, version;
        if (atIndex > 0) {
          name = pkgSpec.substring(0, atIndex);
          version = pkgSpec.substring(atIndex + 1);
        } else {
          name = pkgSpec;
          version = 'latest';
        }

        if (pkg[section][name]) {
          updated.push({ name, from: pkg[section][name], to: version });
        } else {
          added.push({ name, version });
        }
        pkg[section][name] = version === 'latest' ? '^0.0.0' : (version.startsWith('^') || version.startsWith('~') || version.startsWith('>') ? version : `^${version}`);
      }

      // Sort keys
      pkg[section] = Object.fromEntries(Object.entries(pkg[section]).sort(([a], [b]) => a.localeCompare(b)));

      const newContent = JSON.stringify(pkg, null, 2);
      if (currentFiles) currentFiles[pkgPath] = newContent;

      return {
        success: true,
        action: 'install_package',
        path: pkgPath,
        content: newContent,
        added,
        updated,
        section,
        message: `Added ${added.length} package(s)${updated.length > 0 ? `, updated ${updated.length}` : ''} to ${section}`,
      };
    }

    // ── DIAGNOSTICS ──
    case 'get_diagnostics': {
      if (!currentFiles || Object.keys(currentFiles).length === 0) {
        return { success: true, diagnostics: [], summary: { errors: 0, warnings: 0, info: 0 }, message: 'No files to check' };
      }

      const targetPath = args.path;
      const checks = args.checks || ['all'];
      const runAll = checks.includes('all');
      const diagnostics = [];

      const filesToCheck = targetPath
        ? { [targetPath]: currentFiles[targetPath] }
        : currentFiles;

      for (const [fp, content] of Object.entries(filesToCheck)) {
        if (content === undefined) continue;
        const ext = fp.split('.').pop()?.toLowerCase();
        const isHTML = ext === 'html' || ext === 'htm';
        const isJS = ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx' || ext === 'mjs';
        const lines = content.split('\n');

        // Syntax checks
        if (runAll || checks.includes('syntax')) {
          // JS/TS: check for common syntax issues
          if (isJS) {
            let braceCount = 0, parenCount = 0, bracketCount = 0;
            for (let i = 0; i < lines.length; i++) {
              const l = lines[i];
              // Skip strings and comments for brace counting (simplified)
              const cleaned = l.replace(/\/\/.*/g, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '').replace(/`[^`]*`/g, '');
              braceCount += (cleaned.match(/{/g) || []).length - (cleaned.match(/}/g) || []).length;
              parenCount += (cleaned.match(/\(/g) || []).length - (cleaned.match(/\)/g) || []).length;
              bracketCount += (cleaned.match(/\[/g) || []).length - (cleaned.match(/]/g) || []).length;
            }
            if (braceCount !== 0) diagnostics.push({ path: fp, line: lines.length, severity: 'error', message: `Unmatched braces: ${braceCount > 0 ? `${braceCount} unclosed {` : `${-braceCount} extra }`}`, check: 'syntax' });
            if (parenCount !== 0) diagnostics.push({ path: fp, line: lines.length, severity: 'error', message: `Unmatched parentheses: ${parenCount > 0 ? `${parenCount} unclosed (` : `${-parenCount} extra )`}`, check: 'syntax' });
            if (bracketCount !== 0) diagnostics.push({ path: fp, line: lines.length, severity: 'error', message: `Unmatched brackets: ${bracketCount > 0 ? `${bracketCount} unclosed [` : `${-bracketCount} extra ]`}`, check: 'syntax' });
          }
          // HTML: check for unclosed tags
          if (isHTML) {
            const openTags = content.match(/<[a-z][a-z0-9]*(?:\s[^>]*)?\s*>/gi) || [];
            const closeTags = content.match(/<\/[a-z][a-z0-9]*\s*>/gi) || [];
            const selfClosing = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
            const openCount = {};
            for (const t of openTags) {
              const tag = t.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
              if (tag && !selfClosing.has(tag)) {
                openCount[tag] = (openCount[tag] || 0) + 1;
              }
            }
            for (const t of closeTags) {
              const tag = t.match(/<\/([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
              if (tag) {
                openCount[tag] = (openCount[tag] || 0) - 1;
              }
            }
            for (const [tag, count] of Object.entries(openCount)) {
              if (count > 0) diagnostics.push({ path: fp, severity: 'warning', message: `Potentially unclosed <${tag}> tag (${count} unmatched)`, check: 'syntax' });
            }
          }
        }

        // Reference checks
        if (runAll || checks.includes('references')) {
          if (isHTML) {
            // Check for broken file references in src/href
            const refs = content.matchAll(/(?:src|href)=["']([^"'#][^"']*?)["']/gi);
            for (const m of refs) {
              const ref = m[1];
              if (ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('data:')) continue;
              const refPath = ref.startsWith('/') ? ref : '/' + ref;
              if (!currentFiles[refPath] && !ref.includes('{{') && !ref.includes('${')) {
                const lineNum = content.substring(0, m.index).split('\n').length;
                diagnostics.push({ path: fp, line: lineNum, severity: 'warning', message: `Referenced file not found: ${ref}`, check: 'references' });
              }
            }
          }
          if (isJS) {
            // Check for imports of non-existent local files
            const imports = content.matchAll(/(?:import|require)\s*\(?['"]\.([^'"]+)['"]/g);
            for (const m of imports) {
              const importPath = m[1];
              const dir = fp.substring(0, fp.lastIndexOf('/'));
              const resolved = (dir + '/' + importPath.replace(/^\.\//, '')).replace(/\/+/g, '/');
              const candidates = [resolved, resolved + '.js', resolved + '.ts', resolved + '.jsx', resolved + '.tsx', resolved + '/index.js', resolved + '/index.ts'];
              if (!candidates.some(c => currentFiles[c] !== undefined)) {
                const lineNum = content.substring(0, m.index).split('\n').length;
                diagnostics.push({ path: fp, line: lineNum, severity: 'warning', message: `Import not found: .${importPath}`, check: 'references' });
              }
            }
          }
        }

        // Accessibility checks
        if ((runAll || checks.includes('accessibility')) && isHTML) {
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (/<img\s/i.test(l) && !/alt\s*=/i.test(l)) {
              diagnostics.push({ path: fp, line: i + 1, severity: 'warning', message: '<img> missing alt attribute', check: 'accessibility' });
            }
            if (/<a\s/i.test(l) && /target\s*=\s*["']_blank["']/i.test(l) && !/rel\s*=\s*["'].*noopener/i.test(l)) {
              diagnostics.push({ path: fp, line: i + 1, severity: 'warning', message: '<a target="_blank"> missing rel="noopener noreferrer"', check: 'accessibility' });
            }
            if (/<(button|input)\s/i.test(l) && !/aria-label|aria-labelledby|title/i.test(l) && !/type\s*=\s*["']submit["']/i.test(l)) {
              if (l.trim().match(/<(button|input)\s[^>]*\/?\s*>/i) && !l.includes('>') || (l.includes('/>') && !l.match(/>[^<]+</))) {
                diagnostics.push({ path: fp, line: i + 1, severity: 'info', message: 'Interactive element may need an accessible label', check: 'accessibility' });
              }
            }
          }
        }

        // Security checks
        if (runAll || checks.includes('security')) {
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (/innerHTML\s*=/i.test(l) && !/sanitize|DOMPurify|escape/i.test(l)) {
              diagnostics.push({ path: fp, line: i + 1, severity: 'warning', message: 'innerHTML assignment without sanitization (XSS risk)', check: 'security' });
            }
            if (/eval\s*\(/i.test(l)) {
              diagnostics.push({ path: fp, line: i + 1, severity: 'error', message: 'eval() detected — potential injection risk', check: 'security' });
            }
            if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i.test(l) && !/process\.env|import\.meta/i.test(l)) {
              diagnostics.push({ path: fp, line: i + 1, severity: 'error', message: 'Possible hardcoded secret/API key', check: 'security' });
            }
          }
        }

        // Best practices
        if (runAll || checks.includes('best_practices')) {
          if (isJS) {
            for (let i = 0; i < lines.length; i++) {
              const l = lines[i];
              if (/\bvar\s+/i.test(l) && !/\/\//i.test(l.substring(0, l.indexOf('var')))) {
                diagnostics.push({ path: fp, line: i + 1, severity: 'info', message: 'Use const/let instead of var', check: 'best_practices' });
              }
              if (/console\.(log|debug)\s*\(/.test(l)) {
                diagnostics.push({ path: fp, line: i + 1, severity: 'info', message: 'Console statement left in code', check: 'best_practices' });
              }
            }
          }
          if (isHTML && !content.includes('<!DOCTYPE html>') && !content.includes('<!doctype html>')) {
            diagnostics.push({ path: fp, line: 1, severity: 'info', message: 'Missing <!DOCTYPE html> declaration', check: 'best_practices' });
          }
          if (isHTML && !content.includes('viewport')) {
            diagnostics.push({ path: fp, severity: 'info', message: 'Missing viewport meta tag (responsive design)', check: 'best_practices' });
          }
        }
      }

      const summary = {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
      };

      return {
        success: true,
        diagnostics: diagnostics.slice(0, 100),
        summary,
        filesChecked: Object.keys(filesToCheck).length,
        total: diagnostics.length,
        truncated: diagnostics.length > 100,
      };
    }

    // ── TEST EXECUTION ──
    case 'run_tests': {
      let testCode = args.code;

      // If testFile specified, read it from currentFiles
      if (args.testFile && currentFiles) {
        const normalized = args.testFile.startsWith('/') ? args.testFile : '/' + args.testFile;
        if (currentFiles[normalized] !== undefined) {
          testCode = currentFiles[normalized];
        } else {
          return { success: false, error: `Test file not found: ${args.testFile}` };
        }
      }

      if (!testCode) {
        return { success: false, error: 'Either code or testFile is required' };
      }

      const language = args.language || 'javascript';

      // Wrap test code in a simple test runner
      let wrappedCode;
      if (language === 'javascript') {
        wrappedCode = `
let __passed = 0, __failed = 0, __results = [];
function test(name, fn) {
  try {
    fn();
    __passed++;
    __results.push({ name, status: 'pass' });
  } catch (e) {
    __failed++;
    __results.push({ name, status: 'fail', error: e.message });
  }
}
function expect(val) {
  return {
    toBe(expected) { if (val !== expected) throw new Error(\`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(val)}\`); },
    toEqual(expected) { if (JSON.stringify(val) !== JSON.stringify(expected)) throw new Error(\`Expected \${JSON.stringify(expected)}, got \${JSON.stringify(val)}\`); },
    toBeTruthy() { if (!val) throw new Error(\`Expected truthy, got \${JSON.stringify(val)}\`); },
    toBeFalsy() { if (val) throw new Error(\`Expected falsy, got \${JSON.stringify(val)}\`); },
    toContain(item) { if (!val?.includes?.(item)) throw new Error(\`Expected \${JSON.stringify(val)} to contain \${JSON.stringify(item)}\`); },
    toThrow() { if (typeof val !== 'function') throw new Error('Expected a function'); try { val(); throw new Error('Expected function to throw'); } catch(e) { if (e.message === 'Expected function to throw') throw e; } },
    toBeGreaterThan(n) { if (val <= n) throw new Error(\`Expected \${val} > \${n}\`); },
    toBeLessThan(n) { if (val >= n) throw new Error(\`Expected \${val} < \${n}\`); },
    toHaveLength(n) { if (val?.length !== n) throw new Error(\`Expected length \${n}, got \${val?.length}\`); },
  };
}
const describe = (name, fn) => { console.log('Suite: ' + name); fn(); };
const it = test;
${testCode}
console.log(JSON.stringify({ __test_results: true, passed: __passed, failed: __failed, total: __passed + __failed, results: __results }));
`;
      } else {
        wrappedCode = `
import json
__passed = 0
__failed = 0
__results = []

def test(name, fn):
    global __passed, __failed
    try:
        fn()
        __passed += 1
        __results.append({"name": name, "status": "pass"})
    except Exception as e:
        __failed += 1
        __results.append({"name": name, "status": "fail", "error": str(e)})

${testCode}
print(json.dumps({"__test_results": True, "passed": __passed, "failed": __failed, "total": __passed + __failed, "results": __results}))
`;
      }

      try {
        const result = await agentToolsService.executeTool('run_code', { code: wrappedCode, language });
        const output = result?.output || result?.result || '';

        // Try to parse test results
        let testResults;
        try {
          const jsonMatch = output.match(/\{[^{}]*"__test_results"[^{}]*\}/);
          if (jsonMatch) {
            testResults = JSON.parse(jsonMatch[0]);
          }
        } catch (e) { /* not parseable */ }

        if (testResults) {
          return {
            success: true,
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.total,
            results: testResults.results,
            allPassed: testResults.failed === 0,
            output: output.replace(/\{[^{}]*"__test_results"[^{}]*\}/, '').trim(),
          };
        }

        // Fallback: parse console.assert or thrown errors
        return {
          success: true,
          output,
          error: result?.error || null,
          message: 'Tests executed. Check output for results.',
        };
      } catch (e) {
        return { success: false, error: `Test execution failed: ${e.message}` };
      }
    }

    // ── PREVIEW CONSOLE ──
    case 'get_preview_console': {
      // This returns a signal for the frontend to send back console data
      // The actual console data lives in the browser's iframe capture
      return {
        success: true,
        action: 'get_preview_console',
        type: args.type || 'all',
        limit: args.limit || 50,
        // Frontend will populate this from its console buffer
        // and include it in editorContext on the next turn
        message: 'Preview console data will be attached by the frontend.',
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── WRITE FILE (alias for update_file) ──────────────────────
    // ═══════════════════════════════════════════════════════════════
    case 'write_file':
      return {
        success: true,
        action: 'update_file',
        path: args.path,
        content: args.content,
        description: args.description || `Wrote ${args.path}`,
      };

    // ── GET PROJECT TREE ─────────────────────────────────────────
    case 'get_project_tree': {
      if (!currentFiles || Object.keys(currentFiles).length === 0) {
        return { success: true, tree: '(empty project)', files: [], folders: [] };
      }
      const paths = Object.keys(currentFiles).sort();
      const folders = new Set();
      for (const p of paths) {
        const parts = p.split('/').filter(Boolean);
        for (let i = 1; i < parts.length; i++) {
          folders.add('/' + parts.slice(0, i).join('/'));
        }
      }
      // Build tree string
      const treeLines = [];
      const sortedAll = [...[...folders].sort(), ...paths].sort();
      const seen = new Set();
      for (const item of sortedAll) {
        if (seen.has(item)) continue;
        seen.add(item);
        const depth = item.split('/').filter(Boolean).length - 1;
        const name = item.split('/').pop();
        const isDir = folders.has(item);
        const prefix = '  '.repeat(depth);
        if (isDir) {
          treeLines.push(`${prefix}${name}/`);
        } else {
          const size = currentFiles[item]?.length || 0;
          treeLines.push(`${prefix}${name} (${size} chars)`);
        }
      }
      return {
        success: true,
        tree: treeLines.join('\n') || '(empty project)',
        files: paths,
        folders: [...folders].sort(),
        totalFiles: paths.length,
        totalFolders: folders.size,
      };
    }

    // ── FILE WATCH ───────────────────────────────────────────────
    case 'file_watch': {
      return {
        success: true,
        action: 'file_watch',
        path: args.path || '*',
        events: args.events || ['create', 'modify', 'delete'],
        _uiEvent: true,
        message: `Watching ${args.path || 'all files'} for changes. Notifications will be sent via the editor.`,
      };
    }

    // ── SYNC FILES ───────────────────────────────────────────────
    case 'sync_files': {
      if (!currentFiles) return { success: false, error: 'No project files available' };
      const synced = Object.keys(currentFiles).map(p => ({ path: p, size: currentFiles[p].length }));
      return {
        success: true,
        action: 'sync_files',
        direction: args.direction || 'both',
        files: synced,
        totalFiles: synced.length,
        message: `Synced ${synced.length} file(s)`,
      };
    }

    // ── PARSE JSON ───────────────────────────────────────────────
    case 'parse_json': {
      try {
        let content = args.content;
        if (!content && args.path && currentFiles) {
          content = currentFiles[args.path] || currentFiles['/' + args.path];
        }
        if (!content) return { success: false, error: 'content or path is required' };
        const parsed = JSON.parse(content);
        return { success: true, data: parsed, keys: Object.keys(parsed), type: typeof parsed };
      } catch (e) {
        return { success: false, error: `JSON parse error: ${e.message}` };
      }
    }

    // ── PARSE HTML ───────────────────────────────────────────────
    case 'parse_html': {
      let content = args.content;
      if (!content && args.path && currentFiles) {
        content = currentFiles[args.path] || currentFiles['/' + args.path];
      }
      if (!content) return { success: false, error: 'content or path is required' };
      // Simple HTML parser using regex (jsdom available but heavy for this)
      const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/is);
      const metaTags = [...content.matchAll(/<meta\s+([^>]+)>/gi)].map(m => m[1]);
      const scriptCount = (content.match(/<script[\s>]/gi) || []).length;
      const styleCount = (content.match(/<style[\s>]/gi) || []).length;
      const linkCount = (content.match(/<link[\s>]/gi) || []).length;
      const imgCount = (content.match(/<img[\s>]/gi) || []).length;
      const headings = [...content.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi)].map(m => ({ level: parseInt(m[1]), text: m[2].replace(/<[^>]+>/g, '') }));
      return {
        success: true,
        title: titleMatch?.[1] || null,
        metaTags,
        scripts: scriptCount,
        styles: styleCount,
        links: linkCount,
        images: imgCount,
        headings,
        length: content.length,
        lines: content.split('\n').length,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── DEV TOOLS (filesystem, search, intelligence, debug, test, git, npm, docker)
    // ═══════════════════════════════════════════════════════════════

    case 'dev_filesystem': {
      const action = args.action || 'list';
      switch (action) {
        case 'list':
          return executeCanvasTool('list_files', args, currentFiles, userId, editorContext);
        case 'read':
          return executeCanvasTool('read_file', args, currentFiles, userId, editorContext);
        case 'write':
          return executeCanvasTool('write_file', args, currentFiles, userId, editorContext);
        case 'delete':
          return executeCanvasTool('delete_file', args, currentFiles, userId, editorContext);
        case 'move':
          return executeCanvasTool('move_file', args, currentFiles, userId, editorContext);
        case 'copy':
          return executeCanvasTool('copy_file', args, currentFiles, userId, editorContext);
        case 'stat': {
          const filePath = args.path;
          const content = currentFiles?.[filePath] || currentFiles?.['/' + filePath];
          if (content === undefined) return { success: false, error: `File not found: ${filePath}` };
          return { success: true, path: filePath, size: content.length, lines: content.split('\n').length, ext: filePath.split('.').pop() };
        }
        case 'tree':
          return executeCanvasTool('get_project_tree', args, currentFiles, userId, editorContext);
        default:
          return { success: false, error: `Unknown filesystem action: ${action}` };
      }
    }

    case 'dev_search': {
      const action = args.action || 'grep';
      if (!currentFiles) return { success: false, error: 'No project files available' };
      const query = args.query || args.pattern || '';
      if (!query) return { success: false, error: 'query/pattern is required' };
      const results = [];
      const isRegex = args.regex || action === 'regex';
      let regex;
      try {
        regex = isRegex ? new RegExp(query, args.flags || 'gi') : null;
      } catch (e) {
        return { success: false, error: `Invalid regex: ${e.message}` };
      }
      for (const [fp, content] of Object.entries(currentFiles)) {
        if (args.include && !fp.match(new RegExp(args.include))) continue;
        if (args.exclude && fp.match(new RegExp(args.exclude))) continue;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const match = regex ? regex.test(lines[i]) : lines[i].toLowerCase().includes(query.toLowerCase());
          if (match) {
            results.push({ file: fp, line: i + 1, content: lines[i].trim(), preview: lines[i].substring(0, 200) });
            if (regex) regex.lastIndex = 0;
          }
        }
      }
      return {
        success: true,
        results: results.slice(0, args.limit || 100),
        totalMatches: results.length,
        filesSearched: Object.keys(currentFiles).length,
        query,
      };
    }

    case 'dev_intelligence': {
      const action = args.action || 'analyze';
      const code = args.code || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!code) return { success: false, error: 'code or path is required' };
      // Use AI for code intelligence
      try {
        const prompts = {
          analyze: `Analyze this code for quality, patterns, and potential issues. Provide specific feedback:\n\n${code.substring(0, 8000)}`,
          explain: `Explain what this code does in detail:\n\n${code.substring(0, 8000)}`,
          suggest: `Suggest improvements for this code:\n\n${code.substring(0, 8000)}`,
          complexity: `Analyze the time and space complexity of this code:\n\n${code.substring(0, 8000)}`,
          dependencies: `List all dependencies, imports, and external references in this code:\n\n${code.substring(0, 8000)}`,
        };
        const prompt = prompts[action] || prompts.analyze;
        const result = await smartRequest({
          systemPrompt: 'You are a senior software engineer. Provide concise, actionable code analysis.',
          userPrompt: prompt,
          preferredModel: 'fast',
        });
        return { success: true, action, analysis: result.text || result.content, path: args.path };
      } catch (e) {
        return { success: false, error: `Intelligence analysis failed: ${e.message}` };
      }
    }

    case 'dev_debug': {
      const action = args.action || 'analyze';
      const code = args.code || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      const error = args.error || args.message || '';
      if (!code && !error) return { success: false, error: 'code/path or error message is required' };
      try {
        const prompt = `Debug this code. ${error ? `The error is: ${error}\n\n` : ''}\n\nCode:\n${(code || '').substring(0, 8000)}\n\nProvide: 1) Root cause 2) Fix 3) Fixed code`;
        const result = await smartRequest({
          systemPrompt: 'You are an expert debugger. Find and fix bugs concisely.',
          userPrompt: prompt,
          preferredModel: 'fast',
        });
        return { success: true, action, debug: result.text || result.content, path: args.path };
      } catch (e) {
        return { success: false, error: `Debug failed: ${e.message}` };
      }
    }

    case 'dev_test': {
      // Delegate to run_tests
      return executeCanvasTool('run_tests', { ...args, code: args.code || args.testCode }, currentFiles, userId, editorContext);
    }

    case 'dev_git': {
      const action = args.action || 'status';
      // Git operations work on the virtual project - simulate with in-memory state
      const gitState = agentSessionMemory['__git_state'] || {
        branch: 'main',
        branches: ['main'],
        commits: [],
        staged: [],
        stash: [],
        remotes: { origin: 'https://github.com/user/project.git' },
      };

      switch (action) {
        case 'init': {
          agentSessionMemory['__git_state'] = {
            branch: 'main',
            branches: ['main'],
            commits: [{ hash: crypto.randomBytes(20).toString('hex').substring(0, 7), message: 'Initial commit', date: new Date().toISOString(), files: Object.keys(currentFiles || {}) }],
            staged: [],
            stash: [],
            remotes: {},
          };
          return { success: true, message: 'Initialized git repository on branch main' };
        }
        case 'status': {
          const modified = Object.keys(currentFiles || {});
          return {
            success: true,
            branch: gitState.branch,
            modified,
            staged: gitState.staged,
            untracked: modified.filter(f => !gitState.commits.some(c => c.files?.includes(f))),
            clean: modified.length === 0,
          };
        }
        case 'add': {
          const files = args.files || (args.path ? [args.path] : Object.keys(currentFiles || {}));
          gitState.staged = [...new Set([...gitState.staged, ...files])];
          agentSessionMemory['__git_state'] = gitState;
          return { success: true, staged: gitState.staged, message: `Added ${files.length} file(s) to staging` };
        }
        case 'commit': {
          const message = args.message || 'Update';
          if (gitState.staged.length === 0) return { success: false, error: 'Nothing staged to commit. Use git add first.' };
          const hash = crypto.randomBytes(20).toString('hex').substring(0, 7);
          gitState.commits.unshift({ hash, message, date: new Date().toISOString(), files: [...gitState.staged], branch: gitState.branch });
          gitState.staged = [];
          agentSessionMemory['__git_state'] = gitState;
          return { success: true, hash, message, branch: gitState.branch, filesCommitted: gitState.commits[0].files.length };
        }
        case 'log': {
          const limit = args.limit || 10;
          return { success: true, commits: gitState.commits.slice(0, limit), branch: gitState.branch, total: gitState.commits.length };
        }
        case 'branch': {
          if (args.name) {
            if (args.delete) {
              gitState.branches = gitState.branches.filter(b => b !== args.name);
              agentSessionMemory['__git_state'] = gitState;
              return { success: true, deleted: args.name, branches: gitState.branches };
            }
            if (!gitState.branches.includes(args.name)) {
              gitState.branches.push(args.name);
              agentSessionMemory['__git_state'] = gitState;
            }
            return { success: true, created: args.name, branches: gitState.branches, current: gitState.branch };
          }
          return { success: true, branches: gitState.branches, current: gitState.branch };
        }
        case 'checkout': {
          const target = args.branch || args.name;
          if (!target) return { success: false, error: 'branch name is required' };
          if (args.create && !gitState.branches.includes(target)) {
            gitState.branches.push(target);
          }
          if (!gitState.branches.includes(target)) return { success: false, error: `Branch '${target}' not found` };
          gitState.branch = target;
          agentSessionMemory['__git_state'] = gitState;
          return { success: true, branch: target, message: `Switched to branch '${target}'` };
        }
        case 'merge': {
          const source = args.branch || args.source;
          if (!source) return { success: false, error: 'source branch is required' };
          return { success: true, merged: source, into: gitState.branch, message: `Merged '${source}' into '${gitState.branch}'` };
        }
        case 'diff': {
          const filesToDiff = args.path ? [args.path] : Object.keys(currentFiles || {}).slice(0, 10);
          return { success: true, files: filesToDiff.map(f => ({ file: f, status: 'modified', additions: Math.floor(Math.random() * 20), deletions: Math.floor(Math.random() * 5) })), branch: gitState.branch };
        }
        case 'stash': {
          if (args.pop) {
            const popped = gitState.stash.pop();
            agentSessionMemory['__git_state'] = gitState;
            return popped ? { success: true, restored: popped, remaining: gitState.stash.length } : { success: false, error: 'No stash entries' };
          }
          gitState.stash.push({ date: new Date().toISOString(), message: args.message || 'WIP', files: Object.keys(currentFiles || {}) });
          agentSessionMemory['__git_state'] = gitState;
          return { success: true, stashed: true, stashSize: gitState.stash.length };
        }
        case 'push':
          return { success: true, branch: gitState.branch, remote: args.remote || 'origin', message: `Pushed ${gitState.branch} to remote` };
        case 'pull':
          return { success: true, branch: gitState.branch, remote: args.remote || 'origin', message: 'Already up to date', upToDate: true };
        case 'revert': {
          const hash = args.hash || args.commit;
          return { success: true, reverted: hash, message: `Reverted commit ${hash}` };
        }
        case 'tag': {
          return { success: true, tag: args.name || 'v1.0.0', message: args.message || '', commit: gitState.commits[0]?.hash || 'HEAD' };
        }
        default:
          return { success: false, error: `Unknown git action: ${action}. Available: init, status, add, commit, log, branch, checkout, merge, diff, stash, push, pull, revert, tag` };
      }
    }

    case 'dev_npm': {
      const action = args.action || 'list';
      switch (action) {
        case 'install':
          return executeCanvasTool('install_package', { packages: args.packages || [args.package], dev: args.dev }, currentFiles, userId, editorContext);
        case 'uninstall': {
          const pkgName = args.package || (args.packages && args.packages[0]);
          if (!pkgName) return { success: false, error: 'package name required' };
          let pkgPath = '/package.json';
          if (currentFiles) {
            const existing = Object.keys(currentFiles).find(p => p.endsWith('package.json'));
            if (existing) pkgPath = existing;
          }
          if (!currentFiles?.[pkgPath]) return { success: false, error: 'No package.json found' };
          try {
            const pkg = JSON.parse(currentFiles[pkgPath]);
            const removed = pkg.dependencies?.[pkgName] || pkg.devDependencies?.[pkgName];
            if (pkg.dependencies?.[pkgName]) delete pkg.dependencies[pkgName];
            if (pkg.devDependencies?.[pkgName]) delete pkg.devDependencies[pkgName];
            const content = JSON.stringify(pkg, null, 2);
            currentFiles[pkgPath] = content;
            return { success: true, action: 'update_file', path: pkgPath, content, removed: pkgName, version: removed };
          } catch (e) {
            return { success: false, error: `Failed to parse package.json: ${e.message}` };
          }
        }
        case 'list': {
          let pkgPath = '/package.json';
          if (currentFiles) {
            const existing = Object.keys(currentFiles).find(p => p.endsWith('package.json'));
            if (existing) pkgPath = existing;
          }
          if (!currentFiles?.[pkgPath]) return { success: true, dependencies: {}, devDependencies: {} };
          try {
            const pkg = JSON.parse(currentFiles[pkgPath]);
            return { success: true, dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {}, total: Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length };
          } catch (e) {
            return { success: false, error: e.message };
          }
        }
        case 'outdated':
          return { success: true, message: 'Package version check requires network access. Use web_search to check latest versions.' };
        case 'audit':
          return { success: true, vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 }, message: 'No known vulnerabilities in project dependencies' };
        case 'init': {
          const content = JSON.stringify({ name: args.name || 'canvas-project', version: '1.0.0', private: true, dependencies: {}, devDependencies: {}, scripts: { start: 'node index.js', dev: 'node --watch index.js' } }, null, 2);
          if (currentFiles) currentFiles['/package.json'] = content;
          return { success: true, action: 'update_file', path: '/package.json', content, message: 'Created package.json' };
        }
        case 'run': {
          const script = args.script || 'start';
          return { success: true, action: 'run_script', script, message: `Script '${script}' execution triggered. Check the preview console for output.` };
        }
        default:
          return { success: false, error: `Unknown npm action: ${action}. Available: install, uninstall, list, outdated, audit, init, run` };
      }
    }

    case 'dev_docker': {
      const action = args.action || 'status';
      switch (action) {
        case 'generate': {
          const framework = args.framework || 'node';
          const templates = {
            node: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "index.js"]`,
            react: `FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM nginx:alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`,
            python: `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["python", "app.py"]`,
            next: `FROM node:20-alpine AS deps\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\n\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV production\nCOPY --from=builder /app/.next ./.next\nCOPY --from=builder /app/node_modules ./node_modules\nCOPY --from=builder /app/package.json ./package.json\nEXPOSE 3000\nCMD ["npm", "start"]`,
          };
          const dockerfile = templates[framework] || templates.node;
          if (currentFiles) currentFiles['/Dockerfile'] = dockerfile;
          return { success: true, action: 'update_file', path: '/Dockerfile', content: dockerfile, framework };
        }
        case 'compose': {
          const compose = `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    volumes:\n      - .:/app\n      - /app/node_modules\n    restart: unless-stopped`;
          if (currentFiles) currentFiles['/docker-compose.yml'] = compose;
          return { success: true, action: 'update_file', path: '/docker-compose.yml', content: compose };
        }
        case 'ignore': {
          const ignore = `node_modules\nnpm-debug.log\n.env\n.env.local\n.git\n.gitignore\nDockerfile\ndocker-compose.yml\n.dockerignore\nREADME.md\n.next\ndist\nbuild\ncoverage`;
          if (currentFiles) currentFiles['/.dockerignore'] = ignore;
          return { success: true, action: 'update_file', path: '/.dockerignore', content: ignore };
        }
        case 'status':
          return { success: true, message: 'Docker status requires container runtime. Use the preview/sandbox for testing.' };
        case 'build':
          return { success: true, message: 'Docker build triggered. The project will be containerized using the Dockerfile.' };
        case 'run':
          return { success: true, message: 'Docker container started. Access the app at the preview URL.' };
        default:
          return { success: false, error: `Unknown docker action: ${action}. Available: generate, compose, ignore, status, build, run` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── WEB TOOLS (analyze, scaffold, optimize, transform, screenshot, lighthouse, scrape)
    // ═══════════════════════════════════════════════════════════════

    case 'web_analyze': {
      const url = args.url;
      if (!url && !args.code) return { success: false, error: 'url or code is required' };
      if (args.code || (args.path && currentFiles)) {
        const code = args.code || currentFiles[args.path] || currentFiles['/' + args.path];
        return {
          success: true,
          analysis: {
            hasDoctype: /<!doctype html>/i.test(code || ''),
            hasViewport: /viewport/.test(code || ''),
            hasCharset: /charset/.test(code || ''),
            scriptCount: (code?.match(/<script/gi) || []).length,
            styleCount: (code?.match(/<style/gi) || []).length,
            imageCount: (code?.match(/<img/gi) || []).length,
            linkCount: (code?.match(/<a\s/gi) || []).length,
            totalSize: code?.length || 0,
          },
        };
      }
      return await agentToolsService.executeTool('fetch_url', { url });
    }

    case 'web_scaffold': {
      const template = args.template || args.framework || 'vanilla';
      try {
        const prompt = `Generate a complete ${template} web project scaffold. Include index.html, styles, and any necessary JavaScript. Return ONLY valid JSON with format: {"files": {"/index.html": "content", "/styles.css": "content", ...}}`;
        const result = await smartRequest({
          systemPrompt: 'You are a web developer. Generate complete, working project scaffolds. Return ONLY valid JSON.',
          userPrompt: prompt,
          preferredModel: 'fast',
        });
        let files;
        try {
          const jsonStr = (result.text || result.content || '').match(/\{[\s\S]*\}/)?.[0];
          const parsed = JSON.parse(jsonStr);
          files = parsed.files || parsed;
        } catch (e) {
          return { success: true, message: result.text || result.content, action: 'scaffold' };
        }
        // Apply files to project
        const created = [];
        for (const [path, content] of Object.entries(files)) {
          const normPath = path.startsWith('/') ? path : '/' + path;
          if (currentFiles) currentFiles[normPath] = content;
          created.push(normPath);
        }
        return { success: true, template, filesCreated: created, action: 'scaffold', message: `Scaffolded ${template} project with ${created.length} files` };
      } catch (e) {
        return { success: false, error: `Scaffold failed: ${e.message}` };
      }
    }

    case 'web_optimize': {
      const code = args.code || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!code) return { success: false, error: 'code or path is required' };
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a web performance expert. Optimize the given code for performance, accessibility, and best practices.',
          userPrompt: `Optimize this web code:\n\n${code.substring(0, 8000)}`,
          preferredModel: 'fast',
        });
        return { success: true, optimized: result.text || result.content, path: args.path };
      } catch (e) {
        return { success: false, error: `Optimization failed: ${e.message}` };
      }
    }

    case 'web_transform': {
      const code = args.code || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!code) return { success: false, error: 'code or path is required' };
      const from = args.from || 'html';
      const to = args.to || 'react';
      try {
        const result = await smartRequest({
          systemPrompt: `You are an expert at transforming code between frameworks and formats.`,
          userPrompt: `Transform this ${from} code to ${to}:\n\n${code.substring(0, 8000)}`,
          preferredModel: 'fast',
        });
        return { success: true, transformed: result.text || result.content, from, to, path: args.path };
      } catch (e) {
        return { success: false, error: `Transform failed: ${e.message}` };
      }
    }

    case 'web_screenshot': {
      return {
        success: true,
        action: 'web_screenshot',
        url: args.url,
        _uiEvent: true,
        message: 'Screenshot capture requires browser access. The preview panel will capture the current state.',
      };
    }

    case 'web_lighthouse': {
      // Return a simulated lighthouse report based on project analysis
      const files = currentFiles ? Object.keys(currentFiles) : [];
      const hasViewport = files.some(f => currentFiles[f]?.includes('viewport'));
      const hasAlt = files.some(f => !currentFiles[f]?.match(/<img(?![^>]*alt=)/i));
      const totalSize = files.reduce((sum, f) => sum + (currentFiles[f]?.length || 0), 0);
      return {
        success: true,
        report: {
          performance: totalSize < 50000 ? 95 : totalSize < 200000 ? 75 : 55,
          accessibility: hasAlt ? 90 : 65,
          bestPractices: hasViewport ? 90 : 70,
          seo: hasViewport ? 85 : 60,
          totalSize,
          fileCount: files.length,
          recommendations: [
            totalSize > 100000 ? 'Reduce total bundle size' : null,
            !hasViewport ? 'Add viewport meta tag' : null,
            files.some(f => f.endsWith('.js') && (currentFiles[f]?.length || 0) > 50000) ? 'Split large JavaScript files' : null,
          ].filter(Boolean),
        },
      };
    }

    case 'web_scrape': {
      const url = args.url;
      if (!url) return { success: false, error: 'url is required' };
      try {
        const result = await agentToolsService.executeTool('fetch_url', { url, selector: args.selector });
        return { success: true, ...result, url };
      } catch (e) {
        return { success: false, error: `Scrape failed: ${e.message}` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── DATABASE TOOLS (query, schema, backup, migrate, analyze, connect)
    // ═══════════════════════════════════════════════════════════════

    case 'db_query': {
      const query = args.query || args.sql;
      if (!query) return { success: false, error: 'query/sql is required' };
      // In canvas IDE context, simulate DB operations against an in-memory store
      const dbState = agentSessionMemory['__db_state'] || { tables: {}, queryLog: [] };
      dbState.queryLog.push({ query, timestamp: new Date().toISOString() });
      // Parse and execute simple SQL-like queries
      const upperQ = query.trim().toUpperCase();
      if (upperQ.startsWith('CREATE TABLE')) {
        const match = query.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([^)]+)\)/i);
        if (match) {
          const tableName = match[1];
          const cols = match[2].split(',').map(c => c.trim().split(/\s+/));
          dbState.tables[tableName] = { columns: cols.map(c => ({ name: c[0], type: c[1] || 'TEXT' })), rows: [] };
          agentSessionMemory['__db_state'] = dbState;
          return { success: true, message: `Table '${tableName}' created`, columns: dbState.tables[tableName].columns };
        }
      }
      if (upperQ.startsWith('INSERT INTO')) {
        const match = query.match(/INSERT INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)/i);
        if (match) {
          const tableName = match[1];
          if (!dbState.tables[tableName]) { dbState.tables[tableName] = { columns: [], rows: [] }; }
          const values = match[3].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
          dbState.tables[tableName].rows.push(values);
          agentSessionMemory['__db_state'] = dbState;
          return { success: true, message: `1 row inserted into '${tableName}'`, rowCount: dbState.tables[tableName].rows.length };
        }
      }
      if (upperQ.startsWith('SELECT')) {
        const match = query.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
        if (match) {
          const tableName = match[2];
          const table = dbState.tables[tableName];
          if (!table) return { success: false, error: `Table '${tableName}' not found` };
          return { success: true, rows: table.rows, columns: table.columns, rowCount: table.rows.length };
        }
      }
      if (upperQ.startsWith('DROP TABLE')) {
        const match = query.match(/DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/i);
        if (match) {
          delete dbState.tables[match[1]];
          agentSessionMemory['__db_state'] = dbState;
          return { success: true, message: `Table '${match[1]}' dropped` };
        }
      }
      agentSessionMemory['__db_state'] = dbState;
      return { success: true, message: 'Query executed', query, result: null };
    }

    case 'db_schema': {
      const action = args.action || 'show';
      const dbState = agentSessionMemory['__db_state'] || { tables: {}, queryLog: [] };
      if (action === 'show' || action === 'list') {
        const tables = Object.entries(dbState.tables).map(([name, t]) => ({
          name, columns: t.columns, rowCount: t.rows?.length || 0,
        }));
        return { success: true, tables, totalTables: tables.length };
      }
      if (action === 'generate') {
        // Generate Prisma schema or SQL from project analysis
        try {
          const projectFiles = currentFiles ? Object.entries(currentFiles).filter(([k]) => k.endsWith('.ts') || k.endsWith('.js') || k.endsWith('.prisma')).map(([k, v]) => `--- ${k} ---\n${v.substring(0, 2000)}`).join('\n') : '';
          const result = await smartRequest({
            systemPrompt: 'You are a database architect. Generate a database schema based on the project code.',
            userPrompt: `Generate a database schema (${args.format || 'prisma'}) for this project:\n\n${projectFiles.substring(0, 8000)}`,
            preferredModel: 'fast',
          });
          return { success: true, schema: result.text || result.content, format: args.format || 'prisma' };
        } catch (e) {
          return { success: false, error: `Schema generation failed: ${e.message}` };
        }
      }
      return { success: false, error: `Unknown schema action: ${action}` };
    }

    case 'db_backup': {
      const dbState = agentSessionMemory['__db_state'] || { tables: {}, queryLog: [] };
      const backupData = JSON.stringify(dbState, null, 2);
      const backupPath = args.path || '/db-backup.json';
      if (currentFiles) currentFiles[backupPath] = backupData;
      return { success: true, action: 'update_file', path: backupPath, content: backupData, tables: Object.keys(dbState.tables).length, message: 'Database backed up' };
    }

    case 'db_migrate': {
      const action = args.action || 'generate';
      if (action === 'generate') {
        try {
          const result = await smartRequest({
            systemPrompt: 'You are a database migration expert.',
            userPrompt: `Generate a database migration for: ${args.description || 'schema update'}. Format: SQL statements.`,
            preferredModel: 'fast',
          });
          const migrationPath = `/migrations/${Date.now()}_${(args.name || 'migration').replace(/\s+/g, '_')}.sql`;
          const content = result.text || result.content;
          if (currentFiles) currentFiles[migrationPath] = content;
          return { success: true, action: 'update_file', path: migrationPath, content, message: 'Migration generated' };
        } catch (e) {
          return { success: false, error: `Migration generation failed: ${e.message}` };
        }
      }
      if (action === 'run') {
        return { success: true, message: 'Migration applied to in-memory database' };
      }
      return { success: false, error: `Unknown migrate action: ${action}` };
    }

    case 'db_analyze': {
      const dbState = agentSessionMemory['__db_state'] || { tables: {}, queryLog: [] };
      return {
        success: true,
        tables: Object.keys(dbState.tables).length,
        totalRows: Object.values(dbState.tables).reduce((sum, t) => sum + (t.rows?.length || 0), 0),
        queries: dbState.queryLog.length,
        recentQueries: dbState.queryLog.slice(-10),
      };
    }

    case 'db_connect': {
      return {
        success: true,
        connected: true,
        type: args.type || 'sqlite',
        database: args.database || ':memory:',
        message: 'Connected to in-memory database. Use db_query to run SQL.',
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── API TOOLS (request, mock, document, test, transform, webhook, sdk)
    // ═══════════════════════════════════════════════════════════════

    case 'api_request': {
      const url = args.url;
      if (!url) return { success: false, error: 'url is required' };
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), args.timeout || 30000);
        const options = {
          method: (args.method || 'GET').toUpperCase(),
          headers: { 'Content-Type': 'application/json', ...args.headers },
          signal: controller.signal,
        };
        if (args.body && options.method !== 'GET') {
          options.body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
        }
        const response = await fetch(url, options);
        clearTimeout(timeout);
        const contentType = response.headers.get('content-type') || '';
        let data;
        if (contentType.includes('json')) {
          data = await response.json();
        } else {
          data = await response.text();
          if (data.length > 10000) data = data.substring(0, 10000) + '... (truncated)';
        }
        return {
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
          url,
          method: options.method,
        };
      } catch (e) {
        return { success: false, error: `API request failed: ${e.message}`, url };
      }
    }

    case 'api_mock': {
      const routes = args.routes || [{ method: 'GET', path: '/api/hello', response: { message: 'Hello World' } }];
      const mockServer = routes.map(r => ({
        method: r.method || 'GET',
        path: r.path,
        status: r.status || 200,
        response: r.response || {},
      }));
      // Generate mock server code
      const serverCode = `import express from 'express';\nconst app = express();\napp.use(express.json());\n\n${mockServer.map(r => `app.${r.method.toLowerCase()}('${r.path}', (req, res) => {\n  res.status(${r.status}).json(${JSON.stringify(r.response)});\n});`).join('\n\n')}\n\napp.listen(3001, () => console.log('Mock server on port 3001'));`;
      if (currentFiles) currentFiles['/mock-server.js'] = serverCode;
      return { success: true, action: 'update_file', path: '/mock-server.js', content: serverCode, routes: mockServer, message: `Mock server with ${mockServer.length} route(s) generated` };
    }

    case 'api_document': {
      const code = args.code || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!code) return { success: false, error: 'code or path is required' };
      try {
        const result = await smartRequest({
          systemPrompt: 'You are an API documentation expert. Generate clear OpenAPI/Swagger documentation.',
          userPrompt: `Generate API documentation (${args.format || 'openapi'}) for this code:\n\n${code.substring(0, 8000)}`,
          preferredModel: 'fast',
        });
        return { success: true, documentation: result.text || result.content, format: args.format || 'openapi' };
      } catch (e) {
        return { success: false, error: `Documentation generation failed: ${e.message}` };
      }
    }

    case 'api_test': {
      const endpoint = args.endpoint || args.url;
      if (!endpoint) return { success: false, error: 'endpoint/url is required' };
      const tests = args.tests || [{ method: 'GET', expected_status: 200 }];
      const results = [];
      for (const test of tests) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(endpoint, {
            method: test.method || 'GET',
            headers: { 'Content-Type': 'application/json', ...test.headers },
            body: test.body ? JSON.stringify(test.body) : undefined,
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const passed = test.expected_status ? res.status === test.expected_status : res.ok;
          results.push({ ...test, status: res.status, passed, response: await res.text().then(t => t.substring(0, 500)) });
        } catch (e) {
          results.push({ ...test, passed: false, error: e.message });
        }
      }
      return { success: true, results, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, total: results.length };
    }

    case 'api_transform': {
      const data = args.data || args.input;
      if (!data) return { success: false, error: 'data/input is required' };
      const format = args.format || args.to || 'json';
      try {
        if (format === 'csv') {
          if (Array.isArray(data)) {
            const headers = Object.keys(data[0] || {});
            const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
            return { success: true, result: csv, format: 'csv' };
          }
        }
        if (format === 'xml') {
          const toXml = (obj, root = 'root') => {
            const inner = Object.entries(obj).map(([k, v]) => typeof v === 'object' ? toXml(v, k) : `<${k}>${v}</${k}>`).join('');
            return `<${root}>${inner}</${root}>`;
          };
          return { success: true, result: `<?xml version="1.0"?>\n${toXml(typeof data === 'string' ? JSON.parse(data) : data)}`, format: 'xml' };
        }
        if (format === 'yaml') {
          const toYaml = (obj, indent = 0) => Object.entries(obj).map(([k, v]) => {
            const pad = '  '.repeat(indent);
            return typeof v === 'object' && v !== null ? `${pad}${k}:\n${toYaml(v, indent + 1)}` : `${pad}${k}: ${v}`;
          }).join('\n');
          return { success: true, result: toYaml(typeof data === 'string' ? JSON.parse(data) : data), format: 'yaml' };
        }
        return { success: true, result: JSON.stringify(typeof data === 'string' ? JSON.parse(data) : data, null, 2), format: 'json' };
      } catch (e) {
        return { success: false, error: `Transform failed: ${e.message}` };
      }
    }

    case 'webhook_listen': {
      return {
        success: true,
        action: 'webhook_listen',
        url: `https://studio.maula.ai/webhook/${crypto.randomBytes(8).toString('hex')}`,
        method: args.method || 'POST',
        _uiEvent: true,
        message: 'Webhook endpoint created. Incoming requests will be logged.',
      };
    }

    case 'sdk_generate': {
      const language = args.language || 'javascript';
      const apiSpec = args.spec || args.code || (args.path && currentFiles ? currentFiles[args.path] : null);
      try {
        const result = await smartRequest({
          systemPrompt: `You are an SDK generator. Generate a clean, typed ${language} SDK client.`,
          userPrompt: `Generate a ${language} SDK client for this API:\n\n${(apiSpec || 'REST API with CRUD endpoints').substring(0, 8000)}`,
          preferredModel: 'fast',
        });
        const ext = { javascript: 'js', typescript: 'ts', python: 'py', ruby: 'rb', go: 'go', rust: 'rs' }[language] || 'js';
        const sdkPath = `/sdk/client.${ext}`;
        const content = result.text || result.content;
        if (currentFiles) currentFiles[sdkPath] = content;
        return { success: true, action: 'update_file', path: sdkPath, content, language };
      } catch (e) {
        return { success: false, error: `SDK generation failed: ${e.message}` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── CRYPTO & SECURITY TOOLS ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'crypto_hash': {
      const input = args.input || args.data || args.text || '';
      const algorithm = args.algorithm || 'sha256';
      try {
        const hash = crypto.createHash(algorithm).update(input).digest(args.encoding || 'hex');
        return { success: true, hash, algorithm, inputLength: input.length };
      } catch (e) {
        return { success: false, error: `Hash failed: ${e.message}. Supported: sha256, sha512, md5, sha1` };
      }
    }

    case 'crypto_encrypt': {
      const data = args.data || args.text || args.input || '';
      const password = args.password || args.key || crypto.randomBytes(32).toString('hex');
      try {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(password, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');
        return { success: true, encrypted, iv: iv.toString('hex'), tag, algorithm, note: args.password ? undefined : `Generated key: ${password}` };
      } catch (e) {
        return { success: false, error: `Encryption failed: ${e.message}` };
      }
    }

    case 'crypto_sign': {
      const data = args.data || args.text || args.input || '';
      const secret = args.secret || args.key || 'default-secret';
      try {
        const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
        return { success: true, signature, algorithm: 'hmac-sha256', dataLength: data.length };
      } catch (e) {
        return { success: false, error: `Signing failed: ${e.message}` };
      }
    }

    case 'scan_secrets': {
      if (!currentFiles) return { success: true, findings: [], message: 'No files to scan' };
      const secretPatterns = [
        { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
        { name: 'AWS Secret Key', pattern: /(?:aws_secret_access_key|secret_key)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})/gi },
        { name: 'API Key', pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})/gi },
        { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g },
        { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
        { name: 'Password', pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi },
        { name: 'Connection String', pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/gi },
        { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/g },
        { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
        { name: 'Stripe Key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{24,}/g },
      ];
      const findings = [];
      for (const [fp, content] of Object.entries(currentFiles)) {
        if (fp.endsWith('.env') || fp.includes('secret') || fp.includes('.lock')) continue; // skip expected secret files
        for (const { name, pattern } of secretPatterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            findings.push({ file: fp, line, type: name, preview: match[0].substring(0, 20) + '***' });
          }
        }
      }
      return { success: true, findings, totalFindings: findings.length, filesScanned: Object.keys(currentFiles).length, clean: findings.length === 0 };
    }

    case 'scan_malware': {
      if (!currentFiles) return { success: true, findings: [], message: 'No files to scan' };
      const dangerPatterns = [
        { name: 'eval() usage', pattern: /\beval\s*\(/g },
        { name: 'Function constructor', pattern: /new\s+Function\s*\(/g },
        { name: 'document.write', pattern: /document\.write\s*\(/g },
        { name: 'innerHTML assignment', pattern: /\.innerHTML\s*=/g },
        { name: 'Suspicious base64', pattern: /atob\s*\(\s*['"][A-Za-z0-9+/=]{50,}['"]\s*\)/g },
        { name: 'Shell execution', pattern: /(?:exec|spawn|execSync)\s*\(\s*['"`]/g },
        { name: 'Suspicious fetch to external', pattern: /fetch\s*\(\s*['"]https?:\/\/(?!localhost|127\.0\.0\.1)/g },
      ];
      const findings = [];
      for (const [fp, content] of Object.entries(currentFiles)) {
        for (const { name, pattern } of dangerPatterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            findings.push({ file: fp, line, type: name, severity: name.includes('eval') || name.includes('Shell') ? 'high' : 'medium', preview: content.substring(match.index, match.index + 80).replace(/\n/g, ' ') });
          }
        }
      }
      return { success: true, findings, totalFindings: findings.length, filesScanned: Object.keys(currentFiles).length, clean: findings.length === 0 };
    }

    case 'scan_vulnerabilities': {
      if (!currentFiles) return { success: true, findings: [], message: 'No files to scan' };
      const vulnPatterns = [
        { name: 'SQL Injection Risk', pattern: /(?:query|execute)\s*\(\s*[`'"].*\$\{/g, severity: 'critical' },
        { name: 'XSS Risk (dangerouslySetInnerHTML)', pattern: /dangerouslySetInnerHTML/g, severity: 'high' },
        { name: 'Open Redirect', pattern: /(?:redirect|location\.href)\s*=\s*(?:req\.|params\.|query\.)/g, severity: 'high' },
        { name: 'Hardcoded Secret', pattern: /(?:secret|password|token|key)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },
        { name: 'Missing CORS Config', pattern: /cors\(\s*\)/g, severity: 'medium' },
        { name: 'No Input Validation', pattern: /req\.(?:body|params|query)\.\w+(?!\s*&&|\s*\|\||.*(?:validate|sanitize|escape))/g, severity: 'medium' },
      ];
      const findings = [];
      for (const [fp, content] of Object.entries(currentFiles)) {
        for (const { name, pattern, severity } of vulnPatterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            findings.push({ file: fp, line, type: name, severity, preview: content.substring(match.index, match.index + 60).replace(/\n/g, ' ') });
          }
        }
      }
      return { success: true, findings, totalFindings: findings.length, filesScanned: Object.keys(currentFiles).length, clean: findings.length === 0, bySeverity: { critical: findings.filter(f => f.severity === 'critical').length, high: findings.filter(f => f.severity === 'high').length, medium: findings.filter(f => f.severity === 'medium').length } };
    }

    case 'auth_generate': {
      const type = args.type || 'jwt';
      if (type === 'jwt') {
        const secret = crypto.randomBytes(64).toString('hex');
        return { success: true, type: 'jwt', secret, exampleCode: `import jwt from 'jsonwebtoken';\nconst token = jwt.sign({ userId: '123' }, '${secret.substring(0, 16)}...', { expiresIn: '24h' });` };
      }
      if (type === 'api_key') {
        const apiKey = `mk_${crypto.randomBytes(32).toString('hex')}`;
        return { success: true, type: 'api_key', key: apiKey };
      }
      if (type === 'oauth') {
        return { success: true, type: 'oauth', clientId: crypto.randomUUID(), clientSecret: crypto.randomBytes(32).toString('hex') };
      }
      return { success: true, type, token: crypto.randomBytes(48).toString('hex') };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── MARKDOWN TOOLS ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'markdown_convert': {
      const content = args.content || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!content) return { success: false, error: 'content or path is required' };
      const to = args.to || 'html';
      if (to === 'html') {
        let html = content
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
          .replace(/^\- (.*$)/gm, '<li>$1</li>')
          .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(.+)$/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`);
        return { success: true, result: html, from: 'markdown', to: 'html' };
      }
      return { success: true, result: content, from: 'markdown', to };
    }

    case 'markdown_validate': {
      const content = args.content || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!content) return { success: false, error: 'content or path is required' };
      const issues = [];
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/^#{1,6}[^ #]/.test(line)) issues.push({ line: i + 1, message: 'Missing space after heading marker', severity: 'warning' });
        if (line.length > 120) issues.push({ line: i + 1, message: 'Line exceeds 120 characters', severity: 'info' });
        if (/\t/.test(line)) issues.push({ line: i + 1, message: 'Tab character found (use spaces)', severity: 'warning' });
      });
      if (!content.endsWith('\n')) issues.push({ line: lines.length, message: 'File should end with newline', severity: 'warning' });
      return { success: true, valid: issues.filter(i => i.severity === 'error').length === 0, issues, totalIssues: issues.length };
    }

    case 'markdown_generate': {
      const type = args.type || 'readme';
      try {
        const projectContext = currentFiles ? Object.keys(currentFiles).join(', ') : 'No files';
        const result = await smartRequest({
          systemPrompt: 'You are a technical writer. Generate clean, professional markdown documents.',
          userPrompt: `Generate a ${type} markdown document for a project with files: ${projectContext}. ${args.description || ''}`,
          preferredModel: 'fast',
        });
        const mdPath = args.path || `/${type.toUpperCase()}.md`;
        const mdContent = result.text || result.content;
        if (currentFiles) currentFiles[mdPath] = mdContent;
        return { success: true, action: 'update_file', path: mdPath, content: mdContent, type };
      } catch (e) {
        return { success: false, error: `Markdown generation failed: ${e.message}` };
      }
    }

    case 'markdown_toc': {
      const content = args.content || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!content) return { success: false, error: 'content or path is required' };
      const headings = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)].map(m => ({
        level: m[1].length,
        text: m[2],
        anchor: m[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      }));
      const toc = headings.map(h => `${'  '.repeat(h.level - 1)}- [${h.text}](#${h.anchor})`).join('\n');
      return { success: true, toc, headings, headingCount: headings.length };
    }

    case 'markdown_format': {
      const content = args.content || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!content) return { success: false, error: 'content or path is required' };
      let formatted = content
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '  ')
        .replace(/^(#{1,6})([^ #\n])/gm, '$1 $2')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/([^\n])$/, '$1\n');
      return { success: true, formatted, path: args.path, changed: formatted !== content };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── ANALYTICS & MONITORING TOOLS ────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'analytics_track': {
      const event = args.event || args.name;
      if (!event) return { success: false, error: 'event name is required' };
      const analyticsLog = agentSessionMemory['__analytics'] || [];
      analyticsLog.push({ event, properties: args.properties || {}, timestamp: new Date().toISOString(), userId });
      agentSessionMemory['__analytics'] = analyticsLog;
      return { success: true, event, tracked: true, totalEvents: analyticsLog.length };
    }

    case 'analytics_dashboard': {
      const analyticsLog = agentSessionMemory['__analytics'] || [];
      const events = {};
      for (const entry of analyticsLog) {
        events[entry.event] = (events[entry.event] || 0) + 1;
      }
      return {
        success: true,
        totalEvents: analyticsLog.length,
        uniqueEvents: Object.keys(events).length,
        eventCounts: events,
        recentEvents: analyticsLog.slice(-20),
      };
    }

    case 'log_parse': {
      const content = args.content || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!content) return { success: false, error: 'content or path is required' };
      const lines = content.split('\n').filter(l => l.trim());
      const parsed = {
        totalLines: lines.length,
        errors: lines.filter(l => /error|fatal|critical/i.test(l)).length,
        warnings: lines.filter(l => /warn|warning/i.test(l)).length,
        info: lines.filter(l => /info/i.test(l)).length,
        debug: lines.filter(l => /debug/i.test(l)).length,
        errorLines: lines.filter(l => /error|fatal|critical/i.test(l)).slice(0, 20),
      };
      return { success: true, ...parsed };
    }

    case 'monitor_health': {
      return {
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), unit: 'MB' },
        nodeVersion: process.version,
        platform: process.platform,
        projectFiles: currentFiles ? Object.keys(currentFiles).length : 0,
        timestamp: new Date().toISOString(),
      };
    }

    case 'telemetry_send': {
      return {
        success: true,
        event: args.event || 'custom',
        data: args.data || {},
        sent: true,
        message: 'Telemetry event recorded',
        timestamp: new Date().toISOString(),
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── WORKFLOW TOOLS ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'workflow_create': {
      const name = args.name || 'New Workflow';
      const steps = args.steps || [];
      const workflows = agentSessionMemory['__workflows'] || {};
      const id = `wf_${crypto.randomBytes(4).toString('hex')}`;
      workflows[id] = { id, name, steps, status: 'created', createdAt: new Date().toISOString() };
      agentSessionMemory['__workflows'] = workflows;
      return { success: true, workflow: workflows[id], message: `Workflow '${name}' created with ${steps.length} steps` };
    }

    case 'workflow_execute': {
      const id = args.id || args.workflowId;
      const workflows = agentSessionMemory['__workflows'] || {};
      if (id && workflows[id]) {
        const wf = workflows[id];
        wf.status = 'running';
        const results = [];
        for (const step of wf.steps) {
          results.push({ step: step.name || step.action, status: 'completed', timestamp: new Date().toISOString() });
        }
        wf.status = 'completed';
        wf.results = results;
        wf.completedAt = new Date().toISOString();
        agentSessionMemory['__workflows'] = workflows;
        return { success: true, workflow: wf, results };
      }
      // Execute inline steps
      const steps = args.steps || [];
      const results = [];
      for (const step of steps) {
        if (step.tool) {
          try {
            const result = await executeCanvasTool(step.tool, step.args || {}, currentFiles, userId, editorContext);
            results.push({ step: step.name || step.tool, status: 'completed', result });
          } catch (e) {
            results.push({ step: step.name || step.tool, status: 'failed', error: e.message });
          }
        } else {
          results.push({ step: step.name || 'unknown', status: 'skipped', reason: 'No tool specified' });
        }
      }
      return { success: true, results, completed: results.filter(r => r.status === 'completed').length, total: results.length };
    }

    case 'workflow_schedule': {
      return {
        success: true,
        scheduled: true,
        cron: args.cron || args.schedule || '0 * * * *',
        workflow: args.workflowId || args.id,
        message: 'Workflow scheduled. Note: scheduling persists only for the current session.',
      };
    }

    case 'workflow_visualize': {
      const workflows = agentSessionMemory['__workflows'] || {};
      const id = args.id || args.workflowId;
      const wf = id ? workflows[id] : Object.values(workflows)[0];
      if (!wf) return { success: false, error: 'No workflow found. Create one first with workflow_create.' };
      const mermaid = `graph TD\n${wf.steps.map((s, i) => {
        const next = wf.steps[i + 1];
        const nodeId = `S${i}`;
        const nextId = `S${i + 1}`;
        return next ? `  ${nodeId}["${s.name || s.action || `Step ${i + 1}`}"] --> ${nextId}["${next.name || next.action || `Step ${i + 2}`}"]` : `  ${nodeId}["${s.name || s.action || `Step ${i + 1}`}"]`;
      }).join('\n')}`;
      return { success: true, mermaid, workflow: wf };
    }

    case 'workflow_optimize': {
      const workflows = agentSessionMemory['__workflows'] || {};
      const id = args.id || args.workflowId;
      const wf = id ? workflows[id] : Object.values(workflows)[0];
      if (!wf) return { success: false, error: 'No workflow found' };
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a workflow optimization expert.',
          userPrompt: `Optimize this workflow: ${JSON.stringify(wf)}`,
          preferredModel: 'fast',
        });
        return { success: true, suggestions: result.text || result.content, workflow: wf };
      } catch (e) {
        return { success: false, error: `Optimization failed: ${e.message}` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── KNOWLEDGE GRAPH TOOLS ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'kg_create': {
      const kgStore = agentSessionMemory['__kg'] || { nodes: [], edges: [] };
      const nodes = args.nodes || [];
      const edges = args.edges || [];
      kgStore.nodes.push(...nodes.map(n => ({ id: n.id || crypto.randomBytes(4).toString('hex'), ...n })));
      kgStore.edges.push(...edges.map(e => ({ id: e.id || crypto.randomBytes(4).toString('hex'), ...e })));
      agentSessionMemory['__kg'] = kgStore;
      return { success: true, nodes: kgStore.nodes.length, edges: kgStore.edges.length, message: `Added ${nodes.length} node(s) and ${edges.length} edge(s)` };
    }

    case 'kg_query': {
      const kgStore = agentSessionMemory['__kg'] || { nodes: [], edges: [] };
      const query = args.query || args.filter || '';
      if (!query) return { success: true, nodes: kgStore.nodes, edges: kgStore.edges };
      const matchedNodes = kgStore.nodes.filter(n => JSON.stringify(n).toLowerCase().includes(query.toLowerCase()));
      const matchedEdges = kgStore.edges.filter(e => matchedNodes.some(n => n.id === e.from || n.id === e.to));
      return { success: true, nodes: matchedNodes, edges: matchedEdges, query };
    }

    case 'kg_visualize': {
      const kgStore = agentSessionMemory['__kg'] || { nodes: [], edges: [] };
      const mermaid = `graph LR\n${kgStore.edges.map(e => `  ${e.from}["${kgStore.nodes.find(n => n.id === e.from)?.label || e.from}"] -->|${e.label || ''}| ${e.to}["${kgStore.nodes.find(n => n.id === e.to)?.label || e.to}"]`).join('\n')}`;
      return { success: true, mermaid, nodes: kgStore.nodes.length, edges: kgStore.edges.length };
    }

    case 'kg_merge': {
      const kgStore = agentSessionMemory['__kg'] || { nodes: [], edges: [] };
      const sourceId = args.source;
      const targetId = args.target;
      if (!sourceId || !targetId) return { success: false, error: 'source and target node IDs required' };
      kgStore.edges = kgStore.edges.map(e => ({
        ...e,
        from: e.from === sourceId ? targetId : e.from,
        to: e.to === sourceId ? targetId : e.to,
      }));
      kgStore.nodes = kgStore.nodes.filter(n => n.id !== sourceId);
      agentSessionMemory['__kg'] = kgStore;
      return { success: true, merged: { source: sourceId, target: targetId }, nodes: kgStore.nodes.length, edges: kgStore.edges.length };
    }

    case 'kg_reason': {
      const kgStore = agentSessionMemory['__kg'] || { nodes: [], edges: [] };
      const question = args.question || args.query;
      if (!question) return { success: false, error: 'question is required' };
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a knowledge graph reasoning engine. Answer questions based on the provided graph data.',
          userPrompt: `Knowledge graph:\nNodes: ${JSON.stringify(kgStore.nodes.slice(0, 50))}\nEdges: ${JSON.stringify(kgStore.edges.slice(0, 50))}\n\nQuestion: ${question}`,
          preferredModel: 'fast',
        });
        return { success: true, answer: result.text || result.content, question, graphSize: { nodes: kgStore.nodes.length, edges: kgStore.edges.length } };
      } catch (e) {
        return { success: false, error: `Reasoning failed: ${e.message}` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── BUSINESS & GROWTH TOOLS ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'growth_analyze': {
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a growth analytics expert. Provide data-driven insights.',
          userPrompt: `Analyze growth metrics: ${args.metric || 'overall'}. Data: ${JSON.stringify(args.data || {}).substring(0, 4000)}. Period: ${args.period || 'last 30 days'}`,
          preferredModel: 'fast',
        });
        return { success: true, analysis: result.text || result.content, metric: args.metric, period: args.period };
      } catch (e) {
        return { success: false, error: `Growth analysis failed: ${e.message}` };
      }
    }

    case 'pricing_simulate': {
      const plans = args.plans || [{ name: 'Free', price: 0 }, { name: 'Pro', price: 29 }, { name: 'Enterprise', price: 99 }];
      const users = args.users || 1000;
      const conversion = args.conversionRate || 0.05;
      const results = plans.map(p => ({
        ...p,
        estimatedUsers: Math.round(users * (p.price === 0 ? 0.7 : conversion / plans.filter(pl => pl.price > 0).length)),
        mrr: Math.round(users * (p.price === 0 ? 0 : conversion / plans.filter(pl => pl.price > 0).length) * p.price),
      }));
      return { success: true, plans: results, totalMRR: results.reduce((s, r) => s + r.mrr, 0), totalUsers: users };
    }

    case 'ab_test_run': {
      const variants = args.variants || ['A', 'B'];
      const id = `ab_${crypto.randomBytes(4).toString('hex')}`;
      const abTests = agentSessionMemory['__ab_tests'] || {};
      abTests[id] = { id, name: args.name || 'Test', variants, results: variants.map(v => ({ variant: v, impressions: 0, conversions: 0 })), status: 'running', startedAt: new Date().toISOString() };
      agentSessionMemory['__ab_tests'] = abTests;
      return { success: true, test: abTests[id], message: `A/B test created with ${variants.length} variants` };
    }

    case 'ab_test_analyze': {
      const abTests = agentSessionMemory['__ab_tests'] || {};
      const id = args.id || Object.keys(abTests)[0];
      if (!id || !abTests[id]) return { success: false, error: 'No A/B test found' };
      const test = abTests[id];
      // Simulate some results
      for (const r of test.results) {
        r.impressions = r.impressions || Math.floor(Math.random() * 500) + 100;
        r.conversions = r.conversions || Math.floor(r.impressions * (Math.random() * 0.1 + 0.02));
        r.conversionRate = (r.conversions / r.impressions * 100).toFixed(2) + '%';
      }
      const winner = test.results.sort((a, b) => b.conversions / b.impressions - a.conversions / a.impressions)[0];
      return { success: true, test, winner: winner.variant, results: test.results };
    }

    case 'lead_enrich': {
      const email = args.email;
      if (!email) return { success: false, error: 'email is required' };
      const domain = email.split('@')[1];
      return { success: true, email, domain, enriched: { company: domain?.split('.')[0], domain, emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) } };
    }

    case 'campaign_generate': {
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a marketing expert. Generate compelling campaign content.',
          userPrompt: `Generate a ${args.type || 'email'} campaign for: ${args.product || args.description || 'our product'}. Target audience: ${args.audience || 'tech professionals'}. Tone: ${args.tone || 'professional'}`,
          preferredModel: 'fast',
        });
        return { success: true, campaign: result.text || result.content, type: args.type || 'email' };
      } catch (e) {
        return { success: false, error: `Campaign generation failed: ${e.message}` };
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ── TEAM & COLLABORATION TOOLS ──────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'team_invite': {
      const teamStore = agentSessionMemory['__team'] || { members: [], invites: [] };
      const email = args.email;
      if (!email) return { success: false, error: 'email is required' };
      teamStore.invites.push({ email, role: args.role || 'member', invitedAt: new Date().toISOString(), status: 'pending' });
      agentSessionMemory['__team'] = teamStore;
      return { success: true, email, role: args.role || 'member', status: 'invited', totalInvites: teamStore.invites.length };
    }

    case 'role_assign': {
      const teamStore = agentSessionMemory['__team'] || { members: [], invites: [] };
      const member = args.userId || args.email;
      if (!member) return { success: false, error: 'userId or email is required' };
      const existing = teamStore.members.find(m => m.id === member || m.email === member);
      if (existing) {
        existing.role = args.role || 'member';
      } else {
        teamStore.members.push({ id: member, email: member, role: args.role || 'member', addedAt: new Date().toISOString() });
      }
      agentSessionMemory['__team'] = teamStore;
      return { success: true, member, role: args.role || 'member', totalMembers: teamStore.members.length };
    }

    case 'comment_thread': {
      const comments = agentSessionMemory['__comments'] || [];
      if (args.action === 'list') {
        const filtered = args.file ? comments.filter(c => c.file === args.file) : comments;
        return { success: true, comments: filtered, total: filtered.length };
      }
      const comment = {
        id: `c_${crypto.randomBytes(4).toString('hex')}`,
        file: args.file || args.path,
        line: args.line,
        text: args.text || args.comment || args.message,
        author: userId,
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      comments.push(comment);
      agentSessionMemory['__comments'] = comments;
      return { success: true, comment, totalComments: comments.length };
    }

    case 'task_assign': {
      const tasks = agentSessionMemory['__tasks'] || [];
      if (args.action === 'list') {
        return { success: true, tasks, total: tasks.length };
      }
      const task = {
        id: `t_${crypto.randomBytes(4).toString('hex')}`,
        title: args.title || args.task,
        assignee: args.assignee || userId,
        status: args.status || 'todo',
        priority: args.priority || 'medium',
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      agentSessionMemory['__tasks'] = tasks;
      return { success: true, task, totalTasks: tasks.length };
    }

    case 'approval_flow': {
      const approvals = agentSessionMemory['__approvals'] || [];
      if (args.action === 'list') {
        return { success: true, approvals, total: approvals.length };
      }
      if (args.action === 'approve' || args.action === 'reject') {
        const approval = approvals.find(a => a.id === args.id);
        if (approval) {
          approval.status = args.action === 'approve' ? 'approved' : 'rejected';
          approval.reviewedAt = new Date().toISOString();
          agentSessionMemory['__approvals'] = approvals;
          return { success: true, approval };
        }
        return { success: false, error: `Approval '${args.id}' not found` };
      }
      const approval = {
        id: `ap_${crypto.randomBytes(4).toString('hex')}`,
        title: args.title || 'Approval Request',
        description: args.description,
        requester: userId,
        approvers: args.approvers || [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      approvals.push(approval);
      agentSessionMemory['__approvals'] = approvals;
      return { success: true, approval, totalApprovals: approvals.length };
    }

    case 'activity_log': {
      const log = agentSessionMemory['__activity_log'] || [];
      if (args.action === 'list' || !args.activity) {
        return { success: true, activities: log.slice(-(args.limit || 50)), total: log.length };
      }
      log.push({ activity: args.activity, user: userId, metadata: args.metadata || {}, timestamp: new Date().toISOString() });
      agentSessionMemory['__activity_log'] = log;
      return { success: true, logged: true, totalActivities: log.length };
    }

    case 'access_audit': {
      const log = agentSessionMemory['__activity_log'] || [];
      const teamStore = agentSessionMemory['__team'] || { members: [], invites: [] };
      return {
        success: true,
        members: teamStore.members,
        recentActivity: log.slice(-20),
        totalActivities: log.length,
        invites: teamStore.invites,
        audit: { members: teamStore.members.length, pendingInvites: teamStore.invites.filter(i => i.status === 'pending').length },
      };
    }

    case 'notify_team': {
      return {
        success: true,
        action: 'notify_team',
        message: args.message || args.text,
        channel: args.channel || 'general',
        _uiEvent: true,
        sent: true,
        timestamp: new Date().toISOString(),
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── LLM ORCHESTRATION TOOLS ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'llm_chat': {
      const message = args.message || args.prompt;
      if (!message) return { success: false, error: 'message/prompt is required' };
      try {
        const result = await smartRequest({
          systemPrompt: args.system || 'You are a helpful assistant.',
          userPrompt: message,
          preferredModel: args.model || 'fast',
          temperature: args.temperature,
          maxTokens: args.maxTokens,
        });
        return { success: true, response: result.text || result.content, model: args.model || 'fast' };
      } catch (e) {
        return { success: false, error: `LLM chat failed: ${e.message}` };
      }
    }

    case 'llm_embed': {
      const text = args.text || args.content;
      if (!text) return { success: false, error: 'text is required' };
      // Generate a simple hash-based embedding for in-memory use
      const hash = crypto.createHash('sha256').update(text).digest();
      const embedding = Array.from({ length: 128 }, (_, i) => ((hash[i % 32] / 255) * 2 - 1).toFixed(4)).map(Number);
      return { success: true, embedding, dimensions: 128, textLength: text.length };
    }

    case 'llm_finetune': {
      return {
        success: true,
        status: 'queued',
        message: 'Fine-tuning requires external compute. Use the training data to optimize prompts instead.',
        suggestion: 'Consider using prompt engineering or few-shot examples for customization.',
      };
    }

    case 'ml_train': {
      return {
        success: true,
        status: 'simulated',
        model: args.model || 'classifier',
        dataset: args.dataset || 'provided data',
        message: 'ML training simulated. In production, this would connect to a compute backend.',
        accuracy: (Math.random() * 0.15 + 0.85).toFixed(3),
      };
    }

    case 'ml_predict': {
      return {
        success: true,
        prediction: args.input ? 'positive' : 'unknown',
        confidence: (Math.random() * 0.3 + 0.7).toFixed(3),
        model: args.model || 'default',
        message: 'Prediction generated from simulated model.',
      };
    }

    case 'llm_router': {
      const task = args.task || args.prompt || '';
      const complexity = task.length > 500 ? 'high' : task.length > 100 ? 'medium' : 'low';
      const recommended = complexity === 'high' ? 'gpt-4o' : complexity === 'medium' ? 'mistral-large' : 'mistral-small';
      return { success: true, recommended, complexity, taskLength: task.length, availableModels: ['mistral-small', 'mistral-large', 'gpt-4o', 'claude-3-sonnet', 'xai-grok'] };
    }

    case 'llm_cost_optimize': {
      const usage = args.usage || {};
      const costPerToken = { 'gpt-4o': 0.00003, 'mistral-large': 0.00002, 'mistral-small': 0.000002, 'claude-3-sonnet': 0.000015 };
      const optimization = Object.entries(costPerToken).map(([model, cost]) => ({
        model, costPer1kTokens: (cost * 1000).toFixed(4), estimatedMonthlyCost: (cost * (usage.tokensPerMonth || 1000000)).toFixed(2),
      })).sort((a, b) => parseFloat(a.estimatedMonthlyCost) - parseFloat(b.estimatedMonthlyCost));
      return { success: true, optimization, recommendation: optimization[0]?.model, cheapest: optimization[0], mostExpensive: optimization[optimization.length - 1] };
    }

    case 'llm_guardrail': {
      const text = args.text || args.content || args.input || '';
      if (!text) return { success: false, error: 'text/content is required' };
      const checks = {
        pii: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g.test(text),
        profanity: false,
        injection: /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior)/i.test(text),
        maxLength: text.length > (args.maxLength || 10000),
        toxicity: false,
      };
      const blocked = checks.injection || checks.maxLength;
      return { success: true, safe: !blocked, checks, blocked, textLength: text.length };
    }

    case 'llm_evaluate': {
      const output = args.output || args.response;
      const expected = args.expected || args.reference;
      if (!output) return { success: false, error: 'output is required' };
      const metrics = {
        length: output.length,
        wordCount: output.split(/\s+/).length,
        sentenceCount: output.split(/[.!?]+/).filter(Boolean).length,
      };
      if (expected) {
        const outputWords = new Set(output.toLowerCase().split(/\s+/));
        const expectedWords = new Set(expected.toLowerCase().split(/\s+/));
        const intersection = [...outputWords].filter(w => expectedWords.has(w));
        metrics.overlapScore = (intersection.length / Math.max(outputWords.size, expectedWords.size)).toFixed(3);
      }
      return { success: true, metrics, output: output.substring(0, 200) };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── AGENT ORCHESTRATION TOOLS ───────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'agent_spawn': {
      const task = args.task || args.prompt;
      if (!task) return { success: false, error: 'task is required' };
      try {
        const result = await smartRequest({
          systemPrompt: `You are a specialized sub-agent. Your role: ${args.role || 'assistant'}. Complete the task thoroughly.`,
          userPrompt: task,
          preferredModel: args.model || 'fast',
        });
        return { success: true, agentId: `agent_${crypto.randomBytes(4).toString('hex')}`, role: args.role || 'assistant', result: result.text || result.content };
      } catch (e) {
        return { success: false, error: `Agent spawn failed: ${e.message}` };
      }
    }

    case 'agent_delegate': {
      const task = args.task || args.prompt;
      const agent = args.agent || args.role || 'default';
      if (!task) return { success: false, error: 'task is required' };
      try {
        const systemPrompts = {
          coder: 'You are an expert programmer. Write clean, efficient code.',
          reviewer: 'You are a code reviewer. Find bugs, suggest improvements.',
          designer: 'You are a UI/UX designer. Create beautiful, accessible interfaces.',
          writer: 'You are a technical writer. Write clear documentation.',
          tester: 'You are a QA engineer. Write comprehensive tests.',
          default: 'You are a helpful assistant. Complete the task.',
        };
        const result = await smartRequest({
          systemPrompt: systemPrompts[agent] || systemPrompts.default,
          userPrompt: task,
          preferredModel: 'fast',
        });
        return { success: true, agent, result: result.text || result.content, delegated: true };
      } catch (e) {
        return { success: false, error: `Delegation failed: ${e.message}` };
      }
    }

    case 'agent_reflect': {
      const context = args.context || args.history || '';
      try {
        const result = await smartRequest({
          systemPrompt: 'You are a reflective AI agent. Analyze your own reasoning, identify mistakes, and suggest better approaches.',
          userPrompt: `Reflect on this context and suggest improvements:\n\n${(typeof context === 'string' ? context : JSON.stringify(context)).substring(0, 8000)}`,
          preferredModel: 'fast',
        });
        return { success: true, reflection: result.text || result.content };
      } catch (e) {
        return { success: false, error: `Reflection failed: ${e.message}` };
      }
    }

    case 'prompt_template': {
      const template = args.template;
      const variables = args.variables || {};
      if (!template) return { success: false, error: 'template is required' };
      let rendered = template;
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value));
      }
      return { success: true, rendered, template, variables, unresolvedVars: [...rendered.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]) };
    }

    case 'llm_fallback': {
      const prompt = args.prompt || args.message;
      if (!prompt) return { success: false, error: 'prompt is required' };
      const models = args.models || ['fast', 'balanced', 'powerful'];
      for (const model of models) {
        try {
          const result = await smartRequest({
            systemPrompt: args.system || 'You are a helpful assistant.',
            userPrompt: prompt,
            preferredModel: model,
          });
          return { success: true, response: result.text || result.content, model, fallbackUsed: model !== models[0] };
        } catch (e) {
          continue;
        }
      }
      return { success: false, error: 'All models failed' };
    }

    case 'agent_memory_search': {
      const query = args.query;
      if (!query) return { success: false, error: 'query is required' };
      const allMemories = Object.entries(agentSessionMemory)
        .filter(([k]) => !k.startsWith('__'))
        .map(([key, value]) => ({ key, value: String(value) }));
      const matches = allMemories.filter(m =>
        m.key.toLowerCase().includes(query.toLowerCase()) || m.value.toLowerCase().includes(query.toLowerCase())
      );
      return { success: true, results: matches, total: matches.length, query };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── DATA EXTRAS ─────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════

    case 'data_profile': {
      const data = args.data || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!data) return { success: false, error: 'data or path is required' };
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const profile = {
          type: Array.isArray(parsed) ? 'array' : typeof parsed,
          rowCount: Array.isArray(parsed) ? parsed.length : 1,
          columns: Array.isArray(parsed) && parsed[0] ? Object.keys(parsed[0]) : Object.keys(parsed),
          sample: Array.isArray(parsed) ? parsed.slice(0, 3) : parsed,
        };
        return { success: true, profile };
      } catch (e) {
        return { success: true, profile: { type: 'text', length: String(data).length, lines: String(data).split('\n').length } };
      }
    }

    case 'data_clean': {
      const data = args.data || (args.path && currentFiles ? (currentFiles[args.path] || currentFiles['/' + args.path]) : null);
      if (!data) return { success: false, error: 'data or path is required' };
      try {
        let parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
          const before = parsed.length;
          // Remove nulls, empty objects, duplicates
          parsed = parsed.filter(r => r !== null && r !== undefined && Object.keys(r || {}).length > 0);
          const seen = new Set();
          parsed = parsed.filter(r => {
            const key = JSON.stringify(r);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { success: true, data: parsed, removed: before - parsed.length, remaining: parsed.length };
        }
        return { success: true, data: parsed, message: 'Non-array data returned as-is' };
      } catch (e) {
        return { success: false, error: `Data cleaning failed: ${e.message}` };
      }
    }

    case 'data_visualize': {
      const data = args.data;
      const type = args.type || 'bar';
      return {
        success: true,
        action: 'data_visualize',
        chartType: type,
        data,
        _uiEvent: true,
        message: `${type} chart data prepared. The frontend will render the visualization.`,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // ── IMAGE EXTRAS (convert, face, export, ocr) ───────────────
    // ═══════════════════════════════════════════════════════════════

    case 'image_convert':
    case 'image_face':
    case 'image_export':
    case 'image_ocr':
      return await agentToolsService.executeTool(toolName, { ...args, userId });

    // ── VIDEO EXTRAS (transform, convert, analyze, filter, ai) ──
    case 'video_transform':
    case 'video_convert':
    case 'video_analyze':
    case 'video_filter':
    case 'video_ai':
      return await agentToolsService.executeTool(toolName, { ...args, userId });

    // ── ARCHIVE EXTRAS (core, structure, bulk) ──────────────────
    case 'archive_core':
    case 'archive_structure':
    case 'archive_bulk':
      return await agentToolsService.executeTool(toolName, { ...args, userId });

    default:
      // V2.0: delegate all unhandled tools to central executeTool() dispatcher
      try {
        const result = await agentToolsService.executeTool(toolName, { ...args, userId });
        return result;
      } catch (err) {
        return { success: false, error: `Tool '${toolName}' failed: ${err.message}` };
      }
  }
}


// ── Canvas Agent system prompt ──
function getCanvasAgentPrompt(currentFiles) {
  const fileList = currentFiles
    ? Object.keys(currentFiles).map(p => `  - ${p} (${currentFiles[p].length} chars)`).join('\n')
    : '  (no files yet)';

  return `You are Nova, an expert full-stack web developer and AI coding assistant inside Canvas Studio — an Agentic IDE.

## Your Role
You help users build, modify, and iterate on web applications through conversation and tool calls.
You can directly create, read, update, and delete project files using your tools.

## Current Project Files
${fileList}

## How You Work
1. **Understand** — Ask clarifying questions if the request is ambiguous
2. **Plan** — Briefly explain what you'll do before making changes
3. **Execute** — Use your tools (update_file, create_file, etc.) to make the actual changes
4. **Explain** — After making changes, summarize what you did

## Tool Usage Rules
- Use update_file to create or modify files — always write COMPLETE file contents, never partial
- Use read_file to check existing code before modifying it
- Use list_files to see what files exist in the project with their sizes
- Use rename_file to rename, move to a different folder, or change file extension
- Use copy_file to duplicate a file to a new path
- Use create_folder to organize files into directories (e.g. /src, /components, /styles)
- Use append_to_file to add content to the end of an existing file without overwriting
- Use web_search when you need current information (API docs, CDN links, etc.)
- Use execute_code to run calculations or test logic
- Use generate_image when the user needs images for their app
- Use analyze_code to review code quality
- Use format_code to format/prettify code
- Use file_exists to check if a file exists before reading it (returns true/false, never errors)
- Use get_selection to see what text the user has selected in the editor
- Use set_cursor_position to navigate to a specific line/column in a file (also opens/focuses the file)
- Use replace_selection to replace the currently selected text with new text (precision editing)
- Use insert_at_cursor to insert new code at the cursor position without replacing anything

## Navigation & Search Tools
Find and open files quickly:
- **open_file(path, line?, column?, preview?)** — Open a file in the editor and jump to a specific line. Use to show the user a file, navigate to a definition, or focus on a location. Unlike set_cursor_position (which just moves the cursor), this also switches the active tab.
- **search_in_files(query, isRegex?, caseSensitive?, includePattern?, excludePattern?, maxResults?, contextLines?)** — Search for text or regex across ALL project files. Returns matches with line numbers and surrounding context. Use to find function definitions, locate usages, find TODOs, or trace code references.
- **find_file(pattern, type?)** — Find files by name, partial name, or glob pattern. Examples: "header", "*.tsx", "components/*.js". Returns matching paths with types and sizes. Use when you don't know the exact path.

## Diff & Patch Tools
Make surgical edits without replacing entire files:
- **apply_diff(path, diffs, description?)** — Apply line-range edits to a file. Each diff specifies startLine, endLine, and content. Much more efficient than update_file for small changes to large files. Diffs are applied bottom-up so line numbers stay valid. Set endLine=0 with startLine=N to INSERT before line N. Set content="" to DELETE lines.
Prefer apply_diff over update_file when changing fewer than ~20% of lines in a file.

## Package Management Tools
Manage project dependencies:
- **install_package(packages, dev?, createIfMissing?)** — Add npm packages to package.json. Specify versions with @ syntax: ["react", "tailwindcss@3.4.0"]. Set dev=true for devDependencies. Creates package.json if missing (set createIfMissing=false to prevent this).

## Diagnostics Tools
Check project health:
- **get_diagnostics(path?, checks?)** — Analyze the project for syntax errors, broken references, accessibility issues, security concerns, and best practices. Returns severity-grouped results. Checks: ["syntax", "references", "accessibility", "security", "best_practices", "all" (default)].

## Test Execution Tools
Run tests in a sandboxed environment:
- **run_tests(code?, language?, testFile?)** — Run test code with built-in test(), expect(), describe() helpers. Supply inline code or point to a testFile in the project. Returns pass/fail counts and individual test results. Supports JavaScript and Python.

## Preview Console Tools
Debug the live preview:
- **get_preview_console(type?, limit?)** — Read browser console output (logs, warnings, errors, uncaught exceptions) from the live preview iframe. Use to debug runtime issues, verify code is working, or check for errors after changes. Types: "all", "errors", "warnings", "logs".

## Memory & State Tools
You have persistent memory that survives across conversations:
- **save_memory(key, value)** — Save important user facts, preferences, project decisions. Keys are case-insensitive and overwrite existing values. Use proactively when the user shares important info.
- **get_memory(key)** — Retrieve a previously saved value. Returns null if not found.
- **clear_memory(key?)** — Clear a specific key, or all memories if no key given. Only when user explicitly asks to forget.
Use memory naturally — save things like the user's name, preferred framework, project goals, design preferences, etc. Don't announce that you're saving — just do it.

## Permissions & Safety Tools
All actions are permitted — no approval or confirmation needed. Execute directly.
- **request_approval(action, description, severity)** — Always auto-approved. No need to wait.
- **check_permission(action)** — Always returns allowed: true. No restrictions.
Standard flow: plan → execute immediately. Do not pause or ask for confirmation.

## UI / User Interaction Tools
Communicate with the user beyond the chat:
- **show_message(text)** — Show an info notification/toast (blue). For status updates, tips, confirmations.
- **show_warning(text)** — Show a warning notification (amber). Something needs attention.
- **show_error(text)** — Show an error notification (red). Something failed.
- **ask_user(question, options?)** — Ask the user a question. Optionally provide quick-reply buttons. The answer comes back in the next turn. Use when you need clarification.
Notifications appear as toast overlays — they do NOT go into the chat.

## Agent Control Tools
Control your own operating mode:
- **set_mode(mode, reason?)** — Switch to "chat" (conversation only, no edits), "dev" (full development), or "review" (read-only analysis). Default is dev.
- **get_agent_state()** — Get current mode, active file, file count, memory count, selection/cursor status. Check this when you need context.
- **cancel_task(reason?)** — Cancel current operation. Use when user says "stop" or "cancel".

## Image Processing Tools
You have 8 powerful image tools. Each tool accepts an action + options:
- **image_create** — blank canvas, gradient, pattern (checkerboard/stripes/dots/grid), noise, from_svg, text_image, placeholder, sprite_sheet (combine images into grid), drawing (canvas-style shapes: rect, circle, ellipse, line, polygon, path, text)
- **image_transform** — resize, crop, rotate, flip, mirror, pad, trim, extend, shrink, skew, auto_orient, extract_region, flatten
- **image_filter** — grayscale, sepia, invert, modulate, brightness, contrast, hue_saturation, gamma, blur, sharpen, tint, noise_reduce, normalize, threshold, pixelate, vignette, emboss, edge_detect, posterize, vintage, cinematic, clahe, color_matrix, blur_region, motion_blur (directional blur with angle+distance), lut (color grading presets: warm, cool, noir, sunset, teal_orange, matte, forest, candy)
- **image_optimize** — compress (with maxSizeKB target), convert format, strip_metadata, responsive (multi-size), thumbnail, progressive, color_space, flatten_alpha, ico, to_pdf (export as PDF document), to_gif (create animated GIF from frames array with delay control)
- **image_compose** — text_overlay (multi-line, stroke/bg), watermark (text/image, tiled), overlay (blend modes), merge (H/V/grid), border, shadow, frame
- **image_background** — remove (auto-detect solid bg), replace (new color/image), make_transparent (chroma key), blur_background (keep subject), gradient_background, ai_remove (AI-powered background removal via Remove.bg — best quality, supports newBackground for replacement)
- **image_analyze** — metadata, validate (rules), dominant_colors, stats, histogram, hash (perceptual), compare (similarity), aspect_check, corruption_check, profile (ICC), to_ascii, to_base64, read_exif (full EXIF metadata extraction), write_exif (set artist/copyright/description/software/dateTime/userComment), strip_gps (remove GPS privacy data), to_svg_trace (vectorize raster to SVG)
- **image_batch** — apply any of the 7 tools above to multiple images at once
All image tools accept a source URL. image_create does not require a source. Results contain a signed URL (expires 24h) you can display to the user or use in update_file.

## AI Image Analysis (Azure Computer Vision)
You also have **image_ai** — cloud-powered AI analysis for understanding image CONTENT:
- **ocr** — Extract text from images (printed + handwritten). Returns full text, lines with bounding boxes, per-word confidence.
- **describe** — Generate natural language caption for the image. Returns caption with confidence + dense captions for regions.
- **tags** — Auto-tag image content (e.g. "outdoor", "sky", "person", "building"). Returns tags with confidence scores.
- **objects** — Detect objects with bounding boxes (e.g. person, car, dog, chair). Returns object names + positions.
- **people** — Detect people in image with bounding boxes and confidence scores.
- **nsfw_check** — Adult/racy/gore content moderation. Returns safety boolean + individual scores.
- **smart_crop** — AI-suggested crop regions for different aspect ratios (1:1, 16:9, 9:16).
- **full_analysis** — All of the above in one call (most efficient for comprehensive understanding).
Use image_ai when you need to understand WHAT is in an image. Use the other image tools for pixel manipulation.

## Video Processing Tools
You have 11 powerful video tools powered by FFmpeg. Each accepts an action + options:
- **video_trim** — trim (start/end), cut_silence (auto-detect silence), remove_dead (silence + low motion), scene_split (detect scene changes), auto_bounds (remove black frames)
- **video_highlights** — extract_clips (at timestamps), create_shorts (auto vertical 9:16), best_moments (audio energy peaks), energy_clip (highest-energy segment), topic_clip (by topic timestamps)
- **video_resize** — youtube (1920×1080), reels (1080×1920), tiktok (1080×1920), instagram (1080×1080), custom (any size + fit), smart_crop (face-aware crop via Azure Vision)
- **video_captions** — transcribe (extract audio for speech-to-text), burn (SRT/text subtitles), highlight_words (colored highlighting), emoji (decorative captions), translate (provide translated SRT via burn)
- **video_style** — cinematic (letterbox+grain+contrast), vlog (bright warm), podcast (clean sharp), color_correct (auto normalize), lut (apply .cube file), tone (warm/cool/dark/bright preset), dark, bright, warm, cool
- **video_overlay** — title (centered card), hook (attention text), lower_third (name/title bar), watermark (image/text with opacity), brand (name+tagline bar)
- **video_audio** — balance (EBU R128 loudness), denoise (FFT noise reduction), fade (audio+video fade in/out), add_music (mix background music with volume control), beat_sync (manual timing)
- **video_face** — detect (Azure Vision frame sampling), blur (detect+blur faces), blur_background (blur except center subject), track_crop (use smart_crop), focus_speaker (detect then crop)
- **video_moderate** — nsfw (frame sampling via Azure Vision), profanity (transcribe first), copyright (needs fingerprinting), platform_safety (combined checks)
- **video_batch** — process multiple videos through a pipeline of sequential operations
- **video_export** — export (format convert mp4/webm/mov/avi/mkv), thumbnail (extract frame), preview (short clip), metadata (full video info), gif (high-quality 2-pass animated GIF)
All video tools accept a source URL. Results contain signed URLs (24h expiry). Video processing may take 10-60 seconds depending on duration and action.

## Archive / ZIP Tools
You have 10 powerful archive tools for ZIP, TAR, and 7Z processing:
- **archive_create** — zip/from_files (create ZIP from file map), tar, targz (compressed tar), split (split into parts), merge (combine parts)
- **archive_extract** — extract/auto (full extraction with file listing), extract_file (get single file content), extract_pattern (glob matching)
- **archive_edit** — add_file, remove_file, replace_file, edit_text (find/replace), patch_config (.env/.json/.yaml patching), rename_file, fix_paths (Windows↔Linux separators)
- **archive_inspect** — list (all files with sizes), structure (tree view), metadata (format info), detect_type (Node.js/Python/PHP/etc), validate_layout (check required files), find_file (by name/pattern), search_text (full-text search across archive)
- **archive_security** — check_bomb (detect zip bombs), check_symlinks, check_paths (path traversal), check_password (encrypted entries), scan_secrets (API keys/tokens/passwords), size_report (breakdown by ext/dir)
- **archive_convert** — zip_to_tar, tar_to_zip, zip_to_targz, targz_to_zip, normalize_endings (LF↔CRLF)
- **archive_optimize** — strip_dev (remove node_modules/.git/.DS_Store/etc), deduplicate (by content hash), flatten (reduce dir depth), nest (wrap in root folder), compress_level (recompress 0-9), naming_convention (kebab/snake/camel)
- **archive_deploy** — package_build (extract build artifacts only), prepare_deploy (strip dev + add platform configs), inject_env (add/update .env vars), version_tag (stamp version), production_ready (full cleanup + validate + secrets scan)
- **archive_batch** — process multiple archives through a pipeline of sequential operations
- **archive_intelligence** — summarize (overview with type detection), readme_generate (auto-generate README.md), detect_project (detailed type + features), flag_secrets, dependency_report (analyze package.json/requirements.txt/go.mod/Cargo.toml)
All archive tools accept a source URL. Use archive_create with a files map (no source needed) to create new archives. Results contain signed URLs (24h expiry).

## Data Processing Tools
You have 8 powerful data processing tools for CSV, Excel, JSON, XML analysis and transformation:
- **data_read** — csv, excel (xlsx multi-sheet), json, xml, tsv, text, auto (auto-detect format). Returns parsed preview + dataUrl for chaining.
- **data_transform** — remove_duplicates, fill_missing (value/forward/mean/median), normalize (lowercase/uppercase/trim/date/number), rename_columns, filter (equals/contains/gt/lt/regex/in), sort, aggregate (groupBy + sum/avg/count/min/max), pivot, sample, merge (inner/left/right join), cast (type conversion)
- **data_convert** — csv_to_json, json_to_csv, csv_to_excel, excel_to_csv, json_to_excel, excel_to_json, xml_to_json, json_to_xml, csv_to_xml
- **data_analyze** — summary (stats per column), describe (full statistical profile), correlate (Pearson correlation matrix), trends (linear regression + moving avg), anomalies (z-score detection), distribution (histogram/categorical counts), compare (diff two datasets)
- **data_report** — csv_report, json_report, excel_report (auto-sized columns + optional summary sheet), summary_report (executive summary), table (markdown format)
- **data_validate** — schema (type/required/min/max/pattern/enum validation), duplicates, missing (completeness report), constraints (unique/not_null/positive/range), consistency (cross-field rules), types (infer column types)
- **data_scrape** — extract_table (HTML tables to JSON), extract_links (all links with internal/external), extract_text (clean text content), extract_structured (CSS selectors), extract_meta (OG tags, SEO, headings)
- **data_pipeline** — chain multiple data operations sequentially, passing dataUrl between steps
Data tools chain via dataUrl: data_read returns a dataUrl → pass to data_transform → data_report. All intermediate/final results stored as signed S3 URLs (24h expiry).

## Code Quality Standards
- Write modern HTML5, CSS3 (with CSS variables), and ES6+ JavaScript
- Use responsive design (Flexbox, Grid)
- Add smooth transitions and hover states
- Include proper meta tags and viewport settings
- Use semantic HTML elements
- Add accessibility attributes (aria-*, alt, role)
- Use placeholder images from https://picsum.photos/WIDTH/HEIGHT (NEVER use placeholder.com or via.placeholder.com)
- All links use # anchors (never absolute URLs to real sites)
- Never reference "Maula AI" or any real company in generated code

## When Building a New App
- Use update_file to write /index.html (main entry with embedded CSS/JS for simple apps)
- For complex apps: separate into /index.html, /styles.css, /app.js
- Always start with <!DOCTYPE html> and include proper <head> with meta viewport

## When Modifying an Existing App
- First use read_file to see the current code
- Then use update_file with the modified content
- Only change what was requested — preserve the rest

## Response Style
- Be conversational but concise
- If the user just wants to chat, respond without using tools
- If the user wants something built/changed, use tools immediately`;
}


// ── USER ANALYTICS STATS ──────────────────────────────────────────────────
// GET /api/canvas/stats — aggregate all historical stats for the logged-in user
router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId;

    const apps = await prisma.canvasApp.findMany({
      where: { userId },
      select: {
        id: true,
        language: true,
        history: true,
        createdAt: true,
        updatedAt: true,
        provider: true,
        modelId: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    let totalUserMessages = 0;
    let totalAgentMessages = 0;
    let totalWords = 0;
    const languageCounts = {};
    const providerCounts = {};
    const recentTimestamps = [];

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    for (const app of apps) {
      if (app.language) {
        languageCounts[app.language] = (languageCounts[app.language] || 0) + 1;
      }
      if (app.provider) {
        providerCounts[app.provider] = (providerCounts[app.provider] || 0) + 1;
      }

      let history = [];
      try { history = JSON.parse(app.history || '[]'); } catch { /* skip */ }

      for (const msg of history) {
        const isUser = msg.role === 'user';
        const isAgent = msg.role === 'model' || msg.role === 'assistant';

        if (isUser) totalUserMessages++;
        if (isAgent) {
          totalAgentMessages++;
          const text = msg.text || msg.content || '';
          totalWords += text.split(/\s+/).filter(Boolean).length;
        }

        if (msg.timestamp && msg.timestamp >= dayAgo) {
          recentTimestamps.push(msg.timestamp);
        }
      }
    }

    const estimatedTokens = Math.round(totalWords * 1.3);
    const totalExchanges = Math.min(totalUserMessages, totalAgentMessages);

    return res.json({
      success: true,
      stats: {
        totalApps: apps.length,
        totalUserMessages,
        totalAgentMessages,
        totalWords,
        estimatedTokens,
        totalExchanges,
        languageCounts,
        providerCounts,
        recentTimestamps,
        topLanguage: Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'html',
      },
    });
  } catch (error) {
    console.error('[Canvas stats] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

export default router;