import { createLogger } from '../lib/logger.js';
const log = createLogger('toolsHeadquarters');
/**
 * ============================================================================
 * TOOLS HEADQUARTERS 🏢
 * ============================================================================
 * ONE place for ALL tools. Every app/route imports from here.
 * 
 * Structure:
 * - ALL_TOOLS: Complete array of all tool definitions
 * - executeTool: Single function that routes to correct executor
 * - Category helpers: isFileTool, isAgentTool, etc.
 * ============================================================================
 */

// ============================================================================
// IMPORT ALL TOOL MODULES
// ============================================================================

// Core tools (file system, git, terminal, http, etc.)
import { TOOL_DEFINITIONS, executeTool as executeCoreTool } from './tools.js';

// Canvas/Workspace tools
import { CANVAS_TOOL_DEFINITIONS, executeCanvasTool } from './canvasTools.js';

// Image generation tools
import { IMAGE_TOOL_DEFINITIONS, executeImageTool, isImageTool } from './imageTools.js';

// Video generation tools
import { VIDEO_TOOL_DEFINITIONS, executeVideoTool, isVideoTool } from './videoTools.js';

// Archive/ZIP tools
import { ARCHIVE_TOOL_DEFINITIONS, executeArchiveTool, isArchiveTool } from './archiveTools.js';

// Backend/API generation tools
import { BACKEND_TOOL_DEFINITIONS, executeBackendTool, isBackendTool } from './backendTools.js';

// Code execution tools
import { CODE_TOOL_DEFINITIONS, executeCodeTool, isCodeTool } from './codeTools.js';

// Editor tools
import { EDITOR_TOOL_DEFINITIONS, executeEditorTool, isEditorTool } from './editorTools.js';

// Agent Control tools (mode switching, state management, planning, context)
import {
  AGENT_CONTROL_TOOL_DEFINITIONS,
  executeAgentControlTool,
  isAgentControlTool,
  AGENT_MODES,
  getAgentState
} from './agentControlTools.js';

// Agent Memory tools (persistent context — writes to PostgreSQL via Prisma)
import {
  AGENT_MEMORY_TOOL_DEFINITIONS,
  executeAgentMemoryTool,
  isAgentMemoryTool,
} from './agentMemoryTools.js';

// Agent Safety tools (permission levels, approval)
import {
  AGENT_SAFETY_TOOL_DEFINITIONS,
  executeAgentSafetyTool,
  isAgentSafetyTool,
  resolveApproval,
  classifyOperation,
  PERMISSION_LEVELS
} from './agentSafetyTools.js';

// Agent UI tools (messaging, progress, questions)
import {
  AGENT_UI_TOOL_DEFINITIONS,
  executeAgentUITool,
  isAgentUITool,
  resolveQuestion,
  getPendingQuestions
} from './agentUITools.js';

// ── NEW V2 TOOL MODULES ──

// Core Utility tools (JSON, date/time, text transform)
import { CORE_UTILITY_TOOL_DEFINITIONS, executeCoreUtilityTool, isCoreUtilityTool } from './coreUtilityTools.js';

// Document Parsing tools (PDF, CSV, XML, YAML, DOCX, XLSX, HTML)
import { DOCUMENT_PARSING_TOOL_DEFINITIONS, executeDocumentParsingTool, isDocumentParsingTool } from './documentParsingTools.js';

// Developer tools (format, lint, compile, bundle, test, coverage, complexity, deps)
import { DEV_TOOL_DEFINITIONS, executeDevTool, isDevTool } from './devTools.js';

// Web & Frontend tools (HTML gen, CSS gen, responsive check, a11y, SEO, perf, PWA)
import { WEB_FRONTEND_TOOL_DEFINITIONS, executeWebFrontendTool, isWebFrontendTool } from './webFrontendTools.js';

// Database tools (query, schema, backup, migrate, analyze, connect)
import { DATABASE_TOOL_DEFINITIONS, executeDatabaseTool, isDatabaseTool } from './databaseTools.js';

// API & Integration tools (request, mock, document, test, transform, webhook, SDK)
import { API_TOOL_DEFINITIONS, executeApiTool, isApiTool } from './apiTools.js';

// AI & ML tools (LLM chat, embed, finetune, ML train, predict)
import { AI_ML_TOOL_DEFINITIONS, executeAiMlTool, isAiMlTool } from './aiMlTools.js';

// Security tools (hash, encrypt, sign, scan secrets, scan malware, auth generate)
import { SECURITY_TOOL_DEFINITIONS, executeSecurityTool, isSecurityTool } from './securityTools.js';

// Content & Markdown tools (convert, validate, generate, TOC, format)
import { CONTENT_MARKDOWN_TOOL_DEFINITIONS, executeContentMarkdownTool, isContentMarkdownTool } from './contentMarkdownTools.js';

// Analytics & Monitoring tools (track, report, health, logs, performance)
import { ANALYTICS_TOOL_DEFINITIONS, executeAnalyticsTool, isAnalyticsTool } from './analyticsTools.js';

// File System tools (search, compress)
import { FILESYSTEM_TOOL_DEFINITIONS, executeFileSystemTool, isFileSystemTool } from './fileSystemTools.js';

// ── NEW V3 TOOL MODULES (AK 47) ──

