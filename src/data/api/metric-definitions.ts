import type { MetricDefinition, MetricGroupDef } from '../types';
import { metricDefinitions, metricGroupDefs } from '../fixtures/metric-definitions';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMetricDefinitions(): Promise<MetricDefinition[]> {
  await delay(200);
  return metricDefinitions;
}

export async function getMetricGroupDefs(): Promise<MetricGroupDef[]> {
  await delay(100);
  return metricGroupDefs;
}
