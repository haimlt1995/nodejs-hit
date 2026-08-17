import express from 'express';
import pinoHttp from 'pino-http';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { logger } from './lib/logger.js';
import { routes } from './routes/index.js';

// Reject huge bodies before parsing them.
const JSON_BODY_LIMIT = '1mb';

/**
 * Builds the Express app.
 *
 * A function rather than a module level app, so a test can build one without
 * binding a port or opening a database. The middleware order below matters.
 *
 * @returns {import('express').Express} The configured app.
 */
export function createApp() {
  const app = express();

  // Do not advertise the framework.
  app.disable('x-powered-by');

  // Log first, so even a rejected body shows up.
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true }));

  // Everything lives under /api.
  app.use('/api', routes);

  // Unmatched routes become errors, then the handler renders them.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
