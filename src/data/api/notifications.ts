import type { Notification } from '../types';
import { notificationFixtures } from '../fixtures/notifications';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getNotifications(): Promise<Notification[]> {
  await delay(300);
  return notificationFixtures;
}

export async function getUnreadCount(): Promise<number> {
  await delay(200);
  return notificationFixtures.filter((n) => !n.isRead).length;
}
