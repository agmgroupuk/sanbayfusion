// Agent Command Processor
// Processes agent commands for surgical code edits

import { editorBridge } from './editorBridge';
import { AgentCommand, AgentResponse } from '../types';

/**
 * Parse agent response for embedded commands
 * Agent can include commands in special format:
 * 
 * ```command
 * { "type": "insert", "path": "/index.html", "position": 100, "content": "<div>..." }
 * ```
 * 
 * Or multiple commands:
 * ```commands
 * [
 *   { "type": "updateFile", "path": "/index.html", "content": "..." },
 *   { "type": "createFile", "path": "/styles/new.css", "content": "..." }
 * ]
 * ```
 */
export function parseAgentResponse(response: string): AgentResponse {
  let message = response;
  let commands: AgentCommand[] = [];
  let code: string | undefined;

  // Try to extract command blocks
  const commandBlockRegex = /```command\s*([\s\S]*?)```/gi;
  const commandsBlockRegex = /```commands\s*([\s\S]*?)```/gi;
  
  // Single command block
  let match = commandBlockRegex.exec(response);
  while (match) {
    try {
      const cmd = JSON.parse(match[1].trim());
      if (isValidCommand(cmd)) {
        commands.push(cmd);
      }
      message = message.replace(match[0], '').trim();
    } catch (e) {
      console.warn('[AgentProcessor] Failed to parse command:', e);
    }
    match = commandBlockRegex.exec(response);
  }

  // Multiple commands block
  match = commandsBlockRegex.exec(response);
  while (match) {
    try {
      const cmds = JSON.parse(match[1].trim());
      if (Array.isArray(cmds)) {
        for (const cmd of cmds) {
          if (isValidCommand(cmd)) {
            commands.push(cmd);
          }
        }
      }
      message = message.replace(match[0], '').trim();
    } catch (e) {
      console.warn('[AgentProcessor] Failed to parse commands:', e);
    }
    match = commandsBlockRegex.exec(response);
  }

  // Also check for traditional code block (backward compatibility)
  const codeBlockRegex = /```html\s*([\s\S]*?)```/gi;
  const codeMatch = codeBlockRegex.exec(response);
  if (codeMatch) {
    code = codeMatch[1].trim();
    // If no commands but has code, treat as full regenerate
    if (commands.length === 0) {
      commands.push({ type: 'fullRegenerate', content: code });
    }
  }

  return { message, commands, code };
}

/**
 * Validate command structure
 */
function isValidCommand(cmd: any): cmd is AgentCommand {
  if (!cmd || typeof cmd !== 'object' || !cmd.type) return false;

  switch (cmd.type) {
    case 'insert':
      return typeof cmd.path === 'string' && 
             typeof cmd.position === 'number' && 
             typeof cmd.content === 'string';
    case 'replace':
      return typeof cmd.path === 'string' && 
             typeof cmd.start === 'number' && 
             typeof cmd.end === 'number' && 
             typeof cmd.content === 'string';
    case 'replaceSelection':
      return typeof cmd.content === 'string';
    case 'createFile':
      return typeof cmd.path === 'string' && typeof cmd.content === 'string';
    case 'deleteFile':
      return typeof cmd.path === 'string';
    case 'renameFile':
      return typeof cmd.oldPath === 'string' && typeof cmd.newPath === 'string';
    case 'updateFile':
      return typeof cmd.path === 'string' && typeof cmd.content === 'string';
    case 'fullRegenerate':
      return typeof cmd.content === 'string';
    case 'createPage':
      return typeof cmd.path === 'string' && typeof cmd.title === 'string' && typeof cmd.content === 'string';
    case 'updateMultipleFiles':
      return Array.isArray(cmd.files) && cmd.files.every((f: any) => typeof f.path === 'string' && typeof f.content === 'string');
    case 'deploy':
      return typeof cmd.platform === 'string';
    case 'fixBuildError':
      return typeof cmd.error === 'string' && typeof cmd.file === 'string' && typeof cmd.suggestedFix === 'string';
    default:
      return false;
  }
}

/**
 * Execute a single command
 */
export function executeCommand(command: AgentCommand): boolean {
  try {
    switch (command.type) {
      case 'insert':
        return editorBridge.insertAt(command.path, command.position, command.content);
      
      case 'replace':
        return editorBridge.replaceRange(command.path, command.start, command.end, command.content);
      
      case 'replaceSelection':
        return editorBridge.replaceSelection(command.content);
      
      case 'createFile':
        return editorBridge.createFile(command.path, command.content);
      
      case 'deleteFile':
        return editorBridge.deleteFile(command.path);
      
      case 'renameFile':
        return editorBridge.renameFile(command.oldPath, command.newPath);
      
      case 'updateFile':
        return editorBridge.updateFile(command.path, command.content);
      
      case 'fullRegenerate':
        return editorBridge.updateFile('/index.html', command.content);
      
      case 'createPage': {
        // Create a new HTML page file
        const pagePath = command.path.endsWith('.html') ? command.path : `${command.path}.html`;
        const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
        return editorBridge.createFile(normalizedPath, command.content);
      }
      
      case 'updateMultipleFiles': {
        // Batch update multiple files at once
        let allSuccess = true;
        for (const file of command.files) {
          const filePath = file.path.startsWith('/') ? file.path : `/${file.path}`;
          const exists = editorBridge.getFile(filePath) !== null;
          const success = exists 
            ? editorBridge.updateFile(filePath, file.content)
            : editorBridge.createFile(filePath, file.content);
          if (!success) allSuccess = false;
        }
        return allSuccess;
      }
      
      case 'deploy':
        // Deploy commands are handled by App.tsx, not editorBridge
        // Return true to signal the command was recognized
        console.log('[AgentProcessor] Deploy command received, delegating to App.tsx');
        return true;
      
      case 'fixBuildError': {
        // Apply the suggested fix to the specified file
        const fixPath = command.file.startsWith('/') ? command.file : `/${command.file}`;
        const existsForFix = editorBridge.getFile(fixPath) !== null;
        return existsForFix
          ? editorBridge.updateFile(fixPath, command.suggestedFix)
          : editorBridge.createFile(fixPath, command.suggestedFix);
      }
      
      default:
        console.warn('[AgentProcessor] Unknown command type:', (command as any).type);
        return false;
    }
  } catch (e) {
    console.error('[AgentProcessor] Command execution failed:', e);
    return false;
  }
}

