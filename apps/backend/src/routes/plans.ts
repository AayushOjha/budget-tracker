import { Hono } from 'hono';
import { LockedPeriodError, assertNotLocked } from '../lib/lock';
import { getLockedMonths } from '../lib/months';
import { getPrisma } from '../lib/prisma';
import { HonoEnv } from '../types/hono';
import { planDeleteSchema, planUpsertSchema } from '@tracker/utils';

export const planRouter = new Hono<HonoEnv>();

const listPlans = (prisma: ReturnType<typeof getPrisma>, userId: string, where: Record<string, unknown>) =>
  prisma.plan.findMany({
    where: { userId, ...where },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ month: 'asc' }, { category: { name: 'asc' } }],
  });

planRouter.get('/', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const filters: Record<string, unknown> = {};
  const month = c.req.query('month');
  const categoryId = c.req.query('categoryId');
  if (month) filters.month = month;
  if (categoryId) filters.categoryId = categoryId;

  const plans = await listPlans(prisma, c.get('userId'), filters);
  return c.json({
    plans: plans.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      month: p.month,
      amount: p.amount,
    })),
  });
});

// Upsert a monthly target for a category. Rejected server-side if the month is locked.
planRouter.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = planUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
  });
  if (!category) return c.json({ error: 'Category not found' }, 404);

  try {
    assertNotLocked(await getLockedMonths(prisma, userId), [parsed.data.month]);
  } catch (error) {
    if (error instanceof LockedPeriodError) return c.json({ error: error.message }, 423);
    throw error;
  }

  const plan = await prisma.plan.upsert({
    where: {
      userId_categoryId_month: {
        userId,
        categoryId: parsed.data.categoryId,
        month: parsed.data.month,
      },
    },
    create: {
      userId,
      categoryId: parsed.data.categoryId,
      month: parsed.data.month,
      amount: parsed.data.amount,
    },
    update: { amount: parsed.data.amount },
    include: { category: true },
  });

  return c.json({ plan });
});

planRouter.delete('/:id', async (c) => {
  const parsed = planDeleteSchema.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid plan id' }, 400);

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const plan = await prisma.plan.findFirst({ where: { id: parsed.data.id, userId } });
  if (!plan) return c.json({ error: 'Plan not found' }, 404);

  try {
    assertNotLocked(await getLockedMonths(prisma, userId), [plan.month]);
  } catch (error) {
    if (error instanceof LockedPeriodError) return c.json({ error: error.message }, 423);
    throw error;
  }

  await prisma.plan.delete({ where: { id: plan.id } });
  return c.json({ ok: true });
});