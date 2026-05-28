import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  currentUser: string;
}

export function MessageList({ messages, currentUser }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg) => {
        const isSystem = msg.username === 'System';
        const isOwn = msg.username === currentUser;

        return (
          <div
            key={msg.id}
            className={`message ${isSystem ? 'system' : ''} ${isOwn ? 'own' : ''}`}
          >
            {!isSystem && (
              <span className="message-author">{isOwn ? 'You' : msg.username}</span>
            )}
            {msg.text && <p className="message-text">{msg.text}</p>}
            {msg.mediaUrl && msg.mediaType === 'image' && (
              <img src={msg.mediaUrl} alt="Shared" className="message-media" loading="lazy" />
            )}
            {msg.mediaUrl && msg.mediaType === 'video' && (
              <video src={msg.mediaUrl} controls className="message-media" />
            )}
            {!isSystem && (
              <time className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