// Deployment & Docker tools (build, run, compose, CI, static deploy)
import { DEPLOYMENT_DOCKER_TOOL_DEFINITIONS, executeDeploymentDockerTool, isDeploymentDockerTool } from './deploymentDockerTools.js';

// Communication tools (email, push notifications, webhooks, SMS)
import { COMMUNICATION_TOOL_DEFINITIONS, executeCommunicationTool, isCommunicationTool } from './communicationTools.js';

// Data Processing tools (validate, transform, pipeline, diff, merge)
import { DATA_PROCESSING_TOOL_DEFINITIONS, executeDataProcessingTool, isDataProcessingTool } from './dataProcessingTools.js';

// Testing & QA tools (e2e, load, snapshot, mock server, coverage)
import { TESTING_QA_TOOL_DEFINITIONS, executeTestingQATool, isTestingQATool } from './testingQATools.js';

// Cloud Infrastructure tools (DNS, SSL, storage, secrets, scaling)
import { CLOUD_INFRA_TOOL_DEFINITIONS, executeCloudInfraTool, isCloudInfraTool } from './cloudInfraTools.js';

// Workflow Automation tools (cron, task queue, event trigger, workflow, retry)
import { WORKFLOW_AUTOMATION_TOOL_DEFINITIONS, executeWorkflowAutomationTool, isWorkflowAutomationTool } from './workflowAutomationTools.js';

// Collaboration tools (diff/merge, conflict resolve, review, share, live session)
import { COLLABORATION_TOOL_DEFINITIONS, executeCollaborationTool, isCollaborationTool } from './collaborationTools.js';

// ── NEW V4 TOOL MODULES ──

// Workflow Orchestration tools (pipeline DAG, execute, schedule, visualize, optimize)
import { WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS, executeWorkflowOrchestratorTool, isWorkflowOrchestratorTool } from './workflowOrchestratorTools.js';

// Knowledge Graph tools (create, query, visualize, merge, reason)
import { KNOWLEDGE_GRAPH_TOOL_DEFINITIONS, executeKnowledgeGraphTool, isKnowledgeGraphTool } from './knowledgeGraphTools.js';

// Business & Growth tools (funnel, pricing, A/B test, lead, campaign)
import { BUSINESS_GROWTH_TOOL_DEFINITIONS, executeBusinessGrowthTool, isBusinessGrowthTool } from './businessGrowthTools.js';

// Team Collaboration tools (invite, role, comments, tasks, approvals)
import { TEAM_COLLABORATION_TOOL_DEFINITIONS, executeTeamCollaborationTool, isTeamCollaborationTool } from './teamCollaborationTools.js';

// Advanced AI tools (LLM router, cost optimize, guardrail, eval, agent lifecycle)
import { ADVANCED_AI_TOOL_DEFINITIONS, executeAdvancedAITool, isAdvancedAITool } from './advancedAITools.js';

// Data Science tools (profile, clean, visualize, feature engineer, model compare)
import { DATA_SCIENCE_TOOL_DEFINITIONS, executeDataScienceTool, isDataScienceTool } from './dataScienceTools.js';

// Geo & Location tools (geocode, route, distance, fence)
import { GEO_LOCATION_TOOL_DEFINITIONS, executeGeoLocationTool, isGeoLocationTool } from './geoLocationTools.js';

// Cloud Control tools (deploy, scale, logs, secrets, cost)
import { CLOUD_CONTROL_TOOL_DEFINITIONS, executeCloudControlTool, isCloudControlTool } from './cloudControlTools.js';

// Advanced Security tools (scan, policy, threat model, incident response)
import { ADVANCED_SECURITY_TOOL_DEFINITIONS, executeAdvancedSecurityTool, isAdvancedSecurityTool } from './advancedSecurityTools.js';


// ============================================================================
// MERGE ALL TOOLS INTO ONE ARRAY
// ============================================================================

