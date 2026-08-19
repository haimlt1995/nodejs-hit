import { Router } from 'express';

import * as reportController from './report.controller.js';

// GET /api/report
export const reportRouter = Router();

reportRouter.get('/report', reportController.get);
