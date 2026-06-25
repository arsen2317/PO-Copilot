import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  streaming?: boolean;
}

interface UIState {
  focusedMetricId: string | null;
  setFocusedMetric: (id: string | null) => void;

  chatMessages: ChatMessage[];
  setChatMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  focusedMetricId: null,
  setFocusedMetric: (id) => set({ focusedMetricId: id }),

  chatMessages: [],
  setChatMessages: (msgs) =>
    set((state) => ({
      chatMessages: typeof msgs === 'function' ? msgs(state.chatMessages) : msgs,
    })),
  clearChat: () => set({ chatMessages: [] }),
}));
