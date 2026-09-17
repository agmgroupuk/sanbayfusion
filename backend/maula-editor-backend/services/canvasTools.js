import { createLogger } from '../lib/logger.js';
const log = createLogger('canvasTools');
/**
 * CANVAS TOOL DEFINITIONS & EXECUTORS
 * Real LLM tool-calling for the Canvas IDE agent.
 * Backend defines tools → Model chooses → Backend executes
 *
 * The canvas agent uses these tools to manipulate project files,
 * run commands, search code, and deploy projects.
 * File state is passed in from the frontend and tool results are
 * streamed back via SSE.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';

const execAsync = promisify(exec);

// ============================================================================
// TOOL DEFINITIONS (Anthropic format with input_schema)
// ============================================================================

export const CANVAS_TOOL_DEFINITIONS = [
  // --- FILE SYSTEM ---
  {
    name: 'write_file',
    description: 'Create a new file or overwrite an existing file in the project. Always write the COMPLETE file content. Use this for creating new files, generating code, or modifying existing files.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to project root (e.g., "index.html", "src/App.tsx", "styles.css")',
        },
        content: {
          type: 'string',
          description: 'Complete file content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the project. Use this to inspect existing code before modifying it.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the project.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to delete',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List all files currently in the project.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_in_files',
    description: 'Search for text or a regex pattern across all project files. Returns matching lines with file paths and line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string or regex pattern',
        },
        is_regex: {
          type: 'boolean',
          description: 'Whether to treat the query as a regex pattern (default: false)',
        },
      },
      required: ['query'],
    },
  },
  // --- FILE MANAGEMENT ---
  {
    name: 'rename_file',
    description: 'Rename a file in the project. The file keeps its content but gets a new path/name.',
    input_schema: {
      type: 'object',
      properties: {
        old_path: {
          type: 'string',
          description: 'Current file path relative to project root',
        },
        new_path: {
          type: 'string',
          description: 'New file path relative to project root',
        },
      },
      required: ['old_path', 'new_path'],
    },
  },
  {
    name: 'move_file',
    description: 'Move a file to a different directory within the project. Content is preserved.',
    input_schema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Current file path',
        },
        destination: {
          type: 'string',
          description: 'New file path (include the filename)',
        },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'copy_file',
    description: 'Copy a file to a new location within the project. Original file is preserved.',
    input_schema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source file path to copy from',
        },
        destination: {
          type: 'string',
          description: 'Destination file path for the copy',
        },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'create_folder',
    description: 'Create a folder marker in the project. In the in-memory file system, folders are created implicitly when files are written, but this tool allows explicit folder creation for project scaffolding.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Folder path relative to project root (e.g., "src/components", "lib/utils")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'append_to_file',
    description: 'Append content to the end of an existing file. Creates the file if it does not exist. Useful for adding entries to logs, configs, or growing files without rewriting.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to project root',
        },
        content: {
          type: 'string',
          description: 'Content to append to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'change_file_extension',
    description: 'Change a file\'s extension (e.g., rename app.js to app.tsx). Content is preserved.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Current file path',
        },
        new_extension: {
          type: 'string',
          description: 'New file extension including the dot (e.g., ".tsx", ".py", ".css")',
        },
      },
      required: ['path', 'new_extension'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and folders within a specific directory of the project. Returns only items at the given depth, not recursively.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to list (use "" or "." for root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'bulk_file_operations',
    description: 'Perform multiple file operations in a single tool call. Supports create, delete, rename, move, and copy. Use this for scaffolding entire project structures or large refactors.',
    input_schema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'Array of file operations to execute sequentially',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['create', 'delete', 'rename', 'move', 'copy'],
                description: 'Operation type',
              },
              path: {
                type: 'string',
                description: 'File path (for create, delete) or source path (for rename, move, copy)',
              },
              content: {
                type: 'string',
                description: 'File content (only for create action)',
              },
              destination: {
                type: 'string',
                description: 'Destination path (for rename, move, copy)',
              },
            },
            required: ['action', 'path'],
          },
        },
      },
      required: ['operations'],
    },
  },
  // --- COMMAND EXECUTION ---
  {
    name: 'run_command',
    description: 'Execute a shell command in a sandboxed environment. Supports: node, npm, npx, python, tsc, eslint, prettier, git, and more. Has a 30-second timeout. Use for building, testing, linting, or running scripts.',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute (e.g., "node -e log.info(1+1)", "npx tsc --noEmit")',
        },
      },
      required: ['command'],
    },
  },
  // --- DEPLOYMENT ---
  {
    name: 'deploy_project',
    description: 'Deploy the current project files to a hosting platform. Internal hosting is free and instant. Other platforms require stored credentials.',
    input_schema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['internal', 'vercel', 'netlify', 'railway', 'cloudflare'],
          description: 'Target hosting platform',
        },
        name: {
          type: 'string',
          description: 'Project name for the deployment (used in URLs)',
        },
      },
      required: ['platform'],
    },
  },
];

// ============================================================================
// SECURITY
// ============================================================================

function validatePath(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.includes('\\')) return false;
  return true;
}

function sanitizePath(path) {
  return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

// Allowed commands whitelist — covers all 9 core languages + extras
// SECURITY: NO shells (bash/sh/zsh), NO direct DB clients (psql/mysql)
const ALLOWED_COMMANDS = [
  // JavaScript / Node.js / TypeScript
  'node', 'npx', 'npm', 'yarn', 'pnpm', 'tsc', 'tsx', 'bun',
  // Python
  'python3', 'python', 'pip', 'pip3', 'pipenv', 'poetry',
  // Java
  'java', 'javac', 'mvn', 'gradle', 'gradlew',
  // Go
  'go',
  // C / C++
  'gcc', 'g++', 'cc', 'c++', 'make', 'cmake', 'clang', 'clang++',
  // PHP
  'php', 'composer',
  // Rust
  'rustc', 'cargo',
  // SQL (read-only local only)
  'sqlite3',
  // Ruby
  'ruby', 'gem', 'bundle', 'rails',
  // Swift
  'swift', 'swiftc',
  // Kotlin
  'kotlinc', 'kotlin',
  // C#
  'dotnet', 'csc',
  // Linters / Formatters
  'eslint', 'prettier', 'black', 'flake8', 'pylint', 'gofmt',
  // Unix utilities (read-only / safe)
  'cat', 'head', 'tail', 'wc', 'grep', 'find', 'ls', 'pwd', 'echo', 'which', 'env', 'sort', 'uniq', 'diff', 'tr', 'sed', 'awk', 'cut', 'xargs',
  // Filesystem modification (sandboxed to /tmp)
  'mkdir', 'mv', 'cp', 'touch',
  // Git (limited)
  'git',
];

const BLOCKED_PATTERNS = [
  /rm\s+-rf/,
  /rm\s+-r\s+\//,
  /rm\s+-r\s+~/,
  /rmdir/,
  /mkfs/,
  /dd\s+if=/,
  /:(){ :|:& };:/,
  />\s*\/dev\//,
  /curl.*\|/,      // Block ALL curl piping, not just to sh
  /wget.*\|/,      // Block ALL wget piping
  /sudo/,
  /chmod/,
  /chown/,
  /shutdown|reboot|halt/,
  /useradd|userdel|passwd/,
  /eval\s*\(/,
  /\$\(.*\)/,      // Block command substitution
  /`.*`/,          // Block backtick command substitution
  /;\s*(bash|sh|zsh|dash)/,  // Block shell chaining
  /\|\s*(bash|sh|zsh|dash)/, // Block piping to shells
  />\s*\//,        // Block redirects to absolute paths
  /git\s+push/,    // Block git push (credential leak risk)
  /git\s+remote/,  // Block git remote manipulation
  /nc\s+-/,        // Block netcat
  /ncat/,
  /python.*-c/,    // Block python one-liner execution
  /node\s+-e/,     // Block node eval
  /npm\s+publish/, // Block npm publish
];

// ============================================================================
// TOOL EXECUTORS
// ============================================================================

/**
 * Execute write_file — creates or overwrites a file in the project state.
 * Also sends a file_write SSE event so the frontend can update its editor.
 */
