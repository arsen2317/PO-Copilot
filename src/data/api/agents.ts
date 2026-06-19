import type { Agent } from '../types';
import { agentFixtures } from '../fixtures/agents';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getAgents(): Promise<Agent[]> {
  await delay(300);
  return agentFixtures;
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  await delay(300);
  return agentFixtures.find((a) => a.id === id);
}
