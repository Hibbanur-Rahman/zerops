import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let connecting = false;

/**
 * Connects to MongoDB without blocking process startup. MongoDB unavailability
 * (unset URI, network partition, provider outage) must never crash the API --
 * routes that touch the database surface a clean 503 via AppError instead.
 * Mongoose queues operations by default until connected (bufferTimeoutMS), so
 * short outages self-heal without any special handling here.
 */
export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set -- database-backed routes will return 503 until configured');
    return;
  }

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  connecting = true;
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    logger.error({ err }, 'Initial MongoDB connection failed -- will keep retrying in the background');
  } finally {
    connecting = false;
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function isDatabaseConnecting(): boolean {
  return connecting;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
