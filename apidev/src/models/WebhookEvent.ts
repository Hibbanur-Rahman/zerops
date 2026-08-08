import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { WEBHOOK_EVENT_STATUSES, WEBHOOK_EVENT_TYPES } from '../constants/enums.js';

const webhookEventSchema = new Schema(
  {
    githubDeliveryId: { type: String, required: true, unique: true },
    eventType: { type: String, enum: WEBHOOK_EVENT_TYPES, required: true, index: true },
    action: { type: String },

    installationId: { type: Number, index: true },
    repositoryId: { type: Types.ObjectId, ref: 'Repository', index: true },
    githubRepositoryId: { type: Number, index: true },

    payload: { type: Schema.Types.Mixed, required: true },

    status: { type: String, enum: WEBHOOK_EVENT_STATUSES, default: 'received', index: true },
    jobId: { type: String },
    processedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true },
);

webhookEventSchema.index({ createdAt: -1 });

export type WebhookEventDoc = InferSchemaType<typeof webhookEventSchema>;
export const WebhookEvent = model('WebhookEvent', webhookEventSchema);