function executeWriteFile(input, ctx) {
  const path = sanitizePath(input.path);
  if (!validatePath(path)) {
    return { status: 'error', error: `Invalid path: ${input.path}` };
  }

  // Update project state
  const isNew = !ctx.projectFiles[path];
  ctx.projectFiles[path] = input.content;

  // Stream file change to frontend
  if (ctx.sseWrite) {
    ctx.sseWrite({
      type: 'file_write',
      path,
      content: input.content,
      isNew,
    });
  }

  return {
    status: 'success',
    message: `${isNew ? 'Created' : 'Updated'} ${path} (${input.content.length} bytes)`,
  };
}

/**
 * Execute read_file — reads a file from the project state.
 */
function executeReadFile(input, ctx) {
  const path = sanitizePath(input.path);
  if (!validatePath(path)) {
    return { status: 'error', error: `Invalid path: ${input.path}` };
  }

  const content = ctx.projectFiles[path];
  if (content === undefined) {
    return { status: 'error', error: `File not found: ${path}. Available files: ${Object.keys(ctx.projectFiles).join(', ') || 'none'}` };
  }

  return {
    status: 'success',
    path,
    content,
    size: content.length,
  };
}

/**
 * Execute delete_file — removes a file from the project state.
 */
function executeDeleteFile(input, ctx) {
  const path = sanitizePath(input.path);
  if (!validatePath(path)) {
    return { status: 'error', error: `Invalid path: ${input.path}` };
  }

  if (ctx.projectFiles[path] === undefined) {
    return { status: 'error', error: `File not found: ${path}` };
  }

  delete ctx.projectFiles[path];

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_delete', path });
  }

  return { status: 'success', message: `Deleted ${path}` };
}

