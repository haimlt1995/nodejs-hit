import { Router } from 'express';

import * as addController from '../controllers/add.controller.js';

// Mounted on /api, so this becomes POST /api/add.
export const addRouter = Router();

addRouter.post('/add', addController.add);
