import { Router } from 'express';

import * as userController from './user.controller.js';

// Mounted on /api, so these become GET /api/users and GET /api/users/:id.
export const userRouter = Router();

userRouter.get('/users', userController.list);
userRouter.get('/users/:id', userController.getById);
