import type { KnowledgeArtifact } from '../types';
import { knowledgeFixtures } from '../fixtures/knowledge';

export async function getArtifacts(): Promise<KnowledgeArtifact[]> {
  return knowledgeFixtures;
}

export async function getArtifactById(id: string): Promise<KnowledgeArtifact | undefined> {
  return knowledgeFixtures.find((a) => a.id === id);
}
