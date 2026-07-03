import { create } from 'zustand';
import type { CjmMap } from '../data/types';

interface CjmState {
  generatedMaps: CjmMap[];
  addGeneratedMap: (map: CjmMap) => void;
  updateMap: (id: string, updates: Partial<CjmMap>) => void;
  removeMap: (id: string) => void;
}

export const useCjmStore = create<CjmState>((set) => ({
  generatedMaps: [],
  addGeneratedMap: (map) =>
    set((state) => ({ generatedMaps: [map, ...state.generatedMaps] })),
  updateMap: (id, updates) =>
    set((state) => ({
      generatedMaps: state.generatedMaps.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
  removeMap: (id) =>
    set((state) => ({
      generatedMaps: state.generatedMaps.filter((m) => m.id !== id),
    })),
}));
