import { io } from 'socket.io-client';
import { SERVER_URL } from './api';

export const createSocket = () =>
  io(SERVER_URL || undefined, { transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 });
