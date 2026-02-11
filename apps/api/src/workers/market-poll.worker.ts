import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '../config.js';
import { marketDataService } from '../services/market-data.js';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startMarketPollWorker() {
  const config = getConfig();
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('market-poll', { connection });

  // Add repeatable job
  queue.add('poll', {}, {
    repeat: { every: POLL_INTERVAL_MS },
    jobId: 'market-poll-main',
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  });

  const worker = new Worker(
    'market-poll',
    async (job) => {
      console.log(`[MarketPoll] Fetching market data... (job ${job.id})`);
      try {
        await marketDataService.pollAndStore();
        console.log('[MarketPoll] Market data updated successfully');
      } catch (error) {
        console.error('[MarketPoll] Failed to poll market data:', error);
        throw error;
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    console.error(`[MarketPoll] Job ${job?.id} failed:`, err.message);
  });

  console.log('[MarketPoll] Worker started');
  return { worker, queue };
}
