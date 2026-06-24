import type { Dialog } from '../types';
import { dialogFixtures } from '../fixtures/assistant';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getDialogs(): Promise<Dialog[]> {
  await delay(300);
  return dialogFixtures;
}

export async function getDialogById(id: string): Promise<Dialog | undefined> {
  await delay(250);
  return dialogFixtures.find((d) => d.id === id);
}