/**
 * Execute list_files — lists all files in the project.
 */
function executeListFiles(input, ctx) {
  const files = Object.keys(ctx.projectFiles);
  return {
    status: 'success',
    files,
    count: files.length,
  };
}

/**
 * Execute search_in_files — searches across all project files.
 */
function executeSearchInFiles(input, ctx) {
  const results = [];
  const isRegex = input.is_regex || false;

  for (const [path, content] of Object.entries(ctx.projectFiles)) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      let matches = false;
      if (isRegex) {
        try {
          matches = new RegExp(input.query, 'i').test(line);
        } catch { matches = false; }
      } else {
        matches = line.toLowerCase().includes(input.query.toLowerCase());
      }
      if (matches) {
        results.push({ path, line: idx + 1, text: line.trim().slice(0, 200) });
      }
    });
  }

  return {
    status: 'success',
    query: input.query,
    resultCount: results.length,
    results: results.slice(0, 50), // Cap at 50 results
  };
}

// ============================================================================
// NEW FILE MANAGEMENT EXECUTORS
// ============================================================================

/**
 * Execute rename_file — renames a file in the project state.
 */
function executeRenameFile(input, ctx) {
  const oldPath = sanitizePath(input.old_path);
  const newPath = sanitizePath(input.new_path);
  if (!validatePath(oldPath)) return { status: 'error', error: `Invalid old path: ${input.old_path}` };
  if (!validatePath(newPath)) return { status: 'error', error: `Invalid new path: ${input.new_path}` };

  if (ctx.projectFiles[oldPath] === undefined) {
    return { status: 'error', error: `File not found: ${oldPath}` };
  }
  if (ctx.projectFiles[newPath] !== undefined) {
    return { status: 'error', error: `Destination already exists: ${newPath}` };
  }

  const content = ctx.projectFiles[oldPath];
  delete ctx.projectFiles[oldPath];
  ctx.projectFiles[newPath] = content;

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_delete', path: oldPath });
    ctx.sseWrite({ type: 'file_write', path: newPath, content, isNew: true });
  }

  return { status: 'success', message: `Renamed ${oldPath} → ${newPath}` };
}

