import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateNotificationPreferenceSchema } from '../validators/notification.validators.js';
import { getNotificationPreferences, updateNotificationPreferences } from '../controllers/notifications.controller.js';

export const notificationPreferencesRouter = Router();

notificationPreferencesRouter.use(requireAuth);
notificationPreferencesRouter.get('/', getNotificationPreferences);
notificationPreferencesRouter.patch('/', validate(updateNotificationPreferenceSchema), updateNotificationPreferences);
