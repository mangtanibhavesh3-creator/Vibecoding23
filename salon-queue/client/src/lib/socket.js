import { io } from 'socket.io-client';

const RAW_SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/$/, '');

class SocketService {
  constructor() {
    this.socket = null;
  }

  getSocket() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log(`[Socket.IO Client] Connected to gateway: ${this.socket.id}`);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn(`[Socket.IO Client] Disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        console.warn(`[Socket.IO Client] Connection error: ${error.message}`);
      });

      this.socket.on('socket:handshake', (data) => {
        console.log('[Socket.IO Client] Handshake confirmed with server:', data);
      });
    }

    return this.socket;
  }
}

const socketServiceSingleton = new SocketService();
export const socket = socketServiceSingleton.getSocket();
export default socket;
