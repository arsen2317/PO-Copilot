import { create } from 'zustand';
import type { KnowledgeArtifact } from '../data/types';

// Артефакты, созданные ассистентом или сохранённые пользователем (живут только в сессии, поверх фикстур).
// Повторяет схему сгенерированных карт из cjmStore.
interface KnowledgeState {
  generatedArtifacts: KnowledgeArtifact[];
  addArtifact: (artifact: KnowledgeArtifact) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  generatedArtifacts: [],
  addArtifact: (artifact) =>
    set((state) => ({ generatedArtifacts: [artifact, ...state.generatedArtifacts] })),
}));
