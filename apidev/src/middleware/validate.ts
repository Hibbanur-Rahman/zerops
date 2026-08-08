import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates { body, query, params } against a Zod schema shaped the same way,
 * then replaces each with its parsed (and possibly coerced/trimmed) value.
 */
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse({ body: req.body, query: req.query, params: req.params }) as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query as typeof req.query;
    if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;
    next();
  };
}
