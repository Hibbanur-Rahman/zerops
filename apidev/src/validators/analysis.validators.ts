import { z } from 'zod';

export const listAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  repositoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  analysisType: z.enum(['push', 'pull_request', 'manual', 'initial']).optional(),
});
