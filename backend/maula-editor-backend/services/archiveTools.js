import { createLogger } from '../lib/logger.js';
const log = createLogger('archiveTools');
/**
 * ARCHIVE TOOLS — AI Archive Processing Tool Definitions + Executor
 * ═══════════════════════════════════════════════════════════════════════════════
 * 9 Anthropic-format tool definitions + unified executor with S3 upload.
 *
 * Architecture:
 *   1. ARCHIVE_TOOL_DEFINITIONS — LLM-readable tool schemas (input_schema)
 *   2. executeArchiveTool()     — Routes to archiveEngine, handles S3/file path
 *   3. isArchiveTool()          — Helper for canvas.js routing
 *
 * Follows identical pattern to imageTools.js / videoTools.js:
 *   Backend defines tools → LLM decides → Backend executes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  createArchive,
  extractArchive,
  editArchive,
  inspectArchive,
  securityCheck,
  bulkArchive,
  convertArchive,
  searchArchive,
  deployArchive,
  coreArchive,
  structureArchive,
  intelligenceArchive,
  getArchiveCapabilities,
} from './archiveEngine.js';

import {
  uploadImage as uploadToS3,
  isConfigured as s3Configured,
} from './imageStorage.js';


// ═══════════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — Anthropic function-calling format
// ═══════════════════════════════════════════════════════════════════════════════

export const ARCHIVE_TOOL_DEFINITIONS = [

  // ─── 1. ARCHIVE CREATE ─────────────────────────────────────────────────────
  {
    name: 'archive_create',
    description: `Create ZIP, TAR, or TAR.GZ archives from files or directories. Split large archives into parts, or merge multi-part archives back together.

Actions:
- create: Create a new archive from files/directories with compression control
- split: Split a large file into N parts of specified size
- merge: Merge multi-part files back into one

Supported formats: zip, tar, tar.gz
Compression levels: 0 (store/no compression) to 9 (maximum compression)

USE THIS WHEN the user says: "zip this", "create archive", "compress these files", "package this folder", "tar it up", "split this file", "merge parts"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'split', 'merge'],
          description: 'Archive creation action',
        },
        sourcePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file/directory paths to include in archive',
        },
        sourceDir: {
          type: 'string',
          description: 'Directory to archive (alternative to sourcePaths)',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path (auto-generated if omitted)',
        },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz'],
          description: 'Archive format (default: zip)',
        },
        compressionLevel: {
          type: 'integer',
          description: 'Compression level 0-9, 0=store, 9=max (default: 6)',
        },
        splitSize: {
          type: 'integer',
          description: 'Split size in bytes (for split action)',
        },
        partFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Part file paths to merge (for merge action)',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to exclude (e.g. ["node_modules", ".git"])',
        },
        comment: {
          type: 'string',
          description: 'Archive comment (ZIP only)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 2. ARCHIVE EXTRACT ────────────────────────────────────────────────────
  {
    name: 'archive_extract',
    description: `Extract archives of any format with safety checks. Supports ZIP, TAR, TAR.GZ, TAR.BZ2, 7z, and RAR (read-only).

Features:
- Filter by filename pattern (extract only matching files)
- Flatten directory structure to reduce nesting
- Normalize line endings (CRLF → LF)
- Auto-rename on conflict
- Path traversal protection built-in

USE THIS WHEN the user says: "extract this", "unzip", "unpack", "decompress", "open this archive", "extract only .js files"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file to extract',
        },
        outputDir: {
          type: 'string',
          description: 'Directory to extract into (auto-generated if omitted)',
        },
        fileFilter: {
          type: 'string',
          description: 'Only extract files matching this pattern/substring',
        },
        flattenDepth: {
          type: 'integer',
          description: 'Flatten directory depth (0=keep as-is, 1=remove top folder, etc.)',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing files (default: true)',
        },
        fixLineEndings: {
          type: 'boolean',
          description: 'Normalize CRLF → LF in text files (default: false)',
        },
        autoRename: {
          type: 'boolean',
          description: 'Auto-rename on filename conflicts (default: false)',
        },
      },
      required: ['inputPath'],
    },
  },

  // ─── 3. ARCHIVE EDIT ──────────────────────────────────────────────────────
  {
    name: 'archive_edit',
    description: `Edit files inside a ZIP archive without full extraction. Add, remove, replace, rename files, or patch text content (configs, .env, .json, .yaml) in-place.

Actions:
- add: Add new files to the archive
- remove: Remove entries by name
- replace: Replace file content (text or binary)
- patch: Find-and-replace text inside a file in the archive
- rename: Rename entries (fix paths, normalize names)

USE THIS WHEN the user says: "add file to zip", "remove from archive", "replace config in zip", "patch .env in archive", "rename files in zip", "fix paths inside zip", "edit file in archive"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the ZIP archive to edit',
        },
        action: {
          type: 'string',
          enum: ['add', 'remove', 'replace', 'patch', 'rename'],
          description: 'Edit action to perform',
        },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path on disk to add' },
              archivePath: { type: 'string', description: 'Path inside the archive' },
            },
          },
          description: 'Files to add (for add action)',
        },
        removeEntries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Entry names to remove (for remove action)',
        },
        replacements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              archivePath: { type: 'string', description: 'Entry path in archive' },
              newContent: { type: 'string', description: 'New text content' },
              newFilePath: { type: 'string', description: 'Path to replacement file on disk' },
            },
          },
          description: 'Replacements (for replace action)',
        },
        patches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              archivePath: { type: 'string', description: 'Entry path in archive' },
              find: { type: 'string', description: 'Text to find' },
              replace: { type: 'string', description: 'Replacement text' },
              isRegex: { type: 'boolean', description: 'Treat find as regex' },
            },
          },
          description: 'Text patches (for patch action)',
        },
        renames: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Current entry name' },
              to: { type: 'string', description: 'New entry name' },
            },
          },
          description: 'Renames (for rename action)',
        },
        outputPath: {
          type: 'string',
          description: 'Output path (overwrites input if omitted)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 4. ARCHIVE INSPECT ────────────────────────────────────────────────────
  {
    name: 'archive_inspect',
    description: `Inspect archive structure, validate expected layout, or check path normalization.

Actions:
- structure: Full structural analysis — file count, sizes, extensions, depth, directories, compression ratio
- validate: Check if expected files/directories exist — returns pass/fail with issues
- normalize_report: Report Windows separators, spaces, uppercase that need fixing

USE THIS WHEN the user says: "what's in this zip", "inspect archive", "list contents", "validate layout", "check structure", "what files are inside"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file',
        },
        action: {
          type: 'string',
          enum: ['structure', 'validate', 'normalize_report'],
          description: 'Inspection action',
        },
        expectedFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files that must exist (for validate)',
        },
        expectedDirs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Directories that must exist (for validate)',
        },
        namingRules: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regex pattern files must match' },
            allowSpaces: { type: 'boolean', description: 'Allow spaces in filenames' },
            allowUppercase: { type: 'boolean', description: 'Allow uppercase in filenames' },
          },
          description: 'Naming rules for validate/normalize',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 5. ARCHIVE SECURITY ──────────────────────────────────────────────────
  {
    name: 'archive_security',
    description: `Security scanning for archives. Detect zip bombs, path traversal, symlinks, dangerous executables, password protection, and size limits.

Actions:
- scan: Full security scan (6 checks: size, file count, bomb ratio, path traversal, symlinks, dangerous files)
- encrypt: Encrypt archive with password (requires zip or 7z CLI)
- detect_password: Check if archive is password-protected

USE THIS WHEN the user says: "is this zip safe", "security check", "scan for bombs", "detect password", "encrypt this archive", "check for malware", "is it safe to extract"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file',
        },
        action: {
          type: 'string',
          enum: ['scan', 'encrypt', 'detect_password'],
          description: 'Security action',
        },
        maxExtractSize: {
          type: 'integer',
          description: 'Max allowed uncompressed size in bytes (default: 2GB)',
        },
        maxFiles: {
          type: 'integer',
          description: 'Max allowed file count (default: 50000)',
        },
        bombRatio: {
          type: 'integer',
          description: 'Compression ratio threshold for bomb detection (default: 100)',
        },
        password: {
          type: 'string',
          description: 'Password for encryption (encrypt action)',
        },
        outputPath: {
          type: 'string',
          description: 'Output path for encrypted archive',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 6. ARCHIVE BULK ──────────────────────────────────────────────────────
  {
    name: 'archive_bulk',
    description: `Bulk archive operations — extract many archives at once, create archives from multiple dirs, deduplicate files, or auto-rename with conventions.

Actions:
- bulk_extract: Extract multiple archives to separate folders
- bulk_create: Create archives from multiple source directories
- deduplicate: Remove duplicate files from a ZIP (by name, hash, or both)
- auto_rename: Rename all files in archive to a naming convention (lowercase, snake_case, kebab_case)

USE THIS WHEN the user says: "extract all these zips", "batch zip", "remove duplicates", "rename all files to lowercase", "deduplicate", "bulk process", "process 100 archives"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['bulk_extract', 'bulk_create', 'deduplicate', 'auto_rename'],
          description: 'Bulk operation type',
        },
        inputPaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of archive or directory paths',
        },
        outputDir: {
          type: 'string',
          description: 'Output directory for results',
        },
        deduplicateBy: {
          type: 'string',
          enum: ['name', 'hash', 'both'],
          description: 'Deduplication method (default: name)',
        },
        rules: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              enum: ['lowercase', 'snake_case', 'kebab_case'],
              description: 'Naming pattern for auto_rename',
            },
          },
          description: 'Rules for bulk operations',
        },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz'],
          description: 'Output format for bulk_create (default: zip)',
        },
      },
      required: ['action', 'inputPaths'],
    },
  },

  // ─── 7. ARCHIVE CONVERT ────────────────────────────────────────────────────
  {
    name: 'archive_convert',
    description: `Convert between archive formats. ZIP ↔ TAR ↔ TAR.GZ ↔ 7z.

Extracts the source archive and repacks in the target format. Optionally normalizes line endings during conversion.

USE THIS WHEN the user says: "convert zip to tar", "change to tar.gz", "convert format", "repackage as zip"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the source archive',
        },
        targetFormat: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz', '7z'],
          description: 'Target archive format',
        },
        compressionLevel: {
          type: 'integer',
          description: 'Compression level 0-9 (default: 6)',
        },
        fixLineEndings: {
          type: 'boolean',
          description: 'Normalize CRLF → LF during conversion',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path',
        },
      },
      required: ['inputPath', 'targetFormat'],
    },
  },

  // ─── 8. ARCHIVE SEARCH ────────────────────────────────────────────────────
  {
    name: 'archive_search',
    description: `Content intelligence for archives. Find files, search text, detect project type, flag secrets, or get a full summary — all without extracting.

Actions:
- find_files: Find files matching a pattern (name/path substring)
- search_text: Search for text across all text files in the archive
- detect_project: Auto-detect project type (Node.js, Python, PHP, Java, Go, Rust, React, Docker, etc.)
- flag_secrets: Scan for API keys, passwords, tokens, private keys, .env files
- summarize: Get archive summary — file count, sizes, extensions, key file previews

USE THIS WHEN the user says: "what kind of project is this", "find .env files", "search for password", "scan for secrets", "summarize this archive", "find README", "what's in this zip", "is there a config file"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file',
        },
        action: {
          type: 'string',
          enum: ['find_files', 'search_text', 'detect_project', 'flag_secrets', 'summarize'],
          description: 'Search action',
        },
        pattern: {
          type: 'string',
          description: 'File name pattern to find (for find_files)',
        },
        searchText: {
          type: 'string',
          description: 'Text to search for (for search_text)',
        },
        isRegex: {
          type: 'boolean',
          description: 'Treat searchText as regex (default: false)',
        },
        maxResults: {
          type: 'integer',
          description: 'Max results to return (default: 50)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 9. ARCHIVE DEPLOY ────────────────────────────────────────────────────
  {
    name: 'archive_deploy',
    description: `Deployment packaging — create production-ready archives from project directories. Strip dev files, inject configs, optimize size, version-tag.

Actions:
- package: Create deployment archive from directory (auto-excludes node_modules, .git, __pycache__, etc.)
- inject: Inject config files (.env, .json, .yaml) into an existing archive
- strip: Remove dev/test files using presets (node_dev, python_dev, general) or custom patterns
- optimize: Remove junk files + re-compress for smaller size
- version: Copy archive with version tag in filename (e.g. app_v1.2.3.zip)

Strip presets:
- node_dev: Removes node_modules, tests, eslint, prettier, coverage, .vscode
- python_dev: Removes __pycache__, venv, pytest, mypy, tox, dist, build
- general: Removes .git, .svn, .DS_Store, Thumbs.db, logs, tmp, backups

USE THIS WHEN the user says: "package for deploy", "production zip", "strip dev files", "inject .env", "optimize archive", "prepare for upload", "version this zip", "clean and repackage", "make prod-ready"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to archive or source directory',
        },
        action: {
          type: 'string',
          enum: ['package', 'inject', 'strip', 'optimize', 'version'],
          description: 'Deploy action',
        },
        sourceDir: {
          type: 'string',
          description: 'Source directory to package (for package action)',
        },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz'],
          description: 'Output format (default: zip)',
        },
        configs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path inside archive for the config' },
              content: { type: 'string', description: 'Config file content' },
            },
          },
          description: 'Config files to inject (for inject action)',
        },
        stripPatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom patterns to strip',
        },
        stripPreset: {
          type: 'string',
          enum: ['node_dev', 'python_dev', 'general'],
          description: 'Preset strip rules',
        },
        versionTag: {
          type: 'string',
          description: 'Version string (for version action, e.g. "1.2.3")',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 10. ARCHIVE CORE ─────────────────────────────────────────────────────
  {
    name: 'archive_core',
    description: `All-in-one archive creation and extraction — create, extract, repack, rename, compress, split, and merge archives.

Actions:
- create: Create ZIP/TAR/TAR.GZ archives from files or directories
- extract: Extract any archive format with safety checks
- repack: Extract then re-archive in same or different format (re-compress, clean up)
- rename: Rename the archive file itself (not entries inside)
- compress: Re-compress an existing archive at a different compression level
- split: Split a large file into N parts of specified byte size
- merge: Merge multi-part files back into one

Supported formats: zip, tar, tar.gz, tar.bz2, 7z

USE THIS WHEN the user says: "zip this", "unzip", "create archive", "extract", "repack", "compress", "split file", "merge parts", "archive these files", "make a tar", "package folder"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'extract', 'repack', 'rename', 'compress', 'split', 'merge'],
          description: 'Core archive action',
        },
        inputPath: {
          type: 'string',
          description: 'Path to existing archive (for extract/repack/rename/compress/split)',
        },
        sourcePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'File/directory paths to include (for create)',
        },
        sourceDir: {
          type: 'string',
          description: 'Directory to archive (for create, alternative to sourcePaths)',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path (auto-generated if omitted)',
        },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz', 'tar.bz2', '7z'],
          description: 'Archive format (default: zip)',
        },
        compressionLevel: {
          type: 'integer',
          description: 'Compression level 0-9, 0=store, 9=max (default: 6)',
        },
        outputDir: {
          type: 'string',
          description: 'Extraction output directory (for extract/repack)',
        },
        newName: {
          type: 'string',
          description: 'New filename (for rename action)',
        },
        splitSize: {
          type: 'integer',
          description: 'Split size in bytes (for split action)',
        },
        partFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Part file paths to merge (for merge action)',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns to exclude (e.g. ["node_modules", ".git"])',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing files on extract (default: true)',
        },
      },
      required: ['action'],
    },
  },

  // ─── 11. ARCHIVE STRUCTURE ────────────────────────────────────────────────
  {
    name: 'archive_structure',
    description: `Inspect, validate, normalize, flatten, and nest archive directory structures — non-destructive analysis + restructuring.

Actions:
- inspect: Full structural analysis — file count, sizes, extensions, depth, directories, compression ratio
- validate: Check if expected files/dirs exist, verify naming rules — returns pass/fail with issues
- normalize: Fix Windows separators, remove spaces, lowercase filenames, strip macOS resource forks
- flatten: Remove nested wrapper directories (e.g. project-1.0/project/ → project/)
- nest: Wrap all entries under a new top-level directory

USE THIS WHEN the user says: "what's in this zip", "list contents", "validate layout", "check structure", "fix paths", "flatten nested folders", "normalize filenames", "wrap in folder", "remove double nesting"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file',
        },
        action: {
          type: 'string',
          enum: ['inspect', 'validate', 'normalize', 'flatten', 'nest'],
          description: 'Structure action to perform',
        },
        expectedFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files that must exist (for validate)',
        },
        expectedDirs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Directories that must exist (for validate)',
        },
        namingRules: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regex pattern files must match' },
            allowSpaces: { type: 'boolean', description: 'Allow spaces in filenames (default: true)' },
            allowUppercase: { type: 'boolean', description: 'Allow uppercase (default: true)' },
          },
          description: 'Naming rules for validate/normalize',
        },
        flattenDepth: {
          type: 'integer',
          description: 'Number of directory levels to flatten (default: 1)',
        },
        nestDir: {
          type: 'string',
          description: 'Directory name to nest entries under (for nest action)',
        },
        fixLineEndings: {
          type: 'boolean',
          description: 'Normalize CRLF → LF in text files (default: false)',
        },
        stripMacMetadata: {
          type: 'boolean',
          description: 'Remove __MACOSX and .DS_Store entries (default: true)',
        },
        outputPath: {
          type: 'string',
          description: 'Output path for modified archive (overwrites input if omitted)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },

  // ─── 12. ARCHIVE INTELLIGENCE ─────────────────────────────────────────────
  {
    name: 'archive_intelligence',
    description: `AI-powered archive analysis — summarize contents, find files, search text, generate README, detect project type, and scan for secrets.

Actions:
- summarize: AI-generated summary of archive contents (file types, structure, purpose, key files)
- find: Find files matching a name/path pattern inside the archive
- search: Full-text search across all text files in the archive
- readme: Auto-generate a README.md based on archive contents and project structure
- detect: Auto-detect project type (Node.js, Python, PHP, Java, Go, Rust, React, Docker, etc.)
- secrets: Scan for API keys, passwords, tokens, private keys, .env files, credentials

USE THIS WHEN the user says: "what is this project", "summarize the zip", "find config files", "search for password", "scan for secrets", "generate readme", "detect project type", "what kind of app is this", "analyze this archive"`,
    input_schema: {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'Path to the archive file',
        },
        action: {
          type: 'string',
          enum: ['summarize', 'find', 'search', 'readme', 'detect', 'secrets'],
          description: 'Intelligence action to perform',
        },
        pattern: {
          type: 'string',
          description: 'File name/path pattern to find (for find action)',
        },
        searchText: {
          type: 'string',
          description: 'Text to search for across all files (for search action)',
        },
        isRegex: {
          type: 'boolean',
          description: 'Treat searchText as regex (default: false)',
        },
        maxResults: {
          type: 'integer',
          description: 'Max results to return (default: 50)',
        },
        readmeTemplate: {
          type: 'string',
          enum: ['minimal', 'standard', 'detailed'],
          description: 'README template style (for readme action, default: standard)',
        },
        includeFilePreview: {
          type: 'boolean',
          description: 'Include previews of key files in summary (default: true)',
        },
      },
      required: ['inputPath', 'action'],
    },
  },
];


// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR — Routes tool calls to engine, handles S3 upload
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute an archive tool call from the LLM.
 * Returns { result: string, sideEffects?: object }
 *
 * @param {string} toolName — e.g. 'archive_create'
 * @param {object} input — from LLM tool_use block
 * @param {object} ctx — { userId, appId, tempDir }
 * @returns {{ result: string, sideEffects?: object }}
 */
