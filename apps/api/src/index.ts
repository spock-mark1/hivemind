import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { getConfig } from './config.js';
import { registerWebSocket } from './plugins/websocket.js';
import { registerAuth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { agentRoutes } from './routes/agents.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { marketRoutes } from './routes/market.js';
import { registryRoutes } from './routes/registry.js';
import { startMarketPollWorker } from './workers/market-poll.worker.js';
import { startConsensusWorker } from './workers/consensus.worker.js';

async function main() {
  const config = getConfig();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.WS_CORS_ORIGIN,
    credentials: true,
  });

  // Auth decorator
  await registerAuth(app);

  // WebSocket / Socket.IO
  await registerWebSocket(app);

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(agentRoutes, { prefix: '/api/agents' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(marketRoutes, { prefix: '/api/market' });
  await app.register(registryRoutes);

  // Consistent error handler for Zod validation errors
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }
    reply.status(error.statusCode ?? 500).send({
      error: error.message || 'Internal server error',
    });
  });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Start server
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  app.log.info(`SelaNet Hive API running on port ${config.API_PORT}`);

  // Start background workers
  const workers = [
    startMarketPollWorker(),    // Hub collects market data
    startConsensusWorker(),     // Hub calculates consensus
  ];
  app.log.info('Hub background workers started (market-poll, consensus)');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    for (const w of workers) {
      try {
        const handle = w as { worker?: { close(): Promise<void> }; queue?: { close(): Promise<void> }; connection?: { quit(): Promise<string> } };
        if (handle.worker) await handle.worker.close();
        if (handle.queue) await handle.queue.close();
        if (handle.connection) await handle.connection.quit();
      } catch (err) {
        console.error('Error closing worker:', err);
      }
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
