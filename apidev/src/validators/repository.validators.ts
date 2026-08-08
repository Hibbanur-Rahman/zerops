import { z } from 'zod';

export const updateRepositorySchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') }),
  body: z
    .object({
      monitoringEnabled: z.boolean().optional(),
      fullScanEnabled: z.boolean().optional(),
      policy: z
        .object({
          failOnCritical: z.boolean().optional(),
          failOnHigh: z.boolean().optional(),
          failOnMedium: z.boolean().optional(),
          maximumRiskScore: z.number().min(0).max(100).optional(),
          allowNewDependencies: z.boolean().optional(),
          allowDeprecatedPackages: z.boolean().optional(),
          allowInstallScripts: z.boolean().optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
});

export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>['body'];
