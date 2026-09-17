import { createLogger } from '../lib/logger.js';
const log = createLogger('agentMemoryTools');
/**
 * Agent Memory Tools - Persistent Memory for Smarter Agents
 * Stores memories in PostgreSQL via Prisma — survives restarts, shared across cluster workers.
 */

import { prisma } from '../lib/prisma.js';

// ============================================================================
// ANTHROPIC TOOL DEFINITION
// ============================================================================
const AGENT_MEMORY_TOOL_DEFINITIONS = [
  {
    name: 'agent_memory',
    description: `Save or recall persistent memories about the user. You MUST use this on EVERY message to remember key context.

Actions:
- save: Store a memory about the user (provide content + category)
- list: List all saved memories for this user
- search: Search memories by keyword

Categories: preference, fact, project, interaction, general

RULES:
- You MUST call save at least once per message with something meaningful.
- Extract key facts: user name, preferences, tech stack, project details, goals, personality traits, repeated topics.
- Memories are tied to chat sessions. When user deletes a session, its memories are deleted too.
- There is NO delete action — memory cleanup happens automatically when sessions are deleted.
- Don't save trivial things like "user said hello". Save useful reference hints.`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['save', 'list', 'search'],
          description: 'Memory operation to perform'
        },
        content: {
          type: 'string',
          description: 'The memory content to save (for save action). Should be a concise, useful fact or reference hint about the user.'
        },
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'project', 'interaction', 'general'],
          description: 'Category for the memory (for save action)',
          default: 'general'
        },
        query: {
          type: 'string',
          description: 'Search query to find relevant memories (for search action)'
        }
      },
      required: ['action']
    }
  }
];

// ============================================================================
// TOOL EXECUTOR — writes directly to PostgreSQL via Prisma
// ============================================================================

/**
 * Execute an agent memory tool
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @param {object} context - Execution context (userId, sessionId, etc.)
 * @returns {object} - Tool execution result
 */
async function executeAgentMemoryTool(toolName, toolInput, context) {
  const { action, content, category, query, memoryId } = toolInput;
  const userId = context.userId || null;

  if (!userId) {
    return { success: false, error: 'User not authenticated — cannot access memory' };
  }

  // Check if memory is enabled for this user
  try {
    const toggle = await prisma.agentMemory.findFirst({
      where: { userId, category: '_system_toggle' },
    });
    if (toggle && !toggle.isEnabled) {
      return { success: true, message: 'Agent memory is disabled by user. Memories will not be saved.', memoryEnabled: false };
    }
  } catch (err) {
    log.error('[AgentMemory] Toggle check error:', err.message);
  }

  switch (action) {
    case 'save': {
      if (!content || !content.trim()) {
        return { success: false, error: 'Content is required for save' };
      }

      try {
        // Check for near-duplicate memories to avoid redundancy
        const existing = await prisma.agentMemory.findMany({
          where: {
            userId,
            category: { not: '_system_toggle' },
            isEnabled: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        const contentLower = content.trim().toLowerCase();
        const isDuplicate = existing.some(m =>
          m.content.toLowerCase().includes(contentLower) ||
          contentLower.includes(m.content.toLowerCase())
        );

        if (isDuplicate) {
          return {
            success: true,
            message: 'Similar memory already exists — skipped to avoid duplication.',
            skipped: true,
          };
        }

        const memory = await prisma.agentMemory.create({
          data: {
            userId,
            content: content.trim(),
            category: category || 'general',
            source: 'agent',
            sessionId: context.sessionId || null,
          },
        });

        log.info(`[AgentMemory] Saved: "${content.trim().substring(0, 60)}..." for user ${userId}`);

        return {
          success: true,
          message: `Memory saved: "${content.trim().substring(0, 80)}"`,
          memoryId: memory.id,
          category: memory.category,
        };
      } catch (err) {
        log.error('[AgentMemory] Save error:', err.message);
        return { success: false, error: 'Failed to save memory to database' };
      }
    }

    case 'list': {
      try {
        const memories = await prisma.agentMemory.findMany({
          where: {
            userId,
            category: { not: '_system_toggle' },
            isEnabled: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        return {
          success: true,
          memories: memories.map(m => ({
            id: m.id,
            content: m.content,
            category: m.category,
            source: m.source,
            createdAt: m.createdAt.toISOString(),
          })),
          count: memories.length,
          message: `${memories.length} saved memor${memories.length === 1 ? 'y' : 'ies'}`,
        };
      } catch (err) {
        log.error('[AgentMemory] List error:', err.message);
        return { success: false, error: 'Failed to list memories' };
      }
    }

    case 'search': {
      if (!query) return { success: false, error: 'Query is required for search' };

      try {
        const memories = await prisma.agentMemory.findMany({
          where: {
            userId,
            category: { not: '_system_toggle' },
            isEnabled: true,
            content: { contains: query, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        return {
          success: true,
          results: memories.map(m => ({
            id: m.id,
            content: m.content,
            category: m.category,
            source: m.source,
          })),
          count: memories.length,
          query,
          message: `Found ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'} matching "${query}"`,
        };
      } catch (err) {
        log.error('[AgentMemory] Search error:', err.message);
        return { success: false, error: 'Failed to search memories' };
      }
    }

    default:
      return { success: false, error: `Unknown memory action: ${action}. Only save, list, search are available. Memory deletion happens when user deletes the chat session.` };
  }
}

/**
 * Check if tool is an agent memory tool
 */
function isAgentMemoryTool(toolName) {
  return toolName === 'agent_memory';
}

export {
  AGENT_MEMORY_TOOL_DEFINITIONS,
  executeAgentMemoryTool,
  isAgentMemoryTool,
};
