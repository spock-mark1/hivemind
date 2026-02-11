import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@selanet/db';
import { TRACKED_TOKENS } from '@selanet/shared';

export const marketRoutes: FastifyPluginAsync = async (app) => {
  // Get latest prices for all tracked tokens
  app.get('/prices', async () => {
    const prices = await Promise.all(
      TRACKED_TOKENS.map(async (token) => {
        const snapshot = await prisma.marketSnapshot.findFirst({
          where: { token },
          orderBy: { timestamp: 'desc' },
        });
        return snapshot || { token, price: 0, priceChange24h: 0, volume24h: 0, tvl: null, timestamp: new Date() };
      })
    );
    return prices;
  });

  // Get price history for a token
  app.get<{ Params: { token: string }; Querystring: { hours?: string } }>(
    '/history/:token',
    async (request) => {
      const token = request.params.token.toUpperCase();
      const hours = Math.min(Math.max(parseInt(request.query.hours || '24', 10) || 24, 1), 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return prisma.marketSnapshot.findMany({
        where: { token, timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      });
    }
  );
};
