import type { RoomUser } from '../types';

interface Props {
  users: RoomUser[];
  selfId: string;
  onCall: (userId: string, username: string) => void;
  callActive: boolean;
  connected: boolean;
}

export function CallBar({ users, selfId, onCall, callActive, connected }: Props) {
  const others = users.filter((u) => u.id !== selfId);

  return (
    <div className="call-bar">
      <div className="call-bar-header">
        <span className="call-bar-icon" aria-hidden>
          📹
        </span>
        <span className="call-bar-title">Video call</span>
        <span className="call-bar-count">{others.length} available</span>
      </div>

      {!connected && (
        <p className="call-bar-hint">Connecting… video calls will appear when online.</p>
      )}

      {connected && others.length === 0 && (
        <p className="call-bar-hint">
          Open a <strong>second browser tab</strong> (or ask a friend) with the same room name to
          start a video call.
        </p>
      )}

      {connected && others.length > 0 && (
        <div className="call-bar-actions">
          {others.map((user) => (
            <button
              key={user.id}
              type="button"
              className="btn-video-call"
              onClick={() => onCall(user.id, user.username)}
              disabled={callActive}
            >
              <span className="btn-video-call-icon">📹</span>
              Call {user.username}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
