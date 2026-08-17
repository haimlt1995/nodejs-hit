import process from 'node:process';

import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';

// How long to let connections drain before giving up.
const SHUTDOWN_TIMEOUT_MS = 10000;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// What a supervisor, or Ctrl+C, sends.
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Stops the server, closes the database, exits.
 * @param {import('node:http').Server} server - The listening server.
 * @param {string} signal - Signal that triggered this.
 * @returns {void}
 */
function shutdown(server, signal) {
  logger.info({ signal }, 'Shutting down');

  // A socket held open must not stall the exit forever.
  const forcedExitTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(EXIT_FAILURE);
  }, SHUTDOWN_TIMEOUT_MS);

  // unref, so this timer alone never keeps the process alive.
  forcedExitTimer.unref();

  // server.close is a low level API, hence the callback.
  server.close(async () => {
    await disconnectDatabase();
    clearTimeout(forcedExitTimer);
    process.exit(EXIT_SUCCESS);
  });
}

/**
 * Connects to MongoDB, then starts listening.
 * @returns {Promise<void>} Resolves once the port is bound.
 */
async function start() {
  // Database first, so a bad connection fails before the port is taken.
  await connectDatabase();

  const server = createApp().listen(config.port, () => {
    logger.info({ port: config.port, environment: config.environmentName }, 'Server listening');
  });

  // once(), so a second Ctrl+C kills it outright.
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => shutdown(server, signal));
  }
}

// try / catch reads better than chaining a .catch here.
try {
  await start();
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(EXIT_FAILURE);
}
