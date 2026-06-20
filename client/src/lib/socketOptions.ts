import type { ManagerOptions, SocketOptions } from 'socket.io-client';

/** Hostinger/LiteSpeed often breaks WebSocket upgrade — use polling in production. */
export function getSocketOptions(): Partial<ManagerOptions & SocketOptions> {
  const production = import.meta.env.PROD;

  return {
    transports: production ? ['polling'] : ['polling', 'websocket'],
    upgrade: !production,
    rememberUpgrade: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  };
}
