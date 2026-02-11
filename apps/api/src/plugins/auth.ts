import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config.js';

interface JwtPayload {
  userId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * Fastify preHandler that verifies the JWT Bearer token.
 * Attaches `request.userId` on success.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getConfig().JWT_SECRET) as JwtPayload;
    request.userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

/**
 * Register the auth decorator so routes can use `{ preHandler: [authenticate] }`
 */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorateRequest('userId', undefined);
}
