import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_USER = {
  email: 'demo@example.com',
  password: 'demo1234',
  name: 'Demo User',
};

const SEED_CATEGORIES = ['Marketing', 'Payroll', 'Tools'];
const SEED_PLANS = [
  { category: 'Marketing', month: '2026-01', amount: 5000 },
  { category: 'Payroll', month: '2026-01', amount: 20000 },
  { category: 'Marketing', month: '2026-02', amount: 5000 },
  { category: 'Payroll', month: '2026-02', amount: 20000 },
  { category: 'Tools', month: '2026-02', amount: 3000 },
];
// Marketing 2026-02 is intentionally omitted to demonstrate missing-actual handling.
const SEED_ACTUALS = [
  { category: 'Marketing', month: '2026-01', amount: 4800 },
  { category: 'Payroll', month: '2026-01', amount: 20500 },
  { category: 'Payroll', month: '2026-02', amount: 19800 },
  { category: 'Tools', month: '2026-02', amount: 3100 },
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: SEED_USER.email } });
  if (existing) {
    console.log(`Seed: user ${SEED_USER.email} already exists, skipping.`);
    return;
  }

  const password = await bcrypt.hash(SEED_USER.password, 10);
  const user = await prisma.user.create({
    data: { email: SEED_USER.email, password, name: SEED_USER.name },
  });

  const categoryIds = new Map<string, string>();
  for (const name of SEED_CATEGORIES) {
    const category = await prisma.category.create({ data: { userId: user.id, name } });
    categoryIds.set(name, category.id);
  }

  await prisma.plan.createMany({
    data: SEED_PLANS.map((p) => ({
      userId: user.id,
      categoryId: categoryIds.get(p.category)!,
      month: p.month,
      amount: p.amount,
    })),
  });

  await prisma.actual.createMany({
    data: SEED_ACTUALS.map((a) => ({
      userId: user.id,
      categoryId: categoryIds.get(a.category)!,
      month: a.month,
      amount: a.amount,
      note: 'seed',
    })),
  });

  console.log(`Seeded demo user: ${SEED_USER.email} / ${SEED_USER.password}`);
  console.log('Categories:', SEED_CATEGORIES.join(', '));
  console.log('Plans/actuals for 2026-01 and 2026-02 created.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());