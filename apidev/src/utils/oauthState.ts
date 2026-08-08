import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';

interface OAuthStatePayload {
  userId: string;
  purpose: 'github-connect';
}

/** Short-lived signed state param -- avoids needing server-side OAuth session storage. */
export function signOAuthState(userId: string): string {
  return jwt.sign({ userId, purpose: 'github-connect' } satisfies OAuthStatePayload, env.JWT_SECRET, {
    expiresIn: '10m',
  });
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as jwt.JwtPayload & OAuthStatePayload;
    if (payload.purpose !== 'github-connect' || typeof payload.userId !== 'string') {
      throw new Error('unexpected state payload');
    }
    return { userId: payload.userId, purpose: payload.purpose };
  } catch {
    throw new AppError('This GitHub connection link has expired, please try again', 400, 'VALIDATION_ERROR');
  }
}