/**
 * Execute move_file — moves a file to a new location.
 */
function executeMoveFile(input, ctx) {
  const source = sanitizePath(input.source);
  const destination = sanitizePath(input.destination);
  if (!validatePath(source)) return { status: 'error', error: `Invalid source: ${input.source}` };
  if (!validatePath(destination)) return { status: 'error', error: `Invalid destination: ${input.destination}` };

  if (ctx.projectFiles[source] === undefined) {
    return { status: 'error', error: `File not found: ${source}` };
  }
  if (ctx.projectFiles[destination] !== undefined) {
    return { status: 'error', error: `Destination already exists: ${destination}` };
  }

  const content = ctx.projectFiles[source];
  delete ctx.projectFiles[source];
  ctx.projectFiles[destination] = content;

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_delete', path: source });
    ctx.sseWrite({ type: 'file_write', path: destination, content, isNew: true });
  }

  return { status: 'success', message: `Moved ${source} → ${destination}` };
}

/**
 * Execute copy_file — copies a file to a new location.
 */
function executeCopyFile(input, ctx) {
  const source = sanitizePath(input.source);
  const destination = sanitizePath(input.destination);
  if (!validatePath(source)) return { status: 'error', error: `Invalid source: ${input.source}` };
  if (!validatePath(destination)) return { status: 'error', error: `Invalid destination: ${input.destination}` };

  if (ctx.projectFiles[source] === undefined) {
    return { status: 'error', error: `File not found: ${source}` };
  }

  const content = ctx.projectFiles[source];
  ctx.projectFiles[destination] = content;

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_write', path: destination, content, isNew: true });
  }

  return { status: 'success', message: `Copied ${source} → ${destination} (${content.length} bytes)` };
}

/**
 * Execute create_folder — creates a folder marker in the project.
 * In-memory file systems don't have real folders, so we create a .gitkeep sentinel.
 */
function executeCreateFolder(input, ctx) {
  let folderPath = sanitizePath(input.path);
  if (!validatePath(folderPath)) return { status: 'error', error: `Invalid path: ${input.path}` };

  // Ensure trailing slash consistency
  if (!folderPath.endsWith('/')) folderPath += '/';

  // Check if any file already exists in this folder
  const exists = Object.keys(ctx.projectFiles).some(f => f.startsWith(folderPath));

  // Create a .gitkeep to make the folder visible
  const markerPath = folderPath + '.gitkeep';
  if (!ctx.projectFiles[markerPath]) {
    ctx.projectFiles[markerPath] = '';
    if (ctx.sseWrite) {
      ctx.sseWrite({ type: 'file_write', path: markerPath, content: '', isNew: true });
    }
  }

  return {
    status: 'success',
    message: exists ? `Folder ${folderPath} already has files` : `Created folder ${folderPath}`,
  };
}

/**
 * Execute append_to_file — appends content to an existing file or creates it.
 */
function executeAppendToFile(input, ctx) {
  const path = sanitizePath(input.path);
  if (!validatePath(path)) return { status: 'error', error: `Invalid path: ${input.path}` };

  const existing = ctx.projectFiles[path] || '';
  const isNew = !ctx.projectFiles[path];
  const newContent = existing + input.content;
  ctx.projectFiles[path] = newContent;

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_write', path, content: newContent, isNew });
  }

  return {
    status: 'success',
    message: `${isNew ? 'Created' : 'Appended to'} ${path} (now ${newContent.length} bytes)`,
  };
}

/**
 * Execute change_file_extension — changes a file's extension.
 */
