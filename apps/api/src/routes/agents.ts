import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@selanet/db';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/agents
   * List all agents (public, for dashboard)
   *
   * NOTE: In distributed architecture, agents are managed by Agent Nodes.
   * This endpoint is read-only for dashboard visualization.
   */
  app.get('/', async () => {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        persona: true,
        twitterHandle: true,
        status: true,
        lastHeartbeat: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { tweets: true, opinions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return agents;
  });

  /**
   * GET /api/agents/:id
   * Get agent details by ID (public)
   */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const agent = await prisma.agent.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        name: true,
        persona: true,
        strategy: true,
        twitterHandle: true,
        status: true,
        lastHeartbeat: true,
        updatedAt: true,
        createdAt: true,
        tweets: {
          orderBy: { postedAt: 'desc' },
          take: 50,
        },
        opinions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return agent;
  });
};
