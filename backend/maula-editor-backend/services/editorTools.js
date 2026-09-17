/**
 * Editor Control Tools - Anthropic Tool Definitions + Executor
 * Cursor & Selection control for maula-editor integration
 * editor_cursor, editor_selection, editor_insert, editor_context, editor_select
 */

// ============================================================================
// ANTHROPIC TOOL DEFINITIONS
// ============================================================================
const EDITOR_TOOL_DEFINITIONS = [
  {
    name: 'editor_cursor',
    description: 'Control the editor cursor position. Actions: set_cursor (move cursor to position), get_cursor (get current cursor position), scroll_to_line (scroll editor to line)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set_cursor', 'get_cursor', 'scroll_to_line'],
          description: 'Cursor operation to perform'
        },
        line: { type: 'integer', description: 'Line number (1-based)' },
        column: { type: 'integer', description: 'Column number (0-based)', default: 0 }
      },
      required: ['action']
    }
  },
  {
    name: 'editor_selection',
    description: 'Control text selection in the editor. Actions: set_selection (select text range), get_selection (get current selection), clear_selection (deselect), select_word (select word at cursor), select_line (select entire line)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set_selection', 'get_selection', 'clear_selection', 'select_word', 'select_line'],
          description: 'Selection operation to perform'
        },
        startLine: { type: 'integer', description: 'Start line (1-based)' },
        startColumn: { type: 'integer', description: 'Start column (0-based)', default: 0 },
        endLine: { type: 'integer', description: 'End line (1-based)' },
        endColumn: { type: 'integer', description: 'End column (0-based)' },
        line: { type: 'integer', description: 'Line number for select_line action' }
      },
      required: ['action']
    }
  },
  {
    name: 'editor_insert',
    description: 'Insert or replace text in the editor. Actions: insert_at_cursor (insert at current cursor), replace_selection (replace selected text), insert_at_position (insert at specific position)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['insert_at_cursor', 'replace_selection', 'insert_at_position'],
          description: 'Insert operation to perform'
        },
        text: { type: 'string', description: 'Text to insert' },
        line: { type: 'integer', description: 'Line for insert_at_position' },
        column: { type: 'integer', description: 'Column for insert_at_position' }
      },
      required: ['action', 'text']
    }
  },
  {
    name: 'editor_context',
    description: 'Get editor context information. Actions: get_context (full editor state), get_selected_text (get currently selected text), get_line_content (get specific line content)',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_context', 'get_selected_text', 'get_line_content'],
          description: 'Context operation to perform'
        },
        line: { type: 'integer', description: 'Line number for get_line_content' }
      },
      required: ['action']
    }
  },
  {
    name: 'editor_select',
    description: `Unified editor selection tool: get, set, replace selections and cursor position in a single tool.

Actions:
- get_selection: Get the currently selected text, cursor position, and selection range
- set_selection: Select a range of text (startLine/startColumn to endLine/endColumn)
- replace_selection: Replace currently selected text with new text
- insert_at_cursor: Insert text at current cursor position
- get_cursor: Get current cursor line and column
- set_cursor: Move cursor to specific line/column
- select_all: Select all text in the editor
- select_range: Select text between two character offsets

USE THIS WHEN the user says: "get selection", "what's selected", "replace selection", "insert here", "cursor position", "select lines", "move cursor"`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_selection', 'set_selection', 'replace_selection', 'insert_at_cursor', 'get_cursor', 'set_cursor', 'select_all', 'select_range'],
          description: 'Editor selection action',
        },
        text: { type: 'string', description: '[replace_selection/insert_at_cursor] Text to insert or replace with' },
        line: { type: 'integer', description: '[set_cursor] Target line (1-based)' },
        column: { type: 'integer', description: '[set_cursor] Target column (0-based)' },
        startLine: { type: 'integer', description: '[set_selection] Start line (1-based)' },
        startColumn: { type: 'integer', description: '[set_selection] Start column (0-based)' },
        endLine: { type: 'integer', description: '[set_selection] End line (1-based)' },
        endColumn: { type: 'integer', description: '[set_selection] End column (0-based)' },
        startOffset: { type: 'integer', description: '[select_range] Start character offset' },
        endOffset: { type: 'integer', description: '[select_range] End character offset' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

/**
 * Execute an editor control tool
 * @param {string} toolName - The tool name
 * @param {object} toolInput - The tool input parameters
 * @param {object} editorContext - The editor context from frontend
 * @param {function} sendSSE - SSE sender function for editor commands
 * @returns {object} - Tool execution result
 */
async function executeEditorTool(toolName, toolInput, editorContext, sendSSE) {
  const { action } = toolInput;

  switch (toolName) {
    case 'editor_cursor':
      return handleCursor(action, toolInput, editorContext, sendSSE);
    case 'editor_selection':
      return handleSelection(action, toolInput, editorContext, sendSSE);
    case 'editor_insert':
      return handleInsert(action, toolInput, editorContext, sendSSE);
    case 'editor_context':
      return handleContext(action, toolInput, editorContext);
    case 'editor_select':
      return handleEditorSelect(action, toolInput, editorContext, sendSSE);
    default:
      return { success: false, error: `Unknown editor tool: ${toolName}` };
  }
}

// ============================================================================
// CURSOR HANDLERS
// ============================================================================
function handleCursor(action, input, editorContext, sendSSE) {
  switch (action) {
    case 'set_cursor': {
      const { line, column = 0 } = input;
      if (!line) return { success: false, error: 'Line number required' };

      // Send editor command to frontend
      sendSSE({
        type: 'editor_command',
        editorCommand: 'setCursor',
        line,
        column,
        success: true
      });

      return {
        success: true,
        message: `Cursor moved to line ${line}, column ${column}`,
        position: { line, column }
      };
    }

    case 'get_cursor': {
      const cursor = editorContext?.cursor || { line: 1, column: 0 };
      return {
        success: true,
        cursor,
        message: `Cursor at line ${cursor.line}, column ${cursor.column}`
      };
    }

    case 'scroll_to_line': {
      const { line } = input;
      if (!line) return { success: false, error: 'Line number required' };

      sendSSE({
        type: 'editor_command',
        editorCommand: 'scrollToLine',
        line,
        success: true
      });

      return {
        success: true,
        message: `Scrolled to line ${line}`
      };
    }

    default:
      return { success: false, error: `Unknown cursor action: ${action}` };
  }
}

// ============================================================================
// SELECTION HANDLERS
// ============================================================================
function handleSelection(action, input, editorContext, sendSSE) {
  switch (action) {
    case 'set_selection': {
      const { startLine, startColumn = 0, endLine, endColumn } = input;
      if (!startLine || !endLine) return { success: false, error: 'Start and end lines required' };

      sendSSE({
        type: 'editor_command',
        editorCommand: 'setSelection',
        startLine,
        startColumn,
        endLine,
        endColumn: endColumn ?? 0,
        success: true
      });

      return {
        success: true,
        message: `Selected from ${startLine}:${startColumn} to ${endLine}:${endColumn ?? 0}`,
        selection: { startLine, startColumn, endLine, endColumn: endColumn ?? 0 }
      };
    }

    case 'get_selection': {
      const selection = editorContext?.selection;
      const selectedText = editorContext?.selectedText;

      if (!selection) {
        return { success: true, hasSelection: false, message: 'No active selection' };
      }

      return {
        success: true,
        hasSelection: true,
        selection,
        selectedText: selectedText || '',
        message: `Selection: ${selection.start?.line || '?'}:${selection.start?.column || '?'} to ${selection.end?.line || '?'}:${selection.end?.column || '?'}`
      };
    }

    case 'clear_selection': {
      // Move cursor to start of selection to clear it
      const cursor = editorContext?.cursor || { line: 1, column: 0 };
      sendSSE({
        type: 'editor_command',
        editorCommand: 'setCursor',
        line: cursor.line,
        column: cursor.column,
        success: true
      });

      return { success: true, message: 'Selection cleared' };
    }

    case 'select_line': {
      const { line } = input;
      const targetLine = line || editorContext?.cursor?.line || 1;

      sendSSE({
        type: 'editor_command',
        editorCommand: 'setSelection',
        startLine: targetLine,
        startColumn: 0,
        endLine: targetLine + 1,
        endColumn: 0,
        success: true
      });

      return {
        success: true,
        message: `Selected line ${targetLine}`,
        line: targetLine
      };
    }

    case 'select_word': {
      // Select the word at the current cursor position
      const cursorPos = editorContext?.cursor || { line: 1, column: 0 };
      const lineContent = editorContext?.lineContent || '';

      if (!lineContent) {
        return { success: false, error: 'No line content available at cursor' };
      }

      // Find word boundaries around the cursor column
      const col = cursorPos.column || 0;
      let wordStart = col;
      let wordEnd = col;
      const wordChars = /[a-zA-Z0-9_$]/;

      while (wordStart > 0 && wordChars.test(lineContent[wordStart - 1])) wordStart--;
      while (wordEnd < lineContent.length && wordChars.test(lineContent[wordEnd])) wordEnd++;

      if (wordStart === wordEnd) {
        return { success: true, message: 'No word at cursor position', hasSelection: false };
      }

      sendSSE({
        type: 'editor_command',
        editorCommand: 'setSelection',
        startLine: cursorPos.line,
        startColumn: wordStart,
        endLine: cursorPos.line,
        endColumn: wordEnd,
        success: true
      });

      const selectedWord = lineContent.substring(wordStart, wordEnd);
      return {
        success: true,
        message: `Selected word: "${selectedWord}"`,
        word: selectedWord,
        selection: { startLine: cursorPos.line, startColumn: wordStart, endLine: cursorPos.line, endColumn: wordEnd }
      };
    }

    default:
      return { success: false, error: `Unknown selection action: ${action}` };
  }
}

// ============================================================================
// INSERT HANDLERS
// ============================================================================
function handleInsert(action, input, editorContext, sendSSE) {
  const { text, line, column } = input;

  if (!text && text !== '') {
    return { success: false, error: 'Text required for insert operations' };
  }

  switch (action) {
    case 'insert_at_cursor': {
      sendSSE({
        type: 'editor_command',
        editorCommand: 'insertAtCursor',
        text,
        success: true
      });

      return {
        success: true,
        message: `Inserted ${text.length} characters at cursor`,
        insertedLength: text.length
      };
    }

    case 'replace_selection': {
      const hasSelection = editorContext?.selection && editorContext?.selectedText;

      sendSSE({
        type: 'editor_command',
        editorCommand: 'replaceSelection',
        text,
        success: true
      });

      return {
        success: true,
        message: hasSelection
          ? `Replaced selection with ${text.length} characters`
          : `Inserted ${text.length} characters (no selection)`,
        insertedLength: text.length,
        hadSelection: !!hasSelection
      };
    }

    case 'insert_at_position': {
      if (!line) return { success: false, error: 'Line number required for insert_at_position' };

      // First set cursor, then insert
      sendSSE({
        type: 'editor_command',
        editorCommand: 'setCursor',
        line,
        column: column || 0,
        success: true
      });

      // Small delay would be needed in practice, but we send both commands
      sendSSE({
        type: 'editor_command',
        editorCommand: 'insertAtCursor',
        text,
        success: true
      });

      return {
        success: true,
        message: `Inserted ${text.length} characters at line ${line}, column ${column || 0}`,
        position: { line, column: column || 0 },
        insertedLength: text.length
      };
    }

    default:
      return { success: false, error: `Unknown insert action: ${action}` };
  }
}

// ============================================================================
// CONTEXT HANDLERS
// ============================================================================
function handleContext(action, input, editorContext) {
  switch (action) {
    case 'get_context': {
      return {
        success: true,
        context: {
          activeFile: editorContext?.activeFile || null,
          cursor: editorContext?.cursor || { line: 1, column: 0 },
          selection: editorContext?.selection || null,
          selectedText: editorContext?.selectedText || null,
          language: editorContext?.language || 'unknown',
          openFiles: editorContext?.openFiles || [],
          fileCount: editorContext?.fileCount || 0,
          projectTree: editorContext?.projectTree ? 'available' : 'not available'
        },
        message: `Editor context for ${editorContext?.activeFile || 'no file'}`
      };
    }

    case 'get_selected_text': {
      const selectedText = editorContext?.selectedText;
      return {
        success: true,
        hasSelection: !!selectedText,
        selectedText: selectedText || '',
        length: selectedText?.length || 0,
        message: selectedText
          ? `Selected text: ${selectedText.length} characters`
          : 'No text selected'
      };
    }

    case 'get_line_content': {
      const { line } = input;
      if (!line) return { success: false, error: 'Line number required' };

      // Get line from active content
      const content = editorContext?.activeContent || '';
      const lines = content.split('\n');

      if (line < 1 || line > lines.length) {
        return {
          success: false,
          error: `Line ${line} out of range (1-${lines.length})`
        };
      }

      const lineContent = lines[line - 1];
      return {
        success: true,
        line,
        content: lineContent,
        length: lineContent.length,
        totalLines: lines.length
      };
    }

    default:
      return { success: false, error: `Unknown context action: ${action}` };
  }
}

// ============================================================================
// EDITOR SELECT HANDLERS
// ============================================================================
async function handleEditorSelect(action, input, editorContext, sendSSE) {
  switch (action) {
    case 'get_selection': {
      const selection = editorContext?.selection || null;
      if (!selection || !selection.text) {
        return { success: true, hasSelection: false, text: '', message: 'No active selection' };
      }
      return {
        success: true,
        hasSelection: true,
        text: selection.text,
        startLine: selection.startLine,
        endLine: selection.endLine,
        startColumn: selection.startColumn,
        endColumn: selection.endColumn,
        length: selection.text.length
      };
    }

    case 'set_selection': {
      const { startLine, startColumn, endLine, endColumn } = input;
      if (!startLine || !endLine) return { success: false, error: 'startLine and endLine required' };
      if (sendSSE) {
        sendSSE('editor_action', {
          type: 'set_selection',
          startLine, startColumn: startColumn || 1,
          endLine, endColumn: endColumn || Infinity
        });
      }
      return {
        success: true,
        action: 'set_selection',
        range: { startLine, startColumn: startColumn || 1, endLine, endColumn: endColumn || Infinity }
      };
    }

    case 'replace_selection': {
      const { newText } = input;
      if (newText === undefined) return { success: false, error: 'newText required' };
      const currentSelection = editorContext?.selection;
      if (!currentSelection || !currentSelection.text) {
        return { success: false, error: 'No active selection to replace' };
      }
      if (sendSSE) {
        sendSSE('editor_action', { type: 'replace_selection', newText });
      }
      return {
        success: true,
        action: 'replace_selection',
        replacedText: currentSelection.text,
        newText,
        startLine: currentSelection.startLine,
        endLine: currentSelection.endLine
      };
    }

    case 'insert_at_cursor': {
      const { text } = input;
      if (!text) return { success: false, error: 'text required' };
      if (sendSSE) {
        sendSSE('editor_action', { type: 'insert_at_cursor', text });
      }
      return { success: true, action: 'insert_at_cursor', insertedText: text, length: text.length };
    }

    case 'get_cursor': {
      const cursor = editorContext?.cursor || { line: 1, column: 1 };
      return { success: true, line: cursor.line, column: cursor.column };
    }

    case 'set_cursor': {
      const { line, column } = input;
      if (!line) return { success: false, error: 'line required' };
      if (sendSSE) {
        sendSSE('editor_action', { type: 'set_cursor', line, column: column || 1 });
      }
      return { success: true, action: 'set_cursor', line, column: column || 1 };
    }

    case 'select_all': {
      const content = editorContext?.activeContent || '';
      const lines = content.split('\n');
      if (sendSSE) {
        sendSSE('editor_action', {
          type: 'set_selection',
          startLine: 1, startColumn: 1,
          endLine: lines.length, endColumn: (lines[lines.length - 1]?.length || 0) + 1
        });
      }
      return {
        success: true,
        action: 'select_all',
        totalLines: lines.length,
        totalLength: content.length
      };
    }

    case 'select_range': {
      const { startLine, endLine } = input;
      if (!startLine || !endLine) return { success: false, error: 'startLine and endLine required' };
      const content = editorContext?.activeContent || '';
      const allLines = content.split('\n');
      const selectedLines = allLines.slice(startLine - 1, endLine);
      const selectedText = selectedLines.join('\n');
      if (sendSSE) {
        sendSSE('editor_action', {
          type: 'set_selection',
          startLine, startColumn: 1,
          endLine, endColumn: (selectedLines[selectedLines.length - 1]?.length || 0) + 1
        });
      }
      return {
        success: true,
        action: 'select_range',
        startLine, endLine,
        selectedText,
        lineCount: selectedLines.length
      };
    }

    default:
      return { success: false, error: `Unknown editor_select action: ${action}` };
  }
}

// ============================================================================
// HELPER - Check if tool is an editor tool
// ============================================================================
function isEditorTool(toolName) {
  return ['editor_cursor', 'editor_selection', 'editor_insert', 'editor_context', 'editor_select'].includes(toolName);
}

export {
  EDITOR_TOOL_DEFINITIONS,
  executeEditorTool,
  isEditorTool
};
