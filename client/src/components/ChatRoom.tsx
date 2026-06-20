import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { VideoCall } from './VideoCall';

interface Props {
  lock: string;
  keySecret: string;
  onLeave: () => void;
}

export function ChatRoom({ lock, keySecret, onLeave }: Props) {
  const {
    socket,
    selfId,
    username,
    connected,
    joinError,
    messages,
    users,
    typingUser,
    sendMessage,
    setTyping,
  } = useSocket(lock, keySecret);

  const webrtc = useWebRTC(socket, connected);
  const callActive = webrtc.call.status !== 'idle';
  const [showUsers, setShowUsers] = useState(false);

  if (joinError) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="form-error">{joinError}</p>
          <button type="button" className="btn-primary" onClick={onLeave}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="header-logo">
          <div className="logo-bg">
            <img src="/lockychat-logo.png" alt="LockyChat" className="header-logo-img" />
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-users-toggle"
            onClick={() => setShowUsers((v) => !v)}
            aria-expanded={showUsers}
          >
            👥 <span className="users-label-long">Online </span>({users.length})
          </button>
          <button type="button" className="btn-leave" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <div className="mobile-lock-bar" aria-label="Current lock">
        <span className="mobile-lock-name">🔒 {lock}</span>
        <span className={`status ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      <div className="chat-body">
        <UserList
          lock={lock}
          connected={connected}
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
        facingMode={webrtc.facingMode}
        connectionState={webrtc.connectionState}
        onAccept={webrtc.acceptCall}
        onReject={webrtc.rejectCall}
        onEnd={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleVideo={webrtc.toggleVideo}
        onSwitchCamera={webrtc.switchCamera}
      />
    </div>
  );
}
