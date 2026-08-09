import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../lib/prisma';
import { signToken } from '../lib/token';
import { HonoEnv } from '../types/hono';
import { loginSchema, signupSchema } from '@tracker/utils';

export const authRouter = new Hono<HonoEnv>();

const toUserDto = (u: { id: string; email: string; name: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name ?? '',
});

authRouter.post('/signup', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return c.json({ error: 'Account already exists for this email' }, 409);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hashed, name },
  });

  const token = await signToken(user, c.env.JWT_SECRET);
  return c.json({ token, user: toUserDto(user) }, 201);
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await signToken(user, c.env.JWT_SECRET);
  return c.json({ token, user: toUserDto(user) });
});

authRouter.get('/me', async (c) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const user = await prisma.user.findUnique({ where: { id: c.get('userId') } });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: toUserDto(user) });
});