import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { CallBar } from './CallBar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { VideoCall } from './VideoCall';

interface Props {
  username: string;
  room: string;
  onLeave: () => void;
}

export function ChatRoom({ username, room, onLeave }: Props) {
  const { socket, selfId, connected, messages, users, typingUser, sendMessage, setTyping } =
    useSocket(username, room);

  const webrtc = useWebRTC(socket);
  const callActive = webrtc.call.status !== 'idle';
  const [showUsers, setShowUsers] = useState(false);

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div>
          <h1>#{room}</h1>
          <span className={`status ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-users-toggle"
            onClick={() => setShowUsers((v) => !v)}
            aria-expanded={showUsers}
          >
            👥 Online ({users.length})
          </button>
          <button type="button" className="btn-leave" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <div className="chat-body">
        <UserList
          users={users}
          selfId={selfId}
          onCall={webrtc.startCall}
          callActive={callActive}
          className={showUsers ? 'open' : ''}
          onClose={() => setShowUsers(false)}
        />
        {showUsers && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close online users"
            onClick={() => setShowUsers(false)}
          />
        )}
        <main className="chat-main">
          <CallBar
            users={users}
            selfId={selfId}
            onCall={webrtc.startCall}
            callActive={callActive}
            connected={connected}
          />
          <MessageList messages={messages} currentUser={username} />
          {typingUser && typingUser !== username && (
            <p className="typing-indicator">{typingUser} is typing…</p>
          )}
          <MessageInput
            onSend={sendMessage}
            onTyping={setTyping}
            disabled={!connected}
          />
        </main>
      </div>

      <VideoCall
        call={webrtc.call}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        muted={webrtc.muted}
        videoOff={webrtc.videoOff}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
        onEnd={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleVideo={webrtc.toggleVideo}
      />
    </div>
  );
}
