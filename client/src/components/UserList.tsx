import type { RoomUser } from '../types';

interface Props {
  users: RoomUser[];
  selfId: string;
  onCall: (userId: string, username: string) => void;
  callActive: boolean;
  className?: string;
  onClose?: () => void;
}

export function UserList({ users, selfId, onCall, callActive, className = '', onClose }: Props) {
  const others = users.filter((u) => u.id !== selfId);

  return (
    <aside className={`user-list ${className}`.trim()}>
      <div className="user-list-top">
        <h3>Online ({users.length})</h3>
        {onClose && (
          <button type="button" className="user-list-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>
      <ul>
        {users.map((user) => (
          <li key={user.id} className={user.id === selfId ? 'self' : ''}>
            <span className="user-dot" />
            <span className="user-name">
              {user.username}
              {user.id === selfId && ' (you)'}
            </span>
            {user.id !== selfId && (
              <button
                type="button"
                className="btn-call-small"
                onClick={() => onCall(user.id, user.username)}
                disabled={callActive}
                title={`Video call ${user.username}`}
              >
                📹 Call
              </button>
            )}
          </li>
        ))}
      </ul>
      {others.length === 0 && users.length <= 1 && (
        <p className="user-hint">Share the room name so others can join and call you.</p>
      )}
    </aside>
  );
}
