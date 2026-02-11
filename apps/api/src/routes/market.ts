import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
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
      const hours = parseInt(request.query.hours || '24', 10);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return prisma.marketSnapshot.findMany({
        where: { token, timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      });
    }
  );
};
