import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications } from '../controllers/notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', listNotifications);
