import type { Task } from '../types';
import { taskFixtures } from '../fixtures/tasks';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getTasks(): Promise<Task[]> {
  await delay(300);
  return taskFixtures;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  await delay(300);
  return taskFixtures.find((t) => t.id === id);
}
