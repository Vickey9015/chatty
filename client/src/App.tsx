import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ChatRoom } from './components/ChatRoom';
import './App.css';

function App() {
  const [session, setSession] = useState<{ lock: string; key: string } | null>(null);

  if (!session) {
    return <LoginScreen onJoin={(lock, key) => setSession({ lock, key })} />;
  }

  return (
    <ChatRoom
      lock={session.lock}
      keySecret={session.key}
      onLeave={() => setSession(null)}
    />
  );
}

export default App;
