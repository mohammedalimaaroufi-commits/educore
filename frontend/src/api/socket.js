import { io } from 'socket.io-client';

// In production this points to the same Render service. In local development it
// points to the backend directly. Reconnection matters because Render's free
// instance can sleep and the browser's old socket can become stale.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function connectSocket(token, handlers = {}) {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  if (handlers.onConnect) socket.on('connect', handlers.onConnect);
  if (handlers.onReconnect) socket.io.on('reconnect', handlers.onReconnect);
  if (handlers.onError) socket.on('connect_error', handlers.onError);

  return socket;
}
