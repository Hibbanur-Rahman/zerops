import type { Types } from 'mongoose';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export type ObjectIdLike = Types.ObjectId | string;
