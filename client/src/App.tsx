import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ChatRoom } from './components/ChatRoom';
import './App.css';

function App() {
  const [session, setSession] = useState<{ username: string; room: string } | null>(null);

  if (!session) {
    return <LoginScreen onJoin={(username, room) => setSession({ username, room })} />;
  }

  return (
    <ChatRoom
      username={session.username}
      room={session.room}
      onLeave={() => setSession(null)}
    />
  );
}

export default App;
