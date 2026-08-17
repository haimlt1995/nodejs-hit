import { Router } from 'express';

import * as costController from '../controllers/cost.controller.js';

// This router is mounted on /api, which turns the path below into POST /api/add.
export const costRouter = Router();

costRouter.post('/add', costController.add);
