import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Creates a PrismaClient bound to a PostgreSQL connection pool.
 * Used on Cloudflare Workers via the pg driver adapter (nodejs_compat).
 */
export function getPrisma(databaseUrl: string): PrismaClient {
  if (!databaseUrl) {
    console.error('[Prisma] DATABASE_URL is undefined or empty.');
    throw new Error('Database connection URL is missing');
  }

  try {
    const pool = new Pool({ connectionString: databaseUrl, max: 1, idleTimeoutMillis: 0 });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error('[Prisma] Failed to initialize database client:', error);
    throw error;
  }
}