/**
 * Execute all commands from agent response
 */
export function executeCommands(commands: AgentCommand[]): { 
  success: boolean; 
  results: { command: AgentCommand; success: boolean }[] 
} {
  const results = commands.map(command => ({
    command,
    success: executeCommand(command),
  }));

  return {
    success: results.every(r => r.success),
    results,
  };
}

/**
 * Process full agent response - parse and execute
 */
export function processAgentResponse(response: string): {
  message: string;
  executed: boolean;
  results: { command: AgentCommand; success: boolean }[];
  finalCode: string;
} {
  const parsed = parseAgentResponse(response);
  
  let executed = false;
  let results: { command: AgentCommand; success: boolean }[] = [];

  if (parsed.commands && parsed.commands.length > 0) {
    const execution = executeCommands(parsed.commands);
    executed = true;
    results = execution.results;
  }

  return {
    message: parsed.message,
    executed,
    results,
    finalCode: editorBridge.toHtml(),
  };
}

/**
 * Build context message for agent with editor state
 */
export function buildEditorContextForAgent(): string {
  const context = editorBridge.getAgentContext();
  
  let contextMessage = '';
  
  if (context.selection) {
    contextMessage += `\n[USER HAS SELECTED CODE]\n`;
    contextMessage += `File: ${context.selection.path}\n`;
    contextMessage += `Lines ${context.selection.lineStart}-${context.selection.lineEnd}\n`;
    contextMessage += `Selected text:\n\`\`\`\n${context.selection.text}\n\`\`\`\n`;
    contextMessage += `\nContext around selection:\n\`\`\`\n${context.nearbyCode}\n\`\`\`\n`;
  } else if (context.cursor) {
    contextMessage += `\n[CURSOR POSITION]\n`;
    contextMessage += `File: ${context.activeFile}\n`;
    contextMessage += `Line ${context.cursor.line}, Column ${context.cursor.column}\n`;
    if (context.nearbyCode) {
      contextMessage += `\nCode near cursor:\n\`\`\`\n${context.nearbyCode}\n\`\`\`\n`;
    }
  }

  if (context.projectFiles.length > 0) {
    contextMessage += `\n[PROJECT FILES]\n`;
    contextMessage += context.projectFiles.join('\n');
  }

  return contextMessage;
}

/**
 * Create a prompt instruction for agent to use surgical edits
 */
export function getSurgicalEditPrompt(): string {
  return `
You can make surgical edits to the code using commands. Instead of regenerating the entire file, use these command formats:

To insert code at a position:
\`\`\`command
{ "type": "insert", "path": "/index.html", "position": 100, "content": "<div>New content</div>" }
\`\`\`

To replace code in a range:
\`\`\`command
{ "type": "replace", "path": "/index.html", "start": 50, "end": 100, "content": "Replacement code" }
\`\`\`

To replace the user's current selection:
\`\`\`command
{ "type": "replaceSelection", "content": "New code for selection" }
\`\`\`

To update an entire file:
\`\`\`command
{ "type": "updateFile", "path": "/index.html", "content": "Full file content..." }
\`\`\`

To create a new file:
\`\`\`command
{ "type": "createFile", "path": "/components/Button.html", "content": "..." }
\`\`\`

To create a new page in a multi-page site:
\`\`\`command
{ "type": "createPage", "path": "/about.html", "title": "About Us", "content": "<!DOCTYPE html>..." }
\`\`\`

To update multiple files at once:
\`\`\`commands
[{ "type": "updateMultipleFiles", "files": [{"path": "/index.html", "content": "..."}, {"path": "/styles.css", "content": "..."}] }]
\`\`\`

To deploy the project:
\`\`\`command
{ "type": "deploy", "platform": "vercel" }
\`\`\`

To fix a build error:
\`\`\`command
{ "type": "fixBuildError", "error": "...", "file": "/index.html", "suggestedFix": "fixed content..." }
\`\`\`

Use surgical edits for small changes (adding a button, changing a color, fixing a bug).
Use full file update only when making major structural changes.
Use createPage to add new pages to multi-page sites.
Use deploy when the user asks to deploy their project.
`;
}

export const agentProcessor = {
  parseAgentResponse,
  executeCommand,
  executeCommands,
  processAgentResponse,
  buildEditorContextForAgent,
  getSurgicalEditPrompt,
};
