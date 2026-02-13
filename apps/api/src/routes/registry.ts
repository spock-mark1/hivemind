import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@selanet/db';
import { realtime } from '../services/realtime.js';
import type { TweetData } from '@selanet/shared';

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  persona: z.enum(['BULL', 'BEAR', 'DEGEN', 'MACRO']),
  strategy: z.string().min(1).max(500),
  twitterHandle: z.string().min(1).max(50),
});

const heartbeatSchema = z.object({
  agentId: z.string().uuid(),
  status: z.enum(['RUNNING', 'IDLE', 'ERROR']),
});

const tweetSchema = z.object({
  agentId: z.string().uuid(),
  tweet: z.object({
    content: z.string().min(1).max(280),
    type: z.enum(['ORIGINAL', 'REPLY', 'QUOTE']),
    tweetId: z.string().optional(),
    replyToTweetId: z.string().optional(),
    sentiment: z.number().min(-1).max(1).optional(),
    tokens: z.array(z.string()),
    postedAt: z.coerce.date(),
  }),
});

const opinionSchema = z.object({
  agentId: z.string().uuid(),
  opinion: z.object({
    token: z.string().min(1).max(20),
    stance: z.number().min(-1).max(1),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().min(1).max(1000),
  }),
});

export async function registryRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/registry/register
   * Register a new agent node
   */
  fastify.post('/api/registry/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        userId: 'system', // No user auth for agent nodes
        name: body.name,
        persona: body.persona,
        strategy: body.strategy,
        twitterHandle: body.twitterHandle,
        status: 'IDLE',
      },
    });

    console.log(`[Registry] Agent registered: ${agent.id} (${agent.name})`);

    return reply.code(201).send({
      agentId: agent.id,
      success: true,
    });
  });

  /**
   * POST /api/registry/heartbeat
   * Update agent status (heartbeat)
   */
  fastify.post('/api/registry/heartbeat', async (request, reply) => {
    const body = heartbeatSchema.parse(request.body);

    // Update agent status and last heartbeat
    await prisma.agent.update({
      where: { id: body.agentId },
      data: {
        status: body.status,
        updatedAt: new Date(),
      },
    });

    // console.log(`[Registry] Heartbeat from agent: ${body.agentId} (${body.status})`);

    return reply.send({ success: true });
  });

  /**
   * POST /api/registry/tweet
   * Receive tweet data from agent node
   */
  fastify.post('/api/registry/tweet', async (request, reply) => {
    const body = tweetSchema.parse(request.body);

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: body.agentId },
      select: { id: true, name: true, twitterHandle: true },
    });

    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }

    // Save tweet to database
    const tweet = await prisma.tweet.create({
      data: {
        agentId: body.agentId,
        tweetId: body.tweet.tweetId,
        content: body.tweet.content,
        type: body.tweet.type,
        replyToTweetId: body.tweet.replyToTweetId,
        sentiment: body.tweet.sentiment,
        tokens: body.tweet.tokens,
        postedAt: body.tweet.postedAt,
      },
    });

    console.log(`[Registry] Tweet received from ${agent.name}: "${body.tweet.content.slice(0, 50)}..."`);

    // Broadcast to WebSocket
    const tweetData: TweetData = {
      id: tweet.id,
      tweetId: tweet.tweetId ?? undefined,
      authorHandle: agent.twitterHandle,
      content: tweet.content,
      type: tweet.type,
      replyToTweetId: tweet.replyToTweetId ?? undefined,
      sentiment: tweet.sentiment ?? undefined,
      tokens: tweet.tokens,
      postedAt: tweet.postedAt,
      reactions: 0,
    };

    if (tweet.type === 'REPLY') {
      realtime.emitReply(tweetData);
    } else {
      realtime.emitTweet(tweetData);
    }

    return reply.send({ success: true, tweetId: tweet.id });
  });

  /**
   * POST /api/registry/opinion
   * Receive opinion data from agent node
   */
  fastify.post('/api/registry/opinion', async (request, reply) => {
    const body = opinionSchema.parse(request.body);

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { id: body.agentId },
      select: { id: true, name: true },
    });

    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }

    // Save opinion to database
    const opinion = await prisma.opinion.create({
      data: {
        agentId: body.agentId,
        token: body.opinion.token,
        stance: body.opinion.stance,
        confidence: body.opinion.confidence,
        reasoning: body.opinion.reasoning,
      },
    });

    console.log(`[Registry] Opinion received from ${agent.name}: ${body.opinion.token} (stance: ${body.opinion.stance.toFixed(2)})`);

    // Broadcast to WebSocket
    realtime.emitOpinion({
      id: opinion.id,
      agentId: opinion.agentId,
      token: opinion.token,
      stance: opinion.stance,
      confidence: opinion.confidence,
      reasoning: opinion.reasoning,
      createdAt: opinion.createdAt,
    });

    return reply.send({ success: true, opinionId: opinion.id });
  });

  /**
   * GET /api/registry/agents
   * Get all registered agents
   */
  fastify.get('/api/registry/agents', async (request, reply) => {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        persona: true,
        strategy: true,
        twitterHandle: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tweets: true,
            opinions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(agents);
  });
}
