import { createLogger } from '../lib/logger.js';
const log = createLogger('tools');
/**
 * TOOL DEFINITIONS & EXECUTORS
 * Real LLM tool-calling: model decides which tool to invoke, backend executes,
 * result fed back to model for final response.
 * 
 * Each tool has:
 *   - definition: JSON schema for Anthropic tools[] array
 *   - execute(): runs the actual function, returns result string
 */

import { uploadImage, isConfigured as s3Configured } from './imageStorage.js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

// ============================================================================
// TOOL DEFINITIONS (Anthropic format)
// ============================================================================

export const TOOL_DEFINITIONS = [
  {
    name: 'think_step_by_step',
    description: 'Break down a complex problem, question, or idea into clear numbered steps with analysis. Use this when the user asks you to think through something, reason about a problem, analyze tradeoffs, or solve something that requires structured logic. Returns the structured analysis.',
    input_schema: {
      type: 'object',
      properties: {
        problem: {
          type: 'string',
          description: 'The problem or question to analyze step-by-step',
        },
        depth: {
          type: 'string',
          enum: ['quick', 'standard', 'deep'],
          description: 'How thorough the analysis should be. quick=3-5 steps, standard=5-8 steps, deep=8-15 steps with sub-analysis',
        },
      },
      required: ['problem'],
    },
  },
  {
    name: 'generate_code',
    description: 'Generate working code from a description, idea, or set of requirements. Use this when the user wants code created, a function written, a component built, or any programming task. Supports all major languages.',
    input_schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'What the code should do — the requirements, idea, or specification',
        },
        language: {
          type: 'string',
          description: 'Programming language (e.g. python, javascript, typescript, java, rust, go, html, css, sql, bash)',
        },
        context: {
          type: 'string',
          description: 'Optional existing code context, imports, or framework details the generated code should integrate with',
        },
      },
      required: ['description', 'language'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the internet for current information, facts, documentation, or recent events. Use this when the user asks about something that may require up-to-date information, news, live data, or when your training data may be outdated.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (default 5, max 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_speech',
    description: 'Convert text to spoken audio using text-to-speech. Use this when the user asks to hear something read aloud, wants audio narration, requests voice output, or says "speak", "read aloud", "TTS", or "voice".',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to convert to speech',
        },
        voice: {
          type: 'string',
          enum: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'],
          description: 'Voice to use for the speech. Default is alloy.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file. Use this when the user wants to see, review, or analyze code or file contents.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read (relative to workspace root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file, creating it if it does not exist or overwriting if it does. Use this for creating new files or completely replacing file contents.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write (relative to workspace root)',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'update_file',
    description: 'Update a specific part of a file by replacing old content with new content. Use this for targeted edits without rewriting the entire file.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to update (relative to workspace root)',
        },
        old_content: {
          type: 'string',
          description: 'The exact content to find and replace (must match exactly)',
        },
        new_content: {
          type: 'string',
          description: 'The new content to replace the old content with',
        },
      },
      required: ['path', 'old_content', 'new_content'],
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file with content. Fails if the file already exists. Use this when explicitly creating new files.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to create (relative to workspace root)',
        },
        content: {
          type: 'string',
          description: 'The initial content for the new file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the filesystem. Use this when the user wants to remove a file.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to delete (relative to workspace root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories in a given directory. Returns names with / suffix for directories.',
    input_schema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Path to the directory to list (relative to workspace root). Use "." or empty for root.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_project_tree',
    description: 'Get the full directory tree structure of the project/workspace. Returns a hierarchical view of all files and folders.',
    input_schema: {
      type: 'object',
      properties: {
        max_depth: {
          type: 'number',
          description: 'Maximum depth to traverse (default 4)',
        },
        include_hidden: {
          type: 'boolean',
          description: 'Include hidden files/folders starting with . (default false)',
        },
      },
      required: [],
    },
  },
  {
    name: 'file_exists',
    description: 'Check if a file or directory exists at the given path.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to check (relative to workspace root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_file_range',
    description: 'Get specific lines from a file. Use this to read a portion of a file by line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (relative to workspace root)',
        },
        start_line: {
          type: 'number',
          description: 'Starting line number (1-indexed)',
        },
        end_line: {
          type: 'number',
          description: 'Ending line number (1-indexed, inclusive)',
        },
      },
      required: ['path', 'start_line', 'end_line'],
    },
  },
  {
    name: 'insert_at_position',
    description: 'Insert text at a specific line and column position in a file.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (relative to workspace root)',
        },
        line: {
          type: 'number',
          description: 'Line number to insert at (1-indexed)',
        },
        column: {
          type: 'number',
          description: 'Column position to insert at (1-indexed). Use 1 for start of line.',
        },
        text: {
          type: 'string',
          description: 'Text to insert',
        },
      },
      required: ['path', 'line', 'column', 'text'],
    },
  },
  {
    name: 'replace_range',
    description: 'Replace text within a specific range (start line:column to end line:column) in a file. Use for precise editor-level edits.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (relative to workspace root)',
        },
        start_line: {
          type: 'number',
          description: 'Starting line number (1-indexed)',
        },
        start_column: {
          type: 'number',
          description: 'Starting column (1-indexed)',
        },
        end_line: {
          type: 'number',
          description: 'Ending line number (1-indexed)',
        },
        end_column: {
          type: 'number',
          description: 'Ending column (1-indexed, exclusive)',
        },
        new_text: {
          type: 'string',
          description: 'Text to replace the range with',
        },
      },
      required: ['path', 'start_line', 'start_column', 'end_line', 'end_column', 'new_text'],
    },
  },
  {
    name: 'delete_range',
    description: 'Delete text within a specific line:column range in a file.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (relative to workspace root)',
        },
        start_line: {
          type: 'number',
          description: 'Starting line number (1-indexed)',
        },
        start_column: {
          type: 'number',
          description: 'Starting column (1-indexed)',
        },
        end_line: {
          type: 'number',
          description: 'Ending line number (1-indexed)',
        },
        end_column: {
          type: 'number',
          description: 'Ending column (1-indexed, exclusive)',
        },
      },
      required: ['path', 'start_line', 'start_column', 'end_line', 'end_column'],
    },
  },
  {
    name: 'search_in_files',
    description: 'Search for text or regex pattern across all files in the workspace. Returns matching files with line numbers and context.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text or regex pattern to search for',
        },
        is_regex: {
          type: 'boolean',
          description: 'If true, treat query as a regex pattern (default false)',
        },
        file_pattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g. "*.js", "src/**/*.ts")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of matches to return (default 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_file_by_name',
    description: 'Find files matching a name pattern. Returns list of matching file paths.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'File name or glob pattern to search for (e.g. "*.tsx", "App.*", "config.json")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of files to return (default 20)',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command and return the output. Use for running build scripts, tests, installations, git commands, or any CLI operation. Commands run in the workspace root.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute (e.g., "npm install", "ls -la", "python script.py")',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command (relative to workspace root). Default is workspace root.',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default 30000, max 120000)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'run_script',
    description: 'Run a script file (bash, python, node) with arguments. Use when executing a specific script rather than a raw command.',
    input_schema: {
      type: 'object',
      properties: {
        script_path: {
          type: 'string',
          description: 'Path to the script file (relative to workspace root)',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arguments to pass to the script',
        },
        interpreter: {
          type: 'string',
          description: 'Interpreter to use (auto-detected from extension if not specified): bash, python, python3, node',
        },
      },
      required: ['script_path'],
    },
  },
  {
    name: 'git_status',
    description: 'Get the current git status including staged, unstaged, and untracked files.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'git_diff',
    description: 'Get the diff of changes. Shows what has been modified in the working directory or between commits.',
    input_schema: {
      type: 'object',
      properties: {
        staged: {
          type: 'boolean',
          description: 'If true, show only staged changes (--cached)',
        },
        file: {
          type: 'string',
          description: 'Specific file to diff (optional)',
        },
        commit: {
          type: 'string',
          description: 'Compare against this commit (e.g., HEAD~1, main, abc123)',
        },
      },
      required: [],
    },
  },
  {
    name: 'git_log',
    description: 'Get recent commit history.',
    input_schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of commits to show (default 10, max 50)',
        },
        file: {
          type: 'string',
          description: 'Show commits for a specific file only',
        },
        oneline: {
          type: 'boolean',
          description: 'Compact one-line format (default true)',
        },
      },
      required: [],
    },
  },
  {
    name: 'git_commit',
    description: 'Stage files and create a commit. Use this to commit changes to the repository.',
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Commit message',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to stage before committing. Use ["."] for all changes.',
        },
        amend: {
          type: 'boolean',
          description: 'Amend the previous commit instead of creating new one',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'git_branch',
    description: 'List, create, or delete git branches.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create', 'delete'],
          description: 'Action to perform (default: list)',
        },
        name: {
          type: 'string',
          description: 'Branch name for create/delete actions',
        },
      },
      required: [],
    },
  },
  {
    name: 'git_checkout',
    description: 'Switch to a different branch or restore files.',
    input_schema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Branch name or commit to checkout',
        },
        create: {
          type: 'boolean',
          description: 'Create and checkout new branch (-b flag)',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to restore instead of switching branch',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'git_push',
    description: 'Push commits to remote repository.',
    input_schema: {
      type: 'object',
      properties: {
        remote: {
          type: 'string',
          description: 'Remote name (default: origin)',
        },
        branch: {
          type: 'string',
          description: 'Branch to push (default: current branch)',
        },
        force: {
          type: 'boolean',
          description: 'Force push (use with caution)',
        },
        set_upstream: {
          type: 'boolean',
          description: 'Set upstream for new branches (-u flag)',
        },
      },
      required: [],
    },
  },
  {
    name: 'git_pull',
    description: 'Pull changes from remote repository.',
    input_schema: {
      type: 'object',
      properties: {
        remote: {
          type: 'string',
          description: 'Remote name (default: origin)',
        },
        branch: {
          type: 'string',
          description: 'Branch to pull (default: current branch)',
        },
        rebase: {
          type: 'boolean',
          description: 'Rebase instead of merge',
        },
      },
      required: [],
    },
  },
  {
    name: 'git_stash',
    description: 'Stash or restore uncommitted changes.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['push', 'pop', 'list', 'drop', 'apply'],
          description: 'Stash action (default: push)',
        },
        message: {
          type: 'string',
          description: 'Message for stash push',
        },
        index: {
          type: 'number',
          description: 'Stash index for pop/drop/apply (default 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_symbols',
    description: 'Extract code symbols (functions, classes, variables, imports) from a file. Useful for understanding code structure.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to analyze',
        },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['function', 'class', 'variable', 'import', 'export', 'interface', 'type'] },
          description: 'Symbol types to extract (default: all)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_references',
    description: 'Find all references to a symbol (function, variable, class) across the codebase.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'The symbol name to search for',
        },
        file_pattern: {
          type: 'string',
          description: 'Glob pattern to limit search (e.g., "*.ts", "src/**/*.js")',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'rename_symbol',
    description: 'Rename a symbol across all files where it appears. Performs find-and-replace with whole-word matching.',
    input_schema: {
      type: 'object',
      properties: {
        old_name: {
          type: 'string',
          description: 'Current symbol name',
        },
        new_name: {
          type: 'string',
          description: 'New symbol name',
        },
        file_pattern: {
          type: 'string',
          description: 'Glob pattern to limit scope (e.g., "*.ts", "src/**/*.js")',
        },
        dry_run: {
          type: 'boolean',
          description: 'Preview changes without applying them',
        },
      },
      required: ['old_name', 'new_name'],
    },
  },
  {
    name: 'format_code',
    description: 'Format code in a file using appropriate formatter (prettier, black, etc) based on file type.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to format',
        },
        formatter: {
          type: 'string',
          description: 'Force specific formatter (auto-detected if not specified): prettier, black, gofmt, rustfmt',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'lint_code',
    description: 'Run linter on a file and return issues found. Supports eslint, pylint, and language-specific linters.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to lint',
        },
        fix: {
          type: 'boolean',
          description: 'Automatically fix fixable issues',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_json',
    description: 'Read and parse a JSON file. Optionally extract specific path using dot notation.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the JSON file',
        },
        json_path: {
          type: 'string',
          description: 'Dot-notation path to extract (e.g., "scripts.build", "dependencies")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_json',
    description: 'Write or update a JSON file. Can set specific paths or replace entire content.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the JSON file',
        },
        data: {
          type: 'object',
          description: 'Data to write (replaces entire file if json_path not specified)',
        },
        json_path: {
          type: 'string',
          description: 'Dot-notation path to set (e.g., "scripts.test"). Creates nested structure if needed.',
        },
      },
      required: ['path', 'data'],
    },
  },
  {
    name: 'http_request',
    description: 'Make an HTTP request to any URL. Supports all methods and custom headers.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to request',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          description: 'HTTP method (default: GET)',
        },
        headers: {
          type: 'object',
          description: 'Request headers as key-value pairs',
        },
        body: {
          type: 'string',
          description: 'Request body (for POST/PUT/PATCH). JSON will be stringified automatically.',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default 30000)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fetch_webpage',
    description: 'Fetch a webpage and extract text content. Useful for reading documentation or web content.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the webpage to fetch',
        },
        extract: {
          type: 'string',
          enum: ['text', 'html', 'links', 'headings', 'code'],
          description: 'What to extract: text (readable content), html (raw), links, headings, or code blocks',
        },
        max_length: {
          type: 'number',
          description: 'Maximum content length to return (default 10000)',
        },
      },
      required: ['url'],
    },
  }
];

