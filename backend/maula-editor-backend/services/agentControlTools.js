import { createLogger } from '../lib/logger.js';
const log = createLogger('agentControlTools');
/**
 * Agent Control Tools - Multi-Mode Agent Management
 * Provides mode switching, state management, and task control
 * Persisted to PostgreSQL via Prisma
 */

import prisma from '../lib/prisma.js';
import { PersistentMap } from '../lib/persistentMap.js';

// Active tasks cache — durable across restarts (resumable streaming tasks)
const activeTasksCache = new PersistentMap('agentControl.activeTasksCache');

// Available agent modes
const AGENT_MODES = {
  chat: {
    name: 'Chat',
    description: 'Conversational mode - answers questions, explains concepts',
    capabilities: ['chat', 'explain', 'answer'],
    autoApprove: true
  },
  dev: {
    name: 'Development',
    description: 'Development mode - writes code, creates files, runs commands',
    capabilities: ['read', 'write', 'create', 'edit', 'run'],
    autoApprove: false
  },
  review: {
    name: 'Code Review',
    description: 'Review mode - analyzes code, suggests improvements, finds bugs',
    capabilities: ['read', 'analyze', 'suggest'],
    autoApprove: true
  },
  debug: {
    name: 'Debug',
    description: 'Debug mode - investigates issues, traces errors, fixes bugs',
    capabilities: ['read', 'analyze', 'debug', 'edit'],
    autoApprove: false
  },
  refactor: {
    name: 'Refactor',
    description: 'Refactor mode - improves code structure, optimizes, cleans up',
    capabilities: ['read', 'analyze', 'edit', 'refactor'],
    autoApprove: false
  }
};

// ============================================================================
// HELPER FUNCTIONS (Database-backed)
// ============================================================================

function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get or create agent state from database
 */
async function getAgentState(userId) {
  try {
    let state = await prisma.agentState.findUnique({
      where: { userId },
      include: {
        tasks: {
          where: { isCurrent: true },
          take: 1
        }
      }
    });

    if (!state) {
      state = await prisma.agentState.create({
        data: {
          userId,
          mode: 'chat',
          status: 'idle',
          verbosity: 'normal',
          autoConfirm: false,
          showProgress: true,
          startedAt: new Date(),
          lastActivity: new Date()
        },
        include: {
          tasks: {
            where: { isCurrent: true },
            take: 1
          }
        }
      });
    }

    return state;
  } catch (error) {
    log.error('[AgentControl] DB error getting state:', error.message);
    // Fallback to in-memory default
    return {
      id: 'fallback',
      userId,
      mode: 'chat',
      status: 'idle',
      previousStatus: null,
      pausedAt: null,
      verbosity: 'normal',
      autoConfirm: false,
      showProgress: true,
      projectPath: null,
      activeFile: null,
      workingDirectory: null,
      startedAt: new Date(),
      lastActivity: new Date(),
      tasks: []
    };
  }
}

/**
 * Update last activity timestamp
 */
async function updateActivity(userId) {
  try {
    await prisma.agentState.updateMany({
      where: { userId },
      data: { lastActivity: new Date() }
    });
  } catch (error) {
    // Silently fail - non-critical
  }
}