export async function executeArchiveTool(toolName, input, ctx = {}) {
  try {
    log.info(`[ArchiveTools] Executing ${toolName}`, JSON.stringify(input).slice(0, 200));

    let result;

    switch (toolName) {
      case 'archive_create':
        result = await createArchive(input);
        break;

      case 'archive_extract':
        result = await extractArchive(input.inputPath, input);
        break;

      case 'archive_edit':
        result = await editArchive(input.inputPath, input);
        break;

      case 'archive_inspect':
        result = await inspectArchive(input.inputPath, input);
        break;

      case 'archive_security':
        result = await securityCheck(input.inputPath, input);
        break;

      case 'archive_bulk':
        result = await bulkArchive(input);
        break;

      case 'archive_convert':
        result = await convertArchive(input.inputPath, input);
        break;

      case 'archive_search':
        result = await searchArchive(input.inputPath, input);
        break;

      case 'archive_deploy':
        result = await deployArchive(input.inputPath, input);
        break;

      case 'archive_core':
        result = await coreArchive(input);
        break;

      case 'archive_structure':
        result = await structureArchive(input.inputPath, input);
        break;

      case 'archive_intelligence':
        result = await intelligenceArchive(input.inputPath, input);
        break;

      default:
        return { result: JSON.stringify({ error: `Unknown archive tool: ${toolName}` }) };
    }

    // ── Build side effects for frontend SSE ──

    const sideEffects = {};
    const useS3 = s3Configured();

    // If result has an outputPath with a buffer-bearing archive, upload to S3
    if (result && result.outputPath) {
      sideEffects.type = 'archive_processed';
      sideEffects.outputPath = result.outputPath;
      sideEffects.operation = result.operation || toolName.replace('archive_', '');
      sideEffects.format = result.format || 'zip';

      if (result.size) sideEffects.size = result.size;
      if (result.sizeFormatted) sideEffects.sizeFormatted = result.sizeFormatted;
      if (result.entryCount !== undefined) sideEffects.entryCount = result.entryCount;

      // Upload archive to S3 if configured and file exists
      if (useS3 && result.outputPath) {
        try {
          const archiveBuffer = await import('fs/promises').then(f => f.readFile(result.outputPath));
          const ext = result.format || 'zip';
          const uploaded = await uploadToS3(archiveBuffer, {
            format: ext,
            prefix: 'archives',
            contentType: ext === 'zip' ? 'application/zip' : ext === 'tar' ? 'application/x-tar' : 'application/gzip',
          });
          sideEffects.archiveUrl = uploaded.url;
          sideEffects.s3Key = uploaded.key;
          sideEffects.expiresAt = uploaded.expiresAt;
          // Add URL to result for LLM context
          result.archiveUrl = uploaded.url;
        } catch (uploadErr) {
          log.warn('[ArchiveTools] S3 upload failed:', uploadErr.message);
          // Non-fatal — keep file path
        }
      }
    }

    // Bulk results with multiple output paths
    if (result && result.results && Array.isArray(result.results)) {
      sideEffects.type = sideEffects.type || 'archive_batch';
      sideEffects.operation = result.operation || result.method || 'bulk';
      sideEffects.resultCount = result.results.length;
      sideEffects.succeeded = result.succeeded || result.results.filter(r => r.status === 'success').length;
      sideEffects.failed = result.failed || result.results.filter(r => r.status === 'error').length;
    }

    // Search/inspect results (metadata-only, no file output)
    if (result && !result.outputPath && !result.results) {
      sideEffects.type = sideEffects.type || 'archive_info';
      sideEffects.operation = result.operation || result.method || toolName.replace('archive_', '');
      if (result.fileCount !== undefined) sideEffects.fileCount = result.fileCount;
      if (result.findingCount !== undefined) sideEffects.findingCount = result.findingCount;
      if (result.safe !== undefined) sideEffects.safe = result.safe;
      if (result.message) sideEffects.message = result.message;
    }

    return {
      result: JSON.stringify(result, null, 2),
      sideEffects: Object.keys(sideEffects).length > 0 ? sideEffects : undefined,
    };
  } catch (err) {
    log.error(`[ArchiveTools] ${toolName} error:`, err.message);
    return {
      result: JSON.stringify({ error: err.message, tool: toolName }),
    };
  }
}

/**
 * Check if a tool name is an archive tool.
 */
export function isArchiveTool(name) {
  return name.startsWith('archive_');
}

export default { ARCHIVE_TOOL_DEFINITIONS, executeArchiveTool, isArchiveTool };