// Deduplicate tools: later definitions win (canvas tools override core when names clash)
const _rawTools = [
  // Core tools (55 tools: file system, git, terminal, http, memory, zip, web search)
  ...TOOL_DEFINITIONS,

  // Canvas tools (workspace, project, component management) — overrides core file tools
  ...CANVAS_TOOL_DEFINITIONS,

  // Image tools (generation, editing, upscaling)
  ...IMAGE_TOOL_DEFINITIONS,

  // Video tools (generation, editing)
  ...VIDEO_TOOL_DEFINITIONS,

  // Archive tools (export, backup, restore)
  ...ARCHIVE_TOOL_DEFINITIONS,

  // Backend tools (API generation, database, deployment)
  ...BACKEND_TOOL_DEFINITIONS,

  // Code tools (execution, analysis)
  ...CODE_TOOL_DEFINITIONS,

  // Editor tools (cursor, selection, insert)
  ...EDITOR_TOOL_DEFINITIONS,

  // Agent Control tools (mode, state, execution control)
  ...AGENT_CONTROL_TOOL_DEFINITIONS,

  // Agent Memory tools (save, get, delete, search context)
  ...AGENT_MEMORY_TOOL_DEFINITIONS,

  // Agent Safety tools (permissions, approval workflow)
  ...AGENT_SAFETY_TOOL_DEFINITIONS,

  // Agent UI tools (show_message, ask_user, show_progress)
  ...AGENT_UI_TOOL_DEFINITIONS,

  // ── NEW V2 TOOL MODULES ──
  ...CORE_UTILITY_TOOL_DEFINITIONS,
  ...DOCUMENT_PARSING_TOOL_DEFINITIONS,
  ...DEV_TOOL_DEFINITIONS,
  ...WEB_FRONTEND_TOOL_DEFINITIONS,
  ...DATABASE_TOOL_DEFINITIONS,
  ...API_TOOL_DEFINITIONS,
  ...AI_ML_TOOL_DEFINITIONS,
  ...SECURITY_TOOL_DEFINITIONS,
  ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
  ...ANALYTICS_TOOL_DEFINITIONS,
  ...FILESYSTEM_TOOL_DEFINITIONS,

  // ── NEW V3 TOOL MODULES (AK 47) ──
  ...DEPLOYMENT_DOCKER_TOOL_DEFINITIONS,
  ...COMMUNICATION_TOOL_DEFINITIONS,
  ...DATA_PROCESSING_TOOL_DEFINITIONS,
  ...TESTING_QA_TOOL_DEFINITIONS,
  ...CLOUD_INFRA_TOOL_DEFINITIONS,
  ...WORKFLOW_AUTOMATION_TOOL_DEFINITIONS,
  ...COLLABORATION_TOOL_DEFINITIONS,

  // ── NEW V4 TOOL MODULES ──
  ...WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS,
  ...KNOWLEDGE_GRAPH_TOOL_DEFINITIONS,
  ...BUSINESS_GROWTH_TOOL_DEFINITIONS,
  ...TEAM_COLLABORATION_TOOL_DEFINITIONS,
  ...ADVANCED_AI_TOOL_DEFINITIONS,
  ...DATA_SCIENCE_TOOL_DEFINITIONS,
  ...GEO_LOCATION_TOOL_DEFINITIONS,
  ...CLOUD_CONTROL_TOOL_DEFINITIONS,
  ...ADVANCED_SECURITY_TOOL_DEFINITIONS,
];

// Remove duplicates — keep last occurrence (so canvas/specialized tools override core)
const _seenNames = new Map();
for (const tool of _rawTools) {
  _seenNames.set(tool.name, tool);
}
export const ALL_TOOLS = [..._seenNames.values()];

// Tool name set for quick lookup
const ALL_TOOL_NAMES = new Set(ALL_TOOLS.map(t => t.name));

// Core tool names (from tools.js)
const CORE_TOOL_NAMES = new Set(TOOL_DEFINITIONS.map(t => t.name));

// Canvas tool names
const CANVAS_TOOL_NAMES = new Set(CANVAS_TOOL_DEFINITIONS.map(t => t.name));


// ============================================================================
// UNIFIED EXECUTE FUNCTION
// ============================================================================

/**
 * Execute any tool by name - routes to correct executor automatically
 * @param {string} toolName - Name of the tool to execute
 * @param {object} input - Input parameters for the tool
 * @param {object} ctx - Context (userId, sessionId, deps, etc.)
 * @returns {Promise<any>} - Tool execution result
 */
