import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@selanet/db';
import { authenticate } from '../plugins/auth.js';

const createAgentSchema = z.object({
  name: z.string().min(1),
  persona: z.string().min(1),
  strategy: z.string().min(1).max(5000),
  twitterHandle: z.string().min(1).max(50),
});

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // All agent routes require authentication
  app.addHook('preHandler', authenticate);

  // List current user's agents
  app.get('/', async (request) => {
    return prisma.agent.findMany({
      where: { userId: request.userId },
      include: { _count: { select: { tweets: true, opinions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  // List all agents (public, for dashboard/network graph)
  app.get('/all', async () => {
    return prisma.agent.findMany({
      include: { _count: { select: { tweets: true, opinions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Get agent by ID (own agent: full detail; other agent: public detail)
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const agent = await prisma.agent.findUnique({
      where: { id: request.params.id },
      include: {
        tweets: { orderBy: { postedAt: 'desc' }, take: 50 },
        opinions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    // Strip sessionData for non-owners
    if (agent.userId !== request.userId) {
      return { ...agent, sessionData: undefined };
    }
    return agent;
  });

  // Create agent (scoped to authenticated user)
  app.post('/', async (request) => {
    const body = createAgentSchema.parse(request.body);
    return prisma.agent.create({
      data: {
        ...body,
        userId: request.userId!,
      },
    });
  });

  // Upload Twitter session data
  app.put<{ Params: { id: string } }>('/:id/session', async (request, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: request.params.id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    if (agent.userId !== request.userId) {
      return reply.status(403).send({ error: 'Not your agent' });
    }

    const { sessionData } = z.object({
      sessionData: z.string().min(1),
    }).parse(request.body);

    // sessionData is a JSON string of Playwright storageState
    const buffer = Buffer.from(sessionData, 'utf-8');
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: { sessionData: buffer },
    });

    return { success: true, hasSession: true };
  });

  // Delete Twitter session data
  app.delete<{ Params: { id: string } }>('/:id/session', async (request, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: request.params.id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    if (agent.userId !== request.userId) {
      return reply.status(403).send({ error: 'Not your agent' });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { sessionData: null },
    });

    return { success: true, hasSession: false };
  });

  // Update agent status (owner only)
  app.patch<{ Params: { id: string } }>('/:id/status', async (request, reply) => {
    const { status } = z.object({ status: z.enum(['IDLE', 'RUNNING', 'PAUSED']) }).parse(request.body);
    const agent = await prisma.agent.findUnique({ where: { id: request.params.id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    if (agent.userId !== request.userId) {
      return reply.status(403).send({ error: 'Not your agent' });
    }
    return prisma.agent.update({ where: { id: request.params.id }, data: { status } });
  });

  // Delete agent (owner only, cascade)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: request.params.id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    if (agent.userId !== request.userId) {
      return reply.status(403).send({ error: 'Not your agent' });
    }
    await prisma.tweet.deleteMany({ where: { agentId: agent.id } });
    await prisma.opinion.deleteMany({ where: { agentId: agent.id } });
    await prisma.agent.delete({ where: { id: agent.id } });
    return { success: true };
  });
};
