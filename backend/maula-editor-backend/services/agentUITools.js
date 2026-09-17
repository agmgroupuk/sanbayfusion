/**
 * Agent UI Tools - User Interaction & Messaging
 * Provides smooth chat + editor UX with messages, warnings, questions
 */

import { PersistentMap } from '../lib/persistentMap.js';

// Pending questions (keyed by question ID) — durable across restarts
const pendingQuestions = new PersistentMap('agentUI.pendingQuestions');

// Message history (for debugging/logging) — durable across restarts
const messageHistory = new PersistentMap('agentUI.messageHistory');

// ============================================================================
// ANTHROPIC TOOL DEFINITIONS
// ============================================================================
const AGENT_UI_TOOL_DEFINITIONS = [
  {
    name: 'agent_ui',
    description: 'Interact with the user through UI messages and questions. Actions: show_message (info), show_warning (warn), show_error (error), ask_user (get input), show_progress (progress bar), show_toast (temporary notification)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['show_message', 'show_warning', 'show_error', 'ask_user', 'show_progress', 'show_toast', 'close_message'],
          description: 'UI operation to perform'
        },
        text: { type: 'string', description: 'Message text to display' },
        title: { type: 'string', description: 'Optional title for the message' },
        question: { type: 'string', description: 'Question for ask_user action' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Options for multiple-choice questions'
        },
        placeholder: { type: 'string', description: 'Placeholder text for text input' },
        inputType: {
          type: 'string',
          enum: ['text', 'choice', 'confirm', 'multiline'],
          description: 'Type of user input expected',
          default: 'text'
        },
        progress: { 
          type: 'number', 
          description: 'Progress percentage (0-100) for show_progress',
          minimum: 0,
          maximum: 100
        },
        duration: { 
          type: 'integer', 
          description: 'Auto-dismiss duration in milliseconds for show_toast',
          default: 3000
        },
        messageId: { type: 'string', description: 'Message ID (for close_message)' },
        style: {
          type: 'string',
          enum: ['info', 'success', 'warning', 'error', 'neutral'],
          description: 'Visual style of the message',
          default: 'info'
        }
      },
      required: ['action']
    }
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateQuestionId() {
  return `question_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function addToHistory(userId, type, text) {
  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }
  const history = messageHistory.get(userId);
  history.push({ type, text, timestamp: Date.now() });
  
  // Keep last 100 messages per user
  if (history.length > 100) {
    history.shift();
  }
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

/**
 * Execute an agent UI tool
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @param {object} context - Execution context with userId and sseWrite
 * @returns {object} - Tool execution result
 */
async function executeAgentUITool(toolName, toolInput, context) {
  const { 
    action, text, title, question, options, placeholder, 
    inputType = 'text', progress, duration = 3000, messageId, style = 'info' 
  } = toolInput;
  const userId = context.userId || 'anonymous';
  const sseWrite = context.sseWrite;
  
  switch (action) {
    case 'show_message': {
      if (!text) return { success: false, error: 'Text is required for show_message' };
      
      const msgId = generateMessageId();
      addToHistory(userId, 'message', text);
      
      // Send to frontend
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_message',
          messageType: 'info',
          messageId: msgId,
          title: title || 'Information',
          text,
          style: style || 'info'
        });
      }
      
      return {
        success: true,
        messageId: msgId,
        message: `Displayed message: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
      };
    }
    
    case 'show_warning': {
      if (!text) return { success: false, error: 'Text is required for show_warning' };
      
      const msgId = generateMessageId();
      addToHistory(userId, 'warning', text);
      
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_message',
          messageType: 'warning',
          messageId: msgId,
          title: title || 'Warning',
          text,
          style: 'warning'
        });
      }
      
      return {
        success: true,
        messageId: msgId,
        message: `Displayed warning: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
      };
    }
    
    case 'show_error': {
      if (!text) return { success: false, error: 'Text is required for show_error' };
      
      const msgId = generateMessageId();
      addToHistory(userId, 'error', text);
      
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_message',
          messageType: 'error',
          messageId: msgId,
          title: title || 'Error',
          text,
          style: 'error'
        });
      }
      
      return {
        success: true,
        messageId: msgId,
        message: `Displayed error: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
      };
    }
    
    case 'ask_user': {
      if (!question) return { success: false, error: 'Question is required for ask_user' };
      
      const questionId = generateQuestionId();
      const questionData = {
        id: questionId,
        question,
        inputType,
        options: options || null,
        placeholder: placeholder || '',
        timestamp: Date.now(),
        userId,
        resolved: false,
        answer: null
      };
      
      pendingQuestions.set(questionId, questionData);
      addToHistory(userId, 'question', question);
      
      // Send question to frontend
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_question',
          questionId,
          question,
          inputType,
          options: options || null,
          placeholder: placeholder || 'Type your answer...'
        });
      }
      
      return {
        success: true,
        pending: true,
        questionId,
        message: `Asked user: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`,
        requiresUserAction: true,
        inputType
      };
    }
    
    case 'show_progress': {
      if (progress === undefined) return { success: false, error: 'Progress is required for show_progress' };
      
      const msgId = messageId || generateMessageId();
      
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_progress',
          messageId: msgId,
          progress: Math.min(100, Math.max(0, progress)),
          text: text || `Progress: ${progress}%`,
          title: title || 'Processing...'
        });
      }
      
      return {
        success: true,
        messageId: msgId,
        progress,
        message: `Progress updated: ${progress}%`
      };
    }
    
    case 'show_toast': {
      if (!text) return { success: false, error: 'Text is required for show_toast' };
      
      const msgId = generateMessageId();
      addToHistory(userId, 'toast', text);
      
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_toast',
          messageId: msgId,
          text,
          style: style || 'info',
          duration: duration || 3000
        });
      }
      
      return {
        success: true,
        messageId: msgId,
        message: `Toast shown: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        duration
      };
    }
    
    case 'close_message': {
      if (!messageId) return { success: false, error: 'Message ID is required for close_message' };
      
      if (sseWrite) {
        sseWrite({
          type: 'agent_ui_close',
          messageId
        });
      }
      
      return {
        success: true,
        messageId,
        message: `Closed message ${messageId}`
      };
    }
    
    default:
      return { success: false, error: `Unknown UI action: ${action}` };
  }
}

/**
 * Resolve a pending question (called from frontend)
 */
function resolveQuestion(questionId, answer, userId) {
  const question = pendingQuestions.get(questionId);
  if (!question) return { success: false, error: 'Question not found' };
  if (question.userId !== userId) return { success: false, error: 'Unauthorized' };
  if (question.resolved) return { success: false, error: 'Already answered' };
  
  question.resolved = true;
  question.answer = answer;
  question.answeredAt = Date.now();
  
  return {
    success: true,
    questionId,
    answer,
    question: question.question
  };
}

/**
 * Get pending questions for a user
 */
function getPendingQuestions(userId) {
  const pending = [];
  for (const [id, q] of pendingQuestions.entries()) {
    if (q.userId === userId && !q.resolved) {
      pending.push({
        id,
        question: q.question,
        inputType: q.inputType,
        options: q.options,
        timestamp: q.timestamp
      });
    }
  }
  return pending;
}

/**
 * Check if tool is an agent UI tool
 */
function isAgentUITool(toolName) {
  return toolName === 'agent_ui';
}

export {
  AGENT_UI_TOOL_DEFINITIONS,
  executeAgentUITool,
  isAgentUITool,
  resolveQuestion,
  getPendingQuestions
};
