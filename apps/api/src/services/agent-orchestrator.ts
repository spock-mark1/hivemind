import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@selanet/db';
import type { AgentStatus } from '@selanet/shared';
import { AGENT_RATE_LIMITS, randomInt } from '@selanet/shared';
import { getConfig } from '../config.js';

let connection: IORedis | null = null;
let agentQueue: Queue | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(getConfig().REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

function getQueue(): Queue {
  if (!agentQueue) {
    agentQueue = new Queue('agent-loop', { connection: getConnection() });
  }
  return agentQueue;
}

export const agentOrchestrator = {
  /**
   * Start an agent's decision loop
   */
  async startAgent(agentId: string): Promise<void> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // Update status
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'RUNNING' },
    });

    // Add repeatable job with random interval
    const intervalMs = randomInt(
      AGENT_RATE_LIMITS.MIN_INTERVAL_MS,
      AGENT_RATE_LIMITS.MAX_INTERVAL_MS
    );

    await getQueue().add(
      `agent-${agentId}`,
      { agentId },
      {
        repeat: { every: intervalMs },
        jobId: `agent-loop-${agentId}`,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      }
    );
  },

  /**
   * Stop an agent's decision loop
   */
  async stopAgent(agentId: string): Promise<void> {
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'IDLE' },
    });

    // Remove repeatable job
    const queue = getQueue();
    const repeatableJobs = await queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === `agent-loop-${agentId}`);
    if (job) {
      await queue.removeRepeatableByKey(job.key);
    }
  },

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string): Promise<void> {
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'PAUSED' },
    });
  },

  /**
   * Get the current status of all agents
   */
  async getStatus(): Promise<{ id: string; name: string; status: AgentStatus }[]> {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, status: true },
    });
    return agents;
  },

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    await agentQueue?.close();
    connection?.disconnect();
  },
};
