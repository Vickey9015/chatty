import { useState, type FormEvent } from 'react';

interface Props {
  onJoin: (username: string, room: string) => void;
}

export function LoginScreen({ onJoin }: Props) {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onJoin(username.trim() || 'Guest', room.trim() || 'general');
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="logo">💬</div>
        <h1>ChitChat</h1>
        <p className="subtitle">Real-time chat with photos, videos & video calls</p>
        <form onSubmit={handleSubmit}>
          <label>
            Your name
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              autoFocus
            />
          </label>
          <label>
            Room
            <input
              type="text"
              placeholder="Room name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={32}
            />
          </label>
          <button type="submit" className="btn-primary">
            Join room
          </button>
        </form>
      </div>
    </div>
  );
}
