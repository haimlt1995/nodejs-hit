import { Router } from 'express';

import * as logController from './log.controller.js';

// Mounted on /api, so this becomes GET /api/logs.
export const logRouter = Router();

logRouter.get('/logs', logController.list);
