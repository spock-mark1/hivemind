import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getConfig } from './config.js';
import { registerWebSocket } from './plugins/websocket.js';
import { registerAuth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { agentRoutes } from './routes/agents.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { marketRoutes } from './routes/market.js';
import { startMarketPollWorker } from './workers/market-poll.worker.js';
import { startAgentLoopWorker } from './workers/agent-loop.worker.js';
import { startTweetScanWorker } from './workers/tweet-scan.worker.js';
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

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Start server
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  app.log.info(`SelaNet Hive API running on port ${config.API_PORT}`);

  // Start background workers
  startMarketPollWorker();
  startAgentLoopWorker();
  startTweetScanWorker();
  startConsensusWorker();
  app.log.info('All background workers started');
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
