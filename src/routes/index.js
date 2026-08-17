import { Router } from 'express';
import mongoose from 'mongoose';

import { itemRouter } from './item.routes.js';

export const routes = Router();

routes.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

routes.use('/items', itemRouter);
