import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
import { config } from './env.js';

// Rejects query fields absent from the schema rather than ignoring them.
mongoose.set('strictQuery', true);

// Fail fast instead of buffering queries when the server cannot be reached.
const SERVER_SELECTION_TIMEOUT_MS = 5000;

/*
 * The connection listeners are registered once, at module load, so that a
 * reconnect never stacks duplicate handlers on the same connection object.
 */
mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));

/**
 * Opens the connection to MongoDB.
 * @returns {Promise<void>} Resolves once the connection is ready for queries.
 */
export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
}

/**
 * Closes the connection to MongoDB.
 * @returns {Promise<void>} Resolves once the connection is fully closed.
 */
export async function disconnectDatabase() {
  await mongoose.disconnect();
}
