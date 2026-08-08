import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from '../constants/enums.js';

const notificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: ['email'], default: 'email' },

    recipientEmail: { type: String },
    subject: { type: String, required: true },

    status: { type: String, enum: NOTIFICATION_STATUSES, required: true, index: true },
    error: { type: String },

    relatedRepositoryId: { type: Types.ObjectId, ref: 'Repository' },
    relatedAnalysisId: { type: Types.ObjectId, ref: 'Analysis' },
    relatedPullRequestId: { type: Types.ObjectId, ref: 'PullRequest' },

    sentAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);
