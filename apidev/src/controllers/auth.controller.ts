import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import {
  authenticateUser,
  getSessionCookieOptions,
  registerUser,
  SESSION_COOKIE_NAME,
  signSessionToken,
  toAuthenticatedUser,
} from '../services/auth.service.js';
import { recordAuditLog } from '../services/auditLog.service.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validators.js';

export const register = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const user = await registerUser(input);
  const authUser = toAuthenticatedUser(user);

  res.cookie(SESSION_COOKIE_NAME, signSessionToken(authUser), getSessionCookieOptions());
  await recordAuditLog({ userId: user._id, action: 'user_registered', req });

  sendSuccess(res, { id: authUser.id, name: user.name, email: user.email, role: user.role }, 201);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const user = await authenticateUser(input);
  const authUser = toAuthenticatedUser(user);

  res.cookie(SESSION_COOKIE_NAME, signSessionToken(authUser), getSessionCookieOptions());
  await recordAuditLog({ userId: user._id, action: 'user_logged_in', req });

  sendSuccess(res, { id: authUser.id, name: user.name, email: user.email, role: user.role });
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
  sendSuccess(res, { loggedOut: true });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw AppError.unauthorized('Your account no longer exists');
  }

  sendSuccess(res, { id: String(user._id), name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl });
});
