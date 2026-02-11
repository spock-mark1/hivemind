import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '../config.js';
import { consensusEngine } from '../services/consensus-engine.js';

const CONSENSUS_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function startConsensusWorker() {
  const config = getConfig();
  const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('consensus', { connection });

  // Add repeatable job
  queue.add('analyze', {}, {
    repeat: { every: CONSENSUS_INTERVAL_MS },
    jobId: 'consensus-main',
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  });

  const worker = new Worker(
    'consensus',
    async (job) => {
      console.log(`[Consensus] Running consensus analysis... (job ${job.id})`);
      try {
        const events = await consensusEngine.analyze();
        console.log(`[Consensus] Detected ${events.length} consensus events`);
      } catch (error) {
        console.error('[Consensus] Failed to analyze:', error);
        throw error;
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Consensus] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Consensus] Worker started');
  return { worker, queue };
}