export async function executeTool(toolName, input, ctx = {}) {
  log.info(`[ToolsHQ] Executing: ${toolName}`);

  // Route to correct executor based on tool type
  try {
    let rawResult;

    // Agent tools first (highest priority)
    if (isAgentControlTool(toolName)) {
      rawResult = await executeAgentControlTool(toolName, input, ctx);
    } else if (isAgentMemoryTool(toolName)) {
      rawResult = await executeAgentMemoryTool(toolName, input, ctx);
    } else if (isAgentSafetyTool(toolName)) {
      rawResult = await executeAgentSafetyTool(toolName, input, ctx);
    } else if (isAgentUITool(toolName)) {
      rawResult = await executeAgentUITool(toolName, input, ctx);
    }
    // Media tools
    else if (isImageTool(toolName)) {
      rawResult = await executeImageTool(toolName, input, ctx);
    } else if (isVideoTool(toolName)) {
      rawResult = await executeVideoTool(toolName, input, ctx);
    }
    // Project tools
    else if (isArchiveTool(toolName)) {
      rawResult = await executeArchiveTool(toolName, input, ctx);
    } else if (isBackendTool(toolName)) {
      rawResult = await executeBackendTool(toolName, input, ctx);
    } else if (isCodeTool(toolName)) {
      rawResult = await executeCodeTool(toolName, input, ctx);
    } else if (isEditorTool(toolName)) {
      rawResult = await executeEditorTool(toolName, input, ctx.editorContext || {}, ctx.sseWrite || (() => { }));
    }
    // ── NEW V2 TOOL MODULES ──
    else if (isCoreUtilityTool(toolName)) {
      rawResult = await executeCoreUtilityTool(toolName, input, ctx);
    } else if (isDocumentParsingTool(toolName)) {
      rawResult = await executeDocumentParsingTool(toolName, input, ctx);
    } else if (isDevTool(toolName)) {
      rawResult = await executeDevTool(toolName, input, ctx);
    } else if (isWebFrontendTool(toolName)) {
      rawResult = await executeWebFrontendTool(toolName, input, ctx);
    } else if (isDatabaseTool(toolName)) {
      rawResult = await executeDatabaseTool(toolName, input, ctx);
    } else if (isApiTool(toolName)) {
      rawResult = await executeApiTool(toolName, input, ctx);
    } else if (isAiMlTool(toolName)) {
      rawResult = await executeAiMlTool(toolName, input, ctx);
    } else if (isSecurityTool(toolName)) {
      rawResult = await executeSecurityTool(toolName, input, ctx);
    } else if (isContentMarkdownTool(toolName)) {
      rawResult = await executeContentMarkdownTool(toolName, input, ctx);
    } else if (isAnalyticsTool(toolName)) {
      rawResult = await executeAnalyticsTool(toolName, input, ctx);
    } else if (isFileSystemTool(toolName)) {
      rawResult = await executeFileSystemTool(toolName, input, ctx);
    }
    // ── NEW V3 TOOL MODULES (AK 47) ──
    else if (isDeploymentDockerTool(toolName)) {
      rawResult = await executeDeploymentDockerTool(toolName, input, ctx);
    } else if (isCommunicationTool(toolName)) {
      rawResult = await executeCommunicationTool(toolName, input, ctx);
    } else if (isDataProcessingTool(toolName)) {
      rawResult = await executeDataProcessingTool(toolName, input, ctx);
    } else if (isTestingQATool(toolName)) {
      rawResult = await executeTestingQATool(toolName, input, ctx);
    } else if (isCloudInfraTool(toolName)) {
      rawResult = await executeCloudInfraTool(toolName, input, ctx);
    } else if (isWorkflowAutomationTool(toolName)) {
      rawResult = await executeWorkflowAutomationTool(toolName, input, ctx);
    } else if (isCollaborationTool(toolName)) {
      rawResult = await executeCollaborationTool(toolName, input, ctx);
    }
    // ── NEW V4 TOOL MODULES ──
    else if (isWorkflowOrchestratorTool(toolName)) {
      rawResult = await executeWorkflowOrchestratorTool(toolName, input, ctx);
    } else if (isKnowledgeGraphTool(toolName)) {
      rawResult = await executeKnowledgeGraphTool(toolName, input, ctx);
    } else if (isBusinessGrowthTool(toolName)) {
      rawResult = await executeBusinessGrowthTool(toolName, input, ctx);
    } else if (isTeamCollaborationTool(toolName)) {
      rawResult = await executeTeamCollaborationTool(toolName, input, ctx);
    } else if (isAdvancedAITool(toolName)) {
      rawResult = await executeAdvancedAITool(toolName, input, ctx);
    } else if (isDataScienceTool(toolName)) {
      rawResult = await executeDataScienceTool(toolName, input, ctx);
    } else if (isGeoLocationTool(toolName)) {
      rawResult = await executeGeoLocationTool(toolName, input, ctx);
    } else if (isCloudControlTool(toolName)) {
      rawResult = await executeCloudControlTool(toolName, input, ctx);
    } else if (isAdvancedSecurityTool(toolName)) {
      rawResult = await executeAdvancedSecurityTool(toolName, input, ctx);
    }
    // Canvas tools
    else if (CANVAS_TOOL_NAMES.has(toolName)) {
      rawResult = await executeCanvasTool(toolName, input, ctx);
    }
    // Core tools (file system, git, terminal, http, etc.)
    else if (CORE_TOOL_NAMES.has(toolName)) {
      rawResult = await executeCoreTool(toolName, input, ctx.deps || ctx);
    } else {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // ── Normalize return to { result: string, sideEffects?: object } ──
    return normalizeToolResult(toolName, rawResult);

  } catch (error) {
    log.error(`[ToolsHQ] Error executing ${toolName}:`, error);
    return {
      result: JSON.stringify({ status: 'error', error: error.message, tool: toolName }),
      sideEffects: null
    };
  }
}

/**
 * Normalize any executor return value to { result: string, sideEffects?: object }
 * Handles all shapes: { result, sideEffects }, { success, ... }, raw string, etc.
 */
function normalizeToolResult(toolName, rawResult) {
  // Already normalized: image/video/archive/backend/core tools
  if (rawResult && typeof rawResult === 'object' && typeof rawResult.result === 'string') {
    return { result: rawResult.result, sideEffects: rawResult.sideEffects || null };
  }

  // Raw JSON string (canvasTools return this)
  if (typeof rawResult === 'string') {
    return { result: rawResult, sideEffects: null };
  }

  // Object without .result (code/editor/agent tools return { success, ... })
  if (rawResult && typeof rawResult === 'object') {
    const status = rawResult.success ? 'success' : 'error';
    return {
      result: JSON.stringify({ status, ...rawResult }),
      sideEffects: rawResult.sideEffects || null
    };
  }

  // Fallback
  return {
    result: JSON.stringify({ status: 'success', data: rawResult }),
    sideEffects: null
  };
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a tool exists
 */
export function hasTool(toolName) {
  return ALL_TOOL_NAMES.has(toolName);
}

/**
 * Get tool definition by name
 */
export function getTool(toolName) {
  return ALL_TOOLS.find(t => t.name === toolName);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category) {
  switch (category) {
    case 'core':
      return TOOL_DEFINITIONS;
    case 'canvas':
      return CANVAS_TOOL_DEFINITIONS;
    case 'image':
      return IMAGE_TOOL_DEFINITIONS;
    case 'video':
      return VIDEO_TOOL_DEFINITIONS;
    case 'archive':
      return ARCHIVE_TOOL_DEFINITIONS;
    case 'backend':
      return BACKEND_TOOL_DEFINITIONS;
    case 'code':
      return CODE_TOOL_DEFINITIONS;
    case 'editor':
      return EDITOR_TOOL_DEFINITIONS;
    case 'agent_control':
      return AGENT_CONTROL_TOOL_DEFINITIONS;
    case 'agent_memory':
      return AGENT_MEMORY_TOOL_DEFINITIONS;
    case 'agent_safety':
      return AGENT_SAFETY_TOOL_DEFINITIONS;
    case 'agent_ui':
      return AGENT_UI_TOOL_DEFINITIONS;
    case 'core_utility':
      return CORE_UTILITY_TOOL_DEFINITIONS;
    case 'document_parsing':
      return DOCUMENT_PARSING_TOOL_DEFINITIONS;
    case 'dev':
      return DEV_TOOL_DEFINITIONS;
    case 'web_frontend':
      return WEB_FRONTEND_TOOL_DEFINITIONS;
    case 'database':
      return DATABASE_TOOL_DEFINITIONS;
    case 'api':
      return API_TOOL_DEFINITIONS;
    case 'ai_ml':
      return AI_ML_TOOL_DEFINITIONS;
    case 'security':
      return SECURITY_TOOL_DEFINITIONS;
    case 'content_markdown':
      return CONTENT_MARKDOWN_TOOL_DEFINITIONS;
    case 'analytics':
      return ANALYTICS_TOOL_DEFINITIONS;
    case 'filesystem':
      return FILESYSTEM_TOOL_DEFINITIONS;
    // V3 categories (AK 47)
    case 'deployment_docker':
      return DEPLOYMENT_DOCKER_TOOL_DEFINITIONS;
    case 'communication':
      return COMMUNICATION_TOOL_DEFINITIONS;
    case 'data_processing':
      return DATA_PROCESSING_TOOL_DEFINITIONS;
    case 'testing_qa':
      return TESTING_QA_TOOL_DEFINITIONS;
    case 'cloud_infra':
      return CLOUD_INFRA_TOOL_DEFINITIONS;
    case 'workflow_automation':
      return WORKFLOW_AUTOMATION_TOOL_DEFINITIONS;
    case 'collaboration':
      return COLLABORATION_TOOL_DEFINITIONS;
    // V4 categories
    case 'workflow_orchestrator':
      return WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS;
    case 'knowledge_graph':
      return KNOWLEDGE_GRAPH_TOOL_DEFINITIONS;
    case 'business_growth':
      return BUSINESS_GROWTH_TOOL_DEFINITIONS;
    case 'team_collaboration':
      return TEAM_COLLABORATION_TOOL_DEFINITIONS;
    case 'advanced_ai':
      return ADVANCED_AI_TOOL_DEFINITIONS;
    case 'data_science':
      return DATA_SCIENCE_TOOL_DEFINITIONS;
    case 'geo_location':
      return GEO_LOCATION_TOOL_DEFINITIONS;
    case 'cloud_control':
      return CLOUD_CONTROL_TOOL_DEFINITIONS;
    case 'advanced_security':
      return ADVANCED_SECURITY_TOOL_DEFINITIONS;
    default:
      return [];
  }
}

/**
 * Get all tool categories
 */
export function getCategories() {
  return [
    { name: 'core', count: TOOL_DEFINITIONS.length, description: 'File system, git, terminal, HTTP' },
    { name: 'canvas', count: CANVAS_TOOL_DEFINITIONS.length, description: 'Workspace and project management' },
    { name: 'image', count: IMAGE_TOOL_DEFINITIONS.length, description: 'Image generation and editing' },
    { name: 'video', count: VIDEO_TOOL_DEFINITIONS.length, description: 'Video generation' },
    { name: 'archive', count: ARCHIVE_TOOL_DEFINITIONS.length, description: 'Export, backup, restore' },
    { name: 'backend', count: BACKEND_TOOL_DEFINITIONS.length, description: 'API and database generation' },
    { name: 'code', count: CODE_TOOL_DEFINITIONS.length, description: 'Code execution and analysis' },
    { name: 'editor', count: EDITOR_TOOL_DEFINITIONS.length, description: 'Editor operations' },
    { name: 'agent_control', count: AGENT_CONTROL_TOOL_DEFINITIONS.length, description: 'Agent mode and state' },
    { name: 'agent_memory', count: AGENT_MEMORY_TOOL_DEFINITIONS.length, description: 'Persistent context' },
    { name: 'agent_safety', count: AGENT_SAFETY_TOOL_DEFINITIONS.length, description: 'Permissions and approval' },
    { name: 'agent_ui', count: AGENT_UI_TOOL_DEFINITIONS.length, description: 'User interaction' },
    { name: 'core_utility', count: CORE_UTILITY_TOOL_DEFINITIONS.length, description: 'JSON, date/time, text transform' },
    { name: 'document_parsing', count: DOCUMENT_PARSING_TOOL_DEFINITIONS.length, description: 'PDF, CSV, XML, YAML, DOCX, XLSX, HTML parsing' },
    { name: 'dev', count: DEV_TOOL_DEFINITIONS.length, description: 'Format, lint, compile, bundle, test' },
    { name: 'web_frontend', count: WEB_FRONTEND_TOOL_DEFINITIONS.length, description: 'HTML/CSS gen, a11y, SEO, performance' },
    { name: 'database', count: DATABASE_TOOL_DEFINITIONS.length, description: 'Query, schema, backup, migrate, analyze' },
    { name: 'api', count: API_TOOL_DEFINITIONS.length, description: 'HTTP, mock, docs, test, transform, webhook' },
    { name: 'ai_ml', count: AI_ML_TOOL_DEFINITIONS.length, description: 'LLM chat, embed, ML train/predict' },
    { name: 'security', count: SECURITY_TOOL_DEFINITIONS.length, description: 'Crypto, scanning, auth generation' },
    { name: 'content_markdown', count: CONTENT_MARKDOWN_TOOL_DEFINITIONS.length, description: 'Markdown convert, validate, generate' },
    { name: 'analytics', count: ANALYTICS_TOOL_DEFINITIONS.length, description: 'Track events, reports, monitoring' },
    { name: 'filesystem', count: FILESYSTEM_TOOL_DEFINITIONS.length, description: 'File search, compression' },
    // V3 categories (AK 47)
    { name: 'deployment_docker', count: DEPLOYMENT_DOCKER_TOOL_DEFINITIONS.length, description: 'Docker, CI/CD, static deploy' },
    { name: 'communication', count: COMMUNICATION_TOOL_DEFINITIONS.length, description: 'Email, push, webhooks, SMS' },
    { name: 'data_processing', count: DATA_PROCESSING_TOOL_DEFINITIONS.length, description: 'ETL, validation, transform, diff' },
    { name: 'testing_qa', count: TESTING_QA_TOOL_DEFINITIONS.length, description: 'E2E, load, snapshot, mock, coverage' },
    { name: 'cloud_infra', count: CLOUD_INFRA_TOOL_DEFINITIONS.length, description: 'DNS, SSL, storage, secrets, scaling' },
    { name: 'workflow_automation', count: WORKFLOW_AUTOMATION_TOOL_DEFINITIONS.length, description: 'Cron, queues, triggers, workflows' },
    { name: 'collaboration', count: COLLABORATION_TOOL_DEFINITIONS.length, description: 'Diff/merge, review, share, live' },
    // V4 categories
    { name: 'workflow_orchestrator', count: WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS.length, description: 'Pipeline DAG, execute, schedule, optimize' },
    { name: 'knowledge_graph', count: KNOWLEDGE_GRAPH_TOOL_DEFINITIONS.length, description: 'Entity graph, query, reason, merge' },
    { name: 'business_growth', count: BUSINESS_GROWTH_TOOL_DEFINITIONS.length, description: 'Funnel, pricing, A/B test, leads, campaigns' },
    { name: 'team_collaboration', count: TEAM_COLLABORATION_TOOL_DEFINITIONS.length, description: 'Invite, roles, comments, tasks, approvals' },
    { name: 'advanced_ai', count: ADVANCED_AI_TOOL_DEFINITIONS.length, description: 'LLM router, guardrail, eval, agents' },
    { name: 'data_science', count: DATA_SCIENCE_TOOL_DEFINITIONS.length, description: 'Profile, clean, visualize, features, models' },
    { name: 'geo_location', count: GEO_LOCATION_TOOL_DEFINITIONS.length, description: 'Geocode, route, distance, geofence' },
    { name: 'cloud_control', count: CLOUD_CONTROL_TOOL_DEFINITIONS.length, description: 'Deploy, scale, logs, secrets, cost' },
    { name: 'advanced_security', count: ADVANCED_SECURITY_TOOL_DEFINITIONS.length, description: 'Vuln scan, policy, threat model, incidents' },
  ];
}

/**
 * Get tools for a given chat mode.
 * 
 * Provider tool limits:
 *   - Groq / OpenAI: 128 max
 *   - xAI (Grok):     200 max
 *   - Anthropic:       ~200 (schema-strict)
 *   - Mistral:         ~128
 * 
 * Strategy: return the most relevant subset for the mode, capped at 128
 * so it works across ALL providers without rejection.
 */

// Cache mode tool sets to avoid re-computing on every request
const _modeToolCache = new Map();

export function getToolsForMode(chatMode = 'Chat') {
  // Return cached result if available
  if (_modeToolCache.has(chatMode)) return _modeToolCache.get(chatMode);

  const MAX_TOOLS = 128; // Strictest provider limit (Groq / OpenAI)

  let selectedTools;

  switch (chatMode) {
    case 'Chat': {
      // Chat mode: core conversational + utility tools
      // Core (55) + CoreUtility (6) + AgentMemory (1) + DocParsing + Code + API + Content + Database
      const chatCategories = [
        ...TOOL_DEFINITIONS,           // 55: file ops, git, terminal, web search, http, generate_image, etc.
        ...CORE_UTILITY_TOOL_DEFINITIONS, // 6: calculate, time, weather, fetch_url, execute_code, generate_video
        ...AGENT_MEMORY_TOOL_DEFINITIONS, // 1: agent_memory (save/recall user prefs)
        ...DOCUMENT_PARSING_TOOL_DEFINITIONS,
        ...CODE_TOOL_DEFINITIONS,
        ...API_TOOL_DEFINITIONS,
        ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
        ...DATABASE_TOOL_DEFINITIONS,
      ];
      // Deduplicate by name (keep last)
      const seen = new Map();
      for (const t of chatCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }

    case 'Web Search':
    case 'Deep Research': {
      // Research mode: core + utility + content + api + analytics
      const researchCategories = [
        ...TOOL_DEFINITIONS,
        ...CORE_UTILITY_TOOL_DEFINITIONS,
        ...AGENT_MEMORY_TOOL_DEFINITIONS,
        ...API_TOOL_DEFINITIONS,
        ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
        ...ANALYTICS_TOOL_DEFINITIONS,
        ...DOCUMENT_PARSING_TOOL_DEFINITIONS,
        ...DATA_PROCESSING_TOOL_DEFINITIONS,
      ];
      const seen = new Map();
      for (const t of researchCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }

    case 'Create Image': {
      // Image mode: core + image + canvas
      const imageCategories = [
        ...TOOL_DEFINITIONS,
        ...CORE_UTILITY_TOOL_DEFINITIONS,
        ...AGENT_MEMORY_TOOL_DEFINITIONS,
        ...IMAGE_TOOL_DEFINITIONS,
        ...CANVAS_TOOL_DEFINITIONS,
      ];
      const seen = new Map();
      for (const t of imageCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }

    case 'Generate Video': {
      // Video mode: video generation + core file/web tools
      const videoCategories = [
        ...VIDEO_TOOL_DEFINITIONS,
        ...CORE_UTILITY_TOOL_DEFINITIONS,
        ...TOOL_DEFINITIONS,
        ...AGENT_MEMORY_TOOL_DEFINITIONS,
        ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
      ];
      const seen = new Map();
      for (const t of videoCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }

    case 'Generate Voice': {
      // Voice mode: reading/content tools (voice gen handled directly in aiService)
      const voiceCategories = [
        ...TOOL_DEFINITIONS,
        ...CORE_UTILITY_TOOL_DEFINITIONS,
        ...AGENT_MEMORY_TOOL_DEFINITIONS,
        ...DOCUMENT_PARSING_TOOL_DEFINITIONS,
        ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
      ];
      const seen = new Map();
      for (const t of voiceCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }

    default: {
      // Agent / Thinking / unknown modes: broad set, capped at 128
      // Prioritize: core + utility + agent + code + backend + api + canvas + image + database + filesystem
      const agentCategories = [
        ...TOOL_DEFINITIONS,
        ...CORE_UTILITY_TOOL_DEFINITIONS,
        ...AGENT_MEMORY_TOOL_DEFINITIONS,
        ...AGENT_CONTROL_TOOL_DEFINITIONS,
        ...AGENT_SAFETY_TOOL_DEFINITIONS,
        ...AGENT_UI_TOOL_DEFINITIONS,
        ...CODE_TOOL_DEFINITIONS,
        ...BACKEND_TOOL_DEFINITIONS,
        ...API_TOOL_DEFINITIONS,
        ...CANVAS_TOOL_DEFINITIONS,
        ...IMAGE_TOOL_DEFINITIONS,
        ...DATABASE_TOOL_DEFINITIONS,
        ...FILESYSTEM_TOOL_DEFINITIONS,
        ...CONTENT_MARKDOWN_TOOL_DEFINITIONS,
        ...DOCUMENT_PARSING_TOOL_DEFINITIONS,
        ...SECURITY_TOOL_DEFINITIONS,
        ...DATA_PROCESSING_TOOL_DEFINITIONS,
      ];
      const seen = new Map();
      for (const t of agentCategories) seen.set(t.name, t);
      selectedTools = [...seen.values()].slice(0, MAX_TOOLS);
      break;
    }
  }

  _modeToolCache.set(chatMode, selectedTools);
  return selectedTools;
}

/**
 * Format tools for AI provider (Anthropic/OpenAI format)
 */
export function formatToolsForProvider(provider = 'anthropic') {
  if (provider === 'openai') {
    return ALL_TOOLS.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema || tool.parameters || { type: 'object', properties: {} }
      }
    }));
  }

  // Anthropic format (default)
  return ALL_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema || tool.parameters || { type: 'object', properties: {} }
  }));
}


