import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { recordAuditLog } from '../services/auditLog.service.js';
import { paginationQuerySchema, paginationSkip } from '../validators/common.validators.js';
import type { UpdateNotificationPreferenceInput } from '../validators/notification.validators.js';

export const listNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = paginationQuerySchema.parse(req.query);

  const filter = { userId: req.user.id };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(paginationSkip(page, limit)).limit(limit),
    Notification.countDocuments(filter),
  ]);

  sendSuccess(res, notifications, 200, paginationMeta(total, page, limit));
});

export const getNotificationPreferences = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId: req.user.id },
    { $setOnInsert: { userId: req.user.id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  sendSuccess(res, prefs);
});

export const updateNotificationPreferences = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const input = req.body as UpdateNotificationPreferenceInput;

  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId: req.user.id },
    { $set: input, $setOnInsert: { userId: req.user.id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await recordAuditLog({
    userId: req.user.id,
    action: 'notification_preference_changed',
    targetType: 'NotificationPreference',
    targetId: String(prefs._id),
    metadata: input,
    req,
  });

  sendSuccess(res, prefs);
});
