/**
 * Code Intelligence Tools - Anthropic Tool Definitions + Executor
 * 12 comprehensive code tools for agentic IDE capabilities
 */

import {
  codeEdit,
  codeNavigate,
  codeSymbols,
  codeGit,
  codeDeps,
  codeLint,
  codeTest,
  codeRefactor,
  codeMetrics,
  codeDebug,
  codeDocs,
  codeScaffold
} from './codeEngine.js';

// ============================================================================
// ANTHROPIC TOOL DEFINITIONS
// ============================================================================
const CODE_TOOL_DEFINITIONS = [
  {
    name: 'code_edit',
    description: 'Edit files with surgical precision. Actions: patch (apply unified diff), find_replace (search and replace), insert_lines (add lines at position), delete_lines (remove lines), update_range (replace line range)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['patch', 'find_replace', 'insert_lines', 'delete_lines', 'update_range'],
          description: 'Edit action to perform'
        },
        filePath: { type: 'string', description: 'Target file path (relative to project)' },
        patch: { type: 'string', description: 'Unified diff patch content (for patch action)' },
        pattern: { type: 'string', description: 'Search pattern (for find_replace)' },
        replacement: { type: 'string', description: 'Replacement text (for find_replace)' },
        isRegex: { type: 'boolean', description: 'Pattern is regex (for find_replace)', default: false },
        global: { type: 'boolean', description: 'Replace all occurrences (for find_replace)', default: true },
        lineNumber: { type: 'integer', description: 'Line number for insert_lines' },
        startLine: { type: 'integer', description: 'Start line for delete_lines or update_range' },
        endLine: { type: 'integer', description: 'End line for delete_lines or update_range' },
        content: { type: 'string', description: 'Content to insert or replace with' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_navigate',
    description: 'Navigate and explore project structure. Actions: project_tree (get directory tree), find_file (search files by pattern), file_exists (check if file exists), detect_language (identify primary language)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['project_tree', 'find_file', 'file_exists', 'detect_language'],
          description: 'Navigation action'
        },
        pattern: { type: 'string', description: 'Search pattern (glob or regex for find_file)' },
        type: { type: 'string', enum: ['glob', 'regex'], description: 'Pattern type', default: 'glob' },
        filePath: { type: 'string', description: 'File path to check (for file_exists)' },
        maxDepth: { type: 'integer', description: 'Max tree depth (for project_tree)', default: 5 },
        includeHidden: { type: 'boolean', description: 'Include hidden files', default: false }
      },
      required: ['action']
    }
  },
  {
    name: 'code_symbols',
    description: 'Extract and navigate code symbols. Actions: extract_symbols (get all symbols from file), find_references (find all usages of a symbol), go_to_definition (find symbol definition), get_outline (document structure)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['extract_symbols', 'find_references', 'go_to_definition', 'get_outline'],
          description: 'Symbol operation'
        },
        filePath: { type: 'string', description: 'Target file path' },
        symbol: { type: 'string', description: 'Symbol name to search' },
        filePattern: { type: 'string', description: 'File pattern to search within', default: '**/*' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_git',
    description: 'Git version control operations. Actions: status (working tree status), diff (show changes), commit (create commit), branch (list/create/delete branches), log (commit history), stash (save/apply stashes), reset (undo changes)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'diff', 'commit', 'branch', 'log', 'stash', 'reset'],
          description: 'Git operation'
        },
        message: { type: 'string', description: 'Commit or stash message' },
        files: { type: 'array', items: { type: 'string' }, description: 'Files to stage for commit' },
        filePath: { type: 'string', description: 'File path for diff' },
        staged: { type: 'boolean', description: 'Show staged diff', default: false },
        name: { type: 'string', description: 'Branch name' },
        checkout: { type: 'boolean', description: 'Checkout branch after create' },
        delete: { type: 'boolean', description: 'Delete branch' },
        limit: { type: 'integer', description: 'Number of log entries', default: 20 },
        oneline: { type: 'boolean', description: 'One line log format', default: true },
        pop: { type: 'boolean', description: 'Pop stash' },
        list: { type: 'boolean', description: 'List stashes' },
        hard: { type: 'boolean', description: 'Hard reset', default: false },
        commit: { type: 'string', description: 'Reset target commit', default: 'HEAD~1' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_deps',
    description: 'Manage project dependencies. Actions: install (install all deps), list (show installed), outdated (check for updates), audit (security audit), add (install packages), remove (uninstall packages)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['install', 'list', 'outdated', 'audit', 'add', 'remove'],
          description: 'Dependency operation'
        },
        packages: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          description: 'Package(s) to add/remove'
        },
        dev: { type: 'boolean', description: 'Add as dev dependency', default: false },
        depth: { type: 'integer', description: 'Dependency tree depth for list', default: 0 }
      },
      required: ['action']
    }
  },
  {
    name: 'code_lint',
    description: 'Code quality and formatting. Actions: lint (run linter), format (run formatter), type_check (TypeScript check), autofix (run all auto-fixers)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['lint', 'format', 'type_check', 'autofix'],
          description: 'Quality operation'
        },
        filePath: { type: 'string', description: 'Target file or directory' },
        fix: { type: 'boolean', description: 'Auto-fix issues (for lint)', default: false }
      },
      required: ['action']
    }
  },
  {
    name: 'code_test',
    description: 'Run and manage tests. Actions: run (run all tests), run_file (run specific test file), coverage (run with coverage), detect (find test files)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['run', 'run_file', 'coverage', 'detect'],
          description: 'Test operation'
        },
        pattern: { type: 'string', description: 'Test pattern to run' },
        filePath: { type: 'string', description: 'Specific test file' },
        watch: { type: 'boolean', description: 'Watch mode', default: false }
      },
      required: ['action']
    }
  },
  {
    name: 'code_refactor',
    description: 'Code refactoring operations. Actions: rename_symbol (rename across files), extract_function (extract code to function), inline_variable (inline variable usages), organize_imports (sort imports), dead_code (find unused exports)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['rename_symbol', 'extract_function', 'inline_variable', 'organize_imports', 'dead_code'],
          description: 'Refactoring operation'
        },
        oldName: { type: 'string', description: 'Old symbol name (for rename)' },
        newName: { type: 'string', description: 'New symbol name (for rename)' },
        filePath: { type: 'string', description: 'Target file' },
        filePattern: { type: 'string', description: 'Files to search', default: '**/*' },
        startLine: { type: 'integer', description: 'Start line (for extract_function)' },
        endLine: { type: 'integer', description: 'End line (for extract_function)' },
        functionName: { type: 'string', description: 'New function name' },
        variableName: { type: 'string', description: 'Variable to inline' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_metrics',
    description: 'Code analysis and metrics. Actions: file_stats (file statistics), project_stats (project overview), dependency_graph (import graph), complexity (cyclomatic complexity)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['file_stats', 'project_stats', 'dependency_graph', 'complexity'],
          description: 'Metrics operation'
        },
        filePath: { type: 'string', description: 'Target file (for file_stats, complexity)' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_debug',
    description: 'Debugging assistance. Actions: parse_errors (extract errors from output), get_logs (read log files), analyze_stack (parse stack trace), suggest_fix (suggest fixes for errors)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['parse_errors', 'get_logs', 'analyze_stack', 'suggest_fix'],
          description: 'Debug operation'
        },
        errorText: { type: 'string', description: 'Error output to parse' },
        logFile: { type: 'string', description: 'Log file path', default: 'npm-debug.log' },
        lines: { type: 'integer', description: 'Number of log lines to read', default: 100 },
        stackTrace: { type: 'string', description: 'Stack trace to analyze' },
        errorMessage: { type: 'string', description: 'Error message for fix suggestions' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_docs',
    description: 'Documentation generation. Actions: jsdoc (generate JSDoc for function), readme (generate README template), api_docs (extract API docs from comments), changelog (generate from git log)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['jsdoc', 'readme', 'api_docs', 'changelog'],
          description: 'Documentation operation'
        },
        filePath: { type: 'string', description: 'Target file' },
        functionName: { type: 'string', description: 'Function name for jsdoc' }
      },
      required: ['action']
    }
  },
  {
    name: 'code_scaffold',
    description: 'Generate code scaffolding. Actions: component (React component), module (JS/TS module), test_file (test file), config (config files: eslint, prettier, tsconfig, jest), hook (React hook), service (API service layer)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['component', 'module', 'test_file', 'config', 'hook', 'service'],
          description: 'Scaffold type'
        },
        name: { type: 'string', description: 'Name of component/module/hook/service' },
        style: { type: 'string', enum: ['functional', 'class'], description: 'Component style', default: 'functional' },
        typescript: { type: 'boolean', description: 'Use TypeScript', default: true },
        sourceFile: { type: 'string', description: 'Source file for test_file' },
        framework: { type: 'string', enum: ['jest', 'vitest'], description: 'Test framework', default: 'jest' },
        type: { type: 'string', enum: ['eslint', 'prettier', 'tsconfig', 'jest'], description: 'Config type' }
      },
      required: ['action']
    }
  }
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================
async function executeCodeTool(toolName, input, projectPath) {
  const params = { ...input };
  delete params.action;
  
  switch (toolName) {
    case 'code_edit':
      return await codeEdit(projectPath, input.action, params);
    case 'code_navigate':
      return await codeNavigate(projectPath, input.action, params);
    case 'code_symbols':
      return await codeSymbols(projectPath, input.action, params);
    case 'code_git':
      return await codeGit(projectPath, input.action, params);
    case 'code_deps':
      return await codeDeps(projectPath, input.action, params);
    case 'code_lint':
      return await codeLint(projectPath, input.action, params);
    case 'code_test':
      return await codeTest(projectPath, input.action, params);
    case 'code_refactor':
      return await codeRefactor(projectPath, input.action, params);
    case 'code_metrics':
      return await codeMetrics(projectPath, input.action, params);
    case 'code_debug':
      return await codeDebug(projectPath, input.action, params);
    case 'code_docs':
      return await codeDocs(projectPath, input.action, params);
    case 'code_scaffold':
      return await codeScaffold(projectPath, input.action, params);
    default:
      return { success: false, error: `Unknown code tool: ${toolName}` };
  }
}

// ============================================================================
// TOOL CHECKER
// ============================================================================
const CODE_TOOL_NAMES = new Set(CODE_TOOL_DEFINITIONS.map(t => t.name));

function isCodeTool(toolName) {
  return CODE_TOOL_NAMES.has(toolName);
}

// ============================================================================
// EXPORTS
// ============================================================================
export {
  CODE_TOOL_DEFINITIONS,
  executeCodeTool,
  isCodeTool
};
