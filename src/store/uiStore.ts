import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  streaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

function newSession(): ChatSession {
  return { id: `s-${Date.now()}-${Math.random()}`, title: 'Новый чат', createdAt: Date.now(), messages: [] };
}

const initial = newSession();

interface UIState {
  focusedMetricId: string | null;
  setFocusedMetric: (id: string | null) => void;

  sessions: ChatSession[];
  activeSessionId: string;
  createSession: () => void;
  switchSession: (id: string) => void;
  setChatMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setSessionTitle: (sessionId: string, title: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  focusedMetricId: null,
  setFocusedMetric: (id) => set({ focusedMetricId: id }),

  sessions: [initial],
  activeSessionId: initial.id,

  createSession: () => {
    const s = newSession();
    set((state) => ({ sessions: [s, ...state.sessions], activeSessionId: s.id }));
  },

  switchSession: (id) => set({ activeSessionId: id }),

  setChatMessages: (msgs) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id !== state.activeSessionId
          ? s
          : { ...s, messages: typeof msgs === 'function' ? msgs(s.messages) : msgs },
      ),
    })),

  setSessionTitle: (sessionId, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, title } : s)),
    })),
}));
