import { io } from 'socket.io-client';

// The backend runs on a separate port from the Vite dev server, so we connect directly
// (socket.io upgrades to WebSocket after its own handshake — the Vite HTTP proxy isn't involved).
const SOCKET_URL = 'http://localhost:4000';

export function connectSocket(token) {
  return io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
}
