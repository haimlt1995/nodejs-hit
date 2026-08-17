import process from 'node:process';

import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  await connectDatabase();

  const server = createApp().listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Server listening');
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');

    // Hard exit if connections refuse to drain.
    const timer = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await disconnectDatabase();
      clearTimeout(timer);
      process.exit(0);
    });
  };

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => shutdown(signal));
  }
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
