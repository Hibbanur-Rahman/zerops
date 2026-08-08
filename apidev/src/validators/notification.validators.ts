import { z } from 'zod';

export const updateNotificationPreferenceSchema = z.object({
  body: z
    .object({
      emailNotificationsEnabled: z.boolean().optional(),
      notifyOnCritical: z.boolean().optional(),
      notifyOnHigh: z.boolean().optional(),
      notifyOnMedium: z.boolean().optional(),
      notifyOnLow: z.boolean().optional(),
      notifyOnPush: z.boolean().optional(),
      notifyOnPullRequest: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
});

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>['body'];
