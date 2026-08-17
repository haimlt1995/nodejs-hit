import { Router } from 'express';

import * as costController from '../controllers/cost.controller.js';

// Mounted on /api, so this becomes POST /api/add.
export const costRouter = Router();

costRouter.post('/add', costController.add);
