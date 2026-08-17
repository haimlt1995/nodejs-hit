import express from 'express';
import pinoHttp from 'pino-http';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { logger } from './lib/logger.js';
import { routes } from './routes/index.js';

// Oversized bodies are rejected before they are ever parsed into memory.
const JSON_BODY_LIMIT = '1mb';

/**
 * Builds the Express application.
 *
 * The application is assembled by a function rather than at module load, so that a
 * test is able to build an isolated instance without binding a port or opening a
 * database connection. The order of the middleware below is deliberate.
 *
 * @returns {import('express').Express} The configured application.
 */
export function createApp() {
  const app = express();

  // Hides the framework fingerprint from every response header.
  app.disable('x-powered-by');

  // Logging is registered first, so even a rejected body still gets recorded.
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true }));

  // The API contract places every endpoint underneath /api.
  app.use('/api', routes);

  // A request matching no route becomes an error, which the handler then renders.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
