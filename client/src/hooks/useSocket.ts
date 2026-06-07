import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, RoomUser } from '../types';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export function useSocket(lock: string, key: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [selfId, setSelfId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    setJoinError(null);
    setUsername('');
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSelfId(socket.id ?? '');
      socket.emit('join', { lock, key });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('join_error', ({ error }: { error: string }) => {
      setJoinError(error);
    });

    socket.on('joined', ({ username: name }: { username: string }) => {
      setUsername(name);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('room_users', (roomUsers: RoomUser[]) => {
      setUsers(roomUsers);
    });

    socket.on('user_joined', ({ username: name }: { username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          username: 'System',
          text: `${name} joined the lock`,
          mediaUrl: null,
          mediaType: null,
          timestamp: Date.now(),
        },
      ]);
    });

    socket.on('user_left', ({ username: name }: { username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          username: 'System',
          text: `${name} left the lock`,
          mediaUrl: null,
          mediaType: null,
          timestamp: Date.now(),
        },
      ]);
    });

    socket.on('typing', ({ username: name, isTyping }: { username: string; isTyping: boolean }) => {
      setTypingUser(isTyping ? name : null);
    });

    return () => {
      socket.disconnect();
    };
  }, [lock, key]);

  const sendMessage = (text: string, mediaUrl?: string | null, mediaType?: 'image' | 'video' | null) => {
    socketRef.current?.emit('chat_message', { text, mediaUrl, mediaType });
  };

  const setTyping = (isTyping: boolean) => {
    socketRef.current?.emit('typing', { isTyping });
  };

  return {
    socket: socketRef,
    selfId,
    username,
    connected,
    joinError,
    messages,
    users,
    typingUser,
    sendMessage,
    setTyping,
  };
}
