import { Router } from 'express';
import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
import { aboutRouter } from './about.routes.js';
import { addRouter } from './add.routes.js';
import { logRouter } from './log.routes.js';
import { reportRouter } from './report.routes.js';
import { userRouter } from './user.routes.js';

// Mongoose reports 1 once the handshake is done.
const MONGOOSE_CONNECTED_STATE = 1;

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const routes = Router();

// A log line whenever an endpoint is accessed, on top of the per request
// logging pino-http already does. The status is not known yet at this point,
// so the log document takes its default.
routes.use((req, res, next) => {
  logger.info(
    { method: req.method, endpoint: req.originalUrl },
    `${req.method} ${req.originalUrl}`,
  );

  next();
});

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

// Every router sits directly under /api.
routes.use(aboutRouter);
routes.use(addRouter);
routes.use(logRouter);
routes.use(reportRouter);
routes.use(userRouter);
