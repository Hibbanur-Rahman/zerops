import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { requireGithubApp } from '../config/githubApp.js';
import { signOAuthState, verifyOAuthState } from '../utils/oauthState.js';
import { exchangeOAuthCode, upsertGithubAccount } from '../services/github/githubAccount.service.js';
import { syncRepositoriesForUser } from '../services/github/repositories.service.js';
import { recordAuditLog } from '../services/auditLog.service.js';
import type { GithubCallbackQuery } from '../validators/github.validators.js';
import { GithubAccount } from '../models/GithubAccount.js';
import { GithubInstallation } from '../models/GithubInstallation.js';

export const connect = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const app = requireGithubApp();

  const { url } = app.oauth.getWebFlowAuthorizationUrl({
    redirectUrl: `${env.APP_URL}/api/v1/github/callback`,
    state: signOAuthState(req.user.id),
  });

  res.redirect(url);
});

export const callback = catchAsync(async (req: Request, res: Response) => {
  const { code, state } = req.query as unknown as GithubCallbackQuery;
  const { userId } = verifyOAuthState(state);

  const { profile, accessToken } = await exchangeOAuthCode(code);
  await upsertGithubAccount(userId, profile, accessToken);
  await recordAuditLog({ userId, action: 'github_connected', targetType: 'GithubAccount', targetId: String(profile.githubUserId) });

  res.redirect(`${env.FRONTEND_URL}/settings/github?connected=true`);
});

export const install = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (!env.GITHUB_APP_SLUG) {
    throw new AppError('GITHUB_APP_SLUG is not configured', 503, 'GITHUB_NOT_CONFIGURED');
  }

  res.redirect(`https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`);
});

export const listRepositories = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const repositories = await syncRepositoriesForUser(req.user.id);
  sendSuccess(res, repositories);
});

export const getStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const [account, installations] = await Promise.all([
    GithubAccount.findOne({ userId: req.user.id }),
    GithubInstallation.find({ userId: req.user.id, status: 'active' }),
  ]);

  sendSuccess(res, {
    connected: Boolean(account),
    githubUsername: account?.githubUsername,
    avatarUrl: account?.avatarUrl,
    installations: installations.map((i) => ({
      id: String(i._id),
      accountLogin: i.accountLogin,
      accountType: i.accountType,
      accountAvatarUrl: i.accountAvatarUrl,
      repositorySelection: i.repositorySelection,
    })),
  });
});
