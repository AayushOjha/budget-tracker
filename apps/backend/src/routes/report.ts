import { Hono } from 'hono';
import { compareMonths, reportQuerySchema } from '@tracker/utils';
import { buildReport } from '@tracker/utils';
import { getPrisma } from '../lib/prisma';
import { HonoEnv } from '../types/hono';

export const reportRouter = new Hono<HonoEnv>();

reportRouter.get('/', async (c) => {
  const parsed = reportQuerySchema.safeParse({
    start: c.req.query('start'),
    end: c.req.query('end'),
  });
  if (!parsed.success) {
    return c.json({ error: 'start and end are required (YYYY-MM)', details: parsed.error.flatten().fieldErrors }, 400);
  }
  const { start, end } = parsed.data;
  if (compareMonths(start, end) > 0) {
    return c.json({ error: 'start month must be before or equal to end month' }, 400);
  }

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const [categories, plans, actuals] = await Promise.all([
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.plan.findMany({
      where: { userId, month: { gte: start, lte: end } },
      select: { categoryId: true, month: true, amount: true },
    }),
    prisma.actual.findMany({
      where: { userId, month: { gte: start, lte: end } },
      select: { categoryId: true, month: true, amount: true },
    }),
  ]);

  const report = buildReport({
    start,
    end,
    categories: categories.map((ct) => ({ id: ct.id, name: ct.name })),
    plans,
    actuals,
  });

  return c.json(report);
});