// ============================================================================
// ANTHROPIC TOOL DEFINITIONS
// ============================================================================
const AGENT_CONTROL_TOOL_DEFINITIONS = [
  {
    name: 'agent_control',
    description: 'Control agent mode, state, and tasks. Actions: set_mode (change mode), get_state (current state), cancel_task (stop current task), pause (pause agent), resume (resume agent), set_preference (update preferences), get_modes (list available modes)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set_mode', 'get_state', 'cancel_task', 'pause', 'resume', 'set_preference', 'get_modes', 'start_task', 'complete_task'],
          description: 'Control operation to perform'
        },
        mode: {
          type: 'string',
          enum: ['chat', 'dev', 'review', 'debug', 'refactor'],
          description: 'Agent mode to set (for set_mode)'
        },
        taskId: { type: 'string', description: 'Task ID (for cancel_task)' },
        taskName: { type: 'string', description: 'Task name (for start_task)' },
        taskDescription: { type: 'string', description: 'Task description (for start_task)' },
        preference: {
          type: 'object',
          description: 'Preference to update (for set_preference)',
          properties: {
            verbosity: { type: 'string', enum: ['quiet', 'normal', 'verbose'] },
            autoConfirm: { type: 'boolean' },
            showProgress: { type: 'boolean' }
          }
        },
        reason: { type: 'string', description: 'Reason for mode change or task cancellation' }
      },
      required: ['action']
    }
  },
  {
    name: 'agent_plan',
    description: 'Create, track, and manage multi-step task plans. Actions: create_plan (new plan from goal), get_plan (retrieve plan), update_step (mark step status), add_step (append step), remove_step (delete step), list_plans (all active plans), complete_plan (mark done), cancel_plan (abort plan)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create_plan', 'get_plan', 'update_step', 'add_step', 'remove_step', 'list_plans', 'complete_plan', 'cancel_plan'],
          description: 'Plan operation to perform'
        },
        planId: { type: 'string', description: 'Plan identifier (auto-generated for create_plan)' },
        goal: { type: 'string', description: 'High-level goal for the plan (for create_plan)' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              dependencies: { type: 'array', items: { type: 'number' }, description: 'Step indices this depends on' }
            }
          },
          description: 'Steps for the plan (for create_plan)'
        },
        stepIndex: { type: 'number', description: 'Step index to update/remove (0-based)' },
        stepStatus: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'skipped', 'failed'], description: 'New status for step (for update_step)' },
        stepTitle: { type: 'string', description: 'Step title (for add_step)' },
        stepDescription: { type: 'string', description: 'Step description (for add_step)' },
        notes: { type: 'string', description: 'Notes or reason for action' }
      },
      required: ['action']
    }
  },
  {
    name: 'agent_context',
    description: 'Manage conversation context, memory, and token tracking. Actions: get_summary (summarize current context), compress (compress context to save tokens), inject (add context/facts), get_token_usage (current token counts), clear_context (reset context), get_facts (retrieve stored facts), set_goal (set conversation goal), get_goal (retrieve current goal)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_summary', 'compress', 'inject', 'get_token_usage', 'clear_context', 'get_facts', 'set_goal', 'get_goal'],
          description: 'Context operation to perform'
        },
        text: { type: 'string', description: 'Text to inject or summarize' },
        key: { type: 'string', description: 'Key for storing/retrieving facts' },
        value: { type: 'string', description: 'Value to store (for inject)' },
        goal: { type: 'string', description: 'Conversation goal to set (for set_goal)' },
        maxTokens: { type: 'number', description: 'Max tokens for compression target' },
        category: { type: 'string', enum: ['fact', 'preference', 'instruction', 'reference'], description: 'Category of injected context' }
      },
      required: ['action']
    }
  }
];

// ============================================================================
// TOOL EXECUTOR (Database-backed)
// ============================================================================

/**
 * Execute an agent control tool
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @param {object} context - Execution context with userId and sseWrite
 * @returns {object} - Tool execution result
 */
