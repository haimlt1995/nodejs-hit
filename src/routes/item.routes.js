import { Router } from 'express';

import * as itemController from '../controllers/item.controller.js';

export const itemRouter = Router();

itemRouter.route('/').get(itemController.list).post(itemController.create);

itemRouter
  .route('/:id')
  .get(itemController.getById)
  .put(itemController.update)
  .patch(itemController.update)
  .delete(itemController.remove);
