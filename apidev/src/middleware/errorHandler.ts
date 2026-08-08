import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface ErrorResponseBody {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
  stack?: string;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND',
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestContext = { requestId: req.requestId, method: req.method, path: req.originalUrl };

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ ...requestContext, err }, 'Operational error (5xx)');
    } else {
      logger.warn({ ...requestContext, errorCode: err.errorCode, message: err.message }, 'Operational error');
    }
    const body: ErrorResponseBody = { success: false, message: err.message, errorCode: err.errorCode };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ ...requestContext, issues: err.issues }, 'Validation error');
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    logger.warn({ ...requestContext, err }, 'Mongoose validation error');
    res.status(400).json({ success: false, message: 'Validation failed', errorCode: 'VALIDATION_ERROR' });
    return;
  }

  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    logger.warn({ ...requestContext, err }, 'Duplicate key error');
    res.status(409).json({ success: false, message: 'Resource already exists', errorCode: 'CONFLICT' });
    return;
  }

  // Unexpected/programmer error -- never leak internals in production.
  logger.error({ ...requestContext, err }, 'Unhandled error');
  const body: ErrorResponseBody = {
    success: false,
    message: 'Unable to process your request',
    errorCode: 'INTERNAL_ERROR',
  };
  if (!env.isProduction && err instanceof Error) {
    body.details = err.message;
    body.stack = err.stack;
  }
  res.status(500).json(body);
}