async function executeAgentControlTool(toolName, toolInput, context) {
  const { action, mode, taskId, taskName, taskDescription, preference, reason } = toolInput;
  const userId = context.userId || 'anonymous';
  const sseWrite = context.sseWrite;

  await updateActivity(userId);

  switch (action) {
    case 'set_mode': {
      if (!mode) return { success: false, error: 'Mode is required for set_mode' };
      if (!AGENT_MODES[mode]) return { success: false, error: `Unknown mode: ${mode}` };

      const state = await getAgentState(userId);
      const previousMode = state.mode;

      await prisma.agentState.update({
        where: { id: state.id },
        data: { mode, lastActivity: new Date() }
      });

      // Notify frontend of mode change
      if (sseWrite) {
        sseWrite({
          type: 'agent_mode_change',
          previousMode,
          newMode: mode,
          modeInfo: AGENT_MODES[mode],
          reason: reason || `Switched to ${mode} mode`
        });
      }

      return {
        success: true,
        previousMode,
        newMode: mode,
        modeInfo: AGENT_MODES[mode],
        message: `Agent mode changed from "${previousMode}" to "${mode}"`
      };
    }

    case 'get_state': {
      const state = await getAgentState(userId);
      const modeInfo = AGENT_MODES[state.mode];
      const currentTask = state.tasks && state.tasks.length > 0 ? state.tasks[0] : null;

      return {
        success: true,
        state: {
          mode: state.mode,
          modeInfo,
          status: state.status,
          currentTask: currentTask ? {
            id: currentTask.taskId,
            name: currentTask.name,
            description: currentTask.description,
            status: currentTask.status,
            startedAt: currentTask.startedAt
          } : null,
          lastActivity: state.lastActivity,
          uptime: Date.now() - new Date(state.startedAt).getTime(),
          preferences: {
            verbosity: state.verbosity,
            autoConfirm: state.autoConfirm,
            showProgress: state.showProgress
          },
          context: {
            projectPath: state.projectPath,
            activeFile: state.activeFile,
            workingDirectory: state.workingDirectory
          }
        },
        message: `Agent in "${state.mode}" mode, status: ${state.status}`
      };
    }

    case 'cancel_task': {
      const state = await getAgentState(userId);
      const currentTask = state.tasks && state.tasks.length > 0 ? state.tasks[0] : null;

      if (!currentTask) {
        return {
          success: true,
          cancelled: false,
          message: 'No active task to cancel'
        };
      }

      // Update task in DB
      await prisma.agentTask.update({
        where: { id: currentTask.id },
        data: {
          status: 'cancelled',
          isCurrent: false,
          cancelledAt: new Date(),
          cancelReason: reason || 'User requested cancellation'
        }
      });

      // Update agent state
      await prisma.agentState.update({
        where: { id: state.id },
        data: { status: 'idle', lastActivity: new Date() }
      });

      activeTasksCache.delete(currentTask.taskId);

      // Notify frontend
      if (sseWrite) {
        sseWrite({
          type: 'agent_task_cancelled',
          taskId: currentTask.taskId,
          taskName: currentTask.name,
          reason: reason || 'User requested cancellation'
        });
      }

      return {
        success: true,
        cancelled: true,
        taskId: currentTask.taskId,
        taskName: currentTask.name,
        message: `Task "${currentTask.name}" cancelled`
      };
    }

    case 'pause': {
      const state = await getAgentState(userId);

      if (state.status === 'paused') {
        return { success: true, message: 'Agent already paused' };
      }

      await prisma.agentState.update({
        where: { id: state.id },
        data: {
          previousStatus: state.status,
          status: 'paused',
          pausedAt: new Date(),
          lastActivity: new Date()
        }
      });

      if (sseWrite) {
        sseWrite({
          type: 'agent_status_change',
          status: 'paused',
          reason: reason || 'Agent paused'
        });
      }

      return {
        success: true,
        status: 'paused',
        message: 'Agent paused'
      };
    }

    case 'resume': {
      const state = await getAgentState(userId);

      if (state.status !== 'paused') {
        return { success: true, message: `Agent not paused (current: ${state.status})` };
      }

      const newStatus = state.previousStatus || 'idle';

      await prisma.agentState.update({
        where: { id: state.id },
        data: {
          status: newStatus,
          previousStatus: null,
          pausedAt: null,
          lastActivity: new Date()
        }
      });

      if (sseWrite) {
        sseWrite({
          type: 'agent_status_change',
          status: newStatus,
          reason: 'Agent resumed'
        });
      }

      return {
        success: true,
        status: newStatus,
        message: `Agent resumed, status: ${newStatus}`
      };
    }

    case 'set_preference': {
      if (!preference) return { success: false, error: 'Preference object is required' };

      const state = await getAgentState(userId);
      const updateData = { lastActivity: new Date() };

      if (preference.verbosity !== undefined) updateData.verbosity = preference.verbosity;
      if (preference.autoConfirm !== undefined) updateData.autoConfirm = preference.autoConfirm;
      if (preference.showProgress !== undefined) updateData.showProgress = preference.showProgress;

      const updated = await prisma.agentState.update({
        where: { id: state.id },
        data: updateData
      });

      return {
        success: true,
        preferences: {
          verbosity: updated.verbosity,
          autoConfirm: updated.autoConfirm,
          showProgress: updated.showProgress
        },
        message: 'Preferences updated'
      };
    }

    case 'get_modes': {
      const state = await getAgentState(userId);
      const modes = Object.entries(AGENT_MODES).map(([key, info]) => ({
        key,
        ...info,
        isActive: key === state.mode
      }));

      return {
        success: true,
        modes,
        currentMode: state.mode,
        message: `${modes.length} modes available, current: ${state.mode}`
      };
    }

    case 'start_task': {
      if (!taskName) return { success: false, error: 'Task name is required' };

      const state = await getAgentState(userId);
      const newTaskId = generateTaskId();

      // If there's a current task, mark it as interrupted
      const currentTask = state.tasks && state.tasks.length > 0 ? state.tasks[0] : null;
      if (currentTask) {
        await prisma.agentTask.update({
          where: { id: currentTask.id },
          data: {
            status: 'interrupted',
            isCurrent: false,
            completedAt: new Date(),
            duration: Date.now() - new Date(currentTask.startedAt).getTime()
          }
        });
        activeTasksCache.delete(currentTask.taskId);
      }

      // Create new task in DB
      const dbTask = await prisma.agentTask.create({
        data: {
          taskId: newTaskId,
          agentStateId: state.id,
          name: taskName,
          description: taskDescription || null,
          mode: state.mode,
          status: 'running',
          isCurrent: true,
          startedAt: new Date()
        }
      });

      // Update agent state
      await prisma.agentState.update({
        where: { id: state.id },
        data: { status: 'working', lastActivity: new Date() }
      });

      activeTasksCache.set(newTaskId, dbTask);

      if (sseWrite) {
        sseWrite({
          type: 'agent_task_started',
          taskId: newTaskId,
          taskName,
          taskDescription: taskDescription || '',
          mode: state.mode
        });
      }

      return {
        success: true,
        taskId: newTaskId,
        taskName,
        message: `Started task: "${taskName}"`
      };
    }

    case 'complete_task': {
      const state = await getAgentState(userId);
      const currentTask = state.tasks && state.tasks.length > 0 ? state.tasks[0] : null;

      if (!currentTask) {
        return { success: false, error: 'No active task to complete' };
      }

      const duration = Date.now() - new Date(currentTask.startedAt).getTime();

      // Update task in DB
      await prisma.agentTask.update({
        where: { id: currentTask.id },
        data: {
          status: 'completed',
          isCurrent: false,
          completedAt: new Date(),
          duration
        }
      });

      // Update agent state
      await prisma.agentState.update({
        where: { id: state.id },
        data: { status: 'idle', lastActivity: new Date() }
      });

      activeTasksCache.delete(currentTask.taskId);

      if (sseWrite) {
        sseWrite({
          type: 'agent_task_completed',
          taskId: currentTask.taskId,
          taskName: currentTask.name,
          duration
        });
      }

      return {
        success: true,
        taskId: currentTask.taskId,
        taskName: currentTask.name,
        duration,
        message: `Completed task: "${currentTask.name}"`
      };
    }

    default:
      return { success: false, error: `Unknown control action: ${action}` };
  }
}