function executeChangeFileExtension(input, ctx) {
  const oldPath = sanitizePath(input.path);
  if (!validatePath(oldPath)) return { status: 'error', error: `Invalid path: ${input.path}` };

  if (ctx.projectFiles[oldPath] === undefined) {
    return { status: 'error', error: `File not found: ${oldPath}` };
  }

  let ext = input.new_extension;
  if (!ext.startsWith('.')) ext = '.' + ext;

  // Strip old extension and append new one
  const lastDot = oldPath.lastIndexOf('.');
  const basePath = lastDot > 0 ? oldPath.slice(0, lastDot) : oldPath;
  const newPath = basePath + ext;

  if (newPath === oldPath) {
    return { status: 'success', message: `File already has extension ${ext}` };
  }
  if (ctx.projectFiles[newPath] !== undefined) {
    return { status: 'error', error: `Destination already exists: ${newPath}` };
  }

  const content = ctx.projectFiles[oldPath];
  delete ctx.projectFiles[oldPath];
  ctx.projectFiles[newPath] = content;

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'file_delete', path: oldPath });
    ctx.sseWrite({ type: 'file_write', path: newPath, content, isNew: true });
  }

  return { status: 'success', message: `Changed ${oldPath} → ${newPath}` };
}

/**
 * Execute list_directory — lists files/folders at a specific directory level.
 */
function executeListDirectory(input, ctx) {
  let dirPath = sanitizePath(input.path || '');

  // Normalize: root = '', everything else ends with /
  if (dirPath && !dirPath.endsWith('/')) dirPath += '/';
  if (dirPath === '.' || dirPath === './') dirPath = '';

  const entries = new Set();
  for (const filePath of Object.keys(ctx.projectFiles)) {
    if (!filePath.startsWith(dirPath)) continue;

    const relative = filePath.slice(dirPath.length);
    const slashIdx = relative.indexOf('/');
    if (slashIdx === -1) {
      // Direct file in this directory
      entries.add(relative);
    } else {
      // Subdirectory — add folder name with trailing /
      entries.add(relative.slice(0, slashIdx + 1));
    }
  }

  const sorted = [...entries].sort((a, b) => {
    // Folders first, then files
    const aIsDir = a.endsWith('/');
    const bIsDir = b.endsWith('/');
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.localeCompare(b);
  });

  return {
    status: 'success',
    directory: dirPath || '.',
    entries: sorted,
    count: sorted.length,
  };
}

/**
 * Execute bulk_file_operations — runs multiple file operations sequentially.
 */
function executeBulkFileOperations(input, ctx) {
  const ops = input.operations;
  if (!Array.isArray(ops) || ops.length === 0) {
    return { status: 'error', error: 'operations array is required and must not be empty' };
  }

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (const op of ops) {
    let result;
    try {
      switch (op.action) {
        case 'create':
          result = executeWriteFile({ path: op.path, content: op.content || '' }, ctx);
          break;
        case 'delete':
          result = executeDeleteFile({ path: op.path }, ctx);
          break;
        case 'rename':
          result = executeRenameFile({ old_path: op.path, new_path: op.destination }, ctx);
          break;
        case 'move':
          result = executeMoveFile({ source: op.path, destination: op.destination }, ctx);
          break;
        case 'copy':
          result = executeCopyFile({ source: op.path, destination: op.destination }, ctx);
          break;
        default:
          result = { status: 'error', error: `Unknown action: ${op.action}` };
      }
    } catch (err) {
      result = { status: 'error', error: err.message };
    }

    if (result.status === 'success') succeeded++;
    else failed++;
    results.push({ action: op.action, path: op.path, ...result });
  }

  return {
    status: failed === 0 ? 'success' : 'partial',
    message: `${succeeded} succeeded, ${failed} failed out of ${ops.length} operations`,
    results,
  };
}

/**
 * Execute run_command — runs a shell command in a sandbox.
 */
