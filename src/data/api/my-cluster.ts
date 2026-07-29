import type { MyClusterData } from '../types';
import { myClusterData } from '../fixtures/my-cluster';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMyClusterData(): Promise<MyClusterData> {
  await delay(200);
  return myClusterData;
}
