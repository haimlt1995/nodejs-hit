import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
import { config } from './env.js';

// Reject query fields that are not in the schema.
mongoose.set('strictQuery', true);

// Fail fast instead of queueing queries against a dead server.
const SERVER_SELECTION_TIMEOUT_MS = 5000;

// Registered once, so a reconnect never stacks duplicate listeners.
mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));

/**
 * Opens the MongoDB connection.
 * @returns {Promise<void>} Resolves once queries can run.
 */
export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
}

/**
 * Closes the MongoDB connection.
 * @returns {Promise<void>} Resolves once it is shut.
 */
export async function disconnectDatabase() {
  await mongoose.disconnect();
}
