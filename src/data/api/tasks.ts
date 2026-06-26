import type { Task, TaskStatus, Employee } from '../types';
import { taskFixtures } from '../fixtures/tasks';
import { employeeFixtures } from '../fixtures/employees';

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
