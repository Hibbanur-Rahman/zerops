import { Octokit } from 'octokit';
import { requireGithubApp } from '../../config/githubApp.js';
import { GithubAccount } from '../../models/GithubAccount.js';
import { encrypt } from '../../utils/encryption.js';
import { AppError } from '../../utils/AppError.js';

export interface GithubProfile {
  githubUserId: number;
  githubUsername: string;
  avatarUrl: string;
  profileUrl: string;
  email: string | null;
}

async function fetchVerifiedEmail(octokit: Octokit): Promise<string | null> {
  try {
    const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
  } catch {
    // "user" email scope not granted -- fall back to the public profile email, if any.
    return null;
  }
}

export async function exchangeOAuthCode(code: string): Promise<{ profile: GithubProfile; accessToken: string }> {
  const app = requireGithubApp();

  let authentication: { token: string };
  try {
    const result = await app.oauth.createToken({ code });
    authentication = result.authentication;
  } catch {
    throw new AppError('Failed to complete GitHub authorization, please try again', 400, 'GITHUB_API_ERROR');
  }

  const userOctokit = new Octokit({ auth: authentication.token });
  const { data: githubUser } = await userOctokit.rest.users.getAuthenticated();
  const verifiedEmail = await fetchVerifiedEmail(userOctokit);

  return {
    profile: {
      githubUserId: githubUser.id,
      githubUsername: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      profileUrl: githubUser.html_url,
      email: verifiedEmail ?? githubUser.email ?? null,
    },
    accessToken: authentication.token,
  };
}

export async function upsertGithubAccount(userId: string, profile: GithubProfile, accessToken: string) {
  const accessTokenEncrypted = encrypt(accessToken);

  return GithubAccount.findOneAndUpdate(
    { userId },
    {
      userId,
      githubUserId: profile.githubUserId,
      githubUsername: profile.githubUsername,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      email: profile.email,
      accessTokenEncrypted,
      connectedAt: new Date(),
    },
    { upsert: true, new: true },
  );
}