async function executeRunCommand(input, ctx) {
  const { command } = input;
  if (!command || typeof command !== 'string') {
    return { status: 'error', error: 'Command is required' };
  }

  // Security checks
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { status: 'error', error: 'Command blocked for security reasons' };
    }
  }

  const baseCommand = command.trim().split(/\s+/)[0].replace(/^.*\//, '');
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return {
      status: 'error',
      error: `Command "${baseCommand}" not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
    };
  }

  // Sync project files to a temp directory so build/install commands can work
  // Each session gets a unique sandbox dir under /tmp/canvas-sandbox-<id>
  const sandboxId = ctx.sandboxId || ('sb_' + Date.now());
  if (!ctx.sandboxId) ctx.sandboxId = sandboxId;
  const sandboxDir = join('/tmp', `canvas-sandbox-${sandboxId}`);

  if (ctx.projectFiles && Object.keys(ctx.projectFiles).length > 0) {
    try {
      for (const [filePath, content] of Object.entries(ctx.projectFiles)) {
        const fullPath = join(sandboxDir, filePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
      }
    } catch (syncErr) {
      log.error('[canvasTools] Failed to sync project files to sandbox:', syncErr.message);
    }
  }

  // Stream command start
  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'command_start', command });
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      cwd: sandboxDir,
      env: { ...process.env, NODE_ENV: 'sandbox', HOME: '/tmp' },
    });

    const output = (stdout || '').slice(0, 10000);
    const errors = (stderr || '').slice(0, 5000);

    // After command, scan sandbox for new/modified files and sync back to project state
    if (ctx.projectFiles) {
      try {
        const newFiles = scanDirRecursive(sandboxDir, sandboxDir);
        for (const [relPath, content] of Object.entries(newFiles)) {
          if (ctx.projectFiles[relPath] !== content) {
            ctx.projectFiles[relPath] = content;
            if (ctx.sseWrite) {
              ctx.sseWrite({ type: 'file_write', path: relPath, content, isNew: !ctx.projectFiles[relPath] });
            }
          }
        }
      } catch (_) { /* best effort */ }
    }

    if (ctx.sseWrite) {
      ctx.sseWrite({ type: 'command_output', command, stdout: output, stderr: errors, exitCode: 0 });
    }

    return {
      status: 'success',
      command,
      stdout: output,
      stderr: errors,
      exitCode: 0,
    };
  } catch (err) {
    const output = (err.stdout || '').slice(0, 10000);
    const errors = (err.stderr || err.message || '').slice(0, 5000);

    if (ctx.sseWrite) {
      ctx.sseWrite({ type: 'command_output', command, stdout: output, stderr: errors, exitCode: err.code || 1 });
    }

    return {
      status: 'error',
      command,
      stdout: output,
      stderr: errors,
      exitCode: err.code || 1,
    };
  }
}

/**
 * Recursively scan a directory and return { relativePath: content } for text files.
 * Skips node_modules, .git, and binary files. Max 500 files, 1MB per file.
 */
function scanDirRecursive(dir, rootDir, result = {}, count = { n: 0 }) {
  if (count.n > 500) return result;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (count.n > 500) break;
      if (entry === 'node_modules' || entry === '.git' || entry === '.cache') continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirRecursive(fullPath, rootDir, result, count);
      } else if (stat.isFile() && stat.size < 1024 * 1024) {
        // Skip likely binary files
        const ext = entry.split('.').pop()?.toLowerCase() || '';
        const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'mp3', 'zip', 'tar', 'gz', 'so', 'dylib', 'exe'];
        if (binaryExts.includes(ext)) continue;
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const relPath = fullPath.slice(rootDir.length + 1);
          result[relPath] = content;
          count.n++;
        } catch (_) { /* skip unreadable files */ }
      }
    }
  } catch (_) { /* skip unreadable dirs */ }
  return result;
}

/**
 * Execute deploy_project — deploys project files to a platform.
 * Uses the existing hosting/credentials backend infrastructure.
 */
async function executeDeployProject(input, ctx) {
  const platform = (input.platform || 'internal').toLowerCase();
  const projectName = input.name || 'canvas-app';

  if (ctx.sseWrite) {
    ctx.sseWrite({ type: 'deploy_start', platform, name: projectName });
  }

  try {
    if (platform === 'internal') {
      // Internal deploy — use hosting API
      const mainFile = ctx.projectFiles['index.html'] || ctx.projectFiles['main.html'] || Object.values(ctx.projectFiles)[0];
      if (!mainFile) {
        return { status: 'error', error: 'No files to deploy' };
      }

      const response = await fetch(`http://localhost:${process.env.PORT || 3200}/api/hosting/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: mainFile,
          name: projectName,
          description: 'Deployed via Canvas Agent',
          language: 'html',
          isPublic: true,
        }),
      });

      const data = await response.json();
      if (data.success && data.app?.url) {
        if (ctx.sseWrite) {
          ctx.sseWrite({ type: 'deploy_complete', platform, url: data.app.url, name: projectName });
        }
        return { status: 'success', url: data.app.url, platform, message: `Deployed to ${data.app.url}` };
      }
      return { status: 'error', error: data.error || 'Deployment failed' };
    }

    // External platforms — use credentials API
    const filesMap = {};
    for (const [path, content] of Object.entries(ctx.projectFiles)) {
      filesMap[path] = content;
    }

    // Ensure index.html exists for web deploys
    if (!filesMap['index.html'] && filesMap['main.html']) {
      filesMap['index.html'] = filesMap['main.html'];
    }

    const response = await fetch(`http://localhost:${process.env.PORT || 3200}/api/credentials/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ctx.cookies || '',
      },
      body: JSON.stringify({
        provider: platform.toUpperCase(),
        projectName,
        files: filesMap,
      }),
    });

    const data = await response.json();
    if (data.success && data.url) {
      if (ctx.sseWrite) {
        ctx.sseWrite({ type: 'deploy_complete', platform, url: data.url, name: projectName });
      }
      return { status: 'success', url: data.url, platform, message: `Deployed to ${data.url}` };
    }
    if (data.needsCredentials) {
      return { status: 'error', error: `No ${platform} credentials stored. Ask the user to add their token in the Credentials panel.` };
    }
    return { status: 'error', error: data.error || 'Deployment failed' };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ============================================================================
// MASTER EXECUTOR
// ============================================================================

/**
 * Execute a canvas tool by name.
 * @param {string} toolName
 * @param {object} input — parsed input from the model's tool_use block
 * @param {object} ctx — { projectFiles, sseWrite, cookies }
 *   projectFiles is a mutable Record<string, string> that represents the project state.
 *   sseWrite sends events to the frontend.
 * @returns {Promise<string>} — JSON string result for the tool_result message
 */
export async function executeCanvasTool(toolName, input, ctx = {}) {
  let result;

  switch (toolName) {
    case 'write_file':
      result = executeWriteFile(input, ctx);
      break;
    case 'read_file':
      result = executeReadFile(input, ctx);
      break;
    case 'delete_file':
      result = executeDeleteFile(input, ctx);
      break;
    case 'list_files':
      result = executeListFiles(input, ctx);
      break;
    case 'search_in_files':
      result = executeSearchInFiles(input, ctx);
      break;
    case 'rename_file':
      result = executeRenameFile(input, ctx);
      break;
    case 'move_file':
      result = executeMoveFile(input, ctx);
      break;
    case 'copy_file':
      result = executeCopyFile(input, ctx);
      break;
    case 'create_folder':
      result = executeCreateFolder(input, ctx);
      break;
    case 'append_to_file':
      result = executeAppendToFile(input, ctx);
      break;
    case 'change_file_extension':
      result = executeChangeFileExtension(input, ctx);
      break;
    case 'list_directory':
      result = executeListDirectory(input, ctx);
      break;
    case 'bulk_file_operations':
      result = executeBulkFileOperations(input, ctx);
      break;
    case 'run_command':
      result = await executeRunCommand(input, ctx);
      break;
    case 'deploy_project':
      result = await executeDeployProject(input, ctx);
      break;
    default:
      result = { status: 'error', error: `Unknown tool: ${toolName}` };
  }

  return JSON.stringify(result);
}

export default { CANVAS_TOOL_DEFINITIONS, executeCanvasTool };
