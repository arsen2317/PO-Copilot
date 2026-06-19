import { describe, it, expect } from 'vitest';
import { getTasks } from '../data/api/tasks';
import { getNotifications, getUnreadCount } from '../data/api/notifications';
import { getAgents } from '../data/api/agents';

describe('data/api smoke', () => {
  it('getTasks returns array', async () => {
    const tasks = await getTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('getNotifications returns array', async () => {
    const notifications = await getNotifications();
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('getUnreadCount returns number', async () => {
    const count = await getUnreadCount();
    expect(typeof count).toBe('number');
  });

  it('getAgents returns array', async () => {
    const agents = await getAgents();
    expect(agents.length).toBeGreaterThan(0);
  });
});
