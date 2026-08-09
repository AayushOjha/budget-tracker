import { PrismaClient } from '@prisma/client';

export async function getLockedMonths(prisma: PrismaClient, userId: string): Promise<Set<string>> {
  const locks = await prisma.lock.findMany({ where: { userId }, select: { month: true } });
  return new Set(locks.map((l) => l.month));
}