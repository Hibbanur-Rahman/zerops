import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../services/auth.service.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  try {
    req.user = verifySessionToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Your session has expired, please log in again'));
  }
}