// ============================================================================
// RE-EXPORT AGENT UTILITIES (for apps that need direct access)
// ============================================================================

export {
  // Agent modes and state
  AGENT_MODES,
  getAgentState,

  // Agent memory tools are accessed via executeAgentMemoryTool

  // Agent safety
  PERMISSION_LEVELS,
  classifyOperation,
  resolveApproval,

  // Agent UI
  resolveQuestion,
  getPendingQuestions,

  // Individual tool arrays (for apps that need specific categories)
  TOOL_DEFINITIONS,
  CANVAS_TOOL_DEFINITIONS,
  IMAGE_TOOL_DEFINITIONS,
  VIDEO_TOOL_DEFINITIONS,
  ARCHIVE_TOOL_DEFINITIONS,
  BACKEND_TOOL_DEFINITIONS,
  CODE_TOOL_DEFINITIONS,
  EDITOR_TOOL_DEFINITIONS,
  AGENT_CONTROL_TOOL_DEFINITIONS,
  AGENT_MEMORY_TOOL_DEFINITIONS,
  AGENT_SAFETY_TOOL_DEFINITIONS,
  AGENT_UI_TOOL_DEFINITIONS,

  // V2 tool modules
  CORE_UTILITY_TOOL_DEFINITIONS,
  DOCUMENT_PARSING_TOOL_DEFINITIONS,
  DEV_TOOL_DEFINITIONS,
  WEB_FRONTEND_TOOL_DEFINITIONS,
  DATABASE_TOOL_DEFINITIONS,
  API_TOOL_DEFINITIONS,
  AI_ML_TOOL_DEFINITIONS,
  SECURITY_TOOL_DEFINITIONS,
  CONTENT_MARKDOWN_TOOL_DEFINITIONS,
  ANALYTICS_TOOL_DEFINITIONS,
  FILESYSTEM_TOOL_DEFINITIONS,

  // V3 tool modules (AK 47)
  DEPLOYMENT_DOCKER_TOOL_DEFINITIONS,
  COMMUNICATION_TOOL_DEFINITIONS,
  DATA_PROCESSING_TOOL_DEFINITIONS,
  TESTING_QA_TOOL_DEFINITIONS,
  CLOUD_INFRA_TOOL_DEFINITIONS,
  WORKFLOW_AUTOMATION_TOOL_DEFINITIONS,
  COLLABORATION_TOOL_DEFINITIONS,

  // V4 tool modules
  WORKFLOW_ORCHESTRATOR_TOOL_DEFINITIONS,
  KNOWLEDGE_GRAPH_TOOL_DEFINITIONS,
  BUSINESS_GROWTH_TOOL_DEFINITIONS,
  TEAM_COLLABORATION_TOOL_DEFINITIONS,
  ADVANCED_AI_TOOL_DEFINITIONS,
  DATA_SCIENCE_TOOL_DEFINITIONS,
  GEO_LOCATION_TOOL_DEFINITIONS,
  CLOUD_CONTROL_TOOL_DEFINITIONS,
  ADVANCED_SECURITY_TOOL_DEFINITIONS,
};


