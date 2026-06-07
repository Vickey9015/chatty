import type { CallMode, RoomUser } from '../types';

function VideoCallIcon() {
  return (
    <svg
      className="icon-call"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m17 10 5-3v10l-5-3z" />
    </svg>
  );
}

function AudioCallIcon() {
  return (
    <svg
      className="icon-call"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

interface Props {
  lock: string;
  connected: boolean;
  users: RoomUser[];
  selfId: string;
  onCall: (userId: string, username: string, mode: CallMode) => void;
  callActive: boolean;
  className?: string;
  onClose?: () => void;
}

export function UserList({
  lock,
  connected,
  users,
  selfId,
  onCall,
  callActive,
  className = '',
  onClose,
}: Props) {
  const others = users.filter((u) => u.id !== selfId);

  return (
    <aside className={`user-list ${className}`.trim()}>
      <div className="user-list-top">
        <div className="user-list-lock">
          <span className="user-list-lock-name">🔒 {lock}</span>
          <span className={`status ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
        </div>
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
              <div className="user-call-actions">
                <button
                  type="button"
                  className="btn-call-icon btn-call-audio"
                  onClick={() => onCall(user.id, user.username, 'audio')}
                  disabled={callActive}
                  title={`Audio call ${user.username}`}
                  aria-label={`Audio call ${user.username}`}
                >
                  <AudioCallIcon />
                </button>
                <button
                  type="button"
                  className="btn-call-icon btn-call-video"
                  onClick={() => onCall(user.id, user.username, 'video')}
                  disabled={callActive}
                  title={`Video call ${user.username}`}
                  aria-label={`Video call ${user.username}`}
                >
                  <VideoCallIcon />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {others.length === 0 && users.length <= 1 && (
        <p className="user-hint">Share your lock & key so others can join and call you.</p>
      )}
    </aside>
  );
}
