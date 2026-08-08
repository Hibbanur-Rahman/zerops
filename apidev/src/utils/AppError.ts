export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'GITHUB_API_ERROR'
  | 'GITHUB_NOT_CONFIGURED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'ANALYSIS_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'EMAIL_SEND_FAILED'
  | 'INTERNAL_ERROR';

/**
 * An operational error: expected, handled, safe to surface a clean message for.
 * Anything thrown that is NOT an AppError is treated as a programmer error/bug
 * by the central error handler and never leaks details to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational = true;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }
}
