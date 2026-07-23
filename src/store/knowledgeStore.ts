import { create } from 'zustand';
import type { KnowledgeArtifact } from '../data/types';

// AI-generated / user-saved knowledge artifacts (session-only, overlaid on fixtures).
// Mirrors the generated-maps pattern in cjmStore.
interface KnowledgeState {
  generatedArtifacts: KnowledgeArtifact[];
  addArtifact: (artifact: KnowledgeArtifact) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  generatedArtifacts: [],
  addArtifact: (artifact) =>
    set((state) => ({ generatedArtifacts: [artifact, ...state.generatedArtifacts] })),
}));
