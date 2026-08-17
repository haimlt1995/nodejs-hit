import process from 'node:process';

import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';

// How long a shutdown may take before the process is killed outright.
const SHUTDOWN_TIMEOUT_MS = 10000;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// The signals a supervisor or a terminal uses to ask the process to stop.
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Stops accepting connections, closes the database, and then exits.
 * @param {import('node:http').Server} server - The listening HTTP server.
 * @param {string} signal - Name of the signal that triggered the shutdown.
 * @returns {void}
 */
function shutdown(server, signal) {
  logger.info({ signal }, 'Shutting down');

  // A client holding a keep alive socket must not delay the exit forever.
  const forcedExitTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(EXIT_FAILURE);
  }, SHUTDOWN_TIMEOUT_MS);

  // unref lets the process exit naturally once everything else has closed.
  forcedExitTimer.unref();

  // server.close is a low level Node API, hence the callback rather than await.
  server.close(async () => {
    await disconnectDatabase();
    clearTimeout(forcedExitTimer);
    process.exit(EXIT_SUCCESS);
  });
}

/**
 * Connects to MongoDB and starts listening for HTTP requests.
 * @returns {Promise<void>} Resolves once the server is accepting connections.
 */
async function start() {
  // The database is opened first, so a bad connection fails before the port binds.
  await connectDatabase();

  const server = createApp().listen(config.port, () => {
    logger.info({ port: config.port, environment: config.environmentName }, 'Server listening');
  });

  // once() is used, so that a repeated Ctrl+C exits instead of restarting the work.
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => shutdown(server, signal));
  }
}

// try / catch keeps the failure path linear, rather than chaining a .catch call.
try {
  await start();
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(EXIT_FAILURE);
}
