import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
import { config } from './env.js';

// refuse queries on fields the schema does not know
mongoose.set('strictQuery', true);

// give up quickly instead of piling queries on a dead server
const SERVER_SELECTION_TIMEOUT_MS = 5000;

// tells us in the log what the connection is doing
mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));

// opens the database connection
export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
}

// closes the database connection
export async function disconnectDatabase() {
  await mongoose.disconnect();
}
