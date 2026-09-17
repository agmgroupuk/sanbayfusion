import { create } from 'zustand';

// ── Types ──

export interface EditorSettings {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    bracketColoring: boolean;
    autoSave: boolean;
}

export interface ProblemItem {
    id: string;
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    source?: string;
}

export interface EditorTab {
    path: string;
    name: string;
    isDirty: boolean;
    isPinned: boolean;
}

export interface SearchMatch {
    file: string;
    line: number;
    column: number;
    length: number;
    text: string;
}

interface SearchState {
    query: string;
    replaceWith: string;
    isOpen: boolean;
    isRegex: boolean;
    isCaseSensitive: boolean;
    isWholeWord: boolean;
    matches: SearchMatch[];
    currentMatch: number;
}

interface CursorState {
    line: number;
    column: number;
}

// ── Store Interface ──

interface EditorStore {
    // Settings
    settings: EditorSettings;
    updateSettings: (partial: Partial<EditorSettings>) => void;
    resetSettings: () => void;

    // Cursor
    cursor: CursorState;
    setCursor: (line: number, column: number) => void;

    // Problems
    problems: ProblemItem[];
    showProblems: boolean;
    addProblem: (p: ProblemItem) => void;
    clearProblems: () => void;
    toggleProblems: () => void;

    // Search
    search: SearchState;
    setSearchQuery: (query: string) => void;
    setReplaceWith: (text: string) => void;
    updateSearchFlags: (flags: Partial<Pick<SearchState, 'isRegex' | 'isCaseSensitive' | 'isWholeWord'>>) => void;
    toggleSearch: () => void;
    nextMatch: () => void;
    prevMatch: () => void;
    setSearchMatches: (matches: SearchMatch[]) => void;

    // Tabs
    tabs: EditorTab[];
    activeTabPath: string | null;
    setActiveTab: (path: string) => void;
    openTab: (path: string, name?: string) => void;
    closeTab: (path: string) => void;
    pinTab: (path: string) => void;
    unpinTab: (path: string) => void;
    markDirty: (path: string, dirty: boolean) => void;
}

// ── Defaults ──

const defaultSettings: EditorSettings = {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    bracketColoring: true,
    autoSave: true,
};

const defaultSearch: SearchState = {
    query: '',
    replaceWith: '',
    isOpen: false,
    isRegex: false,
    isCaseSensitive: false,
    isWholeWord: false,
    matches: [],
    currentMatch: -1,
};

// ── Store ──

export const useEditorSettingsStore = create<EditorStore>((set) => ({
    // Settings
    settings: { ...defaultSettings },
    updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
    resetSettings: () => set({ settings: { ...defaultSettings } }),

    // Cursor
    cursor: { line: 1, column: 1 },
    setCursor: (line, column) => set({ cursor: { line, column } }),

    // Problems
    problems: [],
    showProblems: false,
    addProblem: (p) => set((s) => ({ problems: [...s.problems, p] })),
    clearProblems: () => set({ problems: [] }),
    toggleProblems: () => set((s) => ({ showProblems: !s.showProblems })),

    // Search
    search: { ...defaultSearch },
    setSearchQuery: (query) =>
        set((s) => ({ search: { ...s.search, query } })),
    setReplaceWith: (text) =>
        set((s) => ({ search: { ...s.search, replaceWith: text } })),
    updateSearchFlags: (flags) =>
        set((s) => ({ search: { ...s.search, ...flags } })),
    toggleSearch: () =>
        set((s) => ({ search: { ...s.search, isOpen: !s.search.isOpen } })),
    nextMatch: () =>
        set((s) => {
            if (s.search.matches.length === 0) return s;
            const next = (s.search.currentMatch + 1) % s.search.matches.length;
            return { search: { ...s.search, currentMatch: next } };
        }),
    prevMatch: () =>
        set((s) => {
            if (s.search.matches.length === 0) return s;
            const prev = s.search.currentMatch <= 0 ? s.search.matches.length - 1 : s.search.currentMatch - 1;
            return { search: { ...s.search, currentMatch: prev } };
        }),
    setSearchMatches: (matches) =>
        set((s) => ({ search: { ...s.search, matches, currentMatch: matches.length > 0 ? 0 : -1 } })),

    // Tabs
    tabs: [],
    activeTabPath: null,
    setActiveTab: (path) => set({ activeTabPath: path }),
    openTab: (path, name) =>
        set((s) => {
            const exists = s.tabs.find((t) => t.path === path);
            if (exists) return { activeTabPath: path };
            const fileName = name || path.split('/').pop() || path;
            return {
                tabs: [...s.tabs, { path, name: fileName, isDirty: false, isPinned: false }],
                activeTabPath: path,
            };
        }),
    closeTab: (path) =>
        set((s) => {
            const filtered = s.tabs.filter((t) => t.path !== path);
            const newActive = s.activeTabPath === path
                ? (filtered.length > 0 ? filtered[filtered.length - 1].path : null)
                : s.activeTabPath;
            return { tabs: filtered, activeTabPath: newActive };
        }),
    pinTab: (path) =>
        set((s) => ({
            tabs: s.tabs.map((t) => (t.path === path ? { ...t, isPinned: true } : t)),
        })),
    unpinTab: (path) =>
        set((s) => ({
            tabs: s.tabs.map((t) => (t.path === path ? { ...t, isPinned: false } : t)),
        })),
    markDirty: (path, dirty) =>
        set((s) => ({
            tabs: s.tabs.map((t) => (t.path === path ? { ...t, isDirty: dirty } : t)),
        })),
}));
