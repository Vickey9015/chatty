import type { ManagerOptions, SocketOptions } from 'socket.io-client';

/** Polling first on production avoids slow WebSocket retry on Hostinger. */
export function getSocketOptions(): Partial<ManagerOptions & SocketOptions> {
  const production = import.meta.env.PROD;

  return {
    transports: production ? ['polling', 'websocket'] : ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  };
}
