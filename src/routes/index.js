import { Router } from 'express';
import mongoose from 'mongoose';

import { costRouter } from './cost.routes.js';

// Mongoose reports state 1 once the driver has finished its handshake.
const MONGOOSE_CONNECTED_STATE = 1;

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const routes = Router();

/*
 * Reports whether the process is able to serve traffic. The database state is
 * part of the answer, because every endpoint below depends on that connection.
 */
routes.get('/health', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === MONGOOSE_CONNECTED_STATE;

  // A running process with no database is degraded rather than healthy.
  const statusCode = isDatabaseConnected ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE;

  res.status(statusCode).json({
    status: isDatabaseConnected ? 'ok' : 'degraded',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// The cost endpoints sit directly under /api, as the API contract requires.
routes.use(costRouter);
