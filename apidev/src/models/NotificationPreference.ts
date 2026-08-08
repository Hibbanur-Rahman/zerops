import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },

    emailNotificationsEnabled: { type: Boolean, default: true },
    notifyOnCritical: { type: Boolean, default: true },
    notifyOnHigh: { type: Boolean, default: true },
    notifyOnMedium: { type: Boolean, default: false },
    notifyOnLow: { type: Boolean, default: false },
    notifyOnPush: { type: Boolean, default: true },
    notifyOnPullRequest: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type NotificationPreferenceDoc = InferSchemaType<typeof notificationPreferenceSchema>;
export const NotificationPreference = model('NotificationPreference', notificationPreferenceSchema);