// ============================================================================
// TOOL EXECUTORS
// Each function runs the actual operation and returns a result string
// that gets fed back to the model as tool_result.
// ============================================================================

/**
 * Execute think_step_by_step
 * The model itself does the reasoning — we just structure the request and return it.
 * This is a "self-tool": the model uses it to signal structured thinking mode.
 */
function executeThinkStepByStep(input) {
  const depth = input.depth || 'standard';
  const stepGuide = { quick: '3-5', standard: '5-8', deep: '8-15' };

  return JSON.stringify({
    status: 'ready',
    instruction: `Analyze the following problem in ${stepGuide[depth]} numbered steps. For each step: state what you're examining, your reasoning, and your conclusion. At the end, provide a final synthesis.`,
    problem: input.problem,
    depth,
  });
}

/**
 * Execute generate_code
 * Self-tool — model generates the code itself.
 */
function executeGenerateCode(input) {
  return JSON.stringify({
    status: 'ready',
    instruction: `Generate clean, production-ready ${input.language} code for the following. Include comments, error handling, and follow best practices for the language. If the code needs imports/dependencies, list them.`,
    description: input.description,
    language: input.language,
    context: input.context || null,
  });
}

/**
 * Execute plan_workflow
 * Self-tool — model creates the plan.
 */
function executePlanWorkflow(input) {
  const format = input.output_format || 'steps';
  return JSON.stringify({
    status: 'ready',
    instruction: `Design a detailed workflow/pipeline plan for the following goal. Output as ${format}. Include: components needed, data flow between steps, error handling, and scaling considerations.`,
    goal: input.goal,
    constraints: input.constraints || 'none specified',
    output_format: format,
  });
}

/**
 * Execute debug_code
 * Self-tool — model analyzes the code.
 */
function executeDebugCode(input) {
  return JSON.stringify({
    status: 'ready',
    instruction: 'Analyze this code for bugs, logic errors, performance issues, and anti-patterns. For each issue found: (1) identify the exact line/section, (2) explain why it is a problem, (3) provide the corrected code. If an error message is provided, focus on diagnosing that specific error first.',
    code: input.code,
    error_message: input.error_message || null,
    language: input.language || 'auto-detect',
  });
}

/**
 * Execute web_search — uses SerpAPI for Google search results
 */
