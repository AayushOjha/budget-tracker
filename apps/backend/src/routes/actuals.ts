import { Hono } from 'hono';
import { LockedPeriodError, assertNotLocked } from '../lib/lock';
import { getLockedMonths } from '../lib/months';
import { getPrisma } from '../lib/prisma';
import { HonoEnv } from '../types/hono';
import {
  actualCreateSchema,
  actualDeleteSchema,
  actualUpdateSchema,
  csvRowSchema,
  isMonth,
  Month,
} from '@tracker/utils';

interface CsvEntry {
  line: number;
  raw: string;
  error: string;
}

export const actualRouter = new Hono<HonoEnv>();

const toDto = (a: { id: string; categoryId: string; month: string; amount: number; note: string | null; createdAt: Date }, categoryName?: string) => ({
  id: a.id,
  categoryId: a.categoryId,
  categoryName: categoryName ?? '',
  month: a.month,
  amount: a.amount,
  note: a.note || '',
  createdAt: a.createdAt.toISOString(),
});

actualRouter.get('/', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const filters: Record<string, unknown> = {};
  const month = c.req.query('month');
  const categoryId = c.req.query('categoryId');
  if (month && isMonth(month)) filters.month = month;
  if (categoryId) filters.categoryId = categoryId;

  const actuals = await prisma.actual.findMany({
    where: { userId: c.get('userId'), ...filters },
    include: { category: { select: { name: true } } },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  });
  return c.json({ actuals: actuals.map((a) => toDto(a, a.category.name)) });
});

actualRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = actualCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, userId } });
  if (!category) return c.json({ error: 'Category not found' }, 404);

  try {
    assertNotLocked(await getLockedMonths(prisma, userId), [parsed.data.month]);
  } catch (error) {
    if (error instanceof LockedPeriodError) return c.json({ error: error.message }, 423);
    throw error;
  }

  const actual = await prisma.actual.create({
    data: {
      userId,
      categoryId: parsed.data.categoryId,
      month: parsed.data.month,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
    },
  });
  return c.json({ actual: toDto(actual, category.name) }, 201);
});

actualRouter.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = actualUpdateSchema.safeParse({ ...body, id: c.req.param('id') });
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const existing = await prisma.actual.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return c.json({ error: 'Actual entry not found' }, 404);

  const targetMonth = (parsed.data.month ?? existing.month) as Month;
  try {
    assertNotLocked(await getLockedMonths(prisma, userId), [targetMonth, existing.month]);
  } catch (error) {
    if (error instanceof LockedPeriodError) return c.json({ error: error.message }, 423);
    throw error;
  }

  const actual = await prisma.actual.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.month ? { month: parsed.data.month } : {}),
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note || null } : {}),
    },
    include: { category: true },
  });
  return c.json({ actual: toDto(actual, actual.category.name) });
});

actualRouter.delete('/:id', async (c) => {
  const parsed = actualDeleteSchema.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid actual id' }, 400);

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const existing = await prisma.actual.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return c.json({ error: 'Actual entry not found' }, 404);

  try {
    assertNotLocked(await getLockedMonths(prisma, userId), [existing.month]);
  } catch (error) {
    if (error instanceof LockedPeriodError) return c.json({ error: error.message }, 423);
    throw error;
  }

  await prisma.actual.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});

// ── CSV import ───────────────────────────────────────────────────────────────
// Format: header line `month,category,amount` followed by one entry per line.
// Category names must match an existing category (case-insensitive);
// month must be YYYY-MM. Locked months are rejected per line.

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: string[][] = [];
  for (const line of lines) {
    rows.push(
      line
        .split(',')
        .map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'))
    );
  }
  return rows;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

actualRouter.post('/import', async (c) => {
  const body = await c.req.json().catch(() => null);
  const csv = typeof body?.csv === 'string' ? body.csv : '';
  if (!csv.trim()) return c.json({ error: 'Empty CSV payload' }, 400);

  const userId = c.get('userId');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const locked = await getLockedMonths(prisma, userId);
  const categories = await prisma.category.findMany({ where: { userId } });
  const categoryByName = new Map(categories.map((ct) => [ct.name.toLowerCase(), ct]));

  const rows = parseCsv(csv);
  const header = rows.shift();
  const hasHeader = header && header[0]?.toLowerCase().trim() === 'month';
  if (hasHeader && (rows.length === 0 || header.length < 2)) {
    return c.json({ error: 'CSV must start with a header: month,category,amount' }, 400);
  }

  const imports: { categoryId: string; month: Month; amount: number }[] = [];
  const errors: CsvEntry[] = [];

  rows.forEach((cells, index) => {
    const line = index + 2; // 1-based, offset by header
    const raw = cells.join(',');
    if (cells.length < 3) {
      errors.push({ line, raw, error: 'Expected 3 columns: month,category,amount' });
      return;
    }

    const amount = parseAmount(cells[2]);
    const checked = csvRowSchema.safeParse({
      month: cells[0],
      category: cells[1],
      amount,
    });

    if (!checked.success) {
      const first = checked.error.issues[0];
      errors.push({ line, raw, error: first?.message ?? 'Invalid row' });
      return;
    }

    const { month, category } = checked.data;
    if (locked.has(month)) {
      errors.push({ line, raw, error: `Month ${month} is locked` });
      return;
    }

    const categoryRow = categoryByName.get(category.toLowerCase());
    if (!categoryRow) {
      errors.push({ line, raw, error: `Unknown category "${category}"` });
      return;
    }

    imports.push({ categoryId: categoryRow.id, month: month as Month, amount: checked.data.amount });
  });

  let imported = 0;
  if (imports.length > 0) {
    const created = await prisma.actual.createMany({
      data: imports.map((i) => ({ userId, ...i })),
    });
    imported = created.count;
  }

  return c.json({ imported, skipped: errors.length, errors });
});