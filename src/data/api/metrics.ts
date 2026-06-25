import type { MetricGroup } from '../types';
import { metricGroupsFixture } from '../fixtures/metrics';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMetricGroups(): Promise<MetricGroup[]> {
  await delay(200);
  return metricGroupsFixture;
}
