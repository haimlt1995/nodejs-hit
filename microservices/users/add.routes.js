import { Router } from 'express';

import * as addController from './add.controller.js';

// POST /api/add
export const addRouter = Router();

addRouter.post('/add', addController.add);
