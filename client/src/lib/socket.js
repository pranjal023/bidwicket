import { io } from 'socket.io-client';


export const createSocket = () =>
  io(import.meta.env.VITE_SERVER_URL || undefined, { transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 });
