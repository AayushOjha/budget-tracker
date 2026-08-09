import { User } from '@prisma/client';

export type Bindings = {
  DATABASE_URL: string;
  DIRECT_URL: string;
  JWT_SECRET: string;
};

export type Variables = {
  userId: string;
  user?: User;
};

export type HonoEnv = { Bindings: Bindings; Variables: Variables };