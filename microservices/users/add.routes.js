import { Router } from 'express';

import * as addController from './add.controller.js';

// Mounted on /api, so this becomes POST /api/add on the users service.
export const addRouter = Router();

addRouter.post('/add', addController.add);
