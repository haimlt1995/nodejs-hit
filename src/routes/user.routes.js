import { Router } from 'express';

import * as userController from '../controllers/user.controller.js';

// Mounted on /api, so this becomes GET /api/users/:id.
export const userRouter = Router();

userRouter.get('/users/:id', userController.getById);
