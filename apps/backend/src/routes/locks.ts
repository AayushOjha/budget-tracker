import { Hono } from 'hono';
import { getPrisma } from '../lib/prisma';
import { HonoEnv } from '../types/hono';
import { lockMonthSchema } from '@tracker/utils';

/**
 * Locking granularity: MONTH. Locking "2026-01" makes all plans and actuals
 * for that month read-only. A quarter is locked by locking its 3 months.
 */
export const lockRouter = new Hono<HonoEnv>();

lockRouter.get('/', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const locks = await prisma.lock.findMany({
    where: { userId: c.get('userId') },
    orderBy: { month: 'asc' },
  });
  return c.json({ locks });
});

lockRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = lockMonthSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  const lock = await prisma.lock.upsert({
    where: { userId_month: { userId: c.get('userId'), month: parsed.data.month } },
    create: { userId: c.get('userId'), month: parsed.data.month },
    update: {},
  });
  return c.json({ lock }, 201);
});

lockRouter.delete('/:month', async (c) => {
  const parsed = lockMonthSchema.safeParse({ month: c.req.param('month') });
  if (!parsed.success) return c.json({ error: 'Invalid month, expected YYYY-MM' }, 400);

  const prisma = getPrisma(c.env.DATABASE_URL);
  await prisma.lock.deleteMany({
    where: { userId: c.get('userId'), month: parsed.data.month },
  });
  return c.json({ ok: true });
});