// ============================================================================
// RE-EXPORT INDIVIDUAL EXECUTORS (for apps that need sideEffects/callbacks)
// ============================================================================

export { executeCanvasTool } from './canvasTools.js';
export { executeImageTool, isImageTool } from './imageTools.js';
export { executeVideoTool, isVideoTool } from './videoTools.js';
export { executeArchiveTool, isArchiveTool } from './archiveTools.js';
export { executeBackendTool, isBackendTool } from './backendTools.js';
export { executeCodeTool, isCodeTool } from './codeTools.js';
export { executeEditorTool, isEditorTool } from './editorTools.js';
export { executeAgentControlTool, isAgentControlTool } from './agentControlTools.js';
export { executeAgentMemoryTool, isAgentMemoryTool } from './agentMemoryTools.js';
export { executeAgentSafetyTool, isAgentSafetyTool } from './agentSafetyTools.js';
export { executeAgentUITool, isAgentUITool } from './agentUITools.js';

// V2 tool module executors
export { executeCoreUtilityTool, isCoreUtilityTool } from './coreUtilityTools.js';
export { executeDocumentParsingTool, isDocumentParsingTool } from './documentParsingTools.js';
export { executeDevTool, isDevTool } from './devTools.js';
export { executeWebFrontendTool, isWebFrontendTool } from './webFrontendTools.js';
export { executeDatabaseTool, isDatabaseTool } from './databaseTools.js';
export { executeApiTool, isApiTool } from './apiTools.js';
export { executeAiMlTool, isAiMlTool } from './aiMlTools.js';
export { executeSecurityTool, isSecurityTool } from './securityTools.js';
export { executeContentMarkdownTool, isContentMarkdownTool } from './contentMarkdownTools.js';
export { executeAnalyticsTool, isAnalyticsTool } from './analyticsTools.js';
export { executeFileSystemTool, isFileSystemTool } from './fileSystemTools.js';

