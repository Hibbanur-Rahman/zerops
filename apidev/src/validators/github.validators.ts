import { z } from 'zod';

export const githubCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1, 'Missing authorization code'),
    state: z.string().min(1, 'Missing state parameter'),
  }),
});

export type GithubCallbackQuery = z.infer<typeof githubCallbackSchema>['query'];
