import process from 'node:process';

import express from 'express';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';

import { config, resolvePort } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

/*
 * Shared plumbing for the four microservices.
 *
 * Each process owns only its own routers; everything else below is identical
 * across them, so it lives here once instead of being copied four times.
 */

// Reject huge bodies before parsing them.
const JSON_BODY_LIMIT = '1mb';

// Mongoose reports 1 once the handshake is done.
const MONGOOSE_CONNECTED_STATE = 1;

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

// How long to let connections drain before giving up.
const SHUTDOWN_TIMEOUT_MS = 10000;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// What a supervisor, or Ctrl+C, sends.
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Builds one microservice as an Express app.
 * @param {string} serviceName - Name of the service, reported by /api/health.
 * @param {Array<object>} routers - The routers this service owns.
 * @returns {import('express').Express} The configured app.
 */
export function createService(serviceName, routers) {
  const app = express();

  // Do not advertise the framework.
  app.disable('x-powered-by');

  // Log first, so even a rejected body shows up.
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true }));

  const routes = express.Router();

  // A log line whenever an endpoint is accessed, on top of the per request
  // logging pino-http already does. The status is not known yet at this point.
  routes.use((req, res, next) => {
    logger.info(
      { method: req.method, endpoint: req.originalUrl },
      `${req.method} ${req.originalUrl}`,
    );

    next();
  });

  routes.get('/health', (req, res) => {
    const isDatabaseConnected = mongoose.connection.readyState === MONGOOSE_CONNECTED_STATE;

    // Running without a database is degraded, not healthy.
    const statusCode = isDatabaseConnected ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      service: serviceName,
      status: isDatabaseConnected ? 'ok' : 'degraded',
      database: isDatabaseConnected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Every router of every service sits directly under /api.
  for (const router of routers) {
    routes.use(router);
  }

  app.use('/api', routes);

  // Unmatched routes become errors, then the handler renders them.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

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
 * Connects to MongoDB, then starts one microservice listening.
 * @param {string} serviceName - Name of the service, used in logs.
 * @param {number} defaultPort - Port to use when PORT is unset.
 * @param {Array<object>} routers - The routers this service owns.
 * @returns {Promise<void>} Resolves once the port is bound.
 */
export async function startService(serviceName, defaultPort, routers) {
  // Database first, so a bad connection fails before the port is taken.
  await connectDatabase();

  const port = resolvePort(defaultPort);

  const server = createService(serviceName, routers).listen(port, () => {
    logger.info(
      { service: serviceName, port, environment: config.environmentName },
      `${serviceName} service listening`,
    );
  });

  // once(), so a second Ctrl+C kills it outright.
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => shutdown(server, signal));
  }
}
