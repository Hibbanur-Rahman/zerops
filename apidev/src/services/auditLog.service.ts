import type { Request } from 'express';
import type { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import type { AuditAction } from '../constants/enums.js';
import { logger } from '../config/logger.js';

interface RecordAuditLogInput {
  userId?: Types.ObjectId | string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/** Audit log writes are best-effort -- a logging failure must never fail the request that triggered it. */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  try {
    await AuditLog.create({
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ipAddress: input.req?.ip,
      userAgent: input.req?.headers['user-agent'],
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'Failed to record audit log entry');
  }
}
