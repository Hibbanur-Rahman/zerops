import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import type { AuthenticatedUser } from '../types/express.js';

const BCRYPT_ROUNDS = 12;
export const SESSION_COOKIE_NAME = 'session';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });
  await NotificationPreference.create({ userId: user._id });

  return user;
}

export async function authenticateUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

export function signSessionToken(user: AuthenticatedUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifySessionToken(token: string): AuthenticatedUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new AppError('Invalid session token', 401, 'UNAUTHORIZED');
  }
  return { id: payload.sub, email: payload.email, role: payload.role ?? 'member' };
}

/**
 * Frontend and backend live on different Zerops subdomains (different sites),
 * so the session cookie must be sent cross-site: SameSite=None + Secure in any
 * deployed environment. Locally both run on plain http://localhost at
 * different ports, which browsers treat as same-site but not secure, so
 * SameSite=Lax + Secure=false is what actually works there.
 */
export function getSessionCookieOptions(): CookieOptions {
  const isHttps = env.APP_URL.startsWith('https');
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function toAuthenticatedUser(user: { _id: unknown; email: string; role: string }): AuthenticatedUser {
  return { id: String(user._id), email: user.email, role: user.role as AuthenticatedUser['role'] };
}
