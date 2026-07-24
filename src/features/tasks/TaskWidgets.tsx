import { Tooltip } from 'antd';
import type { TaskPriority } from '../../data/types';
import { AVATAR_COLORS, BAR_HEIGHTS, PRIORITY_COLOR, PRIORITY_LABEL, PRIORITY_LEVEL } from './taskConstants';

// Shared task UI widgets (avatar, priority indicator).

export function UserAvatar({ user, size = 22 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Tooltip title={user.name}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[user.id] ?? '#1668dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
      }
    </Tooltip>
  );
}

export function PriorityChevrons({ priority }: { priority: TaskPriority }) {
  const level = PRIORITY_LEVEL[priority];
  const color = PRIORITY_COLOR[priority];
  return (
    <Tooltip title={PRIORITY_LABEL[priority]}>
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 10, flexShrink: 0 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            style={{
              width: 3, height: h, borderRadius: 1,
              background: i < level ? color : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </span>
    </Tooltip>
  );
}
