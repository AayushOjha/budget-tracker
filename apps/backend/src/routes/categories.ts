import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../lib/prisma';
import { HonoEnv } from '../types/hono';
import { categorySchema } from '@tracker/utils';

export const categoryRouter = new Hono<HonoEnv>();

categoryRouter.get('/', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const categories = await prisma.category.findMany({
    where: { userId: c.get('userId') },
    orderBy: { name: 'asc' },
  });
  return c.json({ categories });
});

categoryRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  try {
    const category = await prisma.category.create({
      data: { userId: c.get('userId'), name: parsed.data.name },
    });
    return c.json({ category }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return c.json({ error: `Category "${parsed.data.name}" already exists` }, 409);
    }
    throw error;
  }
});