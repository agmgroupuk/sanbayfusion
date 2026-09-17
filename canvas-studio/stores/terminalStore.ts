import { create } from 'zustand';

// ── Types ──

export interface TerminalSession {
    id: string;
    name: string;
    createdAt: number;
}

interface TerminalStore {
    sessions: TerminalSession[];
    activeSessionId: string | null;
    outputs: Record<string, string[]>;

    createSession: () => void;
    closeSession: (id: string) => void;
    setActiveSession: (id: string) => void;
    addOutput: (sessionId: string, line: string) => void;
    clearOutput: (sessionId: string) => void;
}

let sessionCounter = 0;

export const useTerminalStore = create<TerminalStore>((set) => ({
    sessions: [],
    activeSessionId: null,
    outputs: {},

    createSession: () => {
        sessionCounter++;
        const id = `term-${sessionCounter}-${Date.now()}`;
        const session: TerminalSession = {
            id,
            name: `Terminal ${sessionCounter}`,
            createdAt: Date.now(),
        };
        set((s) => ({
            sessions: [...s.sessions, session],
            activeSessionId: id,
            outputs: { ...s.outputs, [id]: [] },
        }));
    },

    closeSession: (id) =>
        set((s) => {
            const filtered = s.sessions.filter((sess) => sess.id !== id);
            const newOutputs = { ...s.outputs };
            delete newOutputs[id];
            const newActive =
                s.activeSessionId === id
                    ? filtered.length > 0
                        ? filtered[filtered.length - 1].id
                        : null
                    : s.activeSessionId;
            return { sessions: filtered, activeSessionId: newActive, outputs: newOutputs };
        }),

    setActiveSession: (id) => set({ activeSessionId: id }),

    addOutput: (sessionId, line) =>
        set((s) => ({
            outputs: {
                ...s.outputs,
                [sessionId]: [...(s.outputs[sessionId] || []), line],
            },
        })),

    clearOutput: (sessionId) =>
        set((s) => ({
            outputs: { ...s.outputs, [sessionId]: [] },
        })),
}));
