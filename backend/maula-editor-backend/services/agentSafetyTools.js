/**
 * Agent Safety Tools - Permissions & Approval System
 * Critical for preventing destructive actions without user consent
 */

import { PersistentMap } from '../lib/persistentMap.js';

// Pending approvals (keyed by approval ID) — durable across restarts
const pendingApprovals = new PersistentMap('agentSafety.pendingApprovals');

// Permission cache per user — in-memory only (re-computable, expires with process)
const permissionCache = new Map(); // Map<userId, Map<permission, boolean>>

// Default permission levels
const PERMISSION_LEVELS = {
  // Safe operations - auto-approved
  safe: ['read_file', 'list_files', 'search', 'get_selection', 'get_context'],
  
  // Moderate risk - may need approval based on settings
  moderate: ['write_file', 'edit_file', 'create_file', 'insert_at_cursor', 'replace_selection'],
  
  // High risk - always needs approval
  dangerous: ['delete_file', 'run_command', 'git_push', 'git_reset_hard', 'deploy', 'clear_all'],
  
  // Critical - needs explicit confirmation
  critical: ['delete_project', 'reset_database', 'format_disk']
};

// User settings for auto-approval — durable across restarts
const userSettings = new PersistentMap('agentSafety.userSettings');

// ============================================================================
// ANTHROPIC TOOL DEFINITIONS
// ============================================================================
const AGENT_SAFETY_TOOL_DEFINITIONS = [
  {
    name: 'agent_safety',
    description: 'Request and manage user approvals for potentially destructive actions. Actions: request_approval (ask user permission), check_permission (verify if action is allowed), get_pending (list pending approvals), set_preference (set auto-approve preferences)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['request_approval', 'check_permission', 'get_pending', 'set_preference', 'cancel_approval'],
          description: 'Safety operation to perform'
        },
        operation: { type: 'string', description: 'The operation needing approval (e.g., delete_file, run_command)' },
        details: { type: 'string', description: 'Human-readable description of what will happen' },
        approvalId: { type: 'string', description: 'Approval ID (for cancel_approval)' },
        preference: { 
          type: 'string', 
          enum: ['auto_approve_safe', 'auto_approve_moderate', 'require_all_approvals'],
          description: 'Preference to set (for set_preference)'
        },
        context: { 
          type: 'object', 
          description: 'Additional context about the operation',
          properties: {
            filePath: { type: 'string' },
            command: { type: 'string' },
            impact: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          }
        }
      },
      required: ['action']
    }
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateApprovalId() {
  return `approval_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function classifyOperation(operation) {
  if (PERMISSION_LEVELS.critical.includes(operation)) return 'critical';
  if (PERMISSION_LEVELS.dangerous.includes(operation)) return 'dangerous';
  if (PERMISSION_LEVELS.moderate.includes(operation)) return 'moderate';
  if (PERMISSION_LEVELS.safe.includes(operation)) return 'safe';
  return 'moderate'; // Default to moderate for unknown operations
}

function getUserSettings(userId) {
  if (!userSettings.has(userId)) {
    userSettings.set(userId, {
      autoApproveModerate: false,
      autoApproveDangerous: false
    });
  }
  return userSettings.get(userId);
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

/**
 * Execute an agent safety tool
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @param {object} context - Execution context with userId and sseWrite
 * @returns {object} - Tool execution result
 */
async function executeAgentSafetyTool(toolName, toolInput, context) {
  const { action, operation, details, approvalId, preference, context: opContext } = toolInput;
  const userId = context.userId || 'anonymous';
  const sseWrite = context.sseWrite;
  
  switch (action) {
    case 'request_approval': {
      if (!operation) return { success: false, error: 'Operation is required for request_approval' };
      
      const level = classifyOperation(operation);
      const settings = getUserSettings(userId);
      
      // Auto-approve safe operations
      if (level === 'safe') {
        return {
          success: true,
          approved: true,
          autoApproved: true,
          operation,
          level,
          message: `Operation "${operation}" is safe - auto-approved`
        };
      }
      
      // Check user preferences for auto-approval
      if (level === 'moderate' && settings.autoApproveModerate) {
        return {
          success: true,
          approved: true,
          autoApproved: true,
          operation,
          level,
          message: `Operation "${operation}" auto-approved per user preference`
        };
      }
      
      // Create pending approval
      const id = generateApprovalId();
      const approval = {
        id,
        operation,
        details: details || `Requesting permission to: ${operation}`,
        level,
        context: opContext || {},
        timestamp: Date.now(),
        userId,
        resolved: false,
        approved: null
      };
      
      pendingApprovals.set(id, approval);
      
      // Send approval request to frontend
      if (sseWrite) {
        sseWrite({
          type: 'agent_approval_request',
          approvalId: id,
          operation,
          details: approval.details,
          level,
          context: opContext
        });
      }
      
      return {
        success: true,
        pending: true,
        approvalId: id,
        operation,
        level,
        message: `Approval requested for "${operation}". Waiting for user response.`,
        requiresUserAction: true
      };
    }
    
    case 'check_permission': {
      if (!operation) return { success: false, error: 'Operation is required for check_permission' };
      
      const level = classifyOperation(operation);
      const settings = getUserSettings(userId);
      
      // Safe operations are always allowed
      if (level === 'safe') {
        return {
          success: true,
          allowed: true,
          level,
          operation,
          reason: 'Operation is classified as safe'
        };
      }
      
      // Check auto-approve settings
      if (level === 'moderate' && settings.autoApproveModerate) {
        return {
          success: true,
          allowed: true,
          level,
          operation,
          reason: 'User has enabled auto-approve for moderate operations'
        };
      }
      
      if (level === 'dangerous' && settings.autoApproveDangerous) {
        return {
          success: true,
          allowed: true,
          level,
          operation,
          reason: 'User has enabled auto-approve for dangerous operations'
        };
      }
      
      // Needs approval
      return {
        success: true,
        allowed: false,
        requiresApproval: true,
        level,
        operation,
        reason: `Operation "${operation}" (${level}) requires user approval`
      };
    }
    
    case 'get_pending': {
      const pending = [];
      for (const [id, approval] of pendingApprovals.entries()) {
        if (approval.userId === userId && !approval.resolved) {
          pending.push({
            id,
            operation: approval.operation,
            details: approval.details,
            level: approval.level,
            timestamp: approval.timestamp,
            age: Math.round((Date.now() - approval.timestamp) / 1000) + 's'
          });
        }
      }
      
      return {
        success: true,
        pending,
        count: pending.length,
        message: `${pending.length} approval(s) pending`
      };
    }
    
    case 'set_preference': {
      if (!preference) return { success: false, error: 'Preference is required' };
      
      const settings = getUserSettings(userId);
      
      switch (preference) {
        case 'auto_approve_safe':
          settings.autoApproveModerate = false;
          settings.autoApproveDangerous = false;
          break;
        case 'auto_approve_moderate':
          settings.autoApproveModerate = true;
          settings.autoApproveDangerous = false;
          break;
        case 'require_all_approvals':
          settings.autoApproveModerate = false;
          settings.autoApproveDangerous = false;
          break;
      }
      
      userSettings.set(userId, settings);
      
      return {
        success: true,
        preference,
        settings: { ...settings },
        message: `Safety preference set to: ${preference}`
      };
    }
    
    case 'cancel_approval': {
      if (!approvalId) return { success: false, error: 'Approval ID is required' };
      
      const approval = pendingApprovals.get(approvalId);
      if (!approval) {
        return { success: false, error: `Approval ${approvalId} not found` };
      }
      
      approval.resolved = true;
      approval.approved = false;
      approval.cancelledAt = Date.now();
      
      return {
        success: true,
        approvalId,
        message: `Approval ${approvalId} cancelled`
      };
    }
    
    default:
      return { success: false, error: `Unknown safety action: ${action}` };
  }
}

/**
 * Resolve a pending approval (called from frontend)
 */
function resolveApproval(approvalId, approved, userId) {
  const approval = pendingApprovals.get(approvalId);
  if (!approval) return { success: false, error: 'Approval not found' };
  if (approval.userId !== userId) return { success: false, error: 'Unauthorized' };
  if (approval.resolved) return { success: false, error: 'Already resolved' };
  
  approval.resolved = true;
  approval.approved = approved;
  approval.resolvedAt = Date.now();
  
  return {
    success: true,
    approvalId,
    approved,
    operation: approval.operation
  };
}

/**
 * Check if tool is an agent safety tool
 */
function isAgentSafetyTool(toolName) {
  return toolName === 'agent_safety';
}

export {
  AGENT_SAFETY_TOOL_DEFINITIONS,
  executeAgentSafetyTool,
  isAgentSafetyTool,
  resolveApproval,
  classifyOperation,
  PERMISSION_LEVELS
};
