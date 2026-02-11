import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@selanet/db';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // Overview stats
  app.get('/stats', async () => {
    const [agentCount, tweetCount, consensusEvents] = await Promise.all([
      prisma.agent.count(),
      prisma.tweet.count(),
      prisma.consensusEvent.count(),
    ]);
    const activeAgents = await prisma.agent.count({ where: { status: 'RUNNING' } });
    return { agentCount, activeAgents, tweetCount, consensusEvents };
  });

  // Recent tweets across all agents
  app.get('/feed', async (request) => {
    const { limit = '30' } = request.query as Record<string, string>;
    return prisma.tweet.findMany({
      take: parseInt(limit, 10),
      orderBy: { postedAt: 'desc' },
      include: { agent: { select: { id: true, name: true, persona: true, twitterHandle: true } } },
    });
  });

  // Agent interactions — resolved edges with source/target agentIds
  app.get('/interactions', async () => {
    // Get all reply/quote tweets
    const replyTweets = await prisma.tweet.findMany({
      where: {
        type: { in: ['REPLY', 'QUOTE'] },
        replyToTweetId: { not: null },
      },
      select: {
        agentId: true,
        replyToTweetId: true,
        type: true,
        sentiment: true,
        postedAt: true,
      },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });

    // Collect all referenced tweetIds to look up their authors
    const replyToIds = replyTweets
      .map((t) => t.replyToTweetId)
      .filter((id): id is string => id !== null);

    // Find which agent authored each original tweet
    const originalTweets = await prisma.tweet.findMany({
      where: {
        OR: [
          { tweetId: { in: replyToIds } },
          { id: { in: replyToIds } },
        ],
      },
      select: {
        id: true,
        tweetId: true,
        agentId: true,
      },
    });

    // Build lookup: tweetId/id -> agentId
    const tweetToAgent = new Map<string, string>();
    for (const t of originalTweets) {
      if (t.tweetId) tweetToAgent.set(t.tweetId, t.agentId);
      tweetToAgent.set(t.id, t.agentId);
    }

    // Build resolved edges
    const edges = replyTweets
      .map((t) => {
        const targetAgentId = t.replyToTweetId
          ? tweetToAgent.get(t.replyToTweetId)
          : undefined;
        if (!targetAgentId || targetAgentId === t.agentId) return null;
        return {
          sourceAgentId: t.agentId,
          targetAgentId,
          type: t.type,
          sentiment: t.sentiment,
          postedAt: t.postedAt,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return edges;
  });

  // Consensus events
  app.get('/consensus', async () => {
    return prisma.consensusEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  });

  // Token sentiments (aggregated opinions)
  app.get('/sentiments', async () => {
    const recentOpinions = await prisma.opinion.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
      include: { agent: { select: { id: true, name: true } } },
    });

    // Group by token
    const byToken: Record<string, { stances: number[]; agents: string[] }> = {};
    for (const op of recentOpinions) {
      if (!byToken[op.token]) byToken[op.token] = { stances: [], agents: [] };
      byToken[op.token].stances.push(op.stance);
      byToken[op.token].agents.push(op.agent.name);
    }

    return Object.entries(byToken).map(([token, data]) => ({
      token,
      avgSentiment: data.stances.reduce((a, b) => a + b, 0) / data.stances.length,
      participantCount: data.agents.length,
      agents: [...new Set(data.agents)],
    }));
  });

  // Sentiment history for a specific token (time series of opinion averages)
  app.get<{ Params: { token: string }; Querystring: { hours?: string } }>(
    '/sentiment-history/:token',
    async (request) => {
      const token = request.params.token.toUpperCase();
      const hours = parseInt((request.query as any).hours || '24', 10);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const opinions = await prisma.opinion.findMany({
        where: { token, createdAt: { gte: since } },
        select: { stance: true, confidence: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Bucket into hourly averages
      const buckets = new Map<string, { stances: number[]; timestamp: Date }>();
      for (const op of opinions) {
        const hour = new Date(op.createdAt);
        hour.setMinutes(0, 0, 0);
        const key = hour.toISOString();
        if (!buckets.has(key)) {
          buckets.set(key, { stances: [], timestamp: hour });
        }
        buckets.get(key)!.stances.push(op.stance);
      }

      return Array.from(buckets.values()).map((b) => ({
        timestamp: b.timestamp,
        avgSentiment: b.stances.reduce((a, c) => a + c, 0) / b.stances.length,
        count: b.stances.length,
      }));
    }
  );
};
