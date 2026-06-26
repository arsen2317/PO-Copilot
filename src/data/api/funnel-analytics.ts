import type { FunnelAnalyticsStep } from '../types';
import { funnelAnalyticsFixture } from '../fixtures/funnel-analytics';

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function getFunnelAnalytics(): Promise<FunnelAnalyticsStep[]> {
  await delay(300);
  return funnelAnalyticsFixture;
}
