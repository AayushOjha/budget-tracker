import { MiddlewareHandler } from 'hono';
import { verifyToken } from '../lib/token';
import { HonoEnv } from '../types/hono';

const PUBLIC_PATHS = ['/ping', '/api/auth/signup', '/api/auth/login'];

/**
 * Verifies the JWT for every request except public paths, and
 * resolves the authenticated userId into hono context variables.
 */
export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const path = c.req.path;

  const isPublic = PUBLIC_PATHS.includes(path);

  if (!isPublic) {
    const header = c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return c.json({ error: 'Unauthorized: missing bearer token' }, 401);
    }

    const userId = await verifyToken(token, c.env.JWT_SECRET);
    if (!userId) {
      return c.json({ error: 'Unauthorized: invalid or expired token' }, 401);
    }

    c.set('userId', userId);
  }

  await next();
};