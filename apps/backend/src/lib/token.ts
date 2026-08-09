import { SignJWT, jwtVerify } from 'jose';
import { User } from '@prisma/client';

export const TOKEN_TTL = '30d';

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signToken(user: Pick<User, 'id' | 'email'>, secret: string): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret(secret));
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secret));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}