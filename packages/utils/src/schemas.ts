import { z } from 'zod';

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM');

export const signupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name required').max(80),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name required').max(60),
});

export const planUpsertSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  amount: z.number().finite().min(0, 'Amount cannot be negative'),
});

export const planDeleteSchema = z.object({
  id: z.string().min(1),
});

export const actualCreateSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  amount: z.number().finite().gt(0, 'Amount must be greater than 0'),
  note: z.string().max(500).optional().default(''),
});

export const actualUpdateSchema = actualCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const actualDeleteSchema = z.object({
  id: z.string().min(1),
});

export const lockMonthSchema = z.object({
  month: monthSchema,
});

/** CSV rows: month,category,amount */
export const csvRowSchema = z.object({
  month: monthSchema,
  category: z.string().min(1),
  amount: z.number({ coerce: false }).finite().gt(0),
});

export const reportQuerySchema = z.object({
  start: monthSchema,
  end: monthSchema,
});