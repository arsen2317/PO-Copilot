import type { Task, TaskStatus, Employee, Epic, Team } from '../types';
import { taskFixtures } from '../fixtures/tasks';
import { employeeFixtures } from '../fixtures/employees';
import { epicFixtures, teamFixtures } from '../fixtures/epics';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getTasks(): Promise<Task[]> {
  await delay(300);
  return taskFixtures;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  await delay(300);
  return taskFixtures.find((t) => t.id === id);
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  await delay(200);
  return taskFixtures.filter((t) => t.status === status);
}

export async function getEmployees(): Promise<Employee[]> {
  await delay(200);
  return employeeFixtures;
}

export async function getEpics(): Promise<Epic[]> {
  await delay(150);
  return epicFixtures;
}

export async function getTeams(): Promise<Team[]> {
  await delay(150);
  return teamFixtures;
}
