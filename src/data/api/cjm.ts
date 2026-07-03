import type { CjmMap } from '../types';
import { cjmFixtures } from '../fixtures/cjm';

export async function getCjmList(): Promise<CjmMap[]> {
  return cjmFixtures;
}

export async function getCjmById(id: string): Promise<CjmMap | undefined> {
  return cjmFixtures.find((m) => m.id === id);
}
