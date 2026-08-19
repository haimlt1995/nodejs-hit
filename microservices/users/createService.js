import process from 'node:process';

import express from 'express';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';

import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// bigger bodies than this are refused before we read them
const JSON_BODY_LIMIT = '1mb';

// mongoose reports 1 once it is connected
const MONGOOSE_CONNECTED_STATE = 1;

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

// how long to wait for open connections before killing the process
const SHUTDOWN_TIMEOUT_MS = 10000;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// what a hosting platform, or Ctrl+C, sends to stop us
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

// builds one service out of the routes it owns
export function createService(serviceName, routers) {
  const app = express();

  // do not tell the world which framework this is
  app.disable('x-powered-by');

  // logging comes first, so even a broken body is recorded
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true }));

  const routes = express.Router();

  // writes a log line every time an endpoint is reached
  routes.use((req, res, next) => {
    logger.info(
      { method: req.method, endpoint: req.originalUrl },
      `${req.method} ${req.originalUrl}`,
    );

    next();
  });

  // quick way to see if this service and its database are alive
  routes.get('/health', (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === MONGOOSE_CONNECTED_STATE;
    const statusCode = isDatabaseConnected ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE;

    // name it, so you can tell the four apart
    res.status(statusCode).json({
      service: serviceName,
      status: isDatabaseConnected ? 'ok' : 'degraded',
      database: isDatabaseConnected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // every route of every service lives under /api
  for (const router of routers) {
    routes.use(router);
  }

  app.use('/api', routes);

  // an unknown address becomes an error, then gets turned into json
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// stops serving, closes the database, then exits
function shutdown(server, signal) {
  logger.info({ signal }, 'Shutting down');

  // one client holding a connection open must not block us forever
  const forcedExitTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(EXIT_FAILURE);
  }, SHUTDOWN_TIMEOUT_MS);

  // this timer alone should never keep the process alive
  forcedExitTimer.unref();

  server.close(async () => {
    await disconnectDatabase();
    clearTimeout(forcedExitTimer);
    process.exit(EXIT_SUCCESS);
  });
}

// connects to the database and starts listening
export async function startService(serviceName, routers) {
  // database first, so a bad connection fails before we take the port
  await connectDatabase();

  // the port comes from the env file, nowhere else
  const server = createService(serviceName, routers).listen(config.port, () => {
    logger.info(
      { service: serviceName, port: config.port, environment: config.environmentName },
      `${serviceName} service listening`,
    );
  });

  // a second Ctrl+C should kill it outright
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => shutdown(server, signal));
  }
}
