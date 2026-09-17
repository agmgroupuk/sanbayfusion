/**
 * CANVAS IDE TOOL DEFINITIONS
 * 
 * Tools the LLM can natively call during canvas-studio conversations.
 * Following the rule: Backend defines tools → Model chooses → Backend executes
 *
 * These are in OpenAI-format (also compatible with Anthropic via input_schema mapping).
 */

export const CANVAS_IDE_TOOLS = [
  // ──────────────────────────────────────────────
  // FILE OPERATIONS — manipulate the virtual project
  // ──────────────────────────────────────────────
  {
    name: 'update_file',
    description: 'Update (or create) a file in the project. Use this to write HTML, CSS, JS, or any project file. If the file exists it will be overwritten; if not it will be created.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path within the project, e.g. "/index.html", "/styles.css", "/app.js", "/components/header.html"',
        },
        content: {
          type: 'string',
          description: 'The complete file content to write',
        },
        description: {
          type: 'string',
          description: 'Brief one-line description of what changed (for the user)',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the current contents of a project file. Use when you need to see what the current code looks like before making changes.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read, e.g. "/index.html"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the project.',
    parameters: {
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
    description: 'List all files currently in the project with their sizes. Use to see the project structure before making changes.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'rename_file',
    description: 'Rename a file, move it to a different folder, or change its extension. Examples: rename "/old.js" to "/new.js", move "/app.js" to "/src/app.js", change extension "/style.css" to "/style.scss".',
    parameters: {
      type: 'object',
      properties: {
        oldPath: {
          type: 'string',
          description: 'Current file path, e.g. "/old-name.js"',
        },
        newPath: {
          type: 'string',
          description: 'New file path, e.g. "/new-name.js" or "/src/new-name.ts"',
        },
      },
      required: ['oldPath', 'newPath'],
    },
  },
  {
    name: 'copy_file',
    description: 'Copy a file to a new path. The original file is kept. Use to duplicate files or create variants.',
    parameters: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Path of the file to copy, e.g. "/index.html"',
        },
        destinationPath: {
          type: 'string',
          description: 'Path for the copy, e.g. "/about.html"',
        },
      },
      required: ['sourcePath', 'destinationPath'],
    },
  },
  {
    name: 'create_folder',
    description: 'Create a folder in the project. Use to organize files into directories like /src, /components, /styles, /assets.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Folder path to create, e.g. "/src", "/components", "/styles/themes"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'append_to_file',
    description: 'Append content to the end of an existing file without overwriting it. Use for adding new functions, CSS rules, log entries, or extending existing code.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to append to, e.g. "/styles.css"',
        },
        content: {
          type: 'string',
          description: 'Content to append at the end of the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'create_file',
    description: 'Create a new downloadable file with specified content. Use when user asks to create, write, or save a file for download.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Name of the file to create (e.g., "script.py", "notes.txt")' },
        content: { type: 'string', description: 'Content to write to the file' },
        folder: { type: 'string', description: 'Folder path (optional)' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'modify_file',
    description: 'Modify an existing file by replacing content or appending to it. Modes: replace (default), append.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Name or path of the file to modify' },
        content: { type: 'string', description: 'New content or content to append' },
        mode: { type: 'string', enum: ['replace', 'append'], description: 'Operation mode (default: replace)' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'move_file',
    description: 'Move a file from one location to another.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Current file path' },
        destination: { type: 'string', description: 'New file path' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'list_folders',
    description: 'List only folders/directories (not files). Use when user wants to see folder structure.',
    parameters: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Parent folder to list subfolders from' },
      },
    },
  },
  {
    name: 'zip_files',
    description: 'Compress files into a ZIP archive.',
    parameters: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'Array of file paths to compress' },
        output_name: { type: 'string', description: 'Name of the output ZIP file (default: archive.zip)' },
      },
      required: ['files'],
    },
  },
  {
    name: 'unzip_files',
    description: 'Extract files from a ZIP archive.',
    parameters: {
      type: 'object',
      properties: {
        zip_file: { type: 'string', description: 'Path to the ZIP file' },
        destination: { type: 'string', description: 'Folder to extract files to' },
      },
      required: ['zip_file'],
    },
  },

  // ──────────────────────────────────────────────
  // CODE EXECUTION — sandboxed
  // ──────────────────────────────────────────────
  {
    name: 'execute_code',
    description: 'Execute JavaScript or Python code in a sandboxed environment. Use for calculations, data processing, or testing logic.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to execute',
        },
        language: {
          type: 'string',
          enum: ['javascript', 'python'],
          description: 'Programming language',
          default: 'javascript',
        },
      },
      required: ['code'],
    },
  },

  // ──────────────────────────────────────────────
  // WEB & RESEARCH
  // ──────────────────────────────────────────────
  {
    name: 'web_search',
    description: 'Search the web for information, documentation, APIs, or code examples. Use when you need current information to build the app correctly.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description: 'Fetch and extract content from a URL. Use to read documentation, API specs, or reference content.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch content from',
        },
      },
      required: ['url'],
    },
  },

  // ──────────────────────────────────────────────
  // IMAGE GENERATION
  // ──────────────────────────────────────────────
  {
    name: 'generate_image',
    description: 'Generate an AI image for use in the project. Returns a URL that can be used in img tags or CSS.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate',
        },
        style: {
          type: 'string',
          enum: ['realistic', 'artistic', 'anime', 'digital-art', '3d-render', 'pixel-art'],
          description: 'Art style',
          default: 'realistic',
        },
        width: {
          type: 'number',
          description: 'Image width in pixels',
          default: 1024,
        },
        height: {
          type: 'number',
          description: 'Image height in pixels',
          default: 1024,
        },
      },
      required: ['prompt'],
    },
  },

  // ──────────────────────────────────────────────
  // CODE ANALYSIS
  // ──────────────────────────────────────────────
  {
    name: 'analyze_code',
    description: 'Analyze code for bugs, performance issues, security vulnerabilities, and improvements.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to analyze',
        },
        language: {
          type: 'string',
          description: 'Programming language (auto-detected if not specified)',
          default: 'auto',
        },
      },
      required: ['code'],
    },
  },

  // ──────────────────────────────────────────────
  // FORMAT CODE
  // ──────────────────────────────────────────────
  {
    name: 'format_code',
    description: 'Format/prettify code according to language standards.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code to format',
        },
        language: {
          type: 'string',
          description: 'Programming language (html, css, javascript, typescript, json, etc.)',
        },
      },
      required: ['code', 'language'],
    },
  },

  // ──────────────────────────────────────────────
  // EDITOR INTELLIGENCE — cursor, selection, file existence
  // ──────────────────────────────────────────────
  {
    name: 'file_exists',
    description: 'Check if a file exists in the project. Returns true/false without throwing errors. Use before read_file when you need a safe existence check.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to check, e.g. "/index.html"',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_selection',
    description: 'Get the currently selected text in the editor, including the file path, start/end positions, and the selected text content. Returns null if nothing is selected.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_cursor_position',
    description: 'Move the editor cursor to a specific line and column in a file. The file will be opened and focused if not already active.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to set cursor in, e.g. "/index.html"',
        },
        line: {
          type: 'number',
          description: 'Line number (1-based)',
        },
        column: {
          type: 'number',
          description: 'Column number (1-based)',
        },
      },
      required: ['path', 'line', 'column'],
    },
  },
  {
    name: 'replace_selection',
    description: 'Replace the currently selected text in the editor with new text. The selection must exist (use get_selection first to verify). This is a precision editing tool — use it when the user asks to change specific highlighted/selected code.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The replacement text to insert in place of the selection',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'insert_at_cursor',
    description: 'Insert text at the current cursor position without replacing anything. Use for adding new code at the cursor location.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to insert at the cursor position',
        },
      },
      required: ['text'],
    },
  },

  // ──────────────────────────────────────────────
  // MEMORY & STATE — persistent agent memory
  // ──────────────────────────────────────────────
  {
    name: 'save_memory',
    description: 'Save a key-value pair to persistent memory. Use to remember user preferences, project decisions, important facts, or any information that should persist across conversations. Keys are case-insensitive and overwrite existing values.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Memory key — descriptive name like "user_name", "preferred_framework", "project_goal", "color_scheme"',
        },
        value: {
          type: 'string',
          description: 'The value to store. Can be any text: a name, preference, JSON string, notes, etc.',
        },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'get_memory',
    description: 'Retrieve a previously saved memory by key. Returns the stored value or null if the key does not exist. Use to recall user preferences, decisions, or facts from earlier conversations.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Memory key to look up (case-insensitive)',
        },
      },
      required: ['key'],
    },
  },
  {
    name: 'clear_memory',
    description: 'Clear all saved memories for this user-agent pair, or clear a specific key. Use when the user explicitly asks to forget something or reset.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Optional — specific key to delete. If omitted, ALL memories are cleared.',
        },
      },
    },
  },

  // ──────────────────────────────────────────────
  // PERMISSIONS & SAFETY — no restrictions, all auto-approved
  // ──────────────────────────────────────────────
  {
    name: 'request_approval',
    description: 'Notify the user of an action being taken. Always auto-approved — do NOT wait for a response. Proceed immediately after calling this.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Short action label, e.g. "Delete all CSS files", "Overwrite index.html", "Deploy to production"',
        },
        description: {
          type: 'string',
          description: 'Detailed explanation of what will happen if approved',
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Severity level — affects visual styling of the dialog (default: medium)',
        },
      },
      required: ['action', 'description'],
    },
  },
  {
    name: 'check_permission',
    description: 'Check whether an action is permitted. Always returns allowed: true — all actions are permitted with no restrictions.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to check: "read", "write", "delete", "execute", "deploy", "clear_memory", "overwrite"',
        },
      },
      required: ['action'],
    },
  },

  // ──────────────────────────────────────────────
  // UI / USER INTERACTION — messages and prompts
  // ──────────────────────────────────────────────
  {
    name: 'show_message',
    description: 'Show an informational message/notification to the user in the UI. Use for status updates, success confirmations, or helpful tips. The message appears as a toast/banner — it does NOT go into the chat.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The message text to display',
        },
        duration: {
          type: 'number',
          description: 'How long to show in milliseconds (default: 4000)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'show_warning',
    description: 'Show a warning message to the user. Use when something might be wrong or needs attention but is not an error. Displayed with a yellow/amber warning style.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The warning text to display',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'show_error',
    description: 'Show an error message to the user. Use when something failed or a critical issue was detected. Displayed with a red error style.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The error text to display',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'ask_user',
    description: 'Ask the user a question and wait for their response. Use when you need clarification, a choice between options, or confirmation. The question appears as a special prompt in the chat. The user\'s response will come back in the next conversation turn.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask the user',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional quick-reply options for the user to choose from (e.g. ["React", "Vue", "Svelte"])',
        },
      },
      required: ['question'],
    },
  },

  // ──────────────────────────────────────────────
  // AGENT CONTROL — mode switching and state
  // ──────────────────────────────────────────────
  {
    name: 'set_mode',
    description: 'Switch the agent operating mode. "chat" = conversational only (no file edits). "dev" = full development mode (read, write, execute, all tools). "review" = code review mode (read-only analysis, suggestions, no writes). The mode affects which tools are permitted.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['chat', 'dev', 'review'],
          description: 'The agent mode to switch to',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for the mode switch (shown to user)',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'get_agent_state',
    description: 'Get the current state of the agent: mode (chat/dev/review), active file, project file count, conversation length, and memory count. Use to understand context before taking actions.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'cancel_task',
    description: 'Cancel the current running task or operation. Use when the user says "stop", "cancel", "never mind", or when a task is taking too long. Returns a cancellation confirmation.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional reason for cancellation',
        },
      },
    },
  },

  // ══════════════════════════════════════════════
  // IMAGE PROCESSING (8 grouped tools)
  // ══════════════════════════════════════════════

  // ── image_create ──
  {
    name: 'image_create',
    description: 'Create new images from scratch: blank canvas, gradient, pattern (checkerboard/stripes/dots/grid), random noise, render SVG, text-to-image, or placeholder.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['blank', 'gradient', 'pattern', 'noise', 'from_svg', 'text_image', 'placeholder', 'sprite_sheet', 'drawing'], description: 'Creation action' },
        width: { type: 'number', description: 'Width in pixels (default: 800)' },
        height: { type: 'number', description: 'Height in pixels (default: 600)' },
        color: { type: 'string', description: 'Fill color hex (blank, placeholder)' },
        transparent: { type: 'boolean', description: 'Transparent background (blank, noise)' },
        from: { type: 'string', description: 'Gradient start color (gradient)' },
        to: { type: 'string', description: 'Gradient end color (gradient)' },
        direction: { type: 'string', enum: ['horizontal', 'vertical', 'diagonal', 'radial'], description: 'Gradient direction' },
        type: { type: 'string', enum: ['checkerboard', 'stripes', 'dots', 'grid'], description: 'Pattern type' },
        color1: { type: 'string', description: 'Pattern primary color' },
        color2: { type: 'string', description: 'Pattern secondary color' },
        cellSize: { type: 'number', description: 'Pattern cell size in pixels (default: 40)' },
        svg: { type: 'string', description: 'SVG markup string (from_svg)' },
        text: { type: 'string', description: 'Text content (text_image, placeholder label)' },
        fontSize: { type: 'number', description: 'Font size (text_image, default: 64)' },
        fontColor: { type: 'string', description: 'Text color (text_image)' },
        backgroundColor: { type: 'string', description: 'Background color (text_image)' },
        label: { type: 'string', description: 'Placeholder label text (default: WxH)' },
        sources: { type: 'array', items: { type: 'string' }, description: 'Array of image URLs for sprite_sheet' },
        columns: { type: 'number', description: 'Grid columns (sprite_sheet, default: sqrt of count)' },
        cellWidth: { type: 'number', description: 'Cell width in pixels (sprite_sheet, default: 128)' },
        cellHeight: { type: 'number', description: 'Cell height in pixels (sprite_sheet, default: 128)' },
        gap: { type: 'number', description: 'Gap between cells in pixels (sprite_sheet, default: 0)' },
        shapes: { type: 'array', items: { type: 'object' }, description: 'Array of shapes for drawing. Each: {type:rect|circle|ellipse|line|polygon|path|text, ...props}' },
        outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
      },
      required: ['action'],
    },
  },

  // ── image_transform ──
  {
    name: 'image_transform',
    description: 'Transform image geometry: resize, crop, rotate, flip, mirror, pad, trim, extend canvas, shrink canvas, skew/shear, auto-orient by EXIF, extract region, or flatten alpha.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL to transform' },
        action: { type: 'string', enum: ['resize', 'crop', 'rotate', 'flip', 'mirror', 'pad', 'trim', 'extend', 'shrink', 'skew', 'auto_orient', 'extract_region', 'flatten'], description: 'Transformation to apply' },
        width: { type: 'number', description: 'Target width (resize, crop, shrink, extract_region)' },
        height: { type: 'number', description: 'Target height (resize, crop, shrink, extract_region)' },
        fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'], description: 'Resize fit mode (default: cover)' },
        angle: { type: 'number', description: 'Rotation angle in degrees (rotate, default: 90)' },
        direction: { type: 'string', enum: ['horizontal', 'vertical', 'both'], description: 'Flip direction' },
        x: { type: 'number', description: 'Left offset (extract_region)' },
        y: { type: 'number', description: 'Top offset (extract_region)' },
        left: { type: 'number', description: 'Left offset/padding (crop, pad, extend, shrink)' },
        top: { type: 'number', description: 'Top offset/padding (crop, pad, extend, shrink)' },
        right: { type: 'number', description: 'Right padding (pad, extend)' },
        bottom: { type: 'number', description: 'Bottom padding (pad, extend)' },
        padding: { type: 'number', description: 'Uniform padding (pad)' },
        background: { type: 'string', description: 'Background color hex (pad, rotate, extend, skew, flatten)' },
        threshold: { type: 'number', description: 'Trim threshold (default: 10)' },
        skewX: { type: 'number', description: 'Horizontal skew in degrees (skew)' },
        skewY: { type: 'number', description: 'Vertical skew in degrees (skew)' },
        outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
      },
      required: ['source', 'action'],
    },
  },

  // ── image_filter ──
  {
    name: 'image_filter',
    description: 'Apply visual filters and effects: grayscale, sepia, invert, brightness/contrast/hue/saturation, gamma, blur, sharpen, tint, noise reduction, normalize, threshold, pixelate, vignette, emboss, edge detect, posterize, vintage, cinematic, CLAHE, custom color matrix, blur region, motion blur, or color grading LUT presets.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL' },
        action: { type: 'string', enum: ['grayscale', 'sepia', 'invert', 'modulate', 'brightness', 'contrast', 'hue_saturation', 'gamma', 'blur', 'sharpen', 'tint', 'noise_reduce', 'normalize', 'threshold', 'pixelate', 'vignette', 'emboss', 'edge_detect', 'posterize', 'vintage', 'cinematic', 'clahe', 'color_matrix', 'blur_region', 'motion_blur', 'lut'], description: 'Filter to apply' },
        value: { type: 'number', description: 'Primary value: brightness multiplier (default 1.2), contrast (default 1.5), gamma (default 2.2), blur sigma (default 3), threshold (default 128)' },
        intensity: { type: 'number', description: 'Sepia intensity 0-1 (default: 1.0)' },
        brightness: { type: 'number', description: 'Brightness 0-10 (modulate, 1=no change)' },
        saturation: { type: 'number', description: 'Saturation 0-10 (modulate/hue_saturation, 1=no change)' },
        hue: { type: 'number', description: 'Hue rotation 0-360 degrees (modulate/hue_saturation)' },
        sigma: { type: 'number', description: 'Blur/sharpen sigma' },
        color: { type: 'string', description: 'Tint color hex (tint)' },
        size: { type: 'number', description: 'Pixel block size (pixelate, default 10) or median filter size (noise_reduce, default 3)' },
        darkness: { type: 'number', description: 'Vignette darkness 0-1 (default: 0.6)' },
        levels: { type: 'number', description: 'Posterize levels 2-16 (default: 4)' },
        barHeight: { type: 'number', description: 'Cinematic letterbox bar height (default: 10% of height)' },
        matrix: { type: 'array', description: 'Custom 3x3 color recombination matrix as [[r,g,b],[r,g,b],[r,g,b]] (color_matrix)' },
        x: { type: 'number', description: 'Region top-left X (blur_region)' },
        y: { type: 'number', description: 'Region top-left Y (blur_region)' },
        regionWidth: { type: 'number', description: 'Region width (blur_region)' },
        regionHeight: { type: 'number', description: 'Region height (blur_region)' },
        angle: { type: 'number', description: 'Motion blur angle in degrees (motion_blur, default: 0)' },
        distance: { type: 'number', description: 'Motion blur distance in pixels (motion_blur, default: 20)' },
        preset: { type: 'string', enum: ['warm', 'cool', 'noir', 'sunset', 'teal_orange', 'matte', 'forest', 'candy'], description: 'Color grading preset (lut)' },
        outputFormat: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif'], description: 'Output format' },
      },
      required: ['source', 'action'],
    },
  },

  // ── image_optimize ──
  {
    name: 'image_optimize',
    description: 'Optimize images: compress (with size targeting), convert format (PNG/JPEG/WEBP/AVIF/TIFF), strip metadata, generate responsive variants, thumbnails, progressive encoding, color space conversion, flatten alpha, create icon set, export to PDF, or create animated GIF from frames.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL' },
        action: { type: 'string', enum: ['compress', 'convert', 'strip_metadata', 'responsive', 'thumbnail', 'progressive', 'color_space', 'flatten_alpha', 'ico', 'to_pdf', 'to_gif'], description: 'Optimization action' },
        format: { type: 'string', enum: ['png', 'jpeg', 'webp', 'avif', 'tiff'], description: 'Target format' },
        quality: { type: 'number', description: 'Quality 1-100' },
        maxSizeKB: { type: 'number', description: 'Max file size in KB (compress — auto-reduces quality)' },
        width: { type: 'number', description: 'Thumbnail width (default: 200)' },
        height: { type: 'number', description: 'Thumbnail height (default: 200)' },
        space: { type: 'string', description: 'Target color space: srgb, rgb, cmyk, lab, b-w (color_space)' },
        background: { type: 'string', description: 'Background color for alpha flattening (flatten_alpha, default: #ffffff)' },
        sizes: { type: 'array', description: 'Icon sizes array e.g. [16,32,64,128,256] (ico)' },
        margin: { type: 'number', description: 'Page margin for to_pdf (default: 40)' },
        pageWidth: { type: 'number', description: 'PDF page width (default: image width)' },
        pageHeight: { type: 'number', description: 'PDF page height (default: image height)' },
        frames: { type: 'array', items: { type: 'string' }, description: 'Array of image URLs (to_gif)' },
        delay: { type: 'number', description: 'Frame delay in ms (to_gif, default: 200)' },
        repeat: { type: 'number', description: 'GIF loop count, 0=infinite (to_gif, default: 0)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── image_compose ──
  {
    name: 'image_compose',
    description: 'Compose images: text overlay (multi-line, positioned, with stroke/background), watermark (text/image, tiled), overlay with blend modes, merge multiple images (H/V/grid), add border, drop shadow, or decorative frame.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Primary image URL or data URL' },
        action: { type: 'string', enum: ['text_overlay', 'watermark', 'overlay', 'merge', 'border', 'shadow', 'frame'], description: 'Composition action' },
        text: { type: 'string', description: 'Text content (text_overlay, watermark). Use \\n for newlines.' },
        fontSize: { type: 'number', description: 'Font size in pixels (default: 48)' },
        fontColor: { type: 'string', description: 'Text color hex (default: #ffffff)' },
        fontFamily: { type: 'string', description: 'Font family (default: sans-serif)' },
        position: { type: 'string', enum: ['center', 'top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center'], description: 'Position (default: center)' },
        opacity: { type: 'number', description: 'Opacity 0-1 (watermark, overlay)' },
        overlay: { type: 'string', description: 'Second image URL (watermark image, overlay)' },
        scale: { type: 'number', description: 'Watermark scale (default: 0.2)' },
        tiled: { type: 'boolean', description: 'Tile watermark across image' },
        angle: { type: 'number', description: 'Tiled watermark angle (default: -30)' },
        blendMode: { type: 'string', enum: ['over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'hard-light', 'soft-light', 'difference'], description: 'Blend mode' },
        sources: { type: 'array', items: { type: 'string' }, description: 'Additional images for merge' },
        layout: { type: 'string', enum: ['horizontal', 'vertical', 'grid'], description: 'Merge layout' },
        gap: { type: 'number', description: 'Gap between merged images (px)' },
        background: { type: 'string', description: 'Background color (merge canvas)' },
        backgroundColor: { type: 'string', description: 'Background behind text overlay' },
        borderWidth: { type: 'number', description: 'Border width in px (border, default: 5)' },
        color: { type: 'string', description: 'Border/shadow color (default: #000000)' },
        offset: { type: 'number', description: 'Shadow offset pixels (default: 8)' },
        offsetX: { type: 'number', description: 'Shadow X offset' },
        offsetY: { type: 'number', description: 'Shadow Y offset' },
        blur: { type: 'number', description: 'Shadow blur radius (default: 10)' },
        thickness: { type: 'number', description: 'Frame thickness (default: 20)' },
        outerColor: { type: 'string', description: 'Frame outer color (default: #333333)' },
        innerColor: { type: 'string', description: 'Frame inner color (default: #ffffff)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── image_background ──
  {
    name: 'image_background',
    description: 'Background operations: auto-remove (solid color detection), replace with color/image, chroma key (make specific color transparent), blur background keeping subject sharp, replace with gradient, or AI-powered background removal via Remove.bg.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL' },
        action: { type: 'string', enum: ['remove', 'replace', 'make_transparent', 'blur_background', 'gradient_background', 'ai_remove'], description: 'Background action' },
        threshold: { type: 'number', description: 'Color distance threshold (default: 30)' },
        color: { type: 'string', description: 'Target color hex to make transparent (default: #ffffff)' },
        newBackground: { type: 'string', description: 'Replacement — hex color or image URL (replace)' },
        blur: { type: 'number', description: 'Blur sigma for blur_background (default: 15)' },
        x: { type: 'number', description: 'Subject region left (blur_background, default: 20% of width)' },
        y: { type: 'number', description: 'Subject region top (blur_background, default: 20% of height)' },
        regionWidth: { type: 'number', description: 'Subject region width (blur_background, default: 60% of width)' },
        regionHeight: { type: 'number', description: 'Subject region height (blur_background, default: 60% of height)' },
        from: { type: 'string', description: 'Gradient start color (gradient_background)' },
        to: { type: 'string', description: 'Gradient end color (gradient_background)' },
        direction: { type: 'string', enum: ['horizontal', 'vertical', 'diagonal', 'radial'], description: 'Gradient direction (gradient_background)' },
        size: { type: 'string', enum: ['auto', 'preview', 'full', '4k'], description: 'Output size for ai_remove (default: auto)' },
        type: { type: 'string', enum: ['auto', 'person', 'product', 'car'], description: 'Subject type hint for ai_remove (default: auto)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── image_analyze ──
  {
    name: 'image_analyze',
    description: 'Analyze images: metadata, validate against rules, dominant colors, channel stats, histogram, perceptual hash (for dedup), compare similarity, aspect ratio check, corruption detection, ICC profile info, convert to ASCII art, extract as base64, read/write EXIF metadata, strip GPS data, or trace raster to SVG vector.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL' },
        action: { type: 'string', enum: ['metadata', 'validate', 'dominant_colors', 'stats', 'histogram', 'hash', 'compare', 'aspect_check', 'corruption_check', 'profile', 'to_ascii', 'to_base64', 'read_exif', 'write_exif', 'strip_gps', 'to_svg_trace'], description: 'Analysis action (default: metadata)' },
        maxWidth: { type: 'number', description: 'Max allowed width (validate)' },
        maxHeight: { type: 'number', description: 'Max allowed height (validate)' },
        minWidth: { type: 'number', description: 'Min required width (validate)' },
        minHeight: { type: 'number', description: 'Min required height (validate)' },
        maxSizeKB: { type: 'number', description: 'Max file size in KB (validate)' },
        allowedFormats: { type: 'array', items: { type: 'string' }, description: 'Allowed formats (validate)' },
        aspectRatio: { type: 'string', description: 'Required aspect ratio like 16:9 (validate)' },
        count: { type: 'number', description: 'Number of dominant colors (default: 5)' },
        target: { type: 'string', description: 'Second image URL for similarity comparison (compare)' },
        columns: { type: 'number', description: 'ASCII art columns (default: 80)' },
        rows: { type: 'number', description: 'ASCII art rows (default: 32)' },
        format: { type: 'string', description: 'Output format (to_base64)' },
        artist: { type: 'string', description: 'EXIF artist field (write_exif)' },
        copyright: { type: 'string', description: 'EXIF copyright field (write_exif)' },
        description: { type: 'string', description: 'EXIF image description (write_exif)' },
        software: { type: 'string', description: 'EXIF software field (write_exif)' },
        dateTime: { type: 'string', description: 'EXIF date/time string (write_exif)' },
        userComment: { type: 'string', description: 'EXIF user comment (write_exif)' },
        stripGPS: { type: 'boolean', description: 'Strip GPS data (write_exif, strip_gps)' },
        threshold: { type: 'number', description: 'Trace threshold 0-255 (to_svg_trace, default: 128)' },
        steps: { type: 'number', description: 'Posterize steps (to_svg_trace, default: 4)' },
      },
      required: ['source'],
    },
  },

  // ── image_batch ──
  {
    name: 'image_batch',
    description: 'Process multiple images with the same operation. Applies any image tool action to all provided sources in sequence with partial-failure support.',
    parameters: {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'string' }, description: 'Array of image URLs or data URLs' },
        tool: { type: 'string', enum: ['create', 'transform', 'filter', 'optimize', 'compose', 'background', 'analyze'], description: 'Which image tool to use' },
        action: { type: 'string', description: 'Action to perform (resize, compress, grayscale, etc.)' },
        width: { type: 'number', description: 'Width parameter' },
        height: { type: 'number', description: 'Height parameter' },
        format: { type: 'string', description: 'Output format' },
        quality: { type: 'number', description: 'Quality 1-100' },
        maxSizeKB: { type: 'number', description: 'Max size in KB' },
        fit: { type: 'string', description: 'Resize fit mode' },
        threshold: { type: 'number', description: 'Threshold value' },
        value: { type: 'number', description: 'Filter value (brightness, contrast, etc.)' },
      },
      required: ['sources', 'tool', 'action'],
    },
  },

  // ══════════════════════════════════════════════
  // AI IMAGE ANALYSIS (Azure Computer Vision)
  // ══════════════════════════════════════════════

  // ── image_ai ──
  {
    name: 'image_ai',
    description: 'AI-powered image analysis using Azure Computer Vision. Extract text (OCR), generate captions, auto-tag, detect objects/people, check NSFW content, get smart crop suggestions, or run full analysis. Requires cloud API — use for understanding image CONTENT, not pixel manipulation.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image URL or data URL to analyze' },
        action: {
          type: 'string',
          enum: ['ocr', 'describe', 'tags', 'objects', 'people', 'nsfw_check', 'smart_crop', 'full_analysis'],
          description: 'AI analysis action: ocr (extract text), describe (generate caption), tags (auto-tag), objects (detect objects with bounding boxes), people (detect people), nsfw_check (adult content detection), smart_crop (AI crop suggestions), full_analysis (everything)',
        },
        language: { type: 'string', description: 'Language code for OCR/captions (e.g. en, zh-Hans, ja, ko, fr, de, es). Default: en' },
        genderNeutral: { type: 'boolean', description: 'Use gender-neutral captions (describe)' },
        minConfidence: { type: 'number', description: 'Minimum confidence threshold for tags 0-1 (default: 0.5)' },
        aspectRatios: { type: 'string', description: 'Comma-separated aspect ratios for smart crop (e.g. "1.0,1.78,0.56" = 1:1, 16:9, 9:16)' },
      },
      required: ['source', 'action'],
    },
  },

  // ══════════════════════════════════════════════
  // VIDEO PROCESSING (11 grouped tools — FFmpeg)
  // ══════════════════════════════════════════════

  // ── video_trim ──
  {
    name: 'video_trim',
    description: 'Cut and trim videos: trim to start/end timestamps, cut silence (auto-detect), remove dead segments (silence + low motion), scene split (detect & split on scene changes), or auto bounds (remove black frames at start/end).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL (http/https)' },
        action: { type: 'string', enum: ['trim', 'cut_silence', 'remove_dead', 'scene_split', 'auto_bounds'], description: 'Trim action' },
        start: { type: 'number', description: 'Start time in seconds (trim)' },
        end: { type: 'number', description: 'End time in seconds (trim)' },
        noise: { type: 'number', description: 'Silence detection noise floor in dB (cut_silence: -30, remove_dead: -35)' },
        minSilence: { type: 'number', description: 'Minimum silence duration in seconds (cut_silence, default: 0.5)' },
        threshold: { type: 'number', description: 'Scene change threshold 0-1 (scene_split, default: 0.3)' },
        split: { type: 'boolean', description: 'Actually split into separate files (scene_split, default: false = detect only)' },
        maxScenes: { type: 'number', description: 'Max scenes to output (scene_split, default: 20)' },
        sceneThreshold: { type: 'number', description: 'Motion threshold (remove_dead, default: 0.01)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_highlights ──
  {
    name: 'video_highlights',
    description: 'Extract highlights from videos: extract_clips (at specified timestamps), create_shorts (auto vertical 9:16 segments), best_moments (detect high-energy audio peaks), energy_clip (single highest-energy segment), or topic_clip (extract by topic — provide timestamps from transcription).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['extract_clips', 'create_shorts', 'best_moments', 'energy_clip', 'topic_clip'], description: 'Highlights action' },
        clips: { type: 'array', items: { type: 'object' }, description: 'Array of {start, end, label?} objects (extract_clips, topic_clip)' },
        count: { type: 'number', description: 'Number of shorts/moments to generate (create_shorts: 3, best_moments: 5)' },
        duration: { type: 'number', description: 'Duration per clip in seconds (create_shorts: 60, best_moments: 15, energy_clip: 30)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_resize ──
  {
    name: 'video_resize',
    description: 'Resize videos for platforms: youtube (1920×1080 16:9), reels (1080×1920 9:16), tiktok (1080×1920 9:16), instagram (1080×1080 1:1), custom (any dimensions with fit modes), or smart_crop (face-aware intelligent crop using Azure Vision).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['youtube', 'reels', 'tiktok', 'instagram', 'custom', 'smart_crop'], description: 'Platform or resize mode' },
        width: { type: 'number', description: 'Custom width (custom, smart_crop)' },
        height: { type: 'number', description: 'Custom height (custom, smart_crop)' },
        background: { type: 'string', description: 'Background fill: color name or "blur" for blurred fill (default: black)' },
        fit: { type: 'string', enum: ['contain', 'cover', 'fill'], description: 'Fit mode for custom resize (default: contain)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_captions ──
  {
    name: 'video_captions',
    description: 'Add captions and subtitles: transcribe (extract audio for speech-to-text), burn (burn SRT subtitles or text into video), highlight_words (colored word highlighting), emoji (decorative emoji-style captions), or translate (placeholder — use burn with translated SRT).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['transcribe', 'burn', 'highlight_words', 'emoji', 'translate'], description: 'Caption action' },
        subtitles: { type: 'string', description: 'SRT subtitle content to burn (burn, highlight_words)' },
        srtUrl: { type: 'string', description: 'URL to .srt file (burn, highlight_words)' },
        text: { type: 'string', description: 'Simple text to overlay (burn, emoji)' },
        fontSize: { type: 'number', description: 'Font size (default: 24-36)' },
        fontColor: { type: 'string', description: 'Font color (default: white)' },
        bgColor: { type: 'string', description: 'Background color for subtitles' },
        highlightColor: { type: 'string', description: 'Highlight color (highlight_words, default: yellow)' },
        start: { type: 'number', description: 'Text start time in seconds (burn with text)' },
        end: { type: 'number', description: 'Text end time in seconds (burn with text)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_style ──
  {
    name: 'video_style',
    description: 'Apply cinematic styles and color grading: cinematic (letterbox + grain + contrast), vlog (bright warm), podcast (clean sharp), color_correct (auto histogram normalize), lut (apply .cube LUT file), tone (preset: warm/cool/dark/bright), dark (moody), or warm/cool color shifts.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['cinematic', 'vlog', 'podcast', 'color_correct', 'lut', 'tone', 'dark', 'bright', 'warm', 'cool'], description: 'Style to apply' },
        intensity: { type: 'number', description: 'Effect intensity 0-2 (default: 1.0)' },
        letterbox: { type: 'boolean', description: 'Add letterbox bars (cinematic, default: true)' },
        barHeight: { type: 'number', description: 'Letterbox bar height in px (cinematic)' },
        grain: { type: 'boolean', description: 'Add film grain (cinematic, default: true)' },
        lutUrl: { type: 'string', description: 'URL to .cube LUT file (lut action)' },
        preset: { type: 'string', enum: ['warm', 'cool', 'dark', 'bright', 'cinematic', 'vlog'], description: 'Tone preset (tone action)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_overlay ──
  {
    name: 'video_overlay',
    description: 'Add text and graphic overlays: title (centered title card), hook (attention-grabbing text at top), lower_third (speaker name/title bar), watermark (image or text with position/opacity), or brand (branded intro bar with name + tagline).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['title', 'hook', 'lower_third', 'watermark', 'brand'], description: 'Overlay type' },
        text: { type: 'string', description: 'Text content (title, hook, watermark text)' },
        name: { type: 'string', description: 'Speaker name (lower_third)' },
        title: { type: 'string', description: 'Speaker title (lower_third)' },
        brandName: { type: 'string', description: 'Brand name (brand)' },
        tagline: { type: 'string', description: 'Brand tagline (brand)' },
        brandColor: { type: 'string', description: 'Brand color hex (brand, default: #ffffff)' },
        image: { type: 'string', description: 'Image URL for watermark (watermark)' },
        fontSize: { type: 'number', description: 'Font size (default: 72 for title, 56 for hook)' },
        fontColor: { type: 'string', description: 'Font color (default: white/yellow)' },
        start: { type: 'number', description: 'Overlay start time in seconds (default: 0)' },
        end: { type: 'number', description: 'Overlay end time in seconds (default: 5-8)' },
        duration: { type: 'number', description: 'Duration in seconds (hook, default: 3)' },
        position: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], description: 'Watermark position (default: bottom-right)' },
        opacity: { type: 'number', description: 'Watermark opacity 0-1 (default: 0.3-0.5)' },
        scale: { type: 'number', description: 'Watermark image scale 0-1 (default: 0.15)' },
        margin: { type: 'number', description: 'Watermark margin in px (default: 20)' },
        showBackground: { type: 'boolean', description: 'Show dark background box behind title (default: true)' },
        bgColor: { type: 'string', description: 'Lower third background color (default: black@0.7)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_audio ──
  {
    name: 'video_audio',
    description: 'Audio processing: balance (EBU R128 loudness normalization), denoise (FFT noise reduction — light/medium/heavy), fade (audio + video fade in/out), add_music (mix background music with voice volume control), or beat_sync (placeholder — use add_music with manual timing).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['balance', 'denoise', 'fade', 'add_music', 'beat_sync'], description: 'Audio action' },
        targetLUFS: { type: 'number', description: 'Target loudness in LUFS (balance, default: -14)' },
        strength: { type: 'string', enum: ['light', 'medium', 'heavy'], description: 'Denoise strength (default: medium)' },
        fadeIn: { type: 'number', description: 'Fade in duration in seconds (fade, default: 2)' },
        fadeOut: { type: 'number', description: 'Fade out duration in seconds (fade, default: 2)' },
        videoFade: { type: 'boolean', description: 'Also fade video (fade, default: true)' },
        musicUrl: { type: 'string', description: 'URL to background music audio file (add_music)' },
        musicVolume: { type: 'number', description: 'Music volume 0-1 (add_music, default: 0.15)' },
        voiceVolume: { type: 'number', description: 'Voice volume 0-2 (add_music, default: 1.0)' },
        fadeMusic: { type: 'number', description: 'Music fade out duration in seconds (add_music, default: 3)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_face ──
  {
    name: 'video_face',
    description: 'Face and person operations: detect (find faces via Azure Vision frame sampling), blur (detect + blur face regions), blur_background (blur everything except center subject), track_crop (placeholder — use smart_crop), or focus_speaker (placeholder — detect then crop).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['detect', 'blur', 'blur_background', 'track_crop', 'focus_speaker'], description: 'Face action' },
        frames: { type: 'number', description: 'Number of frames to sample for detection (detect, default: 5)' },
        strength: { type: 'number', description: 'Blur strength (blur, default: 20)' },
        blur: { type: 'number', description: 'Background blur sigma (blur_background, default: 15)' },
        regionWidth: { type: 'number', description: 'Subject region width (blur_background)' },
        regionHeight: { type: 'number', description: 'Subject region height (blur_background)' },
        x: { type: 'number', description: 'Subject region X (blur_background)' },
        y: { type: 'number', description: 'Subject region Y (blur_background)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_moderate ──
  {
    name: 'video_moderate',
    description: 'Content moderation: nsfw (sample frames and check for adult/racy/gore content via Azure Vision), profanity (placeholder — transcribe first), copyright (placeholder — needs fingerprinting), or platform_safety (combined NSFW + duration + size check).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['nsfw', 'profanity', 'copyright', 'platform_safety'], description: 'Moderation action' },
        samples: { type: 'number', description: 'Number of frames to sample (nsfw, default: 10)' },
        maxDuration: { type: 'number', description: 'Max allowed duration in seconds (platform_safety, default: 3600)' },
        maxSizeMB: { type: 'number', description: 'Max allowed size in MB (platform_safety, default: 500)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── video_batch ──
  {
    name: 'video_batch',
    description: 'Process multiple videos through a pipeline of operations. Each video is processed through all steps sequentially; output of each step is input to the next. Great for applying the same editing pipeline to many clips.',
    parameters: {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'string' }, description: 'Array of video URLs to process' },
        pipeline: { type: 'array', items: { type: 'object' }, description: 'Array of processing steps: [{tool: "video_style", action: "cinematic", opts: {}}, {tool: "video_resize", action: "reels"}]' },
        maxVideos: { type: 'number', description: 'Max videos to process (default: 20)' },
      },
      required: ['sources', 'pipeline'],
    },
  },

  // ── video_export ──
  {
    name: 'video_export',
    description: 'Export and convert videos: export (convert format — mp4/webm/mov/avi/mkv with quality/preset control), thumbnail (extract frame as optimized image), preview (short low-quality preview clip), metadata (get full video info — resolution, duration, codecs, bitrate), or gif (high-quality 2-pass animated GIF).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video URL' },
        action: { type: 'string', enum: ['export', 'thumbnail', 'preview', 'metadata', 'gif'], description: 'Export action' },
        format: { type: 'string', enum: ['mp4', 'webm', 'mov', 'avi', 'mkv'], description: 'Output format (export, default: mp4)' },
        crf: { type: 'number', description: 'Quality — lower = better (export, default: 23 for mp4, 30 for webm)' },
        preset: { type: 'string', enum: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'], description: 'Encoding speed/quality tradeoff (export, default: medium)' },
        audioBitrate: { type: 'string', description: 'Audio bitrate (export, default: 192k)' },
        maxWidth: { type: 'number', description: 'Max width — scales down if larger (export, preview)' },
        maxHeight: { type: 'number', description: 'Max height — scales down if larger (export)' },
        time: { type: 'number', description: 'Timestamp in seconds for thumbnail (default: 2s or 10%)' },
        width: { type: 'number', description: 'Thumbnail/GIF width (thumbnail: 1280, gif: 480)' },
        height: { type: 'number', description: 'Thumbnail height (default: 720)' },
        quality: { type: 'number', description: 'Thumbnail JPEG quality 1-100 (default: 85)' },
        start: { type: 'number', description: 'Start time in seconds (preview, gif, default: 0)' },
        duration: { type: 'number', description: 'Duration in seconds (preview: 10, gif: 5)' },
        fps: { type: 'number', description: 'GIF frame rate (gif, default: 15)' },
      },
      required: ['source', 'action'],
    },
  },

  // ──────────────────────────────────────────────
  // ARCHIVE TOOLS — ZIP / TAR / 7Z processing
  // ──────────────────────────────────────────────

  // ── archive_create ──
  {
    name: 'archive_create',
    description: 'Create archives from content: zip/from_files (create ZIP from file contents), tar (create tar archive), targz (create compressed tar.gz), split (split archive into parts), or merge (combine multi-part archives).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL (for split/merge)' },
        action: { type: 'string', enum: ['zip', 'from_files', 'tar', 'targz', 'split', 'merge'], description: 'Create action' },
        files: { type: 'object', description: 'File map: { "path/file.txt": "content", ... } (zip, tar, targz)' },
        filename: { type: 'string', description: 'Output filename (default: archive.zip)' },
        comment: { type: 'string', description: 'ZIP comment' },
        level: { type: 'number', description: 'Compression level 0-9 (targz, default: 6)' },
        part_size_mb: { type: 'number', description: 'Part size in MB (split, default: 10)' },
        parts: { type: 'array', items: { type: 'string' }, description: 'Part URLs to merge (merge)' },
      },
      required: ['action'],
    },
  },

  // ── archive_extract ──
  {
    name: 'archive_extract',
    description: 'Extract archive contents: extract/auto (full extraction with file listing), extract_file (extract single file by path — returns content), or extract_pattern (extract files matching a glob pattern).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['extract', 'auto', 'extract_file', 'extract_pattern'], description: 'Extract action' },
        path: { type: 'string', description: 'File path to extract (extract_file)' },
        pattern: { type: 'string', description: 'Glob pattern e.g. "*.js" (extract_pattern)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_edit ──
  {
    name: 'archive_edit',
    description: 'Edit archive contents in-place: add_file, remove_file, replace_file, edit_text (find/replace in a file), patch_config (patch .env/.json/.yaml by key), rename_file (move/rename inside archive), or fix_paths (normalize Windows↔Linux separators).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['add_file', 'remove_file', 'replace_file', 'edit_text', 'patch_config', 'rename_file', 'fix_paths'], description: 'Edit action' },
        path: { type: 'string', description: 'File path in archive (add/remove/replace/edit/patch)' },
        content: { type: 'string', description: 'New file content (add_file, replace_file)' },
        find: { type: 'string', description: 'Text to find (edit_text)' },
        replace: { type: 'string', description: 'Replacement text (edit_text)' },
        patches: { type: 'object', description: 'Key-value patches (patch_config) e.g. { "PORT": "3000" }' },
        old_path: { type: 'string', description: 'Current path (rename_file)' },
        new_path: { type: 'string', description: 'New path (rename_file)' },
        direction: { type: 'string', enum: ['unix', 'windows'], description: 'Target separator (fix_paths, default: unix)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_inspect ──
  {
    name: 'archive_inspect',
    description: 'Inspect archive contents: list (all files with sizes/compression), structure (directory tree view), metadata (archive format info), detect_type (identify project type — Node.js/Python/PHP/etc), validate_layout (check expected files exist), find_file (search by name pattern), or search_text (search text content across all files).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['list', 'structure', 'metadata', 'detect_type', 'validate_layout', 'find_file', 'search_text'], description: 'Inspect action' },
        expected: { type: 'array', items: { type: 'string' }, description: 'Required files/dirs (validate_layout)' },
        query: { type: 'string', description: 'Search query — filename or text (find_file, search_text)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_security ──
  {
    name: 'archive_security',
    description: 'Security analysis: check_bomb (detect zip bombs — ratio & nesting), check_symlinks (find symlink entries), check_paths (detect path traversal attacks), check_password (detect encrypted entries), scan_secrets (find API keys/passwords/tokens/connection strings), or size_report (breakdown by extension/directory).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['check_bomb', 'check_symlinks', 'check_paths', 'check_password', 'scan_secrets', 'size_report'], description: 'Security action' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_convert ──
  {
    name: 'archive_convert',
    description: 'Convert between archive formats: zip_to_tar, tar_to_zip, zip_to_targz, targz_to_zip, or normalize_endings (convert line endings LF↔CRLF across all text files).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['zip_to_tar', 'tar_to_zip', 'zip_to_targz', 'targz_to_zip', 'normalize_endings'], description: 'Convert action' },
        level: { type: 'number', description: 'Compression level 0-9 (default: 6)' },
        target: { type: 'string', enum: ['lf', 'crlf'], description: 'Line ending target (normalize_endings, default: lf)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_optimize ──
  {
    name: 'archive_optimize',
    description: 'Optimize archive contents: strip_dev (remove node_modules, .git, .DS_Store, etc), deduplicate (remove duplicate files by content hash), flatten (reduce directory depth), nest (wrap all files in a root folder), compress_level (recompress at different level 0-9), or naming_convention (enforce kebab/snake/camel case filenames).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['strip_dev', 'deduplicate', 'flatten', 'nest', 'compress_level', 'naming_convention'], description: 'Optimize action' },
        max_depth: { type: 'number', description: 'Max directory depth (flatten, 0 = completely flat)' },
        root: { type: 'string', description: 'Root folder name (nest, default: project)' },
        level: { type: 'number', description: 'Compression level 0-9 (compress_level, default: 9)' },
        convention: { type: 'string', enum: ['kebab', 'snake', 'camel'], description: 'Naming convention (default: kebab)' },
        extra_patterns: { type: 'array', items: { type: 'string' }, description: 'Additional patterns to strip (strip_dev)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_deploy ──
  {
    name: 'archive_deploy',
    description: 'Deployment preparation: package_build (extract only build artifacts — dist/build/out), prepare_deploy (strip dev files + add platform configs for vercel/netlify/cloudflare), inject_env (add/update .env variables), version_tag (stamp VERSION file + update package.json), or production_ready (full cleanup + validate + security scan).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['package_build', 'prepare_deploy', 'inject_env', 'version_tag', 'production_ready'], description: 'Deploy action' },
        include: { type: 'array', items: { type: 'string' }, description: 'Build dirs to include (package_build, default: dist, build, out)' },
        platform: { type: 'string', enum: ['generic', 'vercel', 'netlify', 'cloudflare'], description: 'Target platform (prepare_deploy)' },
        env: { type: 'object', description: 'Environment variables to inject (inject_env)' },
        version: { type: 'string', description: 'Version string (version_tag, default: YYYY.MM.DD)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── archive_batch ──
  {
    name: 'archive_batch',
    description: 'Process multiple archives through a pipeline of operations. Each step can be any archive tool — results chain (output URL of one step becomes input for next).',
    parameters: {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'string' }, description: 'Array of archive URLs to process' },
        pipeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string', description: 'Tool name (archive_optimize, archive_deploy, etc)' },
              action: { type: 'string', description: 'Action within tool' },
            },
          },
          description: 'Pipeline steps — each {tool, action, ...opts}',
        },
      },
      required: ['sources', 'pipeline'],
    },
  },

  // ── archive_intelligence ──
  {
    name: 'archive_intelligence',
    description: 'Smart archive analysis: summarize (overview with type detection, key files, extensions), readme_generate (auto-generate README.md from archive contents), detect_project (detailed project type with features — tests/CI/Docker/linting), flag_secrets (find API keys/passwords/connection strings), or dependency_report (analyze package.json/requirements.txt/go.mod/Cargo.toml).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive URL' },
        action: { type: 'string', enum: ['summarize', 'readme_generate', 'detect_project', 'flag_secrets', 'dependency_report'], description: 'Intelligence action' },
        name: { type: 'string', description: 'Project name (readme_generate)' },
      },
      required: ['source', 'action'],
    },
  },

  // ════════════════════════════════════════════
  // DATA PROCESSING TOOLS (8 tools — xlsx/xml2js/cheerio)
  // ════════════════════════════════════════════

  // ── data_read ──
  {
    name: 'data_read',
    description: 'Read and parse data files from URLs: csv, excel (xlsx/xls with multi-sheet support), json (arrays or nested objects), xml, tsv, text/log files, or auto (auto-detect format). Returns parsed data preview, column info, row count, and a dataUrl for chaining with other data tools.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Data file URL (http/https or S3 signed URL)' },
        action: { type: 'string', enum: ['csv', 'excel', 'json', 'xml', 'tsv', 'text', 'auto'], description: 'Format to parse as (use auto to detect)' },
        delimiter: { type: 'string', description: 'Custom delimiter for CSV (default: comma)' },
        sheet: { type: 'string', description: 'Sheet name for Excel files (default: first sheet)' },
        preview: { type: 'number', description: 'Number of preview rows to return (default: 10)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_transform ──
  {
    name: 'data_transform',
    description: 'Transform and clean data: remove_duplicates (by columns), fill_missing (value/forward/mean/median), normalize (lowercase/uppercase/trim/date/number), rename_columns (mapping), filter (equals/contains/gt/lt/gte/lte/regex/in), sort (asc/desc), aggregate (groupBy + sum/avg/count/min/max), pivot (rows to columns), sample (random N rows), merge (inner/left/right join two datasets), cast (type conversion: string/number/boolean/date). Input: dataUrl from data_read or previous transform.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Data URL (from data_read dataUrl or previous transform)' },
        action: { type: 'string', enum: ['remove_duplicates', 'fill_missing', 'normalize', 'rename_columns', 'filter', 'sort', 'aggregate', 'pivot', 'sample', 'merge', 'cast'], description: 'Transform action' },
        columns: { type: 'array', items: { type: 'string' }, description: 'Columns for remove_duplicates/fill_missing' },
        column: { type: 'string', description: 'Target column for normalize/filter/sort/cast' },
        method: { type: 'string', enum: ['value', 'forward', 'mean', 'median'], description: 'Fill method (fill_missing)' },
        value: { type: 'string', description: 'Fill value or filter comparison value' },
        type: { type: 'string', description: 'Normalize type or cast target type (string/number/boolean/date)' },
        operator: { type: 'string', enum: ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'gt', 'lt', 'gte', 'lte', 'regex', 'in'], description: 'Filter operator' },
        order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
        mapping: { type: 'object', description: 'Column rename mapping: { oldName: newName }' },
        groupBy: { type: 'array', items: { type: 'string' }, description: 'Group-by columns (aggregate)' },
        aggregations: { type: 'array', items: { type: 'object' }, description: 'Aggregation specs: [{ column, func: sum|avg|count|min|max }]' },
        index: { type: 'string', description: 'Row identifier column (pivot)' },
        func: { type: 'string', description: 'Aggregation function (pivot: first/sum/count)' },
        count: { type: 'number', description: 'Sample size (sample)' },
        source2: { type: 'string', description: 'Second dataset URL (merge)' },
        leftKey: { type: 'string', description: 'Left join key column (merge)' },
        rightKey: { type: 'string', description: 'Right join key column (merge)' },
        joinType: { type: 'string', enum: ['inner', 'left', 'right', 'full'], description: 'Join type (merge)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_convert ──
  {
    name: 'data_convert',
    description: 'Convert data between formats: csv_to_json, json_to_csv, csv_to_excel, excel_to_csv, json_to_excel, excel_to_json, xml_to_json, json_to_xml, csv_to_xml. Downloads source file, parses it, converts to target format, uploads to S3 and returns download URL.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source data file URL' },
        action: { type: 'string', enum: ['csv_to_json', 'json_to_csv', 'csv_to_excel', 'excel_to_csv', 'json_to_excel', 'excel_to_json', 'xml_to_json', 'json_to_xml', 'csv_to_xml'], description: 'Conversion action (from_to_format)' },
        sheet: { type: 'string', description: 'Excel sheet name to read from (default: first)' },
        sheetName: { type: 'string', description: 'Output sheet name for Excel (default: Sheet1)' },
        rootName: { type: 'string', description: 'XML root element name (default: data)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_analyze ──
  {
    name: 'data_analyze',
    description: 'Statistical analysis and insights: summary (basic stats per column — min/max/mean/unique/missing), describe (full statistical profile with percentiles), correlate (Pearson correlation matrix between numeric columns), trends (linear regression + moving average over time), anomalies (z-score outlier detection), distribution (numeric histogram or categorical value counts), compare (diff structure of two datasets). Input: dataUrl from data_read.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Parsed data URL (from data_read dataUrl)' },
        action: { type: 'string', enum: ['summary', 'describe', 'correlate', 'trends', 'anomalies', 'distribution', 'compare'], description: 'Analysis action' },
        columns: { type: 'array', items: { type: 'string' }, description: 'Columns to analyze (describe/correlate)' },
        column: { type: 'string', description: 'Target column (anomalies/distribution)' },
        dateColumn: { type: 'string', description: 'Date/time column (trends)' },
        valueColumn: { type: 'string', description: 'Numeric value column (trends)' },
        threshold: { type: 'number', description: 'Z-score threshold (anomalies, default: 2)' },
        bins: { type: 'number', description: 'Number of histogram bins (distribution, default: 10)' },
        window: { type: 'number', description: 'Moving average window size (trends)' },
        source2: { type: 'string', description: 'Second dataset URL (compare)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_report ──
  {
    name: 'data_report',
    description: 'Generate formatted reports from data: csv_report (download as CSV), json_report (download as JSON), excel_report (formatted Excel with auto-sized columns + optional summary sheet), summary_report (executive summary with KPIs per column), table (markdown table format for display). Reports are uploaded to S3 with signed download URLs.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Parsed data URL (from data_read dataUrl or transform)' },
        action: { type: 'string', enum: ['csv_report', 'json_report', 'excel_report', 'summary_report', 'table'], description: 'Report format' },
        title: { type: 'string', description: 'Report title (summary_report)' },
        sheetName: { type: 'string', description: 'Excel sheet name (excel_report)' },
        includeSummary: { type: 'boolean', description: 'Add summary statistics sheet (excel_report)' },
        columns: { type: 'array', items: { type: 'string' }, description: 'Columns to include (table)' },
        maxRows: { type: 'number', description: 'Max rows for table display (default: 50)' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_validate ──
  {
    name: 'data_validate',
    description: 'Data quality and validation checks: schema (validate against rules — type/required/min/max/pattern/enum per column), duplicates (find duplicate rows by columns), missing (completeness report per column), constraints (check unique/not_null/positive/range rules), consistency (cross-field relationship checks like start_date < end_date), types (infer and report column data types with mixed-type detection).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Parsed data URL (from data_read dataUrl)' },
        action: { type: 'string', enum: ['schema', 'duplicates', 'missing', 'constraints', 'consistency', 'types'], description: 'Validation action' },
        schema: { type: 'object', description: 'Schema rules: { columnName: { type, required, min, max, pattern, enum } } (schema action)' },
        columns: { type: 'array', items: { type: 'string' }, description: 'Columns to check for duplicates' },
        rules: { type: 'array', items: { type: 'object' }, description: 'Constraint rules: [{ column, type: unique|not_null|positive|range, min, max }]' },
        checks: { type: 'array', items: { type: 'object' }, description: 'Consistency checks: [{ column1, column2, rule: less_than|equals|not_equals }]' },
      },
      required: ['source', 'action'],
    },
  },

  // ── data_scrape ──
  {
    name: 'data_scrape',
    description: 'Extract structured data from web pages: extract_table (HTML tables to JSON with headers), extract_links (all links with text, href, internal/external classification), extract_text (clean text content with paragraph extraction), extract_structured (custom CSS selectors with optional container for repeated items), extract_meta (title, description, OG tags, canonical URL, headings, counts).',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Web page URL to scrape' },
        action: { type: 'string', enum: ['extract_table', 'extract_links', 'extract_text', 'extract_structured', 'extract_meta'], description: 'Scrape action' },
        selector: { type: 'string', description: 'CSS selector to target specific elements' },
        container: { type: 'string', description: 'Repeating container selector (extract_structured)' },
        selectors: { type: 'object', description: 'Named CSS selectors: { fieldName: "css selector" } (extract_structured)' },
        limit: { type: 'number', description: 'Max items to return (extract_links, default: 100)' },
        maxLength: { type: 'number', description: 'Max text length (extract_text, default: 5000)' },
      },
      required: ['url', 'action'],
    },
  },

  // ── data_pipeline ──
  {
    name: 'data_pipeline',
    description: 'Chain multiple data operations sequentially. Each step passes its dataUrl to the next step automatically. Steps are objects with tool (data_read/data_transform/data_convert/data_analyze/data_report/data_validate/data_scrape), action, and tool-specific options. Stops on first failure. Returns results array with per-step status.',
    parameters: {
      type: 'object',
      properties: {
        steps: { type: 'array', items: { type: 'object' }, description: 'Pipeline steps: [{ tool: "data_read", action: "csv", source: "url" }, { tool: "data_transform", action: "filter", column: "age", operator: "gt", value: "18" }, ...]' },
        source: { type: 'string', description: 'Initial data URL (passed to first step if step has no source)' },
        maxSteps: { type: 'number', description: 'Maximum steps to execute (default: 10)' },
      },
      required: ['steps'],
    },
  },

  // ──────────────────────────────────────────────
  // NAVIGATION & SEARCH — find and open files
  // ──────────────────────────────────────────────
  {
    name: 'open_file',
    description: 'Open a file in the editor and optionally navigate to a specific line. Use when you want to show the user a file, jump to a definition, or focus attention on a specific location. Unlike set_cursor_position (which just moves the cursor), this also signals the UI to switch the active file tab.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to open, e.g. "/index.html", "/src/app.js"',
        },
        line: {
          type: 'number',
          description: 'Optional line number to jump to (1-based). If omitted, opens at the top.',
        },
        column: {
          type: 'number',
          description: 'Optional column number (1-based). Only used if line is also provided.',
        },
        preview: {
          type: 'boolean',
          description: 'If true, open in preview mode (tab closes when another file is opened). Default: false.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_in_files',
    description: 'Search for text or a regex pattern across ALL project files. Returns matching lines with file path, line number, and surrounding context. Use when you need to find where something is used, locate a function definition, find all TODO comments, etc.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text or regex pattern to search for',
        },
        isRegex: {
          type: 'boolean',
          description: 'If true, treat query as a regular expression. Default: false.',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'If true, search is case-sensitive. Default: false.',
        },
        includePattern: {
          type: 'string',
          description: 'Only search files matching this glob pattern, e.g. "*.js", "*.tsx", "src/**". Default: all files.',
        },
        excludePattern: {
          type: 'string',
          description: 'Skip files matching this glob pattern, e.g. "*.min.js", "node_modules/**". Default: none.',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of matches to return (default: 50, max: 200).',
        },
        contextLines: {
          type: 'number',
          description: 'Number of lines of context before and after each match (default: 1, max: 5).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'find_file',
    description: 'Find files in the project by name, partial name, or glob pattern. Returns a list of matching file paths. Use when you need to locate a file but don\'t know the exact path.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'File name, partial name, or glob pattern. Examples: "header", "*.tsx", "components/*.js", "test"',
        },
        type: {
          type: 'string',
          enum: ['file', 'folder', 'all'],
          description: 'Filter results by type. Default: "all".',
        },
      },
      required: ['pattern'],
    },
  },

  // ──────────────────────────────────────────────
  // DIFF & PATCH — surgical code edits
  // ──────────────────────────────────────────────
  {
    name: 'apply_diff',
    description: 'Apply surgical line-range edits to a file instead of replacing the entire content. Use when you only need to change a few lines in a large file. Much more efficient than update_file for small changes. Each diff specifies a line range to replace with new content.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to edit, e.g. "/src/app.js"',
        },
        diffs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              startLine: { type: 'number', description: 'First line to replace (1-based, inclusive)' },
              endLine: { type: 'number', description: 'Last line to replace (1-based, inclusive). Same as startLine to replace a single line. Set to 0 (with startLine=N) to INSERT before line N.' },
              content: { type: 'string', description: 'New content to put in place of the replaced lines. Can be empty string to delete lines.' },
            },
            required: ['startLine', 'endLine', 'content'],
          },
          description: 'Array of diffs to apply. Applied in reverse order (bottom-up) so line numbers stay valid.',
        },
        description: {
          type: 'string',
          description: 'Brief description of what changed',
        },
      },
      required: ['path', 'diffs'],
    },
  },

  // ──────────────────────────────────────────────
  // PACKAGE MANAGEMENT — npm/dependencies
  // ──────────────────────────────────────────────
  {
    name: 'install_package',
    description: 'Add npm packages to the project\'s package.json. Does NOT run npm install (no real filesystem), but updates the package.json file so the dependency is declared. The user can install manually or the build system will resolve it.',
    parameters: {
      type: 'object',
      properties: {
        packages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Package names with optional versions, e.g. ["react", "tailwindcss@3.4.0", "@types/node"]',
        },
        dev: {
          type: 'boolean',
          description: 'If true, add to devDependencies instead of dependencies. Default: false.',
        },
        createIfMissing: {
          type: 'boolean',
          description: 'If true and no package.json exists, create one. Default: true.',
        },
      },
      required: ['packages'],
    },
  },

  // ──────────────────────────────────────────────
  // DIAGNOSTICS — project health & linting
  // ──────────────────────────────────────────────
  {
    name: 'get_diagnostics',
    description: 'Analyze the project for common issues: syntax errors, missing imports/references, accessibility problems, security concerns, and best practices. Returns a report grouped by file with severity levels (error, warning, info).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Check a specific file only. If omitted, checks all files.',
        },
        checks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['syntax', 'references', 'accessibility', 'security', 'best_practices', 'all'],
          },
          description: 'Which checks to run. Default: ["all"].',
        },
      },
    },
  },

  // ──────────────────────────────────────────────
  // TEST EXECUTION — run tests
  // ──────────────────────────────────────────────
  {
    name: 'run_tests',
    description: 'Run JavaScript or Python test code and return results. Supply the test code directly (it runs in the sandboxed code executor). Returns pass/fail counts, test names, and any error output.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Test code to execute. Can use console.assert(), throw, or any assertion pattern. The output is parsed for pass/fail results.',
        },
        language: {
          type: 'string',
          enum: ['javascript', 'python'],
          description: 'Programming language for the test code. Default: "javascript".',
        },
        testFile: {
          type: 'string',
          description: 'Optional: path to a test file in the project to run instead of inline code. The file contents will be read and executed.',
        },
      },
    },
  },

  // ──────────────────────────────────────────────
  // PREVIEW CONSOLE — read browser preview output
  // ──────────────────────────────────────────────
  {
    name: 'get_preview_console',
    description: 'Read the browser console output from the live preview panel. Returns recent console.log, console.warn, console.error output and any uncaught errors from the preview iframe. Use this to debug user-facing issues, check if code is working, or see runtime errors.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['all', 'errors', 'warnings', 'logs'],
          description: 'Filter by log type. Default: "all".',
        },
        limit: {
          type: 'number',
          description: 'Maximum entries to return (default: 50).',
        },
      },
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — CORE UTILITIES
  // ══════════════════════════════════════════════════════════════
  {
    name: 'get_weather',
    description: 'Get real-time weather data for any location. Returns current conditions + 3-day forecast.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, e.g. "Tokyo" or "New York"' },
        units: { type: 'string', enum: ['metric', 'imperial'], description: 'Temperature units (default: metric)' },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: 'Evaluate a mathematical expression. Supports +, -, *, /, ^, sqrt, sin, cos, tan, log, abs, floor, ceil, round, pow, min, max, pi, e. Use for any math operations.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression to evaluate, e.g. "sqrt(144) + 2^3"' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time with timezone support. Returns formatted, ISO, and Unix timestamp.',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone, e.g. "America/New_York", "Asia/Tokyo", "UTC"' },
      },
    },
  },
  {
    name: 'generate_video',
    description: 'Generate a short AI video from a text description using RunwayML. Returns a downloadable video file.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the video to generate' },
        duration: { type: 'number', description: 'Video duration in seconds (5 or 10)', default: 5 },
      },
      required: ['prompt'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — DOCUMENT PARSING
  // ══════════════════════════════════════════════════════════════
  {
    name: 'parse_pdf',
    description: 'Extract text content from a PDF file. Use when user uploads or references a PDF document.',
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the PDF file' },
      },
      required: ['file'],
    },
  },
  {
    name: 'parse_docx',
    description: 'Extract text content from a Word document (.docx). Use when user uploads a Word file.',
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the DOCX file' },
      },
      required: ['file'],
    },
  },
  {
    name: 'parse_csv',
    description: 'Parse CSV data and return structured rows. Use for spreadsheet or data analysis.',
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the CSV file' },
        limit: { type: 'number', description: 'Max rows to return (default 100)' },
      },
      required: ['file'],
    },
  },
  {
    name: 'parse_markdown',
    description: 'Parse Markdown content — extract headers, links, code blocks, frontmatter. Use for Markdown analysis.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content or file path' },
      },
      required: ['content'],
    },
  },

  // V2.0 — DOCUMENT PARSING (Extended — JSON & HTML)
  {
    name: 'parse_json',
    description: 'Parse, validate, transform, query, diff, flatten, or format JSON data.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['parse', 'validate', 'transform', 'query', 'diff', 'flatten', 'unflatten', 'minify', 'prettify'], description: 'Action to perform' },
        content: { type: 'string', description: 'JSON string or content to process' },
        schema: { type: 'object', description: 'JSON schema for validation (action=validate)' },
        path: { type: 'string', description: 'JSONPath-like query path (action=query)' },
        content2: { type: 'string', description: 'Second JSON for diff comparison (action=diff)' },
      },
      required: ['action', 'content'],
    },
  },
  {
    name: 'parse_html',
    description: 'Extract structured data from HTML. Actions: extract (title/headings/links/images/meta), select (CSS selectors), table, forms, text, validate.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['extract', 'select', 'table', 'forms', 'text', 'validate'], description: 'Extraction action' },
        content: { type: 'string', description: 'HTML content to parse' },
        selector: { type: 'string', description: 'CSS selector (for action=select)' },
      },
      required: ['action', 'content'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — AUDIO
  // ══════════════════════════════════════════════════════════════
  {
    name: 'transcribe_audio',
    description: 'Convert speech to text using AI transcription (Whisper). Use when user uploads audio and wants a transcript.',
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the audio file' },
        language: { type: 'string', description: 'Language code e.g. en, es, fr (default: en)' },
      },
      required: ['file'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — IMAGE TOOLS (Extended)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'image_convert',
    description: 'Convert image between formats (JPEG, PNG, WebP, AVIF, TIFF, GIF).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source image path or URL' },
        action: { type: 'string', description: 'Conversion action (default: convert)' },
        format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'], description: 'Target format' },
        quality: { type: 'number', description: 'Output quality 1-100' },
      },
      required: ['source'],
    },
  },
  {
    name: 'image_face',
    description: 'Detect and analyze faces in images.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image path or URL' },
        action: { type: 'string', description: 'Analysis action (default: face)' },
      },
      required: ['source'],
    },
  },
  {
    name: 'image_export',
    description: 'Export image to different formats with optimization.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source image path' },
        action: { type: 'string', description: 'Export action' },
        format: { type: 'string', description: 'Target format' },
      },
      required: ['source'],
    },
  },
  {
    name: 'image_ocr',
    description: 'Extract text from images using OCR (Tesseract.js).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Image path or URL' },
        language: { type: 'string', description: 'OCR language (default: eng)' },
      },
      required: ['source'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — VIDEO TOOLS (Reorganized)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'video_transform',
    description: 'Transform video: trim, split, concat, speed, resize, crop.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video source path' },
        action: { type: 'string', enum: ['trim', 'split', 'concat', 'speed', 'resize', 'crop'], description: 'Transform action' },
        start: { type: 'number', description: 'Start time in seconds' },
        end: { type: 'number', description: 'End time in seconds' },
        width: { type: 'number', description: 'Target width' },
        height: { type: 'number', description: 'Target height' },
        speed: { type: 'number', description: 'Speed factor (0.5=slow, 2=fast)' },
      },
      required: ['source', 'action'],
    },
  },
  {
    name: 'video_convert',
    description: 'Convert video format, compress, create GIF, generate thumbnail.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video source path' },
        action: { type: 'string', enum: ['convert', 'compress', 'gif', 'thumbnail', 'responsive'], description: 'Conversion action' },
        format: { type: 'string', description: 'Target format (mp4, webm, avi, mkv)' },
      },
      required: ['source', 'action'],
    },
  },
  {
    name: 'video_analyze',
    description: 'Analyze video: metadata, scene detection, silence detection.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video source path' },
        action: { type: 'string', enum: ['metadata', 'scenes', 'silence', 'validate'], description: 'Analysis action' },
      },
      required: ['source', 'action'],
    },
  },
  {
    name: 'video_filter',
    description: 'Apply video filters: color correct, cinematic, blur background, stabilize.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video source path' },
        action: { type: 'string', enum: ['color_correct', 'cinematic', 'blur_bg', 'stabilize', 'filter'], description: 'Filter action' },
      },
      required: ['source', 'action'],
    },
  },
  {
    name: 'video_ai',
    description: 'AI video analysis: describe, transcribe, highlight, caption, moderate.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Video source path' },
        action: { type: 'string', enum: ['describe', 'transcribe', 'highlights', 'caption', 'moderate', 'smart_crop'], description: 'AI action' },
      },
      required: ['source', 'action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — ARCHIVE TOOLS (Reorganized)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'archive_core',
    description: 'Create or extract archives (ZIP, TAR, GZIP).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source path or archive file' },
        action: { type: 'string', enum: ['zip', 'tar', 'gzip', 'extract', 'extract_tar'], description: 'Archive action' },
        output: { type: 'string', description: 'Output path' },
      },
      required: ['source', 'action'],
    },
  },
  {
    name: 'archive_structure',
    description: 'Inspect/list archive contents and structure.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Archive file path' },
        action: { type: 'string', enum: ['list', 'tree', 'stats'], description: 'Inspection action' },
      },
      required: ['source'],
    },
  },
  {
    name: 'archive_bulk',
    description: 'Batch process multiple archives.',
    parameters: {
      type: 'object',
      properties: {
        sources: { type: 'array', items: { type: 'string' }, description: 'Array of archive paths' },
        pipeline: { type: 'array', description: 'Processing pipeline steps' },
      },
      required: ['sources'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — DEVELOPER TOOLS (8 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'dev_filesystem',
    description: 'File system operations: tree view, file stats, diff, find duplicates, disk usage.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['tree', 'stats', 'diff', 'duplicates', 'disk_usage'], description: 'Action to perform' },
        path: { type: 'string', description: 'Target path' },
        path2: { type: 'string', description: 'Second path for diff' },
        maxDepth: { type: 'number', description: 'Max depth for tree' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_search',
    description: 'Search code: grep patterns, find files, find and replace.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['grep', 'find', 'find_replace'], description: 'Search action' },
        pattern: { type: 'string', description: 'Search pattern or regex' },
        path: { type: 'string', description: 'Search path' },
        replace: { type: 'string', description: 'Replacement string (for find_replace)' },
        regex: { type: 'boolean', description: 'Use regex matching' },
        caseSensitive: { type: 'boolean', description: 'Case sensitive search' },
      },
      required: ['action', 'pattern'],
    },
  },
  {
    name: 'dev_intelligence',
    description: 'Code intelligence: extract symbols, imports, exports, detect language/framework.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['symbols', 'imports', 'exports', 'language', 'framework'], description: 'Intelligence action' },
        filePath: { type: 'string', description: 'File to analyze' },
        content: { type: 'string', description: 'Code content to analyze' },
        path: { type: 'string', description: 'Project path (for framework detection)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_debug',
    description: 'Debug tools: parse errors, analyze stack traces, find TODOs, detect dead code.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['error_parse', 'stack_trace', 'todos', 'dead_code'], description: 'Debug action' },
        error: { type: 'string', description: 'Error message to parse' },
        stackTrace: { type: 'string', description: 'Stack trace to analyze' },
        path: { type: 'string', description: 'Path to scan' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_test',
    description: 'Run tests with Jest or Vitest. Execute test suites and get coverage.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['run', 'coverage'], description: 'Test action' },
        path: { type: 'string', description: 'Test file or directory' },
        runner: { type: 'string', enum: ['jest', 'vitest'], description: 'Test runner' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_git',
    description: 'Git operations: status, log, diff, branch, blame, commit, clone, history.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'log', 'diff', 'branch', 'blame', 'commit', 'clone', 'history'], description: 'Git action' },
        path: { type: 'string', description: 'Repository path' },
        message: { type: 'string', description: 'Commit message' },
        file: { type: 'string', description: 'File for blame/diff' },
        url: { type: 'string', description: 'Repository URL for clone' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_npm',
    description: 'NPM operations: list packages, install, update, audit, outdated, run scripts.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'install', 'update', 'audit', 'outdated', 'run'], description: 'NPM action' },
        path: { type: 'string', description: 'Package directory' },
        package: { type: 'string', description: 'Package name' },
        script: { type: 'string', description: 'Script name to run' },
      },
      required: ['action'],
    },
  },
  {
    name: 'dev_docker',
    description: 'Docker operations: list containers/images, build, run, compose, logs, health.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['ps', 'images', 'build', 'run', 'compose', 'logs', 'health'], description: 'Docker action' },
        image: { type: 'string', description: 'Docker image name' },
        container: { type: 'string', description: 'Container name/ID' },
        path: { type: 'string', description: 'Dockerfile/compose path' },
      },
      required: ['action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — WEB & FRONTEND TOOLS (7 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'web_analyze',
    description: 'Analyze HTML/CSS quality: validation, accessibility, SEO, performance.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['html', 'accessibility', 'seo', 'performance'], description: 'Analysis type' },
        content: { type: 'string', description: 'HTML content to analyze' },
        url: { type: 'string', description: 'URL to analyze (alternative to content)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'web_scaffold',
    description: 'Generate code: React components, hooks, routes, forms, stores.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['component', 'hook', 'route', 'form', 'store'], description: 'Scaffold type' },
        name: { type: 'string', description: 'Component/hook/route name' },
        framework: { type: 'string', enum: ['react', 'next', 'express'], description: 'Target framework' },
        props: { type: 'array', items: { type: 'string' }, description: 'Component props' },
        fields: { type: 'array', description: 'Form fields' },
      },
      required: ['action', 'name'],
    },
  },
  {
    name: 'web_optimize',
    description: 'Generate SEO meta tags, sitemap, robots.txt, PWA manifest, service worker.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['meta', 'sitemap', 'robots', 'pwa_manifest', 'service_worker'], description: 'Optimization type' },
        title: { type: 'string', description: 'Page/site title' },
        description: { type: 'string', description: 'Description' },
        url: { type: 'string', description: 'Base URL' },
        pages: { type: 'array', items: { type: 'string' }, description: 'Pages for sitemap' },
      },
      required: ['action'],
    },
  },
  {
    name: 'web_transform',
    description: 'Generate CSS configs: Tailwind config, dark mode utility, responsive breakpoints, animations.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['tailwind', 'dark_mode', 'responsive', 'animations'], description: 'Transform type' },
        colors: { type: 'object', description: 'Custom colors for Tailwind' },
        fonts: { type: 'object', description: 'Custom fonts' },
      },
      required: ['action'],
    },
  },
  {
    name: 'web_screenshot',
    description: 'Take screenshots of web pages (requires Puppeteer).',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to screenshot' },
        width: { type: 'number', description: 'Viewport width' },
        height: { type: 'number', description: 'Viewport height' },
        fullPage: { type: 'boolean', description: 'Capture full page' },
      },
      required: ['url'],
    },
  },
  {
    name: 'web_lighthouse',
    description: 'Run Google PageSpeed Insights audit on a URL. Returns performance, accessibility, SEO scores.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to audit' },
        strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Device strategy (default: mobile)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'web_scrape',
    description: 'Scrape web content: extract data, links, tables, JSON-LD, CSS selectors.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['extract', 'links', 'tables', 'json_ld', 'select'], description: 'Scrape action' },
        url: { type: 'string', description: 'URL to scrape' },
        selector: { type: 'string', description: 'CSS selector (for action=select)' },
      },
      required: ['action', 'url'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — DATABASE TOOLS (6 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'db_query',
    description: 'Query the PostgreSQL database: select, execute, count, insert, update, delete.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['select', 'execute', 'count', 'findUnique', 'insert', 'update', 'delete'], description: 'Query action' },
        table: { type: 'string', description: 'Table/model name' },
        sql: { type: 'string', description: 'Raw SQL query (for action=select/execute)' },
        where: { type: 'object', description: 'Filter conditions' },
        data: { type: 'object', description: 'Data for insert/update' },
        limit: { type: 'number', description: 'Row limit' },
      },
      required: ['action'],
    },
  },
  {
    name: 'db_schema',
    description: 'Inspect database schema: tables, columns, indexes, constraints, size, relations.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['tables', 'columns', 'indexes', 'constraints', 'size', 'relations'], description: 'Schema action' },
        table: { type: 'string', description: 'Table name (for columns/indexes/constraints)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'db_backup',
    description: 'Export/import database data, create snapshots.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['export', 'import', 'snapshot'], description: 'Backup action' },
        table: { type: 'string', description: 'Table name' },
        data: { type: 'array', description: 'Data to import' },
        limit: { type: 'number', description: 'Export row limit' },
      },
      required: ['action'],
    },
  },
  {
    name: 'db_migrate',
    description: 'Check Prisma migration status and history.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'history'], description: 'Migration action' },
      },
      required: ['action'],
    },
  },
  {
    name: 'db_analyze',
    description: 'Database performance analysis: EXPLAIN, table stats, slow queries, connections, health.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['explain', 'stats', 'slow_queries', 'connections', 'health'], description: 'Analysis action' },
        sql: { type: 'string', description: 'SQL query for EXPLAIN' },
        table: { type: 'string', description: 'Table name for stats' },
      },
      required: ['action'],
    },
  },
  {
    name: 'db_connect',
    description: 'Test current connection, get DB info, save/list connections.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['test', 'info', 'save', 'list'], description: 'Connection action' },
        userId: { type: 'string', description: 'User ID for saving connections' },
        name: { type: 'string', description: 'Connection name' },
        provider: { type: 'string', description: 'Database provider' },
        host: { type: 'string', description: 'Database host' },
        port: { type: 'number', description: 'Database port' },
        database: { type: 'string', description: 'Database name' },
      },
      required: ['action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — API & INTEGRATIONS (7 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'api_request',
    description: 'HTTP client: make API requests with auth, headers, body. Returns status, headers, body, latency.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Request URL' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], description: 'HTTP method' },
        headers: { type: 'object', description: 'Request headers' },
        body: { type: 'object', description: 'Request body (JSON)' },
        auth: { type: 'object', description: 'Auth config: {type, token} or {type, username, password}' },
        timeout: { type: 'number', description: 'Timeout in ms (default: 15000)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'api_mock',
    description: 'Create/manage mock API endpoints stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'delete', 'hit'], description: 'Mock action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Mock endpoint name' },
        method: { type: 'string', description: 'HTTP method' },
        path: { type: 'string', description: 'Mock endpoint path' },
        statusCode: { type: 'number', description: 'Response status code' },
        body: { type: 'object', description: 'Response body' },
        delay: { type: 'number', description: 'Response delay in ms' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'api_document',
    description: 'Generate or validate OpenAPI 3.0 documentation.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['generate', 'validate'], description: 'Document action' },
        title: { type: 'string', description: 'API title' },
        version: { type: 'string', description: 'API version' },
        endpoints: { type: 'array', description: 'API endpoints to document' },
        spec: { type: 'object', description: 'OpenAPI spec to validate' },
      },
      required: ['action'],
    },
  },
  {
    name: 'api_test',
    description: 'Test API endpoints: health checks, test suites, load testing.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['test', 'load'], description: 'Test action' },
        url: { type: 'string', description: 'URL to test' },
        tests: { type: 'array', description: 'Test suite with assertions' },
        concurrent: { type: 'number', description: 'Concurrent requests for load test' },
        duration: { type: 'number', description: 'Load test duration in ms' },
      },
      required: ['action'],
    },
  },
  {
    name: 'api_transform',
    description: 'Transform API schemas: REST to GraphQL, validate schemas.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['rest_to_graphql', 'validate_schema'], description: 'Transform action' },
        endpoints: { type: 'array', description: 'REST endpoints to convert' },
        schema: { type: 'object', description: 'Schema to validate' },
        data: { type: 'object', description: 'Data to validate against schema' },
      },
      required: ['action'],
    },
  },
  {
    name: 'webhook_listen',
    description: 'Create/manage webhook endpoints stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'logs', 'delete'], description: 'Webhook action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Webhook name' },
        events: { type: 'array', items: { type: 'string' }, description: 'Events to listen for' },
        id: { type: 'string', description: 'Webhook ID (for logs/delete)' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'sdk_generate',
    description: 'Generate API client SDK from OpenAPI spec (JavaScript/TypeScript).',
    parameters: {
      type: 'object',
      properties: {
        spec: { type: 'object', description: 'OpenAPI 3.0 specification' },
        language: { type: 'string', enum: ['javascript', 'typescript'], description: 'Target language' },
        baseUrl: { type: 'string', description: 'API base URL' },
      },
      required: ['spec'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — AI & ML TOOLS (5 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'llm_chat',
    description: 'Multi-provider LLM chat (Mistral, xAI, OpenAI). Send prompts or message arrays.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['mistral', 'xai', 'openai'], description: 'LLM provider' },
        model: { type: 'string', description: 'Model name (auto-selected if omitted)' },
        prompt: { type: 'string', description: 'Simple prompt string' },
        messages: { type: 'array', description: 'Chat message array [{role, content}]' },
        system: { type: 'string', description: 'System prompt' },
        temperature: { type: 'number', description: 'Sampling temperature 0-2' },
        maxTokens: { type: 'number', description: 'Max response tokens' },
        json: { type: 'boolean', description: 'Request JSON response format' },
      },
    },
  },
  {
    name: 'llm_embed',
    description: 'Generate text embeddings using OpenAI models.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to embed' },
        texts: { type: 'array', items: { type: 'string' }, description: 'Multiple texts to embed' },
        model: { type: 'string', description: 'Embedding model (default: text-embedding-3-small)' },
      },
    },
  },
  {
    name: 'llm_finetune',
    description: 'Fine-tune OpenAI models: create jobs, upload data, check status.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'status', 'cancel', 'upload'], description: 'Fine-tune action' },
        trainingFile: { type: 'string', description: 'Training file ID' },
        model: { type: 'string', description: 'Base model to fine-tune' },
        jobId: { type: 'string', description: 'Fine-tuning job ID' },
        data: { type: 'array', description: 'JSONL training data' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ml_train',
    description: 'Train ML models: linear regression, KNN classification, K-means clustering, descriptive stats.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['regression', 'classification', 'cluster', 'stats'], description: 'Training action' },
        data: { type: 'array', description: 'Training data array of objects' },
        target: { type: 'string', description: 'Target variable name' },
        features: { type: 'array', items: { type: 'string' }, description: 'Feature variable names' },
        k: { type: 'number', description: 'K for KNN or K-means' },
        clusters: { type: 'number', description: 'Number of clusters' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'ml_predict',
    description: 'Make predictions using trained ML models.',
    parameters: {
      type: 'object',
      properties: {
        model: { type: 'object', description: 'Trained model object (from ml_train output)' },
        input: { type: 'object', description: 'Input data for prediction' },
      },
      required: ['model', 'input'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — SECURITY TOOLS (6 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'crypto_hash',
    description: 'Hash data using SHA-256, MD5, SHA-512, or bcrypt. Verify hashes, compute HMACs.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['hash', 'verify', 'hmac', 'file', 'checksum'], description: 'Hash action' },
        data: { type: 'string', description: 'Data to hash' },
        algorithm: { type: 'string', enum: ['sha256', 'md5', 'sha512', 'sha1', 'bcrypt'], description: 'Hash algorithm' },
        hash: { type: 'string', description: 'Hash to verify against' },
        key: { type: 'string', description: 'HMAC secret key' },
        filePath: { type: 'string', description: 'File path for file hashing' },
      },
      required: ['action'],
    },
  },
  {
    name: 'crypto_encrypt',
    description: 'Encrypt/decrypt data using AES-256-GCM or RSA. Generate encryption keys.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['encrypt', 'decrypt', 'generate_key', 'rsa_generate', 'rsa_encrypt', 'rsa_decrypt'], description: 'Encryption action' },
        data: { type: 'string', description: 'Data to encrypt/decrypt' },
        password: { type: 'string', description: 'Password for AES encryption' },
        encrypted: { type: 'string', description: 'Encrypted data to decrypt' },
        publicKey: { type: 'string', description: 'RSA public key' },
        privateKey: { type: 'string', description: 'RSA private key' },
        keySize: { type: 'number', description: 'RSA key size (default: 2048)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'crypto_sign',
    description: 'Digitally sign and verify data using RSA or ECDSA.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['sign', 'verify'], description: 'Sign action' },
        data: { type: 'string', description: 'Data to sign' },
        privateKey: { type: 'string', description: 'Private key for signing' },
        publicKey: { type: 'string', description: 'Public key for verification' },
        signature: { type: 'string', description: 'Signature to verify' },
        algorithm: { type: 'string', enum: ['RSA-SHA256', 'RSA-SHA512', 'ecdsa-with-SHA256'], description: 'Signing algorithm' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scan_secrets',
    description: 'Scan code/content for leaked secrets: AWS keys, API tokens, private keys, passwords.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to scan' },
        filePath: { type: 'string', description: 'File path to scan' },
        scanType: { type: 'string', enum: ['content', 'file', 'directory'], description: 'Scan type' },
      },
      required: ['scanType'],
    },
  },
  {
    name: 'scan_malware',
    description: 'Scan code for suspicious patterns: eval injection, shell exec, obfuscation, SQL injection.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Code content to scan' },
        filePath: { type: 'string', description: 'File path to scan' },
        scanType: { type: 'string', enum: ['content', 'file', 'directory'], description: 'Scan type' },
      },
      required: ['scanType'],
    },
  },
  {
    name: 'auth_generate',
    description: 'Generate JWTs, API keys, UUIDs, secure passwords, OAuth tokens.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['jwt', 'jwt_verify', 'jwt_decode', 'api_key', 'uuid', 'password', 'oauth_token'], description: 'Generation action' },
        payload: { type: 'object', description: 'JWT payload data' },
        secret: { type: 'string', description: 'JWT secret key' },
        token: { type: 'string', description: 'Token to verify/decode' },
        expiresIn: { type: 'string', description: 'Token expiration (e.g. "1h", "7d")' },
        length: { type: 'number', description: 'Password/key length' },
      },
      required: ['action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — AGENT INTELLIGENCE (5 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'agent_memory',
    description: 'Enhanced agent memory: save, load, search across all memories.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['save', 'load', 'search'], description: 'Memory action' },
        key: { type: 'string', description: 'Memory key' },
        content: { type: 'string', description: 'Content to save' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        query: { type: 'string', description: 'Search query' },
        userId: { type: 'string', description: 'User ID' },
        agentId: { type: 'string', description: 'Agent ID' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_safety',
    description: 'Content safety checking and rate limiting.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check', 'rate_limit'], description: 'Safety action' },
        content: { type: 'string', description: 'Content to check' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_ui',
    description: 'Send UI notifications and messages to the user.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['message', 'warning', 'error', 'success', 'progress'], description: 'Notification type' },
        message: { type: 'string', description: 'Message content' },
        title: { type: 'string', description: 'Notification title' },
        severity: { type: 'string', enum: ['info', 'warning', 'error', 'success'], description: 'Severity level' },
        duration: { type: 'number', description: 'Display duration in ms' },
      },
      required: ['message'],
    },
  },
  {
    name: 'agent_control',
    description: 'Manage agent state: get status, set mode, cancel tasks.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'set_mode', 'cancel'], description: 'Control action' },
        mode: { type: 'string', description: 'Agent mode to set' },
      },
      required: ['action'],
    },
  },
  {
    name: 'editor_select',
    description: 'Code/text selection and cursor operations.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_selection', 'set_cursor', 'select_range'], description: 'Editor action' },
        selection: { type: 'string', description: 'Text selection' },
        cursor: { type: 'object', description: 'Cursor position {line, column}' },
      },
      required: ['action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — FILE SYSTEM (Extended)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'write_file',
    description: 'Write content to a file with modes: write, append, prepend, insert at line.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
        mode: { type: 'string', enum: ['write', 'append', 'prepend', 'insert'], description: 'Write mode' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
        line: { type: 'number', description: 'Line number for insert mode' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'get_project_tree',
    description: 'Generate a directory tree view with file listing and sizes.',
    parameters: {
      type: 'object',
      properties: {
        rootPath: { type: 'string', description: 'Root directory path (default: .)' },
        maxDepth: { type: 'number', description: 'Maximum directory depth (default: 5)' },
        includeFiles: { type: 'boolean', description: 'Include files (not just dirs)' },
        showSize: { type: 'boolean', description: 'Show file sizes' },
        excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude' },
      },
    },
  },
  {
    name: 'file_watch',
    description: 'Create/manage file watchers stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'check', 'delete'], description: 'Watch action' },
        userId: { type: 'string', description: 'User ID' },
        watchPath: { type: 'string', description: 'Path to watch' },
        pattern: { type: 'string', description: 'File pattern to match' },
        events: { type: 'array', items: { type: 'string' }, description: 'Events to watch' },
        id: { type: 'string', description: 'Watch ID (for delete)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'sync_files',
    description: 'Sync/diff directories, create backups.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['diff', 'sync', 'backup'], description: 'Sync action' },
        source: { type: 'string', description: 'Source directory' },
        target: { type: 'string', description: 'Target directory' },
        dryRun: { type: 'boolean', description: 'Preview without changes' },
        deleteExtra: { type: 'boolean', description: 'Delete extra files in target' },
      },
      required: ['action'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — CONTENT & MARKDOWN (5 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'markdown_convert',
    description: 'Convert markdown to/from HTML, plain text, JSON structure.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['to_html', 'to_text', 'from_html', 'to_json'], description: 'Conversion action' },
        content: { type: 'string', description: 'Content to convert' },
        title: { type: 'string', description: 'Page title (for to_html fullPage)' },
        fullPage: { type: 'boolean', description: 'Generate complete HTML page' },
        css: { type: 'string', description: 'Custom CSS for HTML output' },
      },
      required: ['action', 'content'],
    },
  },
  {
    name: 'markdown_validate',
    description: 'Lint and validate markdown documents.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content to validate' },
        rules: { type: 'object', description: 'Validation rules: {maxLineLength, noTabs}' },
      },
      required: ['content'],
    },
  },
  {
    name: 'markdown_generate',
    description: 'Generate markdown documents: README, changelog, API docs, tables.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['readme', 'changelog', 'api_docs', 'table'], description: 'Generation action' },
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Description' },
        features: { type: 'array', items: { type: 'string' }, description: 'Feature list' },
        entries: { type: 'array', description: 'Changelog entries' },
        endpoints: { type: 'array', description: 'API endpoints' },
        headers: { type: 'array', items: { type: 'string' }, description: 'Table headers' },
        rows: { type: 'array', description: 'Table rows' },
      },
      required: ['action'],
    },
  },
  {
    name: 'markdown_toc',
    description: 'Generate a table of contents from markdown headings.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content' },
        maxDepth: { type: 'number', description: 'Maximum heading depth (default: 4)' },
        ordered: { type: 'boolean', description: 'Use ordered list' },
      },
      required: ['content'],
    },
  },
  {
    name: 'markdown_format',
    description: 'Format and beautify markdown documents.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Markdown content to format' },
        options: { type: 'object', description: 'Format options: {lineWidth, bulletChar, emphasisChar}' },
      },
      required: ['content'],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // V2.0 — ANALYTICS & MONITORING (5 tools)
  // ══════════════════════════════════════════════════════════════
  {
    name: 'analytics_track',
    description: 'Track analytics events stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['event', 'page_view', 'batch'], description: 'Tracking action' },
        userId: { type: 'string', description: 'User ID' },
        eventName: { type: 'string', description: 'Event name' },
        category: { type: 'string', description: 'Event category' },
        properties: { type: 'object', description: 'Event properties' },
        events: { type: 'array', description: 'Batch events array' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'analytics_dashboard',
    description: 'View analytics: overview, event list, funnel analysis.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['overview', 'events', 'funnel'], description: 'Dashboard action' },
        userId: { type: 'string', description: 'User ID to filter by' },
        eventName: { type: 'string', description: 'Filter by event name' },
        from: { type: 'string', description: 'Start date (ISO string)' },
        to: { type: 'string', description: 'End date (ISO string)' },
        steps: { type: 'array', items: { type: 'string' }, description: 'Funnel step event names' },
      },
      required: ['action'],
    },
  },
  {
    name: 'log_parse',
    description: 'Parse, filter, and analyze log files.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['parse', 'filter', 'stats'], description: 'Parse action' },
        content: { type: 'string', description: 'Log content to parse' },
        level: { type: 'string', description: 'Filter by log level' },
        contains: { type: 'string', description: 'Filter by text content' },
        regex: { type: 'string', description: 'Filter by regex pattern' },
      },
      required: ['action'],
    },
  },
  {
    name: 'monitor_health',
    description: 'Health check endpoints stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check', 'create', 'list', 'status', 'delete'], description: 'Health action' },
        userId: { type: 'string', description: 'User ID' },
        url: { type: 'string', description: 'URL to check' },
        name: { type: 'string', description: 'Check name' },
        method: { type: 'string', description: 'HTTP method (default: GET)' },
        expectedStatus: { type: 'number', description: 'Expected HTTP status code' },
        id: { type: 'string', description: 'Health check ID (for delete)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'telemetry_send',
    description: 'Send and query telemetry metrics stored in the database.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'batch', 'query'], description: 'Telemetry action' },
        userId: { type: 'string', description: 'User ID' },
        metric: { type: 'string', description: 'Metric name' },
        value: { type: 'number', description: 'Metric value' },
        tags: { type: 'object', description: 'Metric tags' },
        unit: { type: 'string', description: 'Metric unit' },
        metrics: { type: 'array', description: 'Batch metrics array' },
        from: { type: 'string', description: 'Query start date' },
        to: { type: 'string', description: 'Query end date' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Workflow Engine (5)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'workflow_create',
    description: 'Create, update, clone, or manage reusable multi-step workflow pipelines with DAG validation.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'get', 'list', 'clone', 'delete'], description: 'Workflow action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string', description: 'Workflow description' },
        steps: { type: 'array', description: 'Workflow steps [{id, tool, params, dependsOn?, condition?}]' },
        tags: { type: 'array', description: 'Tags for categorization' },
        id: { type: 'string', description: 'Workflow ID (get/update/clone/delete)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'workflow_execute',
    description: 'Execute a workflow pipeline with topological ordering, variable interpolation, and state tracking.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['run', 'status', 'cancel', 'history'], description: 'Execution action' },
        workflowId: { type: 'string', description: 'Workflow ID to execute' },
        userId: { type: 'string', description: 'User ID' },
        trigger: { type: 'string', description: 'Trigger source (manual/scheduled/api)' },
        runId: { type: 'string', description: 'Run ID (status/cancel)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'workflow_schedule',
    description: 'Schedule workflows with cron expressions. Set, remove, list, pause, resume schedules.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set', 'remove', 'list', 'pause', 'resume'], description: 'Schedule action' },
        workflowId: { type: 'string', description: 'Workflow ID' },
        userId: { type: 'string', description: 'User ID' },
        schedule: { type: 'string', description: 'Cron expression (e.g. "0 9 * * 1-5")' },
      },
      required: ['action'],
    },
  },
  {
    name: 'workflow_visualize',
    description: 'Generate Mermaid DAG diagrams, execution timelines, and performance stats for workflows.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['dag', 'timeline', 'stats'], description: 'Visualization type' },
        workflowId: { type: 'string', description: 'Workflow ID' },
        userId: { type: 'string', description: 'User ID' },
        runId: { type: 'string', description: 'Run ID (for timeline)' },
      },
      required: ['action', 'workflowId'],
    },
  },
  {
    name: 'workflow_optimize',
    description: 'Analyze workflows for parallelization opportunities, bottlenecks, duplicates, and cost savings.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'reorder'], description: 'Optimization action' },
        workflowId: { type: 'string', description: 'Workflow ID' },
        userId: { type: 'string', description: 'User ID' },
        steps: { type: 'array', description: 'Workflow steps (for reorder without workflowId)' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Knowledge Graph (5)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'kg_create',
    description: 'Create, update, or delete entities and relations in a persistent knowledge graph.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['entity', 'relation', 'batch', 'delete_entity', 'delete_relation'], description: 'KG create action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Entity name' },
        type: { type: 'string', description: 'Entity type (person, concept, tech, etc.)' },
        properties: { type: 'object', description: 'Entity/relation properties' },
        from: { type: 'string', description: 'Source entity ID/name (for relations)' },
        to: { type: 'string', description: 'Target entity ID/name (for relations)' },
        relationType: { type: 'string', description: 'Relation type (e.g. uses, knows, depends_on)' },
        entities: { type: 'array', description: 'Batch entities [{name, type, properties}]' },
        relations: { type: 'array', description: 'Batch relations [{from, to, type}]' },
        id: { type: 'string', description: 'Entity or Relation ID (for delete_entity/delete_relation)' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'kg_query',
    description: 'Search, traverse, and query the knowledge graph with BFS shortest path and statistics.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'get', 'traverse', 'shortest_path', 'neighbors', 'stats'], description: 'Query action' },
        userId: { type: 'string', description: 'User ID' },
        query: { type: 'string', description: 'Search query' },
        id: { type: 'string', description: 'Entity ID (get/neighbors)' },
        name: { type: 'string', description: 'Entity name (get/neighbors/search)' },
        type: { type: 'string', description: 'Filter by entity type' },
        from: { type: 'string', description: 'Start entity ID/name (shortest_path)' },
        to: { type: 'string', description: 'End entity ID/name (shortest_path)' },
        start: { type: 'string', description: 'Start entity name (traverse)' },
        startId: { type: 'string', description: 'Start entity ID (traverse)' },
        depth: { type: 'number', description: 'Traversal depth (default 3)' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'kg_visualize',
    description: 'Generate Mermaid graph diagrams, cluster views, and adjacency matrices of the knowledge graph.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['graph', 'cluster', 'matrix'], description: 'Visualization type' },
        userId: { type: 'string', description: 'User ID' },
        type: { type: 'string', description: 'Filter by entity type' },
        limit: { type: 'number', description: 'Max entities to include' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'kg_merge',
    description: 'Find duplicate entities (Levenshtein similarity), merge them, or auto-merge above threshold.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['find_duplicates', 'merge', 'auto_merge'], description: 'Merge action' },
        userId: { type: 'string', description: 'User ID' },
        threshold: { type: 'number', description: 'Similarity threshold 0-1 (default 0.8)' },
        keepId: { type: 'string', description: 'Entity to keep (merge)' },
        mergeId: { type: 'string', description: 'Entity to merge into keepId' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'kg_reason',
    description: 'Infer new relations, detect patterns, identify hubs, and suggest connections in knowledge graph.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['infer', 'find_patterns', 'suggest_connections'], description: 'Reasoning action' },
        userId: { type: 'string', description: 'User ID' },
        entityId: { type: 'string', description: 'Entity ID (for suggest_connections)' },
      },
      required: ['action', 'userId'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Business & Growth (6)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'growth_analyze',
    description: 'Analyze growth funnels, cohort retention, churn metrics, and key growth indicators.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['funnel', 'cohort', 'churn', 'metrics'], description: 'Analysis type' },
        userId: { type: 'string', description: 'User ID' },
        stages: { type: 'array', description: 'Funnel stage names e.g. ["visit","signup","activate","purchase"]' },
        days: { type: 'number', description: 'Time range in days (default 30)' },
        granularity: { type: 'string', enum: ['day', 'week', 'month'], description: 'Cohort grouping' },
      },
      required: ['action'],
    },
  },
  {
    name: 'pricing_simulate',
    description: 'Model revenue scenarios with pricing strategies, elasticity analysis, and LTV projections.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['model', 'elasticity', 'ltv'], description: 'Pricing action' },
        plans: { type: 'array', description: 'Pricing plans [{name, price, distribution}]' },
        totalUsers: { type: 'number', description: 'Total user base' },
        basePrice: { type: 'number', description: 'Base price (elasticity)' },
        baseConversions: { type: 'number', description: 'Base conversions count (elasticity)' },
        elasticity: { type: 'number', description: 'Price elasticity (-2 to 0)' },
        arpu: { type: 'number', description: 'Average revenue per user (LTV)' },
        churnRate: { type: 'number', description: 'Monthly churn rate 0-1' },
        discountRate: { type: 'number', description: 'Annual discount rate (LTV)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ab_test_run',
    description: 'Create and manage A/B tests with deterministic variant assignment and conversion tracking.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'start', 'record', 'assign', 'stop', 'list'], description: 'A/B test action' },
        userId: { type: 'string', description: 'User ID' },
        id: { type: 'string', description: 'Test ID' },
        name: { type: 'string', description: 'Test name' },
        hypothesis: { type: 'string', description: 'Test hypothesis' },
        metric: { type: 'string', description: 'Primary metric' },
        variants: { type: 'array', description: 'Variants [{name, weight}]' },
        variantId: { type: 'string', description: 'Variant ID (record)' },
        impressions: { type: 'number', description: 'Impressions to record (record)' },
        converted: { type: 'boolean', description: 'Whether conversion occurred (record)' },
        visitorId: { type: 'string', description: 'Visitor ID for deterministic assignment' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ab_test_analyze',
    description: 'Analyze A/B test results with Z-test significance, confidence intervals, and sample size calculation.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['results', 'power'], description: 'Analysis action' },
        id: { type: 'string', description: 'Test ID (results)' },
        baselineRate: { type: 'number', description: 'Baseline conversion rate (power)' },
        minimumDetectableEffect: { type: 'number', description: 'Minimum detectable effect (power)' },
        alpha: { type: 'number', description: 'Significance level (default 0.05)' },
        power: { type: 'number', description: 'Statistical power (default 0.8)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'lead_enrich',
    description: 'Enrich leads with DNS/MX/SPF/DMARC checks, website analysis, and lead scoring.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['enrich', 'score', 'batch'], description: 'Enrichment action' },
        email: { type: 'string', description: 'Email to enrich' },
        domain: { type: 'string', description: 'Domain to analyze' },
        company: { type: 'string', description: 'Company name to enrich' },
        leads: { type: 'array', description: 'Batch leads to enrich [{email, domain}]' },
        lead: { type: 'object', description: 'Lead object for scoring' },
      },
      required: ['action'],
    },
  },
  {
    name: 'campaign_generate',
    description: 'Generate marketing campaigns (email, ad, social, SMS, push) with tone variants and ROI tracking.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'generate_variants', 'list', 'update', 'metrics'], description: 'Campaign action' },
        userId: { type: 'string', description: 'User ID' },
        type: { type: 'string', enum: ['email', 'ad', 'social', 'sms', 'push'], description: 'Campaign type' },
        name: { type: 'string', description: 'Campaign name' },
        product: { type: 'string', description: 'Product name' },
        audience: { type: 'object', description: 'Target audience details' },
        tone: { type: 'string', description: 'Tone (professional, casual, urgent, playful)' },
        budget: { type: 'number', description: 'Campaign budget' },
        id: { type: 'string', description: 'Campaign ID (update/metrics)' },
        campaignId: { type: 'string', description: 'Campaign ID (generate_variants)' },
        metrics: { type: 'object', description: 'Campaign metrics to update' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Collaboration (5)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'team_invite',
    description: 'Invite team members, accept invitations, remove members, and list teams.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['invite', 'accept', 'remove', 'list', 'teams'], description: 'Team action' },
        userId: { type: 'string', description: 'User ID' },
        teamId: { type: 'string', description: 'Team ID' },
        inviteeId: { type: 'string', description: 'User ID to invite' },
        role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'], description: 'Role' },
        memberId: { type: 'string', description: 'Team member record ID' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'role_assign',
    description: 'Assign roles with hierarchical permissions, check access, and manage RBAC.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['assign', 'permissions', 'check', 'roles'], description: 'Role action' },
        userId: { type: 'string', description: 'User ID' },
        memberId: { type: 'string', description: 'Team member ID' },
        role: { type: 'string', description: 'Role to assign' },
        permissions: { type: 'object', description: 'Custom permissions' },
        permission: { type: 'string', description: 'Permission to check' },
        teamId: { type: 'string', description: 'Team ID' },
      },
      required: ['action'],
    },
  },
  {
    name: 'comment_thread',
    description: 'Create discussion threads, reply, resolve/reopen, and add emoji reactions.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'reply', 'list', 'resolve', 'reopen', 'react'], description: 'Comment action' },
        userId: { type: 'string', description: 'User ID' },
        threadId: { type: 'string', description: 'Thread ID' },
        targetType: { type: 'string', description: 'Target type (file, task, deployment, etc.)' },
        targetId: { type: 'string', description: 'Target ID' },
        content: { type: 'string', description: 'Comment content' },
        parentId: { type: 'string', description: 'Parent comment ID (for nesting)' },
        commentId: { type: 'string', description: 'Comment ID (for react)' },
        emoji: { type: 'string', description: 'Emoji reaction' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'task_assign',
    description: 'Create tasks with priority, labels, due dates, dependencies. Kanban board view included.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'assign', 'list', 'board', 'delete'], description: 'Task action' },
        userId: { type: 'string', description: 'User ID' },
        id: { type: 'string', description: 'Task ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], description: 'Task status' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Priority' },
        assigneeId: { type: 'string', description: 'Assignee user ID' },
        teamId: { type: 'string', description: 'Team ID' },
        labels: { type: 'array', description: 'Task labels' },
        dueDate: { type: 'string', description: 'Due date ISO string' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'approval_flow',
    description: 'Create multi-step approval workflows with required/optional approvers and decision tracking.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'decide', 'status', 'list', 'cancel'], description: 'Approval action' },
        userId: { type: 'string', description: 'User ID' },
        requestId: { type: 'string', description: 'Approval request ID' },
        title: { type: 'string', description: 'Approval title' },
        description: { type: 'string', description: 'Approval description' },
        type: { type: 'string', description: 'Approval type (deploy, access, change, budget)' },
        approvers: { type: 'array', description: 'Approvers [{userId, required}]' },
        deadline: { type: 'string', description: 'Deadline ISO string' },
        decision: { type: 'string', enum: ['approve', 'reject'], description: 'Decision' },
        comment: { type: 'string', description: 'Decision comment' },
      },
      required: ['action', 'userId'],
    },
  },
  {
    name: 'activity_log',
    description: 'Log, query, and get stats on project/user activity events (file changes, tool usage, deploys, etc.).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['log', 'query', 'stats'], description: 'Activity log action' },
        userId: { type: 'string', description: 'User ID' },
        projectId: { type: 'string', description: 'Project ID' },
        event: { type: 'string', description: 'Event type (e.g. file_created, tool_used, deploy_started)' },
        details: { type: 'object', description: 'Event details object' },
        metadata: { type: 'object', description: 'Additional metadata' },
        source: { type: 'string', description: 'Event source (agent, user, system)' },
        since: { type: 'string', description: 'ISO date to filter from' },
        limit: { type: 'number', description: 'Max results to return' },
      },
      required: ['action'],
    },
  },
  {
    name: 'access_audit',
    description: 'Audit resource access: log access events, query audit trail, generate access reports.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['log', 'query', 'report'], description: 'Audit action' },
        userId: { type: 'string', description: 'User ID' },
        resource: { type: 'string', description: 'Resource type (project, file, api_key, etc.)' },
        resourceId: { type: 'string', description: 'Specific resource ID' },
        accessType: { type: 'string', enum: ['read', 'write', 'delete', 'execute', 'admin'], description: 'Access type' },
        outcome: { type: 'string', enum: ['allowed', 'denied'], description: 'Access outcome' },
        reason: { type: 'string', description: 'Reason for access or denial' },
        since: { type: 'string', description: 'ISO date to filter from' },
        limit: { type: 'number', description: 'Max results to return' },
      },
      required: ['action'],
    },
  },
  {
    name: 'notify_team',
    description: 'Send team notifications, list recent notifications, and mark as read.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['send', 'list', 'mark_read'], description: 'Notification action' },
        userId: { type: 'string', description: 'User/sender ID' },
        projectId: { type: 'string', description: 'Project ID' },
        message: { type: 'string', description: 'Notification message' },
        channel: { type: 'string', description: 'Channel (general, alerts, updates)' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority level' },
        type: { type: 'string', enum: ['info', 'warning', 'error', 'success'], description: 'Notification type' },
        recipients: { type: 'array', description: 'Array of recipient user IDs' },
        notificationId: { type: 'string', description: 'Notification ID (for mark_read)' },
        since: { type: 'string', description: 'ISO date to filter from' },
        limit: { type: 'number', description: 'Max results to return' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Advanced AI Control (7)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'llm_router',
    description: 'Intelligently route queries to the best LLM model based on complexity, cost, and speed.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['route', 'models', 'compare'], description: 'Router action' },
        query: { type: 'string', description: 'Query to route' },
        prompt: { type: 'string', description: 'Alias for query' },
        task: { type: 'string', description: 'Task description' },
        constraints: { type: 'object', description: 'Constraints {provider, maxCost, minQuality, minContext, preferCheap, preferFast}' },
        models: { type: 'array', description: 'Models to compare (compare action)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'llm_cost_optimize',
    description: 'Analyze LLM usage costs, suggest cheaper alternatives, and generate budget plans.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'budget'], description: 'Cost optimization action' },
        userId: { type: 'string', description: 'User ID' },
        days: { type: 'number', description: 'Days to analyze (default 30)' },
        monthlyBudget: { type: 'number', description: 'Monthly budget in USD (budget action)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'llm_guardrail',
    description: 'Detect prompt injection, PII, and policy violations. Sanitize unsafe inputs.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check', 'sanitize'], description: 'Guardrail action' },
        input: { type: 'string', description: 'Input text to check/sanitize' },
        prompt: { type: 'string', description: 'Prompt to check (alias for input)' },
        checkPII: { type: 'boolean', description: 'Enable PII detection (default true)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'llm_evaluate',
    description: 'Grade AI responses on relevance, completeness, accuracy, clarity. Compare multiple responses.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['grade', 'compare', 'factcheck'], description: 'Evaluation action' },
        response: { type: 'string', description: 'Response to evaluate' },
        query: { type: 'string', description: 'Original query for relevance scoring' },
        criteria: { type: 'array', description: 'Evaluation criteria' },
        responses: { type: 'array', description: 'Multiple responses to compare' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_spawn',
    description: 'Create specialized sub-agents with specific goals, tools, and model configurations.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'delete'], description: 'Agent action' },
        name: { type: 'string', description: 'Agent name' },
        goal: { type: 'string', description: 'Agent goal/objective' },
        personality: { type: 'string', description: 'Agent personality/specialty' },
        systemPrompt: { type: 'string', description: 'Custom system prompt' },
        welcomeMessage: { type: 'string', description: 'Agent welcome message' },
        model: { type: 'string', description: 'AI model to use' },
        tools: { type: 'array', description: 'Tools available to this agent' },
        tags: { type: 'array', description: 'Custom tags for the agent' },
        temperature: { type: 'number', description: 'Temperature 0-1' },
        agentId: { type: 'string', description: 'Agent ID (delete)' },
        status: { type: 'string', description: 'Filter by status (list)' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_delegate',
    description: 'Delegate tasks to sub-agents with tracking, status checks, and completion management.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['assign', 'status', 'complete'], description: 'Delegation action' },
        userId: { type: 'string', description: 'User ID' },
        agentId: { type: 'string', description: 'Agent ID to delegate to' },
        task: { type: 'string', description: 'Task description' },
        instructions: { type: 'string', description: 'Detailed instructions' },
        priority: { type: 'string', description: 'Task priority' },
        taskId: { type: 'string', description: 'Task ID (status/complete)' },
        hoursSpent: { type: 'number', description: 'Hours spent on task (complete)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_reflect',
    description: 'Self-evaluation loop: assess goal alignment, tool usage, reasoning quality. Store learnings.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['evaluate', 'learn', 'history'], description: 'Reflection action' },
        userId: { type: 'string', description: 'User ID' },
        conversation: { type: 'string', description: 'Conversation to evaluate' },
        response: { type: 'string', description: 'Response to evaluate' },
        goal: { type: 'string', description: 'Goal for alignment check' },
        lesson: { type: 'string', description: 'Lesson learned (learn action)' },
        context: { type: 'string', description: 'Context for the lesson' },
        category: { type: 'string', description: 'Lesson category' },
        score: { type: 'number', description: 'Quality score for the lesson (learn)' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['action'],
    },
  },
  {
    name: 'prompt_template',
    description: 'Create, render, version, and manage parameterized prompt templates with {{variable}} placeholders.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'render', 'list', 'update', 'delete'], description: 'Template action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Template name' },
        templateId: { type: 'string', description: 'Template ID' },
        template: { type: 'string', description: 'Template text with {{placeholders}}' },
        description: { type: 'string', description: 'Template description' },
        variables: { type: 'object', description: 'Variables to render into template' },
        category: { type: 'string', description: 'Template category' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['action'],
    },
  },
  {
    name: 'llm_fallback',
    description: 'Configure and execute LLM fallback chains — auto-retry with next model on failure.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['configure', 'execute', 'list', 'delete'], description: 'Fallback action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Fallback config name' },
        configId: { type: 'string', description: 'Config ID' },
        chain: { type: 'array', description: 'Array of model names in fallback order' },
        maxRetries: { type: 'number', description: 'Max retry attempts' },
        timeoutMs: { type: 'number', description: 'Timeout per model in ms' },
        retryOn: { type: 'array', description: 'Conditions to retry on (timeout, rate_limit, 5xx, error)' },
        limit: { type: 'number', description: 'Max results for list' },
      },
      required: ['action'],
    },
  },
  {
    name: 'agent_memory_search',
    description: 'Search across agent memory banks for relevant context, get memory stats, or clear memories.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'stats', 'clear'], description: 'Memory search action' },
        userId: { type: 'string', description: 'User ID' },
        agentId: { type: 'string', description: 'Agent ID (default: nova)' },
        query: { type: 'string', description: 'Search query text' },
        summary: { type: 'string', description: 'Filter by memory bank summary/category' },
        confirm: { type: 'boolean', description: 'Confirm destructive clear action' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Data Science (5)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'data_profile',
    description: 'Statistical profiling of datasets: types, distributions, outliers, correlations, quality scores.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'summary'], description: 'Profiling action' },
        userId: { type: 'string', description: 'User ID' },
        data: { type: 'array', description: 'Data array of objects [{col1: val, col2: val}]' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'data_clean',
    description: 'Clean datasets: auto-clean, deduplicate, fill nulls, normalize, remove outliers.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['auto', 'deduplicate', 'fill', 'normalize'], description: 'Cleaning action' },
        data: { type: 'array', description: 'Data array of objects' },
        column: { type: 'string', description: 'Target column (fill)' },
        columns: { type: 'array', description: 'Columns to normalize' },
        strategy: { type: 'string', enum: ['median', 'mean', 'mode', 'value'], description: 'Fill strategy' },
        method: { type: 'string', enum: ['minmax', 'zscore'], description: 'Normalization method' },
        removeOutliers: { type: 'boolean', description: 'Remove IQR outliers (auto)' },
        key: { type: 'string', description: 'Dedup key column' },
        value: { type: 'string', description: 'Fill value' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'data_visualize',
    description: 'Generate text-based charts: bar, histogram, scatter, heatmap, line. Also Mermaid pie/xy charts.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['chart', 'mermaid'], description: 'Visualization action' },
        type: { type: 'string', enum: ['bar', 'histogram', 'scatter', 'heatmap', 'line', 'pie', 'xy'], description: 'Chart type' },
        data: { type: 'array', description: 'Data array' },
        x: { type: 'string', description: 'X-axis column' },
        y: { type: 'string', description: 'Y-axis column' },
        column: { type: 'string', description: 'Column for histogram' },
        bins: { type: 'number', description: 'Number of histogram bins' },
        title: { type: 'string', description: 'Chart title' },
        matrix: { type: 'array', description: '2D array for heatmap' },
        labels: { type: 'array', description: 'Row labels' },
        colLabels: { type: 'array', description: 'Column labels (heatmap)' },
        label: { type: 'string', description: 'Label column (pie)' },
        value: { type: 'string', description: 'Value column (pie)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'feature_engineer',
    description: 'Feature engineering: log, sqrt, interaction, ratio, binning, one-hot, lag, rolling mean transforms.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['transform', 'suggest'], description: 'Engineering action' },
        data: { type: 'array', description: 'Data array of objects' },
        transforms: { type: 'array', description: 'Transform specs [{type, column, columns?, bins?, lag?, window?}]' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'model_compare',
    description: 'Evaluate ML models: regression/classification metrics, cross-validation, multi-model ranking.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['evaluate', 'compare', 'cross_validate'], description: 'Comparison action' },
        userId: { type: 'string', description: 'User ID' },
        predictions: { type: 'array', description: 'Predicted values' },
        actuals: { type: 'array', description: 'Actual values' },
        taskType: { type: 'string', enum: ['regression', 'classification'], description: 'Task type' },
        models: { type: 'array', description: 'Multiple models [{name, predictions, actuals}]' },
        data: { type: 'array', description: 'Dataset for cross-validation' },
        target: { type: 'string', description: 'Target column' },
        folds: { type: 'number', description: 'K-fold count (default 5)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'data_sample',
    description: 'Random/stratified sampling, train-test split, and bootstrap sampling from datasets.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['random', 'stratified', 'split', 'bootstrap'], description: 'Sampling action' },
        data: { type: 'array', description: 'Data array of objects' },
        size: { type: 'number', description: 'Sample size' },
        ratio: { type: 'number', description: 'Sample ratio (0-1)' },
        column: { type: 'string', description: 'Stratification column' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'outlier_detect',
    description: 'Detect outliers using IQR, Z-score, or modified Z-score. Remove outliers or scan multiple columns.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['detect', 'remove', 'multi_column'], description: 'Detection action' },
        data: { type: 'array', description: 'Data array of objects' },
        column: { type: 'string', description: 'Target column' },
        columns: { type: 'array', description: 'Columns for multi-column scan' },
        method: { type: 'string', enum: ['iqr', 'zscore', 'modified_zscore'], description: 'Detection method' },
        threshold: { type: 'number', description: 'Detection threshold' },
      },
      required: ['action', 'data'],
    },
  },
  {
    name: 'data_correlate',
    description: 'Correlation analysis: full matrix, pairwise, top correlations, or feature importance vs target.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['matrix', 'pair', 'top', 'target'], description: 'Correlation action' },
        data: { type: 'array', description: 'Data array of objects' },
        columns: { type: 'array', description: 'Columns to include' },
        column1: { type: 'string', description: 'First column (pair)' },
        column2: { type: 'string', description: 'Second column (pair)' },
        target: { type: 'string', description: 'Target column for feature importance' },
        limit: { type: 'number', description: 'Max results (top action)' },
      },
      required: ['action', 'data'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Geo & Location (4)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'geo_geocode',
    description: 'Geocode addresses to coordinates (forward), coordinates to addresses (reverse), or batch geocode.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['forward', 'reverse', 'batch'], description: 'Geocoding action' },
        userId: { type: 'string', description: 'User ID' },
        address: { type: 'string', description: 'Address to geocode (forward)' },
        lat: { type: 'number', description: 'Latitude (reverse)' },
        lon: { type: 'number', description: 'Longitude (reverse)' },
        addresses: { type: 'array', description: 'Addresses to batch geocode' },
        limit: { type: 'number', description: 'Max results per query' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_route',
    description: 'Get driving/walking/cycling directions, multi-stop routes, and isochrone estimations.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['directions', 'multi_stop', 'isochrone'], description: 'Routing action' },
        from: { type: 'object', description: 'Start point {lat, lon}' },
        to: { type: 'object', description: 'End point {lat, lon}' },
        waypoints: { type: 'array', description: 'Waypoints [{lat, lon}] for multi_stop' },
        center: { type: 'object', description: 'Center point for isochrone' },
        profile: { type: 'string', enum: ['driving', 'walking', 'cycling'], description: 'Travel mode' },
        minutes: { type: 'array', description: 'Isochrone minutes [5, 10, 15, 30]' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_distance',
    description: 'Calculate distances (haversine), distance matrices, radius queries, and midpoints.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['calculate', 'matrix', 'within_radius', 'midpoint'], description: 'Distance action' },
        from: { type: 'object', description: 'Start point {lat, lon}' },
        to: { type: 'object', description: 'End point {lat, lon}' },
        points: { type: 'array', description: 'Points array [{lat, lon, label?}]' },
        center: { type: 'object', description: 'Center point (within_radius)' },
        radius: { type: 'number', description: 'Radius in km (default 10)' },
        unit: { type: 'string', enum: ['km', 'mi', 'nm'], description: 'Distance unit' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_fence',
    description: 'Create and manage geofences with enter/exit triggers, check point containment, visualize.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'check', 'list', 'update', 'delete', 'visualize'], description: 'Geofence action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Fence name' },
        center: { type: 'object', description: 'Center point {lat, lon}' },
        radius: { type: 'number', description: 'Radius in km' },
        type: { type: 'string', enum: ['circle', 'polygon'], description: 'Fence type' },
        coordinates: { type: 'array', description: 'Polygon coordinates [{lat, lon}]' },
        triggers: { type: 'array', description: 'Trigger events [enter, exit]' },
        point: { type: 'object', description: 'Point to check {lat, lon}' },
        fenceId: { type: 'string', description: 'Fence ID' },
        active: { type: 'boolean', description: 'Fence active state' },
        metadata: { type: 'object', description: 'Custom metadata for the fence' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_timezone',
    description: 'Timezone lookup by coordinates, convert between timezones, list major zones.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['lookup', 'convert', 'list'], description: 'Timezone action' },
        lat: { type: 'number', description: 'Latitude (lookup)' },
        lon: { type: 'number', description: 'Longitude (lookup)' },
        time: { type: 'string', description: 'ISO time to convert' },
        fromOffset: { type: 'number', description: 'Source UTC offset hours' },
        toOffset: { type: 'number', description: 'Target UTC offset hours' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_ip_locate',
    description: 'Geolocate IP addresses — single, batch, or distance between two IPs.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['locate', 'batch', 'distance'], description: 'IP location action' },
        ip: { type: 'string', description: 'IP address (or "self" for current)' },
        ips: { type: 'array', description: 'Array of IPs for batch lookup' },
        ip1: { type: 'string', description: 'First IP (distance)' },
        ip2: { type: 'string', description: 'Second IP (distance)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_poi',
    description: 'Search nearby points of interest (restaurants, ATMs, hospitals, etc.) via OpenStreetMap.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'categories', 'nearby_summary'], description: 'POI action' },
        lat: { type: 'number', description: 'Latitude' },
        lon: { type: 'number', description: 'Longitude' },
        category: { type: 'string', description: 'POI category (restaurant, cafe, hotel, hospital, atm, bank, etc.)' },
        radius: { type: 'number', description: 'Search radius in meters (default 1000)' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'geo_address_validate',
    description: 'Validate, parse, and standardize addresses. Batch validation supported.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['validate', 'parse', 'batch_validate'], description: 'Validation action' },
        address: { type: 'string', description: 'Address to validate or parse' },
        addresses: { type: 'array', description: 'Addresses array for batch validation' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Cloud Control (5)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'cloud_deploy',
    description: 'Create and manage cloud deployments with health checks, rollback, and multi-provider support.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'status', 'list', 'update', 'rollback', 'delete'], description: 'Deploy action' },
        userId: { type: 'string', description: 'User ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
        name: { type: 'string', description: 'Deployment name' },
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure', 'vercel', 'railway', 'fly', 'render', 'docker'], description: 'Cloud provider' },
        service: { type: 'string', description: 'Service type' },
        region: { type: 'string', description: 'Deployment region' },
        image: { type: 'string', description: 'Container image' },
        replicas: { type: 'number', description: 'Number of replicas' },
        memory: { type: 'string', description: 'Memory allocation (512Mi, 1Gi)' },
        cpu: { type: 'string', description: 'CPU allocation (0.5, 1)' },
        domain: { type: 'string', description: 'Custom domain' },
        healthCheck: { type: 'string', description: 'Health check path' },
        env: { type: 'object', description: 'Environment variables' },
        ports: { type: 'array', description: 'Port mappings [{container, host}]' },
        ssl: { type: 'boolean', description: 'Enable SSL (default true)' },
        autoScale: { type: 'object', description: 'Auto-scaling config {min, max, targetCPU}' },
        status: { type: 'string', description: 'Filter by status (list) or set status (update)' },
        url: { type: 'string', description: 'Deployment URL (update)' },
        config: { type: 'object', description: 'Deployment config (update)' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_scale',
    description: 'Scale deployments: set replicas, configure auto-scaling, resize CPU/memory.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set', 'auto', 'resize'], description: 'Scale action' },
        userId: { type: 'string', description: 'User ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
        replicas: { type: 'number', description: 'Target replicas (set)' },
        min: { type: 'number', description: 'Min replicas (auto)' },
        max: { type: 'number', description: 'Max replicas (auto)' },
        targetCPU: { type: 'number', description: 'Target CPU utilization % (auto)' },
        targetMemory: { type: 'number', description: 'Target memory utilization % (auto)' },
        scaleUpCooldown: { type: 'number', description: 'Seconds before scale-up (auto, default 60)' },
        scaleDownCooldown: { type: 'number', description: 'Seconds before scale-down (auto, default 300)' },
        memory: { type: 'string', description: 'New memory (resize)' },
        cpu: { type: 'string', description: 'New CPU (resize)' },
      },
      required: ['action', 'deploymentId'],
    },
  },
  {
    name: 'cloud_logs',
    description: 'View, filter, search, and aggregate deployment logs across all environments.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'append', 'aggregate'], description: 'Log action' },
        userId: { type: 'string', description: 'User ID' },
        deploymentId: { type: 'string', description: 'Deployment ID' },
        level: { type: 'string', enum: ['info', 'warn', 'error'], description: 'Log level filter' },
        search: { type: 'string', description: 'Search pattern' },
        since: { type: 'string', description: 'Start time ISO string' },
        limit: { type: 'number', description: 'Max logs to return' },
        message: { type: 'string', description: 'Log message (append)' },
        source: { type: 'string', description: 'Log source label (append, default "manual")' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_secrets',
    description: 'Manage encrypted secrets (AES-256-GCM): set, get, list, rotate, delete across vaults.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['set', 'get', 'list', 'rotate', 'delete'], description: 'Secret action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Secret name' },
        value: { type: 'string', description: 'Secret value (set)' },
        newValue: { type: 'string', description: 'New value (rotate)' },
        vault: { type: 'string', description: 'Vault name (default: "default")' },
        description: { type: 'string', description: 'Secret description' },
        rotateAfterDays: { type: 'number', description: 'Days until rotation required' },
        raw: { type: 'boolean', description: 'Return unmasked value (get)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_cost',
    description: 'Estimate deployment costs, view spending summaries, and get optimization suggestions.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['estimate', 'summary', 'optimize'], description: 'Cost action' },
        userId: { type: 'string', description: 'User ID' },
        provider: { type: 'string', description: 'Cloud provider' },
        memory: { type: 'string', description: 'Memory (512Mi, 1Gi)' },
        cpu: { type: 'string', description: 'CPU (0.5, 1)' },
        replicas: { type: 'number', description: 'Number of replicas' },
        hours: { type: 'number', description: 'Hours to estimate (default 730 = 1 month)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_domain',
    description: 'Manage domains: add custom domains, SSL certificates, DNS lookup, check SSL status.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'list', 'check_ssl', 'dns_lookup', 'delete'], description: 'Domain action' },
        userId: { type: 'string', description: 'User ID' },
        domain: { type: 'string', description: 'Domain name' },
        domainId: { type: 'string', description: 'Domain record ID (delete)' },
        type: { type: 'string', enum: ['A', 'CNAME', 'AAAA', 'MX', 'TXT'], description: 'DNS record type' },
        target: { type: 'string', description: 'DNS target value' },
        ssl: { type: 'boolean', description: 'Enable SSL (default true)' },
        provider: { type: 'string', description: 'DNS provider' },
        limit: { type: 'number', description: 'Max results for list' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_backup',
    description: 'Create, list, restore, schedule cloud backups. Full/incremental with encryption.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'restore', 'delete', 'schedule'], description: 'Backup action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Backup name' },
        backupId: { type: 'string', description: 'Backup ID (restore/delete)' },
        type: { type: 'string', enum: ['full', 'incremental', 'differential'], description: 'Backup type' },
        source: { type: 'string', description: 'Source to backup (database, files, config)' },
        compressed: { type: 'boolean', description: 'Compress backup (default true)' },
        encrypted: { type: 'boolean', description: 'Encrypt backup (default true)' },
        retentionDays: { type: 'number', description: 'Days to retain (default 30)' },
        frequency: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'], description: 'Schedule frequency' },
        time: { type: 'string', description: 'Schedule time (HH:MM)' },
        limit: { type: 'number', description: 'Max results for list' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_monitor',
    description: 'Monitor cloud services: health status, uptime checks, metrics, alert configuration.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'uptime_check', 'metrics', 'alerts'], description: 'Monitor action' },
        userId: { type: 'string', description: 'User ID' },
        url: { type: 'string', description: 'URL for uptime check' },
        deploymentId: { type: 'string', description: 'Deployment ID for metrics' },
        timeout: { type: 'number', description: 'Check timeout in ms (default 10000)' },
        period: { type: 'string', enum: ['5m', '15m', '1h', '6h', '24h'], description: 'Metrics period' },
        custom: { type: 'boolean', description: 'Add custom alert' },
        threshold: { type: 'string', description: 'Custom alert threshold' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['action'],
    },
  },
  {
    name: 'cloud_network',
    description: 'Manage cloud networking: VPCs, firewalls, load balancers, CDN distributions.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['vpc_create', 'firewall', 'load_balancer', 'cdn', 'list'], description: 'Network action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Resource name' },
        cidr: { type: 'string', description: 'CIDR block (vpc_create, default 10.0.0.0/16)' },
        region: { type: 'string', description: 'Cloud region' },
        rules: { type: 'array', description: 'Firewall rules [{port, protocol, source, action}]' },
        adminIp: { type: 'string', description: 'Admin IP for SSH access' },
        type: { type: 'string', enum: ['application', 'network', 'gateway'], description: 'Load balancer type' },
        scheme: { type: 'string', enum: ['internet-facing', 'internal'], description: 'LB scheme' },
        algorithm: { type: 'string', enum: ['round-robin', 'least-connections', 'ip-hash'], description: 'LB algorithm' },
        targets: { type: 'array', description: 'LB target instances' },
        healthCheckPath: { type: 'string', description: 'Health check endpoint' },
        targetPort: { type: 'number', description: 'Backend port' },
        origin: { type: 'string', description: 'CDN origin URL' },
        cachePolicy: { type: 'string', description: 'CDN cache policy' },
        ttl: { type: 'number', description: 'CDN TTL in seconds' },
      },
      required: ['action'],
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // V3.0 TOOLS — Advanced Security (4)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'scan_vulnerabilities',
    description: 'Scan URLs, code, or dependencies for security vulnerabilities with severity scoring.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['scan', 'history', 'compare'], description: 'Scan action' },
        userId: { type: 'string', description: 'User ID' },
        target: { type: 'string', description: 'URL, code, or JSON dependencies to scan' },
        targetType: { type: 'string', enum: ['url', 'code', 'dependencies'], description: 'Target type (auto-detected if omitted)' },
        scanIds: { type: 'array', description: 'Scan IDs to compare' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['action'],
    },
  },
  {
    name: 'policy_enforce',
    description: 'Create and enforce security policies (OWASP, API security, data protection) with templates.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'check', 'list', 'update', 'delete', 'templates'], description: 'Policy action' },
        userId: { type: 'string', description: 'User ID' },
        policyId: { type: 'string', description: 'Policy ID' },
        name: { type: 'string', description: 'Policy name' },
        description: { type: 'string', description: 'Policy description' },
        rules: { type: 'array', description: 'Policy rules [{check, severity, message}]' },
        enforcement: { type: 'string', enum: ['warn', 'block', 'monitor'], description: 'Enforcement level' },
        scope: { type: 'object', description: 'Policy scope' },
        input: { type: 'object', description: 'Input to validate against policies (check)' },
        active: { type: 'boolean', description: 'Policy active state' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'threat_model',
    description: 'STRIDE threat modeling: identify threats from architecture, generate attack trees, risk scoring.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'analyze', 'list', 'update'], description: 'Threat model action' },
        userId: { type: 'string', description: 'User ID' },
        modelId: { type: 'string', description: 'Threat model ID' },
        name: { type: 'string', description: 'Model name' },
        description: { type: 'string', description: 'Model description' },
        architecture: { type: 'object', description: 'Architecture {components: [{name, type}], dataFlows: [{from, to, data, encrypted}], trustBoundaries: []}' },
        methodology: { type: 'string', enum: ['STRIDE', 'PASTA', 'LINDDUN'], description: 'Methodology' },
        status: { type: 'string', enum: ['draft', 'in_review', 'reviewed', 'approved'], description: 'Status' },
        mitigations: { type: 'array', description: 'Mitigation strategies (update)' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'incident_response',
    description: 'Incident management: create, update, timeline tracking, runbooks, MTTR dashboard.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'timeline', 'list', 'dashboard'], description: 'Incident action' },
        userId: { type: 'string', description: 'User ID' },
        incidentId: { type: 'string', description: 'Incident ID' },
        title: { type: 'string', description: 'Incident title' },
        severity: { type: 'string', enum: ['p0', 'p1', 'p2', 'p3', 'p4'], description: 'Severity level' },
        description: { type: 'string', description: 'Incident description' },
        source: { type: 'string', description: 'Detection source' },
        affectedSystems: { type: 'array', description: 'Affected systems list' },
        status: { type: 'string', enum: ['open', 'investigating', 'mitigating', 'resolved', 'closed'], description: 'Incident status' },
        mitigation: { type: 'string', description: 'Mitigation action taken' },
        rootCause: { type: 'string', description: 'Root cause analysis' },
        lessons: { type: 'string', description: 'Post-incident lessons' },
        note: { type: 'string', description: 'Timeline note' },
        limit: { type: 'number', description: 'Max results (list)' },
      },
      required: ['action'],
    },
  },
  // ── Security Extras (6 tools) ─────────────────────────────────
  {
    name: 'security_audit',
    description: 'Full security posture audit: OWASP Top 10, HTTP headers, SSL/TLS, scoring, and history.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['full', 'headers', 'history'], description: 'Audit action' },
        userId: { type: 'string', description: 'User ID' },
        url: { type: 'string', description: 'Target URL to audit' },
        target: { type: 'string', description: 'Target name/identifier' },
        limit: { type: 'number', description: 'Max history items' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_compliance',
    description: 'Compliance checking against SOC2, HIPAA, PCI-DSS, GDPR, ISO 27001 frameworks.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check', 'frameworks', 'report'], description: 'Compliance action' },
        userId: { type: 'string', description: 'User ID' },
        framework: { type: 'string', enum: ['soc2', 'hipaa', 'pci_dss', 'gdpr', 'iso27001'], description: 'Compliance framework' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_pentest',
    description: 'Automated penetration testing: XSS, SQLi, CSRF, SSRF, auth bypass, command injection.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['run', 'xss', 'sqli', 'categories'], description: 'Pentest action' },
        userId: { type: 'string', description: 'User ID' },
        target: { type: 'string', description: 'Target URL' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_rbac',
    description: 'Role-based access control: create roles, assign, check permissions, audit assignments.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_role', 'list_roles', 'assign', 'check_permission', 'audit', 'revoke'], description: 'RBAC action' },
        userId: { type: 'string', description: 'User ID' },
        name: { type: 'string', description: 'Role name' },
        description: { type: 'string', description: 'Role description' },
        permissions: { type: 'array', items: { type: 'string' }, description: 'Permission list' },
        level: { type: 'number', description: 'Role level (higher = more access)' },
        targetUserId: { type: 'string', description: 'User to assign/check' },
        roleId: { type: 'string', description: 'Role ID' },
        permission: { type: 'string', description: 'Permission to check' },
        assignmentId: { type: 'string', description: 'Assignment ID to revoke' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_firewall',
    description: 'WAF & firewall management: IP blocking, rate limiting, geo-blocking, WAF rules.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add_rule', 'list', 'check_ip', 'rate_limit_status', 'waf_status', 'delete', 'toggle'], description: 'Firewall action' },
        userId: { type: 'string', description: 'User ID' },
        type: { type: 'string', enum: ['ip_block', 'rate_limit', 'geo_block', 'waf'], description: 'Rule type' },
        name: { type: 'string', description: 'Rule name' },
        pattern: { type: 'string', description: 'Match pattern' },
        ip: { type: 'string', description: 'IP address' },
        ruleAction: { type: 'string', enum: ['block', 'allow', 'log', 'challenge'], description: 'Rule action' },
        priority: { type: 'number', description: 'Rule priority (lower = first)' },
        ruleId: { type: 'string', description: 'Rule ID' },
        maxRequests: { type: 'number', description: 'Rate limit max requests' },
        windowSeconds: { type: 'number', description: 'Rate limit window in seconds' },
        countries: { type: 'array', items: { type: 'string' }, description: 'Country codes for geo-blocking' },
      },
      required: ['action'],
    },
  },
  {
    name: 'security_forensics',
    description: 'Digital forensics: IOC detection, log analysis, timeline, evidence preservation, hash checks.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['analyze', 'timeline', 'evidence', 'hash_check'], description: 'Forensics action' },
        userId: { type: 'string', description: 'User ID' },
        data: { type: 'string', description: 'Data to analyze or preserve' },
        logs: { type: 'string', description: 'Log data to analyze' },
        events: { type: 'array', description: 'Events for timeline analysis' },
        name: { type: 'string', description: 'Evidence name' },
        hash: { type: 'string', description: 'Hash to check (SHA-256/MD5/SHA-1)' },
        incidentId: { type: 'string', description: 'Related incident ID' },
      },
      required: ['action'],
    },
  },
];

/**
 * Video tool names — only available in canvas-app (standalone), NOT canvas-studio (embedded)
 */
const VIDEO_TOOL_NAMES = new Set([
  'video_trim', 'video_highlights', 'video_resize', 'video_captions',
  'video_style', 'video_overlay', 'video_audio', 'video_face',
  'video_moderate', 'video_batch', 'video_export', 'video_transform',
  'video_convert', 'video_analyze', 'video_filter', 'video_ai',
  'generate_video',
]);

/**
 * Tools relevant to a Canvas IDE — file editing, code execution, previewing.
 * Sending only these to the LLM instead of all 233 saves ~15K tokens per request
 * and prevents the model from picking irrelevant tools (cloud_scale, llm_finetune etc.)
 */
const CANVAS_RELEVANT_TOOL_NAMES = new Set([
  // File operations
  'update_file', 'create_file', 'write_file', 'modify_file',
  'read_file', 'delete_file', 'rename_file', 'copy_file', 'move_file',
  'append_to_file', 'apply_diff',
  // File navigation
  'list_files', 'list_folders', 'find_file', 'file_exists',
  'search_in_files', 'get_project_tree',
  // Code quality
  'format_code', 'analyze_code', 'run_tests', 'install_package',
  // Execution & preview
  'execute_code', 'get_preview_console', 'get_diagnostics',
  // Editor controls
  'open_file', 'editor_select', 'set_cursor_position',
  'insert_at_cursor', 'get_selection', 'replace_selection', 'set_mode',
  // API & web
  'api_request', 'fetch_url', 'web_search', 'web_scrape', 'web_screenshot',
  // Utilities
  'calculate', 'get_current_time', 'ask_user',
  'show_message', 'show_error', 'show_warning',
  'parse_json', 'parse_csv', 'parse_markdown',
  // Agent memory
  'get_memory', 'save_memory', 'clear_memory',
  // Image generation (Canvas App feature)
  'generate_image',
  // Video tools (filtered per source below)
  ...VIDEO_TOOL_NAMES,
]);

/**
 * Filter tools by source — removes video tools for canvas-studio (embedded)
 */
function filterToolsBySource(tools, source) {
  if (source === 'embedded') {
    return tools.filter(t => !VIDEO_TOOL_NAMES.has(t.name));
  }
  return tools;
}


/**
 * Convert tools to OpenAI format (function wrapper)
 * @param {string} source - 'embedded' (canvas-studio) or 'standalone' (canvas-app)
 */
export function toOpenAITools(tools = CANVAS_IDE_TOOLS, source = 'standalone') {
  // All 233 tools available — no whitelist, no approval required
  const filtered = filterToolsBySource(tools, source);
  return filtered.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Tools for the chat panel (orchestrate route).
 * Only what Nova needs to build/edit code — NOT image processing, video, editor
 * cursor tools, or zip/parse tools (those have their own dedicated panels).
 */
export const CHAT_PANEL_TOOL_NAMES = new Set([
  // ── Core file operations ──
  'update_file', 'create_file', 'write_file', 'modify_file',
  'read_file', 'delete_file', 'rename_file', 'copy_file', 'move_file',
  'create_folder', 'append_to_file',
  // ── File navigation ──
  'list_files', 'list_folders', 'file_exists', 'get_project_tree',
  // ── Code quality ──
  'analyze_code', 'format_code', 'execute_code',
  // ── Web & research ──
  'web_search', 'fetch_url',
  // ── Image generation for project assets ──
  'generate_image',
  // ── User interaction & permissions ──
  'ask_user', 'show_message', 'show_warning', 'show_error',
  'request_approval', 'check_permission',
  // ── Persistent memory ──
  'save_memory', 'get_memory', 'clear_memory',
]);

/**
 * Returns only the chat-panel-relevant tools in OpenAI format.
 */
export function toChatPanelTools() {
  return CANVAS_IDE_TOOLS
    .filter(t => CHAT_PANEL_TOOL_NAMES.has(t.name))
    .map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
}

export { VIDEO_TOOL_NAMES };
export default CANVAS_IDE_TOOLS;
