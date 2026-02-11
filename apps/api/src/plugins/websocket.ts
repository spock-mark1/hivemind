import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { getConfig } from '../config.js';

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export async function registerWebSocket(app: FastifyInstance) {
  const config = getConfig();

  io = new Server(app.server, {
    cors: {
      origin: config.WS_CORS_ORIGIN,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    app.log.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe:agent', (agentId: string) => {
      if (typeof agentId === 'string' && agentId.length > 0 && agentId.length < 100) {
        socket.join(`agent:${agentId}`);
      }
    });

    socket.on('subscribe:token', (token: string) => {
      if (typeof token === 'string' && token.length > 0 && token.length < 20) {
        socket.join(`token:${token}`);
      }
    });

    socket.on('disconnect', () => {
      app.log.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  app.addHook('onClose', async () => {
    io?.close();
  });
}
