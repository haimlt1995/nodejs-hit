import { Router } from 'express';

import * as aboutController from './about.controller.js';

// GET /api/about
export const aboutRouter = Router();

aboutRouter.get('/about', aboutController.get);