/**
 * Check if tool is an agent control tool
 */
function isAgentControlTool(toolName) {
  return ['agent_control', 'agent_plan', 'agent_context'].includes(toolName);
}

// ============================================================================
// PLAN MANAGEMENT (In-memory + DB-backed)
// ============================================================================
const activePlans = new PersistentMap('agentControl.activePlans'); // Map<planId, PlanInfo>

function generatePlanId() {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function executeAgentPlan(toolInput, context) {
  const { action, planId, goal, steps, stepIndex, stepStatus, stepTitle, stepDescription, notes } = toolInput;
  const userId = context.userId || 'anonymous';

  switch (action) {
    case 'create_plan': {
      if (!goal) return { success: false, error: 'goal is required for create_plan' };
      const id = generatePlanId();
      const planSteps = (steps || []).map((s, i) => ({
        index: i,
        title: s.title || `Step ${i + 1}`,
        description: s.description || '',
        status: 'not_started',
        dependencies: s.dependencies || [],
        startedAt: null,
        completedAt: null
      }));
      const plan = {
        planId: id, userId, goal, steps: planSteps,
        status: 'active', createdAt: new Date(), updatedAt: new Date(), notes: notes || ''
      };
      activePlans.set(id, plan);
      return { success: true, planId: id, goal, totalSteps: planSteps.length, steps: planSteps };
    }

    case 'get_plan': {
      if (!planId) return { success: false, error: 'planId required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      const completed = plan.steps.filter(s => s.status === 'completed').length;
      const progress = plan.steps.length > 0 ? Math.round((completed / plan.steps.length) * 100) : 0;
      return { success: true, ...plan, progress: `${progress}%`, completedSteps: completed };
    }

    case 'update_step': {
      if (!planId) return { success: false, error: 'planId required' };
      if (stepIndex === undefined) return { success: false, error: 'stepIndex required' };
      if (!stepStatus) return { success: false, error: 'stepStatus required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      if (stepIndex < 0 || stepIndex >= plan.steps.length) return { success: false, error: `Step index out of range: ${stepIndex}` };
      plan.steps[stepIndex].status = stepStatus;
      if (stepStatus === 'in_progress') plan.steps[stepIndex].startedAt = new Date();
      if (stepStatus === 'completed') plan.steps[stepIndex].completedAt = new Date();
      plan.updatedAt = new Date();
      return { success: true, planId, stepIndex, newStatus: stepStatus, step: plan.steps[stepIndex] };
    }

    case 'add_step': {
      if (!planId) return { success: false, error: 'planId required' };
      if (!stepTitle) return { success: false, error: 'stepTitle required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      const newStep = {
        index: plan.steps.length,
        title: stepTitle,
        description: stepDescription || '',
        status: 'not_started',
        dependencies: [],
        startedAt: null,
        completedAt: null
      };
      plan.steps.push(newStep);
      plan.updatedAt = new Date();
      return { success: true, planId, step: newStep, totalSteps: plan.steps.length };
    }

    case 'remove_step': {
      if (!planId) return { success: false, error: 'planId required' };
      if (stepIndex === undefined) return { success: false, error: 'stepIndex required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      if (stepIndex < 0 || stepIndex >= plan.steps.length) return { success: false, error: `Step index out of range` };
      const removed = plan.steps.splice(stepIndex, 1)[0];
      plan.steps.forEach((s, i) => { s.index = i; });
      plan.updatedAt = new Date();
      return { success: true, planId, removedStep: removed, totalSteps: plan.steps.length };
    }

    case 'list_plans': {
      const userPlans = Array.from(activePlans.values()).filter(p => p.userId === userId);
      return {
        success: true,
        totalPlans: userPlans.length,
        plans: userPlans.map(p => ({
          planId: p.planId, goal: p.goal, status: p.status,
          totalSteps: p.steps.length,
          completed: p.steps.filter(s => s.status === 'completed').length,
          createdAt: p.createdAt
        }))
      };
    }

    case 'complete_plan': {
      if (!planId) return { success: false, error: 'planId required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      plan.status = 'completed';
      plan.updatedAt = new Date();
      const completed = plan.steps.filter(s => s.status === 'completed').length;
      return { success: true, planId, goal: plan.goal, completedSteps: completed, totalSteps: plan.steps.length };
    }

    case 'cancel_plan': {
      if (!planId) return { success: false, error: 'planId required' };
      const plan = activePlans.get(planId);
      if (!plan) return { success: false, error: `Plan not found: ${planId}` };
      plan.status = 'cancelled';
      plan.updatedAt = new Date();
      return { success: true, planId, goal: plan.goal, message: `Plan cancelled${notes ? ': ' + notes : ''}` };
    }

    default:
      return { success: false, error: `Unknown plan action: ${action}` };
  }
}

// ============================================================================
// CONTEXT MANAGEMENT (In-memory per user session)
// ============================================================================
const contextStore = new PersistentMap('agentControl.contextStore'); // Map<userId, ContextInfo>

function getContextStore(userId) {
  if (!contextStore.has(userId)) {
    contextStore.set(userId, {
      facts: new Map(),
      goal: null,
      tokenUsage: { input: 0, output: 0, total: 0 },
      injectedContexts: [],
      createdAt: new Date()
    });
  }
  return contextStore.get(userId);
}

async function executeAgentContext(toolInput, context) {
  const { action, text, key, value, goal, maxTokens, category } = toolInput;
  const userId = context.userId || 'anonymous';
  const store = getContextStore(userId);

  switch (action) {
    case 'get_summary': {
      const factCount = store.facts.size;
      const injectedCount = store.injectedContexts.length;
      return {
        success: true,
        goal: store.goal,
        factCount,
        injectedContexts: injectedCount,
        tokenUsage: store.tokenUsage,
        facts: Object.fromEntries(store.facts),
        createdAt: store.createdAt
      };
    }

    case 'compress': {
      const target = maxTokens || 2000;
      // Compress by summarizing injected contexts
      const originalCount = store.injectedContexts.length;
      if (originalCount > 5) {
        // Keep only the most recent 5
        store.injectedContexts = store.injectedContexts.slice(-5);
      }
      return {
        success: true,
        action: 'compress',
        targetTokens: target,
        removedContexts: originalCount - store.injectedContexts.length,
        remainingContexts: store.injectedContexts.length,
        message: 'Context compressed to most recent entries'
      };
    }

    case 'inject': {
      if (!key && !text) return { success: false, error: 'key or text required for inject' };
      if (key && value) {
        store.facts.set(key, { value, category: category || 'fact', addedAt: new Date() });
        return { success: true, action: 'inject', type: 'fact', key, category: category || 'fact' };
      }
      if (text) {
        store.injectedContexts.push({
          text, category: category || 'reference',
          addedAt: new Date(), length: text.length
        });
        return {
          success: true, action: 'inject', type: 'context',
          category: category || 'reference', length: text.length,
          totalInjected: store.injectedContexts.length
        };
      }
      return { success: false, error: 'Provide key+value for facts or text for context injection' };
    }

    case 'get_token_usage': {
      return { success: true, ...store.tokenUsage, goal: store.goal };
    }

    case 'clear_context': {
      store.facts.clear();
      store.injectedContexts = [];
      store.goal = null;
      store.tokenUsage = { input: 0, output: 0, total: 0 };
      return { success: true, action: 'clear_context', message: 'All context cleared' };
    }

    case 'get_facts': {
      const facts = Object.fromEntries(store.facts);
      return { success: true, factCount: store.facts.size, facts };
    }

    case 'set_goal': {
      if (!goal) return { success: false, error: 'goal required for set_goal' };
      store.goal = goal;
      return { success: true, action: 'set_goal', goal };
    }

    case 'get_goal': {
      return { success: true, goal: store.goal || null, hasGoal: !!store.goal };
    }

    default:
      return { success: false, error: `Unknown context action: ${action}` };
  }
}

export {
  AGENT_CONTROL_TOOL_DEFINITIONS,
  executeAgentControlTool,
  executeAgentPlan,
  executeAgentContext,
  isAgentControlTool,
  AGENT_MODES,
  getAgentState
};
