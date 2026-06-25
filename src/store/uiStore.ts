import { create } from 'zustand';

interface UIState {
  focusedMetricId: string | null;
  setFocusedMetric: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  focusedMetricId: null,
  setFocusedMetric: (id) => set({ focusedMetricId: id }),
}));
