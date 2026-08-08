import { z } from 'zod';
import { FINDING_STATUSES } from '../constants/enums.js';
import { RISK_LEVELS } from '../constants/riskLevels.js';

export const listFindingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  repositoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  severity: z.enum(RISK_LEVELS).optional(),
  status: z.enum(FINDING_STATUSES).optional(),
  packageName: z.string().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export const updateFindingStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
  body: z.object({
    status: z.enum(['open', 'resolved', 'ignored']),
    ignoredReason: z.string().max(500).optional(),
  }),
});

export type UpdateFindingStatusInput = z.infer<typeof updateFindingStatusSchema>['body'];
