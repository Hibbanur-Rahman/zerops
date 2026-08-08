import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { AUDIT_ACTIONS } from '../constants/enums.js';

const auditLogSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },

    targetType: { type: String },
    targetId: { type: String },

    metadata: { type: Schema.Types.Mixed },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model('AuditLog', auditLogSchema);
