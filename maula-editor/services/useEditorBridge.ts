/**
 * MAULA EDITOR - USE EDITOR BRIDGE HOOK
 * React hook for using the Editor Bridge in components
 * NOTE: This is completely independent from canvas-studio and neural-chat
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  EditorBridge, 
  EditorState, 
  CursorPosition, 
  Selection,
  FileNode,
  EditOperation,
  createEditorBridge,
  getEditorBridge,
} from './editorBridge';

export interface UseEditorBridgeReturn {
  // State
  state: EditorState;
  activeFile: string | null;
  cursor: CursorPosition;
  selection: Selection | null;
  files: Map<string, string>;
  fileList: string[];
  openFiles: string[];
  projectTree: FileNode[];
  language: string;
  isDirty: boolean;
  
  // File operations
  getFile: (path: string) => string | null;
  setFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string, language?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setActiveFile: (path: string) => void;
  
  // Edit operations
  insertAt: (position: CursorPosition, text: string) => void;
  insertAtCursor: (text: string) => void;
  replaceSelection: (text: string) => void;
  replaceRange: (start: CursorPosition, end: CursorPosition, text: string) => void;
  replaceAll: (searchPattern: string, replaceWith: string) => void;
  deleteLine: (lineNumber: number) => void;
  deleteLines: (startLine: number, endLine: number) => void;
  applyEdits: (operations: EditOperation[]) => void;
  
  // Cursor & Selection
  setCursor: (position: CursorPosition) => void;
  setSelection: (start: CursorPosition, end: CursorPosition) => void;
  getSelectedText: () => string | null;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Bulk operations
  loadFromFileTree: (files: Array<{ path: string; content: string; language?: string }>) => void;
  exportFiles: () => Record<string, string>;
  
  // Utility
  markClean: () => void;
  getAgentContext: () => ReturnType<EditorBridge['getAgentContext']>;
  
  // Bridge instance
  bridge: EditorBridge;
}

// Options for initializing the hook
export interface UseEditorBridgeOptions {
  initialFiles?: Record<string, string>;
  onMessage?: (message: string) => void;
  onApprovalRequest?: (action: string, details: string) => Promise<boolean>;
  onQuestion?: (question: string) => Promise<string>;
  onStatusChange?: (status: string) => void;
  onError?: (error: string) => void;
}

export function useEditorBridge(options?: UseEditorBridgeOptions): UseEditorBridgeReturn {
  const { 
    initialFiles, 
    onMessage, 
    onApprovalRequest, 
    onQuestion, 
    onStatusChange, 
    onError 
  } = options || {};
  
  // Initialize or get existing bridge
  const bridge = useMemo(() => {
    if (initialFiles) {
      return createEditorBridge(initialFiles);
    }
    return getEditorBridge();
  }, []);
  
  // Track state
  const [state, setState] = useState<EditorState>(() => bridge.getState());
  
  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = bridge.onChange((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [bridge]);
  
  // Register callbacks with the bridge
  useEffect(() => {
    if (onMessage) {
      (bridge as any).onMessageCallback = onMessage;
    }
    if (onApprovalRequest) {
      (bridge as any).onApprovalRequestCallback = onApprovalRequest;
    }
    if (onQuestion) {
      (bridge as any).onQuestionCallback = onQuestion;
    }
    if (onStatusChange) {
      (bridge as any).onStatusChangeCallback = onStatusChange;
      onStatusChange('ready');
    }
    if (onError) {
      (bridge as any).onErrorCallback = onError;
    }
    
    return () => {
      delete (bridge as any).onMessageCallback;
      delete (bridge as any).onApprovalRequestCallback;
      delete (bridge as any).onQuestionCallback;
      delete (bridge as any).onStatusChangeCallback;
      delete (bridge as any).onErrorCallback;
    };
  }, [bridge, onMessage, onApprovalRequest, onQuestion, onStatusChange, onError]);
  
  // Sync initial files if provided
  useEffect(() => {
    if (initialFiles) {
      Object.entries(initialFiles).forEach(([path, content]) => {
        if (!bridge.getFile(path)) {
          bridge.createFile(path, content);
        }
      });
    }
  }, [initialFiles, bridge]);
  
  // Memoized values
  const fileList = useMemo(() => Array.from(state.files.keys()), [state.files]);
  const openFiles = useMemo(() => bridge.getAgentContext().openFiles, [state]);
  
  // Wrapped methods
  const getFile = useCallback((path: string) => bridge.getFile(path), [bridge]);
  const setFile = useCallback((path: string, content: string) => bridge.setFile(path, content), [bridge]);
  const createFile = useCallback((path: string, content?: string, language?: string) => bridge.createFile(path, content || '', language), [bridge]);
  const deleteFile = useCallback((path: string) => bridge.deleteFile(path), [bridge]);
  const renameFile = useCallback((oldPath: string, newPath: string) => bridge.renameFile(oldPath, newPath), [bridge]);
  const setActiveFile = useCallback((path: string) => bridge.setActiveFile(path), [bridge]);
  
  const insertAt = useCallback((position: CursorPosition, text: string) => bridge.insertAt(position, text), [bridge]);
  const insertAtCursor = useCallback((text: string) => bridge.insertAtCursor(text), [bridge]);
  const replaceSelection = useCallback((text: string) => bridge.replaceSelection(text), [bridge]);
  const replaceRange = useCallback((start: CursorPosition, end: CursorPosition, text: string) => bridge.replaceRange(start, end, text), [bridge]);
  const replaceAll = useCallback((searchPattern: string, replaceWith: string) => bridge.replaceAll(searchPattern, replaceWith), [bridge]);
  const deleteLine = useCallback((lineNumber: number) => bridge.deleteLine(lineNumber), [bridge]);
  const deleteLines = useCallback((startLine: number, endLine: number) => bridge.deleteLines(startLine, endLine), [bridge]);
  const applyEdits = useCallback((operations: EditOperation[]) => bridge.applyEdits(operations), [bridge]);
  
  const setCursor = useCallback((position: CursorPosition) => bridge.setCursor(position), [bridge]);
  const setSelection = useCallback((start: CursorPosition, end: CursorPosition) => bridge.setSelection(start, end), [bridge]);
  const getSelectedText = useCallback(() => bridge.getSelectedText(), [bridge]);
  
  const undo = useCallback(() => bridge.undo(), [bridge]);
  const redo = useCallback(() => bridge.redo(), [bridge]);
  
  const loadFromFileTree = useCallback((files: Array<{ path: string; content: string; language?: string }>) => bridge.loadFromFileTree(files), [bridge]);
  const exportFiles = useCallback(() => bridge.exportFiles(), [bridge]);
  
  const markClean = useCallback(() => bridge.markClean(), [bridge]);
  const getAgentContext = useCallback(() => bridge.getAgentContext(), [bridge]);
  
  return {
    // State
    state,
    activeFile: state.activeFile,
    cursor: state.cursor,
    selection: state.selection,
    files: state.files,
    fileList,
    openFiles,
    projectTree: state.projectTree,
    language: state.language,
    isDirty: state.isDirty,
    
    // File operations
    getFile,
    setFile,
    createFile,
    deleteFile,
    renameFile,
    setActiveFile,
    
    // Edit operations
    insertAt,
    insertAtCursor,
    replaceSelection,
    replaceRange,
    replaceAll,
    deleteLine,
    deleteLines,
    applyEdits,
    
    // Cursor & Selection
    setCursor,
    setSelection,
    getSelectedText,
    
    // Undo/Redo
    undo,
    redo,
    
    // Bulk operations
    loadFromFileTree,
    exportFiles,
    
    // Utility
    markClean,
    getAgentContext,
    
    // Bridge instance
    bridge,
  };
}

export default useEditorBridge;