async function executeWebSearch(input) {
  const maxResults = Math.min(input.max_results || 5, 10);
  const query = input.query;
  
  // SerpAPI key
  const SERPAPI_KEY = process.env.SERPAPI_KEY || '4f85ba14108b7117cc967227d8a4f643b1cfae6ab0d4b37f7679e5a7b4e6f12d';

  try {
    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=${maxResults}&engine=google`;
    const response = await fetch(serpUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const results = [];

    // Extract answer box if present
    if (data.answer_box) {
      if (data.answer_box.answer) {
        results.push({
          title: 'Answer',
          snippet: data.answer_box.answer,
          url: data.answer_box.link || '',
          source: 'Google Answer Box',
        });
      } else if (data.answer_box.snippet) {
        results.push({
          title: data.answer_box.title || 'Answer',
          snippet: data.answer_box.snippet,
          url: data.answer_box.link || '',
          source: 'Google Answer Box',
        });
      }
    }

    // Extract knowledge graph if present
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph;
      results.push({
        title: kg.title || query,
        snippet: kg.description || kg.snippet || '',
        url: kg.website || '',
        source: 'Google Knowledge Graph',
      });
    }

    // Extract organic results
    if (data.organic_results) {
      for (const result of data.organic_results.slice(0, maxResults - results.length)) {
        results.push({
          title: result.title || '',
          snippet: result.snippet || '',
          url: result.link || '',
          source: result.source || 'Google',
          position: result.position,
        });
      }
    }

    // Extract related questions if available
    if (data.related_questions && results.length < maxResults) {
      for (const q of data.related_questions.slice(0, 2)) {
        if (q.snippet) {
          results.push({
            title: q.question || 'Related',
            snippet: q.snippet,
            url: q.link || '',
            source: 'People Also Ask',
          });
        }
      }
    }

    const trimmed = results.slice(0, maxResults);
    return JSON.stringify({ 
      status: 'success', 
      query, 
      resultCount: trimmed.length, 
      results: trimmed,
      searchEngine: 'Google via SerpAPI',
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', query, error: err.message, results: [] });
  }
}

/**
 * Execute generate_image — calls OpenAI DALL-E (needs aiService instance)
 * Returns image URL + meta. Actual DALL-E call happens via passed executor.
 */
async function executeGenerateImage(input, deps) {
  try {
    const result = await deps.aiService.generateImage(input.prompt, {
      sessionId: deps.sessionId,
      endpoint: 'image',
      creditAppId: deps.creditAppId,
      size: input.size || '1024x1024',
    });
    return JSON.stringify({
      status: 'success',
      image_url: result.imageUrl,
      revised_prompt: result.revisedPrompt,
      credits_used: result.creditsCost,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute generate_speech — calls OpenAI TTS (needs aiService instance)
 */
async function executeGenerateSpeech(input, deps) {
  try {
    const result = await deps.aiService.generateSpeech(input.text, {
      sessionId: deps.sessionId,
      endpoint: 'audio',
      creditAppId: deps.creditAppId,
      voice: input.voice || 'alloy',
    });
    return JSON.stringify({
      status: 'success',
      audio_data: result.audioData,
      credits_used: result.creditsCost,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

// ============================================================================
// FILE SYSTEM EXECUTORS
// ============================================================================

/**
 * Get safe absolute path within workspace
 */
function getSafePath(relativePath, workspaceRoot) {
  const absPath = path.resolve(workspaceRoot, relativePath);
  // Security: ensure path is within workspace
  if (!absPath.startsWith(workspaceRoot)) {
    throw new Error('Path outside workspace not allowed');
  }
  return absPath;
}

/**
 * Execute read_file
 */
async function executeReadFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.stringify({ status: 'success', path: input.path, content, size: content.length });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute write_file
 */
async function executeWriteFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, input.content, 'utf-8');
    return JSON.stringify({ status: 'success', path: input.path, bytesWritten: input.content.length });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute update_file — find and replace specific content
 */
async function executeUpdateFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    
    if (!content.includes(input.old_content)) {
      return JSON.stringify({ status: 'error', path: input.path, error: 'old_content not found in file' });
    }
    
    const newContent = content.replace(input.old_content, input.new_content);
    await fs.writeFile(filePath, newContent, 'utf-8');
    return JSON.stringify({ status: 'success', path: input.path, replacements: 1 });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute create_file — create new file (fails if exists)
 */
async function executeCreateFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    
    if (existsSync(filePath)) {
      return JSON.stringify({ status: 'error', path: input.path, error: 'File already exists. Use write_file to overwrite.' });
    }
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, input.content, 'utf-8');
    return JSON.stringify({ status: 'success', path: input.path, created: true, bytesWritten: input.content.length });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute delete_file
 */
async function executeDeleteFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    await fs.unlink(filePath);
    return JSON.stringify({ status: 'success', path: input.path, deleted: true });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute list_files
 */
async function executeListFiles(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const dirPath = getSafePath(input.directory || '.', workspaceRoot);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const files = entries.map(entry => ({
      name: entry.name + (entry.isDirectory() ? '/' : ''),
      type: entry.isDirectory() ? 'directory' : 'file',
    }));
    
    return JSON.stringify({ status: 'success', directory: input.directory || '.', files, count: files.length });
  } catch (err) {
    return JSON.stringify({ status: 'error', directory: input.directory, error: err.message });
  }
}

/**
 * Execute get_project_tree — recursive directory listing
 */
async function executeGetProjectTree(input, deps) {
  const maxDepth = input.max_depth || 4;
  const includeHidden = input.include_hidden || false;
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  
  async function buildTree(dirPath, depth) {
    if (depth > maxDepth) return null;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const tree = {};
      
      for (const entry of entries) {
        // Skip hidden files unless requested
        if (!includeHidden && entry.name.startsWith('.')) continue;
        // Skip node_modules and common build dirs
        if (['node_modules', 'dist', 'build', '.git', '__pycache__'].includes(entry.name)) continue;
        
        if (entry.isDirectory()) {
          const subTree = await buildTree(path.join(dirPath, entry.name), depth + 1);
          tree[entry.name + '/'] = subTree;
        } else {
          tree[entry.name] = null;
        }
      }
      
      return tree;
    } catch {
      return null;
    }
  }
  
  try {
    const tree = await buildTree(workspaceRoot, 1);
    return JSON.stringify({ status: 'success', tree, maxDepth, includeHidden });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute file_exists
 */
async function executeFileExists(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const exists = existsSync(filePath);
    
    let type = null;
    if (exists) {
      const stat = await fs.stat(filePath);
      type = stat.isDirectory() ? 'directory' : 'file';
    }
    
    return JSON.stringify({ status: 'success', path: input.path, exists, type });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

// ============================================================================
// CURSOR & SELECTION EXECUTORS
// ============================================================================

/**
 * Execute get_file_range — get specific lines from a file
 */
async function executeGetFileRange(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const startLine = Math.max(1, input.start_line) - 1; // Convert to 0-indexed
    const endLine = Math.min(lines.length, input.end_line);
    
    const selectedLines = lines.slice(startLine, endLine);
    const numberedContent = selectedLines.map((line, i) => `${startLine + i + 1}: ${line}`).join('\n');
    
    return JSON.stringify({
      status: 'success',
      path: input.path,
      start_line: startLine + 1,
      end_line: endLine,
      total_lines: lines.length,
      content: numberedContent,
      raw_content: selectedLines.join('\n'),
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute insert_at_position — insert text at specific line:column
 */
async function executeInsertAtPosition(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const lineIdx = Math.max(0, Math.min(lines.length - 1, input.line - 1));
    const colIdx = Math.max(0, input.column - 1);
    const line = lines[lineIdx];
    
    lines[lineIdx] = line.slice(0, colIdx) + input.text + line.slice(colIdx);
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    return JSON.stringify({
      status: 'success',
      path: input.path,
      line: input.line,
      column: input.column,
      inserted_length: input.text.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute replace_range — replace text in line:column range
 */
async function executeReplaceRange(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const startLineIdx = input.start_line - 1;
    const endLineIdx = input.end_line - 1;
    const startCol = input.start_column - 1;
    const endCol = input.end_column - 1;
    
    if (startLineIdx === endLineIdx) {
      // Single line replacement
      const line = lines[startLineIdx];
      lines[startLineIdx] = line.slice(0, startCol) + input.new_text + line.slice(endCol);
    } else {
      // Multi-line replacement
      const startLine = lines[startLineIdx];
      const endLine = lines[endLineIdx];
      const newLine = startLine.slice(0, startCol) + input.new_text + endLine.slice(endCol);
      lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, newLine);
    }
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    return JSON.stringify({
      status: 'success',
      path: input.path,
      range: { start: [input.start_line, input.start_column], end: [input.end_line, input.end_column] },
      new_text_length: input.new_text.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute delete_range — delete text in line:column range
 */
async function executeDeleteRange(input, deps) {
  return executeReplaceRange({ ...input, new_text: '' }, deps);
}

// ============================================================================
// SEARCH & NAVIGATION EXECUTORS  
// ============================================================================

/**
 * Execute search_in_files — grep-like search across workspace
 */
async function executeSearchInFiles(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const maxResults = input.max_results || 50;
  const results = [];
  
  // Build regex
  let regex;
  try {
    regex = input.is_regex ? new RegExp(input.query, 'gi') : new RegExp(escapeRegex(input.query), 'gi');
  } catch (err) {
    return JSON.stringify({ status: 'error', error: `Invalid regex: ${err.message}` });
  }
  
  // Recursively search files
  async function searchDir(dirPath, relPath = '') {
    if (results.length >= maxResults) return;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        
        // Skip common non-searchable directories
        if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'coverage'].includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        
        const entryPath = path.join(dirPath, entry.name);
        const entryRelPath = path.join(relPath, entry.name);
        
        if (entry.isDirectory()) {
          await searchDir(entryPath, entryRelPath);
        } else if (entry.isFile()) {
          // Check file pattern if specified
          if (input.file_pattern) {
            const pattern = input.file_pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            if (!new RegExp(pattern).test(entry.name)) continue;
          }
          
          // Skip binary files
          if (/\.(png|jpg|jpeg|gif|ico|svg|woff|ttf|eot|pdf|zip|tar|gz|mp3|mp4|mov|avi)$/i.test(entry.name)) continue;
          
          try {
            const content = await fs.readFile(entryPath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
              if (regex.test(lines[i])) {
                results.push({
                  file: entryRelPath,
                  line: i + 1,
                  content: lines[i].trim().slice(0, 200),
                });
                regex.lastIndex = 0; // Reset regex state
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
  
  await searchDir(workspaceRoot);
  
  return JSON.stringify({
    status: 'success',
    query: input.query,
    is_regex: !!input.is_regex,
    match_count: results.length,
    truncated: results.length >= maxResults,
    results,
  });
}

// Helper to escape regex special chars
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Execute find_file_by_name — find files matching pattern
 */
async function executeFindFileByName(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const maxResults = input.max_results || 20;
  const results = [];
  
  // Build regex from glob pattern
  const pattern = input.pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(pattern, 'i');
  
  async function searchDir(dirPath, relPath = '') {
    if (results.length >= maxResults) return;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(entry.name)) continue;
        
        const entryPath = path.join(dirPath, entry.name);
        const entryRelPath = path.join(relPath, entry.name);
        
        if (entry.isDirectory()) {
          await searchDir(entryPath, entryRelPath);
        } else if (regex.test(entry.name)) {
          results.push(entryRelPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
  
  await searchDir(workspaceRoot);
  
  return JSON.stringify({
    status: 'success',
    pattern: input.pattern,
    match_count: results.length,
    files: results,
  });
}

/**
 * Execute open_file — read file and signal UI to display it
 */
async function executeOpenFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Add line numbers
    const numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
    
    // Signal UI to open file
    if (deps.sseWrite) {
      deps.sseWrite({
        type: 'open_file',
        path: input.path,
        highlight_line: input.highlight_line || null,
      });
    }
    
    return JSON.stringify({
      status: 'success',
      path: input.path,
      total_lines: lines.length,
      highlight_line: input.highlight_line || null,
      content: numberedContent,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

// ============================================================================
// TERMINAL / SHELL EXECUTORS
// ============================================================================

/**
 * Execute run_command — run shell command
 */
async function executeRunCommand(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const cwd = input.cwd ? getSafePath(input.cwd, workspaceRoot) : workspaceRoot;
  const timeout = Math.min(input.timeout || 30000, 120000);
  
  // Block dangerous commands
  const dangerous = ['rm -rf /', 'mkfs', ':(){:|:&};:', 'dd if=/dev/zero'];
  if (dangerous.some(d => input.command.includes(d))) {
    return JSON.stringify({ status: 'error', error: 'Command blocked for safety' });
  }
  
  try {
    const { stdout, stderr } = await execAsync(input.command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 5, // 5MB
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    
    return JSON.stringify({
      status: 'success',
      command: input.command,
      cwd: input.cwd || '.',
      stdout: stdout.slice(0, 50000),
      stderr: stderr.slice(0, 10000),
      truncated: stdout.length > 50000 || stderr.length > 10000,
    });
  } catch (err) {
    return JSON.stringify({
      status: 'error',
      command: input.command,
      error: err.message,
      stdout: err.stdout?.slice(0, 10000) || '',
      stderr: err.stderr?.slice(0, 10000) || '',
      exitCode: err.code,
    });
  }
}

/**
 * Execute run_script — run a script file
 */
async function executeRunScript(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const scriptPath = getSafePath(input.script_path, workspaceRoot);
  
  // Auto-detect interpreter
  let interpreter = input.interpreter;
  if (!interpreter) {
    const ext = path.extname(scriptPath).toLowerCase();
    const interpreterMap = {
      '.sh': 'bash',
      '.bash': 'bash',
      '.py': 'python3',
      '.js': 'node',
      '.mjs': 'node',
      '.ts': 'npx ts-node',
      '.rb': 'ruby',
      '.php': 'php',
    };
    interpreter = interpreterMap[ext] || 'bash';
  }
  
  const args = input.args || [];
  const command = `${interpreter} "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
  
  return executeRunCommand({ command, timeout: 60000 }, deps);
}

// ============================================================================
// GIT EXECUTORS
// ============================================================================

/**
 * Execute git_status
 */
async function executeGitStatus(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    const { stdout } = await execAsync('git status --porcelain=v1', { cwd: workspaceRoot });
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: workspaceRoot });
    
    const files = stdout.trim().split('\n').filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3),
    }));
    
    const statusMap = {
      'M': 'modified', 'A': 'added', 'D': 'deleted', 'R': 'renamed',
      'C': 'copied', 'U': 'unmerged', '??': 'untracked', '!!': 'ignored',
    };
    
    const categorized = {
      staged: files.filter(f => f.status[0] && f.status[0] !== ' ' && f.status[0] !== '?'),
      unstaged: files.filter(f => f.status[1] && f.status[1] !== ' ' && f.status !== '??'),
      untracked: files.filter(f => f.status === '??'),
    };
    
    return JSON.stringify({
      status: 'success',
      branch: branch.trim(),
      files,
      summary: {
        staged: categorized.staged.length,
        unstaged: categorized.unstaged.length,
        untracked: categorized.untracked.length,
      },
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_diff
 */
async function executeGitDiff(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    let command = 'git diff';
    if (input.staged) command += ' --cached';
    if (input.commit) command += ` ${input.commit}`;
    if (input.file) command += ` -- "${input.file}"`;
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 10 });
    
    return JSON.stringify({
      status: 'success',
      staged: !!input.staged,
      commit: input.commit || null,
      file: input.file || null,
      diff: stdout.slice(0, 100000),
      truncated: stdout.length > 100000,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_log
 */
async function executeGitLog(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const count = Math.min(input.count || 10, 50);
  const oneline = input.oneline !== false;
  
  try {
    let command = `git log -${count}`;
    if (oneline) command += ' --oneline';
    else command += ' --format="%h|%an|%ar|%s"';
    if (input.file) command += ` -- "${input.file}"`;
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot });
    
    const commits = stdout.trim().split('\n').filter(Boolean).map(line => {
      if (oneline) {
        const [hash, ...msgParts] = line.split(' ');
        return { hash, message: msgParts.join(' ') };
      } else {
        const [hash, author, date, message] = line.split('|');
        return { hash, author, date, message };
      }
    });
    
    return JSON.stringify({ status: 'success', count: commits.length, commits });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_commit
 */
async function executeGitCommit(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    // Stage files if specified
    if (input.files && input.files.length > 0) {
      const filesToAdd = input.files.map(f => `"${f}"`).join(' ');
      await execAsync(`git add ${filesToAdd}`, { cwd: workspaceRoot });
    }
    
    let command = `git commit -m "${input.message.replace(/"/g, '\\"')}"`;
    if (input.amend) command = `git commit --amend -m "${input.message.replace(/"/g, '\\"')}"`;
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot });
    
    // Get the new commit hash
    const { stdout: hash } = await execAsync('git rev-parse --short HEAD', { cwd: workspaceRoot });
    
    return JSON.stringify({
      status: 'success',
      message: input.message,
      hash: hash.trim(),
      amend: !!input.amend,
      output: stdout.trim(),
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_branch
 */
async function executeGitBranch(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const action = input.action || 'list';
  
  try {
    if (action === 'list') {
      const { stdout } = await execAsync('git branch -a', { cwd: workspaceRoot });
      const branches = stdout.trim().split('\n').map(b => ({
        name: b.replace(/^\*?\s+/, '').trim(),
        current: b.startsWith('*'),
        remote: b.includes('remotes/'),
      }));
      return JSON.stringify({ status: 'success', action, branches });
    } else if (action === 'create') {
      if (!input.name) return JSON.stringify({ status: 'error', error: 'Branch name required' });
      await execAsync(`git branch "${input.name}"`, { cwd: workspaceRoot });
      return JSON.stringify({ status: 'success', action, branch: input.name, created: true });
    } else if (action === 'delete') {
      if (!input.name) return JSON.stringify({ status: 'error', error: 'Branch name required' });
      await execAsync(`git branch -d "${input.name}"`, { cwd: workspaceRoot });
      return JSON.stringify({ status: 'success', action, branch: input.name, deleted: true });
    }
    return JSON.stringify({ status: 'error', error: `Unknown action: ${action}` });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_checkout
 */
async function executeGitCheckout(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    if (input.files && input.files.length > 0) {
      // Restore specific files
      const files = input.files.map(f => `"${f}"`).join(' ');
      await execAsync(`git checkout ${input.target} -- ${files}`, { cwd: workspaceRoot });
      return JSON.stringify({ status: 'success', restored: input.files, from: input.target });
    } else {
      // Switch branch
      let command = input.create ? `git checkout -b "${input.target}"` : `git checkout "${input.target}"`;
      await execAsync(command, { cwd: workspaceRoot });
      return JSON.stringify({ status: 'success', branch: input.target, created: !!input.create });
    }
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_push
 */
async function executeGitPush(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    let command = 'git push';
    if (input.set_upstream) command += ' -u';
    if (input.force) command += ' --force';
    command += ` ${input.remote || 'origin'}`;
    if (input.branch) command += ` ${input.branch}`;
    
    const { stdout, stderr } = await execAsync(command, { cwd: workspaceRoot });
    return JSON.stringify({ status: 'success', output: stdout || stderr });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_pull
 */
async function executeGitPull(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  try {
    let command = 'git pull';
    if (input.rebase) command += ' --rebase';
    command += ` ${input.remote || 'origin'}`;
    if (input.branch) command += ` ${input.branch}`;
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot });
    return JSON.stringify({ status: 'success', output: stdout });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute git_stash
 */
async function executeGitStash(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const action = input.action || 'push';
  
  try {
    let command;
    switch (action) {
      case 'push':
        command = input.message ? `git stash push -m "${input.message}"` : 'git stash push';
        break;
      case 'pop':
        command = `git stash pop stash@{${input.index || 0}}`;
        break;
      case 'apply':
        command = `git stash apply stash@{${input.index || 0}}`;
        break;
      case 'drop':
        command = `git stash drop stash@{${input.index || 0}}`;
        break;
      case 'list':
        command = 'git stash list';
        break;
      default:
        return JSON.stringify({ status: 'error', error: `Unknown action: ${action}` });
    }
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot });
    return JSON.stringify({ status: 'success', action, output: stdout || 'Done' });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

// ============================================================================
// CODE INTELLIGENCE EXECUTORS
// ============================================================================

/**
 * Execute get_symbols — extract code symbols from a file
 */
async function executeGetSymbols(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    const symbols = { functions: [], classes: [], variables: [], imports: [], exports: [] };
    
    // Simple regex-based symbol extraction (works for most languages)
    if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
      // Functions
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
      const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
      let match;
      while ((match = funcRegex.exec(content))) symbols.functions.push(match[1]);
      while ((match = arrowRegex.exec(content))) symbols.functions.push(match[1]);
      
      // Classes
      const classRegex = /(?:export\s+)?class\s+(\w+)/g;
      while ((match = classRegex.exec(content))) symbols.classes.push(match[1]);
      
      // Imports
      const importRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      while ((match = importRegex.exec(content))) symbols.imports.push(match[1]);
      
      // Exports
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g;
      while ((match = exportRegex.exec(content))) symbols.exports.push(match[1]);
      
    } else if (['.py'].includes(ext)) {
      // Python
      const funcRegex = /def\s+(\w+)\s*\(/g;
      const classRegex = /class\s+(\w+)/g;
      const importRegex = /(?:from\s+([\w.]+)\s+)?import\s+([\w,\s*]+)/g;
      let match;
      while ((match = funcRegex.exec(content))) symbols.functions.push(match[1]);
      while ((match = classRegex.exec(content))) symbols.classes.push(match[1]);
      while ((match = importRegex.exec(content))) symbols.imports.push(match[1] || match[2]);
    }
    
    // Filter by requested types
    let result = symbols;
    if (input.types && input.types.length > 0) {
      result = {};
      if (input.types.includes('function')) result.functions = symbols.functions;
      if (input.types.includes('class')) result.classes = symbols.classes;
      if (input.types.includes('variable')) result.variables = symbols.variables;
      if (input.types.includes('import')) result.imports = symbols.imports;
      if (input.types.includes('export')) result.exports = symbols.exports;
    }
    
    return JSON.stringify({ status: 'success', path: input.path, symbols: result });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute get_references — find symbol references
 */
async function executeGetReferences(input, deps) {
  // Reuse search_in_files with word boundary matching
  return executeSearchInFiles(
    { query: `\\b${input.symbol}\\b`, is_regex: true, file_pattern: input.file_pattern, max_results: 100 },
    deps
  );
}

/**
 * Execute rename_symbol — rename across files
 */
async function executeRenameSymbol(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const results = { files_changed: 0, occurrences: 0, changes: [] };
  const pattern = new RegExp(`\\b${escapeRegex(input.old_name)}\\b`, 'g');
  
  async function processDir(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(entryPath);
      } else if (entry.isFile()) {
        // Check file pattern
        if (input.file_pattern) {
          const filePattern = input.file_pattern.replace(/\*/g, '.*');
          if (!new RegExp(filePattern).test(entry.name)) continue;
        }
        
        try {
          const content = await fs.readFile(entryPath, 'utf-8');
          const matches = content.match(pattern);
          
          if (matches && matches.length > 0) {
            const relPath = path.relative(workspaceRoot, entryPath);
            results.occurrences += matches.length;
            results.changes.push({ file: relPath, count: matches.length });
            
            if (!input.dry_run) {
              const newContent = content.replace(pattern, input.new_name);
              await fs.writeFile(entryPath, newContent, 'utf-8');
              results.files_changed++;
            }
          }
        } catch { /* skip */ }
      }
    }
  }
  
  await processDir(workspaceRoot);
  
  return JSON.stringify({
    status: 'success',
    old_name: input.old_name,
    new_name: input.new_name,
    dry_run: !!input.dry_run,
    ...results,
  });
}

/**
 * Execute format_code
 */
async function executeFormatCode(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const filePath = getSafePath(input.path, workspaceRoot);
  const ext = path.extname(filePath).toLowerCase();
  
  // Auto-detect formatter
  let formatter = input.formatter;
  if (!formatter) {
    const formatterMap = {
      '.js': 'prettier', '.ts': 'prettier', '.jsx': 'prettier', '.tsx': 'prettier',
      '.json': 'prettier', '.css': 'prettier', '.scss': 'prettier', '.md': 'prettier',
      '.py': 'black', '.go': 'gofmt', '.rs': 'rustfmt',
    };
    formatter = formatterMap[ext] || 'prettier';
  }
  
  try {
    let command;
    switch (formatter) {
      case 'prettier': command = `npx prettier --write "${filePath}"`; break;
      case 'black': command = `black "${filePath}"`; break;
      case 'gofmt': command = `gofmt -w "${filePath}"`; break;
      case 'rustfmt': command = `rustfmt "${filePath}"`; break;
      default: return JSON.stringify({ status: 'error', error: `Unknown formatter: ${formatter}` });
    }
    
    await execAsync(command, { cwd: workspaceRoot, timeout: 30000 });
    return JSON.stringify({ status: 'success', path: input.path, formatter });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute lint_code
 */
async function executeLintCode(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const filePath = getSafePath(input.path, workspaceRoot);
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    let command;
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      command = `npx eslint "${filePath}" --format json ${input.fix ? '--fix' : ''}`;
    } else if (ext === '.py') {
      command = `pylint "${filePath}" --output-format=json ${input.fix ? '' : ''}`;
    } else {
      return JSON.stringify({ status: 'error', error: `No linter configured for ${ext}` });
    }
    
    const { stdout, stderr } = await execAsync(command, { cwd: workspaceRoot });
    return JSON.stringify({ status: 'success', path: input.path, fix: !!input.fix, output: stdout || stderr });
  } catch (err) {
    // Linters often exit with non-zero for warnings
    return JSON.stringify({ status: 'success', path: input.path, output: err.stdout || err.stderr || err.message });
  }
}

// ============================================================================
// JSON / CONFIG EXECUTORS
// ============================================================================

/**
 * Execute read_json
 */
async function executeReadJson(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    let result = data;
    if (input.json_path) {
      const keys = input.json_path.split('.');
      for (const key of keys) {
        if (result && typeof result === 'object') {
          result = result[key];
        } else {
          result = undefined;
          break;
        }
      }
    }
    
    return JSON.stringify({ status: 'success', path: input.path, json_path: input.json_path || null, data: result });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

/**
 * Execute write_json
 */
async function executeWriteJson(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    
    let data = {};
    
    // Read existing if file exists
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(content);
    } catch { /* file doesn't exist, use empty object */ }
    
    if (input.json_path) {
      // Set nested path
      const keys = input.json_path.split('.');
      let current = data;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = input.data;
    } else {
      // Replace entire file
      data = input.data;
    }
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return JSON.stringify({ status: 'success', path: input.path, json_path: input.json_path || null });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

// ============================================================================
// HTTP / API EXECUTORS
// ============================================================================

/**
 * Execute http_request
 */
async function executeHttpRequest(input) {
  try {
    const timeout = input.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const options = {
      method: input.method || 'GET',
      headers: input.headers || {},
      signal: controller.signal,
    };
    
    if (input.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = typeof input.body === 'object' ? JSON.stringify(input.body) : input.body;
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }
    
    const response = await fetch(input.url, options);
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
      if (body.length > 50000) body = body.slice(0, 50000) + '...[truncated]';
    }
    
    return JSON.stringify({
      status: 'success',
      http_status: response.status,
      status_text: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', url: input.url, error: err.message });
  }
}

/**
 * Execute fetch_webpage
 */
async function executeFetchWebpage(input) {
  try {
    const response = await fetch(input.url, {
      headers: { 'User-Agent': 'OnelastAI/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    
    const html = await response.text();
    const maxLength = input.max_length || 10000;
    const extract = input.extract || 'text';
    
    let result;
    
    switch (extract) {
      case 'html':
        result = html.slice(0, maxLength);
        break;
        
      case 'text':
        // Simple HTML to text (remove tags, decode entities)
        result = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, maxLength);
        break;
        
      case 'links':
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
        const links = [];
        let match;
        while ((match = linkRegex.exec(html)) && links.length < 100) {
          links.push({ url: match[1], text: match[2].trim() });
        }
        result = links;
        break;
        
      case 'headings':
        const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;
        const headings = [];
        while ((match = headingRegex.exec(html)) && headings.length < 50) {
          headings.push({ level: parseInt(match[1]), text: match[2].trim() });
        }
        result = headings;
        break;
        
      case 'code':
        const codeRegex = /<(?:code|pre)[^>]*>([\s\S]*?)<\/(?:code|pre)>/gi;
        const codeBlocks = [];
        while ((match = codeRegex.exec(html)) && codeBlocks.length < 20) {
          const code = match[1].replace(/<[^>]+>/g, '').trim();
          if (code.length > 10) codeBlocks.push(code);
        }
        result = codeBlocks;
        break;
        
      default:
        result = html.slice(0, maxLength);
    }
    
    return JSON.stringify({ status: 'success', url: input.url, extract, content: result });
  } catch (err) {
    return JSON.stringify({ status: 'error', url: input.url, error: err.message });
  }
}

// ============================================================================
// MEMORY / CONTEXT EXECUTORS
// ============================================================================

// In-memory context store (per process)
const _contextStore = new Map();

/**
 * Execute save_context
 */
function executeSaveContext(input, deps) {
  const sessionKey = deps.sessionId || 'default';
  if (!_contextStore.has(sessionKey)) _contextStore.set(sessionKey, new Map());
  _contextStore.get(sessionKey).set(input.key, { value: input.value, savedAt: new Date().toISOString() });
  return JSON.stringify({ status: 'success', key: input.key, saved: true });
}

/**
 * Execute recall_context
 */
function executeRecallContext(input, deps) {
  const sessionKey = deps.sessionId || 'default';
  const sessionStore = _contextStore.get(sessionKey);
  if (!sessionStore || !sessionStore.has(input.key)) {
    return JSON.stringify({ status: 'success', key: input.key, found: false, value: null });
  }
  const entry = sessionStore.get(input.key);
  return JSON.stringify({ status: 'success', key: input.key, found: true, ...entry });
}

/**
 * Execute list_context_keys
 */
function executeListContextKeys(input, deps) {
  const sessionKey = deps.sessionId || 'default';
  const sessionStore = _contextStore.get(sessionKey);
  const keys = sessionStore ? Array.from(sessionStore.keys()) : [];
  return JSON.stringify({ status: 'success', keys });
}

/**
 * Execute summarize_file
 */
async function executeSummarizeFile(input, deps) {
  try {
    const workspaceRoot = deps.workspaceRoot || process.cwd();
    const filePath = getSafePath(input.path, workspaceRoot);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(filePath).toLowerCase();
    
    // Get symbols
    const symbolsResult = await executeGetSymbols(input, deps);
    const symbols = JSON.parse(symbolsResult);
    
    // Language detection
    const langMap = {
      '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'React JSX', '.tsx': 'React TSX',
      '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.php': 'PHP',
      '.java': 'Java', '.c': 'C', '.cpp': 'C++', '.h': 'C/C++ Header',
      '.css': 'CSS', '.scss': 'SCSS', '.html': 'HTML', '.json': 'JSON', '.md': 'Markdown',
    };
    
    return JSON.stringify({
      status: 'success',
      path: input.path,
      language: langMap[ext] || ext || 'Unknown',
      line_count: lines.length,
      char_count: content.length,
      symbols: symbols.symbols || {},
      preview: lines.slice(0, 10).join('\n'),
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', path: input.path, error: err.message });
  }
}

// ============================================================================
// ZIP / ARCHIVE EXECUTORS
// ============================================================================

/**
 * Execute create_zip — create a ZIP archive
 */
async function executeCreateZip(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const outputPath = getSafePath(input.output_path, workspaceRoot);
  const level = input.compression_level ?? 6;
  
  try {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Build file list
    const filePaths = input.files.map(f => `"${getSafePath(f, workspaceRoot)}"` ).join(' ');
    
    // Use system zip command
    const command = `zip -r -${level} "${outputPath}" ${filePaths}`;
    await execAsync(command, { cwd: workspaceRoot, timeout: 120000 });
    
    const stats = await fs.stat(outputPath);
    return JSON.stringify({
      status: 'success',
      output_path: input.output_path,
      size: stats.size,
      files_added: input.files.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute extract_zip — extract ZIP contents
 */
async function executeExtractZip(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const zipPath = getSafePath(input.zip_path, workspaceRoot);
  const outputDir = input.output_dir ? getSafePath(input.output_dir, workspaceRoot) : path.dirname(zipPath);
  
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    let command = `unzip -o "${zipPath}" -d "${outputDir}"`;
    if (input.files && input.files.length > 0) {
      command = `unzip -o "${zipPath}" ${input.files.map(f => `"${f}"`).join(' ')} -d "${outputDir}"`;
    }
    
    const { stdout } = await execAsync(command, { cwd: workspaceRoot, timeout: 120000 });
    
    // Count extracted files
    const lines = stdout.split('\n').filter(l => l.includes('extracting:') || l.includes('inflating:'));
    
    return JSON.stringify({
      status: 'success',
      zip_path: input.zip_path,
      output_dir: outputDir,
      files_extracted: lines.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute list_zip_contents — list ZIP contents without extracting
 */
async function executeListZipContents(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const zipPath = getSafePath(input.zip_path, workspaceRoot);
  
  try {
    const { stdout } = await execAsync(`unzip -l "${zipPath}"`, { cwd: workspaceRoot });
    
    // Parse unzip output
    const lines = stdout.split('\n');
    const files = [];
    let inFileList = false;
    
    for (const line of lines) {
      if (line.includes('--------')) {
        inFileList = !inFileList;
        continue;
      }
      if (inFileList && line.trim()) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          files.push({
            size: parseInt(parts[0]),
            date: parts[1],
            time: parts[2],
            name: parts.slice(3).join(' '),
          });
        }
      }
    }
    
    return JSON.stringify({
      status: 'success',
      zip_path: input.zip_path,
      file_count: files.length,
      files,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute add_to_zip — add files to existing ZIP
 */
async function executeAddToZip(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const zipPath = getSafePath(input.zip_path, workspaceRoot);
  
  try {
    const filePaths = input.files.map(f => `"${getSafePath(f, workspaceRoot)}"`).join(' ');
    await execAsync(`zip -u "${zipPath}" ${filePaths}`, { cwd: workspaceRoot, timeout: 60000 });
    
    return JSON.stringify({
      status: 'success',
      zip_path: input.zip_path,
      files_added: input.files.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute remove_from_zip — remove files from ZIP
 */
async function executeRemoveFromZip(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const zipPath = getSafePath(input.zip_path, workspaceRoot);
  
  try {
    const filePatterns = input.files.map(f => `"${f}"`).join(' ');
    await execAsync(`zip -d "${zipPath}" ${filePatterns}`, { cwd: workspaceRoot, timeout: 60000 });
    
    return JSON.stringify({
      status: 'success',
      zip_path: input.zip_path,
      files_removed: input.files.length,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute create_tar — create TAR archive
 */
async function executeCreateTar(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const outputPath = getSafePath(input.output_path, workspaceRoot);
  
  // Detect compression from extension
  let compression = input.compression || 'none';
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.gz' || outputPath.endsWith('.tar.gz') || ext === '.tgz') compression = 'gzip';
  else if (ext === '.bz2' || outputPath.endsWith('.tar.bz2')) compression = 'bzip2';
  
  const compressionFlags = { none: '', gzip: 'z', bzip2: 'j' };
  const flag = compressionFlags[compression] || '';
  
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    const filePaths = input.files.map(f => `"${getSafePath(f, workspaceRoot)}"`).join(' ');
    await execAsync(`tar -cv${flag}f "${outputPath}" ${filePaths}`, { cwd: workspaceRoot, timeout: 120000 });
    
    const stats = await fs.stat(outputPath);
    return JSON.stringify({
      status: 'success',
      output_path: input.output_path,
      size: stats.size,
      compression,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute extract_tar — extract TAR archive
 */
async function executeExtractTar(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const tarPath = getSafePath(input.tar_path, workspaceRoot);
  const outputDir = input.output_dir ? getSafePath(input.output_dir, workspaceRoot) : workspaceRoot;
  
  // Auto-detect compression
  const ext = tarPath.toLowerCase();
  let flag = '';
  if (ext.endsWith('.gz') || ext.endsWith('.tgz')) flag = 'z';
  else if (ext.endsWith('.bz2')) flag = 'j';
  else if (ext.endsWith('.xz')) flag = 'J';
  
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const { stdout } = await execAsync(`tar -xv${flag}f "${tarPath}" -C "${outputDir}"`, { 
      cwd: workspaceRoot, 
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
    });
    
    const filesExtracted = stdout.split('\n').filter(l => l.trim()).length;
    
    return JSON.stringify({
      status: 'success',
      tar_path: input.tar_path,
      output_dir: outputDir,
      files_extracted: filesExtracted,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute bulk_upload_handler — process multiple uploaded files
 */
async function executeBulkUploadHandler(input, deps) {
  const workspaceRoot = deps.workspaceRoot || process.cwd();
  const sourceDir = getSafePath(input.source_dir, workspaceRoot);
  const targetDir = getSafePath(input.target_dir, workspaceRoot);
  const extractArchives = input.extract_archives !== false;
  const flatten = input.flatten || false;
  const deleteOriginals = input.delete_originals || false;
  
  const results = { processed: 0, extracted: 0, moved: 0, errors: [] };
  
  try {
    await fs.mkdir(targetDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      
      try {
        if (entry.isFile()) {
          // Check if it's an archive
          if (extractArchives && ['.zip', '.tar', '.gz', '.tgz', '.bz2'].includes(ext)) {
            // Extract archive
            const extractDir = flatten ? targetDir : path.join(targetDir, path.basename(entry.name, ext));
            
            if (ext === '.zip') {
              await executeExtractZip({ zip_path: sourcePath, output_dir: extractDir }, deps);
            } else {
              await executeExtractTar({ tar_path: sourcePath, output_dir: extractDir }, deps);
            }
            results.extracted++;
            
            if (deleteOriginals) await fs.unlink(sourcePath);
          } else {
            // Move file
            const destPath = path.join(targetDir, entry.name);
            await fs.copyFile(sourcePath, destPath);
            if (deleteOriginals) await fs.unlink(sourcePath);
            results.moved++;
          }
          results.processed++;
        } else if (entry.isDirectory() && !flatten) {
          // Copy directory
          const destDir = path.join(targetDir, entry.name);
          await execAsync(`cp -r "${sourcePath}" "${destDir}"`, { cwd: workspaceRoot });
          if (deleteOriginals) await execAsync(`rm -rf "${sourcePath}"`, { cwd: workspaceRoot });
          results.processed++;
          results.moved++;
        }
      } catch (err) {
        results.errors.push({ file: entry.name, error: err.message });
      }
    }
    
    return JSON.stringify({
      status: 'success',
      source_dir: input.source_dir,
      target_dir: input.target_dir,
      ...results,
    });
  } catch (err) {
    return JSON.stringify({ status: 'error', error: err.message });
  }
}

/**
 * Execute analyze_image — calls Azure Computer Vision
 * Supports: attached image (uploaded to S3) or image URL
 */
let _azureVision = null;
async function _loadAzureVision() {
  if (!_azureVision) {
    try {
      const mod = await import('./azureVision.js');
      _azureVision = mod.default || mod;
    } catch (e) {
      log.warn('[Tools] Azure Vision not available:', e.message);
    }
  }
  return _azureVision;
}

async function executeAnalyzeImage(input, deps) {
  try {
    const azureVision = await _loadAzureVision();
    if (!azureVision || !azureVision.isConfigured()) {
      return JSON.stringify({ status: 'error', error: 'Azure Computer Vision is not configured. Set AZURE_CV_ENDPOINT and AZURE_CV_KEY in .env' });
    }

    const action = input.action || 'caption';
    let result;

    // Handle "moderate" action separately (different endpoint)
    if (action === 'moderate') {
      if (input.image_url) {
        // Download the image first for moderation (v3.2 needs binary)
        const imgResp = await fetch(input.image_url, { signal: AbortSignal.timeout(15000) });
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        result = await azureVision.moderateImageBuffer(imgBuf);
      } else if (deps.pendingImage) {
        // Upload to S3 first, then download for moderation
        let imgBuf;
        if (deps.pendingImage.url) {
          const imgResp = await fetch(deps.pendingImage.url, { signal: AbortSignal.timeout(15000) });
          imgBuf = Buffer.from(await imgResp.arrayBuffer());
        } else {
          imgBuf = Buffer.from(deps.pendingImage.data.replace(/^data:[^;]+;base64,/, ''), 'base64');
        }
        result = await azureVision.moderateImageBuffer(imgBuf);
      } else {
        return JSON.stringify({ status: 'error', error: 'No image provided. Attach an image or provide an image_url.' });
      }
      return JSON.stringify({ status: 'success', action: 'moderate', analysis: result });
    }

    // Map actions to Azure CV features
    const featureMap = {
      caption: ['caption'],
      dense_captions: ['dense_captions'],
      tags: ['tags'],
      objects: ['objects'],
      people: ['people'],
      smart_crop: ['smart_crop'],
      read: ['read'],
      ocr: ['read'],
      ai_full: ['caption', 'dense_captions', 'tags', 'objects', 'people', 'read'],
    };
    const features = featureMap[action] || ['caption'];

    if (input.image_url) {
      result = await azureVision.analyzeImageUrl(input.image_url, { features });
    } else if (deps.pendingImage) {
      // Use URL if available (S3), otherwise fall back to buffer
      if (deps.pendingImage.url) {
        result = await azureVision.analyzeImageUrl(deps.pendingImage.url, { features });
      } else {
        const imgBuf = Buffer.from(deps.pendingImage.data.replace(/^data:[^;]+;base64,/, ''), 'base64');
        const mimeType = deps.pendingImage.mimeType || 'application/octet-stream';
        result = await azureVision.analyzeImageBuffer(imgBuf, mimeType, { features });
      }
    } else {
      return JSON.stringify({ status: 'error', error: 'No image provided. Attach an image to your message or provide an image_url.' });
    }

      return JSON.stringify({ status: 'success', action, analysis: result });
    } catch (err) {
      log.error('[Tools] analyze_image error:', err);
      return JSON.stringify({ status: 'error', error: err.message });
    }
  }

// ============================================================================
// MASTER EXECUTOR — routes tool_name to the right function
// ============================================================================

/**
 * Execute a tool by name.
 * @param {string} toolName
 * @param {object} input — the parsed input from the model's tool_use block
 * @param {object} deps — { aiService, sessionId, creditAppId, sseWrite }
 * @returns {Promise<{ result: string, sideEffects?: object }>}
 *   sideEffects carries data the route needs to handle (image urls, audio data, etc.)
 */
export async function executeTool(toolName, input, deps = {}) {
    let result;
    let sideEffects = null;

    switch (toolName) {
      case 'think_step_by_step':
        result = executeThinkStepByStep(input);
        break;
      case 'generate_code':
        result = executeGenerateCode(input);
        break;
      case 'web_search':
        result = await executeWebSearch(input);
        break;
      case 'generate_speech': {
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'generate_speech', status: 'generating' });
        result = await executeGenerateSpeech(input, deps);
        const parsed = JSON.parse(result);
        if (parsed.status === 'success') {
          sideEffects = { type: 'audio', audioData: parsed.audio_data };
          if (deps.sseWrite) deps.sseWrite({ type: 'audio', audioData: parsed.audio_data });
        }
        break;
      }
      // --- FILE SYSTEM TOOLS ---
      case 'read_file':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'read_file', status: 'reading' });
        result = await executeReadFile(input, deps);
        break;
      case 'write_file':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'write_file', status: 'writing' });
        result = await executeWriteFile(input, deps);
        break;
      case 'update_file':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'update_file', status: 'updating' });
        result = await executeUpdateFile(input, deps);
        break;
      case 'create_file':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'create_file', status: 'creating' });
        result = await executeCreateFile(input, deps);
        break;
      case 'delete_file':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'delete_file', status: 'deleting' });
        result = await executeDeleteFile(input, deps);
        break;
      case 'list_files':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'list_files', status: 'listing' });
        result = await executeListFiles(input, deps);
        break;
      case 'get_project_tree':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'get_project_tree', status: 'scanning' });
        result = await executeGetProjectTree(input, deps);
        break;
      case 'file_exists':
        result = await executeFileExists(input, deps);
        break;
      // --- CURSOR & SELECTION ---
      case 'get_file_range':
        result = await executeGetFileRange(input, deps);
        break;
      case 'insert_at_position':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'insert_at_position', status: 'inserting' });
        result = await executeInsertAtPosition(input, deps);
        break;
      case 'replace_range':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'replace_range', status: 'replacing' });
        result = await executeReplaceRange(input, deps);
        break;
      case 'delete_range':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'delete_range', status: 'deleting' });
        result = await executeDeleteRange(input, deps);
        break;
      // --- SEARCH & NAVIGATION ---
      case 'search_in_files':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'search_in_files', status: 'searching' });
        result = await executeSearchInFiles(input, deps);
        break;
      case 'find_file_by_name':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'find_file_by_name', status: 'searching' });
        result = await executeFindFileByName(input, deps);
        break;
      // --- TERMINAL / SHELL ---
      case 'run_command':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'run_command', status: 'executing' });
        result = await executeRunCommand(input, deps);
        break;
      case 'run_script':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'run_script', status: 'executing' });
        result = await executeRunScript(input, deps);
        break;
      // --- GIT ---
      case 'git_status':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_status', status: 'checking' });
        result = await executeGitStatus(input, deps);
        break;
      case 'git_diff':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_diff', status: 'diffing' });
        result = await executeGitDiff(input, deps);
        break;
      case 'git_log':
        result = await executeGitLog(input, deps);
        break;
      case 'git_commit':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_commit', status: 'committing' });
        result = await executeGitCommit(input, deps);
        break;
      case 'git_branch':
        result = await executeGitBranch(input, deps);
        break;
      case 'git_checkout':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_checkout', status: 'switching' });
        result = await executeGitCheckout(input, deps);
        break;
      case 'git_push':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_push', status: 'pushing' });
        result = await executeGitPush(input, deps);
        break;
      case 'git_pull':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_pull', status: 'pulling' });
        result = await executeGitPull(input, deps);
        break;
      case 'git_stash':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'git_stash', status: 'stashing' });
        result = await executeGitStash(input, deps);
        break;
      // --- CODE INTELLIGENCE ---
      case 'get_symbols':
        result = await executeGetSymbols(input, deps);
        break;
      case 'get_references':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'get_references', status: 'searching' });
        result = await executeGetReferences(input, deps);
        break;
      case 'rename_symbol':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'rename_symbol', status: 'renaming' });
        result = await executeRenameSymbol(input, deps);
        break;
      case 'format_code':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'format_code', status: 'formatting' });
        result = await executeFormatCode(input, deps);
        break;
      case 'lint_code':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'lint_code', status: 'linting' });
        result = await executeLintCode(input, deps);
        break;
      // --- JSON / CONFIG ---
      case 'read_json':
        result = await executeReadJson(input, deps);
        break;
      case 'write_json':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'write_json', status: 'writing' });
        result = await executeWriteJson(input, deps);
        break;
      // --- HTTP / API ---
      case 'http_request':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'http_request', status: 'fetching' });
        result = await executeHttpRequest(input);
        break;
      case 'fetch_webpage':
        if (deps.sseWrite) deps.sseWrite({ type: 'tool_status', tool: 'fetch_webpage', status: 'fetching' });
        result = await executeFetchWebpage(input);
        break;
      // --- MEMORY / CONTEXT ---);
        result = await executeBulkUploadHandler(input, deps);
        break;
      default:
        result = JSON.stringify({ status: 'error', error: `Unknown tool: ${toolName}` });
    }

    return { result, sideEffects };
  }

  export default { TOOL_DEFINITIONS, executeTool };
