import { Router } from 'express';
import mongoose from 'mongoose';

import { costRouter } from './cost.routes.js';

// Mongoose reports 1 once the handshake is done.
const MONGOOSE_CONNECTED_STATE = 1;

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const routes = Router();

// Can we serve traffic? Every endpoint needs the database, so report that too.
routes.get('/health', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === MONGOOSE_CONNECTED_STATE;

  // Running without a database is degraded, not healthy.
  const statusCode = isDatabaseConnected ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE;

  res.status(statusCode).json({
    status: isDatabaseConnected ? 'ok' : 'degraded',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Cost endpoints sit directly under /api.
routes.use(costRouter);
