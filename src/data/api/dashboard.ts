import type { FunnelStep, Incident, NpsPoint, Product, SprintMetric } from '../types';
import {
  funnelFixtures,
  incidentFixtures,
  npsFixtures,
  productFixtures,
  sprintFixture,
} from '../fixtures/dashboard';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getProducts(): Promise<Product[]> {
  await delay(200);
  return productFixtures;
}

export async function getFunnelSteps(): Promise<FunnelStep[]> {
  await delay(300);
  return funnelFixtures;
}

export async function getNpsHistory(): Promise<NpsPoint[]> {
  await delay(300);
  return npsFixtures;
}

export async function getSprintMetric(): Promise<SprintMetric> {
  await delay(300);
  return sprintFixture;
}

export async function getIncidents(): Promise<Incident[]> {
  await delay(300);
  return incidentFixtures;
}
