import { Router } from 'express';

import * as aboutController from './about.controller.js';

// Mounted on /api, so this becomes GET /api/about.
export const aboutRouter = Router();

aboutRouter.get('/about', aboutController.get);