// V3 tool module executors (AK 47)
export { executeDeploymentDockerTool, isDeploymentDockerTool } from './deploymentDockerTools.js';
export { executeCommunicationTool, isCommunicationTool } from './communicationTools.js';
export { executeDataProcessingTool, isDataProcessingTool } from './dataProcessingTools.js';
export { executeTestingQATool, isTestingQATool } from './testingQATools.js';
export { executeCloudInfraTool, isCloudInfraTool } from './cloudInfraTools.js';
export { executeWorkflowAutomationTool, isWorkflowAutomationTool } from './workflowAutomationTools.js';
export { executeCollaborationTool, isCollaborationTool } from './collaborationTools.js';

// V4 tool module executors
export { executeWorkflowOrchestratorTool, isWorkflowOrchestratorTool } from './workflowOrchestratorTools.js';
export { executeKnowledgeGraphTool, isKnowledgeGraphTool } from './knowledgeGraphTools.js';
export { executeBusinessGrowthTool, isBusinessGrowthTool } from './businessGrowthTools.js';
export { executeTeamCollaborationTool, isTeamCollaborationTool } from './teamCollaborationTools.js';
export { executeAdvancedAITool, isAdvancedAITool } from './advancedAITools.js';
export { executeDataScienceTool, isDataScienceTool } from './dataScienceTools.js';
export { executeGeoLocationTool, isGeoLocationTool } from './geoLocationTools.js';
export { executeCloudControlTool, isCloudControlTool } from './cloudControlTools.js';
export { executeAdvancedSecurityTool, isAdvancedSecurityTool } from './advancedSecurityTools.js';


// ============================================================================
// STATS
// ============================================================================

log.info(`[ToolsHQ] Loaded ${ALL_TOOLS.length} unique tools from ${getCategories().length} categories (deduped from ${_rawTools.length} raw)`);
