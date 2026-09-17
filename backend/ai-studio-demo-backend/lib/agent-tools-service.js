/**
 * MINIMAL AGENT TOOLS SERVICE FOR AI STUDIO DEMO
 * Only essential tools for free-tier chat demo app
 * - web_search: Basic web search
 * - fetch_url: URL content fetching
 * - run_code: Code execution
 * - calculate: Math operations
 * - get_current_time: Date/time awareness
 */

import demoToolsService from './demo-tools-service.js';

/**
 * Execute a tool by name with parameters
 */
export async function executeTool(toolName, params = {}, context = {}) {
  return await demoToolsService.executeTool(toolName, params);
}

/**
 * Get available tools list
 */
export function getAvailableTools() {
  return demoToolsService.tools;
}

/**
 * Check if a tool is available
 */
export function hasTool(toolName) {
  return demoToolsService.tools.includes(toolName);
}

export default {
  executeTool,
  getAvailableTools,
  hasTool
};
